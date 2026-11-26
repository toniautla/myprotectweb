import { SlashCommandBuilder } from "discord.js"
import { brandEmbed } from "../lib/embeds"
import { Command } from "../types"

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Information about a member.")
        .addUserOption((o) => o.setName("user").setDescription("The member (defaults to you)").setRequired(false)),

    async execute(interaction) {
        if (!interaction.guild) return
        const user = interaction.options.getUser("user") ?? interaction.user
        const member = await interaction.guild.members.fetch(user.id).catch(() => null)

        const embed = brandEmbed()
            .setTitle(user.tag)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "User ID", value: `\`${user.id}\``, inline: true },
                { name: "Bot", value: user.bot ? "Yes" : "No", inline: true },
                {
                    name: "Account Created",
                    value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
                    inline: false,
                }
            )

        if (member) {
            if (member.joinedTimestamp) {
                embed.addFields({
                    name: "Joined Server",
                    value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
                    inline: false,
                })
            }
            const roles = member.roles.cache.filter((r) => r.id !== interaction.guild!.id)
            embed.addFields({
                name: `Roles (${roles.size})`,
                value: roles.size ? roles.map((r) => `<@&${r.id}>`).slice(0, 20).join(" ") : "None",
            })
        }

        await interaction.reply({ embeds: [embed] })
    },
}

export default command
