<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import DocsSidebar from '$lib/components/DocsSidebar.svelte';
	import Blueprint from '$lib/components/Blueprint.svelte';

	let { data } = $props();
</script>

<SeoHead
	title="Themes"
	description="Cross-link the Mutant documentation by technical theme — bytecode, sandboxing, signing, REPL and LSP."
/>

<div class="docs-layout is-two-col">
	<DocsSidebar tree={data.tree} />

	<div class="docs-main">
		<nav class="breadcrumbs" aria-label="Breadcrumb">
			<a href="/docs">Docs</a>
			<span aria-hidden="true">/</span>
			<span class="current">Themes</span>
		</nav>

		<p class="eyebrow">Themes</p>
		<h1>Documentation themes</h1>
		<p class="lede">Cross-link the corpus by technical theme, across every section.</p>

		<div class="three-up" style="margin-top: var(--space-8);" data-fx="fade-up" data-fx-stagger="80">
			{#each data.themes as theme (theme.theme)}
				<Blueprint
					as="a"
					liftable
					href={`/docs/themes/${theme.theme}`}
					data-fx="fade-up"
					style="padding: var(--space-4); display: grid; gap: var(--space-2); align-content: start; text-decoration: none; color: inherit;"
				>
					<span class="card-title">{theme.title}</span>
					<span class="card-body">{theme.description}</span>
				</Blueprint>
			{/each}
		</div>
	</div>
</div>
