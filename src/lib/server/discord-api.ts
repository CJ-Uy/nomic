const DISCORD_API = 'https://discord.com/api/v10';

export async function sendFollowup(
	token: string,
	appId: string,
	interactionToken: string,
	content: string
): Promise<void> {
	await fetch(`${DISCORD_API}/webhooks/${appId}/${interactionToken}/messages/@original`, {
		method: 'PATCH',
		headers: {
			Authorization: `Bot ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ content }),
	});
}

export async function getMemberVoiceState(
	token: string,
	guildId: string,
	userId: string
): Promise<{ channel_id: string | null } | null> {
	const res = await fetch(`${DISCORD_API}/guilds/${guildId}/voice-states/${userId}`, {
		headers: { Authorization: `Bot ${token}` },
	});
	if (!res.ok) return null;
	return res.json() as Promise<{ channel_id: string | null }>;
}
