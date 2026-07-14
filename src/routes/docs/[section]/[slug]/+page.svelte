<script lang="ts">
	let { data } = $props();

	const sectionHref = $derived(`/docs/${data.doc.section}`);
</script>

<article class="panel doc-content">
	<nav class="breadcrumbs" aria-label="Breadcrumb">
		<a href="/">Home</a>
		<span>/</span>
		<a href="/docs">Docs</a>
		<span>/</span>
		<a href={sectionHref}>{data.doc.sectionTitle}</a>
		<span>/</span>
		<strong>{data.doc.title}</strong>
	</nav>

	<p class="kicker">{data.doc.section}</p>
	<h1 style="margin-top: 0;">{data.doc.title}</h1>
	<p class="lede">{data.doc.description}</p>

	<section class="doc-rail-block" style="margin-top: 0.9rem;">
		<h2 class="doc-rail-title">Context Rail</h2>
		<div class="related-docs-list">
			<a class="related-doc-link" href={sectionHref}>Back to {data.doc.sectionTitle} section</a>
			<a class="related-doc-link" href="/search?q={encodeURIComponent(data.doc.title)}">Search this topic</a>
		</div>
	</section>

	<div class="meta-row" style="margin-bottom: 1rem;">
		{#if data.doc.frontmatter.last_reviewed}
			<span class="meta-chip">Reviewed: {data.doc.frontmatter.last_reviewed}</span>
		{/if}
		{#if data.doc.frontmatter.review_owner}
			<span class="meta-chip">Owner: {data.doc.frontmatter.review_owner}</span>
		{/if}
		{#if data.doc.frontmatter.source_repo}
			<span class="meta-chip">Repo: {data.doc.frontmatter.source_repo}</span>
		{/if}
		{#if data.doc.frontmatter.source_ref}
			<span class="meta-chip">Ref: {data.doc.frontmatter.source_ref}</span>
		{/if}
		<span class="meta-chip">Audience: {data.doc.audience}</span>
		<span class="meta-chip">Source: {data.doc.sourcePath}</span>
	</div>

	{#if data.doc.tags.length > 0 || data.doc.themes.length > 0}
		<section class="doc-rail-block">
			<h2 class="doc-rail-title">Tags and Themes</h2>
			<div class="meta-row" style="margin-top: 0;">
				{#each data.doc.tags as tag}
					<span class="meta-chip">tag: {tag}</span>
				{/each}
				{#each data.doc.themes as theme}
					<a class="meta-chip" href={`/docs/themes/${theme}`}>theme: {theme}</a>
				{/each}
			</div>
		</section>
	{/if}

	{#if data.doc.toc.length > 0}
		<section class="doc-rail-block">
			<h2 class="doc-rail-title">On This Page</h2>
			<ul class="toc-list">
				{#each data.doc.toc as item}
					<li class={`toc-level-${item.level}`}>
						<a href={`#${item.id}`}>{item.text}</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{@html data.doc.html}

	<section class="doc-footer-grid">
		{#if data.doc.previousDoc}
			<a class="doc-nav-card" href={`/docs/${data.doc.previousDoc.section}/${data.doc.previousDoc.slug}`}>
				<span class="doc-nav-label">Previous</span>
				<strong>{data.doc.previousDoc.title}</strong>
			</a>
		{/if}
		{#if data.doc.nextDoc}
			<a class="doc-nav-card" href={`/docs/${data.doc.nextDoc.section}/${data.doc.nextDoc.slug}`}>
				<span class="doc-nav-label">Next</span>
				<strong>{data.doc.nextDoc.title}</strong>
			</a>
		{/if}
	</section>

	{#if data.doc.relatedDocs.length > 0}
		<section class="doc-rail-block">
			<h2 class="doc-rail-title">Related Reading</h2>
			<div class="related-docs-list">
				{#each data.doc.relatedDocs as related}
					<a class="related-doc-link" href={`/docs/${related.section}/${related.slug}`}>{related.title}</a>
				{/each}
			</div>
		</section>
	{/if}
</article>
