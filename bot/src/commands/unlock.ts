import {
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js"
import { errorEmbed, successEmbed } from "../lib/embeds"
import { Command } from "../types"

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlock this channel so @everyone can send messages again.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction: ChatInputCommandInteraction) {
        const channel = interaction.channel
        if (!channel || !("permissionOverwrites" in channel)) {
            await interaction.reply({ embeds: [errorEmbed("Unsupported channel")], ephemeral: true })
            return
        }
        try {
            await (channel as TextChannel).permissionOverwrites.edit(interaction.guild!.id, { SendMessages: null })
            await interaction.reply({ embeds: [successEmbed("Channel unlocked", `🔓 <#${channel.id}> is open again.`)] })
        } catch {
            await interaction.reply({ embeds: [errorEmbed("Failed", "Check my **Manage Channels** permission.")], ephemeral: true })
        }
    },
}

export default command
