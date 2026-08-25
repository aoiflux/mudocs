<script lang="ts">
	/**
	 * The Industry system's core primitive: a square, hairline-bordered frame
	 * wearing "+" registration marks at all four corners. Cards, figures and
	 * panels are line drawings — never rounded, never surface-filled.
	 */
	import type { Snippet } from 'svelte';

	let {
		as = 'div',
		liftable = false,
		class: className = '',
		children,
		...rest
	}: {
		as?: string;
		liftable?: boolean;
		class?: string;
		children: Snippet;
		[key: string]: unknown;
	} = $props();
</script>

<svelte:element
	this={as}
	class="blueprint {liftable ? 'is-liftable' : ''} {className}"
	{...rest}
>
	<i class="corner tl" aria-hidden="true"></i>
	<i class="corner tr" aria-hidden="true"></i>
	<i class="corner bl" aria-hidden="true"></i>
	<i class="corner br" aria-hidden="true"></i>
	{@render children()}
</svelte:element>
