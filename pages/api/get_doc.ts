import { NextApiRequest, NextApiResponse } from "next"
import { authorizeGuild } from "../../lib/auth"
import { FetchGuildDoc, isAllowedCollection } from "../../lib/DbUtils"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" })

    const { guild, collection } = req.body || {}

    const auth = await authorizeGuild(req, res, guild)
    if (!auth.ok) return res.status(auth.status).json({ message: auth.message })

    if (!isAllowedCollection(collection)) {
        return res.status(400).json({ message: "Invalid collection" })
    }

    return res.json((await FetchGuildDoc(guild, collection)) || {})
}
