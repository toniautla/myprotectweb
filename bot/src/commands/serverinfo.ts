import { ChannelType, SlashCommandBuilder } from "discord.js"
import { brandEmbed } from "../lib/embeds"
import { Command } from "../types"

const command: Command = {
    data: new SlashCommandBuilder().setName("serverinfo").setDescription("Information about this server."),

    async execute(interaction) {
        if (!interaction.guild) return
        const g = interaction.guild
        const owner = await g.fetchOwner().catch(() => null)
        const channels = g.channels.cache
        const text = channels.filter((c) => c.type === ChannelType.GuildText).size
        const voice = channels.filter(
            (c) => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice
        ).size

        const embed = brandEmbed()
            .setTitle(g.name)
            .setThumbnail(g.iconURL({ size: 256 }))
            .addFields(
                { name: "Owner", value: owner ? `<@${owner.id}>` : "Unknown", inline: true },
                { name: "Members", value: `${g.memberCount}`, inline: true },
                { name: "Roles", value: `${g.roles.cache.size}`, inline: true },
                { name: "Text Channels", value: `${text}`, inline: true },
                { name: "Voice Channels", value: `${voice}`, inline: true },
                { name: "Boosts", value: `${g.premiumSubscriptionCount ?? 0} (Tier ${g.premiumTier})`, inline: true },
                { name: "Created", value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
                { name: "Server ID", value: `\`${g.id}\``, inline: true }
            )

        await interaction.reply({ embeds: [embed] })
    },
}

export default command
