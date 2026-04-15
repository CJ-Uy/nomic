export interface Session {
	guildId: string;
	voiceChannelId: string;
}

const sessions = new Map<string, Session>();
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

export function addSession(session: Session): void {
	sessions.set(session.guildId, session);
	startKeepAlive();
}

export function removeSession(guildId: string): void {
	sessions.delete(guildId);
	if (sessions.size === 0) {
		stopKeepAlive();
	}
}

export function getSession(guildId: string): Session | undefined {
	return sessions.get(guildId);
}

export function hasSession(guildId: string): boolean {
	return sessions.has(guildId);
}

export function activeSessions(): Session[] {
	return Array.from(sessions.values());
}

function startKeepAlive(): void {
	if (keepAliveInterval) return;

	const botWorkerUrl = process.env.BOT_WORKER_URL ?? '';
	const botSecret = process.env.BOT_SECRET ?? '';

	keepAliveInterval = setInterval(async () => {
		if (sessions.size === 0) {
			stopKeepAlive();
			return;
		}
		try {
			await fetch(`${botWorkerUrl}/ping`, {
				headers: { 'x-bot-secret': botSecret },
			});
		} catch {
			// Non-fatal — container sleeps on its own after sleepAfter if this fails
		}
	}, 10 * 60 * 1000);
}

function stopKeepAlive(): void {
	if (keepAliveInterval) {
		clearInterval(keepAliveInterval);
		keepAliveInterval = null;
	}
}
