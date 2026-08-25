<script lang="ts">
	/** Artboard 2d — filter chips, featured plate + side stack, mini-projects grid. */
	import SeoHead from '$lib/components/SeoHead.svelte';
	import Blueprint from '$lib/components/Blueprint.svelte';
	import { REPO } from '$lib/site';

	let { data } = $props();

	const showcase = $derived(data.showcase);
	let filter = $state('all');

	const visible = $derived(
		filter === 'all' ? showcase.all : showcase.all.filter((item) => item.section === filter)
	);

	// The unfiltered view leads with the curated pick the artboard annotates
	// (DETAILED_EXPLANATIONS.md); filtering re-composes the whole band from that
	// section rather than only the grid below it.
	const featured = $derived(
		filter === 'all' ? (showcase.featured ?? visible[0] ?? null) : (visible[0] ?? null)
	);
	const rest = $derived(visible.filter((item) => item.slug !== featured?.slug));
	const secondary = $derived(rest.slice(0, 3));
	const mini = $derived(rest.slice(3, 12));
</script>

<SeoHead
	title="Showcase"
	description="Worked examples from the Mutant corpus — the documents that carry diagrams and runnable code, grouped by section."
/>

<!-- ── Header · filters ─────────────────────────────────────────────────── -->
<section class="band" style="padding-top: 0;">
	<div class="band-head">
		<div>
			<p class="eyebrow">Built with Mutant</p>
			<h1>Showcase</h1>
		</div>

		<div class="seg" role="group" aria-label="Filter by section">
			{#each showcase.filters as option (option.key)}
				<button
					type="button"
					class="seg-opt"
					aria-pressed={filter === option.key}
					onclick={() => (filter = option.key)}
				>
					{option.label} <span class="text-muted">{option.count}</span>
				</button>
			{/each}
		</div>
	</div>

	<p class="lede" style="margin-top: var(--space-4);">
		Every entry here is a document that ships worked material — a diagram, a runnable fence, or both. The
		list is derived from the corpus, so it tracks the docs rather than a hand-kept feature list.
	</p>
</section>

<!-- ── Featured · side stack ────────────────────────────────────────────── -->
{#if featured}
	<div class="showcase-split">
		<div class="showcase-featured">
			<a class="showcase-plate" href={featured.href} aria-label={featured.title}>
				<span class="badge">
					▸ {featured.diagrams} {featured.diagrams === 1 ? 'diagram' : 'diagrams'} ·
					{featured.codeBlocks} {featured.codeBlocks === 1 ? 'code block' : 'code blocks'}
				</span>
			</a>

			<div>
				<p class="eyebrow" style="margin-bottom: var(--space-2);">{featured.sectionTitle}</p>
				<h2 class="chapter-title">{featured.title}</h2>
				<p class="card-body" style="margin-top: var(--space-3); font-size: 14px;">
					{featured.description}
				</p>
			</div>

			<div class="meta-row" style="margin-top: 0;">
				{#each featured.tags as tag (tag)}
					<span class="meta-chip">{tag}</span>
				{/each}
				<span class="meta-chip">{featured.sourcePath}</span>
			</div>

			<div class="cta-cluster" style="margin-top: 0;">
				<a class="btn btn-primary btn-sm" href={featured.href}>Read it</a>
				<a
					class="btn btn-secondary btn-sm"
					href={`${REPO.docsBlobBase}/${featured.sourcePath}`}
					target="_blank"
					rel="noopener noreferrer"
				>
					Source ↗
				</a>
			</div>
		</div>

		<div class="showcase-side">
			{#each secondary as item (item.slug)}
				<a class="showcase-side-item" href={item.href}>
					<span class="hatch-sm" aria-hidden="true"></span>
					<span class="card-title">{item.title}</span>
					<span class="card-meta">{item.sectionTitle}</span>
				</a>
			{/each}

			{#if secondary.length === 0}
				<p class="text-muted" style="padding: var(--space-4);">
					No further examples in this section.
				</p>
			{/if}
		</div>
	</div>
{:else}
	<p class="text-muted">No showcase entries in this section.</p>
{/if}

<!-- ── Mini-projects (M10) ──────────────────────────────────────────────── -->
{#if mini.length}
	<section class="band">
		<p class="eyebrow">Mini-projects</p>
		<div class="three-up" data-fx="fade-up" data-fx-stagger="80">
			{#each mini as item (item.slug)}
				<Blueprint
					as="a"
					liftable
					href={item.href}
					data-fx="fade-up"
					style="padding: var(--space-4); display: grid; gap: var(--space-2); align-content: start; text-decoration: none; color: inherit;"
				>
					<span class="card-title">{item.title}</span>
					<span class="card-body">{item.description}</span>
					<span class="source-note">{item.sourcePath} ↗</span>
				</Blueprint>
			{/each}
		</div>
	</section>
{/if}

<!-- ── Repo CTA ─────────────────────────────────────────────────────────── -->
<section class="band" style="border-bottom: 0;">
	<div style="display: flex; align-items: center; gap: var(--space-6); flex-wrap: wrap;">
		<div style="flex: 1; min-width: 18rem;">
			<h2 class="chapter-title">Everything here is in the repo</h2>
			<p class="text-muted" style="max-width: 52ch;">
				The examples are authored alongside the language. Clone it, run the corpus, and adapt the pieces
				you need.
			</p>
		</div>
		<a class="btn btn-primary" href={REPO.url} target="_blank" rel="noopener noreferrer">Browse repo ↗</a>
	</div>
</section>
