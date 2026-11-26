import { MongoClient, Db, Collection, ObjectId } from "mongodb"
import { config } from "./config"

/**
 * Shared MongoDB access. The collections here are the SAME ones the dashboard
 * reads/writes — this is how the bot and the web dashboard "cross over":
 *
 *   botCache.guildCache   <- written by the bot, read by the dashboard
 *   Bot.modules           <- written by both (toggles)
 *   Bot.rules             <- written by the dashboard, read by the bot
 *   Bot.channels          <- written by the dashboard, read by the bot
 *   Bot.backups           <- bot only
 *   Bot.warnings          <- bot only
 */

let client: MongoClient | null = null

export async function connect(): Promise<MongoClient> {
    if (client) return client
    client = new MongoClient(config.mongoUri)
    await client.connect()
    return client
}

function db(name: string): Db {
    if (!client) throw new Error("Database not connected. Call connect() first.")
    return client.db(name)
}

// ── Shared document shapes ───────────────────────────────────────────────

export interface CachedChannel {
    id: string
    name: string
    type: string // "text" | "voice" | "category" | "news" | "forum" | "stage" | "thread"
    parentId: string | null
    position: number
}

export interface CachedRole {
    id: string
    name: string
    permissions: string
    position: number
    color: number
}

export interface GuildCacheDoc {
    _id: string
    name: string
    icon: string | null
    description: string | null
    member_count: number
    ban_count: number
    invite_count: number
    channels: CachedChannel[]
    roles: CachedRole[]
    updatedAt: Date
}

export interface ModuleState {
    enabled?: boolean
    [key: string]: unknown
}
export interface ModulesDoc {
    _id: string
    [module: string]: ModuleState | string
}

export interface RulesDoc {
    _id: string
    title?: string
    description?: string
    authorName?: string
    authorIcon?: string
    imageUrl?: string
    color?: string
    rules?: { title: string; description: string }[]
    buttons?: { label: string; link: string }[]
}

export interface ChannelsDoc {
    _id: string
    bot?: string[]
    youtube?: string[]
    links?: string[]
    media?: string[]
}

export interface BackupDoc {
    _id?: ObjectId
    guildId: string
    name: string
    createdAt: Date
    data: {
        name: string
        roles: { name: string; color: number; permissions: string; hoist: boolean; mentionable: boolean }[]
        channels: { name: string; type: number; parentName: string | null; position: number }[]
    }
}

export interface WarningDoc {
    _id?: ObjectId
    guildId: string
    userId: string
    moderatorId: string
    reason: string
    createdAt: Date
}

export interface PhishingDoc {
    _id: string
    domains?: string[]
}

// ── Typed collection accessors ───────────────────────────────────────────

export const collections = {
    guildCache: (): Collection<GuildCacheDoc> => db("botCache").collection("guildCache"),
    modules: (): Collection<ModulesDoc> => db("Bot").collection("modules"),
    rules: (): Collection<RulesDoc> => db("Bot").collection("rules"),
    channels: (): Collection<ChannelsDoc> => db("Bot").collection("channels"),
    backups: (): Collection<BackupDoc> => db("Bot").collection("backups"),
    warnings: (): Collection<WarningDoc> => db("Bot").collection("warnings"),
    phishingLinks: (): Collection<PhishingDoc> => db("Bot").collection("phishing_links"),
}
