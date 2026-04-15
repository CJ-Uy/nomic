function hexToUint8Array(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	}
	return bytes;
}

export async function verifyDiscordRequest(
	request: Request,
	publicKey: string
): Promise<boolean> {
	const signature = request.headers.get('x-signature-ed25519');
	const timestamp = request.headers.get('x-signature-timestamp');

	if (!signature || !timestamp) return false;

	try {
		const body = await request.text();
		const key = await crypto.subtle.importKey(
			'raw',
			hexToUint8Array(publicKey),
			{ name: 'Ed25519', namedCurve: 'Ed25519' },
			false,
			['verify']
		);
		const encoder = new TextEncoder();
		return crypto.subtle.verify(
			'Ed25519',
			key,
			hexToUint8Array(signature),
			encoder.encode(timestamp + body)
		);
	} catch {
		return false;
	}
}
