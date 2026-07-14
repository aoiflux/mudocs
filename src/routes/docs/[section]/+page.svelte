<script lang="ts">
	let { data } = $props();
</script>

<section class="panel" style="margin-bottom: 1rem;">
	<p class="kicker">Section</p>
	<h1 style="margin: 0; text-transform: uppercase;">{data.current.title}</h1>
	<p class="lede">{data.current.description}</p>
	<div class="meta-row">
		<span class="meta-chip">{data.docs.length} pages</span>
	</div>
</section>

<section class="grid" style="margin-bottom: 1rem; align-items: start;">
	<div class="card" style="grid-column: span 7;">
		<h3>Start Here</h3>
		<p>{data.landing.intro}</p>
		{#if data.landing.featuredDoc}
			<p style="margin-bottom: 0.4rem; font-size: 0.8rem; text-transform: uppercase;">Featured document</p>
			<p style="margin-top: 0; margin-bottom: 0.5rem;"><strong>{data.landing.featuredDoc.title}</strong></p>
			<p>{data.landing.featuredDoc.description}</p>
			<p style="margin-bottom: 0; margin-top: 0.8rem;">
				<a href={`/docs/${data.landing.featuredDoc.section}/${data.landing.featuredDoc.slug}`}>Read featured guide</a>
			</p>
		{/if}
	</div>

	<div class="card" style="grid-column: span 5;">
		<h3>Reading Path</h3>
		<div class="related-docs-list">
			{#each data.landing.readingPath as item, index}
				<a class="related-doc-link" href={`/docs/${item.section}/${item.slug}`}>
					<span class="doc-nav-label">Step {index + 1}</span>
					<strong>{item.title}</strong>
				</a>
			{/each}
		</div>
	</div>
</section>

<section class="grid">
	{#each data.landing.additionalDocs as doc}
		<article class="card">
			<h3>{doc.title}</h3>
			<p>{doc.description}</p>
			<div class="meta-row">
				{#if doc.frontmatter.last_reviewed}
					<span class="meta-chip">Reviewed {doc.frontmatter.last_reviewed}</span>
				{/if}
				{#if doc.frontmatter.freshness_tier}
					<span class="meta-chip">Tier {doc.frontmatter.freshness_tier}</span>
				{/if}
			</div>
			<p style="margin-bottom: 0; margin-top: 0.8rem;">
				<a href={`/docs/${doc.section}/${doc.slug}`}>Read page</a>
			</p>
		</article>
	{/each}
</section>
