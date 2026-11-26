import { NextApiRequest, NextApiResponse } from "next"
import { authorizeGuild } from "../../../lib/auth"
import Database from "../../../lib/Database"

const ALLOWED_TYPES = ["postRules", "postVerify"]

/**
 * Queue a job for the always-on bot to execute (it can't be reached directly
 * from this serverless app). The bot polls `Bot.jobs` and runs pending jobs.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" })

    const { guild, type, channelId } = req.body || {}

    const auth = await authorizeGuild(req, res, guild)
    if (!auth.ok) return res.status(auth.status).json({ message: auth.message })

    if (!ALLOWED_TYPES.includes(type)) return res.status(400).json({ message: "Invalid job type" })
    if (typeof channelId !== "string" || !/^\d{16,20}$/.test(channelId)) {
        return res.status(400).json({ message: "Invalid channel" })
    }

    await Database.Execute(async (client) => {
        await client.db("Bot").collection("jobs").insertOne({
            guildId: guild,
            type,
            payload: { channelId },
            status: "pending",
            createdAt: new Date(),
        })
    })

    return res.json({ message: "Queued" })
}
