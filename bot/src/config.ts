import "dotenv/config"

function required(name: string): string {
    const value = process.env[name]
    if (!value) {
        throw new Error(`Missing required environment variable ${name}. Copy .env.example to .env.`)
    }
    return value
}

export const config = {
    token: required("DISCORD_TOKEN"),
    clientId: required("DISCORD_CLIENT_ID"),
    mongoUri: required("MONGO_URI"),
    dashboardUrl: process.env.DASHBOARD_URL ?? "http://localhost:3000",
    devGuildId: process.env.DEV_GUILD_ID || undefined,
}

/** Brand colour used across embeds (MyProtect blue). */
export const BRAND_COLOR = 0x1a8eff
