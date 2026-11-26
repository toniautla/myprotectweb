import {
    ActivityType,
    Client,
    Events,
    GatewayIntentBits,
    Interaction,
    MessageFlags,
} from "discord.js"
import { EmbedBuilder } from "discord.js"
import { config } from "./config"
import { connect } from "./database"
import { commands, componentHandlers } from "./commands"
import { errorEmbed } from "./lib/embeds"
import { syncGuild, removeGuild } from "./lib/guildSync"
import { logEvent } from "./lib/logging"
import { processJobs } from "./lib/jobs"
import { startPhishingList } from "./lib/phishingList"
import { handleAntiPhishing } from "./modules/antiphishing"
import { handleContentProtect } from "./modules/contentprotect"
import { handleAntiRaid } from "./modules/antiraid"
import { handleWebhookUpdate } from "./modules/webhooks"

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // privileged
        GatewayIntentBits.GuildModeration, // bans
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // privileged
    ],
})

client.once(Events.ClientReady, async (c) => {
    console.log(`[ready] Logged in as ${c.user.tag}`)
    c.user.setActivity("/dashboard", { type: ActivityType.Watching })

    // Initial sync of every guild, then refresh on an interval.
    const syncAll = () => Promise.all(c.guilds.cache.map((g) => syncGuild(g)))
    await syncAll()
    setInterval(syncAll, 10 * 60 * 1000)

    // Poll for dashboard-triggered jobs (publish rules / verification panel).
    setInterval(() => processJobs(c).catch((e) => console.error("[jobs]", e)), 5000)

    // Keep the live phishing-domain list fresh.
    startPhishingList()
})

// ── Slash commands & component interactions ──────────────────────────────
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = commands.get(interaction.commandName)
            if (!command) return
            await command.execute(interaction)
            return
        }

        if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
            const prefix = interaction.customId.split(":")[0]
            const handler = componentHandlers.get(prefix)
            if (handler) await handler(interaction as any)
        }
    } catch (err) {
        console.error("[interaction] error:", err)
        const payload = { embeds: [errorEmbed("Something went wrong", "Please try again.")], flags: MessageFlags.Ephemeral as const }
        try {
            if (interaction.isRepliable()) {
                if (interaction.replied || interaction.deferred) await interaction.followUp(payload)
                else await interaction.reply(payload)
            }
        } catch {
            /* ignore */
        }
    }
})

// ── Keep the guild cache fresh (crossover with the dashboard) ────────────
client.on(Events.GuildCreate, (guild) => syncGuild(guild))
client.on(Events.GuildDelete, (guild) => removeGuild(guild.id))
client.on(Events.GuildUpdate, (_old, guild) => syncGuild(guild))
client.on(Events.ChannelCreate, (channel) => "guild" in channel && channel.guild && syncGuild(channel.guild))
client.on(Events.ChannelDelete, (channel) => "guild" in channel && channel.guild && syncGuild(channel.guild))
client.on(Events.ChannelUpdate, (_o, channel) => "guild" in channel && channel.guild && syncGuild(channel.guild))
client.on(Events.GuildRoleCreate, (role) => syncGuild(role.guild))
client.on(Events.GuildRoleDelete, (role) => syncGuild(role.guild))
client.on(Events.GuildRoleUpdate, (_o, role) => syncGuild(role.guild))
client.on(Events.GuildBanAdd, (ban) => syncGuild(ban.guild))
client.on(Events.GuildBanRemove, (ban) => syncGuild(ban.guild))
client.on(Events.InviteCreate, (invite) => invite.guild && "channels" in invite.guild && syncGuild(invite.guild as any))
client.on(Events.InviteDelete, (invite) => invite.guild && "channels" in invite.guild && syncGuild(invite.guild as any))
client.on(Events.GuildMemberRemove, (member) => {
    if (!member.guild) return
    syncGuild(member.guild)
    logEvent(
        member.guild,
        new EmbedBuilder()
            .setColor(0xf64f52)
            .setAuthor({ name: `Member left — ${member.user?.tag ?? member.id}` })
            .setDescription(`<@${member.id}> left the server.`)
            .setTimestamp()
    )
})

// ── Protection modules ───────────────────────────────────────────────────
client.on(Events.GuildMemberAdd, async (member) => {
    await handleAntiRaid(member).catch(() => null)
    await syncGuild(member.guild).catch(() => null)
    await logEvent(
        member.guild,
        new EmbedBuilder()
            .setColor(0x37ef48)
            .setAuthor({ name: `Member joined — ${member.user.tag}` })
            .setDescription(
                `<@${member.id}> joined.\nAccount created <t:${Math.floor(
                    member.user.createdTimestamp / 1000
                )}:R>.`
            )
            .setTimestamp()
    ).catch(() => null)
})
client.on(Events.MessageCreate, async (message) => {
    await handleAntiPhishing(message).catch(() => null)
    await handleContentProtect(message).catch(() => null)
})
client.on(Events.WebhooksUpdate, (channel) => handleWebhookUpdate(channel as any).catch(() => null))

async function main() {
    await connect()
    console.log("[db] Connected to MongoDB")
    await client.login(config.token)
}

main().catch((err) => {
    console.error("[fatal] Failed to start bot:", err)
    process.exit(1)
})
