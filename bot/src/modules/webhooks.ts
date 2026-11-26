import {
    AuditLogEvent,
    GuildChannel,
    PermissionFlagsBits,
    DMChannel,
    NonThreadGuildBasedChannel,
} from "discord.js"
import { isModuleEnabled } from "../lib/modules"

/**
 * Webhook protection. When a channel's webhooks change, we inspect the audit
 * log for a very recent WEBHOOK_CREATE. If the creator is NOT an administrator
 * (a common raid vector: a compromised account or bot spins up a webhook to
 * spam/raid), the newly created webhook is deleted.
 */
export async function handleWebhookUpdate(
    channel: NonThreadGuildBasedChannel | DMChannel
): Promise<void> {
    if (!("guild" in channel) || !channel.guild) return
    const guild = (channel as GuildChannel).guild
    if (!(await isModuleEnabled(guild.id, "Webhooks"))) return

    const me = guild.members.me
    if (!me?.permissions.has(PermissionFlagsBits.ManageWebhooks)) return
    if (!me.permissions.has(PermissionFlagsBits.ViewAuditLog)) return

    try {
        const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.WebhookCreate, limit: 1 })
        const entry = logs.entries.first()
        if (!entry || !entry.createdTimestamp) return

        // Only react to creations in the last ~10 seconds.
        if (Date.now() - entry.createdTimestamp > 10_000) return

        const executor = entry.executor
        if (!executor) return

        const member = await guild.members.fetch(executor.id).catch(() => null)
        const isAdmin = member?.permissions.has(PermissionFlagsBits.Administrator)
        if (isAdmin) return // trusted

        // Delete the webhook that was just created.
        const webhooks = await (channel as GuildChannel & { fetchWebhooks?: () => Promise<any> })
            .fetchWebhooks?.()
            .catch(() => null)
        if (!webhooks) return

        for (const webhook of webhooks.values()) {
            if (Date.now() - webhook.createdTimestamp < 15_000) {
                await webhook.delete("MyProtect Webhook Protection: untrusted webhook creation").catch(() => null)
            }
        }

        const sys = guild.systemChannel
        if (sys?.isTextBased()) {
            sys
                .send({
                    content: `🪝 **Webhook Protection:** removed a webhook created by <@${executor.id}> in <#${channel.id}>.`,
                })
                .catch(() => null)
        }
    } catch {
        /* ignore */
    }
}
