/**
 * Thin client-side helper for the dashboard's own API routes.
 *
 * Authentication is handled by the NextAuth session cookie (sent automatically
 * with same-origin requests) and the server verifies the user manages the
 * target guild. No secret is sent from the browser.
 */
const api = async (url: string, method: string, body?: Record<string, unknown>) => {
    const res = await fetch(`/api${url}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
        let message = `Request failed (${res.status})`
        try {
            const data = await res.json()
            if (data?.message) message = data.message
        } catch {
            /* ignore */
        }
        throw new Error(message)
    }

    return res.json()
}

export default api
