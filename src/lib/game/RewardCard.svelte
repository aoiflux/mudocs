<!--
	The reward.

	Deliberately an in-overlay card and nothing else: no new route, no entry in
	`docs-manifest.ts`, no change to the corpus. The prize for finishing is the
	tally of what you actually did, plus links back into the real documentation
	the eight puzzles were drawn from.

	`attachTilt` and `rollCounter` come from `motion.ts` unmodified; both are
	reduced-motion aware there.
-->
<script lang="ts">
	import { attachTilt, rollCounter } from '$lib/artist/motion';
	import { PUZZLES, PUZZLE_COUNT } from './puzzles';
	import type { SaveV1 } from './persistence';

	let {
		save,
		onReplay,
		onClose
	}: { save: SaveV1; onReplay: () => void; onClose: () => void } = $props();

	type Attempt = { ms: number; hints: number; errors: number };

	const attempts = $derived(
		PUZZLES.map((puzzle) => save.best[puzzle.id]).filter((best): best is Attempt => best != null)
	);

	const totalMs = $derived(attempts.reduce((sum, best) => sum + best.ms, 0));
	const hints = $derived(attempts.reduce((sum, best) => sum + best.hints, 0));
	const errors = $derived(attempts.reduce((sum, best) => sum + best.errors, 0));

	/**
	 * One thousand points a puzzle, less what it cost: two minutes of thinking,
	 * a hint, or a rejected token. Never below a hundred — finishing counts.
	 */
	const score = $derived(
		attempts.reduce(
			(sum, best) =>
				sum + Math.max(100, 1000 - best.hints * 120 - best.errors * 60 - Math.floor(best.ms / 1000) * 4),
			0
		)
	);

	const minutes = $derived(Math.floor(totalMs / 60_000));
	const seconds = $derived(Math.floor((totalMs % 60_000) / 1000));

	let card = $state<HTMLDivElement | undefined>(undefined);
	let counter = $state<HTMLElement | undefined>(undefined);
	let dismiss = $state<HTMLButtonElement | undefined>(undefined);

	$effect(() => {
		const element = card;
		if (!element) return;
		return attachTilt(element, 9);
	});

	$effect(() => {
		const element = counter;
		const to = score;
		if (!element) return;
		return rollCounter(element, to, 900);
	});

	$effect(() => {
		dismiss?.focus();
	});
</script>

<div class="cb-reward">
	<div bind:this={card} class="cb-reward-card fx-tilt">
		<h2 class="cb-reward-title">signature resolved</h2>
		<p class="cb-reward-sub">
			Eight snippets reconstructed from the Mutant corpus. The registration mark in the footer is
			repaired — it will stay that way.
		</p>

		<dl class="cb-reward-stats">
			<div class="cb-stat">
				<dt>score</dt>
				<dd bind:this={counter}>{score}</dd>
			</div>
			<div class="cb-stat">
				<dt>solved</dt>
				<dd>{save.solved.length}/{PUZZLE_COUNT}</dd>
			</div>
			<div class="cb-stat">
				<dt>time</dt>
				<dd>{minutes}m {String(seconds).padStart(2, '0')}s</dd>
			</div>
			<div class="cb-stat">
				<dt>hints</dt>
				<dd>{hints}</dd>
			</div>
			<div class="cb-stat">
				<dt>rejected</dt>
				<dd>{errors}</dd>
			</div>
		</dl>

		<p class="cb-reward-sub">Everything you just assembled is documented here:</p>
		<div class="cb-reward-links">
			<a href="/docs/reference/mutant_language_reference">Language reference</a>
			<a href="/docs/reference/wasm_repl_reference">WASM REPL reference</a>
			<a href="/playground">Playground</a>
		</div>

		<div class="cb-actions" style="margin-top: 1.1rem;">
			<button type="button" class="cb-btn cb-btn-primary" onclick={onReplay}>replay</button>
			<button bind:this={dismiss} type="button" class="cb-btn" onclick={onClose}>close</button>
		</div>
	</div>
</div>
