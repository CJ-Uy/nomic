import {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
	AudioPlayerStatus,
	VoiceConnectionStatus,
	entersState,
	StreamType,
	type VoiceConnection,
	type AudioPlayer,
} from '@discordjs/voice';
import type { Guild } from 'discord.js';
import { synthesize, type VoiceConfig } from './tts.js';
import { addSession, removeSession } from './session-store.js';

interface ChannelConnection {
	connection: VoiceConnection;
	player: AudioPlayer;
	queue: Array<{ text: string; config: VoiceConfig }>;
	playing: boolean;
}

const connections = new Map<string, ChannelConnection>();

export async function joinChannel(guild: Guild, voiceChannelId: string): Promise<void> {
	if (connections.has(guild.id)) {
		await leaveChannel(guild.id);
	}

	const channel = guild.channels.cache.get(voiceChannelId);
	if (!channel || !channel.isVoiceBased()) {
		throw new Error('Channel not found or not a voice channel');
	}

	const connection = joinVoiceChannel({
		channelId: voiceChannelId,
		guildId: guild.id,
		adapterCreator: guild.voiceAdapterCreator as any,
		selfDeaf: false,
		selfMute: false,
	});

	await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

	const player = createAudioPlayer();
	connection.subscribe(player);

	connection.on(VoiceConnectionStatus.Disconnected, async () => {
		try {
			await Promise.race([
				entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
				entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
			]);
		} catch {
			connection.destroy();
			connections.delete(guild.id);
			removeSession(guild.id);
		}
	});

	connections.set(guild.id, { connection, player, queue: [], playing: false });
	addSession({ guildId: guild.id, voiceChannelId });
}

export async function leaveChannel(guildId: string): Promise<void> {
	const conn = connections.get(guildId);
	if (conn) {
		conn.connection.destroy();
		connections.delete(guildId);
	}
	removeSession(guildId);
}

export function isActive(guildId: string): boolean {
	return connections.has(guildId);
}

export async function enqueueSpeech(
	guildId: string,
	text: string,
	config: VoiceConfig
): Promise<void> {
	const conn = connections.get(guildId);
	if (!conn) return;

	conn.queue.push({ text, config });
	if (!conn.playing) {
		await processQueue(guildId);
	}
}

async function processQueue(guildId: string): Promise<void> {
	const conn = connections.get(guildId);
	if (!conn || conn.queue.length === 0) {
		if (conn) conn.playing = false;
		return;
	}

	conn.playing = true;
	const { text, config } = conn.queue.shift()!;

	try {
		const audioStream = await synthesize(text, config);
		const resource = createAudioResource(audioStream, {
			inputType: StreamType.Arbitrary,
		});

		conn.player.play(resource);
		await entersState(conn.player, AudioPlayerStatus.Idle, 60_000);
	} catch (err) {
		console.error('[voice-manager] TTS error:', err);
	}

	await processQueue(guildId);
}
