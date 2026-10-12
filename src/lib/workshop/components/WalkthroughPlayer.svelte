<script lang="ts">
	/**
	 * Steps through a Mutant program beside its recorded output. Each step marks
	 * a range of program lines and reveals the golden lines they printed. Every
	 * line on screen comes from the mirrored files: the module only says which
	 * line numbers belong to which step.
	 */
	import type { ResolvedWalkthrough } from '../resolved';

	let { stage, onready }: { stage: ResolvedWalkthrough; onready: () => void } = $props();

	let index = $state(0);
	let codePane = $state<HTMLElement | undefined>(undefined);

	const step = $derived(stage.steps[index]);
	const last = $derived(index === stage.steps.length - 1);

	const inRange = (n: number, [from, to]: [number, number]) => n >= from && n <= to;

	/** Output lines revealed so far: every step up to this one. */
	const revealed = $derived(
		stage.goldenLines
			.map((text, i) => ({ text, n: i + 1 }))
			.filter(({ n }) => stage.steps.slice(0, index + 1).some((s) => inRange(n, s.output)))
	);

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
			<figcaption class="wt-caption">Recorded output</figcaption>
			<pre class="wt-code wt-out" aria-live="polite"><code
					>{#each revealed as line (line.n)}<span class="wt-line" data-on={inRange(line.n, step.output) ? '' : undefined}
							>{line.text || ' '}</span
						>{/each}</code
				></pre>
		</figure>
	</div>

	<p class="wt-note" aria-live="polite">
		<span class="wt-count">Step {index + 1} of {stage.steps.length} · lines {step.lines[0]}–{step.lines[1]}</span>
		{step.note}
	</p>

	<div class="cta-cluster">
		<button type="button" class="btn btn-ghost" onclick={() => (index -= 1)} disabled={index === 0}>Previous step</button>
		<button type="button" class="btn btn-secondary" onclick={() => (index += 1)} disabled={last}>Next step</button>
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
