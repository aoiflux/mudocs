<script lang="ts">
	/**
	 * Build-it stage: put a program's steps in order. Each block stands for one
	 * or more real builtins from the module's programs; some blocks belong in no
	 * pipeline at all. Drag a block onto a slot, or tap it (or press Enter) to
	 * drop it in the first empty slot; tap a placed block to take it back.
	 */
	import { onMount, tick } from 'svelte';
	import { createDragController, shakeSlot, type DragController, type SlotTarget } from '$lib/interactive/dnd';
	import type { StageOf } from '../schema';

	let { stage, onready }: { stage: StageOf<'build'>; onready: () => void } = $props();

	/** A fixed, scrambled order, the same on every visit and on the server. */
	function scramble<T extends { id: string }>(items: readonly T[], seed: string): T[] {
		const hash = (value: string) => [...value].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
		const out = [...items].sort((a, b) => hash(seed + a.id) - hash(seed + b.id));
		// Never deal the answer already in order.
		const solvedOrder = out.filter((b) => stage.answer.includes(b.id)).map((b) => b.id);
		if (solvedOrder.join() === stage.answer.join() && out.length > 1) out.push(out.shift() as T);
		return out;
	}

	const deck = $derived(scramble(stage.blocks, stage.id));
	const byId = $derived(new Map(stage.blocks.map((b) => [b.id, b])));

	let slots = $state<(string | null)[]>([]);
	let armed = $state<number | null>(null);
	let marks = $state<boolean[] | null>(null);
	let message = $state('');

	$effect.pre(() => {
		if (slots.length !== stage.answer.length) slots = stage.answer.map(() => null);
	});

	const pool = $derived(deck.filter((b) => !slots.includes(b.id)));
	const full = $derived(slots.length > 0 && slots.every((s) => s !== null));
	const solved = $derived(marks !== null && marks.every(Boolean));

	let layer = $state<HTMLElement | undefined>(undefined);
	let slotEls = $state<HTMLElement[]>([]);
	let controller: DragController<string> | null = null;

	onMount(() => {
		if (!layer) return;
		controller = createDragController<string>(layer, {
			targets: () =>
				slots.flatMap((id, index): SlotTarget[] => (id === null && slotEls[index] ? [{ index, element: slotEls[index] }] : [])),
			onArm: (index) => (armed = index),
			onDrop: (id, index) => {
				if (index !== null) place(id, index);
			},
			onSelect: (id) => placeFirst(id),
			classes: { ghost: 'pb-ghost', proxy: 'pb-proxy' }
		});
		return () => controller?.destroy();
	});

	function place(id: string, index: number): void {
		if (solved || slots[index] !== null) return;
		slots[index] = id;
		marks = null;
		message = '';
	}

	function placeFirst(id: string): void {
		const index = slots.indexOf(null);
		if (index >= 0) place(id, index);
	}

	function takeBack(index: number): void {
		if (solved) return;
		slots[index] = null;
		marks = null;
		message = '';
	}

	async function check(): Promise<void> {
		marks = slots.map((id, i) => id === stage.answer[i]);
		const right = marks.filter(Boolean).length;
		if (right === marks.length) {
			message = `Right: that is the program’s order. ${stage.explain}`;
			onready();
			return;
		}
		message = `${right} of ${marks.length} steps are in the right place. Take back the marked ones and try again.`;
		await tick();
		marks.forEach((ok, i) => {
			if (!ok && slotEls[i]) shakeSlot(slotEls[i]);
		});
	}

	function reset(): void {
		slots = stage.answer.map(() => null);
		marks = null;
		message = '';
	}
</script>

<div class="pb" bind:this={layer}>
	<p class="pb-prompt">{stage.prompt}</p>

	<div class="pb-board">
		<div class="pb-pool" aria-label="Steps to place">
			<p class="pb-label">Steps</p>
			{#if pool.length === 0}
				<p class="pb-empty">Every slot is filled.</p>
			{/if}
			<ul class="pb-list">
				{#each pool as block (block.id)}
					<li>
						<button
							type="button"
							class="pb-block"
							disabled={solved || full}
							onpointerdown={(event) => controller?.begin(event, block.id, event.currentTarget)}
							onclick={(event) => {
								// Pointer taps arrive through the controller's onSelect; this is the keyboard path.
								if (event.detail === 0) placeFirst(block.id);
							}}
						>
							<span class="pb-text">{block.label}</span>
							{#if block.builtins.length > 0}
								<span class="pb-builtins">{block.builtins.join(' · ')}</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</div>

		<ol class="pb-slots" aria-label="Pipeline, in order">
			{#each slots as id, index (index)}
				{@const block = id ? byId.get(id) : undefined}
				<li
					class="pb-slot"
					bind:this={slotEls[index]}
					data-armed={armed === index ? '' : undefined}
					data-mark={marks ? (marks[index] ? 'right' : 'wrong') : undefined}
				>
					<span class="pb-n" aria-hidden="true">{index + 1}</span>
					{#if block}
						<button type="button" class="pb-block pb-placed" onclick={() => takeBack(index)} disabled={solved}>
							<span class="pb-text">{block.label}</span>
							{#if block.builtins.length > 0}<span class="pb-builtins">{block.builtins.join(' · ')}</span>{/if}
							<span class="visually-hidden">{solved ? '' : ', press to take back'}</span>
						</button>
					{:else}
						<span class="pb-hole">Step {index + 1}</span>
					{/if}
				</li>
			{/each}
		</ol>
	</div>

	<p class="pb-message" aria-live="polite">{message}</p>

	<div class="cta-cluster">
		<button type="button" class="btn btn-secondary" onclick={check} disabled={!full || solved}>Check the order</button>
		<button type="button" class="btn btn-ghost" onclick={reset} disabled={solved || slots.every((s) => s === null)}>Clear</button>
	</div>
</div>

<style>
	.pb {
		display: grid;
		gap: var(--space-4);
	}

	.pb-prompt,
	.pb-message,
	.pb-empty,
	.pb-label {
		margin: 0;
		max-width: 70ch;
	}

	.pb-label {
		font-size: 12px;
		font-family: var(--font-mono);
	}

	.pb-message:empty {
		display: none;
	}

	.pb-board {
		display: grid;
		gap: var(--space-4);
	}

	@media (min-width: 900px) {
		.pb-board {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
			align-items: start;
		}
	}

	.pb-pool {
		display: grid;
		gap: var(--space-2);
	}

	.pb-list,
	.pb-slots {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: var(--space-2);
	}

	.pb-block {
		width: 100%;
		display: grid;
		gap: 2px;
		text-align: left;
		padding: var(--space-3);
		border: 1px solid var(--color-divider);
		background: var(--color-bg);
		color: inherit;
		font: inherit;
		cursor: grab;
		touch-action: none;
	}

	.pb-block:disabled {
		cursor: default;
	}

	.pb-block:not(:disabled):hover,
	.pb-block:focus-visible {
		border-color: var(--color-accent);
	}

	.pb-builtins {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-accent-700);
	}

	.pb-slot {
		display: grid;
		grid-template-columns: 2rem 1fr;
		gap: var(--space-2);
		align-items: center;
		min-height: 3.4rem;
	}

	.pb-n {
		font-family: var(--font-mono);
		color: var(--color-accent-700);
		text-align: right;
	}

	.pb-hole {
		display: grid;
		align-items: center;
		height: 100%;
		min-height: 3rem;
		padding: 0 var(--space-3);
		border: 1px dashed var(--color-divider);
		font-size: 12px;
		opacity: 0.7;
	}

	.pb-slot[data-armed] .pb-hole {
		border-color: var(--color-accent);
		border-style: solid;
	}

	.pb-placed {
		cursor: pointer;
	}

	.pb-slot[data-mark='right'] .pb-placed {
		border-color: var(--color-accent);
		border-left-width: 4px;
	}

	.pb-slot[data-mark='wrong'] .pb-placed {
		border-style: dashed;
		border-left-width: 4px;
		opacity: 0.75;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	:global(.pb-ghost) {
		opacity: 0.3;
	}

	:global(.pb-proxy) {
		position: fixed;
		top: 0;
		left: 0;
		margin: 0;
		pointer-events: none;
		will-change: transform;
		border-color: var(--color-accent) !important;
		box-shadow: var(--shadow-md);
		z-index: 60;
	}
</style>
