import { MongoClient } from "mongodb"
import Database from "./Database"

/**
 * Small TTL cache stored in the `webCache` database. Used to avoid hammering
 * Discord's API for the same user's profile/guilds on every request.
 */
export default class Cache {
    public col: string
    public minInterval: number

    constructor(col: string, minInterval: number) {
        this.col = col
        this.minInterval = minInterval
    }

    /**
     * Return the cached document, or `{}` when it is missing or stale (older
     * than `minInterval` minutes). Pass `bypass = true` to ignore staleness.
     */
    public async retrieve(filter: Record<string, unknown>, bypass = false): Promise<any> {
        const res = await Database.Execute(async (client: MongoClient) => {
            const col = client.db("webCache").collection(this.col)
            return col.findOne(filter)
        })

        if (res && res.LAST && !bypass) {
            const ageMinutes = (Date.now() - new Date(res.LAST).getTime()) / 60000
            if (ageMinutes > this.minInterval) return {}
        }

        return res || {}
    }

    public async update(filter: Record<string, unknown>, data: Record<string, unknown>) {
        await Database.Execute(async (client: MongoClient) => {
            const col = client.db("webCache").collection(this.col)
            await col.updateOne(
                filter,
                { $set: { ...filter, ...data, LAST: new Date() } },
                { upsert: true }
            )
        })
    }
}
