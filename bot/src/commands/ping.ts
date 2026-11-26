import { SlashCommandBuilder } from "discord.js"
import { brandEmbed } from "../lib/embeds"
import { Command } from "../types"

const command: Command = {
    data: new SlashCommandBuilder().setName("ping").setDescription("Check the bot's latency."),

    async execute(interaction) {
        const sent = await interaction.reply({ content: "Pinging…", fetchReply: true })
        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp
        const embed = brandEmbed()
            .setTitle("🏓 Pong!")
            .addFields(
                { name: "Roundtrip", value: `${roundtrip}ms`, inline: true },
                { name: "WebSocket", value: `${Math.max(0, Math.round(interaction.client.ws.ping))}ms`, inline: true }
            )
        await interaction.editReply({ content: null, embeds: [embed] })
    },
}

export default command
