<script lang="ts">
	/**
	 * A concept scene with step controls. The scene reveals one part per step;
	 * the ordered list beside it says the same thing in text, so the stage reads
	 * fully without the drawing and with motion reduced.
	 */
	import type { ResolvedConcept } from '../resolved';
	import type { Component } from 'svelte';
	import RegistryTree from '../scenes/RegistryTree.svelte';
	import MftRecord from '../scenes/MftRecord.svelte';
	import RedirectChain from '../scenes/RedirectChain.svelte';
	import CookieJar from '../scenes/CookieJar.svelte';
	import CaseBoard from '../scenes/CaseBoard.svelte';
	import RecordModel from '../scenes/RecordModel.svelte';
	import CidrBlock from '../scenes/CidrBlock.svelte';
	import type { SceneName } from '../scenes/data';

	type SceneProps = { data: never; shown: ReadonlySet<string>; focus: string };
	/** The loader has checked sceneData against SCENE_DATA[scene], so each scene gets its own shape. */
	const SCENES: Record<SceneName, Component<SceneProps>> = {
		RegistryTree,
		MftRecord,
		RedirectChain,
		CookieJar,
		CaseBoard,
		RecordModel,
		CidrBlock
	} as unknown as Record<SceneName, Component<SceneProps>>;

	let { stage, onready }: { stage: ResolvedConcept; onready: () => void } = $props();

	let index = $state(0);
	const last = $derived(index === stage.steps.length - 1);
	const shown = $derived(new Set(stage.steps.slice(0, index + 1).map((s) => s.focus)));
	const focus = $derived(stage.steps[index].focus);
	const Scene = $derived(SCENES[stage.scene]);

	$effect(() => {
		if (last) onready();
	});
</script>

<div class="cs">
	<p class="cs-intro">{stage.intro}</p>

	<div class="cs-body">
		<div class="cs-scene">
			<Scene data={stage.sceneData as never} {shown} {focus} />
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
				<li>
					{#if source.kind === 'external-spec' && source.ref.startsWith('https://')}
						<a href={source.ref}>{source.ref}</a>
					{:else}
						<code>{source.ref}</code>
					{/if}{source.note ? ` · ${source.note}` : ''}
				</li>
			{/each}
		</ul>
		{#if stage.reviewedBy}
			<p>Checked against its sources by {stage.reviewedBy}, {stage.reviewedAt}.</p>
		{:else}
			<p>Not yet checked against its sources.</p>
		{/if}
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
