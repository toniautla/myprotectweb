import {
    ActionRowBuilder,
    ChannelType,
    ChatInputCommandInteraction,
    ModalBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js"
import { errorEmbed, successEmbed } from "../lib/embeds"
import { isModuleEnabled } from "../lib/modules"
import {
    getConfig,
    grantRole,
    makeCaptcha,
    setChallenge,
    takeChallenge,
    verifyPanel,
} from "../lib/verification"
import { Command } from "../types"

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("verifysetup")
        .setDescription("Post the verification panel in a channel.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption((o) =>
            o
                .setName("channel")
                .setDescription("Where to post (defaults to here)")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) return

        if (!(await isModuleEnabled(interaction.guildId, "Verification"))) {
            await interaction.reply({
                embeds: [errorEmbed("Verification disabled", "Enable the **Verification** module with `/modules` first.")],
                ephemeral: true,
            })
            return
        }

        const config = await getConfig(interaction.guildId)
        if (!config?.roleId) {
            await interaction.reply({
                embeds: [
                    errorEmbed(
                        "Not configured",
                        "Set a verification role on the dashboard (Manage → Verification) first.",
                    ),
                ],
                ephemeral: true,
            })
            return
        }

        const channel = (interaction.options.getChannel("channel") as TextChannel) ?? interaction.channel
        if (!channel || !channel.isTextBased?.()) {
            await interaction.reply({ embeds: [errorEmbed("Invalid channel")], ephemeral: true })
            return
        }

        await (channel as TextChannel).send(verifyPanel(config.message))
        await interaction.reply({ embeds: [successEmbed("Verification panel posted", `Posted in <#${channel.id}>.`)], ephemeral: true })
    },

    components: {
        async verify(interaction) {
            if (!interaction.guild) return

            // Button: start verification.
            if (interaction.isButton() && interaction.customId === "verify:start") {
                const config = await getConfig(interaction.guild.id)
                if (!config?.roleId) {
                    await interaction.reply({ embeds: [errorEmbed("Not configured", "Verification isn't set up yet.")], ephemeral: true })
                    return
                }
                const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
                if (!member) return
                if (member.roles.cache.has(config.roleId)) {
                    await interaction.reply({ embeds: [successEmbed("Already verified", "You already have access. ✨")], ephemeral: true })
                    return
                }

                if (config.mode === "captcha") {
                    const { question, answer } = makeCaptcha()
                    setChallenge(interaction.guild.id, interaction.user.id, answer)
                    const modal = new ModalBuilder().setCustomId("verify:captcha").setTitle("Verification")
                    modal.addComponents(
                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                            new TextInputBuilder()
                                .setCustomId("answer")
                                .setLabel(question)
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setMaxLength(4)
                        )
                    )
                    await interaction.showModal(modal)
                    return
                }

                // Button mode: grant immediately.
                const result = await grantRole(interaction.guild, member, config)
                await replyGrant(interaction, result)
                return
            }

            // Modal: captcha answer.
            if (interaction.isModalSubmit() && interaction.customId === "verify:captcha") {
                const config = await getConfig(interaction.guild.id)
                const expected = takeChallenge(interaction.guild.id, interaction.user.id)
                if (!config?.roleId || !expected) {
                    await interaction.reply({ embeds: [errorEmbed("Expired", "That took too long — click Verify again.")], ephemeral: true })
                    return
                }
                const given = interaction.fields.getTextInputValue("answer").trim()
                if (given !== expected) {
                    await interaction.reply({ embeds: [errorEmbed("Incorrect", "Wrong answer — click Verify to try again.")], ephemeral: true })
                    return
                }
                const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
                if (!member) return
                const result = await grantRole(interaction.guild, member, config)
                await replyGrant(interaction, result)
            }
        },
    },
}

async function replyGrant(interaction: any, result: string) {
    if (result === "ok") {
        await interaction.reply({ embeds: [successEmbed("Verified!", "You now have access to the server. 🎉")], ephemeral: true })
    } else if (result === "already") {
        await interaction.reply({ embeds: [successEmbed("Already verified", "You already have access.")], ephemeral: true })
    } else if (result === "no-role") {
        await interaction.reply({ embeds: [errorEmbed("Not configured", "No verification role is set.")], ephemeral: true })
    } else {
        await interaction.reply({
            embeds: [errorEmbed("Couldn't verify", "I couldn't assign the role — my role may be below it. Ask an admin.")],
            ephemeral: true,
        })
    }
}

export default command
