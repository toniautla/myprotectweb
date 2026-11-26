import { REST, Routes } from "discord.js"
import { config } from "./config"
import { commandList } from "./commands"

/**
 * Registers all slash commands with Discord.
 *   - If DEV_GUILD_ID is set, registers to that guild (instant updates).
 *   - Otherwise registers globally (first propagation can take up to ~1 hour).
 *
 * Run with:  npm run deploy
 */
async function main() {
    const body = commandList.map((c) => c.data.toJSON())
    const rest = new REST({ version: "10" }).setToken(config.token)

    if (config.devGuildId) {
        await rest.put(Routes.applicationGuildCommands(config.clientId, config.devGuildId), { body })
        console.log(`Registered ${body.length} commands to guild ${config.devGuildId}.`)
    } else {
        await rest.put(Routes.applicationCommands(config.clientId), { body })
        console.log(`Registered ${body.length} global commands.`)
    }
}

main().catch((err) => {
    console.error("Failed to deploy commands:", err)
    process.exit(1)
})
