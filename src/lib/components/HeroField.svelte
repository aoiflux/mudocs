<script lang="ts">
	/** M2 — the blueprint grid behind the hero, with cursor-reactive nodes. */
	import { onMount } from 'svelte';
	import { initHeroField, initParallax } from '$lib/artist/motion';

	let canvas: HTMLCanvasElement;

	onMount(() => {
		const stopField = initHeroField(canvas);
		const stopParallax = initParallax(canvas.parentElement ?? document);
		return () => {
			stopField();
			stopParallax();
		};
	});
</script>

<div class="hero-field" data-parallax-depth="0.18" aria-hidden="true"></div>
<canvas class="hero-canvas" bind:this={canvas} aria-hidden="true"></canvas>
