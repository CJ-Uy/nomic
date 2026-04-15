import { Container, getContainer } from '@cloudflare/containers';
import { env } from 'cloudflare:workers';

interface Env {
	BOT_MANAGER: DurableObjectNamespace<BotManager>;
	DISCORD_TOKEN: string;
	BOT_SECRET: string;
	WORKER_URL: string;
	BOT_WORKER_URL: string;
}

export class BotManager extends Container<Env> {
	defaultPort = 3000;
	sleepAfter = '15m';

	envVars = {
		DISCORD_TOKEN: (env as Env).DISCORD_TOKEN,
		WORKER_URL: (env as Env).WORKER_URL,
		BOT_SECRET: (env as Env).BOT_SECRET,
		BOT_WORKER_URL: (env as Env).BOT_WORKER_URL,
	};

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

		const stub = getContainer(env.BOT_MANAGER, 'singleton');
		return stub.fetch(request);
	},
} satisfies ExportedHandler<Env>;
