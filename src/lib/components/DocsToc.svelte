<script lang="ts">
	/** M8 — "On this page", with the marker tracking the heading in view. */
	import { onMount } from 'svelte';

	let {
		toc,
		githubUrl = ''
	}: {
		toc: Array<{ id: string; text: string; level: number }>;
		githubUrl?: string;
	} = $props();

	let currentId = $state('');

	onMount(() => {
		if (toc.length === 0) return;

		const headings = toc
			.map((entry) => document.getElementById(entry.id))
			.filter((el): el is HTMLElement => Boolean(el));
		if (headings.length === 0) return;

		// Track the last heading whose top has passed the reading line, so the
		// marker reflects the section you are in rather than the next one down.
		const visible = new Set<string>();
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) visible.add(entry.target.id);
					else visible.delete(entry.target.id);
				}
				const firstVisible = headings.find((heading) => visible.has(heading.id));
				if (firstVisible) {
					currentId = firstVisible.id;
					return;
				}
				const passed = headings.filter((heading) => heading.getBoundingClientRect().top < 120);
				currentId = passed.length ? passed[passed.length - 1].id : headings[0].id;
			},
			{ rootMargin: '-72px 0px -70% 0px', threshold: 0 }
		);

		for (const heading of headings) observer.observe(heading);
		return () => observer.disconnect();
	});
</script>

<div class="docs-toc">
	{#if toc.length}
		<p class="eyebrow" style="margin: 0;">On this page</p>
		<ul class="toc-list">
			{#each toc as entry (entry.id)}
				<li class={`toc-level-${entry.level}`}>
					<a href={`#${entry.id}`} class:is-current={currentId === entry.id}>{entry.text}</a>
				</li>
			{/each}
		</ul>
	{/if}

	{#if githubUrl}
		<a class="source-note" href={githubUrl} target="_blank" rel="noopener noreferrer">Open in GitHub ↗</a>
	{/if}
</div>
