<script lang="ts">
	/**
	 * The artboards leave the mascot as an explicit placeholder slot ("mascot
	 * slot", not drawn) and no mascot artwork exists in the repo. This is a
	 * geometric stand-in in the system's own grammar — nested hairline squares,
	 * registration marks, and one accent node that drifts between lattice points
	 * (the "mutation"). It is not a character; commissioning one is separate work.
	 */
	import { prefersReducedMotion } from '$lib/artist/motion';

	let { size = 168 }: { size?: number } = $props();

	let still = $state(true);
	$effect(() => {
		still = prefersReducedMotion();
	});
</script>

<svg
	class="mascot"
	class:is-still={still}
	width={size}
	height={size}
	viewBox="0 0 120 120"
	role="img"
	aria-label="Mutant mark: nested blueprint squares with a drifting node"
>
	<g fill="none" stroke="currentColor" stroke-width="1" opacity="0.85">
		<rect x="18" y="18" width="84" height="84" />
		<rect x="34" y="34" width="52" height="52" opacity="0.6" />
		<rect x="50" y="50" width="20" height="20" opacity="0.4" />
	</g>

	<g stroke="currentColor" stroke-width="1" opacity="0.5">
		<path d="M18 10v16M10 18h16" />
		<path d="M102 10v16M94 18h16" />
		<path d="M18 94v16M10 102h16" />
		<path d="M102 94v16M94 102h16" />
	</g>

	<g class="lattice" fill="currentColor" opacity="0.28">
		<rect x="32" y="32" width="3" height="3" />
		<rect x="85" y="32" width="3" height="3" />
		<rect x="32" y="85" width="3" height="3" />
		<rect x="85" y="85" width="3" height="3" />
	</g>

	<rect class="node" x="57" y="57" width="6" height="6" fill="var(--color-accent)" />
	<line class="trace" x1="60" y1="18" x2="60" y2="54" stroke="var(--color-accent)" stroke-width="1" />
</svg>

<style>
	.mascot {
		color: var(--color-text);
		display: block;
	}

	.node {
		transform-origin: 60px 60px;
		animation: mascot-drift 6.5s var(--fx-ease-apple) infinite;
	}

	.trace {
		stroke-dasharray: 4 4;
		animation: mascot-trace 3.2s linear infinite;
	}

	.lattice rect {
		animation: mascot-blink 4.4s ease-in-out infinite;
	}

	.lattice rect:nth-child(2) {
		animation-delay: 1.1s;
	}
	.lattice rect:nth-child(3) {
		animation-delay: 2.2s;
	}
	.lattice rect:nth-child(4) {
		animation-delay: 3.3s;
	}

	.mascot.is-still .node,
	.mascot.is-still .trace,
	.mascot.is-still .lattice rect {
		animation: none;
	}

	@keyframes mascot-drift {
		0%,
		100% {
			transform: translate(0, 0);
		}
		25% {
			transform: translate(-14px, -14px);
		}
		50% {
			transform: translate(14px, -14px);
		}
		75% {
			transform: translate(14px, 14px);
		}
	}

	@keyframes mascot-trace {
		to {
			stroke-dashoffset: -16;
		}
	}

	@keyframes mascot-blink {
		0%,
		100% {
			opacity: 0.2;
		}
		50% {
			opacity: 0.75;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.node,
		.trace,
		.lattice rect {
			animation: none;
		}
	}
</style>
