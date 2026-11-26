import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { errorEmbed, successEmbed } from "../lib/embeds"
import { logEvent, modLogEmbed } from "../lib/logging"
import { requireModeration } from "../lib/moderation"
import { Command } from "../types"

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a user by their ID.")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption((o) => o.setName("user_id").setDescription("The user's ID").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!(await requireModeration(interaction))) return

        const userId = interaction.options.getString("user_id", true).trim()
        const reason = interaction.options.getString("reason") ?? "No reason provided"

        if (!/^\d{16,20}$/.test(userId)) {
            await interaction.reply({ embeds: [errorEmbed("Invalid ID", "Provide a valid Discord user ID.")], ephemeral: true })
            return
        }

        try {
            await interaction.guild!.bans.remove(userId, reason)
            await interaction.reply({ embeds: [successEmbed("User unbanned", `<@${userId}> (\`${userId}\`) was unbanned.`)] })
            await logEvent(
                interaction.guild!,
                modLogEmbed({
                    action: "Unban",
                    color: 0x37ef48,
                    target: { tag: userId, id: userId },
                    moderator: { tag: interaction.user.tag, id: interaction.user.id },
                    reason,
                })
            )
        } catch {
            await interaction.reply({
                embeds: [errorEmbed("Unban failed", "That user isn't banned, or I lack permission.")],
                ephemeral: true,
            })
        }
    },
}

export default command
