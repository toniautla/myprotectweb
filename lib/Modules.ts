import { MongoClient } from "mongodb"
import Database from "./Database"

export interface ModuleState {
    enabled: boolean
    [key: string]: unknown
}

export interface ModulesDoc {
    _id: string
    [module: string]: ModuleState | string
}

/**
 * Per-guild module configuration, stored in `Bot.modules`. This is shared with
 * the Discord bot: the bot reads the same document to decide which features are
 * active, and both sides toggle modules through it.
 */
export class Modules {
    public guildId: string

    constructor(guildId: string) {
        this.guildId = guildId
    }

    public async get(): Promise<ModulesDoc> {
        return Database.Execute(async (client: MongoClient) => {
            const col = client.db("Bot").collection<ModulesDoc>("modules")

            const res = await col.findOne({ _id: this.guildId })
            if (res) return res

            const fresh: ModulesDoc = { _id: this.guildId }
            await col.insertOne(fresh)
            return fresh
        })
    }

    /**
     * Toggle (or explicitly set) a module's enabled flag.
     * @returns the new enabled state.
     */
    public async toggle(module: string, status: boolean | null): Promise<boolean> {
        const data = await this.get()

        const current = data[module] as ModuleState | undefined
        const newStatus = status != null ? status : !(current?.enabled ?? true)

        return Database.Execute(async (client: MongoClient) => {
            const col = client.db("Bot").collection<ModulesDoc>("modules")
            await col.updateOne(
                { _id: this.guildId },
                { $set: { [`${module}.enabled`]: newStatus } },
                { upsert: true }
            )
            return newStatus
        })
    }

    /** Merge arbitrary settings into a module's sub-document. */
    public async set(module: string, settings: Record<string, unknown>): Promise<void> {
        await this.get()

        const update: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(settings)) {
            update[`${module}.${key}`] = value
        }

        await Database.Execute(async (client: MongoClient) => {
            const col = client.db("Bot").collection<ModulesDoc>("modules")
            if (Object.keys(update).length) {
                await col.updateOne({ _id: this.guildId }, { $set: update }, { upsert: true })
            }
        })
    }
}
