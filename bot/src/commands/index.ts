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
import botinfo from "./botinfo"
import ping from "./ping"
import serverinfo from "./serverinfo"
import userinfo from "./userinfo"
import avatar from "./avatar"
import help from "./help"
import timeout from "./timeout"
import untimeout from "./untimeout"
import unban from "./unban"
import slowmode from "./slowmode"
import lock from "./lock"
import unlock from "./unlock"
import verify from "./verify"

export const commandList: Command[] = [
    // setup & config
    dashboard,
    modules,
    setup,
    verify,
    rules,
    // moderation
    ban,
    kick,
    timeout,
    untimeout,
    unban,
    warn,
    purge,
    // security
    lock,
    unlock,
    slowmode,
    backup,
    // info
    botinfo,
    serverinfo,
    userinfo,
    avatar,
    ping,
    help,
]

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
