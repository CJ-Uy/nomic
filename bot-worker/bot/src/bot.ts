import { Client, GatewayIntentBits, ChannelType, Events } from 'discord.js';
import { joinChannel, leaveChannel, isActive, enqueueSpeech } from './voice-manager.js';
import { getSession } from './session-store.js';
import type { VoiceConfig } from './tts.js';

const WORKER_URL = process.env.WORKER_URL ?? '';
const BOT_SECRET = process.env.BOT_SECRET ?? '';

export const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	]
});

client.once(Events.ClientReady, (c) => {
	console.log(`[nomic] Logged in as ${c.user.tag}`);
});

async function safeSend(message: import('discord.js').Message, content: string): Promise<void> {
	try {
		await message.reply(content);
	} catch (replyErr) {
		console.error('[bot] reply() failed:', replyErr);
		try {
			if ('send' in message.channel) await message.channel.send(content);
		} catch (sendErr) {
			console.error('[bot] channel.send() also failed:', sendErr);
		}
	}
}

// Read messages typed in the voice channel's built-in text chat
client.on(Events.MessageCreate, async (message) => {
	if (message.author.bot) return;
	if (!message.guildId) return;

	console.log(`[bot] MessageCreate: channel=${message.channel.type} guild=${message.guildId} active=${isActive(message.guildId)}`);

	// If bot is active and user typed in a regular text channel, guide them
	if (
		message.channel.type !== ChannelType.GuildVoice &&
		message.channel.type !== ChannelType.GuildStageVoice
	) {
		if (isActive(message.guildId)) {
			await safeSend(message, 'Type in the **voice channel text chat** (the text input inside the voice channel itself), not in a regular text channel.');
		}
		return;
	}

	if (!isActive(message.guildId)) {
		await safeSend(message, '[Debug] Bot has no active voice connection — try `/nomic leave` then `/nomic join` again.');
		return;
	}

	const session = getSession(message.guildId);
	if (!session) {
		await safeSend(message, '[Debug] No session found — try `/nomic leave` then `/nomic join`.');
		return;
	}
	if (message.channelId !== session.voiceChannelId) {
		await safeSend(message, `[Debug] Wrong channel — bot is in <#${session.voiceChannelId}>, type there.`);
		return;
	}

	const text = message.content.trim().slice(0, 300);
	if (!text) {
		await safeSend(message, '⚠️ Cannot read message content. Enable the **Message Content** privileged intent in the Discord Developer Portal, then rejoin.');
		return;
	}

	const config = await fetchVoiceConfig(message.author.id, message.guildId);
	console.log(`[bot] Queuing speech: "${text.slice(0, 60)}" (voice: ${config.voice})`);
	await safeSend(message, `[Debug] Processing TTS: "${text.slice(0, 50)}"...`);
	await enqueueSpeech(message.guildId, text, config);
});

async function fetchVoiceConfig(userId: string, guildId: string): Promise<VoiceConfig> {
	try {
		const res = await fetch(`${WORKER_URL}/api/voice/${userId}/${guildId}`, {
			headers: { 'x-bot-secret': BOT_SECRET }
		});
		if (!res.ok) throw new Error(`Voice API ${res.status}`);
		const row = (await res.json()) as { voice: string; rate: string; pitch: string };
		return { voice: row.voice, rate: row.rate, pitch: row.pitch };
	} catch {
		return { voice: 'en-US-GuyNeural', rate: '+0%', pitch: '+0Hz' };
	}
}

export async function botJoin(
	guildId: string,
	userId: string,
	interactionToken: string,
	appId: string
): Promise<void> {
	try {
		const guild = await client.guilds.fetch(guildId);
		const member = await guild.members.fetch(userId);
		const voiceChannel = member.voice?.channel;

		if (!voiceChannel) {
			await sendFollowup(interactionToken, appId, 'You need to be in a voice channel first!');
			return;
		}

		await joinChannel(guild, voiceChannel.id);
		await sendFollowup(
			interactionToken,
			appId,
			`Joined **${voiceChannel.name}**! Type in the voice chat and I'll read it aloud.`
		);
	} catch (err) {
		console.error('[bot] Join error:', err);
		await leaveChannel(guildId);
		await sendFollowup(
			interactionToken,
			appId,
			'Failed to join. Check my permissions (Connect + Speak).'
		);
	}
}

export async function botLeave(
	guildId: string,
	interactionToken: string,
	appId: string
): Promise<void> {
	await leaveChannel(guildId);
	// leaveChannel destroys the VoiceConnection which sends WS op4 (channel_id: null).
	// If no connection was stored (e.g. join failed before Ready), send the op4 manually
	// via the guild's shard — this doesn't require MOVE_MEMBERS like REST does.
	try {
		const guild = await client.guilds.fetch(guildId);
		const botVoiceChannelId = guild.members.me?.voice.channelId;
		if (botVoiceChannelId) {
			(guild as any).shard?.send({
				op: 4,
				d: { guild_id: guildId, channel_id: null, self_mute: false, self_deaf: false },
			});
		}
	} catch (err) {
		console.warn('[bot] Leave fallback error:', err);
	}
	await sendFollowup(interactionToken, appId, 'Left the voice channel. Goodbye!');
}

async function sendFollowup(token: string, appId: string, content: string): Promise<void> {
	await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ content })
	});
}
