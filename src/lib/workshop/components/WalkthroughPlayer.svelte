<script lang="ts">
	/**
	 * Steps through a Mutant program beside its output. Each step marks a range
	 * of program lines and reveals the output lines they printed. The output is
	 * the program's golden when Mutant recorded one, and otherwise a simulation
	 * written into the module, labelled as such. On the last step, Run replays
	 * the whole output line by line: an animation, not an execution.
	 */
	import { onDestroy } from 'svelte';
	import type { ResolvedWalkthrough } from '../resolved';
	import { MUTANT_TAG } from '$lib/mutant-pin';
	import { prefersReducedMotion } from '$lib/artist/motion';

	let { stage, onready }: { stage: ResolvedWalkthrough; onready: () => void } = $props();

	let index = $state(0);
	let codePane = $state<HTMLElement | undefined>(undefined);

	const step = $derived(stage.steps[index]);
	const last = $derived(index === stage.steps.length - 1);

	const inRange = (n: number, range: [number, number] | undefined) => !!range && n >= range[0] && n <= range[1];

	const recorded = $derived(!!stage.golden);

	/** While a replay runs, how many output lines it has printed; null otherwise. */
	let played = $state<number | null>(null);
	let timer: ReturnType<typeof setInterval> | undefined;

	function stop() {
		clearInterval(timer);
		timer = undefined;
	}

	function run() {
		stop();
		if (prefersReducedMotion()) {
			played = stage.outputLines.length;
			return;
		}
		played = 0;
		timer = setInterval(() => {
			played = (played ?? 0) + 1;
			if (played >= stage.outputLines.length) stop();
		}, 140);
	}

	function go(to: number) {
		stop();
		played = null;
		index = to;
	}

	onDestroy(stop);

	/** Output lines on screen: a replay's progress, or every step's lines up to this one. */
	const revealed = $derived(
		stage.outputLines
			.map((text, i) => ({ text, n: i + 1 }))
			.filter(({ n }) => (played === null ? stage.steps.slice(0, index + 1).some((s) => inRange(n, s.output)) : n <= played))
	);
	const running = $derived(played !== null && played < stage.outputLines.length);

	$effect(() => {
		if (last) onready();
	});

	$effect(() => {
		// Keep the marked lines in view inside the code pane, without scrolling the page.
		const first = codePane?.querySelector<HTMLElement>(`[data-line="${step.lines[0]}"]`);
		if (!codePane || !first) return;
		const top = first.offsetTop - codePane.clientHeight / 3;
		codePane.scrollTo({ top: Math.max(top, 0), behavior: 'auto' });
	});
</script>

<div class="wt">
	<div class="wt-panes">
		<figure class="wt-pane">
			<figcaption class="wt-caption">
				<a href={stage.programUrl}>{stage.program}</a>
			</figcaption>
			<pre class="wt-code" bind:this={codePane}><code
					>{#each stage.programLines as html, i (i)}<span
							class="wt-line"
							data-line={i + 1}
							data-on={inRange(i + 1, step.lines) ? '' : undefined}
							><span class="wt-ln" aria-hidden="true">{i + 1}</span>{@html html || ' '}</span
						>{/each}</code
				></pre>
		</figure>

		<figure class="wt-pane">
			<figcaption class="wt-caption">
				{#if recorded}
					Output · recorded at Mutant {MUTANT_TAG}
				{:else}
					Output <span class="wt-sim">simulated</span>
				{/if}
			</figcaption>
			<pre class="wt-code wt-out" aria-live="polite"><code
					>{#each revealed as line (line.n)}<span
							class="wt-line"
							data-on={(played === null ? inRange(line.n, step.output) : line.n === played) ? '' : undefined}
							>{line.text || ' '}</span
						>{/each}</code
				></pre>
			{#if !recorded}
				<p class="wt-sim-note">
					What this program prints on the case evidence, written out for teaching. Generate the evidence and run it
					to see your own.
				</p>
			{/if}
		</figure>
	</div>

	<p class="wt-note" aria-live="polite">
		<span class="wt-count">Step {index + 1} of {stage.steps.length} · lines {step.lines[0]}–{step.lines[1]}</span>
		{step.note}
	</p>

	<div class="cta-cluster">
		<button type="button" class="btn btn-ghost" onclick={() => go(index - 1)} disabled={index === 0}>Previous step</button>
		<button type="button" class="btn btn-secondary" onclick={() => go(index + 1)} disabled={last}>Next step</button>
		{#if last}
			<button type="button" class="btn btn-ghost" onclick={run} disabled={running}>
				{played === null ? 'Run' : 'Run again'}
			</button>
		{/if}
	</div>
</div>

<style>
	.wt {
		display: grid;
		gap: var(--space-4);
	}

	.wt-panes {
		display: grid;
		gap: var(--space-4);
		grid-template-columns: minmax(0, 1fr);
	}

	@media (min-width: 900px) {
		.wt-panes {
			grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		}
	}

	.wt-pane {
		margin: 0;
		min-width: 0;
		display: grid;
		gap: var(--space-2);
		align-content: start;
	}

	.wt-caption {
		font-family: var(--font-mono);
		font-size: 12px;
	}

	.wt-code {
		margin: 0;
		max-height: 24rem;
		overflow: auto;
		padding: var(--space-3) 0;
		background: var(--code-bg);
		color: var(--code-ink);
		font-family: var(--font-mono);
		font-size: 13px;
		line-height: 1.6;
		position: relative;
	}

	.wt-line {
		display: block;
		padding: 0 var(--space-4) 0 var(--space-2);
		border-left: 3px solid transparent;
		white-space: pre;
		opacity: 0.55;
		transition: opacity var(--fx-dur-fast) var(--fx-ease-apple);
	}

	.wt-line[data-on] {
		opacity: 1;
		border-left-color: var(--color-accent-400);
		background: color-mix(in srgb, var(--color-accent-400) 14%, transparent);
	}

	.wt-out .wt-line[data-on] {
		animation: wt-reveal var(--fx-dur-fast) var(--fx-ease-apple);
	}

	.wt-ln {
		display: inline-block;
		width: 2.5em;
		margin-right: var(--space-3);
		text-align: right;
		opacity: 0.6;
		user-select: none;
	}

	.wt-note {
		margin: 0;
		max-width: 70ch;
	}

	.wt-sim {
		margin-left: var(--space-2);
		padding: 0 var(--space-2);
		border: 1px dashed currentColor;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.wt-sim-note {
		margin: 0;
		font-size: 13px;
		opacity: 0.8;
	}

	.wt-count {
		display: block;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--color-accent-700);
	}

	@keyframes wt-reveal {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.wt-line {
			transition: none;
		}
		.wt-out .wt-line[data-on] {
			animation: none;
		}
	}
</style>
