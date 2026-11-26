import type { NextApiRequest, NextApiResponse, GetServerSidePropsContext } from "next"
import {
    DiscordGuild,
    loadManageableGuilds,
    readSession,
    Session as BaseSession,
} from "./session"

export interface Session extends BaseSession {
    guilds: DiscordGuild[]
}

type ReqLike = NextApiRequest | GetServerSidePropsContext["req"]

/**
 * Resolve the current session (API route or getServerSideProps), including the
 * user's manageable guilds. Returns null when not logged in.
 */
export async function resolveSession(req: ReqLike, _res?: unknown): Promise<Session | null> {
    const base = readSession(req as any)
    if (!base) return null
    const guilds = await loadManageableGuilds(base.accessToken)
    return { ...base, guilds }
}

export interface GuildAuthResult {
    ok: boolean
    status: number
    session: Session | null
    message?: string
}

/**
 * Authorize a mutation against a specific guild: the user must be logged in AND
 * manage the target guild (owner or MANAGE_GUILD).
 */
export async function authorizeGuild(
    req: NextApiRequest,
    _res: NextApiResponse,
    guildId: string | undefined
): Promise<GuildAuthResult> {
    const session = await resolveSession(req)

    if (!session) return { ok: false, status: 401, session: null, message: "Not authenticated" }
    if (!guildId) return { ok: false, status: 400, session, message: "Missing guild id" }
    if (!session.guilds.some((g) => g.id === guildId)) {
        return { ok: false, status: 403, session, message: "You do not manage this guild" }
    }
    return { ok: true, status: 200, session }
}
