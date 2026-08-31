<!--
	The only entrance to Mutant Codebreaker.

	This component ships on every page, because `SiteFooter` does. Everything it
	is allowed to cost is here: a 12×12 inline SVG, a scoped stylesheet, and one
	`await import()`. The overlay, its stylesheet, the puzzles, the engine and the
	audio graph all sit behind that import and are never fetched by a visitor who
	does not click.
-->
<script lang="ts">
	import { onMount, type Component } from 'svelte';
	import { loadSave, type SaveV1 } from './persistence';

	// Deliberately a literal, not `PUZZLE_COUNT` from `puzzles.ts` — importing
	// that module here would pull the whole puzzle set into the entry chunk.
	const TOTAL = 8;

	let save = $state<SaveV1 | null>(null);
	let Overlay = $state<Component<{ onClose: () => void }> | null>(null);
	let loading = $state(false);
	let trigger = $state<HTMLButtonElement | undefined>(undefined);

	// Rendered undiscovered on the server and upgraded here, so there is no
	// SSR/client mismatch on a prerendered page.
	onMount(() => {
		save = loadSave();
	});

	const solved = $derived(save?.solved.length ?? 0);
	const complete = $derived(solved >= TOTAL);
	const started = $derived(solved > 0 && !complete);
	const refused = $derived(save?.refused === true && solved === 0);

	const echo = $derived(refused ? 'N0' : started ? `${solved}/${TOTAL}` : 'M4');

	const label = $derived(
		complete
			? 'Mutant Codebreaker — complete. Replay.'
			: started
				? `Resume Mutant Codebreaker — ${solved} of ${TOTAL} solved`
				: refused
					? 'Reconsider?'
					: 'Decompile the registration mark'
	);

	async function open(): Promise<void> {
		if (Overlay || loading) return;
		loading = true;
		try {
			const module = await import('./CodebreakerOverlay.svelte');
			Overlay = module.default;
		} catch {
			// A failed chunk fetch must not break the footer. The glyph simply
			// stays a printing artifact.
			loading = false;
			return;
		}
		loading = false;
	}

	function close(): void {
		Overlay = null;
		save = loadSave();
		trigger?.focus();
	}
</script>

<button
	bind:this={trigger}
	type="button"
	class="cb-glyph"
	class:is-started={started}
	class:is-complete={complete}
	class:is-marked={started || refused || loading}
	aria-label={label}
	title={label}
	onclick={open}
>
	<svg class="cb-glyph-mark" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
		<!-- A registration mark whose right arm is broken into two offset
		     segments: a corrupted `+`, not an icon. -->
		<path d="M6 0 V12" />
		<path d="M0 6 H5" />
		<!-- Repaired once all eight are solved: the arm rejoins the mark. -->
		<path d={complete ? 'M7 6 H12' : 'M7.5 5 H12'} />
	</svg>
	<span class="cb-glyph-echo" aria-hidden="true">{loading ? '▍' : echo}</span>
</button>

{#if Overlay}
	<Overlay onClose={close} />
{/if}

<style>
	/*
	 * Scoped on purpose. `artist-fx.css` has a `.fx-glitch` that would do this,
	 * but its pseudo-element animation is gated on `:root[data-theme='artist']`,
	 * and this glyph lives in light and dark too. Selectors are collapsed with
	 * `:is()` because every rule here is duplicated by Svelte's scoping hash and
	 * ships in the layout stylesheet on every page.
	 */
	.cb-glyph {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 3px;
		border: 0;
		background: none;
		color: inherit;
		opacity: 0.35;
		cursor: pointer;
		line-height: 1;
		transition: opacity 200ms ease;
	}

	.cb-glyph-mark {
		display: block;
		overflow: visible;
		stroke: currentColor;
		stroke-width: 1;
		fill: none;
		shape-rendering: crispEdges;
	}

	.cb-glyph-echo {
		/* Fixed width, so nothing in the colophon shifts when it appears. */
		display: inline-block;
		width: 2.2em;
		font-family: var(--font-mono);
		font-size: 9px;
		text-align: left;
		opacity: 0;
		transition: opacity 200ms ease;
	}

	.cb-glyph:is(:hover, :focus-visible) {
		opacity: 0.85;
		outline-offset: 2px;
	}

	.cb-glyph:is(:hover, :focus-visible, .is-marked) .cb-glyph-echo {
		opacity: 0.7;
	}

	/* Chromatic split — a cyan/magenta ghost at ±2px, stepped so it reads as a
	   sampling error rather than a fade. No layout shift: it is all shadow. */
	.cb-glyph:is(:hover, :focus-visible) .cb-glyph-mark {
		animation: cb-glyph-split 0.7s steps(1) infinite;
	}

	.cb-glyph.is-started {
		opacity: 0.7;
		border-bottom: 1px solid #46f1ff;
	}

	.cb-glyph.is-complete {
		opacity: 0.9;
		color: #46f1ff;
		animation: cb-glyph-pulse 6s ease-in-out infinite;
	}

	@keyframes cb-glyph-split {
		0%,
		100% {
			filter: none;
		}
		33% {
			filter: drop-shadow(-2px 0 #46f1ff) drop-shadow(2px 0 #ff2eb8);
		}
		66% {
			filter: drop-shadow(2px -1px #46f1ff) drop-shadow(-2px 1px #ff2eb8);
		}
	}

	@keyframes cb-glyph-pulse {
		0%,
		100% {
			opacity: 0.9;
		}
		50% {
			opacity: 0.5;
		}
	}
</style>
