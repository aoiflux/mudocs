<script lang="ts">
	/**
	 * The workshop path map. Not yet linked from the navigation or the sitemap,
	 * and not indexed: the modules publish one by one as each clears the
	 * checks (every program and builtin traced to the pinned release).
	 */
	import { onMount } from 'svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { MUTANT_RELEASE_URL, MUTANT_TAG } from '$lib/mutant-pin';
	import {
		courseRewardEarned,
		emptyProgress,
		exportProgress,
		loadProgress,
		resetProgress,
		type ProgressV2
	} from '$lib/interactive/progress';
	import { PUZZLE_COUNT as COURSE_SECTIONS } from '$lib/game/puzzles';
	import { WORKSHOP_MODULES, type WorkshopModule } from '$lib/workshop/modules';

	let progress = $state<ProgressV2>(emptyProgress());
	let confirmingReset = $state(false);

	onMount(() => {
		progress = loadProgress();
	});

	function statusOf(module: WorkshopModule): string {
		if (module.id === 'language') {
			const { solved, skipped } = progress.course;
			if (courseRewardEarned(progress.course, COURSE_SECTIONS)) return 'Complete';
			if (solved.length === 0 && skipped.length === 0) return 'Not started';
			const skips = skipped.length > 0 ? ` · ${skipped.length} skipped` : '';
			return `${solved.length} of ${COURSE_SECTIONS} solved${skips}`;
		}
		const entry = progress.modules[module.id];
		const stages = Object.keys(entry?.stages ?? {}).length;
		const preview = module.status === 'available' ? '' : 'Preview · ';
		if (stages === 0) return `${preview}Not started`;
		const tiers = Object.values(entry?.tiers ?? {});
		const skips = Object.values(entry?.stages ?? {}).filter((s) => s === 'skipped').length;
		const finished = tiers.length > 0 ? ` · ${tiers.length} tier${tiers.length === 1 ? '' : 's'} finished` : '';
		return `${preview}${stages} stage${stages === 1 ? '' : 's'} settled${finished}${skips ? ` · ${skips} skipped` : ''}`;
	}

	function download(): void {
		const blob = new Blob([exportProgress()], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'mudocs-progress.json';
		link.click();
		URL.revokeObjectURL(url);
	}

	function reset(): void {
		resetProgress();
		progress = loadProgress();
		confirmingReset = false;
	}
</script>

<SeoHead
	title="Workshop"
	description="A hands-on path through Mutant for digital forensics: the language, then artefacts, timelines, browser and registry evidence."
	index={false}
/>

<section class="band" style="padding-top: var(--space-8);">
	<p class="eyebrow">Workshop · preview</p>
	<h1 class="big-title">Forensics with Mutant</h1>
	<p class="lede">
		A path from first program to a full case. Every program shown here is a file from
		<a href={MUTANT_RELEASE_URL}>Mutant {MUTANT_TAG}</a>. Output marked recorded is a real run of that file;
		output marked simulated shows what the program prints on the case evidence, for teaching. Modules marked
		preview are complete but not yet published.
	</p>
</section>

<section class="band" aria-labelledby="path-heading">
	<h2 id="path-heading" class="chapter-title">The path</h2>
	<ol class="ws-path">
		{#each WORKSHOP_MODULES as module (module.id)}
			<li class="ws-step" data-status={module.status}>
				<span class="ws-mark" aria-hidden="true">{module.mark}</span>
				<div class="ws-body">
					<h3 class="card-title">
						{#if module.href}
							<a href={module.href}>{module.title}</a>
						{:else}
							{module.title}
						{/if}
					</h3>
					<p class="card-body">{module.summary}</p>
					<p class="card-meta">
						<span>{statusOf(module)}</span>
						{#if module.minutes}<span aria-hidden="true">·</span><span>{module.minutes} min</span>{/if}
					</p>
				</div>
			</li>
		{/each}
	</ol>
</section>

<section class="band" aria-labelledby="progress-heading" style="border-bottom: 0;">
	<h2 id="progress-heading" class="chapter-title">Your progress</h2>
	<p class="text-muted">
		Progress is kept in this browser only and is never sent anywhere. The course here and the glyph in the
		footer share it.
	</p>
	<div class="cta-cluster">
		<button type="button" class="btn btn-secondary" onclick={download}>Download progress</button>
		{#if confirmingReset}
			<button type="button" class="btn btn-primary" onclick={reset}>Erase all progress</button>
			<button type="button" class="btn btn-ghost" onclick={() => (confirmingReset = false)}>Keep it</button>
		{:else}
			<button type="button" class="btn btn-ghost" onclick={() => (confirmingReset = true)}>Reset progress…</button>
		{/if}
	</div>
	{#if confirmingReset}
		<p class="text-muted" role="note">
			This erases every solved and skipped section and every module stage in this browser. Resetting is the
			only way to clear a skip and try for the course reward again.
		</p>
	{/if}
</section>

<style>
	.ws-path {
		list-style: none;
		margin: var(--space-4) 0 0;
		padding: 0;
		display: grid;
		gap: var(--space-3);
	}

	.ws-step {
		display: grid;
		grid-template-columns: 2.5rem 1fr;
		gap: var(--space-3);
		align-items: start;
		padding: var(--space-4);
		border: 1px solid var(--color-divider);
	}

	.ws-step[data-status='in-preparation'] {
		opacity: 0.72;
	}

	.ws-mark {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border: 1px solid var(--color-accent);
		font-family: var(--font-mono);
		font-size: 15px;
		color: var(--color-accent-700);
	}

	.ws-body {
		display: grid;
		gap: var(--space-2);
		min-width: 0;
	}
</style>
