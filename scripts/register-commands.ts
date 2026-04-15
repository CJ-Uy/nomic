// One-time script to register Discord slash commands globally.
// Run with: DISCORD_TOKEN=xxx DISCORD_CLIENT_ID=xxx npx tsx scripts/register-commands.ts

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
	console.error('Set DISCORD_TOKEN and DISCORD_CLIENT_ID env vars');
	process.exit(1);
}

const commands = [
	{
		name: 'nomic',
		description: 'Nomic voice bot commands',
		options: [
			{
				name: 'join',
				description: 'Join your current voice channel',
				type: 1,
			},
			{
				name: 'leave',
				description: 'Leave the voice channel',
				type: 1,
			},
			{
				name: 'voice',
				description: 'Manage your TTS voice',
				type: 2,
				options: [
					{
						name: 'new',
						description: 'Get a random new voice',
						type: 1,
					},
					{
						name: 'set',
						description: 'Set a specific voice by name',
						type: 1,
						options: [
							{
								name: 'name',
								description: 'Voice name (use /nomic voice list to see options)',
								type: 3,
								required: true,
							},
						],
					},
					{
						name: 'preview',
						description: 'Show your current voice settings',
						type: 1,
					},
					{
						name: 'list',
						description: 'List all available voices',
						type: 1,
					},
					{
						name: 'tune',
						description: 'Adjust voice speed and pitch',
						type: 1,
						options: [
							{
								name: 'speed',
								description: 'Voice speed',
								type: 3,
								required: false,
								choices: [
									{ name: 'slow', value: 'slow' },
									{ name: 'normal', value: 'normal' },
									{ name: 'fast', value: 'fast' },
								],
							},
							{
								name: 'pitch',
								description: 'Voice pitch',
								type: 3,
								required: false,
								choices: [
									{ name: 'low', value: 'low' },
									{ name: 'normal', value: 'normal' },
									{ name: 'high', value: 'high' },
								],
							},
						],
					},
				],
			},
		],
	},
];

const res = await fetch(`https://discord.com/api/v10/applications/${clientId}/commands`, {
	method: 'PUT',
	headers: {
		Authorization: `Bot ${token}`,
		'Content-Type': 'application/json',
	},
	body: JSON.stringify(commands),
});

if (res.ok) {
	console.log('✅ Commands registered globally (may take up to 1 hour to propagate)');
} else {
	const body = await res.text();
	console.error('❌ Failed:', res.status, body);
	process.exit(1);
}
