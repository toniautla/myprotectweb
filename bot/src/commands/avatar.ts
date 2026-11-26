import { SlashCommandBuilder } from "discord.js"
import { brandEmbed } from "../lib/embeds"
import { Command } from "../types"

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Show a user's avatar.")
        .addUserOption((o) => o.setName("user").setDescription("The user (defaults to you)").setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser("user") ?? interaction.user
        const embed = brandEmbed()
            .setTitle(`${user.username}'s avatar`)
            .setImage(user.displayAvatarURL({ size: 1024 }))
        await interaction.reply({ embeds: [embed] })
    },
}

export default command
