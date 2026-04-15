import { Container } from 'cloudflare:containers';

interface Env {
	BOT_MANAGER: DurableObjectNamespace;
	DISCORD_TOKEN: string;
	BOT_SECRET: string;
	WORKER_URL: string;
	BOT_WORKER_URL: string;
}

export class BotManager extends Container<Env> {
	defaultPort = 3000;
	sleepAfter = '15m';

	constructor(state: DurableObjectState, env: Env) {
		super(state, env);
		this.envVars = {
			DISCORD_TOKEN: env.DISCORD_TOKEN,
			WORKER_URL: env.WORKER_URL,
			BOT_SECRET: env.BOT_SECRET,
			BOT_WORKER_URL: env.BOT_WORKER_URL,
		};
	}

	override onStart(): void {
		console.log('[nomic] Bot container started');
	}

	override onStop(): void {
		console.log('[nomic] Bot container stopped');
	}

	override onError(error: unknown): void {
		console.error('[nomic] Container error:', error);
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const secret = request.headers.get('x-bot-secret');
		if (secret !== env.BOT_SECRET) {
			return new Response('Unauthorized', { status: 401 });
		}

		const id = env.BOT_MANAGER.idFromName('singleton');
		const stub = env.BOT_MANAGER.get(id);

		return stub.fetch(request);
	},
} satisfies ExportedHandler<Env>;
