import { ChatInputCommandInteraction, GuildMember } from "discord.js"
import { errorEmbed } from "./embeds"
import { isModuleEnabled } from "./modules"

/** Ensure the Moderation module is on; replies with an error if not. */
export async function requireModeration(interaction: ChatInputCommandInteraction): Promise<boolean> {
    if (!interaction.guildId) return false
    if (await isModuleEnabled(interaction.guildId, "Moderation")) return true
    await interaction.reply({
        embeds: [errorEmbed("Moderation disabled", "Enable the **Moderation** module with `/modules` first.")],
        ephemeral: true,
    })
    return false
}

/**
 * Verify a target member can be actioned by both the command user and the bot
 * (role hierarchy + not the owner). Returns an error string or null if OK.
 */
export function checkHierarchy(
    interaction: ChatInputCommandInteraction,
    target: GuildMember | null
): string | null {
    if (!target) return "That user is not in this server."
    if (target.id === interaction.guild?.ownerId) return "You cannot action the server owner."
    if (target.id === interaction.client.user.id) return "I cannot action myself."

    const me = interaction.guild?.members.me
    if (me && target.roles.highest.position >= me.roles.highest.position) {
        return "My role is not high enough to action this user."
    }

    const author = interaction.member as GuildMember | null
    if (
        author &&
        interaction.guild?.ownerId !== author.id &&
        target.roles.highest.position >= author.roles.highest.position
    ) {
        return "You cannot action a user with a role equal to or higher than yours."
    }

    return null
}
