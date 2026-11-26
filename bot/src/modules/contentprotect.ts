import { Message, PermissionFlagsBits } from "discord.js"
import { collections } from "../database"
import { isModuleEnabled } from "../lib/modules"

const URL_RE = /https?:\/\/[^\s<>()]+/i
const YOUTUBE_RE = /(youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts)/i

function hasMedia(message: Message): boolean {
    if (message.attachments.some((a) => (a.contentType || "").match(/^(image|video)\//))) return true
    if (message.attachments.size > 0) return true
    if (message.embeds.some((e) => e.image || e.video || e.thumbnail)) return true
    return false
}

/**
 * Enforce "filtered channels" configured on the dashboard (`Bot.channels`):
 *   media   -> message must contain an image/video attachment
 *   links   -> message must contain a URL
 *   youtube -> message must contain a YouTube link
 * Non-conforming messages from non-admins are removed.
 */
export async function handleContentProtect(message: Message): Promise<void> {
    if (!message.inGuild() || message.author.bot) return
    if (!(await isModuleEnabled(message.guildId, "ContentProtect"))) return
    if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return

    const doc = await collections.channels().findOne({ _id: message.guildId })
    if (!doc) return

    const channelId = message.channelId
    let requirement: string | null = null
    let ok = true

    if (doc.media?.includes(channelId)) {
        requirement = "an image or video"
        ok = hasMedia(message)
    } else if (doc.youtube?.includes(channelId)) {
        requirement = "a YouTube link"
        ok = YOUTUBE_RE.test(message.content)
    } else if (doc.links?.includes(channelId)) {
        requirement = "a link"
        ok = URL_RE.test(message.content)
    } else {
        return // channel not filtered
    }

    if (!ok) {
        await message.delete().catch(() => null)
        const warn = await message.channel
            .send({ content: `🧹 <@${message.author.id}>, this channel only allows messages containing ${requirement}.` })
            .catch(() => null)
        if (warn) setTimeout(() => warn.delete().catch(() => null), 6000)
    }
}
