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
    const response = await fetch(`https://discord.com/api${path}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return null
    return response.json()
}

/** The Discord user object, cached for a minute. */
const formUser = async (token: string) => {
    const userCache = new Cache("userCache", 1)
    const cached = await userCache.retrieve({ _id: token })
    if (cached.user) return cached.user

    const data = await fetchDiscord("/users/@me", token)
    if (!data || !("id" in data)) {
        const stale = await userCache.retrieve({ _id: token }, true)
        return stale.user || {}
    }

    await userCache.update({ _id: token }, { user: data })
    return data
}

/** The user's guilds, cached for a minute. */
const formGuilds = async (token: string): Promise<DiscordGuild[]> => {
    const userCache = new Cache("userCache", 1)
    const cached = await userCache.retrieve({ _id: token })
    if (cached.guilds) return cached.guilds

    const data = await fetchDiscord("/users/@me/guilds", token)
    if (!Array.isArray(data)) {
        const stale = await userCache.retrieve({ _id: token }, true)
        return stale.guilds || []
    }

    await userCache.update({ _id: token }, { guilds: data })
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
        async jwt({ token, account }) {
            // On initial sign-in `account` is present; stash the access token.
            if (account) {
                token.accessToken = account.access_token
                token.accessTokenExpires = account.expires_at
                    ? account.expires_at * 1000
                    : Date.now() + 7 * 24 * 60 * 60 * 1000
            }
            return token
        },
        async session({ session, token }) {
            const accessToken = token.accessToken as string | undefined
            session.accessToken = accessToken

            if (accessToken) {
                const data = await formUser(accessToken)
                session.data = data
                // Keep next-auth's default `user` populated from the profile.
                session.user = {
                    name: data.global_name || data.username,
                    image: data.avatar
                        ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
                        : null,
                    ...session.user,
                }

                const guilds = await formGuilds(accessToken)
                session.guilds = guilds
                    .filter((guild) => guild.owner || (BigInt(guild.permissions) & MANAGE_GUILD) > 0n)
                    .sort((a, b) => a.name.localeCompare(b.name))
            }

            return session
        },
    },
}

export default function auth(req: NextApiRequest, res: NextApiResponse) {
    return NextAuth(req, res, authOptions)
}
