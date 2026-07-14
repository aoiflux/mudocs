<script lang="ts">
	let { data } = $props();
	let query = $state('');

	const normalizedQuery = $derived(query.trim().toLowerCase());
	const filteredDocs = $derived(normalizedQuery
		? data.docs.filter((doc) => {
				const haystack = [doc.title, doc.description, doc.sectionTitle, doc.sourcePath].join(' ').toLowerCase();
				return haystack.includes(normalizedQuery);
			})
		: data.docs);
</script>

<section class="panel" style="margin-bottom: 1rem;">
	<p class="kicker">Documentation Sections</p>
	<h1 style="margin: 0; text-transform: uppercase;">All Docs</h1>
	<p class="lede">Browse the definitive Mutant documentation corpus, organized from the repository-level docs source.</p>
	<div style="margin-top: 1rem;">
		<input
			bind:value={query}
			placeholder="Search titles, sections, source paths"
			style="width: 100%; border: 3px solid #121212; padding: 0.8rem; background: #fff8eb; font: 600 0.95rem/1.2 'Space Grotesk', sans-serif;"
		/>
	</div>
</section>

<section class="grid">
	{#each data.sections as section}
		<article class="card">
			<h3>{section.title}</h3>
			<p>{section.description}</p>
			<p style="margin-bottom: 0; margin-top: 0.8rem;">
				<a href={`/docs/${section.section}`}>Open section</a>
			</p>
		</article>
	{/each}
</section>

<section class="panel" style="margin-top: 1rem;">
	<p class="kicker">Corpus Search</p>
	<h2 style="margin-top: 0; text-transform: uppercase;">{filteredDocs.length} Matching Documents</h2>
	<div class="related-docs-list">
		{#each filteredDocs as doc}
			<a class="related-doc-link" href={`/docs/${doc.section}/${doc.slug}`}>
				<strong>{doc.title}</strong><br />
				<span style="font-size: 0.9rem; color: #2c2a27;">{doc.description}</span><br />
				<span style="font-size: 0.75rem; text-transform: uppercase;">{doc.sectionTitle} // {doc.sourcePath}</span>
			</a>
		{/each}
	</div>
</section>

<section class="panel" style="margin-top: 1rem;">
	<p class="kicker">Quality</p>
	<h2 style="margin-top: 0; text-transform: uppercase;">Documentation Quality Controls</h2>
	<p class="lede">Track metadata, tags, themes, and structural completeness in one generated report.</p>
	<p style="margin-bottom: 0;">
		<a href="/docs/quality">Open Docs Quality Report</a>
	</p>
</section>
