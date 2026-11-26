import type { GetServerSidePropsContext } from "next"
import { resolveSession } from "./auth"
import { FetchBotGuilds } from "./DbUtils"

/**
 * Shared loader for `/dashboard/[guildId]/*` pages.
 *
 * - Redirects to /login when the user is not signed in or does not manage the
 *   guild (so unmanaged guilds are never exposed).
 * - Returns `guild: null` when the bot is not in the guild, so the page can
 *   render the "invite the bot" screen instead of crashing.
 */
export async function loadGuildContext(ctx: GetServerSidePropsContext) {
    const session = await resolveSession(ctx.req, ctx.res)
    const { guildId } = ctx.query as { guildId: string }

    const userGuild = session?.guilds?.find((g) => g.id === guildId)

    if (!session || !userGuild) {
        return { redirect: { destination: "/login", permanent: false } as const }
    }

    const botGuilds = await FetchBotGuilds()
    let guild: any = botGuilds.find((g) => g._id === guildId) || null

    if (guild) {
        // Make the document JSON-serialisable for Next.js props.
        guild = JSON.parse(
            JSON.stringify(guild, (_key, value) =>
                typeof value === "bigint" ? value.toString() : value
            )
        )
        guild.roles = (guild.roles || []).map((role: any) => ({
            ...role,
            permissions: String(role.permissions ?? "0"),
        }))
    }

    return { session, userGuild, guild }
}
