<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();
	let queryInput: HTMLInputElement | null = null;

	onMount(() => {
		if (!queryInput) return;
		if (data.focus || !data.query) {
			queryInput.focus();
			queryInput.select();
		}
	});
</script>

<section class="panel" style="margin-bottom: 1rem;">
	<p class="kicker">Search Engine</p>
	<h1 style="margin: 0; text-transform: uppercase;">Docs Search</h1>
	<p class="lede">
		Full-text search across titles, headings, tags, descriptions, and body content.
	</p>
	<p style="margin: 0.75rem 0 0; font-size: 0.86rem; color: var(--ink-soft);">
		Shortcut: <kbd class="shortcut-key">Ctrl</kbd> + <kbd class="shortcut-key">K</kbd>
	</p>
</section>

<section class="panel" style="margin-bottom: 1rem;">
	<form method="GET" action="/search" class="search-form-grid">
		<div class="search-field">
			<label for="q">Query</label>
			<input bind:this={queryInput} id="q" name="q" value={data.query} placeholder="security probes, bytecode, loops..." required />
		</div>
		<div class="search-field">
			<label for="section">Section</label>
			<select id="section" name="section">
				<option value="">Any section</option>
				{#each data.sections as section}
					<option value={section.section} selected={data.section === section.section}>{section.title}</option>
				{/each}
			</select>
		</div>
		<div class="search-field">
			<label for="theme">Theme</label>
			<select id="theme" name="theme">
				<option value="">Any theme</option>
				{#each data.themes as theme}
					<option value={theme.theme} selected={data.theme === theme.theme}>{theme.title}</option>
				{/each}
			</select>
		</div>
		<div class="search-field">
			<label for="audience">Audience</label>
			<select id="audience" name="audience">
				<option value="">Any audience</option>
				{#each data.audiences as audience}
					<option value={audience} selected={data.audience === audience}>{audience}</option>
				{/each}
			</select>
		</div>
		<div class="search-actions">
			<button type="submit">Search</button>
		</div>
	</form>
</section>

<section class="panel">
	<p class="kicker">Results</p>
	{#if !data.query}
		<p class="lede" style="margin-bottom: 0;">Type a query to search the entire guide corpus.</p>
	{:else if data.results.length === 0}
		<p class="lede" style="margin-bottom: 0;">No matching documents found for this filter set.</p>
	{:else}
		<h2 style="margin-top: 0; text-transform: uppercase;">{data.results.length} Matches</h2>
		<div class="related-docs-list">
			{#each data.results as hit}
				<article class="related-doc-link">
					<p style="margin: 0 0 0.35rem;"><a href={`/docs/${hit.doc.section}/${hit.doc.slug}`}><strong>{hit.doc.title}</strong></a></p>
					<p style="margin: 0 0 0.5rem;">{hit.doc.description}</p>
					<p class="search-snippet">{@html hit.previewHtml}</p>
					<div class="meta-row" style="margin-top: 0;">
						<span class="meta-chip">{hit.doc.sectionTitle}</span>
						<span class="meta-chip">Audience: {hit.doc.audience}</span>
						<span class="meta-chip">Score: {hit.score}</span>
						{#each hit.matchedTerms as term}
							<span class="meta-chip">Term: {term}</span>
						{/each}
					</div>
				</article>
			{/each}
		</div>
	{/if}
</section>
