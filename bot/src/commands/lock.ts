import {
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js"
import { errorEmbed, successEmbed } from "../lib/embeds"
import { logEvent, modLogEmbed } from "../lib/logging"
import { Command } from "../types"

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Lock this channel so @everyone can't send messages.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        const channel = interaction.channel
        if (!channel || !("permissionOverwrites" in channel)) {
            await interaction.reply({ embeds: [errorEmbed("Unsupported channel")], ephemeral: true })
            return
        }
        const reason = interaction.options.getString("reason") ?? "No reason provided"
        try {
            await (channel as TextChannel).permissionOverwrites.edit(interaction.guild!.id, { SendMessages: false })
            await interaction.reply({ embeds: [successEmbed("Channel locked", `🔒 <#${channel.id}> is now locked.`)] })
            await logEvent(
                interaction.guild!,
                modLogEmbed({
                    action: "Channel Locked",
                    color: 0xf64f52,
                    target: { tag: `#${(channel as TextChannel).name}`, id: channel.id },
                    moderator: { tag: interaction.user.tag, id: interaction.user.id },
                    reason,
                })
            )
        } catch {
            await interaction.reply({ embeds: [errorEmbed("Failed", "Check my **Manage Channels** permission.")], ephemeral: true })
        }
    },
}

export default command
