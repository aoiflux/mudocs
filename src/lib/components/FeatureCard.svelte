<script lang="ts">
	/** M4 — 2px lift and a hairline brighten on hover. */
	import Blueprint from './Blueprint.svelte';

	let {
		title,
		body,
		href = '',
		index = 0
	}: {
		title: string;
		body: string;
		href?: string;
		/** Picks the card's mark. Four marks cycle, so a row of cards reads as four
		 *  distinct things rather than four identical empty squares. */
		index?: number;
	} = $props();

	const mark = $derived(index % 4);
</script>

<Blueprint
	as={href ? 'a' : 'div'}
	liftable
	href={href || undefined}
	style="padding: var(--space-4); display: grid; gap: var(--space-2); align-content: start; text-decoration: none; color: inherit;"
	data-fx="fade-up"
>
	<svg class="card-mark" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
		{#if mark === 0}
			<!-- Nested frames — the system's own registration idiom. -->
			<rect x="2.5" y="2.5" width="19" height="19" />
			<rect class="mark-inner" x="8" y="8" width="8" height="8" />
		{:else if mark === 1}
			<!-- Crosshair over a node. -->
			<circle cx="12" cy="12" r="5.5" />
			<path class="mark-inner" d="M12 0.5v5M12 18.5v5M0.5 12h5M18.5 12h5" />
		{:else if mark === 2}
			<!-- A stack of rules — a byte stream, read top to bottom. -->
			<path d="M2.5 5h19M2.5 12h19M2.5 19h19" />
			<rect class="mark-inner mark-fill" x="6" y="10" width="4" height="4" />
		{:else}
			<!-- Branch: one input, two paths out. -->
			<path d="M3.5 12h6l5-6h5M9.5 12l5 6h5" />
			<rect class="mark-inner mark-fill" x="1" y="9.5" width="5" height="5" />
		{/if}
	</svg>

	<span class="card-title">{title}</span>
	<span class="card-body">{body}</span>
</Blueprint>
