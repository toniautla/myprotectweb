import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js"
import { BRAND_COLOR } from "../config"
import { RulesDoc } from "../database"

function isValidHttpUrl(value?: string): boolean {
    if (!value) return false
    try {
        const u = new URL(value)
        return u.protocol === "http:" || u.protocol === "https:"
    } catch {
        return false
    }
}

/** Build the public rules message (embed + link buttons) from `Bot.rules`. */
export function buildRulesMessage(doc: RulesDoc | null) {
    const embed = new EmbedBuilder()
    embed.setColor(doc?.color ? parseInt(doc.color.replace("#", ""), 16) || BRAND_COLOR : BRAND_COLOR)
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
