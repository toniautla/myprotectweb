import { NextApiRequest, NextApiResponse } from "next"
import { authorizeGuild } from "../../../lib/auth"
import { Modules } from "../../../lib/Modules"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" })

    const { guild, module, ...update } = req.body || {}

    const auth = await authorizeGuild(req, res, guild)
    if (!auth.ok) return res.status(auth.status).json({ message: auth.message })

    if (typeof module !== "string" || !module) {
        return res.status(400).json({ message: "Missing module" })
    }

    const mod = new Modules(guild)
    await mod.set(module, update)

    return res.json({ message: "Success" })
}
