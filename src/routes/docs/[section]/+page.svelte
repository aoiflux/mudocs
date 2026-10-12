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

	/** Advisories (docs/advisories/) get a band of their own, not a card each among the guides. */
	function isAdvisory(doc: { sourcePath: string }): boolean {
		return doc.sourcePath.startsWith('docs/advisories/');
	}

	const advisoryIndex = $derived(data.docs.find((doc) => doc.sourcePath === 'docs/advisories/README.md'));
	const advisories = $derived(
		data.docs
			.filter((doc) => isAdvisory(doc) && doc !== advisoryIndex)
			.sort((a, b) => a.slug.localeCompare(b.slug))
			.map((doc) => {
				const match = /^(MVF-\d{4}-\d{4})\s*[:—-]\s*(.*)$/.exec(doc.title);
				return { doc, id: match?.[1] ?? doc.title, summary: match?.[2] ?? '' };
			})
	);
	const additionalDocs = $derived(data.landing.additionalDocs.filter((doc) => !isAdvisory(doc)));

	const curatedDeepDives = $derived(
		data.docs
			.filter((doc) => !isAdvisory(doc))
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

		{#if advisoryIndex}
			<section class="band" aria-labelledby="advisories-heading">
				<p class="eyebrow">Security advisories</p>
				<h2 id="advisories-heading" class="advisories-heading">
					<a href={`/docs/${advisoryIndex.section}/${advisoryIndex.slug}`}>{advisoryIndex.title}</a>
				</h2>
				<p>
					{advisories.length} published, each with the fixture that holds its fix. Severity, affected versions and
					CVSS vectors are in the index.
				</p>
				<ul class="advisories">
					{#each advisories as { doc, id, summary } (doc.slug)}
						<li>
							<a href={`/docs/${doc.section}/${doc.slug}`}><code>{id}</code></a>
							<span>{summary}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="band" style="border-bottom: 0;">
			<p class="eyebrow">Everything else in {data.current.title.toLowerCase()}</p>
			<div class="three-up" data-fx="fade-up" data-fx-stagger="70">
				{#each additionalDocs as doc (doc.slug)}
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

<style>
	.advisories-heading {
		margin: 0 0 var(--space-2);
	}

	.advisories {
		display: grid;
		gap: var(--space-2);
		margin: var(--space-3) 0 0;
		padding: 0;
		list-style: none;
	}

	.advisories li {
		display: grid;
		grid-template-columns: minmax(9.5em, max-content) 1fr;
		gap: var(--space-3);
		align-items: baseline;
	}

	@media (max-width: 640px) {
		.advisories li {
			grid-template-columns: 1fr;
			gap: 0;
		}
	}
</style>
