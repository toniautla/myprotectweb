/**
 * Values that are safe to expose to the browser. Only `NEXT_PUBLIC_*` env vars
 * are inlined into the client bundle by Next.js.
 */
export const publicConfig = {
    clientId: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? "",
    invitePermissions: process.env.NEXT_PUBLIC_DISCORD_INVITE_PERMISSIONS ?? "8",
}

export function botInviteUrl(): string {
    const params = new URLSearchParams({
        client_id: publicConfig.clientId,
        permissions: publicConfig.invitePermissions,
        scope: "bot applications.commands",
    })
    return `https://discord.com/api/oauth2/authorize?${params.toString()}`
}
