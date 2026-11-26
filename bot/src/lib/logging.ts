import { EmbedBuilder, Guild } from "discord.js"
import { collections } from "../database"
import { isModuleEnabled } from "./modules"

/**
 * Post an embed to the guild's configured log channel (`Bot.logging`), when the
 * Logging module is enabled and a channel is set. Best-effort — never throws.
 */
export async function logEvent(guild: Guild, embed: EmbedBuilder): Promise<void> {
    try {
        if (!(await isModuleEnabled(guild.id, "Logging"))) return
        const doc = await collections.logging().findOne({ _id: guild.id })
        if (!doc?.channelId) return

        const channel = await guild.channels.fetch(doc.channelId).catch(() => null)
        if (channel && channel.isTextBased()) {
            await channel.send({ embeds: [embed] }).catch(() => null)
        }
    } catch {
        /* ignore */
    }
}

/** Convenience: a coloured mod-action log embed. */
export function modLogEmbed(opts: {
    action: string
    color: number
    target: { tag: string; id: string }
    moderator: { tag: string; id: string }
    reason?: string
    extra?: { name: string; value: string }[]
}): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(opts.color)
        .setAuthor({ name: `${opts.action} — ${opts.target.tag}` })
        .addFields(
            { name: "User", value: `<@${opts.target.id}> (\`${opts.target.id}\`)`, inline: true },
            { name: "Moderator", value: `<@${opts.moderator.id}>`, inline: true }
        )
        .setTimestamp()
    if (opts.reason) embed.addFields({ name: "Reason", value: opts.reason })
    if (opts.extra?.length) embed.addFields(opts.extra)
    return embed
}
