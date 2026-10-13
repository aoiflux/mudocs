<script lang="ts">
	/**
	 * A minigame for the runtime's loading time: name the file format from its
	 * first bytes. Keys 1–4 answer and Enter moves on, but only while focus is
	 * inside the game, so typing in the editor never plays it.
	 */
	import { SIGNATURES, type Signature } from './magic-bytes';

	let { onplay }: { onplay?: () => void } = $props();

	type Round = { answer: Signature; choices: Signature[] };

	const CHOICES = 4;

	function shuffle<T>(items: T[]): T[] {
		const out = [...items];
		for (let i = out.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[out[i], out[j]] = [out[j], out[i]];
		}
		return out;
	}

	function makeRound(previous: Signature | null): Round {
		const pool = SIGNATURES.filter((s) => s.id !== previous?.id);
		const answer = pool[Math.floor(Math.random() * pool.length)];
		const others = shuffle(SIGNATURES.filter((s) => s.id !== answer.id)).slice(0, CHOICES - 1);
		return { answer, choices: shuffle([answer, ...others]) };
	}

	// Raw state: a round is replaced whole, never edited, and its entries are
	// compared by id, so no deep proxy is wanted.
	let round = $state.raw<Round>(makeRound(null));
	let picked = $state<string | null>(null);
	let score = $state(0);
	let played = $state(0);
	let streak = $state(0);
	let best = $state(0);
	let nextButton: HTMLButtonElement | undefined = $state();

	const hex = $derived(round.answer.bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')));
	const text = $derived(
		round.answer.bytes.map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('')
	);
	const right = $derived(picked === round.answer.id);

	function choose(choice: Signature): void {
		if (picked) return;
		picked = choice.id;
		played += 1;
		if (choice.id === round.answer.id) {
			score += 1;
			streak += 1;
			best = Math.max(best, streak);
		} else {
			streak = 0;
		}
		onplay?.();
		queueMicrotask(() => nextButton?.focus());
	}

	function next(): void {
		round = makeRound(round.answer);
		picked = null;
	}

	function onKey(event: KeyboardEvent): void {
		if (event.ctrlKey || event.metaKey || event.altKey) return;
		const n = Number(event.key);
		if (!picked && n >= 1 && n <= round.choices.length) {
			event.preventDefault();
			choose(round.choices[n - 1]);
		} else if (picked && (event.key === 'n' || event.key === 'N')) {
			event.preventDefault();
			next();
		}
	}
</script>

<!-- Keys reach this handler from the game's own buttons, which hold focus. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section class="mb" aria-labelledby="mb-title" onkeydown={onKey}>
	<header class="mb-head">
		<h3 id="mb-title" class="mb-title">Name that file</h3>
		<p class="mb-score" aria-live="polite">
			{score} of {played}{#if best > 1}<span class="text-muted">{` · best streak ${best}`}</span>{/if}
		</p>
	</header>
	<p class="mb-ask text-muted">A file starts with these bytes. What is it?</p>

	<div class="mb-dump" aria-label={`Bytes: ${hex.join(' ')}`} role="img">
		<span class="mb-off">00000000</span>
		<span class="mb-hex">{hex.join(' ')}</span>
		<span class="mb-txt">{text}</span>
	</div>

	<ol class="mb-choices">
		{#each round.choices as choice, i (choice.id)}
			<li>
				<button
					type="button"
					class="mb-choice"
					data-state={!picked
						? undefined
						: choice.id === round.answer.id
							? 'right'
							: choice.id === picked
								? 'wrong'
								: 'other'}
					disabled={picked !== null}
					onclick={() => choose(choice)}
				>
					<kbd>{i + 1}</kbd>
					{choice.label}
				</button>
			</li>
		{/each}
	</ol>

	{#if picked}
		<div class="mb-result" role="status">
			<p>
				<strong>{right ? 'Right.' : `No: ${round.answer.label}.`}</strong>
				{round.answer.fact}
			</p>
			<button type="button" class="btn btn-secondary btn-sm" bind:this={nextButton} onclick={next}>
				Next file <span aria-hidden="true">▸</span>
			</button>
		</div>
	{/if}
</section>

<style>
	.mb {
		display: grid;
		gap: var(--space-3);
		min-width: 0;
	}

	.mb-head {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: baseline;
		justify-content: space-between;
	}

	.mb-title,
	.mb-score,
	.mb-ask {
		margin: 0;
	}

	.mb-title {
		font-size: 15px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.mb-score {
		font-family: var(--font-mono);
		font-size: 13px;
	}

	.mb-ask {
		font-size: 13px;
	}

	.mb-dump {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4em 1.4em;
		padding: var(--space-3);
		overflow-x: auto;
		font-family: var(--font-mono);
		font-size: 15px;
		background: #030812;
		color: #e8f3ff;
		border: 1px solid #10243f;
	}

	.mb-off {
		color: #6f8db0;
	}

	.mb-hex {
		color: #3fd0ff;
		letter-spacing: 0.04em;
	}

	.mb-txt {
		color: #ff9f43;
		white-space: pre;
	}

	.mb-choices {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.mb-choice {
		display: flex;
		gap: 0.6em;
		align-items: center;
		width: 100%;
		min-height: 44px;
		padding: 0.5em 0.75em;
		text-align: left;
		font: inherit;
		font-size: 14px;
		color: inherit;
		background: transparent;
		border: 1px solid var(--color-divider);
		cursor: pointer;
	}

	.mb-choice:hover:not(:disabled) {
		border-color: var(--color-accent);
	}

	.mb-choice:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.mb-choice:disabled {
		cursor: default;
	}

	.mb-choice[data-state='right'] {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 18%, transparent);
	}

	.mb-choice[data-state='wrong'] {
		border-style: dashed;
		text-decoration: line-through;
	}

	.mb-choice[data-state='other'] {
		opacity: 0.55;
	}

	.mb-choice kbd {
		flex: none;
		min-width: 1.6em;
		font-family: var(--font-mono);
		font-size: 12px;
		text-align: center;
		border: 1px solid var(--color-divider);
	}

	.mb-result {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		align-items: center;
		justify-content: space-between;
	}

	.mb-result p {
		flex: 1 1 24rem;
		margin: 0;
		font-size: 14px;
	}
</style>
