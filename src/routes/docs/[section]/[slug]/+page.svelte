<script lang="ts">
	/** Artboard 2b — sidebar / body with tabs / sticky TOC. */
	import SeoHead from '$lib/components/SeoHead.svelte';
	import DocsSidebar from '$lib/components/DocsSidebar.svelte';
	import DocsToc from '$lib/components/DocsToc.svelte';
	import Tabs from '$lib/components/Tabs.svelte';
	import CodePanel from '$lib/components/CodePanel.svelte';
	import { onMount, tick } from 'svelte';
	import { extractDiagrams } from '$lib/diagrams';
	import { prefersReducedMotion } from '$lib/artist/motion';
	import { REPO } from '$lib/site';

	let { data } = $props();

	const doc = $derived(data.doc);
	const sectionHref = $derived(`/docs/${doc.section}`);
	const githubUrl = $derived(`${REPO.docsBlobBase}/${doc.sourcePath}`);

	// Derived from the HTML we already have, so the figures are not shipped twice.
	const diagrams = $derived(extractDiagrams(doc.html));

	let activeTab = $state('guide');

	const tabs = $derived([
		{ id: 'guide', label: 'Guide' },
		{
			id: 'diagrams',
			label: 'Diagrams',
			disabled: diagrams.length === 0
		},
		{ id: 'source', label: 'Source' }
	]);

	// The source markdown is fetched on first open rather than serialized into
	// every page load — it is another 59 KB on the larger references.
	let source = $state<string | null>(null);
	let sourceError = $state('');
	let loadingSource = $state(false);

	$effect(() => {
		// Reset when navigating between documents.
		void doc.slug;
		source = null;
		sourceError = '';
		activeTab = 'guide';
	});

	async function loadSource() {
		if (source !== null || loadingSource) return;
		loadingSource = true;
		sourceError = '';
		try {
			const response = await fetch(`/docs/${doc.section}/${doc.slug}/raw`);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			source = await response.text();
		} catch (error) {
			sourceError = error instanceof Error ? error.message : 'Could not load the source.';
		} finally {
			loadingSource = false;
		}
	}

	$effect(() => {
		if (activeTab === 'source') void loadSource();
	});

	$effect(() => {
		// The Diagrams tab mounts its figures only when opened, so the mermaid
		// nodes it inserts have never been rendered. Ask the layout to run over
		// them once the panel is in the DOM.
		if (activeTab !== 'diagrams') return;
		void tick().then(() => {
			window.dispatchEvent(new CustomEvent('mudocs:render-diagrams'));
		});
	});

	// How far through the document the reader is. These pages run to tens of
	// screens, and nothing else on them says how much is left.
	let progress = $state(0);
	let article: HTMLElement | undefined = $state();

	onMount(() => {
		if (prefersReducedMotion()) return;

		let frame = 0;
		const measure = () => {
			frame = 0;
			if (!article) return;
			const box = article.getBoundingClientRect();
			const scrolled = -box.top;
			const runway = box.height - window.innerHeight;
			progress = runway <= 0 ? 0 : Math.min(Math.max(scrolled / runway, 0), 1);
		};
		const onScroll = () => {
			if (frame) return;
			frame = requestAnimationFrame(measure);
		};

		measure();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		return () => {
			if (frame) cancelAnimationFrame(frame);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	});
</script>

<SeoHead title={doc.title} description={doc.description} type="article" />

<div class="docs-layout">
	<DocsSidebar tree={data.tree} />

	<article class="docs-main" bind:this={article}>
		<div
			class="read-progress"
			style="--read: {(progress * 100).toFixed(2)}%"
			aria-hidden="true"
		></div>

		<nav class="breadcrumbs" aria-label="Breadcrumb">
			<a href="/docs">Docs</a>
			<span aria-hidden="true">/</span>
			<a href={sectionHref}>{doc.sectionTitle}</a>
			<span aria-hidden="true">/</span>
			<span class="current">{doc.title}</span>
		</nav>

		<h1>{doc.title}</h1>
		<p class="lede">{doc.description}</p>

		<div class="meta-row">
			{#if doc.frontmatter.last_reviewed}
				<span class="meta-chip">Reviewed {doc.frontmatter.last_reviewed}</span>
			{/if}
			<span class="meta-chip">Audience: {doc.audience}</span>
			<span class="meta-chip">{doc.sourcePath}</span>
			{#each doc.themes as theme (theme)}
				<a class="meta-chip" href={`/docs/themes/${theme}`}>theme: {theme}</a>
			{/each}
		</div>

		<Tabs {tabs} bind:active={activeTab} />

		{#if activeTab === 'guide'}
			<div id="panel-guide" role="tabpanel" aria-labelledby="tab-guide" class="doc-content tab-panel">
				{@html doc.html}
			</div>
		{:else if activeTab === 'diagrams'}
			<div id="panel-diagrams" role="tabpanel" aria-labelledby="tab-diagrams" class="doc-content tab-panel">
				{#if diagrams.length}
					{#each diagrams as figure, index (index)}
						{@html figure}
					{/each}
				{:else}
					<p class="text-muted">This document has no diagram figures.</p>
				{/if}
			</div>
		{:else}
			<div id="panel-source" role="tabpanel" aria-labelledby="tab-source" class="tab-panel">
				<p class="text-muted" style="font-size: 13px;">
					The markdown behind this page, exactly as it sits in
					<a href={githubUrl} target="_blank" rel="noopener noreferrer">{doc.sourcePath}</a>.
				</p>

				{#if source !== null}
					<CodePanel code={source} label={doc.sourcePath} />
				{:else if sourceError}
					<p class="diagram-error">Could not load the source ({sourceError}).</p>
				{:else}
					<p class="text-muted">Loading source…</p>
				{/if}
			</div>
		{/if}

		<nav class="doc-footer-grid" aria-label="Document navigation">
			{#if doc.previousDoc}
				<a class="doc-nav-card" href={`/docs/${doc.previousDoc.section}/${doc.previousDoc.slug}`}>
					<span class="doc-nav-label">← Previous</span>
					<strong>{doc.previousDoc.title}</strong>
				</a>
			{/if}
			{#if doc.nextDoc}
				<a
					class="doc-nav-card"
					href={`/docs/${doc.nextDoc.section}/${doc.nextDoc.slug}`}
					style="text-align: right;"
				>
					<span class="doc-nav-label">Next →</span>
					<strong>{doc.nextDoc.title}</strong>
				</a>
			{/if}
		</nav>

		{#if doc.relatedDocs.length > 0}
			<section class="doc-rail-block">
				<h2 class="doc-rail-title">Related reading</h2>
				<div class="related-docs-list">
					{#each doc.relatedDocs as related (related.slug)}
						<a class="related-doc-link" href={`/docs/${related.section}/${related.slug}`}>
							<span class="doc-nav-label">{related.section}</span>
							<strong>{related.title}</strong>
						</a>
					{/each}
				</div>
			</section>
		{/if}
	</article>

	<DocsToc toc={doc.toc} {githubUrl} />
</div>
