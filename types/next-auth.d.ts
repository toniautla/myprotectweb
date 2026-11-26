import "next-auth"
import "next-auth/jwt"
import { DiscordGuild } from "../pages/api/auth/[...nextauth]"

declare module "next-auth" {
    interface Session {
        accessToken?: string
        /** Raw Discord user object. */
        data?: any
        /** Guilds the user can manage (owner or MANAGE_GUILD). */
        guilds?: DiscordGuild[]
        user?: {
            name?: string | null
            email?: string | null
            image?: string | null
        }
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string
        accessTokenExpires?: number
        discordId?: string
        discordName?: string
        discordAvatar?: string | null
    }
}
