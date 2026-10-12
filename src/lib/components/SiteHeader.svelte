<script lang="ts">
	/**
	 * The app bar the artboards draw: wordmark, four nav slots with a Docs
	 * dropdown, GitHub star count, theme control.
	 *
	 * M1 — a sentinel above the bar flips `is-stuck`, which adds the hairline and
	 * shadow once the page has scrolled past the fold.
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import GithubStat from './GithubStat.svelte';
	import { NAV, REPO } from '$lib/site';

	type ThemeMode = 'light' | 'dark' | 'artist' | 'auto';

	let {
		themeMode = 'auto',
		onThemeChange
	}: {
		themeMode?: ThemeMode;
		onThemeChange?: (event: Event) => void;
	} = $props();

	let stuck = $state(false);
	let sentinel: HTMLDivElement;
	let menuOpen = $state(false);
	let docsNav = $state<HTMLDivElement | undefined>();

	const docsMenu = [
		{ href: '/docs', label: 'All docs' },
		{ href: '/docs/overview', label: 'Overview' },
		{ href: '/docs/reference', label: 'Reference' },
		{ href: '/docs/runtime', label: 'Runtime' },
		{ href: '/docs/security', label: 'Security' },
		{ href: '/docs/tooling', label: 'Tooling' }
	];

	const docsMenuSecondary = [
		{ href: '/docs/security/advisories', label: 'Security advisories' },
		{ href: '/docs/themes', label: 'Browse by theme' },
		{ href: '/search', label: 'Search' },
		{ href: '/about', label: 'About' }
	];

	function isCurrent(href: string): boolean {
		if (href === '/docs') return page.url.pathname.startsWith('/docs');
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	function onDocumentClick(event: MouseEvent) {
		if (!menuOpen) return;
		if (docsNav && !docsNav.contains(event.target as Node)) menuOpen = false;
	}

	function onDocumentKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') menuOpen = false;
	}

	onMount(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				stuck = !entry.isIntersecting;
			},
			{ rootMargin: '0px' }
		);
		if (sentinel) observer.observe(sentinel);

		document.addEventListener('click', onDocumentClick);
		document.addEventListener('keydown', onDocumentKeydown);

		return () => {
			observer.disconnect();
			document.removeEventListener('click', onDocumentClick);
			document.removeEventListener('keydown', onDocumentKeydown);
		};
	});
</script>

<div bind:this={sentinel} aria-hidden="true"></div>

<header class="site-header" class:is-stuck={stuck}>
	<div class="site-header-inner">
		<a class="site-brand" href="/">
			<span class="brand-mark" aria-hidden="true"></span>
			<span>mudocs</span>
		</a>

		<nav class="site-nav" aria-label="Primary">
			{#each NAV as item (item.href)}
				{#if item.hasMenu}
					<div class="nav-dropdown" bind:this={docsNav}>
						<button
							type="button"
							class="nav-link"
							class:is-current={isCurrent(item.href)}
							aria-expanded={menuOpen}
							aria-haspopup="true"
							onclick={() => (menuOpen = !menuOpen)}
						>
							{item.label}
							<span aria-hidden="true">▾</span>
						</button>
						{#if menuOpen}
							<div class="nav-menu">
								{#each docsMenu as link (link.href)}
									<a href={link.href} onclick={() => (menuOpen = false)}>{link.label}</a>
								{/each}
								<div class="nav-menu-sep" aria-hidden="true"></div>
								{#each docsMenuSecondary as link (link.href)}
									<a href={link.href} onclick={() => (menuOpen = false)}>{link.label}</a>
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<a
						class="nav-link"
						class:nav-accent={item.accent}
						class:is-current={isCurrent(item.href)}
						href={item.href}
					>
						{item.label}
					</a>
				{/if}
			{/each}
		</nav>

		<div class="header-right">
			<GithubStat />
			<a class="gh-stat" href={REPO.url} target="_blank" rel="noopener noreferrer">Repo ↗</a>
			<label class="theme-control">
				<span>Theme</span>
				<select value={themeMode} onchange={onThemeChange} aria-label="Color theme">
					<option value="light">Light</option>
					<option value="dark">Dark</option>
					<option value="auto">Auto</option>
					{#if themeMode === 'artist'}
						<option value="artist">Artist</option>
					{/if}
				</select>
			</label>
		</div>
	</div>
</header>
