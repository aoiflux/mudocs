<script lang="ts">
	let { data } = $props();

	const totalDocs = $derived(data.sections.reduce((sum: number, section: { count: number }) => sum + section.count, 0));

	const launchChapters = [
		{
			title: 'Polymorphic Runtime Core',
			copy: 'Mutant delivers a hardened runtime with polymorphic bytecode and execution controls engineered for resilient operation.',
			label: 'Runtime Focus',
			primaryHref: 'https://github.com/aoiflux/mutant',
			primaryText: 'View Runtime In GitHub',
			secondaryHref: '/docs/runtime',
			secondaryText: 'Read Runtime Docs'
		},
		{
			title: 'Security As Architecture',
			copy: 'Security is not bolted on. It is part of the language and platform story from probes to sandbox controls to trust flows.',
			label: 'Security Focus',
			primaryHref: 'https://github.com/aoiflux/mutant',
			primaryText: 'Inspect Security Design',
			secondaryHref: '/docs/security',
			secondaryText: 'Open Security Docs'
		},
		{
			title: 'Tooling Ready For Teams',
			copy: 'From LSP enablement to REPL workflows, Mutant gives integrators a practical path from exploration to production workflows.',
			label: 'Tooling Focus',
			primaryHref: 'https://github.com/aoiflux/mutant',
			primaryText: 'Explore Source & Workflow',
			secondaryHref: '/docs/tooling',
			secondaryText: 'See Tooling Docs'
		}
	];
</script>

<section class="panel mutant-launch" style="margin-bottom: 1rem;">
	<div class="mutant-spotlight" aria-hidden="true"></div>
	<p class="kicker">Mutant Platform</p>
	<h1 class="big-title">Build With Mutant</h1>
	<p class="lede">
		A secure-by-design language and runtime stack with deep documentation, practical workflows, and architecture
		clarity. Start at the source and move directly into implementation.
	</p>
	<div class="hero-evidence-grid" style="margin-top: 0.95rem;">
		<div class="hero-evidence-item">
			<span class="doc-nav-label">Repository</span>
			<strong>aoiflux/mutant</strong>
		</div>
		<div class="hero-evidence-item">
			<span class="doc-nav-label">Documentation Surface</span>
			<strong>{totalDocs} pages mapped</strong>
		</div>
		<div class="hero-evidence-item">
			<span class="doc-nav-label">Tracks</span>
			<strong>Runtime, Security, Tooling</strong>
		</div>
	</div>
	<div class="cta-cluster">
		<a class="cta-primary" href="https://github.com/aoiflux/mutant" target="_blank" rel="noopener noreferrer">
			Go To Mutant GitHub
		</a>
		<a class="cta-secondary" href="/docs">Open Documentation</a>
		<a class="cta-secondary" href="/playground">Try Playground</a>
	</div>
</section>

<section class="snap-deck" style="margin-top: 1rem;">
	{#each launchChapters as chapter}
		<article class="panel snap-chapter">
			<p class="kicker">{chapter.label}</p>
			<h2 class="chapter-title">{chapter.title}</h2>
			<p class="lede" style="margin-top: 0.4rem;">{chapter.copy}</p>
			<div class="cta-cluster">
				<a
					class="cta-primary"
					href={chapter.primaryHref}
					target="_blank"
					rel="noopener noreferrer"
				>
					{chapter.primaryText}
				</a>
				<a class="cta-secondary" href={chapter.secondaryHref}>{chapter.secondaryText}</a>
			</div>
		</article>
	{/each}
</section>

<section class="grid" style="margin-top: 1rem;">
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
	<p class="kicker">Experimental Design</p>
	<h2 style="margin-top: 0; text-transform: uppercase;">Theme Lab</h2>
	<p class="lede" style="margin-top: 0.25rem; max-width: 60ch;">
		The full animation-heavy theme showcase now lives on a dedicated route so this landing page stays focused on
		driving discovery of Mutant and its source repository.
	</p>
	<p style="margin-bottom: 0; margin-top: 0.95rem;">
		<a class="cta-secondary" href="/theme-lab">Open Theme Lab</a>
	</p>
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
