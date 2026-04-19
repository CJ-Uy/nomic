# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Nomic is a Discord TTS (text-to-speech) bot. Users type in a voice channel's text chat and the bot reads it aloud using Microsoft Edge TTS voices. The project is split into two separately deployed Cloudflare services.

## Commands

All commands from repo root use `pnpm`:

```bash
pnpm dev              # SvelteKit dev server
pnpm build            # Production build
pnpm preview          # Build + wrangler pages dev (port 8788)
pnpm check            # svelte-check TypeScript validation
pnpm lint             # prettier + eslint check
pnpm format           # prettier write
pnpm test:unit        # vitest (unit + server tests)
pnpm test:e2e         # playwright e2e tests
pnpm test             # unit + e2e
pnpm deploy           # build + wrangler pages deploy
pnpm gen              # regenerate wrangler types (src/worker-configuration.d.ts)
```

Bot worker (separate deployment):
```bash
cd bot-worker && npx wrangler deploy
```

Bot container (for local dev only):
```bash
cd bot-worker/bot && npm run dev   # tsx hot-reload
cd bot-worker/bot && npm run build # tsc compile
```

Register Discord slash commands (one-time, global propagation ~1hr):
```bash
DISCORD_TOKEN=xxx DISCORD_CLIENT_ID=xxx npx tsx scripts/register-commands.ts
```

Apply D1 migrations:
```bash
wrangler d1 migrations apply nomic
```

## Architecture

Two separately deployed Cloudflare services communicate via a shared `BOT_SECRET` header.

### 1. Main App — SvelteKit on Cloudflare Pages (`src/`)

Handles the web frontend, Discord interactions webhook, and voice config API.

**Routes:**
- `POST /api/interactions` — Discord interactions endpoint. Verifies Ed25519 signature, routes slash commands (`join`, `leave`, `voice new/set/preview/list/tune`). `join`/`leave` are deferred interactions: they forward to the bot worker via the `BOT` service binding and return immediately.
- `GET|PUT|POST /api/voice/[userId]/[guildId]` — Internal API for the bot to fetch/update per-user voice config. Protected by `x-bot-secret` header.
- `GET /invite` — Redirects to Discord OAuth bot invite URL.

**Server lib (`src/lib/server/`):**
- `discord-verify.ts` — Ed25519 signature verification using Web Crypto API
- `db.ts` — D1 database helpers (`getVoice`, `upsertVoice`)
- `voices.ts` — Static voice list, speed/pitch maps, `randomVoice()`, `isValidVoice()`
- `discord-api.ts` — `sendFollowup`, `getMemberVoiceState`

**Cloudflare bindings (main app):**
- `DB` — D1 database
- `BOT` — Service binding to `nomic-bot` worker
- Secrets: `DISCORD_PUBLIC_KEY`, `DISCORD_CLIENT_ID`, `BOT_SECRET`

### 2. Bot Worker — Cloudflare Worker + Container (`bot-worker/`)

`bot-worker/index.ts` defines `BotManager`, a Durable Object that extends `@cloudflare/containers/Container`. It wraps a Docker container running the Discord.js bot. The worker authenticates via `BOT_SECRET` and proxies requests to the container's Express server.

The container (`bot-worker/bot/`) is a Node.js app:
- `index.ts` — Express server on port 3000. Routes: `POST /join`, `POST /leave`, `GET /ping`
- `bot.ts` — discord.js client. Listens to `MessageCreate` in voice channels → fetches voice config from main app → enqueues TTS
- `voice-manager.ts` — `@discordjs/voice` connection lifecycle. Maintains per-guild queue; processes TTS items serially
- `tts.ts` — `msedge-tts` synthesis → MP3 stream via SSML with prosody (rate/pitch)
- `session-store.ts` — In-memory guild session map. Runs a keepalive `GET /ping` every 10 min to reset the container's `sleepAfter` timer

**Container sleepAfter:** `BotManager` sleeps after 15 minutes of inactivity. The keepalive in `session-store.ts` prevents sleep while voice sessions are active.

**Cloudflare bindings (bot worker):**
- `BOT_MANAGER` — Durable Object namespace
- Secrets: `DISCORD_TOKEN`, `BOT_SECRET`, `WORKER_URL` (main app URL), `BOT_WORKER_URL` (bot worker URL)

### Request Flow

```
Discord → POST /api/interactions (main app)
  → verify Ed25519 sig
  → join/leave: waitUntil(BOT.fetch(...))  ← service binding to bot-worker
               → bot-worker authenticates BOT_SECRET
               → proxies to container Express
               → bot.ts joins voice channel
               → on MessageCreate → fetch /api/voice/{userId}/{guildId} (main app)
               → voice-manager enqueues TTS → msedge-tts → @discordjs/voice plays audio
```

### Database Schema

Single D1 table:
```sql
CREATE TABLE user_voices (
  user_id  TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  voice    TEXT NOT NULL DEFAULT 'en-US-GuyNeural',
  rate     TEXT NOT NULL DEFAULT '+0%',
  pitch    TEXT NOT NULL DEFAULT '+0Hz',
  PRIMARY KEY (user_id, guild_id)
);
```

### Testing Structure

- **Server tests** (vitest, node env): `src/**/*.spec.ts` excluding `*.svelte.spec.ts`
- **Browser/component tests** (vitest + playwright/chromium): `src/**/*.svelte.spec.ts`
- **E2E tests** (playwright): `e2e/` — requires `pnpm preview` running on port 8788
