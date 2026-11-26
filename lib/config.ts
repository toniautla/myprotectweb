/**
 * Centralised configuration, loaded from environment variables.
 *
 * Secrets are NEVER committed. Copy `.env.example` to `.env.local` (for the
 * dashboard) and fill in your real values. See README for details.
 */

export interface AppConfig {
    /** MongoDB connection string (shared with the Discord bot). */
    mongoUri: string
    /** Discord application client id (OAuth2). */
    clientId: string
    /** Discord application client secret (OAuth2). */
    clientSecret: string
    /** Secret used by NextAuth to sign/encrypt sessions. */
    nextAuthSecret: string
    /** Public base url of the dashboard, used for OAuth redirects & invite links. */
    baseUrl: string
    /** Discord permission integer requested when inviting the bot. */
    invitePermissions: string
}

const config: AppConfig = {
    mongoUri: process.env.MONGO_URI ?? "",
    clientId: process.env.DISCORD_CLIENT_ID ?? "",
    clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
    nextAuthSecret:
        process.env.NEXTAUTH_SECRET ?? process.env.DISCORD_CLIENT_SECRET ?? "dev-insecure-secret",
    baseUrl: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
    invitePermissions: process.env.DISCORD_INVITE_PERMISSIONS ?? "8",
}

/** Throws early (server-side) when a required secret is missing. */
export function assertServerConfig() {
    const missing: string[] = []
    if (!config.mongoUri) missing.push("MONGO_URI")
    if (!config.clientId) missing.push("DISCORD_CLIENT_ID")
    if (!config.clientSecret) missing.push("DISCORD_CLIENT_SECRET")
    if (missing.length) {
        throw new Error(
            `Missing required environment variables: ${missing.join(", ")}. ` +
                `Copy .env.example to .env.local and fill them in.`
        )
    }
}

export default config
