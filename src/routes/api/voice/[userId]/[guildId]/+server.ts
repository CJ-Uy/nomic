import { json, error } from '@sveltejs/kit';
import { getVoice, upsertVoice } from '$lib/server/db';
import { randomVoice, isValidVoice, SPEEDS, PITCHES } from '$lib/server/voices';
import type { RequestHandler } from './$types';

function authorized(request: Request, env: Env): boolean {
	return request.headers.get('x-bot-secret') === env.BOT_SECRET;
}

export const GET: RequestHandler = async ({ params, request, platform }) => {
	if (!platform?.env) throw error(500, 'No platform');
	if (!authorized(request, platform.env)) throw error(401, 'Unauthorized');

	const { userId, guildId } = params;
	let row = await getVoice(platform.env.DB, userId, guildId);

	if (!row) {
		const voice = randomVoice();
		await upsertVoice(platform.env.DB, userId, guildId, voice, '+0%', '+0Hz');
		row = { user_id: userId, guild_id: guildId, voice, rate: '+0%', pitch: '+0Hz' };
	}

	return json(row);
};

export const PUT: RequestHandler = async ({ params, request, platform }) => {
	if (!platform?.env) throw error(500, 'No platform');
	if (!authorized(request, platform.env)) throw error(401, 'Unauthorized');

	const { userId, guildId } = params;
	const body = (await request.json()) as {
		voice?: string;
		speed?: string;
		pitch?: string;
	};

	const current = await getVoice(platform.env.DB, userId, guildId);
	const voice = body.voice ?? current?.voice ?? randomVoice();
	const rate = (body.speed && SPEEDS[body.speed]) ?? current?.rate ?? '+0%';
	const pitch = (body.pitch && PITCHES[body.pitch]) ?? current?.pitch ?? '+0Hz';

	if (body.voice && !isValidVoice(body.voice)) {
		throw error(400, 'Invalid voice name');
	}

	await upsertVoice(platform.env.DB, userId, guildId, voice, rate, pitch);
	return json({ user_id: userId, guild_id: guildId, voice, rate, pitch });
};

export const POST: RequestHandler = async ({ params, request, platform }) => {
	if (!platform?.env) throw error(500, 'No platform');
	if (!authorized(request, platform.env)) throw error(401, 'Unauthorized');

	const { userId, guildId } = params;
	const voice = randomVoice();
	const current = await getVoice(platform.env.DB, userId, guildId);
	await upsertVoice(
		platform.env.DB,
		userId,
		guildId,
		voice,
		current?.rate ?? '+0%',
		current?.pitch ?? '+0Hz'
	);
	return json({ voice });
};
