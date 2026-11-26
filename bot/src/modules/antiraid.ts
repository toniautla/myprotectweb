import { GuildMember } from "discord.js"
import { isModuleEnabled } from "../lib/modules"

/** Join timestamps per guild, for burst detection. */
const joinWindows = new Map<string, number[]>()

const WINDOW_MS = 10_000 // 10 seconds
const JOIN_THRESHOLD = 6 // joins within the window to count as a raid
const NEW_ACCOUNT_MS = 1000 * 60 * 60 * 24 * 3 // accounts younger than 3 days

/**
 * Simple sliding-window raid detector. When more than JOIN_THRESHOLD members
 * join within WINDOW_MS, newly-joining accounts (especially brand-new ones) are
 * kicked. Conservative by design — it only kicks, never mass-bans.
 */
export async function handleAntiRaid(member: GuildMember): Promise<void> {
    if (member.user.bot) return
    if (!(await isModuleEnabled(member.guild.id, "AntiRaid"))) return

    const now = Date.now()
    const window = (joinWindows.get(member.guild.id) || []).filter((t) => now - t < WINDOW_MS)
    window.push(now)
    joinWindows.set(member.guild.id, window)

    const raiding = window.length >= JOIN_THRESHOLD
    if (!raiding) return

    const isNewAccount = now - member.user.createdTimestamp < NEW_ACCOUNT_MS
    if (!member.kickable) return

    // During a burst, kick the joining member if the account is new.
    if (isNewAccount) {
        await member
            .kick("MyProtect Anti-Raid: suspicious join during a raid burst")
            .catch(() => null)

        // Try to alert the system channel.
        const channel = member.guild.systemChannel
        if (channel && channel.isTextBased()) {
            channel
                .send({
                    content: `🛡️ **Anti-Raid:** possible raid detected (${window.length} joins in ${
                        WINDOW_MS / 1000
                    }s). Removed <@${member.id}> (new account).`,
                })
                .catch(() => null)
        }
    }
}
