import { ChannelType, Guild } from "discord.js"
import { collections, BackupDoc } from "../database"

/** Snapshot roles and channels of a guild into `Bot.backups`. */
export async function createBackup(guild: Guild, name: string): Promise<BackupDoc> {
    const roles = guild.roles.cache
        .filter((r) => !r.managed && r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => ({
            name: r.name,
            color: r.color,
            permissions: r.permissions.bitfield.toString(),
            hoist: r.hoist,
            mentionable: r.mentionable,
        }))

    const channels = guild.channels.cache
        .sort((a, b) => (a as any).position - (b as any).position)
        .map((c) => ({
            name: c.name,
            type: c.type as number,
            parentName: c.parent?.name ?? null,
            position: "position" in c ? (c as any).position ?? 0 : 0,
        }))

    const doc: BackupDoc = {
        guildId: guild.id,
        name,
        createdAt: new Date(),
        data: { name: guild.name, roles, channels },
    }

    const res = await collections.backups().insertOne(doc)
    doc._id = res.insertedId
    return doc
}

export async function listBackups(guildId: string): Promise<BackupDoc[]> {
    return collections.backups().find({ guildId }).sort({ createdAt: -1 }).limit(25).toArray()
}

export interface RestoreResult {
    rolesCreated: number
    channelsCreated: number
}

/**
 * Additive restore: recreate roles/channels from the snapshot that no longer
 * exist (matched by name). This never deletes existing content, so it's safe
 * to run after a partial nuke.
 */
export async function restoreBackup(guild: Guild, backup: BackupDoc): Promise<RestoreResult> {
    const result: RestoreResult = { rolesCreated: 0, channelsCreated: 0 }

    const existingRoles = new Set(guild.roles.cache.map((r) => r.name))
    for (const role of backup.data.roles) {
        if (existingRoles.has(role.name)) continue
        try {
            await guild.roles.create({
                name: role.name,
                color: role.color,
                permissions: BigInt(role.permissions),
                hoist: role.hoist,
                mentionable: role.mentionable,
            })
            result.rolesCreated++
        } catch {
            /* ignore individual failures */
        }
    }

    // Categories first so children can be parented.
    const categories = backup.data.channels.filter((c) => c.type === ChannelType.GuildCategory)
    const others = backup.data.channels.filter((c) => c.type !== ChannelType.GuildCategory)
    const existingChannels = new Set(guild.channels.cache.map((c) => c.name))

    for (const cat of categories) {
        if (existingChannels.has(cat.name)) continue
        try {
            await guild.channels.create({ name: cat.name, type: ChannelType.GuildCategory })
            result.channelsCreated++
        } catch {
            /* ignore */
        }
    }

    for (const ch of others) {
        if (existingChannels.has(ch.name)) continue
        const parent = ch.parentName
            ? guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === ch.parentName)
            : undefined
        const creatable =
            ch.type === ChannelType.GuildText ||
            ch.type === ChannelType.GuildVoice ||
            ch.type === ChannelType.GuildAnnouncement ||
            ch.type === ChannelType.GuildForum ||
            ch.type === ChannelType.GuildStageVoice
        if (!creatable) continue
        try {
            await guild.channels.create({
                name: ch.name,
                type: ch.type as any,
                parent: parent?.id,
            })
            result.channelsCreated++
        } catch {
            /* ignore */
        }
    }

    return result
}
