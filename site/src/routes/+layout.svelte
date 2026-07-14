<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;700;800&display=swap"
		rel="stylesheet"
	/>
	<title>mudocs-next</title>
</svelte:head>

<div class="page-shell">
	<header class="panel" style="margin-bottom: 1rem;">
		<div style="display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: center;">
			<a href="/" style="font-size: 1.1rem; text-decoration: none; font-weight: 800; text-transform: uppercase;">
				mu docs // next
			</a>
			<nav style="display: flex; gap: 0.9rem; flex-wrap: wrap;">
				<a href="/docs">Docs</a>
				<a href="/playground">Playground</a>
				<a href="/docs/overview">Overview</a>
				<a href="/docs/reference">Reference</a>
				<a href="/docs/security">Security</a>
				<a href="/docs/runtime">Runtime</a>
				<a href="/docs/themes">Themes</a>
				<a href="/docs/quality">Quality</a>
				<a href="/about">About</a>
			</nav>
		</div>
	</header>

	{@render children()}
</div>
