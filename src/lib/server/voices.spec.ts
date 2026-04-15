import { describe, it, expect } from 'vitest';
import { VOICES, randomVoice, isValidVoice, SPEEDS, PITCHES } from './voices';

describe('voices', () => {
	it('VOICES has at least 20 entries', () => {
		expect(VOICES.length).toBeGreaterThanOrEqual(20);
	});

	it('randomVoice returns a valid voice', () => {
		const voice = randomVoice();
		expect(VOICES).toContain(voice);
	});

	it('randomVoice is not always the same', () => {
		const results = new Set(Array.from({ length: 50 }, () => randomVoice()));
		expect(results.size).toBeGreaterThan(1);
	});

	it('isValidVoice returns true for valid voice', () => {
		expect(isValidVoice('en-US-GuyNeural')).toBe(true);
	});

	it('isValidVoice returns false for invalid voice', () => {
		expect(isValidVoice('not-a-voice')).toBe(false);
	});

	it('SPEEDS has slow, normal, fast', () => {
		expect(SPEEDS).toHaveProperty('slow');
		expect(SPEEDS).toHaveProperty('normal');
		expect(SPEEDS).toHaveProperty('fast');
	});

	it('PITCHES has low, normal, high', () => {
		expect(PITCHES).toHaveProperty('low');
		expect(PITCHES).toHaveProperty('normal');
		expect(PITCHES).toHaveProperty('high');
	});
});
