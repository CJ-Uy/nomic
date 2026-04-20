import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState, StreamType, } from '@discordjs/voice';
import { synthesize } from './tts.js';
import { addSession, removeSession } from './session-store.js';
const connections = new Map();
export async function joinChannel(guild, voiceChannelId) {
    if (connections.has(guild.id)) {
        await leaveChannel(guild.id);
    }
    const channel = guild.channels.cache.get(voiceChannelId);
    if (!channel || !channel.isVoiceBased()) {
        // Channel not in cache — fetch it and retry
        await guild.channels.fetch();
        const fetched = guild.channels.cache.get(voiceChannelId);
        if (!fetched || !fetched.isVoiceBased()) {
            throw new Error('Channel not found or not a voice channel');
        }
    }
    const connection = joinVoiceChannel({
        channelId: voiceChannelId,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false,
    });
    const player = createAudioPlayer();
    connection.subscribe(player);
    // Register immediately so isActive() returns true and messages start queuing.
    // The WS op4 was already sent by joinVoiceChannel; UDP Ready comes asynchronously.
    connections.set(guild.id, { connection, player, queue: [], playing: false });
    addSession({ guildId: guild.id, voiceChannelId });
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
        }
        catch {
            connection.destroy();
            connections.delete(guild.id);
            removeSession(guild.id);
        }
    });
    // Wait for UDP voice connection in background. If it never establishes, clean up.
    entersState(connection, VoiceConnectionStatus.Ready, 30_000).catch(() => {
        leaveChannel(guild.id);
    });
}
export async function leaveChannel(guildId) {
    const conn = connections.get(guildId);
    if (conn) {
        conn.connection.destroy();
        connections.delete(guildId);
    }
    removeSession(guildId);
}
export function isActive(guildId) {
    return connections.has(guildId);
}
export async function enqueueSpeech(guildId, text, config) {
    const conn = connections.get(guildId);
    if (!conn)
        return;
    conn.queue.push({ text, config });
    if (!conn.playing) {
        await processQueue(guildId);
    }
}
async function processQueue(guildId) {
    const conn = connections.get(guildId);
    if (!conn || conn.queue.length === 0) {
        if (conn)
            conn.playing = false;
        return;
    }
    conn.playing = true;
    const { text, config } = conn.queue.shift();
    try {
        // Wait for UDP Ready before playing — audio sent before Ready is dropped
        if (conn.connection.state.status !== VoiceConnectionStatus.Ready) {
            console.log(`[voice-manager] Waiting for voice Ready (current: ${conn.connection.state.status})`);
            await entersState(conn.connection, VoiceConnectionStatus.Ready, 30_000);
        }
        console.log(`[voice-manager] Synthesizing: "${text.slice(0, 60)}"`);
        const audioStream = await synthesize(text, config);
        console.log(`[voice-manager] Playing audio`);
        const resource = createAudioResource(audioStream, {
            inputType: StreamType.Arbitrary,
        });
        conn.player.play(resource);
        await entersState(conn.player, AudioPlayerStatus.Idle, 60_000);
        console.log(`[voice-manager] Done playing`);
    }
    catch (err) {
        console.error('[voice-manager] TTS error:', err);
    }
    await processQueue(guildId);
}
