<!--
	The token tray.

	A `listbox` of `option`s, because that is exactly what it is: a set of tokens
	of which one may be selected and carried. Pointer input goes to `dnd.ts` via
	`pointerdown` — never `click` — so a press below the 6 px threshold arrives
	back as a *select-tap*, which is the same code path as Enter. Arrow keys are
	claimed at window level by the overlay and arrive here as `cursor`.
-->
<script lang="ts">
	import type { Tile } from './types';

	let {
		tiles,
		held,
		cursor,
		active,
		onGrab
	}: {
		tiles: Tile[];
		held: Tile | null;
		cursor: number;
		/** True when the roving focus lives in the tray. */
		active: boolean;
		onGrab: (event: PointerEvent, tile: Tile, element: HTMLElement) => void;
	} = $props();

	let elements = $state<(HTMLLIElement | undefined)[]>([]);

	$effect(() => {
		if (!active) return;
		const element = elements[cursor];
		if (element && document.activeElement !== element) element.focus();
	});
</script>

<ul class="cb-tray-grid" role="listbox" aria-label="Token tray" aria-orientation="horizontal">
	{#each tiles as tile, index (tile.id)}
		<li
			bind:this={elements[index]}
			class="cb-tile cb-tok"
			class:is-selected={held?.id === tile.id}
			class:is-cursor={active && index === cursor}
			data-cat={tile.category}
			role="option"
			aria-selected={held?.id === tile.id}
			aria-label={`${tile.literal} — ${tile.category}`}
			tabindex={index === cursor ? 0 : -1}
			onpointerdown={(event) => onGrab(event, tile, event.currentTarget)}
		>
			<span class="cb-tile-label">{tile.literal}</span>
		</li>
	{/each}
</ul>

{#if tiles.length === 0}
	<p class="cb-log-line" data-kind="info">every token is on the board</p>
{/if}
