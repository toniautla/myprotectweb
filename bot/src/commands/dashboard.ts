import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js"
import { config } from "../config"
import { infoEmbed } from "../lib/embeds"
import { Command } from "../types"

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("dashboard")
        .setDescription("Get a link to the MyProtect web dashboard for this server."),

    async execute(interaction) {
        const guildId = interaction.guildId!
        const url = `${config.dashboardUrl}/dashboard/${guildId}`

        const embed = infoEmbed(
            "MyProtect Dashboard",
            "Manage every module, rules and filtered channels from the web dashboard. " +
                "Changes you make there apply instantly to the bot — and vice-versa."
        )

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setLabel("Open this server").setStyle(ButtonStyle.Link).setURL(url),
            new ButtonBuilder()
                .setLabel("All servers")
                .setStyle(ButtonStyle.Link)
                .setURL(`${config.dashboardUrl}/dashboard`)
        )

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true })
    },
}

export default command
