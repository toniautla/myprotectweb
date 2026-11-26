import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    Guild,
    GuildMember,
} from "discord.js"
import { BRAND_COLOR } from "../config"
import { collections, VerificationDoc } from "../database"

/** In-memory captcha challenges (single bot instance). Keyed by guild:user. */
const challenges = new Map<string, { answer: string; expires: number }>()

export function setChallenge(guildId: string, userId: string, answer: string) {
    challenges.set(`${guildId}:${userId}`, { answer, expires: Date.now() + 5 * 60 * 1000 })
}
export function takeChallenge(guildId: string, userId: string): string | null {
    const key = `${guildId}:${userId}`
    const c = challenges.get(key)
    challenges.delete(key)
    if (!c || Date.now() > c.expires) return null
    return c.answer
}

/** A simple arithmetic captcha. */
export function makeCaptcha(): { question: string; answer: string } {
    const a = Math.floor(Math.random() * 9) + 1
    const b = Math.floor(Math.random() * 9) + 1
    return { question: `What is ${a} + ${b}?`, answer: String(a + b) }
}

export async function getConfig(guildId: string): Promise<VerificationDoc | null> {
    return collections.verification().findOne({ _id: guildId })
}

/** The public verification panel (embed + "Verify" button). */
export function verifyPanel(message?: string) {
    const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle("✅ Verification Required")
        .setDescription(
            message ||
                "Click the button below to verify yourself and gain access to the server."
        )
        .setFooter({ text: "MyProtect" })

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("verify:start")
            .setLabel("Verify")
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅")
    )
    return { embeds: [embed], components: [row] }
}

export type GrantResult = "ok" | "no-role" | "already" | "error"

/** Give the configured verification role to a member. */
export async function grantRole(
    guild: Guild,
    member: GuildMember,
    config: VerificationDoc
): Promise<GrantResult> {
    if (!config.roleId) return "no-role"
    if (member.roles.cache.has(config.roleId)) return "already"

    const role = guild.roles.cache.get(config.roleId)
    const me = guild.members.me
    if (!role || !me || role.position >= me.roles.highest.position) return "error"

    try {
        await member.roles.add(role, "MyProtect verification")
        return "ok"
    } catch {
        return "error"
    }
}
