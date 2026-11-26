/**
 * The "Invite Bot" link points at our own server-side redirect route, which
 * builds the Discord authorize URL from runtime env (`DISCORD_CLIENT_ID`).
 * This avoids NEXT_PUBLIC_* build-time baking entirely.
 */
export function botInviteUrl(): string {
    return "/api/invite"
}
