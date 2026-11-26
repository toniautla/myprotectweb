import crypto from "crypto"
import { NextApiRequest, NextApiResponse } from "next"
import { authorizeUrl, setStateCookie } from "../../../lib/session"

/** Start the Discord OAuth2 flow: set a state cookie and redirect to Discord. */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
    const state = crypto.randomBytes(16).toString("hex")
    res.setHeader("Set-Cookie", setStateCookie(state))
    res.redirect(authorizeUrl(state))
}
