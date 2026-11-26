import { NextApiRequest, NextApiResponse } from "next"
import { authorizeGuild } from "../../../lib/auth"
import { Modules } from "../../../lib/Modules"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" })

    const { guild, module, status } = req.body || {}

    const auth = await authorizeGuild(req, res, guild)
    if (!auth.ok) return res.status(auth.status).json({ message: auth.message })

    if (typeof module !== "string" || !module) {
        return res.status(400).json({ message: "Missing module" })
    }

    const mod = new Modules(guild)
    const newStatus = await mod.toggle(module, typeof status === "boolean" ? status : null)

    return res.json({ status: newStatus })
}
