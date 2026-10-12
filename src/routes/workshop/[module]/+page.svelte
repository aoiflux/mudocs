<script lang="ts">
	/**
	 * One workshop module: its tiers and stages in order. Stages open one at a
	 * time ($lib/workshop/machine); finishing or skipping one is written to the
	 * shared progress store, so the path map and a later visit see it.
	 */
	import { onMount, tick } from 'svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { REPO } from '$lib/site';
	import { MUTANT_RELEASE_URL, MUTANT_TAG } from '$lib/mutant-pin';
	import { loadProgress, updateProgress, type StepState } from '$lib/interactive/progress';
	import { settleStage, stageKey, stageStatuses, tierState } from '$lib/workshop/machine';
	import { WORKSHOP_MODULES } from '$lib/workshop/modules';
	import type { ResolvedStage } from '$lib/workshop/resolved';
	import ConceptStage from '$lib/workshop/components/ConceptStage.svelte';
	import WalkthroughPlayer from '$lib/workshop/components/WalkthroughPlayer.svelte';
	import CheckStage from '$lib/workshop/components/CheckStage.svelte';
	import PipelineBuilder from '$lib/workshop/components/PipelineBuilder.svelte';
	import ResourcesBlock from '$lib/workshop/components/ResourcesBlock.svelte';

	let { data } = $props();
	const module = $derived(data.module);
	const entry = $derived(WORKSHOP_MODULES.find((m) => m.id === module.id));
	const published = $derived(entry?.status === 'available');

	let recorded = $state<Record<string, StepState>>({});
	let ready = $state<Record<string, boolean>>({});
	let confirmingSkip = $state<string | null>(null);

	onMount(() => {
		recorded = loadProgress().modules[module.id]?.stages ?? {};
	});

	const statuses = $derived(stageStatuses(module.tiers, recorded));

	/** Stages that need work before Continue: the rest are read and passed. */
	const INTERACTIVE = new Set<ResolvedStage['kind']>(['concept', 'walkthrough', 'build', 'check']);

	const program = $derived(module.tiers.flatMap((t) => t.stages).find((s) => s.kind === 'walkthrough')?.program);
	const folderUrl = $derived(program ? `${REPO.treeBase}/${program.slice(0, program.lastIndexOf('/'))}` : undefined);

	async function settle(key: string, state: StepState): Promise<void> {
		const next = updateProgress((progress) => ({
			...progress,
			modules: { ...progress.modules, [module.id]: settleStage(progress.modules[module.id], module.tiers, key, state) }
		}));
		recorded = next.modules[module.id]?.stages ?? {};
		confirmingSkip = null;
		await tick();
		// Move to the stage that just opened, if there is one.
		const active = [...statuses].find(([, status]) => status === 'active')?.[0];
		if (active) document.getElementById(`stage-${active.replace('/', '-')}`)?.focus();
	}

	function markReady(key: string): void {
		if (!ready[key]) ready = { ...ready, [key]: true };
	}

	const LABEL: Record<string, string> = { done: 'Done', skipped: 'Skipped', active: 'Current', locked: 'Locked' };
</script>

<SeoHead title={module.title} description={module.lede} index={false} />

<section class="band" style="padding-top: var(--space-8);">
	<p class="eyebrow"><a href="/workshop">Workshop</a> · {entry?.mark ?? ''}</p>
	<h1 class="big-title">{module.title}</h1>
	<p class="lede">{module.lede}</p>
	<p class="text-muted">
		Written for <a href={MUTANT_RELEASE_URL}>Mutant {MUTANT_TAG}</a>. Every program and output on this page is
		that release’s own file.
	</p>
	{#if !published}
		<p class="wm-preview" role="note">
			Preview. This module is not published yet: it opens once every builtin it uses has cleared review at
			the pinned release.
		</p>
	{/if}
</section>

{#each module.tiers as tier (tier.id)}
	{@const settled = tierState(tier, recorded)}
	<section class="band" aria-labelledby={`tier-${tier.id}`}>
		<p class="eyebrow">{tier.id}{settled ? ` · ${settled === 'done' ? 'complete' : 'finished with skips'}` : ''}</p>
		<h2 id={`tier-${tier.id}`} class="chapter-title">{tier.title}</h2>
		<p class="text-muted">{tier.summary}</p>

		<ol class="wm-stages">
			{#each tier.stages as stage (stage.id)}
				{@const key = stageKey(tier.id, stage.id)}
				{@const status = statuses.get(key) ?? 'locked'}
				<li class="wm-stage" data-status={status}>
					<header class="wm-head">
						<h3 class="card-title" id={`stage-${tier.id}-${stage.id}`} tabindex="-1">{stage.title}</h3>
						<span class="wm-status">{LABEL[status]}</span>
					</header>

					{#if status === 'locked'}
						<p class="text-muted wm-locked">Finish or skip the stage above to open this one.</p>
					{:else}
						{#if stage.kind === 'hook'}
							{#each stage.paragraphs as paragraph, i (i)}<p class="wm-prose">{paragraph}</p>{/each}
						{:else if stage.kind === 'concept'}
							<ConceptStage {stage} onready={() => markReady(key)} />
						{:else if stage.kind === 'walkthrough'}
							<WalkthroughPlayer {stage} onready={() => markReady(key)} />
						{:else if stage.kind === 'build'}
							<PipelineBuilder {stage} onready={() => markReady(key)} />
						{:else if stage.kind === 'check'}
							<CheckStage {stage} onready={() => markReady(key)} />
						{:else if stage.kind === 'takeaways'}
							<ul class="wm-prose">
								{#each stage.points as point, i (i)}<li>{point}</li>{/each}
							</ul>
						{:else if stage.kind === 'resources'}
							<ResourcesBlock {stage} {folderUrl} />
						{/if}

						{#if status === 'active'}
							{@const needsWork = INTERACTIVE.has(stage.kind) && !ready[key]}
							<div class="cta-cluster wm-controls">
								<button type="button" class="btn btn-primary" disabled={needsWork} onclick={() => settle(key, 'done')}>
									Continue
								</button>
								{#if INTERACTIVE.has(stage.kind)}
									{#if confirmingSkip === key}
										<button type="button" class="btn btn-ghost" onclick={() => settle(key, 'skipped')}>
											Skip · this tier will not count as complete
										</button>
										<button type="button" class="btn btn-ghost" onclick={() => (confirmingSkip = null)}>Keep going</button>
									{:else}
										<button type="button" class="btn btn-ghost" onclick={() => (confirmingSkip = key)}>Skip stage</button>
									{/if}
								{/if}
							</div>
							{#if needsWork}
								<p class="text-muted wm-hint">
									{stage.kind === 'check'
										? 'Answer every question correctly to continue.'
										: stage.kind === 'build'
											? 'Put the steps in the right order to continue.'
											: 'Step through to the end to continue.'}
								</p>
							{/if}
						{/if}
					{/if}
				</li>
			{/each}
		</ol>
	</section>
{/each}

{#if data.relatedDocs.length > 0}
	<section class="band" aria-labelledby="related-heading" style="border-bottom: 0;">
		<h2 id="related-heading" class="chapter-title">Read further</h2>
		<ul>
			{#each data.relatedDocs as doc (doc.href)}<li><a href={doc.href}>{doc.title}</a></li>{/each}
		</ul>
	</section>
{/if}

<style>
	.wm-preview {
		padding: var(--space-3) var(--space-4);
		border-left: 3px solid var(--color-accent);
		background: var(--quote-bg);
		max-width: 70ch;
	}

	.wm-stages {
		list-style: none;
		margin: var(--space-4) 0 0;
		padding: 0;
		display: grid;
		gap: var(--space-4);
	}

	.wm-stage {
		display: grid;
		gap: var(--space-4);
		padding: var(--space-4);
		border: 1px solid var(--color-divider);
		min-width: 0;
	}

	.wm-stage[data-status='active'] {
		border-color: var(--color-accent);
	}

	.wm-stage[data-status='locked'] {
		opacity: 0.6;
	}

	.wm-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--space-3);
	}

	.wm-head h3:focus {
		outline: none;
	}

	.wm-head h3:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.wm-status {
		font-size: 12px;
		white-space: nowrap;
	}

	.wm-stage[data-status='done'] .wm-status {
		color: var(--color-accent-700);
	}

	.wm-stage[data-status='skipped'] .wm-status {
		font-style: italic;
	}

	.wm-locked,
	.wm-hint {
		margin: 0;
	}

	.wm-prose {
		margin: 0;
		max-width: 70ch;
	}

	ul.wm-prose {
		display: grid;
		gap: var(--space-2);
	}
</style>
