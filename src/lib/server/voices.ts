export const VOICES = [
	'en-US-AndrewNeural',
	'en-US-AriaNeural',
	'en-US-AvaNeural',
	'en-US-BrianNeural',
	'en-US-ChristopherNeural',
	'en-US-EmmaNeural',
	'en-US-EricNeural',
	'en-US-GuyNeural',
	'en-US-JennyNeural',
	'en-US-MichelleNeural',
	'en-US-MonicaNeural',
	'en-US-RogerNeural',
	'en-US-SteffanNeural',
	'en-GB-LibbyNeural',
	'en-GB-MaisieNeural',
	'en-GB-RyanNeural',
	'en-GB-SoniaNeural',
	'en-GB-ThomasNeural',
	'en-AU-NatashaNeural',
	'en-AU-WilliamNeural',
	'en-CA-ClaraNeural',
	'en-CA-LiamNeural',
	'en-IE-ConnorNeural',
	'en-IE-EmilyNeural',
	'en-IN-NeerjaNeural',
	'en-IN-PrabhatNeural',
	'en-NZ-MitchellNeural',
	'en-NZ-MollyNeural',
	'en-SG-LunaNeural',
	'en-SG-WayneNeural',
] as const;

export type Voice = (typeof VOICES)[number];

export const SPEEDS: Record<string, string> = {
	slow: '-30%',
	normal: '+0%',
	fast: '+30%',
};

export const PITCHES: Record<string, string> = {
	low: '-10Hz',
	normal: '+0Hz',
	high: '+10Hz',
};

export function randomVoice(): Voice {
	return VOICES[Math.floor(Math.random() * VOICES.length)];
}

export function isValidVoice(name: string): name is Voice {
	return (VOICES as readonly string[]).includes(name);
}
