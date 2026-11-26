import { Client, TextChannel } from "discord.js"
import { collections, JobDoc } from "../database"
import { buildRulesMessage } from "./rulesMessage"
import { getConfig, verifyPanel } from "./verification"

/**
 * The dashboard can't talk to Discord directly (it's serverless). Instead it
 * writes "jobs" to `Bot.jobs`; this poller — running inside the always-on bot —
 * claims pending jobs and executes them (e.g. publish the rules embed, or post
 * the verification panel, to a channel the user picked on the dashboard).
 */
export async function processJobs(client: Client): Promise<void> {
    let job: JobDoc | null
    // Claim one pending job at a time (atomic) so we never double-process.
    while (
        (job = await collections
            .jobs()
            .findOneAndUpdate(
                { status: "pending" },
                { $set: { status: "done" } },
                { sort: { createdAt: 1 }, returnDocument: "after" }
            ))
    ) {
        try {
            await runJob(client, job)
            console.log(`[jobs] ran ${job.type} for guild ${job.guildId} → ok`)
        } catch (err) {
            console.error(`[jobs] ${job.type} for guild ${job.guildId} failed:`, String(err))
            await collections
                .jobs()
                .updateOne(
                    { _id: job._id },
                    { $set: { status: "error", error: String(err).slice(0, 300) } }
                )
        }
    }
}

async function runJob(client: Client, job: JobDoc): Promise<void> {
    const guild = client.guilds.cache.get(job.guildId)
    if (!guild) throw new Error("Bot is not in that guild")

    const channelId = String(job.payload.channelId || "")
    const channel = channelId ? await guild.channels.fetch(channelId).catch(() => null) : null
    if (!channel || !channel.isTextBased()) throw new Error("Target channel not found")

    if (job.type === "postRules") {
        const rules = await collections.rules().findOne({ _id: job.guildId })
        const { embed, rows, hasContent } = buildRulesMessage(rules)
        if (!hasContent) throw new Error("No rules configured")
        await (channel as TextChannel).send({ embeds: [embed], components: rows })
        return
    }

    if (job.type === "postVerify") {
        const config = await getConfig(job.guildId)
        await (channel as TextChannel).send(verifyPanel(config?.message))
        return
    }

    throw new Error(`Unknown job type ${job.type}`)
}
