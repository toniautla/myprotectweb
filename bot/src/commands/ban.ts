import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js"
import { brandEmbed, errorEmbed, successEmbed } from "../lib/embeds"
import { checkHierarchy, requireModeration } from "../lib/moderation"
import { Command } from "../types"

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a member from the server.")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption((o) => o.setName("user").setDescription("The member to ban").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason for the ban").setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!(await requireModeration(interaction))) return

        const user = interaction.options.getUser("user", true)
        const reason = interaction.options.getString("reason") ?? "No reason provided"
        const member = await interaction.guild!.members.fetch(user.id).catch(() => null)

        // If they are in the guild, enforce hierarchy.
        if (member) {
            const problem = checkHierarchy(interaction, member)
            if (problem) {
                await interaction.reply({ embeds: [errorEmbed("Cannot ban", problem)], ephemeral: true })
                return
            }
        }

        const confirm = brandEmbed()
            .setTitle("⚠️ Confirm ban")
            .setDescription(`Are you sure you want to ban **${user.tag}**?`)
            .addFields({ name: "Reason", value: reason })

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`mod:ban:${user.id}:${encodeURIComponent(reason).slice(0, 80)}`)
                .setLabel("Ban")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🔨"),
            new ButtonBuilder().setCustomId("mod:cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
        )

        await interaction.reply({ embeds: [confirm], components: [row], ephemeral: true })
    },

    components: {
        async mod(interaction) {
            if (!interaction.isButton() || !interaction.guildId) return
            const [, action, userId, reasonEnc] = interaction.customId.split(":")

            if (action === "cancel") {
                await interaction.update({ embeds: [brandEmbed().setTitle("Cancelled")], components: [] })
                return
            }
            if (action !== "ban") return

            if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
                await interaction.reply({
                    embeds: [errorEmbed("Missing permission", "You need the **Ban Members** permission.")],
                    ephemeral: true,
                })
                return
            }

            const reason = reasonEnc ? decodeURIComponent(reasonEnc) : "No reason provided"
            try {
                await interaction.guild!.members.ban(userId, { reason })
                await interaction.update({
                    embeds: [successEmbed("Member banned", `<@${userId}> was banned.\n**Reason:** ${reason}`)],
                    components: [],
                })
            } catch {
                await interaction.update({
                    embeds: [errorEmbed("Ban failed", "I couldn't ban that user. Check my permissions.")],
                    components: [],
                })
            }
        },
    },
}

export default command
