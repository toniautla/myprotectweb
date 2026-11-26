import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ModalBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js"
import { config } from "../config"
import { collections, RulesDoc } from "../database"
import { brandEmbed, errorEmbed, successEmbed } from "../lib/embeds"
import { isModuleEnabled } from "../lib/modules"
import { Command } from "../types"

function isValidHttpUrl(value?: string): boolean {
    if (!value) return false
    try {
        const u = new URL(value)
        return u.protocol === "http:" || u.protocol === "https:"
    } catch {
        return false
    }
}

/** Build the public rules message from the shared `Bot.rules` document. */
function buildRules(doc: RulesDoc | null) {
    const embed = new EmbedBuilder()
    embed.setColor(doc?.color ? parseInt(doc.color.replace("#", ""), 16) || 0x1a8eff : 0x1a8eff)
    embed.setTitle(doc?.title || "Server Rules")
    if (doc?.description) embed.setDescription(doc.description)
    if (doc?.authorName) {
        embed.setAuthor({
            name: doc.authorName,
            iconURL: isValidHttpUrl(doc.authorIcon) ? doc.authorIcon : undefined,
        })
    }
    if (isValidHttpUrl(doc?.imageUrl)) embed.setImage(doc!.imageUrl!)

    const rules = (doc?.rules || []).filter((r) => r.title && r.description).slice(0, 25)
    if (rules.length) {
        embed.addFields(rules.map((r, i) => ({ name: `${i + 1}. ${r.title}`, value: r.description })))
    }

    // Link buttons (max 5 per row, max 5 rows).
    const buttons = (doc?.buttons || []).filter((b) => b.label && isValidHttpUrl(b.link)).slice(0, 25)
    const rows: ActionRowBuilder<ButtonBuilder>[] = []
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                buttons.slice(i, i + 5).map((b) =>
                    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(b.label).setURL(b.link)
                )
            )
        )
    }

    return { embed, rows, hasContent: Boolean(doc?.title || rules.length) }
}

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("rules")
        .setDescription("Post or preview your server rules.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((s) => s.setName("post").setDescription("Post the rules embed to this channel."))
        .addSubcommand((s) => s.setName("preview").setDescription("Preview the rules embed (only you see it)."))
        .addSubcommand((s) => s.setName("edit").setDescription("Quick-edit the title, description & colour.")),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) return

        if (!(await isModuleEnabled(interaction.guildId, "Rules"))) {
            await interaction.reply({
                embeds: [errorEmbed("Rules disabled", "Enable the **Rules** module with `/modules` first.")],
                ephemeral: true,
            })
            return
        }

        const sub = interaction.options.getSubcommand()
        const doc = await collections.rules().findOne({ _id: interaction.guildId })

        if (sub === "edit") {
            const modal = new ModalBuilder().setCustomId("rules:edit").setTitle("Edit Server Rules")
            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("title")
                        .setLabel("Title")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                        .setValue(doc?.title || "")
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("description")
                        .setLabel("Description")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false)
                        .setValue(doc?.description || "")
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("color")
                        .setLabel("Hex colour (e.g. 1a8eff)")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                        .setValue(doc?.color || "")
                )
            )
            await interaction.showModal(modal)
            return
        }

        const { embed, rows, hasContent } = buildRules(doc)

        if (!hasContent) {
            await interaction.reply({
                embeds: [
                    errorEmbed(
                        "No rules configured",
                        `Set them up on the [dashboard](${config.dashboardUrl}/dashboard/${interaction.guildId}/manage) or run \`/rules edit\`.`
                    ),
                ],
                ephemeral: true,
            })
            return
        }

        if (sub === "preview") {
            await interaction.reply({ embeds: [embed], components: rows, ephemeral: true })
            return
        }

        // post
        const channel = interaction.channel
        if (channel && channel.isTextBased() && "send" in channel) {
            await (channel as TextChannel).send({ embeds: [embed], components: rows })
            await interaction.reply({ embeds: [successEmbed("Rules posted")], ephemeral: true })
        } else {
            await interaction.reply({
                embeds: [errorEmbed("Cannot post here", "Try again in a text channel.")],
                ephemeral: true,
            })
        }
    },

    components: {
        async rules(interaction) {
            if (!interaction.isModalSubmit() || !interaction.guildId) return
            if (interaction.customId !== "rules:edit") return

            const title = interaction.fields.getTextInputValue("title").trim()
            const description = interaction.fields.getTextInputValue("description").trim()
            const color = interaction.fields.getTextInputValue("color").trim().replace("#", "")

            await collections.rules().updateOne(
                { _id: interaction.guildId },
                { $set: { title, description, color } },
                { upsert: true }
            )

            await interaction.reply({
                embeds: [
                    successEmbed("Rules updated", "Run `/rules post` to publish them, or fine-tune on the dashboard."),
                    brandEmbed().setTitle(title || "Server Rules").setDescription(description || "—"),
                ],
                ephemeral: true,
            })
        },
    },
}

export default command
