import { ChannelType, Guild, PermissionsBitField } from "discord.js"
import { collections, CachedChannel, CachedRole } from "../database"

function channelTypeName(type: ChannelType): string {
    switch (type) {
        case ChannelType.GuildText:
            return "text"
        case ChannelType.GuildVoice:
            return "voice"
        case ChannelType.GuildCategory:
            return "category"
        case ChannelType.GuildAnnouncement:
            return "news"
        case ChannelType.GuildStageVoice:
            return "stage"
        case ChannelType.GuildForum:
            return "forum"
        case ChannelType.AnnouncementThread:
        case ChannelType.PublicThread:
        case ChannelType.PrivateThread:
            return "thread"
        default:
            return "other"
    }
}

/**
 * Snapshot a guild into `botCache.guildCache`, exactly in the shape the
 * dashboard expects (channels with a string `type`, roles with `permissions`
 * as a string, plus member/ban/invite counts).
 */
export async function syncGuild(guild: Guild): Promise<void> {
    try {
        const channels: CachedChannel[] = guild.channels.cache.map((c) => ({
            id: c.id,
            name: c.name,
            type: channelTypeName(c.type),
            parentId: "parentId" in c ? (c.parentId ?? null) : null,
            position: "position" in c ? (c as any).position ?? 0 : 0,
        }))

        const roles: CachedRole[] = guild.roles.cache.map((r) => ({
            id: r.id,
            name: r.name,
            permissions: r.permissions.bitfield.toString(),
            position: r.position,
            color: r.color,
        }))

        // Counts — best-effort; requires the right permissions/intents.
        let banCount = 0
        if (guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            try {
                banCount = (await guild.bans.fetch()).size
            } catch {
                /* ignore */
            }
        }

        let inviteCount = 0
        if (guild.members.me?.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            try {
                inviteCount = (await guild.invites.fetch()).size
            } catch {
                /* ignore */
            }
        }

        await collections.guildCache().updateOne(
            { _id: guild.id },
            {
                $set: {
                    _id: guild.id,
                    name: guild.name,
                    icon: guild.icon,
                    description: guild.description,
                    member_count: guild.memberCount,
                    ban_count: banCount,
                    invite_count: inviteCount,
                    channels,
                    roles,
                    updatedAt: new Date(),
                },
            },
            { upsert: true }
        )
    } catch (err) {
        console.error(`[guildSync] Failed to sync guild ${guild.id}:`, err)
    }
}

export async function removeGuild(guildId: string): Promise<void> {
    await collections.guildCache().deleteOne({ _id: guildId })
}
