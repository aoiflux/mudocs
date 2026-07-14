<script lang="ts">
	let { data } = $props();
</script>

<section class="panel" style="margin-bottom: 1rem;">
	<p class="kicker">Definitive Guide In Progress</p>
	<h1 class="big-title">The Definitive Mutant Guide</h1>
	<p class="lede">
		This new implementation uses the repository-level docs corpus as the canonical source for architecture,
		security, runtime, and workflow knowledge, with the browser REPL folded directly into the learning surface.
	</p>
	<div class="meta-row">
		<span class="meta-chip">SvelteKit</span>
		<span class="meta-chip">Docs corpus: /docs</span>
		<span class="meta-chip">WASM REPL path</span>
	</div>
</section>

<section class="grid">
	{#each data.sections as section}
		<article class="card">
			<h3>{section.title}</h3>
			<p>{section.description}</p>
			<div class="meta-row">
				<span class="meta-chip">{section.count} pages</span>
			</div>
			<p style="margin-bottom: 0; margin-top: 0.9rem;">
				<a href={`/docs/${section.section}`}>Explore {section.title}</a>
			</p>
		</article>
	{/each}
</section>

<section class="panel" style="margin-top: 1rem;">
	<p class="kicker">Reading Paths</p>
	<h2 style="margin-top: 0; text-transform: uppercase;">Pick A Path</h2>
	<div class="grid" style="margin-top: 0.8rem;">
		{#each data.readingPaths as path}
			<article class="card" style="grid-column: span 4;">
				<h3>{path.title}</h3>
				<p>{path.description}</p>
				<div class="meta-row">
					<span class="meta-chip">Audience: {path.audience}</span>
				</div>
				<div class="related-docs-list" style="margin-top: 0.75rem;">
					{#each path.steps as step, index}
						<a class="related-doc-link" href={`/docs/${step.section}/${step.slug}`}>
							<span class="doc-nav-label">Step {index + 1}</span>
							<strong>{step.title}</strong>
						</a>
					{/each}
				</div>
			</article>
		{/each}
	</div>
</section>

<section class="panel" style="margin-top: 1rem;">
	<p class="kicker">Themes</p>
	<h2 style="margin-top: 0; text-transform: uppercase;">Cross-Link By Theme</h2>
	<div class="related-docs-list">
		{#each data.themes as theme}
			<a class="related-doc-link" href={`/docs/themes/${theme.theme}`}>
				<strong>{theme.title}</strong><br />
				<span style="font-size: 0.9rem; color: var(--ink-soft);">{theme.description}</span><br />
				<span class="doc-nav-label">{theme.count} docs</span>
			</a>
		{/each}
	</div>
</section>
