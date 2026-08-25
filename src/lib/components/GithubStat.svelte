<script lang="ts">
	/** M7 — the star count in the app bar. Hides entirely if the API is unreachable. */
	import { onMount } from 'svelte';
	import { loadRepoStats, formatCount, type RepoStats } from '$lib/github';
	import { REPO } from '$lib/site';

	let stats = $state<RepoStats | null>(null);

	onMount(async () => {
		stats = await loadRepoStats();
	});
</script>

{#if stats}
	<a
		class="gh-stat"
		href={REPO.url}
		target="_blank"
		rel="noopener noreferrer"
		title="{stats.stars.toLocaleString()} stars on GitHub"
	>
		<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
			<path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 3Z" />
		</svg>
		<span>{formatCount(stats.stars)}</span>
	</a>
{/if}
