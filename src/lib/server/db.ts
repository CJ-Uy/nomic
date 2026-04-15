export interface VoiceRow {
	user_id: string;
	guild_id: string;
	voice: string;
	rate: string;
	pitch: string;
}

export async function getVoice(
	db: D1Database,
	userId: string,
	guildId: string
): Promise<VoiceRow | null> {
	return db
		.prepare('SELECT * FROM user_voices WHERE user_id = ? AND guild_id = ?')
		.bind(userId, guildId)
		.first<VoiceRow>();
}

export async function upsertVoice(
	db: D1Database,
	userId: string,
	guildId: string,
	voice: string,
	rate: string,
	pitch: string
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO user_voices (user_id, guild_id, voice, rate, pitch)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id, guild_id)
       DO UPDATE SET voice = excluded.voice, rate = excluded.rate, pitch = excluded.pitch`
		)
		.bind(userId, guildId, voice, rate, pitch)
		.run();
}
