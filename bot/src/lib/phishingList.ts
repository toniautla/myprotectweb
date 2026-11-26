/**
 * Live phishing-domain protection.
 *
 * Fetches community-maintained scam-domain lists on a schedule and keeps them
 * in memory. Combined with the built-in patterns and per-guild custom domains,
 * this catches brand-new phishing domains without a redeploy.
 */

const SOURCES = [
    "https://raw.githubusercontent.com/Discord-AntiScam/scam-links/main/list.json",
]

const REFRESH_MS = 30 * 60 * 1000 // every 30 minutes

let domains = new Set<string>()

export function phishingListSize(): number {
    return domains.size
}

/**
 * True if the host (or one of its parent domains) is a known phishing domain.
 * Checking parent suffixes catches `login.scam.com` when `scam.com` is listed.
 */
export function isKnownPhish(host: string): boolean {
    if (!domains.size) return false
    const clean = host.toLowerCase().replace(/^www\./, "")
    const parts = clean.split(".")
    for (let i = 0; i < parts.length - 1; i++) {
        if (domains.has(parts.slice(i).join("."))) return true
    }
    return false
}

export async function refreshPhishingList(): Promise<void> {
    const next = new Set<string>()
    for (const url of SOURCES) {
        try {
            const res = await fetch(url, { headers: { "User-Agent": "MyProtect-Bot" } })
            if (!res.ok) continue
            const data = await res.json()
            if (Array.isArray(data)) {
                for (const d of data) {
                    if (typeof d === "string") next.add(d.toLowerCase())
                }
            }
        } catch (err) {
            console.error(`[phishing] failed to fetch ${url}:`, err)
        }
    }
    // Only replace if we actually got something, so a failed fetch doesn't wipe
    // the protection we already have.
    if (next.size) {
        domains = next
        console.log(`[phishing] loaded ${domains.size} known scam domains`)
    }
}

export function startPhishingList(): void {
    refreshPhishingList().catch(() => null)
    setInterval(() => refreshPhishingList().catch(() => null), REFRESH_MS)
}
