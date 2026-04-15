<script lang="ts">
	const features = [
		{
			icon: '🎙️',
			title: 'Unique voice per person',
			desc: 'Every user gets their own randomly assigned TTS voice. No two people sound the same.',
		},
		{
			icon: '⚡',
			title: 'Instant & free',
			desc: 'Powered by Microsoft Edge TTS — no API keys, no limits, no cost.',
		},
		{
			icon: '🎛️',
			title: 'Customizable',
			desc: 'Change your voice, adjust speed and pitch, or pick from 30+ voices.',
		},
	];

	const commands = [
		{ cmd: '/nomic join', desc: 'Join your current voice channel' },
		{ cmd: '/nomic leave', desc: 'Leave the voice channel' },
		{ cmd: '/nomic voice new', desc: 'Get a new random voice' },
		{ cmd: '/nomic voice set [name]', desc: 'Set a specific voice' },
		{ cmd: '/nomic voice list', desc: 'See all available voices' },
		{ cmd: '/nomic voice preview', desc: 'Show your current voice settings' },
		{ cmd: '/nomic voice tune speed:[slow/normal/fast] pitch:[low/normal/high]', desc: 'Adjust speed and pitch' },
	];
</script>

<svelte:head>
	<title>Nomic — Give everyone a voice</title>
	<meta
		name="description"
		content="Nomic reads your Discord chat messages aloud in voice channels, giving everyone without a mic their own unique voice."
	/>
</svelte:head>

<main class="min-h-screen bg-gray-950 text-white flex flex-col">
	<!-- Nav -->
	<nav class="flex items-center justify-between px-6 py-4 border-b border-white/10">
		<span class="text-xl font-bold tracking-tight">nomic</span>
		<a
			href="/invite"
			class="bg-indigo-600 hover:bg-indigo-500 transition px-4 py-2 rounded-lg text-sm font-medium"
		>
			Add to Discord
		</a>
	</nav>

	<!-- Hero -->
	<section class="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
		<div
			class="bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1 text-indigo-400 text-sm font-medium"
		>
			Free · No account needed
		</div>
		<h1 class="text-5xl font-extrabold tracking-tight max-w-2xl leading-tight">
			Give everyone<br />
			<span class="text-indigo-400">a voice</span> in the call
		</h1>
		<p class="text-gray-400 text-lg max-w-lg">
			Nomic joins your Discord voice channel and reads typed messages aloud — each person gets their
			own unique random voice. Perfect for those without a mic.
		</p>
		<a
			href="/invite"
			class="mt-2 bg-indigo-600 hover:bg-indigo-500 transition px-8 py-3 rounded-xl text-base font-semibold"
		>
			Add Nomic to Discord
		</a>
	</section>

	<!-- Features -->
	<section class="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 pb-24 max-w-4xl mx-auto w-full">
		{#each features as f}
			<div class="bg-white/5 border border-white/10 rounded-2xl p-6">
				<div class="text-2xl mb-3">{f.icon}</div>
				<h3 class="font-semibold text-white mb-1">{f.title}</h3>
				<p class="text-gray-400 text-sm">{f.desc}</p>
			</div>
		{/each}
	</section>

	<!-- Commands -->
	<section class="pb-24 px-6 max-w-2xl mx-auto w-full">
		<h2 class="text-2xl font-bold mb-6 text-center">Commands</h2>
		<div class="flex flex-col gap-3">
			{#each commands as c}
				<div
					class="flex items-start gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-3"
				>
					<code class="text-indigo-400 font-mono text-sm whitespace-nowrap">{c.cmd}</code>
					<span class="text-gray-300 text-sm">{c.desc}</span>
				</div>
			{/each}
		</div>
	</section>

	<footer class="border-t border-white/10 py-6 text-center text-gray-500 text-sm">
		Nomic · Built on Cloudflare
	</footer>
</main>
