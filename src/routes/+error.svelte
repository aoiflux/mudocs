<script lang="ts">
	import { page } from '$app/state';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import Blueprint from '$lib/components/Blueprint.svelte';
</script>

<SeoHead title={`${page.status}`} description="That page could not be found." index={false} />

<section class="band" style="padding-top: var(--space-8); border-bottom: 0;">
	<p class="eyebrow">Error {page.status}</p>
	<h1 class="big-title">{page.error?.message ?? 'Something went wrong'}</h1>
	<p class="lede">
		The page you asked for is not part of this corpus. Try the documentation index, or search for what you
		were after.
	</p>

	<div class="cta-cluster">
		<a class="btn btn-primary" href="/docs">All docs</a>
		<a class="btn btn-secondary" href="/">Home</a>
	</div>

	<div class="three-up" style="margin-top: var(--space-8);">
		<Blueprint as="a" liftable href="/search" style="padding: var(--space-4); display: grid; gap: var(--space-2); text-decoration: none; color: inherit;">
			<span class="card-title">Search</span>
			<span class="card-body">Full-text ranking across every document.</span>
		</Blueprint>
		<Blueprint as="a" liftable href="/playground" style="padding: var(--space-4); display: grid; gap: var(--space-2); text-decoration: none; color: inherit;">
			<span class="card-title">Playground</span>
			<span class="card-body">Run Mutant in the browser.</span>
		</Blueprint>
		<Blueprint as="a" liftable href="/showcase" style="padding: var(--space-4); display: grid; gap: var(--space-2); text-decoration: none; color: inherit;">
			<span class="card-title">Showcase</span>
			<span class="card-body">Worked examples from the corpus.</span>
		</Blueprint>
	</div>
</section>
