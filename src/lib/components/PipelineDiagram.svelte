<script lang="ts">
	/**
	 * The node -> rule -> node chain the artboards draw twice: AST/IR/EXEC on the
	 * landing (M3, traced left to right on scroll) and parse/lower/mutate/verify/
	 * exec on the playground (M9, nodes light in run order).
	 *
	 * `activeIndex` drives it imperatively when a real run is in flight; leave it
	 * null and the chain traces itself once when scrolled into view.
	 */
	import { onMount } from 'svelte';
	import { prefersReducedMotion } from '$lib/artist/motion';

	let {
		nodes,
		activeIndex = null,
		step = 260,
		label = ''
	}: {
		nodes: string[];
		/** How many nodes are lit, counting from the left. Null = self-tracing. */
		activeIndex?: number | null;
		step?: number;
		label?: string;
	} = $props();

	let host: HTMLDivElement;
	let traced = $state(0);

	const lit = $derived(activeIndex === null ? traced : activeIndex);

	onMount(() => {
		if (activeIndex !== null) return;

		if (prefersReducedMotion()) {
			traced = nodes.length;
			return;
		}

		let timers: number[] = [];
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				observer.disconnect();
				nodes.forEach((_, index) => {
					timers.push(window.setTimeout(() => (traced = index + 1), index * step));
				});
			},
			{ threshold: 0.4 }
		);

		if (host) observer.observe(host);

		return () => {
			observer.disconnect();
			for (const timer of timers) window.clearTimeout(timer);
		};
	});
</script>

<div class="pipeline" bind:this={host} role="img" aria-label={label || nodes.join(' then ')}>
	{#each nodes as node, index (node)}
		{#if index > 0}
			<span class="pipeline-rule" class:is-lit={lit > index} aria-hidden="true"></span>
		{/if}
		<span class="pipeline-node" class:is-lit={lit > index}>{node}</span>
	{/each}
</div>
