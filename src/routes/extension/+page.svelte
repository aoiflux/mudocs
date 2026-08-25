<script lang="ts">
	/** Artboard 2e — two-up hero with the editor preview, install stepper, feature reel. */
	import SeoHead from '$lib/components/SeoHead.svelte';
	import EditorMock from '$lib/components/EditorMock.svelte';
	import Stepper from '$lib/components/Stepper.svelte';
	import FeatureCard from '$lib/components/FeatureCard.svelte';
	import { EXTENSION, REPO } from '$lib/site';

	let { data } = $props();
	const ext = $derived(data.extension);

	let copied = $state(false);
	let installed = $state(false);
	let copyTimer: number;

	async function copyInstall() {
		try {
			await navigator.clipboard.writeText(EXTENSION.installCommand);
			copied = true;
			clearTimeout(copyTimer);
			copyTimer = window.setTimeout(() => (copied = false), 1600);
		} catch {
			copied = false;
		}
	}

	// M11 — the install CTA acknowledges the click before handing off to the
	// marketplace, which opens in a new tab.
	function onInstall() {
		installed = true;
		window.setTimeout(() => (installed = false), 2000);
	}
</script>

<SeoHead
	title="VSCode extension"
	description="Mutant for VSCode — a Go-style language server with diagnostics, formatting, hover, signature help and semantic tokens."
/>

<!-- ── Hero ─────────────────────────────────────────────────────────────── -->
<div class="ext-split">
	<div class="ext-copy">
		<p class="eyebrow">Mutant for VSCode</p>
		<h1>{ext.title}</h1>
		<p class="lede" style="font-size: 16px;">{ext.lede}</p>

		<div class="cta-cluster">
			<a
				class="btn btn-primary pulse"
				href={EXTENSION.marketplaceUrl}
				target="_blank"
				rel="noopener noreferrer"
				onclick={onInstall}
			>
				{installed ? 'Opening ✓' : 'Install'}
			</a>
		</div>

		<div class="copy-row" style="margin-top: var(--space-4);">
			<span>{EXTENSION.installCommand}</span>
			<button type="button" onclick={copyInstall}>{copied ? 'copied' : 'copy'}</button>
		</div>
	</div>

	<!-- M12 — the completions type themselves. -->
	<EditorMock
		suggestions={[
			'forensics_timeline(target)',
			'process_scan(pid, "deep")',
			'artifact_sign(report, key)'
		]}
	/>
</div>

<!-- ── Install stepper ──────────────────────────────────────────────────── -->
{#if ext.steps.length}
	<section class="band">
		<p class="eyebrow">Install in {ext.steps.length === 3 ? 'three' : ext.steps.length} steps</p>
		<Stepper steps={ext.steps} current={1} />
		{#if ext.onboarding}
			<p style="margin-top: var(--space-6);">
				<a class="source-note" href={ext.onboarding.href}>from {ext.onboarding.sourcePath} ↗</a>
			</p>
		{/if}
	</section>
{/if}

<!-- ── Features ─────────────────────────────────────────────────────────── -->
{#if ext.features.length}
	<section class="band">
		<p class="eyebrow">Features</p>
		<div class="four-up" data-fx="fade-up" data-fx-stagger="80">
			{#each ext.features as feature (feature.title)}
				<FeatureCard title={feature.title} body={feature.body} href={feature.href} />
			{/each}
		</div>
		{#if ext.lld}
			<p style="margin-top: var(--space-6);">
				<a class="source-note" href={ext.lld.href}>from {ext.lld.sourcePath} ↗</a>
			</p>
		{/if}
	</section>
{/if}

<!-- ── Closing CTAs ─────────────────────────────────────────────────────── -->
<section class="band" style="border-bottom: 0;">
	<div style="display: flex; align-items: center; gap: var(--space-6); flex-wrap: wrap;">
		<div style="flex: 1; min-width: 18rem;">
			<h2 class="chapter-title">Read the design before you change it</h2>
			<p class="text-muted" style="max-width: 52ch;">
				The language server and the extension are documented end to end — request flows, deterministic
				behavior rules, and the change playbooks for each capability.
			</p>
		</div>
		<div class="cta-cluster" style="margin-top: 0;">
			{#if ext.onboarding}
				<a class="btn btn-secondary" href={ext.onboarding.href}>Onboarding guide</a>
			{/if}
			<a class="btn btn-ghost" href={REPO.url} target="_blank" rel="noopener noreferrer">Repo ↗</a>
		</div>
	</div>
</section>
