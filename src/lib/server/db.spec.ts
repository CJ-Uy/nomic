import { describe, it, expect, vi } from 'vitest';
import { getVoice, upsertVoice } from './db';

const mockDB = {
	prepare: vi.fn().mockReturnThis(),
	bind: vi.fn().mockReturnThis(),
	first: vi.fn(),
	run: vi.fn(),
} as unknown as D1Database;

describe('db helpers', () => {
	it('getVoice returns null when no row found', async () => {
		(mockDB.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
			bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) }),
		});
		const result = await getVoice(mockDB, 'user1', 'guild1');
		expect(result).toBeNull();
	});

	it('getVoice returns row when found', async () => {
		const row = {
			user_id: 'u1',
			guild_id: 'g1',
			voice: 'en-US-GuyNeural',
			rate: '+0%',
			pitch: '+0Hz',
		};
		(mockDB.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
			bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(row) }),
		});
		const result = await getVoice(mockDB, 'u1', 'g1');
		expect(result).toEqual(row);
	});

	it('upsertVoice calls run', async () => {
		const runMock = vi.fn().mockResolvedValue({ success: true });
		(mockDB.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
			bind: vi.fn().mockReturnValue({ run: runMock }),
		});
		await upsertVoice(mockDB, 'u1', 'g1', 'en-GB-RyanNeural', '+0%', '+0Hz');
		expect(runMock).toHaveBeenCalled();
	});
});
