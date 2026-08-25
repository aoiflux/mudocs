<script lang="ts">
	/** The accordion section tree from artboard 2b, shared by every /docs route. */
	import { page } from '$app/state';
	import type { SidebarSection } from '$lib/server/page-content';

	let { tree }: { tree: SidebarSection[] } = $props();

	// Open the section the reader is currently in; collapse the rest.
	let open = $state<Record<string, boolean>>({});

	$effect(() => {
		const active = tree.find((section) => page.url.pathname.startsWith(section.href));
		if (active && open[active.section] === undefined) {
			open = { ...open, [active.section]: true };
		}
	});

	function toggle(key: string) {
		open = { ...open, [key]: !open[key] };
	}

	function isOpen(section: SidebarSection): boolean {
		return open[section.section] ?? page.url.pathname.startsWith(section.href);
	}
</script>

<aside class="docs-sidebar" aria-label="Documentation">
	<form class="sidebar-search" action="/search" method="GET" role="search">
		<input class="input" name="q" type="search" placeholder="Search docs" aria-label="Search docs" />
		<button class="btn btn-secondary btn-sm" type="submit">Go</button>
	</form>

	<nav>
		{#each tree as section (section.section)}
			<div class="tree-section">
				<button
					type="button"
					class="tree-toggle"
					aria-expanded={isOpen(section)}
					onclick={() => toggle(section.section)}
				>
					<span>{section.title}</span>
					<span class="sign" aria-hidden="true">{isOpen(section) ? '−' : '+'}</span>
				</button>

				{#if isOpen(section)}
					<div class="tree-links">
						<a href={section.href} class:is-current={page.url.pathname === section.href}>
							All {section.title.toLowerCase()} ({section.docs.length})
						</a>
						{#each section.docs as doc (doc.slug)}
							<a href={doc.href} class:is-current={page.url.pathname === doc.href}>{doc.title}</a>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</nav>
</aside>
