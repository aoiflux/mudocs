<script lang="ts">
	/**
	 * Workshop › Intro to the language: the Codebreaker course, promoted.
	 *
	 * The course itself is the same overlay the footer glyph opens, loaded on
	 * the first click, and both read and write the one progress store
	 * (`$lib/interactive/progress`). This page lists the sections and where the
	 * learner stands in them.
	 */
	import { onMount, type Component } from 'svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { courseRewardEarned, emptyProgress, loadProgress, type CourseProgress } from '$lib/interactive/progress';
	import { PUZZLES, PUZZLE_COUNT } from '$lib/game/puzzles';
	import { MUTANT_TAG } from '$lib/mutant-pin';

	let course = $state<CourseProgress>(emptyProgress().course);
	let Overlay = $state<Component<{ onClose: () => void }> | null>(null);
	let loading = $state(false);
	let failed = $state(false);
	let trigger = $state<HTMLButtonElement | undefined>(undefined);

	onMount(() => {
		course = loadProgress().course;
	});

	const earned = $derived(courseRewardEarned(course, PUZZLE_COUNT));
	const begun = $derived(course.solved.length > 0 || course.skipped.length > 0);

	function stateOf(id: string): 'solved' | 'skipped' | 'open' {
		// A section solved after a skip shows as solved; the skip still counts against the reward.
		if (course.solved.includes(id)) return 'solved';
		if (course.skipped.includes(id)) return 'skipped';
		return 'open';
	}

	async function open(): Promise<void> {
		if (Overlay || loading) return;
		loading = true;
		failed = false;
		try {
			Overlay = (await import('$lib/game/CodebreakerOverlay.svelte')).default;
		} catch {
			failed = true;
		}
		loading = false;
	}

	function close(): void {
		Overlay = null;
		course = loadProgress().course;
		trigger?.focus();
	}
</script>

<SeoHead
	title="Intro to the language"
	description="Learn Mutant's syntax in eight short drag-and-drop sections: bindings, errors, closures, loops, higher-order functions, control flow, structs and macros."
	index={false}
/>

<section class="band" style="padding-top: var(--space-8);">
	<p class="eyebrow"><a href="/workshop">Workshop</a> · L</p>
	<h1 class="big-title">Intro to the language</h1>
	<p class="lede">
		Eight sections, each one short Mutant program with pieces missing. Put the tokens back in order; the
		checker explains every rejection. Written for Mutant {MUTANT_TAG}.
	</p>

	<div class="cta-cluster">
		<button bind:this={trigger} type="button" class="btn btn-primary" onclick={open} disabled={loading}>
			{loading ? 'Loading…' : begun ? 'Resume the course' : 'Start the course'}
		</button>
	</div>
	{#if failed}
		<p class="text-muted" role="alert">The course could not be loaded. Check your connection and try again.</p>
	{/if}
</section>

<section class="band" aria-labelledby="sections-heading">
	<h2 id="sections-heading" class="chapter-title">Sections</h2>
	<ol class="lc-sections">
		{#each PUZZLES as puzzle (puzzle.id)}
			{@const state = stateOf(puzzle.id)}
			<li class="lc-section" data-state={state}>
				<span class="lc-num" aria-hidden="true">{String(puzzle.ordinal).padStart(2, '0')}</span>
				<div>
					<h3 class="card-title">{puzzle.title}</h3>
					<p class="card-kicker">{puzzle.concept}</p>
				</div>
				<span class="lc-state">{state === 'open' ? 'Not solved' : state === 'solved' ? 'Solved' : 'Skipped'}</span>
			</li>
		{/each}
	</ol>
</section>

<section class="band" aria-labelledby="reward-heading" style="border-bottom: 0;">
	<h2 id="reward-heading" class="chapter-title">Skipping and the reward</h2>
	<p>
		Any section can be skipped, and the course carries on. A skip is permanent, though: solve every section
		with none skipped to earn the reward, which repairs the registration mark in the site footer.
		{#if earned}
			<strong>You have earned it.</strong>
		{:else if course.skipped.length > 0}
			You have skipped {course.skipped.length} section{course.skipped.length === 1 ? '' : 's'}, so the reward is
			forfeit. <a href="/workshop">Reset your progress</a> to try again.
		{/if}
	</p>
</section>

{#if Overlay}
	<Overlay onClose={close} />
{/if}

<style>
	.lc-sections {
		list-style: none;
		margin: var(--space-4) 0 0;
		padding: 0;
		display: grid;
		gap: var(--space-2);
	}

	.lc-section {
		display: grid;
		grid-template-columns: 2.5rem 1fr auto;
		gap: var(--space-3);
		align-items: center;
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--color-divider);
	}

	.lc-num {
		font-family: var(--font-mono);
		color: var(--color-accent-700);
	}

	.lc-state {
		font-size: 12px;
		white-space: nowrap;
	}

	.lc-section[data-state='solved'] .lc-state {
		color: var(--color-accent-700);
	}

	.lc-section[data-state='skipped'] .lc-state {
		opacity: 0.7;
		font-style: italic;
	}
</style>
