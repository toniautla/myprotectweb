import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
} from "discord.js"
import { ObjectId } from "mongodb"
import { collections } from "../database"
import { brandEmbed, errorEmbed, successEmbed } from "../lib/embeds"
import { createBackup, listBackups, restoreBackup } from "../lib/backups"
import { isModuleEnabled } from "../lib/modules"
import { Command } from "../types"

async function requireBackups(interaction: ChatInputCommandInteraction): Promise<boolean> {
    if (!interaction.guildId) return false
    if (await isModuleEnabled(interaction.guildId, "Backups")) return true
    await interaction.reply({
        embeds: [errorEmbed("Backups disabled", "Enable the **Backups** module with `/modules` first.")],
        ephemeral: true,
    })
    return false
}

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("backup")
        .setDescription("Create and restore server backups.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((s) =>
            s
                .setName("create")
                .setDescription("Create a backup of roles & channels now.")
                .addStringOption((o) => o.setName("name").setDescription("A label for this backup").setRequired(false))
        )
        .addSubcommand((s) => s.setName("list").setDescription("List and restore backups.")),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!(await requireBackups(interaction))) return

        const sub = interaction.options.getSubcommand()

        if (sub === "create") {
            await interaction.deferReply({ ephemeral: true })
            const name = interaction.options.getString("name") || `Backup ${new Date().toLocaleString("en-GB")}`
            const backup = await createBackup(interaction.guild!, name)
            await interaction.editReply({
                embeds: [
                    successEmbed(
                        "Backup created",
                        `**${name}**\n${backup.data.roles.length} roles · ${backup.data.channels.length} channels`
                    ),
                ],
            })
            return
        }

        // list
        const backups = await listBackups(interaction.guildId!)
        if (!backups.length) {
            await interaction.reply({
                embeds: [errorEmbed("No backups", "Create one with `/backup create`.")],
                ephemeral: true,
            })
            return
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId("backup:select")
            .setPlaceholder("Choose a backup to restore…")
            .addOptions(
                backups.map((b) => ({
                    label: b.name.slice(0, 100),
                    value: String(b._id),
                    description: `${b.data.roles.length} roles · ${b.data.channels.length} channels`,
                }))
            )

        await interaction.reply({
            embeds: [brandEmbed().setTitle("💾 Server Backups").setDescription("Select a backup below to restore it.")],
            components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
            ephemeral: true,
        })
    },

    components: {
        async backup(interaction) {
            if (!interaction.guildId) return

            // Step 1: a backup was chosen -> show confirm button.
            if (interaction.isStringSelectMenu() && interaction.customId === "backup:select") {
                const id = interaction.values[0]
                const backup = await collections.backups().findOne({ _id: new ObjectId(id) })
                if (!backup) {
                    await interaction.update({ embeds: [errorEmbed("Backup not found")], components: [] })
                    return
                }
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`backup:restore:${id}`)
                        .setLabel("Restore (additive)")
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji("♻️"),
                    new ButtonBuilder().setCustomId("backup:cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
                )
                await interaction.update({
                    embeds: [
                        brandEmbed()
                            .setTitle(`Restore: ${backup.name}`)
                            .setDescription(
                                "This will recreate any roles & channels from the backup that are **missing** " +
                                    "(matched by name). Existing content is never deleted."
                            ),
                    ],
                    components: [row],
                })
                return
            }

            if (!interaction.isButton()) return

            if (interaction.customId === "backup:cancel") {
                await interaction.update({ embeds: [brandEmbed().setTitle("Cancelled")], components: [] })
                return
            }

            if (interaction.customId.startsWith("backup:restore:")) {
                if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                    await interaction.reply({
                        embeds: [errorEmbed("Missing permission", "You need **Administrator**.")],
                        ephemeral: true,
                    })
                    return
                }
                const id = interaction.customId.split(":")[2]
                const backup = await collections.backups().findOne({ _id: new ObjectId(id) })
                if (!backup) {
                    await interaction.update({ embeds: [errorEmbed("Backup not found")], components: [] })
                    return
                }
                await interaction.update({
                    embeds: [brandEmbed().setTitle("Restoring…").setDescription("This may take a moment.")],
                    components: [],
                })
                const result = await restoreBackup(interaction.guild!, backup)
                await interaction.editReply({
                    embeds: [
                        successEmbed(
                            "Restore complete",
                            `Created ${result.rolesCreated} role(s) and ${result.channelsCreated} channel(s).`
                        ),
                    ],
                })
            }
        },
    },
}

export default command
