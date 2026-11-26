import { Collection } from "discord.js"
import { Command, AnyComponentInteraction } from "../types"

import dashboard from "./dashboard"
import modules from "./modules"
import setup from "./setup"
import rules from "./rules"
import ban from "./ban"
import kick from "./kick"
import purge from "./purge"
import warn from "./warn"
import backup from "./backup"

export const commandList: Command[] = [dashboard, modules, setup, rules, ban, kick, purge, warn, backup]

/** name -> command */
export const commands = new Collection<string, Command>()
for (const c of commandList) commands.set(c.data.name, c)

/** customId prefix (first ":" segment) -> handler */
export const componentHandlers = new Collection<
    string,
    (interaction: AnyComponentInteraction) => Promise<void>
>()
for (const c of commandList) {
    if (!c.components) continue
    for (const [prefix, handler] of Object.entries(c.components)) {
        componentHandlers.set(prefix, handler)
    }
}
