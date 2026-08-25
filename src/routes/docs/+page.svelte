<script lang="ts">
	/** Docs index — the 2b shell, with the corpus list as its body. */
	import SeoHead from '$lib/components/SeoHead.svelte';
	import DocsSidebar from '$lib/components/DocsSidebar.svelte';
	import Blueprint from '$lib/components/Blueprint.svelte';

	let { data } = $props();
	let query = $state('');

	const normalizedQuery = $derived(query.trim().toLowerCase());
	const filteredDocs = $derived(
		normalizedQuery
			? data.docs.filter((doc) => {
					const haystack = [doc.title, doc.description, doc.sectionTitle, doc.sourcePath]
						.join(' ')
						.toLowerCase();
					return haystack.includes(normalizedQuery);
				})
			: data.docs
	);
</script>

<SeoHead
	title="All docs"
	description="Browse the Mutant documentation corpus — {data.docs.length} documents across overview, reference, runtime, security and tooling."
/>

<div class="docs-layout is-two-col">
	<DocsSidebar tree={data.tree} />

	<div class="docs-main">
		<nav class="breadcrumbs" aria-label="Breadcrumb">
			<a href="/docs">Docs</a>
			<span aria-hidden="true">/</span>
			<span class="current">All documents</span>
		</nav>

		<p class="eyebrow">Documentation</p>
		<h1>{data.docs.length} documents</h1>
		<p class="lede">
			The definitive Mutant corpus, rendered from the repository's own markdown. Filter here, or
			<a href="/search">open advanced search</a> for full-text ranking.
		</p>

		<div style="margin: var(--space-6) 0;">
			<input
				class="input"
				bind:value={query}
				placeholder="Filter titles, sections, source paths"
				aria-label="Filter documents"
			/>
		</div>

		<section class="band" style="padding-top: 0;">
			<p class="eyebrow">Sections</p>
			<div class="three-up" data-fx="fade-up" data-fx-stagger="80">
				{#each data.sections as section (section.section)}
					<Blueprint
						as="a"
						liftable
						href={`/docs/${section.section}`}
						data-fx="fade-up"
						style="padding: var(--space-4); display: grid; gap: var(--space-2); align-content: start; text-decoration: none; color: inherit;"
					>
						<span class="card-kicker">{section.count} {section.count === 1 ? 'doc' : 'docs'}</span>
						<span class="card-title">{section.title}</span>
						<span class="card-body">{section.description}</span>
					</Blueprint>
				{/each}
			</div>
		</section>

		<section>
			<div class="band-head">
				<p class="eyebrow">
					{filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
					{normalizedQuery ? 'matching' : 'in the corpus'}
				</p>
				<a class="source-note" href="/docs/quality">Quality report ↗</a>
			</div>

			<div class="related-docs-list">
				{#each filteredDocs as doc (doc.slug)}
					<a class="related-doc-link" href={`/docs/${doc.section}/${doc.slug}`}>
						<span class="doc-nav-label">{doc.sectionTitle} · {doc.sourcePath}</span>
						<strong>{doc.title}</strong>
						<span class="card-body" style="display: block; margin-top: var(--space-1);">
							{doc.description}
						</span>
					</a>
				{/each}

				{#if filteredDocs.length === 0}
					<p class="text-muted">No documents match “{query}”.</p>
				{/if}
			</div>
		</section>
	</div>
</div>
