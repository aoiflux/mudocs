<script lang="ts">
	let { data } = $props();

	const deepDiveKeywords = ['deep-dive', 'diagram', 'lld', 'traceability', 'runbook', 'probe', 'migration'];

	function docPriority(doc: (typeof data.docs)[number]): number {
		const text = [doc.title, doc.description, ...(doc.tags ?? [])].join(' ').toLowerCase();
		let score = 0;
		for (const keyword of deepDiveKeywords) {
			if (text.includes(keyword)) score += 3;
		}
		if ((doc.themes ?? []).length > 0) score += 1;
		if (doc.frontmatter.freshness_tier === 'critical') score += 2;
		if (doc.frontmatter.freshness_tier === 'high') score += 1;
		return score;
	}

	const curatedDeepDives = $derived(
		[...data.docs]
			.sort((a, b) => docPriority(b) - docPriority(a) || a.title.localeCompare(b.title))
			.slice(0, 4)
	);
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

<section class="panel" style="margin-bottom: 1rem;">
	<p class="kicker">Curated</p>
	<h2 style="margin-top: 0; text-transform: uppercase;">Top Deep Dives</h2>
	<div class="related-docs-list">
		{#each curatedDeepDives as doc}
			<a class="related-doc-link" href={`/docs/${doc.section}/${doc.slug}`}>
				<strong>{doc.title}</strong><br />
				<span style="font-size: 0.9rem; color: var(--ink-soft);">{doc.description}</span>
			</a>
		{/each}
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
