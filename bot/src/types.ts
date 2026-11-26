import {
    ChatInputCommandInteraction,
    ButtonInteraction,
    StringSelectMenuInteraction,
    ModalSubmitInteraction,
    SlashCommandBuilder,
    SlashCommandSubcommandsOnlyBuilder,
    SlashCommandOptionsOnlyBuilder,
} from "discord.js"

export type AnyComponentInteraction =
    | ButtonInteraction
    | StringSelectMenuInteraction
    | ModalSubmitInteraction

export interface Command {
    data:
        | SlashCommandBuilder
        | SlashCommandSubcommandsOnlyBuilder
        | SlashCommandOptionsOnlyBuilder
        | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>
    /**
     * Optional component handlers, keyed by the first segment of the customId
     * (segments are separated by ":"). e.g. a select menu with customId
     * "modules:toggle" is routed to components["modules"].
     */
    components?: Record<string, (interaction: AnyComponentInteraction) => Promise<void>>
}
