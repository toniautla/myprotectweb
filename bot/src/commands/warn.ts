import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { collections } from "../database"
import { brandEmbed, errorEmbed, successEmbed } from "../lib/embeds"
import { logEvent, modLogEmbed } from "../lib/logging"
import { checkHierarchy, requireModeration } from "../lib/moderation"
import { Command } from "../types"

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn members and view their warnings.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand((s) =>
            s
                .setName("add")
                .setDescription("Warn a member.")
                .addUserOption((o) => o.setName("user").setDescription("Member to warn").setRequired(true))
                .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(true))
        )
        .addSubcommand((s) =>
            s
                .setName("list")
                .setDescription("List a member's warnings.")
                .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true))
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!(await requireModeration(interaction))) return

        const sub = interaction.options.getSubcommand()
        const user = interaction.options.getUser("user", true)

        if (sub === "add") {
            const reason = interaction.options.getString("reason", true)
            const member = await interaction.guild!.members.fetch(user.id).catch(() => null)
            const problem = checkHierarchy(interaction, member)
            if (problem) {
                await interaction.reply({ embeds: [errorEmbed("Cannot warn", problem)], ephemeral: true })
                return
            }

            await collections.warnings().insertOne({
                guildId: interaction.guildId!,
                userId: user.id,
                moderatorId: interaction.user.id,
                reason,
                createdAt: new Date(),
            })

            const total = await collections.warnings().countDocuments({
                guildId: interaction.guildId!,
                userId: user.id,
            })

            await user
                .send(`You were warned in **${interaction.guild!.name}**.\nReason: ${reason}`)
                .catch(() => null)

            await interaction.reply({
                embeds: [successEmbed("Member warned", `**${user.tag}** now has **${total}** warning(s).\n**Reason:** ${reason}`)],
            })
            await logEvent(
                interaction.guild!,
                modLogEmbed({
                    action: "Warn",
                    color: 0xf5a623,
                    target: { tag: user.tag, id: user.id },
                    moderator: { tag: interaction.user.tag, id: interaction.user.id },
                    reason,
                    extra: [{ name: "Total warnings", value: String(total) }],
                })
            )
            return
        }

        // list
        const warns = await collections
            .warnings()
            .find({ guildId: interaction.guildId!, userId: user.id })
            .sort({ createdAt: -1 })
            .limit(25)
            .toArray()

        if (!warns.length) {
            await interaction.reply({
                embeds: [brandEmbed().setTitle(`Warnings — ${user.tag}`).setDescription("No warnings. ✨")],
                ephemeral: true,
            })
            return
        }

        const embed = brandEmbed()
            .setTitle(`Warnings — ${user.tag}`)
            .setDescription(`Total: **${warns.length}**`)
            .addFields(
                warns.map((w, i) => ({
                    name: `#${i + 1} • <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>`,
                    value: `**By:** <@${w.moderatorId}>\n**Reason:** ${w.reason}`,
                }))
            )

        await interaction.reply({ embeds: [embed], ephemeral: true })
    },
}

export default command
