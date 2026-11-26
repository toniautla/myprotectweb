import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { errorEmbed, successEmbed } from "../lib/embeds"
import { requireModeration } from "../lib/moderation"
import { Command } from "../types"

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Remove a member's timeout.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!(await requireModeration(interaction))) return

        const user = interaction.options.getUser("user", true)
        const member = await interaction.guild!.members.fetch(user.id).catch(() => null)
        if (!member) {
            await interaction.reply({ embeds: [errorEmbed("Not found", "That user isn't in this server.")], ephemeral: true })
            return
        }

        try {
            await member.timeout(null)
            await interaction.reply({ embeds: [successEmbed("Timeout removed", `**${user.tag}** can speak again.`)] })
        } catch {
            await interaction.reply({ embeds: [errorEmbed("Failed", "Check my permissions.")], ephemeral: true })
        }
    },
}

export default command
