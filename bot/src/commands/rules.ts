import {
    ActionRowBuilder,
    ChatInputCommandInteraction,
    ModalBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js"
import { config } from "../config"
import { collections } from "../database"
import { brandEmbed, errorEmbed, successEmbed } from "../lib/embeds"
import { isModuleEnabled } from "../lib/modules"
import { buildRulesMessage } from "../lib/rulesMessage"
import { Command } from "../types"

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

        const { embed, rows, hasContent } = buildRulesMessage(doc)

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
