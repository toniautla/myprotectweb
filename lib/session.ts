import crypto from "crypto"
import type { NextApiRequest } from "next"
import config from "./config"
import Cache from "./Cache"

/**
 * Minimal, self-contained Discord OAuth2 session.
 *
 * We deliberately do NOT use next-auth here: its bundled openid-client throws
 * ("issuer must be configured", "state cookie missing/mismatch") in this
 * serverless setup. Instead we run the OAuth2 flow ourselves and store an
 * HMAC-signed session in an httpOnly cookie, so the whole thing is explicit
 * and has no heavy dependencies.
 */

export const SESSION_COOKIE = "myprotect_session"
export const STATE_COOKIE = "myprotect_oauth_state"
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days (matches Discord token lifetime)
const STATE_MAX_AGE = 10 * 60 // 10 minutes
const MANAGE_GUILD = BigInt(0x20)

export interface SessionUser {
    name: string
    image: string | null
}
export interface SessionData {
    id: string
    username: string
    avatar: string | null
}
export interface Session {
    user: SessionUser
    data: SessionData
    accessToken: string
}
export interface DiscordGuild {
    id: string
    name: string
    icon: string | null
    owner: boolean
    permissions: string
}

// ── token signing (HMAC-SHA256, compact "body.sig") ──────────────────────

function b64url(input: Buffer | string): string {
    return Buffer.from(input).toString("base64url")
}
function sign(body: string): string {
    return crypto.createHmac("sha256", config.nextAuthSecret).update(body).digest("base64url")
}

export function createSessionToken(session: Session): string {
    const payload = { ...session, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE }
    const body = b64url(JSON.stringify(payload))
    return `${body}.${sign(body)}`
}

export function verifySessionToken(token?: string): Session | null {
    if (!token) return null
    const [body, sig] = token.split(".")
    if (!body || !sig) return null

    const expected = sign(body)
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

    try {
        const payload = JSON.parse(Buffer.from(body, "base64url").toString())
        if (!payload.exp || Date.now() / 1000 > payload.exp) return null
        return { user: payload.user, data: payload.data, accessToken: payload.accessToken }
    } catch {
        return null
    }
}

// ── cookie helpers ───────────────────────────────────────────────────────

function cookie(name: string, value: string, maxAge: number): string {
    const parts = [`${name}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAge}`]
    if (process.env.NODE_ENV === "production") parts.push("Secure")
    return parts.join("; ")
}
export const setSessionCookie = (token: string) => cookie(SESSION_COOKIE, token, SESSION_MAX_AGE)
export const clearSessionCookie = () => cookie(SESSION_COOKIE, "", 0)
export const setStateCookie = (state: string) => cookie(STATE_COOKIE, state, STATE_MAX_AGE)
export const clearStateCookie = () => cookie(STATE_COOKIE, "", 0)

// ── read the session off a request (cookie only, no network) ─────────────

export function readSession(req: { cookies?: Partial<Record<string, string>> }): Session | null {
    return verifySessionToken(req.cookies?.[SESSION_COOKIE])
}

// ── OAuth2 endpoints & helpers ───────────────────────────────────────────

export const REDIRECT_URI = `${config.baseUrl}/api/auth/callback`

export function authorizeUrl(state: string): string {
    const url = new URL("https://discord.com/api/oauth2/authorize")
    url.searchParams.set("client_id", config.clientId)
    url.searchParams.set("redirect_uri", REDIRECT_URI)
    url.searchParams.set("response_type", "code")
    url.searchParams.set("scope", "identify guilds")
    url.searchParams.set("state", state)
    url.searchParams.set("prompt", "consent")
    return url.toString()
}

export async function exchangeCode(code: string): Promise<string | null> {
    try {
        const res = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                grant_type: "authorization_code",
                code,
                redirect_uri: REDIRECT_URI,
            }),
        })
        if (!res.ok) return null
        const data = await res.json()
        return data.access_token ?? null
    } catch {
        return null
    }
}

export async function fetchUser(accessToken: string): Promise<SessionData | null> {
    try {
        const res = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!res.ok) return null
        const u = await res.json()
        if (!u?.id) return null
        return { id: u.id, username: u.global_name || u.username, avatar: u.avatar ?? null }
    } catch {
        return null
    }
}

export function avatarUrl(data: SessionData): string | null {
    return data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : null
}

/**
 * The user's manageable guilds (owner or MANAGE_GUILD). Cached for a minute and
 * fully fault-tolerant: any failure returns [] so the dashboard never crashes
 * or logs the user out over a transient Discord/Mongo hiccup.
 */
export async function loadManageableGuilds(accessToken: string): Promise<DiscordGuild[]> {
    const cache = new Cache("userCache", 1)

    let guilds: DiscordGuild[] | null = null
    try {
        const cached = await cache.retrieve({ _id: accessToken })
        if (cached.guilds) guilds = cached.guilds
    } catch {
        /* ignore */
    }

    if (!guilds) {
        try {
            const res = await fetch("https://discord.com/api/users/@me/guilds", {
                headers: { Authorization: `Bearer ${accessToken}` },
            })
            if (res.ok) {
                const data = await res.json()
                if (Array.isArray(data)) {
                    guilds = data
                    cache.update({ _id: accessToken }, { guilds: data }).catch(() => null)
                }
            }
        } catch {
            /* ignore */
        }
    }

    if (!guilds) return []

    return guilds
        .filter((g) => {
            try {
                return g.owner || (BigInt(g.permissions) & MANAGE_GUILD) > 0n
            } catch {
                return false
            }
        })
        .sort((a, b) => a.name.localeCompare(b.name))
}
