import { collections, ModuleState } from "../database"

export const MODULE_KEYS = [
    "Moderation",
    "Rules",
    "Backups",
    "AntiRaid",
    "AntiPhishing",
    "Webhooks",
    "ContentProtect",
    "Verification",
    "Logging",
] as const

export type ModuleKey = (typeof MODULE_KEYS)[number]

export const MODULE_LABELS: Record<ModuleKey, string> = {
    Moderation: "Moderation",
    Rules: "Rules",
    Backups: "Backups",
    AntiRaid: "Anti Raid",
    AntiPhishing: "Anti Phishing",
    Webhooks: "Webhook Protection",
    ContentProtect: "Special Channels",
    Verification: "Verification",
    Logging: "Logging",
}

/**
 * A module counts as enabled when it is missing from the document (default on)
 * or present with `enabled !== false`. This mirrors the dashboard exactly, so
 * both sides agree on what "on" means.
 */
export async function isModuleEnabled(guildId: string, key: ModuleKey): Promise<boolean> {
    const doc = await collections.modules().findOne({ _id: guildId })
    if (!doc) return true
    const state = doc[key] as ModuleState | undefined
    if (!state) return true
    return state.enabled !== false
}

export async function getModuleStates(guildId: string): Promise<Record<ModuleKey, boolean>> {
    const doc = await collections.modules().findOne({ _id: guildId })
    const result = {} as Record<ModuleKey, boolean>
    for (const key of MODULE_KEYS) {
        const state = doc?.[key] as ModuleState | undefined
        result[key] = state ? state.enabled !== false : true
    }
    return result
}

/** Toggle or explicitly set a module. Returns the new state. */
export async function setModule(
    guildId: string,
    key: ModuleKey,
    status: boolean | null
): Promise<boolean> {
    const current = await isModuleEnabled(guildId, key)
    const newStatus = status != null ? status : !current
    await collections
        .modules()
        .updateOne({ _id: guildId }, { $set: { [`${key}.enabled`]: newStatus } as any }, { upsert: true })
    return newStatus
}
