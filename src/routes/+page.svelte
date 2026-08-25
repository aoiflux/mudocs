<script lang="ts">
	/** Artboard 2a — hero → what/pipeline → why → carousel → extension → repo. */
	import { onMount } from 'svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import Blueprint from '$lib/components/Blueprint.svelte';
	import HeroField from '$lib/components/HeroField.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import PipelineDiagram from '$lib/components/PipelineDiagram.svelte';
	import ToolCarousel from '$lib/components/ToolCarousel.svelte';
	import FeatureCard from '$lib/components/FeatureCard.svelte';
	import { loadRepoStats, type RepoStats } from '$lib/github';
	import { rollCounter } from '$lib/artist/motion';
	import { REPO } from '$lib/site';

	let { data } = $props();
	const landing = $derived(data.landing);

	let stats = $state<RepoStats | null>(null);
	let starsEl: HTMLSpanElement | undefined = $state();
	let forksEl: HTMLSpanElement | undefined = $state();

	onMount(async () => {
		stats = await loadRepoStats();
	});

	// M7 — counters roll once the numbers land and the band is on screen.
	$effect(() => {
		if (!stats || !starsEl || !forksEl) return;
		const stops = [rollCounter(starsEl, stats.stars), rollCounter(forksEl, stats.forks)];
		return () => stops.forEach((stop) => stop());
	});
</script>

<SeoHead
	title="Mutant documentation"
	description={landing.hero.lede || undefined}
/>

<!-- ── Hero ─────────────────────────────────────────────────────────────── -->
<section class="hero">
	<HeroField />

	<div class="hero-inner">
		<div class="hero-copy">
			<p class="eyebrow">{landing.hero.kicker}</p>
			<h1 class="big-title">{landing.hero.title}</h1>
			<p class="lede" style="margin-top: var(--space-4);">{landing.hero.lede}</p>

			<div class="cta-cluster">
				<a class="btn btn-primary" href="https://github.com/aoiflux/mutant/releases">Get Mutant</a>
				<a class="btn btn-secondary" href={REPO.url} target="_blank" rel="noopener noreferrer">Repo ↗</a>
			</div>

			{#if landing.hero.sourcePath && landing.hero.href}
				<p style="margin-top: var(--space-6);">
					<a class="source-note" href={landing.hero.href}>from {landing.hero.sourcePath} ↗</a>
				</p>
			{/if}
		</div>

		<div class="mascot-slot" aria-hidden="true">
			<Mascot size={168} />
		</div>
	</div>
</section>

<!-- ── What is Mutant · Pipeline ────────────────────────────────────────── -->
<section class="band">
	<div class="two-up">
		<div data-fx="fade-up">
			<p class="eyebrow">What is Mutant</p>
			<p style="max-width: 46ch;">{landing.whatIs.summary}</p>

			{#if landing.whatIs.bullets.length}
				<ul style="margin: 0 0 var(--space-4); padding-left: var(--space-4); font-size: 14px; color: var(--ink-soft);">
					{#each landing.whatIs.bullets as bullet (bullet)}
						<li>{bullet}</li>
					{/each}
				</ul>
			{/if}

			{#if landing.whatIs.sourcePath && landing.whatIs.href}
				<a class="source-note" href={landing.whatIs.href}>from {landing.whatIs.sourcePath} ↗</a>
			{/if}
		</div>

		<div data-fx="fade-up">
			<p class="eyebrow">Pipeline</p>
			<!-- M3 — traced left to right when the band scrolls into view. -->
			<PipelineDiagram
				nodes={landing.pipeline}
				label="The parser builds an AST, the compiler emits bytecode from it, the VM runs the bytecode"
			/>
			<p class="text-muted" style="margin-top: var(--space-4); font-size: 13px; max-width: 42ch;">
				The parser builds an AST and the compiler walks it, emitting a flat byte stream directly —
				nothing sits in between. The VM then runs those bytes on an expression stack, with the
				polymorphic engine free to mutate them on the way through.
			</p>
			<a class="source-note" href="/docs/runtime/bytecode_ir">Bytecode IR reference ↗</a>
		</div>
	</div>
</section>

<!-- ── Why Mutant ───────────────────────────────────────────────────────── -->
<section class="band">
	<p class="eyebrow">Why Mutant · four value props</p>
	<div class="four-up" data-fx="fade-up" data-fx-stagger="90">
		{#each landing.valueProps as prop (prop.title)}
			<FeatureCard title={prop.title} body={prop.body} href={prop.href} />
		{/each}
	</div>
</section>

<!-- ── Tool carousel ────────────────────────────────────────────────────── -->
<section class="band">
	<div class="band-head">
		<p class="eyebrow" style="margin-bottom: var(--space-4);">Tool carousel · drag to scroll</p>
		<a class="source-note" href="/docs">All docs ↗</a>
	</div>
	<ToolCarousel items={landing.tools} />
</section>

<!-- ── Extension · Repo ─────────────────────────────────────────────────── -->
<section class="band" style="border-bottom: 0;">
	<div class="two-up">
		<div data-fx="fade-up">
			<p class="eyebrow">VSCode extension</p>
			<h2 class="chapter-title">{landing.extension.title}</h2>
			<p class="lede" style="font-size: 15px; margin-top: var(--space-3);">{landing.extension.summary}</p>
			<div class="cta-cluster">
				<!-- M6 — the install CTA pulses. -->
				<a class="btn btn-primary pulse" href="/extension">Install</a>
				{#if landing.extension.href}
					<a class="btn btn-ghost" href={landing.extension.href}>Onboarding guide</a>
				{/if}
			</div>
			{#if landing.extension.sourcePath}
				<p style="margin-top: var(--space-4);">
					<span class="source-note">from {landing.extension.sourcePath}</span>
				</p>
			{/if}
		</div>

		<div data-fx="fade-up">
			<p class="eyebrow">Repo</p>
			{#if stats}
				<div class="repo-stats">
					<Blueprint class="stat-card">
						<span class="stat-value" bind:this={starsEl}>0</span>
						<span class="stat-label">Stars</span>
					</Blueprint>
					<Blueprint class="stat-card">
						<span class="stat-value" bind:this={forksEl}>0</span>
						<span class="stat-label">Forks</span>
					</Blueprint>
				</div>
			{:else}
				<!-- No counters rather than zeros: the API is rate-limited per IP and
				     a real repo reading "0 stars" is worse than reading nothing. -->
				<p class="text-muted" style="font-size: 14px;">{REPO.slug}</p>
			{/if}

			<div class="cta-cluster">
				<a class="btn btn-secondary" href={REPO.url} target="_blank" rel="noopener noreferrer">
					Browse repo ↗
				</a>
			</div>
		</div>
	</div>
</section>
