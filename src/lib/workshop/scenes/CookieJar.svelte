<script lang="ts">
	/**
	 * Sites the history visited beside the cookies the jar holds. Steps: the
	 * visits (visits), the cookies (cookies), and the cookies whose site was
	 * never visited (orphans).
	 */
	import './scene.css';
	import type { CookieJarData } from './data';

	let { data, shown, focus }: { data: CookieJarData; shown: ReadonlySet<string>; focus: string } = $props();

	const visited = $derived(new Set(data.visited));
	const on = (part: string) => (focus === part ? '' : undefined);
</script>

<div class="scene cj">
	<section class="cj-col" data-on={on('visits')} aria-label="Visited sites">
		<h4 class="cj-head">History: sites visited</h4>
		<ul>
			{#each data.visited as site (site)}<li>{site}</li>{/each}
		</ul>
	</section>

	{#if shown.has('cookies')}
		<section class="cj-col scene-reveal" data-on={on('cookies')} aria-label="Cookies">
			<h4 class="cj-head">Cookie jar</h4>
			<ul>
				{#each data.cookies as cookie, i (i)}
					{@const orphan = !visited.has(cookie.site)}
					<li data-dim={shown.has('orphans') && !orphan ? '' : undefined}>
						{cookie.site} · {cookie.name}
						{#if shown.has('orphans')}
							<span class="scene-reveal {orphan ? 'scene-flag' : ''}">visited: {orphan ? 'false' : 'true'}</span>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

<style>
	.cj {
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		align-items: start;
	}

	.cj-col {
		padding: var(--space-3);
	}

	.cj-head {
		margin: 0 0 var(--space-2);
		font-size: 12px;
		font-weight: 600;
	}

	.cj ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: var(--space-2);
	}

	.cj li {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
</style>
