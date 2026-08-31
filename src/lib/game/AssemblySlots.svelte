<!--
	The code board.

	The puzzle is a template of lines made of fixed text, indentation and holes.
	Fixed text is run through `lexFixed` and painted with the same categories the
	tray tiles use, so a token looks identical whether it is part of the scaffold
	or something the player put there.

	Slots are real `<button>`s rather than the `list`/`listitem` pair: a button is
	natively focusable, announces its own label, and can carry `aria-disabled`
	state — inline list semantics inside a code line would have given a screen
	reader less, not more. Each carries `data-slot` and `data-empty`, which is how
	`dnd.ts` finds its magnet targets without any prop plumbing.
-->
<script lang="ts">
	import { lexFixed } from './lexer';
	import type { Puzzle, Tile, TokenCategory } from './types';

	let {
		puzzle,
		fills,
		armed = null,
		errorSlot = null,
		cursor = 0,
		active = false,
		solved = false,
		onSlot
	}: {
		puzzle: Puzzle;
		fills: (Tile | null)[];
		armed?: number | null;
		errorSlot?: number | null;
		cursor?: number;
		/** True when the roving focus lives on the board. */
		active?: boolean;
		solved?: boolean;
		onSlot: (index: number) => void;
	} = $props();

	/** Matches the indent width `puzzles.ts` encodes depths with. */
	const INDENT_WIDTH = 4;

	type Part = { text: string; category: TokenCategory | null };

	/** Split fixed template text into coloured runs, preserving every space. */
	function paint(text: string): Part[] {
		const parts: Part[] = [];
		let at = 0;
		for (const token of lexFixed(text, 1, 1)) {
			const start = token.col - 1;
			if (start > at) parts.push({ text: text.slice(at, start), category: null });
			parts.push({ text: token.literal, category: token.category });
			at = start + token.literal.length;
		}
		if (at < text.length) parts.push({ text: text.slice(at), category: null });
		return parts;
	}

	let elements = $state<(HTMLButtonElement | undefined)[]>([]);

	$effect(() => {
		if (!active) return;
		const element = elements[cursor];
		if (element && document.activeElement !== element) element.focus();
	});

	function describe(index: number): string {
		const spec = puzzle.slots[index];
		const tile = fills[index];
		const total = puzzle.slots.length;
		return `Slot ${index + 1} of ${total}, ${spec.label}, ${tile ? tile.literal : 'empty'}`;
	}
</script>

<div class="cb-source" class:is-sweeping={solved} role="group" aria-label={`Code board — ${puzzle.slots.length} slots`}>
	{#each puzzle.lines as line (line.n)}
		<div class="cb-line">
			<span class="cb-ln" aria-hidden="true">{line.n}</span>
			<span class="cb-line-body">
				{#each line.segments as segment, position (position)}
					{#if segment.kind === 'indent'}
						<span>{' '.repeat(segment.depth * INDENT_WIDTH)}</span>
					{:else if segment.kind === 'fixed'}
						{#each paint(segment.text) as part, partIndex (partIndex)}
							{#if part.category}
								<span class="cb-tok" data-cat={part.category}>{part.text}</span>
							{:else}
								<span>{part.text}</span>
							{/if}
						{/each}
					{:else}
						{@const index = segment.index}
						{@const tile = fills[index]}
						<button
							bind:this={elements[index]}
							type="button"
							class="cb-slot cb-tok"
							class:is-armed={armed === index}
							class:is-filled={tile != null}
							class:is-error={errorSlot === index}
							class:is-verified={solved}
							class:is-cursor={active && cursor === index}
							data-slot={index}
							data-empty={tile == null}
							data-cat={tile?.category ?? 'punctuation'}
							style={`min-width: ${puzzle.slots[index].width + 1}ch`}
							tabindex={cursor === index ? 0 : -1}
							aria-label={describe(index)}
							onclick={() => onSlot(index)}
						>
							{tile ? tile.literal : '_'.repeat(puzzle.slots[index].width)}
						</button>
					{/if}
				{/each}
			</span>
		</div>
	{/each}
</div>
