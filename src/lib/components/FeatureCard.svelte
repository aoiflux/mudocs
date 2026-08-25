<script lang="ts">
	/** M4 — 2px lift and a hairline brighten on hover. */
	import Blueprint from './Blueprint.svelte';

	let {
		title,
		body,
		href = ''
	}: {
		title: string;
		body: string;
		href?: string;
	} = $props();
</script>

<Blueprint
	as={href ? 'a' : 'div'}
	liftable
	href={href || undefined}
	style="padding: var(--space-4); display: grid; gap: var(--space-2); align-content: start; text-decoration: none; color: inherit;"
	data-fx="fade-up"
>
	<span aria-hidden="true" style="width: 13px; height: 13px; border: 1.5px solid var(--color-accent);"></span>
	<span class="card-title">{title}</span>
	<span class="card-body">{body}</span>
</Blueprint>
