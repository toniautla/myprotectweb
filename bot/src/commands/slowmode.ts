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
        .setName("slowmode")
        .setDescription("Set slowmode for this channel.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addIntegerOption((o) =>
            o
                .setName("seconds")
                .setDescription("Seconds between messages (0 to disable, max 21600)")
                .setMinValue(0)
                .setMaxValue(21600)
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const seconds = interaction.options.getInteger("seconds", true)
        const channel = interaction.channel
        if (!channel || !("setRateLimitPerUser" in channel)) {
            await interaction.reply({ embeds: [errorEmbed("Unsupported channel")], ephemeral: true })
            return
        }
        try {
            await (channel as TextChannel).setRateLimitPerUser(seconds)
            await interaction.reply({
                embeds: [
                    successEmbed(
                        "Slowmode updated",
                        seconds === 0 ? "Slowmode disabled." : `Members can send one message every **${seconds}s**.`
                    ),
                ],
            })
        } catch {
            await interaction.reply({ embeds: [errorEmbed("Failed", "Check my **Manage Channels** permission.")], ephemeral: true })
        }
    },
}

export default command
