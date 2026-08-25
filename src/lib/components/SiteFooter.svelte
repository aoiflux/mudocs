<script lang="ts">
	import { REPO, SITE } from '$lib/site';

	let { totalDocs = 0 }: { totalDocs?: number } = $props();
</script>

<footer class="site-footer">
	<div class="site-footer-inner">
		<div class="footer-col">
			<a class="site-brand" href="/">
				<span class="brand-mark" aria-hidden="true"></span>
				<span>mudocs</span>
			</a>
			<p class="text-muted" style="font-size: 13px; max-width: 34ch;">
				Documentation for Mutant — a language built for practical security work, forensic automation and
				cross-platform analysis tooling.
			</p>
			<a class="btn btn-secondary btn-sm" href={REPO.url} target="_blank" rel="noopener noreferrer">
				Read the source ↗
			</a>
		</div>

		<div class="footer-col">
			<p class="eyebrow">Docs</p>
			<a href="/docs">All docs</a>
			<a href="/docs/overview">Overview</a>
			<a href="/docs/reference">Reference</a>
			<a href="/docs/runtime">Runtime</a>
			<a href="/docs/security">Security</a>
			<a href="/docs/tooling">Tooling</a>
		</div>

		<div class="footer-col">
			<p class="eyebrow">Explore</p>
			<a href="/playground">Playground</a>
			<a href="/showcase">Showcase</a>
			<a href="/extension">Extension</a>
			<a href="/search">Search</a>
			<a href="/docs/themes">Themes</a>
		</div>

		<div class="footer-col">
			<p class="eyebrow">Project</p>
			<a href={REPO.url} target="_blank" rel="noopener noreferrer">{REPO.slug} ↗</a>
			<a href={`${REPO.url}/issues`} target="_blank" rel="noopener noreferrer">Issues ↗</a>
			<a href="/about">About</a>
		</div>
	</div>

	<div class="footer-colophon">
		<span>{SITE.name} · built from the Mutant docs corpus</span>
		<a href="/sitemap.xml">sitemap.xml</a>
	</div>
</footer>
