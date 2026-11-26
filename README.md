# MyProtect

A Discord server-protection bot **and** its web dashboard, sharing a single
MongoDB. Configure everything from the web dashboard and it applies to the bot
instantly — and vice-versa.

```
myprotectweb/
├── pages/ components/ lib/ styles/   # Next.js dashboard (this folder)
└── bot/                              # discord.js v14 bot (TypeScript)
```

## How the two sides "cross over"

The bot and the dashboard never talk to each other directly — they share
collections in MongoDB:

| Collection              | Written by | Read by   | Purpose                                   |
| ----------------------- | ---------- | --------- | ----------------------------------------- |
| `botCache.guildCache`   | **Bot**    | Dashboard | Guild name, icon, channels, roles, counts |
| `Bot.modules`           | Both       | Both      | Which modules are enabled per guild       |
| `Bot.rules`             | Dashboard  | **Bot**   | The configurable rules embed              |
| `Bot.channels`          | Dashboard  | **Bot**   | Filtered ("special") channels             |
| `Bot.phishing_links`    | Dashboard  | **Bot**   | Optional custom phishing domains          |
| `Bot.backups`           | Bot        | Bot       | Server backups                            |
| `Bot.warnings`          | Bot        | Bot       | Moderation warnings                       |

So: toggle a module on the dashboard → the bot stops/starts enforcing it. Edit
the rules on the dashboard → `/rules post` publishes them. Toggle a module with
`/modules` in Discord → the dashboard reflects it on refresh.

---

## 1. Prerequisites

- Node.js 18+ (tested on Node 22)
- A MongoDB instance (local or Atlas) — **the same URI for both apps**
- A Discord application: <https://discord.com/developers/applications>
  - **OAuth2** → copy the *Client ID* and *Client Secret*
  - **OAuth2 → Redirects** → add `http://localhost:3000/api/auth/callback`
  - **Bot** → create a bot, copy the *token*
  - **Bot → Privileged Gateway Intents** → enable **Server Members Intent** and
    **Message Content Intent** (used by Anti-Raid, Anti-Phishing and the channel
    filter)

---

## 2. The dashboard (web)

```bash
cp .env.example .env.local      # then fill in the values
npm install --legacy-peer-deps  # Chakra v1 needs legacy peer resolution
npm run dev                     # http://localhost:3000
```

`.env.local` values are documented in [`.env.example`](.env.example). In short:
`MONGO_URI`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `NEXTAUTH_SECRET`,
and `NEXTAUTH_URL`.

Production:

```bash
npm run build && npm run start
```

### What changed from the original

- **Secrets** moved out of the committed `config.json` into environment
  variables (`lib/config.ts`).
- **Auth** replaced the unmaintained `next-auth@3.29` with a small, direct
  Discord OAuth2 flow (`lib/session.ts`, `pages/api/auth/{login,callback,logout}.ts`).
  It uses our own `state` cookie and an HMAC-signed httpOnly session cookie —
  no `openid-client`, which was throwing `issuer must be configured` /
  `state cookie missing` errors on serverless.
- **Security**: the old model shipped the Discord *client secret* to the
  browser and used it as an API key. API routes now authenticate with the
  signed **session** and verify the user actually manages the target guild
  (`lib/auth.ts`), and only an allow-list of collections can be written.
- **Reliability**: lazy MongoDB connection (no more build-time crash), fixed
  `Modules`/`Cache`/`DbUtils` logic bugs, null-guild handling, and a
  deduplicated guild-loading helper (`lib/guildProps.ts`).
- **UI**: kept the Chakra design system; made the landing/hero/feature rows
  responsive, fixed copy, added proper empty/error states and a cohesive
  toggle/setup experience.

---

## 3. The bot

```bash
cd bot
cp .env.example .env            # then fill in the values
npm install
npm run deploy                  # register slash commands (set DEV_GUILD_ID for instant updates)
npm run dev                     # start with hot-reload (tsx)
```

Production:

```bash
cd bot
npm run build && npm run start
```

### Slash commands

| Command           | Module        | Discord UI used                     |
| ----------------- | ------------- | ----------------------------------- |
| `/dashboard`      | —             | Embed + link buttons                |
| `/modules`        | —             | Embed + **toggle buttons**          |
| `/setup`          | —             | Embed + **multi-select dropdown**   |
| `/rules post`     | Rules         | Builds the configured embed+buttons |
| `/rules preview`  | Rules         | Ephemeral embed                     |
| `/rules edit`     | Rules         | **Modal** (title/description/colour)|
| `/ban`            | Moderation    | Embed + **confirm/cancel buttons**  |
| `/kick`           | Moderation    | Embed                               |
| `/purge`          | Moderation    | Embed                               |
| `/warn add/list`  | Moderation    | Embeds + stored warnings            |
| `/backup create`  | Backups       | Embed                               |
| `/backup list`    | Backups       | **Dropdown** + confirm buttons      |

### Passive modules (event-driven, gated by the toggle)

- **AntiPhishing** — deletes scam/phishing links (default blocklist + custom
  domains from `Bot.phishing_links`).
- **ContentProtect** — enforces the dashboard's filtered channels (media-only,
  links-only, YouTube-only).
- **AntiRaid** — sliding-window join-burst detection; kicks new accounts during
  a raid.
- **Webhooks** — removes webhooks created by non-admins (a common raid vector).

A module counts as **enabled** when it is missing from `Bot.modules` or has
`enabled !== false` — identical logic on both sides.

---

## 4. Inviting the bot

The dashboard's "Invite Bot" buttons point at `/api/invite`, which redirects to
Discord's authorize URL built server-side from `DISCORD_CLIENT_ID` and
`DISCORD_INVITE_PERMISSIONS` (default `8` = Administrator; lower it for
least-privilege once you know which permissions you need). No `NEXT_PUBLIC_*`
build-time vars are required.
