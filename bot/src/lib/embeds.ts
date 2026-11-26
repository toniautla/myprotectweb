import { EmbedBuilder } from "discord.js"
import { BRAND_COLOR } from "../config"

export function brandEmbed(): EmbedBuilder {
    return new EmbedBuilder().setColor(BRAND_COLOR).setFooter({ text: "MyProtect" }).setTimestamp()
}

export function successEmbed(title: string, description?: string): EmbedBuilder {
    const e = new EmbedBuilder().setColor(0x37ef48).setTitle(`✅ ${title}`)
    if (description) e.setDescription(description)
    return e
}

export function errorEmbed(title: string, description?: string): EmbedBuilder {
    const e = new EmbedBuilder().setColor(0xf64f52).setTitle(`❌ ${title}`)
    if (description) e.setDescription(description)
    return e
}

export function infoEmbed(title: string, description?: string): EmbedBuilder {
    const e = brandEmbed().setTitle(title)
    if (description) e.setDescription(description)
    return e
}
