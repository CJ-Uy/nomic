import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ platform }) => {
	const clientId = platform?.env.DISCORD_CLIENT_ID ?? '';
	const perms = '3145728'; // Connect (1048576) + Speak (2097152)
	const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${perms}&scope=bot+applications.commands`;
	throw redirect(302, url);
};
