import { json, error } from '@sveltejs/kit';
import { verifyDiscordRequest } from '$lib/server/discord-verify';
import { getVoice, upsertVoice } from '$lib/server/db';
import { randomVoice, isValidVoice, SPEEDS, PITCHES, VOICES } from '$lib/server/voices';
import type { RequestHandler } from './$types';

const INTERACTION_TYPE = { PING: 1, APPLICATION_COMMAND: 2 };
const RESPONSE_TYPE = {
	PONG: 1,
	CHANNEL_MESSAGE: 4,
	DEFERRED_CHANNEL_MESSAGE: 5,
};

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform?.env) throw error(500, 'No platform');

	const cloned = request.clone();
	const valid = await verifyDiscordRequest(cloned, platform.env.DISCORD_PUBLIC_KEY);
	if (!valid) throw error(401, 'Invalid signature');

	const interaction = (await request.json()) as Record<string, unknown>;

	if (interaction.type === INTERACTION_TYPE.PING) {
		return json({ type: RESPONSE_TYPE.PONG });
	}

	if (interaction.type !== INTERACTION_TYPE.APPLICATION_COMMAND) {
		return json({ type: RESPONSE_TYPE.CHANNEL_MESSAGE, data: { content: 'Unknown command type' } });
	}

	const data = interaction.data as Record<string, unknown>;
	const options = (data.options as Array<Record<string, unknown>>) ?? [];
	const subcommand = options[0]?.name as string;
	const guildId = interaction.guild_id as string;
	const member = interaction.member as Record<string, unknown> | undefined;
	const userId = member?.user
		? (member.user as Record<string, unknown>).id as string
		: (interaction.user as Record<string, unknown>)?.id as string;
	const interactionToken = interaction.token as string;
	const appId = interaction.application_id as string;
	const env = platform.env;

	if (subcommand === 'join') {
		platform.ctx.waitUntil(
			env.BOT.fetch(
				new Request('https://nomic-bot.internal/join', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-bot-secret': env.BOT_SECRET,
					},
					body: JSON.stringify({ guildId, userId, interactionToken, appId }),
				})
			)
		);
		return json({ type: RESPONSE_TYPE.DEFERRED_CHANNEL_MESSAGE });
	}

	if (subcommand === 'leave') {
		platform.ctx.waitUntil(
			env.BOT.fetch(
				new Request('https://nomic-bot.internal/leave', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-bot-secret': env.BOT_SECRET,
					},
					body: JSON.stringify({ guildId, interactionToken, appId }),
				})
			)
		);
		return json({ type: RESPONSE_TYPE.DEFERRED_CHANNEL_MESSAGE });
	}

	if (subcommand === 'voice') {
		const voiceOptions =
			((options[0] as Record<string, unknown>)?.options as Array<Record<string, unknown>>) ?? [];
		const voiceSub = voiceOptions[0]?.name as string;
		const voiceSubOpts =
			((voiceOptions[0] as Record<string, unknown>)?.options as Array<Record<string, unknown>>) ??
			[];

		if (voiceSub === 'new') {
			const voice = randomVoice();
			const current = await getVoice(env.DB, userId, guildId);
			await upsertVoice(env.DB, userId, guildId, voice, current?.rate ?? '+0%', current?.pitch ?? '+0Hz');
			return json({
				type: RESPONSE_TYPE.CHANNEL_MESSAGE,
				data: { content: `Your new voice: **${voice}**`, flags: 64 },
			});
		}

		if (voiceSub === 'set') {
			const name = voiceSubOpts.find((o) => o.name === 'name')?.value as string;
			if (!isValidVoice(name)) {
				return json({
					type: RESPONSE_TYPE.CHANNEL_MESSAGE,
					data: { content: 'Invalid voice. Use `/nomic voice list` to see options.', flags: 64 },
				});
			}
			const current = await getVoice(env.DB, userId, guildId);
			await upsertVoice(env.DB, userId, guildId, name, current?.rate ?? '+0%', current?.pitch ?? '+0Hz');
			return json({
				type: RESPONSE_TYPE.CHANNEL_MESSAGE,
				data: { content: `Voice set to **${name}**`, flags: 64 },
			});
		}

		if (voiceSub === 'preview') {
			const row = await getVoice(env.DB, userId, guildId);
			const voice = row?.voice ?? 'none assigned yet';
			const rate = row?.rate ?? '+0%';
			const pitch = row?.pitch ?? '+0Hz';
			return json({
				type: RESPONSE_TYPE.CHANNEL_MESSAGE,
				data: {
					content: `Your voice: **${voice}**\nSpeed: \`${rate}\` | Pitch: \`${pitch}\``,
					flags: 64,
				},
			});
		}

		if (voiceSub === 'list') {
			const listed = [...VOICES].join('\n');
			return json({
				type: RESPONSE_TYPE.CHANNEL_MESSAGE,
				data: {
					content: `**Available voices:**\n\`\`\`\n${listed}\n\`\`\``,
					flags: 64,
				},
			});
		}

		if (voiceSub === 'tune') {
			const speed = voiceSubOpts.find((o) => o.name === 'speed')?.value as string | undefined;
			const pitch = voiceSubOpts.find((o) => o.name === 'pitch')?.value as string | undefined;

			if (!speed && !pitch) {
				return json({
					type: RESPONSE_TYPE.CHANNEL_MESSAGE,
					data: { content: 'Provide at least one of: speed, pitch', flags: 64 },
				});
			}

			const current = await getVoice(env.DB, userId, guildId);
			const newRate = (speed && SPEEDS[speed]) ?? current?.rate ?? '+0%';
			const newPitch = (pitch && PITCHES[pitch]) ?? current?.pitch ?? '+0Hz';
			const voice = current?.voice ?? randomVoice();
			await upsertVoice(env.DB, userId, guildId, voice, newRate, newPitch);

			return json({
				type: RESPONSE_TYPE.CHANNEL_MESSAGE,
				data: {
					content: `Voice tuned: speed \`${newRate}\`, pitch \`${newPitch}\``,
					flags: 64,
				},
			});
		}
	}

	return json({
		type: RESPONSE_TYPE.CHANNEL_MESSAGE,
		data: { content: 'Unknown command', flags: 64 },
	});
};
