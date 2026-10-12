<script lang="ts">
	/**
	 * A concept scene with step controls. The scene reveals one part per step;
	 * the ordered list beside it says the same thing in text, so the stage reads
	 * fully without the drawing and with motion reduced.
	 */
	import type { ResolvedConcept } from '../resolved';
	import type { HiveModel } from '../scenes/data';
	import RegistryTree from '../scenes/RegistryTree.svelte';

	let { stage, onready }: { stage: ResolvedConcept; onready: () => void } = $props();

	let index = $state(0);
	const last = $derived(index === stage.steps.length - 1);
	const shown = $derived(new Set(stage.steps.slice(0, index + 1).map((s) => s.focus)));
	const focus = $derived(stage.steps[index].focus);

	$effect(() => {
		if (last) onready();
	});
</script>

<div class="cs">
	<p class="cs-intro">{stage.intro}</p>

	<div class="cs-body">
		<div class="cs-scene">
			{#if stage.scene === 'RegistryTree'}
				<RegistryTree data={stage.sceneData as HiveModel} {shown} {focus} />
			{/if}
		</div>

		<ol class="cs-steps">
			{#each stage.steps as step, i (i)}
				<li data-state={i === index ? 'current' : i < index ? 'seen' : 'next'} aria-current={i === index ? 'step' : undefined}>
					<strong>{step.label}.</strong>
					{#if i <= index}{step.text}{/if}
				</li>
			{/each}
		</ol>
	</div>

	<div class="cta-cluster">
		<button type="button" class="btn btn-ghost" onclick={() => (index -= 1)} disabled={index === 0}>Previous</button>
		<button type="button" class="btn btn-secondary" onclick={() => (index += 1)} disabled={last}>Next</button>
	</div>

	<details class="cs-sources">
		<summary>Where this comes from</summary>
		<ul>
			{#each stage.sources as source, i (i)}
				<li><code>{source.ref}</code>{source.note ? ` · ${source.note}` : ''}</li>
			{/each}
		</ul>
		{#if stage.reviewedBy}<p>Checked against its sources by {stage.reviewedBy}, {stage.reviewedAt}.</p>{/if}
	</details>
</div>

<style>
	.cs {
		display: grid;
		gap: var(--space-4);
	}

	.cs-intro {
		margin: 0;
		max-width: 70ch;
	}

	.cs-body {
		display: grid;
		gap: var(--space-4);
	}

	@media (min-width: 900px) {
		.cs-body {
			grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
			align-items: start;
		}
	}

	.cs-scene {
		min-width: 0;
	}

	.cs-steps {
		margin: 0;
		padding-left: 1.4em;
		display: grid;
		gap: var(--space-2);
	}

	.cs-steps li[data-state='next'] {
		opacity: 0.55;
	}

	.cs-steps li[data-state='current'] {
		color: var(--color-accent-700);
	}

	.cs-sources {
		font-size: 13px;
	}
</style>
