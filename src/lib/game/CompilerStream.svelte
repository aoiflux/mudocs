<!--
	The compiler log.

	This is not a decoration around the game — for a screen-reader user it *is*
	the game. Every diagnostic, every stage transition, every wasm reply and every
	hint is written here as prose, so `role="log" aria-live="polite"` narrates a
	complete account of what happened without ever describing the board visually.
-->
<script lang="ts">
	import type { LogLine } from './state.svelte';

	let { lines }: { lines: LogLine[] } = $props();

	let view = $state<HTMLDivElement | undefined>(undefined);

	// Follow the tail. Reading `lines.length` is what subscribes this effect.
	$effect(() => {
		const count = lines.length;
		const element = view;
		if (!element || count === 0) return;
		element.scrollTop = element.scrollHeight;
	});
</script>

<div bind:this={view} class="cb-stream-log" role="log" aria-live="polite" aria-label="Compiler output">
	{#each lines as line (line.id)}
		<p class="cb-log-line" data-kind={line.kind}>
			{#if line.source}<span class="cb-log-source">[{line.source}]</span>{/if}
			<span>{line.text}</span>
		</p>
	{/each}
</div>
