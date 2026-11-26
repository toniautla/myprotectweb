import {
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js"
import { errorEmbed, successEmbed } from "../lib/embeds"
import { requireModeration } from "../lib/moderation"
import { Command } from "../types"

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Bulk-delete recent messages in this channel.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption((o) =>
            o
                .setName("amount")
                .setDescription("How many messages to delete (1–100)")
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        )
        .addUserOption((o) => o.setName("user").setDescription("Only delete messages from this user").setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!(await requireModeration(interaction))) return

        const amount = interaction.options.getInteger("amount", true)
        const user = interaction.options.getUser("user")
        const channel = interaction.channel

        if (!channel || !("bulkDelete" in channel)) {
            await interaction.reply({ embeds: [errorEmbed("Unsupported channel")], ephemeral: true })
            return
        }

        await interaction.deferReply({ ephemeral: true })

        try {
            const text = channel as TextChannel
            let messages = await text.messages.fetch({ limit: user ? 100 : amount })
            if (user) messages = messages.filter((m) => m.author.id === user.id).first(amount) as any

            const deleted = await text.bulkDelete(messages, true)
            const count = "size" in deleted ? deleted.size : (deleted as any).length ?? amount
            await interaction.editReply({
                embeds: [
                    successEmbed(
                        "Messages purged",
                        `Deleted ${count} message(s)${user ? ` from ${user.tag}` : ""}. ` +
                            "(Messages older than 14 days can't be bulk-deleted.)"
                    ),
                ],
            })
        } catch {
            await interaction.editReply({
                embeds: [errorEmbed("Purge failed", "Check my **Manage Messages** permission.")],
            })
        }
    },
}

export default command
