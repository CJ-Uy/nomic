import { describe, it, expect } from 'vitest';
import { verifyDiscordRequest } from './discord-verify';

describe('verifyDiscordRequest', () => {
	it('returns false for missing headers', async () => {
		const req = new Request('https://example.com', { method: 'POST', body: '{}' });
		const result = await verifyDiscordRequest(req, 'deadbeef'.repeat(8));
		expect(result).toBe(false);
	});

	it('returns false for invalid signature', async () => {
		const req = new Request('https://example.com', {
			method: 'POST',
			body: '{"type":1}',
			headers: {
				'x-signature-ed25519': 'a'.repeat(128),
				'x-signature-timestamp': '1234567890',
			},
		});
		const result = await verifyDiscordRequest(req, 'deadbeef'.repeat(8));
		expect(result).toBe(false);
	});
});
