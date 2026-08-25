<script lang="ts">
	/** Section landing — the 2b shell around the existing start-here / path / deep-dive bands. */
	import SeoHead from '$lib/components/SeoHead.svelte';
	import DocsSidebar from '$lib/components/DocsSidebar.svelte';
	import Blueprint from '$lib/components/Blueprint.svelte';

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

<SeoHead title={data.current.title} description={data.current.description} />

<div class="docs-layout is-two-col">
	<DocsSidebar tree={data.tree} />

	<div class="docs-main">
		<nav class="breadcrumbs" aria-label="Breadcrumb">
			<a href="/docs">Docs</a>
			<span aria-hidden="true">/</span>
			<span class="current">{data.current.title}</span>
		</nav>

		<p class="eyebrow">Section</p>
		<h1>{data.current.title}</h1>
		<p class="lede">{data.current.description}</p>
		<div class="meta-row">
			<span class="meta-chip">{data.docs.length} pages</span>
		</div>

		<section class="band">
			<div class="two-up">
				<div>
					<p class="eyebrow">Start here</p>
					<p>{data.landing.intro}</p>
					{#if data.landing.featuredDoc}
						<Blueprint
							as="a"
							liftable
							href={`/docs/${data.landing.featuredDoc.section}/${data.landing.featuredDoc.slug}`}
							style="padding: var(--space-4); display: grid; gap: var(--space-2); text-decoration: none; color: inherit;"
						>
							<span class="card-kicker">Featured document</span>
							<span class="card-title">{data.landing.featuredDoc.title}</span>
							<span class="card-body">{data.landing.featuredDoc.description}</span>
						</Blueprint>
					{/if}
				</div>

				<div>
					<p class="eyebrow">Reading path</p>
					<div class="related-docs-list">
						{#each data.landing.readingPath as item, index (item.slug)}
							<a class="related-doc-link" href={`/docs/${item.section}/${item.slug}`}>
								<span class="doc-nav-label">Step {index + 1}</span>
								<strong>{item.title}</strong>
							</a>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<section class="band">
			<p class="eyebrow">Curated · top deep dives</p>
			<div class="related-docs-list">
				{#each curatedDeepDives as doc (doc.slug)}
					<a class="related-doc-link" href={`/docs/${doc.section}/${doc.slug}`}>
						<strong>{doc.title}</strong>
						<span class="card-body" style="display: block; margin-top: var(--space-1);">
							{doc.description}
						</span>
					</a>
				{/each}
			</div>
		</section>

		<section class="band" style="border-bottom: 0;">
			<p class="eyebrow">Everything else in {data.current.title.toLowerCase()}</p>
			<div class="three-up" data-fx="fade-up" data-fx-stagger="70">
				{#each data.landing.additionalDocs as doc (doc.slug)}
					<Blueprint
						as="a"
						liftable
						href={`/docs/${doc.section}/${doc.slug}`}
						data-fx="fade-up"
						style="padding: var(--space-4); display: grid; gap: var(--space-2); align-content: start; text-decoration: none; color: inherit;"
					>
						<span class="card-title">{doc.title}</span>
						<span class="card-body">{doc.description}</span>
						{#if doc.frontmatter.last_reviewed}
							<span class="card-meta">Reviewed {doc.frontmatter.last_reviewed}</span>
						{/if}
					</Blueprint>
				{/each}
			</div>
		</section>
	</div>
</div>
