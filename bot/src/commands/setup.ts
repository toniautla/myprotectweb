import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from "discord.js"
import { config } from "../config"
import { brandEmbed, errorEmbed, successEmbed } from "../lib/embeds"
import { getModuleStates, MODULE_KEYS, MODULE_LABELS, setModule, ModuleKey } from "../lib/modules"
import { Command } from "../types"

const MODULE_DESCRIPTIONS: Record<ModuleKey, string> = {
    Moderation: "Ban, kick, warn and purge commands.",
    Rules: "Post a clean, configurable rules embed.",
    Backups: "Automatic server backups you can restore.",
    AntiRaid: "Detect and stop mass-join raids.",
    AntiPhishing: "Delete scam & phishing links.",
    Webhooks: "Remove compromised webhooks.",
    ContentProtect: "Restrict channels to their topic.",
    Verification: "Gate new members behind a verify button / captcha.",
    Logging: "Log mod actions and joins/leaves to a channel.",
}

async function render(guildId: string) {
    const states = await getModuleStates(guildId)

    const embed = brandEmbed()
        .setTitle("🚀 Quick Setup")
        .setDescription(
            "Use the dropdown to choose which modules should be **enabled**. " +
                "Anything you leave unselected will be disabled.\n\n" +
                `Prefer a UI? Open the [web dashboard](${config.dashboardUrl}/dashboard/${guildId}).`
        )

    const menu = new StringSelectMenuBuilder()
        .setCustomId("setup:modules")
        .setPlaceholder("Select the modules to enable…")
        .setMinValues(0)
        .setMaxValues(MODULE_KEYS.length)
        .addOptions(
            MODULE_KEYS.map((key) =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(MODULE_LABELS[key])
                    .setValue(key)
                    .setDescription(MODULE_DESCRIPTIONS[key])
                    .setDefault(states[key])
            )
        )

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)
    const linkRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setLabel("Open Dashboard")
            .setStyle(ButtonStyle.Link)
            .setURL(`${config.dashboardUrl}/dashboard/${guildId}`)
    )

    return { embeds: [embed], components: [selectRow, linkRow] }
}

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Walk through enabling MyProtect modules with a dropdown.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) return
        const payload = await render(interaction.guildId)
        await interaction.reply({ ...payload, ephemeral: true })
    },

    components: {
        async setup(interaction) {
            if (!interaction.isStringSelectMenu() || !interaction.guildId) return

            if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
                await interaction.reply({
                    embeds: [errorEmbed("Missing permission", "You need the **Manage Server** permission.")],
                    ephemeral: true,
                })
                return
            }

            const selected = new Set(interaction.values as ModuleKey[])
            for (const key of MODULE_KEYS) {
                await setModule(interaction.guildId, key, selected.has(key))
            }

            const payload = await render(interaction.guildId)
            await interaction.update(payload)
            await interaction.followUp({
                embeds: [
                    successEmbed(
                        "Setup saved",
                        selected.size
                            ? `Enabled: ${[...selected].map((k) => MODULE_LABELS[k]).join(", ")}.`
                            : "All modules disabled."
                    ),
                ],
                ephemeral: true,
            })
        },
    },
}

export default command
