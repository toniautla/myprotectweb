import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { errorEmbed, successEmbed } from "../lib/embeds"
import { logEvent, modLogEmbed } from "../lib/logging"
import { checkHierarchy, requireModeration } from "../lib/moderation"
import { Command } from "../types"

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a member from the server.")
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption((o) => o.setName("user").setDescription("The member to kick").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason for the kick").setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!(await requireModeration(interaction))) return

        const user = interaction.options.getUser("user", true)
        const reason = interaction.options.getString("reason") ?? "No reason provided"
        const member = await interaction.guild!.members.fetch(user.id).catch(() => null)

        const problem = checkHierarchy(interaction, member)
        if (problem) {
            await interaction.reply({ embeds: [errorEmbed("Cannot kick", problem)], ephemeral: true })
            return
        }

        try {
            await member!.kick(reason)
            await interaction.reply({
                embeds: [successEmbed("Member kicked", `**${user.tag}** was kicked.\n**Reason:** ${reason}`)],
            })
            await logEvent(
                interaction.guild!,
                modLogEmbed({
                    action: "Kick",
                    color: 0xf5a623,
                    target: { tag: user.tag, id: user.id },
                    moderator: { tag: interaction.user.tag, id: interaction.user.id },
                    reason,
                })
            )
        } catch {
            await interaction.reply({
                embeds: [errorEmbed("Kick failed", "I couldn't kick that user. Check my permissions.")],
                ephemeral: true,
            })
        }
    },
}

export default command
