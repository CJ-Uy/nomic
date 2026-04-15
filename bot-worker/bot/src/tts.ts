import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import type { Readable } from 'stream';

export interface VoiceConfig {
	voice: string;
	rate: string;
	pitch: string;
}

export async function synthesize(text: string, config: VoiceConfig): Promise<Readable> {
	const tts = new MsEdgeTTS();
	await tts.setMetadata(config.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

	const escaped = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

	const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
    <voice name='${config.voice}'>
      <prosody rate='${config.rate}' pitch='${config.pitch}'>
        ${escaped}
      </prosody>
    </voice>
  </speak>`;

	return tts.toStream(ssml);
}
