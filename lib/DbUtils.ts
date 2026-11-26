import { MongoClient } from "mongodb"
import GuildObject from "../types/GuildObject"
import Database from "./Database"

/**
 * Collections under the `Bot` database that the dashboard is allowed to read
 * and write. Anything outside this list is rejected by the API routes so a
 * logged-in user can never touch arbitrary collections.
 */
export const ALLOWED_COLLECTIONS = ["rules", "channels", "phishing_links", "modules"] as const
export type AllowedCollection = (typeof ALLOWED_COLLECTIONS)[number]

export function isAllowedCollection(collection: string): collection is AllowedCollection {
    return (ALLOWED_COLLECTIONS as readonly string[]).includes(collection)
}

/** Guilds the bot is currently in, as cached by the bot in `botCache.guildCache`. */
export const FetchBotGuilds = async (): Promise<Array<GuildObject>> => {
    const data = await Database.Execute(async (client: MongoClient) => {
        const col = client.db("botCache").collection<GuildObject>("guildCache")
        return col.find({}).toArray()
    })

    return data
}

export const FetchGuildDoc = async (guildId: string, collection: string) => {
    return Database.Execute(async (client: MongoClient) => {
        const col = client.db("Bot").collection(collection)
        return (await col.findOne({ _id: guildId as any })) || {}
    })
}

export const UpdateGuildDoc = async (
    guildId: string,
    collection: string,
    update: Record<string, unknown>
) => {
    return Database.Execute(async (client: MongoClient) => {
        const col = client.db("Bot").collection(collection)

        // `upsert` inserts the document (with its _id) when it does not exist
        // and otherwise $sets the provided fields. This is atomic and avoids
        // the read-modify-write race the previous implementation had.
        return col.updateOne({ _id: guildId as any }, { $set: { ...update } }, { upsert: true })
    })
}
