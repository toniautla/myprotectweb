import { NextApiRequest, NextApiResponse } from "next"
import config from "../../lib/config"

/**
 * Redirects to the Discord "add bot" authorize URL, built from server-side env
 * at request time. This avoids relying on NEXT_PUBLIC_* vars (which are baked
 * in at build time and are a common source of an empty client_id).
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
    if (!config.clientId) {
        return res.status(500).send("DISCORD_CLIENT_ID is not configured on the server.")
    }

    const url = new URL("https://discord.com/api/oauth2/authorize")
    url.searchParams.set("client_id", config.clientId)
    url.searchParams.set("permissions", config.invitePermissions)
    url.searchParams.set("scope", "bot applications.commands")

    res.redirect(url.toString())
}
