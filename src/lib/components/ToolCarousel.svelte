<script lang="ts">
	/** M5 — drag or wheel the rail; it carries momentum and rubber-bands at the ends. */
	import { onMount } from 'svelte';
	import { attachMomentumScroll } from '$lib/artist/motion';
	import type { ToolCard } from '$lib/server/page-content';

	let { items }: { items: ToolCard[] } = $props();

	let viewport: HTMLDivElement;
	let track: HTMLDivElement;

	onMount(() => attachMomentumScroll(viewport, track));
</script>

<div class="carousel" bind:this={viewport}>
	<div class="carousel-track" bind:this={track}>
		{#each items as item (item.href)}
			<a class="carousel-card" href={item.href}>
				<span class="card-kicker">{item.count} {item.count === 1 ? 'doc' : 'docs'}</span>
				<span class="hatch" aria-hidden="true"></span>
				<span class="card-title">{item.title}</span>
				<span class="card-body">{item.description}</span>
			</a>
		{/each}
	</div>
</div>
