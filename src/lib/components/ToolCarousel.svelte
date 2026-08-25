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
		{#each items as item, index (item.href)}
			<a class="carousel-card" href={item.href} style="--i: {index}">
				<!-- Name the section first, then say what it is; the contents list is
				     supporting detail and reads as noise above its own heading. -->
				<span class="card-title">{item.title}</span>
				<span class="card-body">{item.description}</span>

				<ul class="card-doclist">
					{#each item.docs as doc (doc.href)}
						<li>{doc.title}</li>
					{/each}
				</ul>

				<span class="card-go">
					Open section
					<span class="card-go-arrow" aria-hidden="true">→</span>
				</span>
			</a>
		{/each}
	</div>
</div>
