import type { NextApiRequest, NextApiResponse } from "next"
import NextAuth, { NextAuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import Cache from "../../../lib/Cache"
import config from "../../../lib/config"

/** Discord MANAGE_GUILD permission bit (1 << 5). */
const MANAGE_GUILD = BigInt(0x20)

export interface DiscordGuild {
    id: string
    name: string
    icon: string | null
    owner: boolean
    permissions: string
}

async function fetchDiscord(path: string, token: string) {
    try {
        const response = await fetch(`https://discord.com/api${path}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) return null
        return await response.json()
    } catch {
        return null
    }
}

/**
 * The user's manageable guilds, cached for a minute. Every failure mode here is
 * swallowed and returns `[]` — the user must still be able to log in even if
 * MongoDB or the Discord guilds endpoint is temporarily unavailable.
 */
const formGuilds = async (token: string): Promise<any[]> => {
    const userCache = new Cache("userCache", 1)

    // Cache read (tolerate a dead/unreachable DB).
    try {
        const cached = await userCache.retrieve({ _id: token })
        if (cached.guilds) return cached.guilds
    } catch {
        /* ignore cache errors */
    }

    const data = await fetchDiscord("/users/@me/guilds", token)
    if (!Array.isArray(data)) {
        try {
            const stale = await userCache.retrieve({ _id: token }, true)
            return stale.guilds || []
        } catch {
            return []
        }
    }

    try {
        await userCache.update({ _id: token }, { guilds: data })
    } catch {
        /* ignore cache write errors */
    }
    return data
}

export const authOptions: NextAuthOptions = {
    secret: config.nextAuthSecret,
    providers: [
        DiscordProvider({
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            authorization: { params: { scope: "identify guilds" } },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
        async jwt({ token, account, profile }) {
            // On initial sign-in `account` + `profile` are present. Capture the
            // identity into the JWT so later session reads need NO network/DB.
            if (account) {
                token.accessToken = account.access_token
                token.accessTokenExpires = account.expires_at
                    ? account.expires_at * 1000
                    : Date.now() + 7 * 24 * 60 * 60 * 1000
            }
            if (profile) {
                const p = profile as any
                token.discordId = p.id
                token.discordName = p.global_name || p.username
                token.discordAvatar = p.avatar
                    ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png`
                    : null
            }
            return token
        },
        async session({ session, token }) {
            // Identity comes straight from the token — never fails.
            session.accessToken = token.accessToken as string | undefined
            session.user = {
                ...session.user,
                name: (token.discordName as string) || session.user?.name,
                image: (token.discordAvatar as string) || session.user?.image,
            }
            session.data = {
                id: token.discordId,
                username: token.discordName,
                avatar: token.discordAvatar,
            }

            // Guilds are best-effort: a failure yields [] instead of breaking login.
            session.guilds = []
            if (session.accessToken) {
                try {
                    const guilds = await formGuilds(session.accessToken)
                    session.guilds = guilds
                        .filter(
                            (g) => g.owner || (BigInt(g.permissions) & MANAGE_GUILD) > 0n
                        )
                        .sort((a, b) => a.name.localeCompare(b.name))
                } catch {
                    session.guilds = []
                }
            }

            return session
        },
    },
}

export default function auth(req: NextApiRequest, res: NextApiResponse) {
    return NextAuth(req, res, authOptions)
}
