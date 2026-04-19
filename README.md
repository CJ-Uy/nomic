# Nomic

Nomic is a Discord text-to-speech bot. When joined to a voice channel, it reads messages typed in that channel's text chat aloud using Microsoft Edge neural TTS voices. Each user gets their own persistent voice, speed, and pitch settings per server.

## How it works

The project is split into two separately deployed Cloudflare services that talk to each other via a shared secret.

**Main app** (SvelteKit on Cloudflare Pages) handles the Discord interactions webhook, the voice config API, and the invite page. It stores user voice settings in a Cloudflare D1 (SQLite) database.

**Bot worker** (Cloudflare Worker + Container) runs the actual Discord.js bot inside a Docker container. The worker is a thin Durable Object that manages the container lifecycle. The container holds the discord.js client, the voice connection, and the TTS queue.

When a user runs `/nomic join`, Discord sends an interaction to the main app. The main app forwards it to the bot worker via a service binding, and the container joins the voice channel. From that point on, every message typed in the voice channel's text chat is synthesized and played in order.

## Setup

### Prerequisites

- [pnpm](https://pnpm.io/) for the main app
- A Cloudflare account with Workers, Pages, D1, and Containers enabled
- A Discord application with a bot token and the `Message Content` privileged intent enabled in the Discord Developer Portal

### Discord Developer Portal

Enable these under your application:

- **Privileged Gateway Intents**: Server Members Intent, Message Content Intent
- **Bot Permissions**: Connect, Speak
- **Installation**: add `bot` and `applications.commands` scopes

### Environment variables

Main app (Cloudflare Pages secrets):

| Variable | Description |
|---|---|
| `DISCORD_PUBLIC_KEY` | Application public key from Discord Dev Portal |
| `DISCORD_CLIENT_ID` | Application client ID |
| `BOT_SECRET` | Shared secret between main app and bot worker |

Bot worker (Wrangler secrets):

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token from Discord Dev Portal |
| `BOT_SECRET` | Same shared secret as above |
| `WORKER_URL` | Public URL of the main app (e.g. `https://nomic.cjuy.dev`) |
| `BOT_WORKER_URL` | Public URL of the bot worker |

### First-time deployment

1. Apply the D1 migration:
   ```sh
   wrangler d1 migrations apply nomic
   ```

2. Deploy the bot worker (from repo root):
   ```sh
   cd bot-worker && npx wrangler deploy
   ```

3. Deploy the main app:
   ```sh
   pnpm deploy
   ```

4. Register slash commands (one-time, propagates to Discord within ~1 hour):
   ```sh
   DISCORD_TOKEN=xxx DISCORD_CLIENT_ID=xxx npx tsx scripts/register-commands.ts
   ```

5. Set your Discord interactions endpoint URL in the Discord Developer Portal to `https://your-domain/api/interactions`.

## Development

Install dependencies:
```sh
pnpm install
```

Run the local dev server:
```sh
pnpm dev
```

Type-check:
```sh
pnpm check
```

Lint and format:
```sh
pnpm lint
pnpm format
```

Run tests:
```sh
pnpm test:unit   # vitest unit and server tests
pnpm test:e2e    # playwright end-to-end tests (requires pnpm preview running)
pnpm test        # both
```

Preview a production build locally:
```sh
pnpm preview
```

For local development of the bot container itself:
```sh
cd bot-worker/bot && npm run dev
```

## Commands

All commands are subcommands of `/nomic`:

| Command | Description |
|---|---|
| `/nomic join` | Join your current voice channel |
| `/nomic leave` | Leave the voice channel |
| `/nomic voice new` | Get a random new voice |
| `/nomic voice set <name>` | Set a specific voice by name |
| `/nomic voice preview` | Show your current voice and settings |
| `/nomic voice list` | List all available voices |
| `/nomic voice tune` | Adjust speed (slow/normal/fast) and pitch (low/normal/high) |

Voice settings are stored per user per server.

## Notes

- The bot reads messages from the voice channel's built-in text chat, not from regular text channels.
- The container sleeps after 15 minutes of inactivity and wakes automatically on the next command.
- Message content is capped at 300 characters per message.
