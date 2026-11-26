import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js"
import { config } from "../config"
import { brandEmbed } from "../lib/embeds"
import { Command } from "../types"

const CATEGORIES: { name: string; commands: [string, string][] }[] = [
    {
        name: "🛡️ Setup & Config",
        commands: [
            ["/dashboard", "Link to the web dashboard"],
            ["/setup", "Enable modules with a dropdown"],
            ["/modules", "Toggle modules with buttons"],
            ["/verifysetup", "Post the verification panel"],
        ],
    },
    {
        name: "📜 Rules",
        commands: [
            ["/rules post", "Publish the rules embed"],
            ["/rules preview", "Preview the rules embed"],
            ["/rules edit", "Quick-edit rules"],
        ],
    },
    {
        name: "🔨 Moderation",
        commands: [
            ["/ban", "Ban a member"],
            ["/kick", "Kick a member"],
            ["/timeout", "Time a member out"],
            ["/untimeout", "Remove a timeout"],
            ["/unban", "Unban a user by ID"],
            ["/warn add|list", "Warn / view warnings"],
            ["/purge", "Bulk-delete messages"],
        ],
    },
    {
        name: "🔒 Security",
        commands: [
            ["/lock", "Lock a channel"],
            ["/unlock", "Unlock a channel"],
            ["/slowmode", "Set channel slowmode"],
            ["/backup create|list", "Create / restore backups"],
        ],
    },
    {
        name: "ℹ️ Info",
        commands: [
            ["/botinfo", "Bot stats"],
            ["/serverinfo", "Server stats"],
            ["/userinfo", "Member info"],
            ["/avatar", "Show an avatar"],
            ["/ping", "Latency"],
        ],
    },
]

const command: Command = {
    data: new SlashCommandBuilder().setName("help").setDescription("List all MyProtect commands."),

    async execute(interaction) {
        const embed = brandEmbed()
            .setTitle("MyProtect — Commands")
            .setDescription("Manage everything in detail from the [dashboard](" + config.dashboardUrl + ").")
        for (const cat of CATEGORIES) {
            embed.addFields({
                name: cat.name,
                value: cat.commands.map(([c, d]) => `\`${c}\` — ${d}`).join("\n"),
            })
        }

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setLabel("Open Dashboard").setStyle(ButtonStyle.Link).setURL(config.dashboardUrl)
        )

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true })
    },
}

export default command
