<script lang="ts">
	/**
	 * What a page that runs Mutant shows while the shared runtime loads: how far
	 * the load has got, a rotating tip, and a minigame to pass the time. Once
	 * the runtime is ready it says so; if the reader never touched the game it
	 * steps aside by itself, otherwise it waits to be dismissed so a round in
	 * progress is not pulled away.
	 */
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import { MUTANT_TAG, WASM_SIZE_LABEL } from '$lib/mutant-pin';
	import { prefersReducedMotion } from '$lib/artist/motion';
	import type { ReplSnapshot } from './host';
	import MagicBytes from './MagicBytes.svelte';

	let {
		repl,
		onretry,
		ondismiss
	}: { repl: ReplSnapshot; onretry: () => void; ondismiss: (byReader: boolean) => void } = $props();

	/** Each tip states what this site or its pinned build does; none is a claim about Mutant beyond the page's own text. */
	const TIPS = [
		'You can write code while this loads. Run unlocks the moment the runtime is ready.',
		`The runtime (${WASM_SIZE_LABEL}) downloads once. It stays loaded while this tab is open, and this browser keeps a copy for the next visit.`,
		'Each run gets five seconds. A program that runs longer is stopped, and the runtime restarts before the next run.',
		'Filesystem, network and process builtins are unavailable in the browser, by design.',
		'Stuck for ideas? The Builtin help example above the editor prints the builtin reference from the runtime.',
		`This is Mutant ${MUTANT_TAG}. The commit and the wasm checksum are printed above the editor.`,
		'Investigators trust a file’s first bytes, not its name. Renaming a .exe to .pdf does not change its "MZ".',
		'The Workshop covers timestomping, malware in ads and registry persistence, with films you can step through by arrow key.'
	];
	const TIP_MS = 8000;

	let tip = $state(Math.floor(Math.random() * TIPS.length));
	let played = $state(false);
	let reduced = $state(false);

	const megabytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;
	const fraction = $derived(
		repl.phase === 'downloading' && repl.total > 0 ? Math.min(1, repl.loaded / repl.total) : null
	);
	const title = $derived(
		repl.phase === 'ready'
			? 'The Mutant runtime is ready'
			: repl.phase === 'failed'
				? 'The Mutant runtime did not load'
				: repl.phase === 'starting'
					? 'Starting the Mutant runtime'
					: repl.cached
						? 'Loading the Mutant runtime from this browser'
						: 'Downloading the Mutant runtime'
	);
	const detail = $derived(
		repl.phase === 'ready'
			? 'Run is unlocked.'
			: repl.phase === 'failed'
				? `${repl.reason}.`
				: repl.phase === 'starting'
					? 'Compiling and booting it. This takes a few seconds.'
					: `${Math.round((fraction ?? 0) * 100)}% · ${megabytes(repl.loaded)} of ${WASM_SIZE_LABEL}`
	);

	$effect(() => {
		reduced = prefersReducedMotion();
	});

	$effect(() => {
		if (repl.phase === 'ready' || repl.phase === 'failed') return;
		const timer = setInterval(() => (tip = (tip + 1) % TIPS.length), TIP_MS);
		return () => clearInterval(timer);
	});

	$effect(() => {
		if (repl.phase === 'ready' && !played) ondismiss(false);
	});
</script>

<section class="rl" data-phase={repl.phase} aria-labelledby="rl-title">
	<div class="rl-status">
		{#if repl.phase === 'ready'}
			<span class="rl-done" aria-hidden="true">●</span>
		{:else if repl.phase === 'failed'}
			<span class="rl-done rl-fail" aria-hidden="true">⊘</span>
		{:else}
			<ProgressRing value={fraction} label={title} size={64} />
		{/if}
		<div class="rl-words">
			<h2 id="rl-title" class="rl-title" aria-live="polite">{title}</h2>
			<p class="rl-detail text-muted">{detail}</p>
			{#if repl.phase === 'downloading'}
				<div class="rl-bar" aria-hidden="true">
					<span style:width={`${(fraction ?? 0) * 100}%`}></span>
				</div>
			{/if}
		</div>
		<div class="rl-act">
			{#if repl.phase === 'ready'}
				<button type="button" class="btn btn-primary" onclick={() => ondismiss(true)}>Start coding</button>
			{:else if repl.phase === 'failed'}
				<button type="button" class="btn btn-secondary" onclick={onretry}>Try again</button>
			{/if}
		</div>
	</div>

	{#if repl.phase !== 'ready' && repl.phase !== 'failed'}
		<p class="rl-tip">
			<span class="rl-tip-label">Tip</span>
			{#key tip}
				<span class="rl-tip-text" class:is-fading={!reduced}>{TIPS[tip]}</span>
			{/key}
			<button
				type="button"
				class="btn btn-ghost btn-sm rl-tip-next"
				onclick={() => (tip = (tip + 1) % TIPS.length)}
			>
				Next tip
			</button>
		</p>
	{/if}

	<div class="rl-game">
		<MagicBytes onplay={() => (played = true)} />
	</div>
</section>

<style>
	.rl {
		display: grid;
		gap: var(--space-4);
		margin: var(--space-4) 0;
		padding: var(--space-4);
		border: 1px solid var(--color-divider);
		background: var(--color-surface);
		min-width: 0;
	}

	.rl-status {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		align-items: center;
	}

	.rl-words {
		flex: 1 1 16rem;
		min-width: 0;
	}

	.rl-title {
		margin: 0;
		font-size: 18px;
	}

	.rl-detail {
		margin: var(--space-1) 0 0;
		font-family: var(--font-mono);
		font-size: 13px;
	}

	.rl-bar {
		height: 4px;
		margin-top: var(--space-2);
		background: var(--color-divider);
	}

	.rl-bar span {
		display: block;
		height: 100%;
		background: var(--color-accent);
		transition: width var(--fx-dur-fast) var(--fx-ease-apple);
	}

	.rl-done {
		display: grid;
		place-items: center;
		width: 64px;
		height: 64px;
		font-size: 28px;
		color: var(--color-accent);
	}

	.rl-fail {
		color: inherit;
	}

	.rl-tip {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-3);
		align-items: baseline;
		margin: 0;
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-divider);
		font-size: 14px;
	}

	.rl-tip-label {
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-accent);
	}

	.rl-tip-text {
		flex: 1 1 20rem;
		min-height: 2.8em;
	}

	.rl-tip-text.is-fading {
		animation: rl-fade 0.5s ease-out;
	}

	@keyframes rl-fade {
		from {
			opacity: 0;
		}
	}

	.rl-game {
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-divider);
	}

	@media (prefers-reduced-motion: reduce) {
		.rl-bar span {
			transition: none;
		}
	}
</style>
