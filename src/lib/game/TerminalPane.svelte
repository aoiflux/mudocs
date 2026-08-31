<!--
	The left CRT pane: objective brief, the live board, and the VM output.

	The brief is typed with `createTypewriter` from `motion.ts` — unmodified, and
	already reduced-motion aware (it prints the final text instantly). The
	scanline and grain layers are pure CSS pseudo-elements on `.cb-crt`.
-->
<script lang="ts">
	import { createTypewriter } from '$lib/artist/motion';
	import AssemblySlots from './AssemblySlots.svelte';
	import type { Puzzle, Tile } from './types';

	let {
		puzzle,
		fills,
		armed = null,
		errorSlot = null,
		cursor = 0,
		active = false,
		solved = false,
		output = '',
		onSlot
	}: {
		puzzle: Puzzle;
		fills: (Tile | null)[];
		armed?: number | null;
		errorSlot?: number | null;
		cursor?: number;
		active?: boolean;
		solved?: boolean;
		/** VM output, printed only once the program actually runs. */
		output?: string;
		onSlot: (index: number) => void;
	} = $props();

	let brief = $state<HTMLParagraphElement | undefined>(undefined);

	// Re-types whenever the puzzle changes; reading `puzzle.brief` is the
	// subscription, and the returned cleanup cancels an in-flight run.
	$effect(() => {
		const text = puzzle.brief;
		const element = brief;
		if (!element) return;
		return createTypewriter(element, { mode: 'type', phrases: [text], typeSpeed: 18 });
	});
</script>

<section class="cb-pane cb-term cb-crt" aria-label="Objective and code board">
	<span class="cb-corner tl" aria-hidden="true"></span>
	<span class="cb-corner tr" aria-hidden="true"></span>
	<span class="cb-corner bl" aria-hidden="true"></span>
	<span class="cb-corner br" aria-hidden="true"></span>

	<div class="cb-pane-head">
		<span>{puzzle.title}</span>
		<span>codebreaker.mut</span>
	</div>

	<div class="cb-pane-body">
		<p class="cb-brief" bind:this={brief}>{puzzle.brief}</p>

		<AssemblySlots {puzzle} {fills} {armed} {errorSlot} {cursor} {active} {solved} {onSlot} />

		{#if output}
			<pre class="cb-out">{output}</pre>
		{/if}
	</div>
</section>
