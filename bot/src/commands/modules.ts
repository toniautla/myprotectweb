import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js"
import { config } from "../config"
import { brandEmbed, errorEmbed } from "../lib/embeds"
import { getModuleStates, MODULE_KEYS, MODULE_LABELS, setModule, ModuleKey } from "../lib/modules"
import { Command } from "../types"

const MODULE_EMOJI: Record<ModuleKey, string> = {
    Moderation: "🔨",
    Rules: "📜",
    Backups: "💾",
    AntiRaid: "🛡️",
    AntiPhishing: "🎣",
    Webhooks: "🪝",
    ContentProtect: "📥",
    Verification: "✅",
    Logging: "📋",
}

async function render(guildId: string) {
    const states = await getModuleStates(guildId)

    const embed = brandEmbed()
        .setTitle("⚙️ Module Configuration")
        .setDescription(
            "Click a module to toggle it. 🟢 = enabled, ⚪ = disabled.\n" +
                `Manage everything in detail on the [dashboard](${config.dashboardUrl}/dashboard/${guildId}).`
        )
        .addFields(
            MODULE_KEYS.map((key) => ({
                name: `${MODULE_EMOJI[key]} ${MODULE_LABELS[key]}`,
                value: states[key] ? "🟢 Enabled" : "⚪ Disabled",
                inline: true,
            }))
        )

    // Up to 5 buttons per action row.
    const rows: ActionRowBuilder<ButtonBuilder>[] = []
    for (let i = 0; i < MODULE_KEYS.length; i += 5) {
        const slice = MODULE_KEYS.slice(i, i + 5)
        rows.push(
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                slice.map((key) =>
                    new ButtonBuilder()
                        .setCustomId(`modules:toggle:${key}`)
                        .setLabel(MODULE_LABELS[key])
                        .setEmoji(MODULE_EMOJI[key])
                        .setStyle(states[key] ? ButtonStyle.Success : ButtonStyle.Secondary)
                )
            )
        )
    }

    return { embeds: [embed], components: rows }
}

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("modules")
        .setDescription("View and toggle MyProtect modules for this server.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) return
        const payload = await render(interaction.guildId)
        await interaction.reply({ ...payload, ephemeral: true })
    },

    components: {
        async modules(interaction) {
            if (!interaction.isButton() || !interaction.guildId) return

            if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
                await interaction.reply({
                    embeds: [errorEmbed("Missing permission", "You need the **Manage Server** permission.")],
                    ephemeral: true,
                })
                return
            }

            const key = interaction.customId.split(":")[2] as ModuleKey
            if (!MODULE_KEYS.includes(key)) return

            await setModule(interaction.guildId, key, null)
            const payload = await render(interaction.guildId)
            await interaction.update(payload)
        },
    },
}

export default command
