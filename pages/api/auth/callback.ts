import { NextApiRequest, NextApiResponse } from "next"
import {
    avatarUrl,
    clearStateCookie,
    createSessionToken,
    exchangeCode,
    fetchUser,
    setSessionCookie,
    STATE_COOKIE,
} from "../../../lib/session"

/** Handle the Discord OAuth2 redirect: verify state, exchange code, set session. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const code = typeof req.query.code === "string" ? req.query.code : undefined
    const state = typeof req.query.state === "string" ? req.query.state : undefined
    const savedState = req.cookies?.[STATE_COOKIE]

    // Verify the anti-CSRF state round-tripped via our own cookie.
    if (!code || !state || !savedState || state !== savedState) {
        res.setHeader("Set-Cookie", clearStateCookie())
        return res.redirect("/login?error=state")
    }

    const accessToken = await exchangeCode(code)
    if (!accessToken) {
        res.setHeader("Set-Cookie", clearStateCookie())
        return res.redirect("/login?error=token")
    }

    const data = await fetchUser(accessToken)
    if (!data) {
        res.setHeader("Set-Cookie", clearStateCookie())
        return res.redirect("/login?error=user")
    }

    const token = createSessionToken({
        user: { name: data.username, image: avatarUrl(data) },
        data,
        accessToken,
    })

    res.setHeader("Set-Cookie", [setSessionCookie(token), clearStateCookie()])
    res.redirect("/dashboard")
}
