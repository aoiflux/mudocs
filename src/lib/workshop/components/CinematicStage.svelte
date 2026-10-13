<script lang="ts">
	/**
	 * A narrated film: one shot at a time, with play, step and jump controls.
	 * The film itself is decoration for sighted readers; the narration under it
	 * says the same thing in text, and the full shot list is one click away, so
	 * the stage reads fully without the drawing and with motion reduced. Nothing
	 * plays until the reader presses Play. While the stage is on screen (or full
	 * screen), the arrow keys step, Space plays or pauses, and F goes full screen.
	 */
	import { onMount, type Component } from 'svelte';
	import type { ResolvedCinematic } from '../resolved';
	import type { FilmName } from '../films/data';
	import { prefersReducedMotion } from '$lib/artist/motion';
	import TimestompFilm from '../films/TimestompFilm.svelte';
	import MalvertisingFilm from '../films/MalvertisingFilm.svelte';
	import RegistryFilm from '../films/RegistryFilm.svelte';
	import '../films/film.css';

	type FilmProps = { data: never; shot: string };
	/** The loader has checked filmData against FILM_DATA[film], so each film gets its own shape. */
	const FILMS: Record<FilmName, Component<FilmProps>> = {
		Timestomp: TimestompFilm,
		Malvertising: MalvertisingFilm,
		RegistryPersistence: RegistryFilm
	} as unknown as Record<FilmName, Component<FilmProps>>;

	/**
	 * How long a shot holds while playing, in ms: the camera move, then time to
	 * read the narration, within bounds so a short line does not flash past and
	 * a long one does not stall.
	 */
	const holdFor = (text: string) => Math.min(8000, Math.max(4000, 2500 + text.length * 22));
	/** The stage every film draws on; the frame scales it to fit. */
	const STAGE_WIDTH = 960;

	let { stage, onready }: { stage: ResolvedCinematic; onready: () => void } = $props();

	let index = $state(0);
	let playing = $state(false);
	let reduced = $state(false);
	let width = $state(STAGE_WIDTH);
	let root: HTMLDivElement | undefined = $state();
	let inView = $state(false);
	let canFullscreen = $state(false);
	let fullscreen = $state(false);

	const shot = $derived(stage.shots[index]);
	const last = $derived(index === stage.shots.length - 1);
	const hold = $derived(holdFor(shot.text));
	const Film = $derived(FILMS[stage.film]);

	type PrefixedDocument = Document & {
		webkitFullscreenEnabled?: boolean;
		webkitFullscreenElement?: Element | null;
		webkitExitFullscreen?: () => Promise<void> | void;
	};
	type PrefixedElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

	const fullscreenElement = () =>
		document.fullscreenElement ?? (document as PrefixedDocument).webkitFullscreenElement ?? null;

	onMount(() => {
		reduced = prefersReducedMotion();
		const doc = document as PrefixedDocument;
		canFullscreen = Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);

		const syncFullscreen = () => (fullscreen = root !== undefined && fullscreenElement() === root);
		document.addEventListener('fullscreenchange', syncFullscreen);
		document.addEventListener('webkitfullscreenchange', syncFullscreen);

		// Keys steer the film the reader is looking at, not every film on the page.
		const observer = new IntersectionObserver(([entry]) => (inView = entry.intersectionRatio >= 0.5), {
			threshold: [0, 0.5, 1]
		});
		if (root) observer.observe(root);

		return () => {
			document.removeEventListener('fullscreenchange', syncFullscreen);
			document.removeEventListener('webkitfullscreenchange', syncFullscreen);
			observer.disconnect();
		};
	});

	$effect(() => {
		if (last) onready();
	});

	$effect(() => {
		if (!playing) return;
		if (last) {
			playing = false;
			return;
		}
		const timer = setTimeout(() => (index += 1), hold);
		return () => clearTimeout(timer);
	});

	function go(to: number): void {
		index = Math.max(0, Math.min(stage.shots.length - 1, to));
	}

	function togglePlay(): void {
		if (!playing && last) index = 0;
		playing = !playing;
	}

	async function toggleFullscreen(): Promise<void> {
		if (!root) return;
		const doc = document as PrefixedDocument;
		try {
			if (fullscreenElement()) {
				await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
			} else {
				const el = root as PrefixedElement;
				await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
			}
		} catch {
			// The browser refused (no user gesture, or a policy); the page stays as it is.
		}
	}

	/** Fields that take typing, where every key belongs to the field. */
	const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
	/** Controls that answer Space and Enter themselves. */
	const ACTIVATES = 'button, a[href], summary, [role="button"], [role="link"]';

	function onKey(event: KeyboardEvent): void {
		if (!root || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
		if (!(fullscreen || inView)) return;
		const target = event.target instanceof Element ? event.target : null;
		if (target?.closest(EDITABLE)) return;

		switch (event.key) {
			case 'ArrowRight':
				go(index + 1);
				break;
			case 'ArrowLeft':
				go(index - 1);
				break;
			case 'Home':
				if (!fullscreen) return;
				go(0);
				break;
			case 'End':
				if (!fullscreen) return;
				go(stage.shots.length - 1);
				break;
			case ' ':
			case 'k':
				if (event.key === ' ' && target?.closest(ACTIVATES)) return;
				togglePlay();
				break;
			case 'f':
				if (!canFullscreen) return;
				void toggleFullscreen();
				break;
			default:
				return;
		}
		event.preventDefault();
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="cn" bind:this={root} data-full={fullscreen ? '' : undefined}>
	<p class="cn-intro">{stage.intro}</p>

	<div class="film cn-frame" bind:clientWidth={width} aria-hidden="true" data-reduced={reduced ? '' : undefined}>
		<div class="cn-world" style:--k={width / STAGE_WIDTH}>
			<Film data={stage.filmData as never} shot={shot.shot} />
		</div>
		<div class="cn-slate">
			<span class="cn-count">{String(index + 1).padStart(2, '0')} / {String(stage.shots.length).padStart(2, '0')}</span>
			<span class="cn-title">{shot.title}</span>
		</div>
		<div class="cn-bar">
			<span class="cn-seen" style:width={`${(index / stage.shots.length) * 100}%`}></span>
			<span
				class="cn-now"
				style:left={`${(index / stage.shots.length) * 100}%`}
				style:width={`${100 / stage.shots.length}%`}
			>
				{#key `${index}:${playing}`}
					<i class:is-timing={playing && !last} style:animation-duration={`${hold}ms`}></i>
				{/key}
			</span>
		</div>
	</div>

	<div class="cn-controls">
		<button type="button" class="btn btn-ghost" onclick={() => go(index - 1)} disabled={index === 0}>
			<span aria-hidden="true">◂</span> Previous
		</button>
		<button type="button" class="btn btn-primary cn-play" onclick={togglePlay} aria-pressed={playing}>
			{playing ? 'Pause' : last ? 'Play again' : 'Play'}
		</button>
		<button type="button" class="btn btn-ghost" onclick={() => go(index + 1)} disabled={last}>
			Next <span aria-hidden="true">▸</span>
		</button>
		<ol class="cn-dots" aria-label="Shots">
			{#each stage.shots as s, i (s.shot)}
				<li>
					<button
						type="button"
						class="cn-dot"
						data-state={i === index ? 'current' : i < index ? 'seen' : 'next'}
						aria-current={i === index ? 'step' : undefined}
						aria-label={`Shot ${i + 1}: ${s.title}`}
						onclick={() => go(i)}
					></button>
				</li>
			{/each}
		</ol>
		{#if canFullscreen}
			<button type="button" class="btn btn-ghost cn-full" onclick={toggleFullscreen} aria-pressed={fullscreen}>
				{fullscreen ? 'Exit full screen' : 'Full screen'}
			</button>
		{/if}
	</div>

	<div class="cn-narration" aria-live="polite">
		<p class="cn-shot"><strong>{index + 1}. {shot.title}.</strong> {shot.text}</p>
	</div>

	<p class="cn-keys text-muted">
		Keys: <kbd>←</kbd> <kbd>→</kbd> step · <kbd>Space</kbd> play or pause
		{#if canFullscreen}· <kbd>F</kbd> full screen{/if}
	</p>

	<details class="cn-text">
		<summary>Every shot, as text</summary>
		<ol>
			{#each stage.shots as s (s.shot)}
				<li><strong>{s.title}.</strong> {s.text}</li>
			{/each}
		</ol>
	</details>

	<details class="cn-sources">
		<summary>Where this comes from</summary>
		<ul>
			{#each stage.sources as source, i (i)}
				<li>
					{#if source.kind === 'external-spec' && source.ref.startsWith('https://')}
						<a href={source.ref}>{source.ref}</a>
					{:else}
						<code>{source.ref}</code>
					{/if}{source.note ? ` · ${source.note}` : ''}
				</li>
			{/each}
		</ul>
		{#if stage.reviewedBy}
			<p>Checked against its sources by {stage.reviewedBy}, {stage.reviewedAt}.</p>
		{:else}
			<p>Not yet checked against its sources.</p>
		{/if}
	</details>
</div>

<style>
	.cn {
		display: grid;
		gap: var(--space-4);
		min-width: 0;
	}

	.cn-intro,
	.cn-shot {
		margin: 0;
		max-width: 70ch;
	}

	.cn-frame {
		position: relative;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		background:
			radial-gradient(ellipse at 50% 35%, rgba(30, 80, 150, 0.35), transparent 65%),
			radial-gradient(ellipse at 50% 120%, rgba(63, 208, 255, 0.12), transparent 60%),
			var(--f-bg);
		border: 1px solid #10243f;
		color: var(--f-ink);
		font-family: var(--font-mono);
		font-size: 14px;
		line-height: 1.35;
		isolation: isolate;
	}

	.cn-frame::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(ellipse at center, transparent 65%, rgba(0, 0, 0, 0.3));
	}

	.cn-world {
		position: absolute;
		left: 0;
		top: 0;
		width: 960px;
		height: 540px;
		/* zoom, not a scale transform: the film lays out at its drawn size, so
		   text is rasterised sharp rather than drawn at 960 px and stretched. */
		zoom: var(--k);
		perspective: 1500px;
		perspective-origin: 50% 40%;
	}

	.cn-slate {
		position: absolute;
		left: 0;
		bottom: 6px;
		z-index: 2;
		display: flex;
		gap: 0.8em;
		align-items: baseline;
		padding: 0.35em 0.9em;
		font-size: clamp(10px, 1.6vw, 13px);
		background: linear-gradient(to right, rgba(3, 8, 18, 0.9), transparent);
	}

	.cn-count {
		color: var(--f-orange);
		letter-spacing: 0.08em;
	}

	.cn-title {
		color: var(--f-ink);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.cn-bar {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 3px;
		z-index: 2;
		background: rgba(63, 208, 255, 0.12);
	}

	.cn-seen,
	.cn-now {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
	}

	.cn-seen,
	.cn-now i {
		background: var(--f-cyan);
		box-shadow: 0 0 10px var(--f-cyan);
	}

	.cn-seen {
		transition: width 0.6s var(--f-ease);
	}

	.cn-now i {
		display: block;
		height: 100%;
		transform-origin: 0 50%;
	}

	/* While playing, the current shot's segment fills over its hold time. */
	.cn-now i.is-timing {
		animation-name: cn-fill;
		animation-timing-function: linear;
		animation-fill-mode: both;
	}

	@keyframes cn-fill {
		from {
			transform: scaleX(0);
		}
		to {
			transform: scaleX(1);
		}
	}

	.cn-controls {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
	}

	.cn-play {
		min-width: 8.5em;
	}

	.cn-dots {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0 0 0 var(--space-2);
		padding: 0;
		list-style: none;
	}

	.cn-full {
		margin-left: auto;
	}

	.cn-keys {
		margin: 0;
		font-size: 12px;
	}

	/* No keyboard to speak of on a touch screen. */
	@media (hover: none) and (pointer: coarse) {
		.cn-keys {
			display: none;
		}
	}

	.cn-keys kbd {
		font-family: var(--font-mono);
		font-size: 11px;
		padding: 0 0.4em;
		border: 1px solid var(--color-divider);
	}

	/* Full screen: the film fills the screen above its controls and narration. */
	.cn[data-full] {
		align-content: center;
		justify-items: center;
		padding: var(--space-4);
		overflow: auto;
		background: var(--color-bg);
		color: var(--color-text);
	}

	.cn[data-full] .cn-intro,
	.cn[data-full] .cn-text,
	.cn[data-full] .cn-sources {
		display: none;
	}

	.cn[data-full] .cn-frame,
	.cn[data-full] .cn-controls,
	.cn[data-full] .cn-narration,
	.cn[data-full] .cn-keys {
		width: min(100%, calc((100vh - 13rem) * 16 / 9));
	}

	.cn[data-full] .cn-shot {
		max-width: none;
	}

	.cn-dot {
		width: 22px;
		height: 22px;
		padding: 0;
		border: 1px solid var(--color-divider);
		background: transparent;
		cursor: pointer;
	}

	.cn-dot[data-state='seen'] {
		background: var(--color-divider);
	}

	.cn-dot[data-state='current'] {
		background: var(--color-accent);
		border-color: var(--color-accent);
	}

	.cn-dot:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.cn-text ol {
		display: grid;
		gap: var(--space-2);
		max-width: 70ch;
	}

	.cn-text,
	.cn-sources {
		font-size: 13px;
	}

	@media (prefers-reduced-motion: reduce) {
		.cn-seen {
			transition: none;
		}
	}
</style>
