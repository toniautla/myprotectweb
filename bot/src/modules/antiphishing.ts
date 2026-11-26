import { Message, PermissionFlagsBits } from "discord.js"
import { collections } from "../database"
import { isModuleEnabled } from "../lib/modules"
import { isKnownPhish } from "../lib/phishingList"

/** Domains that are almost always Discord/Steam scam/phishing fronts. */
const DEFAULT_BLOCKLIST = [
    "discordnitro.",
    "discrod.",
    "discorde.",
    "disocrd.",
    "dlscord.",
    "discord-nitro.",
    "nitro-discord.",
    "free-nitro.",
    "discordgift.",
    "discord-gift.",
    "discordapp.gift",
    "steamcommunity.ru",
    "steancommunity.",
    "stearncommunity.",
    "dlscordapp.",
]

const SCAM_HINTS = [/free\s+nitro/i, /steam\s+gift/i, /claim\s+your\s+nitro/i, /gift.*nitro/i]

function extractDomains(content: string): string[] {
    const urls = content.match(/https?:\/\/[^\s<>()]+/gi) || []
    return urls
        .map((u) => {
            try {
                return new URL(u).hostname.toLowerCase()
            } catch {
                return ""
            }
        })
        .filter(Boolean)
}

/** Optional per-guild custom domains stored in `Bot.phishing_links`. */
async function getCustomDomains(guildId: string): Promise<string[]> {
    const doc = await collections.phishingLinks().findOne({ _id: guildId })
    return (doc?.domains || []).map((d) => d.toLowerCase())
}

export async function handleAntiPhishing(message: Message): Promise<void> {
    if (!message.inGuild() || message.author.bot) return
    if (!(await isModuleEnabled(message.guildId, "AntiPhishing"))) return
    // Never touch admins.
    if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return

    const domains = extractDomains(message.content)
    if (!domains.length) return

    const blocklist = [...DEFAULT_BLOCKLIST, ...(await getCustomDomains(message.guildId))]
    const hitDomain = domains.some(
        (d) => isKnownPhish(d) || blocklist.some((b) => d.includes(b))
    )
    const hitHint = SCAM_HINTS.some((r) => r.test(message.content))

    if (hitDomain || hitHint) {
        await message.delete().catch(() => null)
        const warn = await message.channel
            .send({
                content: `⚠️ <@${message.author.id}>, that message was removed — it looked like a phishing / scam link.`,
            })
            .catch(() => null)
        if (warn) setTimeout(() => warn.delete().catch(() => null), 8000)
    }
}
