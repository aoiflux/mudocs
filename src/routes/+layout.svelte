<script lang="ts">
	import { goto } from '$app/navigation';
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';

	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	let { children } = $props();
	type ThemeMode = 'light' | 'dark' | 'artist' | 'auto';
	let themeMode = $state<ThemeMode>('auto');

	const THEME_KEY = 'mudocs-theme-mode';
	const MERMAID_SRC = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';

	type MermaidApi = {
		initialize: (config: Record<string, unknown>) => void;
		render: (id: string, source: string) => Promise<{ svg: string }>;
	};

	type MermaidWindow = Window & {
		mermaid?: MermaidApi;
	};

	let hasMounted = false;

	function resolveAutoTheme(): 'light' | 'dark' {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	function applyTheme(mode: ThemeMode, animate = false) {
		if (typeof document === 'undefined') return;
		const resolved = mode === 'auto' ? resolveAutoTheme() : mode;

		if (animate && hasMounted) {
			document.documentElement.classList.remove('theme-shift');
			void document.documentElement.offsetWidth;
			document.documentElement.classList.add('theme-shift');
			window.setTimeout(() => {
				document.documentElement.classList.remove('theme-shift');
			}, 620);
		}

		document.documentElement.setAttribute('data-theme', resolved);
	}

	async function ensureMermaid(): Promise<MermaidApi | null> {
		if (typeof window === 'undefined') return null;
		const host = window as MermaidWindow;
		if (host.mermaid) return host.mermaid;

		const existing = document.querySelector<HTMLScriptElement>('script[data-mermaid-runtime="1"]');
		if (existing) {
			await new Promise<void>((resolve) => {
				if ((window as MermaidWindow).mermaid) {
					resolve();
					return;
				}
				existing.addEventListener('load', () => resolve(), { once: true });
				existing.addEventListener('error', () => resolve(), { once: true });
			});
			return host.mermaid ?? null;
		}

		const script = document.createElement('script');
		script.src = MERMAID_SRC;
		script.async = true;
		script.dataset.mermaidRuntime = '1';
		document.head.appendChild(script);

		await new Promise<void>((resolve) => {
			script.addEventListener('load', () => resolve(), { once: true });
			script.addEventListener('error', () => resolve(), { once: true });
		});

		return host.mermaid ?? null;
	}

	async function renderMermaidDiagrams() {
		if (typeof document === 'undefined') return;
		const targets = document.querySelectorAll<HTMLElement>('.diagram-mermaid');
		if (targets.length === 0) return;

		const mermaid = await ensureMermaid();
		if (!mermaid) {
			for (const target of targets) {
				target.innerHTML =
					'<p class="diagram-error">Mermaid runtime unavailable. Check network access or retry online.</p>';
			}
			return;
		}
		const activeTheme = document.documentElement.getAttribute('data-theme');
		const mermaidTheme = activeTheme === 'dark' || activeTheme === 'artist' ? 'dark' : 'default';
		mermaid.initialize({ startOnLoad: false, theme: mermaidTheme });

		for (const target of targets) {
			const source = target.dataset.diagramSource;
			if (!source) continue;

			try {
				const decoded = decodeURIComponent(source);
				const id = `diagram-${Math.random().toString(36).slice(2, 11)}`;
				const { svg } = await mermaid.render(id, decoded);
				target.innerHTML = svg;
			} catch {
				target.innerHTML = '<p class="diagram-error">Diagram failed to render. Check syntax.</p>';
			}
		}
	}

	function onGlobalKeydown(event: KeyboardEvent) {
		const isMetaSearch = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
		if (!isMetaSearch) return;

		event.preventDefault();
		void goto('/search?focus=1');
	}

	function onThemeChange(event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		themeMode = select.value as ThemeMode;
		localStorage.setItem(THEME_KEY, themeMode);
		applyTheme(themeMode, true);
		void renderMermaidDiagrams();
	}

	function onThemeRequest(event: Event) {
		const request = event as CustomEvent<{ mode?: ThemeMode }>;
		const requested = request.detail?.mode;
		if (requested !== 'light' && requested !== 'dark' && requested !== 'artist' && requested !== 'auto') {
			return;
		}

		themeMode = requested;
		localStorage.setItem(THEME_KEY, themeMode);
		applyTheme(themeMode, true);
		void renderMermaidDiagrams();
	}

	onMount(() => {
		const stored = localStorage.getItem(THEME_KEY);
		if (stored === 'light' || stored === 'dark' || stored === 'artist' || stored === 'auto') {
			themeMode = stored;
		}

		applyTheme(themeMode);
		void renderMermaidDiagrams();
		hasMounted = true;

		const media = window.matchMedia('(prefers-color-scheme: dark)');
		const onSchemeChange = () => {
			if (themeMode === 'auto') {
				applyTheme('auto');
				void renderMermaidDiagrams();
			}
		};

		media.addEventListener('change', onSchemeChange);
		window.addEventListener('keydown', onGlobalKeydown);
		window.addEventListener('mudocs:set-theme', onThemeRequest as EventListener);
		afterNavigate(() => {
			applyTheme(themeMode);
			void renderMermaidDiagrams();
		});

		return () => {
			media.removeEventListener('change', onSchemeChange);
			window.removeEventListener('keydown', onGlobalKeydown);
			window.removeEventListener('mudocs:set-theme', onThemeRequest as EventListener);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;700;800&display=swap"
		rel="stylesheet"
	/>
	<title>Mudocs</title>
</svelte:head>

<div class="page-shell">
	<header class="panel" style="margin-bottom: 1rem;">
		<div style="display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: center;">
			<a class="site-brand" href="/">
				<img src={favicon} alt="Mudocs logo" />
				<span>mu docs // next</span>
			</a>
			<form action="/search" method="GET" class="quick-search" role="search">
				<input name="q" type="search" placeholder="Search docs..." aria-label="Search docs" required />
				<button type="submit">Find</button>
			</form>
			<nav style="display: flex; gap: 0.9rem; flex-wrap: wrap;">
				<a href="/docs">Docs</a>
				<a href="/search">Search</a>
				<a href="/playground">Playground</a>
				<a href="/theme-lab">Theme Lab</a>
				<a href="https://github.com/aoiflux/mutant" target="_blank" rel="noopener noreferrer">GitHub</a>
				<a href="/docs/overview">Overview</a>
				<a href="/docs/reference">Reference</a>
				<a href="/docs/security">Security</a>
				<a href="/docs/runtime">Runtime</a>
				<a href="/docs/tooling">Tooling</a>
				<a href="/docs/themes">Themes</a>
				<a href="/docs/quality">Quality</a>
				<a href="/about">About</a>
			</nav>
			<label class="theme-control">
				<span>Theme</span>
				<select value={themeMode} onchange={onThemeChange}>
					<option value="light">Light</option>
					<option value="dark">Dark</option>
					<option value="artist">Artist</option>
					<option value="auto">Auto</option>
				</select>
			</label>
		</div>
	</header>

	{@render children()}
</div>
