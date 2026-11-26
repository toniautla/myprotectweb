import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { errorEmbed, successEmbed } from "../lib/embeds"
import { logEvent, modLogEmbed } from "../lib/logging"
import { checkHierarchy, requireModeration } from "../lib/moderation"
import { Command } from "../types"

const DURATIONS = [
    { name: "60 seconds", value: 60 },
    { name: "5 minutes", value: 300 },
    { name: "10 minutes", value: 600 },
    { name: "1 hour", value: 3600 },
    { name: "1 day", value: 86400 },
    { name: "1 week", value: 604800 },
]

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Temporarily mute (time out) a member.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption((o) => o.setName("user").setDescription("Member to time out").setRequired(true))
        .addIntegerOption((o) => {
            o.setName("duration").setDescription("How long").setRequired(true)
            DURATIONS.forEach((d) => o.addChoices({ name: d.name, value: d.value }))
            return o
        })
        .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!(await requireModeration(interaction))) return

        const user = interaction.options.getUser("user", true)
        const seconds = interaction.options.getInteger("duration", true)
        const reason = interaction.options.getString("reason") ?? "No reason provided"
        const member = await interaction.guild!.members.fetch(user.id).catch(() => null)

        const problem = checkHierarchy(interaction, member)
        if (problem) {
            await interaction.reply({ embeds: [errorEmbed("Cannot time out", problem)], ephemeral: true })
            return
        }

        try {
            await member!.timeout(seconds * 1000, reason)
            const label = DURATIONS.find((d) => d.value === seconds)?.name ?? `${seconds}s`
            await interaction.reply({
                embeds: [successEmbed("Member timed out", `**${user.tag}** was timed out for **${label}**.\n**Reason:** ${reason}`)],
            })
            await logEvent(
                interaction.guild!,
                modLogEmbed({
                    action: "Timeout",
                    color: 0xf5a623,
                    target: { tag: user.tag, id: user.id },
                    moderator: { tag: interaction.user.tag, id: interaction.user.id },
                    reason,
                    extra: [{ name: "Duration", value: label }],
                })
            )
        } catch {
            await interaction.reply({
                embeds: [errorEmbed("Timeout failed", "Check my **Timeout Members** permission and role position.")],
                ephemeral: true,
            })
        }
    },
}

export default command
