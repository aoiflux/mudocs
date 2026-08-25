<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import DocsSidebar from '$lib/components/DocsSidebar.svelte';
	import Blueprint from '$lib/components/Blueprint.svelte';

	let { data } = $props();
</script>

<SeoHead title={data.current.title} description={data.current.description} />

<div class="docs-layout is-two-col">
	<DocsSidebar tree={data.tree} />

	<div class="docs-main">
		<nav class="breadcrumbs" aria-label="Breadcrumb">
			<a href="/docs">Docs</a>
			<span aria-hidden="true">/</span>
			<a href="/docs/themes">Themes</a>
			<span aria-hidden="true">/</span>
			<span class="current">{data.current.title}</span>
		</nav>

		<p class="eyebrow">Theme</p>
		<h1>{data.current.title}</h1>
		<p class="lede">{data.current.description}</p>
		<div class="three-up" style="margin-top: var(--space-8);" data-fx="fade-up" data-fx-stagger="80">
			{#each data.docs as doc (doc.slug)}
				<Blueprint
					as="a"
					liftable
					href={`/docs/${doc.section}/${doc.slug}`}
					data-fx="fade-up"
					style="padding: var(--space-4); display: grid; gap: var(--space-2); align-content: start; text-decoration: none; color: inherit;"
				>
					<span class="card-kicker">{doc.sectionTitle}</span>
					<span class="card-title">{doc.title}</span>
					<span class="card-body">{doc.description}</span>
				</Blueprint>
			{/each}
		</div>
	</div>
</div>
