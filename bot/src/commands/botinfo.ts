import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, version as djsVersion } from "discord.js"
import { config } from "../config"
import { brandEmbed } from "../lib/embeds"
import { Command } from "../types"

function formatUptime(ms: number): string {
    const s = Math.floor(ms / 1000)
    const d = Math.floor(s / 86400)
    const h = Math.floor((s % 86400) / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${sec}s`].filter(Boolean).join(" ")
}

const command: Command = {
    data: new SlashCommandBuilder().setName("botinfo").setDescription("Information and stats about MyProtect."),

    async execute(interaction) {
        const client = interaction.client
        const users = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0)
        const mem = process.memoryUsage().heapUsed / 1024 / 1024

        const embed = brandEmbed()
            .setTitle("🛡️ MyProtect")
            .setThumbnail(client.user?.displayAvatarURL() ?? null)
            .setDescription("The most advanced and easy-to-use bot to help protect your Discord server.")
            .addFields(
                { name: "Servers", value: `${client.guilds.cache.size}`, inline: true },
                { name: "Members", value: `${users.toLocaleString()}`, inline: true },
                { name: "Ping", value: `${Math.max(0, Math.round(client.ws.ping))}ms`, inline: true },
                { name: "Uptime", value: formatUptime(client.uptime ?? 0), inline: true },
                { name: "Memory", value: `${mem.toFixed(1)} MB`, inline: true },
                { name: "Library", value: `discord.js v${djsVersion}`, inline: true }
            )

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setLabel("Dashboard").setStyle(ButtonStyle.Link).setURL(config.dashboardUrl),
            new ButtonBuilder()
                .setLabel("Invite")
                .setStyle(ButtonStyle.Link)
                .setURL(
                    `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&permissions=8&scope=bot%20applications.commands`
                )
        )

        await interaction.reply({ embeds: [embed], components: [row] })
    },
}

export default command
