import { MongoClient } from "mongodb"
import config from "./config"

/**
 * Lazily-created, shared MongoClient.
 *
 * The client is created (and connected) the first time it is actually needed
 * rather than at module-import time. Creating it at import time crashes the
 * Next.js build when MONGO_URI is not set, and opening a connection eagerly is
 * wasteful during static analysis. In development we also cache the client on
 * `globalThis` so hot-reloads don't open a new pool on every change.
 */

declare global {
    // eslint-disable-next-line no-var
    var __myprotectMongo: { client: MongoClient; promise: Promise<MongoClient> } | undefined
}

function getClient(): { client: MongoClient; promise: Promise<MongoClient> } {
    if (global.__myprotectMongo) return global.__myprotectMongo

    if (!config.mongoUri) {
        throw new Error("MONGO_URI is not set. Copy .env.example to .env.local and fill it in.")
    }

    const client = new MongoClient(config.mongoUri)
    const promise = client.connect()
    const holder = { client, promise }

    // Cache across hot-reloads in development.
    if (process.env.NODE_ENV !== "production") {
        global.__myprotectMongo = holder
    }

    return holder
}

async function Execute<T>(fn: (client: MongoClient) => Promise<T>): Promise<T> {
    const { client, promise } = getClient()
    await promise
    return fn(client)
}

const Database = {
    Execute,
}

export default Database
