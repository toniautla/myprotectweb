import type { NextApiRequest, NextApiResponse, GetServerSidePropsContext } from "next"
import { getServerSession, Session } from "next-auth"
import { authOptions } from "../pages/api/auth/[...nextauth]"

/** Resolve the current session (API route or getServerSideProps). */
export function resolveSession(
    req: NextApiRequest | GetServerSidePropsContext["req"],
    res: NextApiResponse | GetServerSidePropsContext["res"]
): Promise<Session | null> {
    return getServerSession(req as any, res as any, authOptions)
}

export interface GuildAuthResult {
    ok: boolean
    status: number
    session: Session | null
    message?: string
}

/**
 * Authorize a mutation against a specific guild. The user must be logged in AND
 * manage the target guild (owner or MANAGE_GUILD) — exactly the guilds surfaced
 * in `session.guilds`. This replaces the old "client sends the secret" model,
 * which exposed the Discord client secret to the browser.
 */
export async function authorizeGuild(
    req: NextApiRequest,
    res: NextApiResponse,
    guildId: string | undefined
): Promise<GuildAuthResult> {
    const session = await resolveSession(req, res)

    if (!session) {
        return { ok: false, status: 401, session: null, message: "Not authenticated" }
    }
    if (!guildId) {
        return { ok: false, status: 400, session, message: "Missing guild id" }
    }
    const manages = session.guilds?.some((g) => g.id === guildId)
    if (!manages) {
        return { ok: false, status: 403, session, message: "You do not manage this guild" }
    }

    return { ok: true, status: 200, session }
}
