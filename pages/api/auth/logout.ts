import { NextApiRequest, NextApiResponse } from "next"
import { clearSessionCookie } from "../../../lib/session"

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
    res.setHeader("Set-Cookie", clearSessionCookie())
    res.redirect("/")
}
