<script lang="ts">
	/**
	 * A progress ring. `value` is 0..1 for a known fraction, or null for work
	 * that has no measure yet (it then turns, unless the reader asked for
	 * reduced motion, when it holds still). The label is what a screen reader
	 * hears; the fraction rides on aria-valuenow.
	 */
	let { value = null, label, size = 56 }: { value?: number | null; label: string; size?: number } = $props();

	const RADIUS = 20;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

	const clamped = $derived(value === null ? null : Math.min(1, Math.max(0, value)));
	const dash = $derived(clamped === null ? CIRCUMFERENCE * 0.25 : CIRCUMFERENCE * clamped);
</script>

<svg
	class="ring"
	class:is-indeterminate={clamped === null}
	width={size}
	height={size}
	viewBox="0 0 48 48"
	role="progressbar"
	aria-label={label}
	aria-valuemin={clamped === null ? undefined : 0}
	aria-valuemax={clamped === null ? undefined : 100}
	aria-valuenow={clamped === null ? undefined : Math.round(clamped * 100)}
>
	<circle class="track" cx="24" cy="24" r={RADIUS} />
	<circle
		class="arc"
		cx="24"
		cy="24"
		r={RADIUS}
		stroke-dasharray={`${dash} ${CIRCUMFERENCE}`}
		transform="rotate(-90 24 24)"
	/>
</svg>

<style>
	.ring {
		flex: none;
		display: block;
	}

	circle {
		fill: none;
		stroke-width: 3;
	}

	.track {
		stroke: var(--color-divider);
	}

	.arc {
		stroke: var(--color-accent);
		stroke-linecap: butt;
		transition: stroke-dasharray var(--fx-dur-fast) var(--fx-ease-apple);
	}

	.is-indeterminate {
		animation: ring-turn 1.1s linear infinite;
	}

	@keyframes ring-turn {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.is-indeterminate {
			animation: none;
		}

		.arc {
			transition: none;
		}
	}
</style>
