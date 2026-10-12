<script lang="ts">
	/**
	 * A narrated film: one shot at a time, with play, step and jump controls.
	 * The film itself is decoration for sighted readers; the narration under it
	 * says the same thing in text, and the full shot list is one click away, so
	 * the stage reads fully without the drawing and with motion reduced. Nothing
	 * plays until the reader presses Play.
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

	/** How long a shot holds while playing, in ms. */
	const HOLD = 7000;
	/** The stage every film draws on; the frame scales it to fit. */
	const STAGE_WIDTH = 960;

	let { stage, onready }: { stage: ResolvedCinematic; onready: () => void } = $props();

	let index = $state(0);
	let playing = $state(false);
	let reduced = $state(false);
	let width = $state(STAGE_WIDTH);

	const shot = $derived(stage.shots[index]);
	const last = $derived(index === stage.shots.length - 1);
	const Film = $derived(FILMS[stage.film]);

	onMount(() => {
		reduced = prefersReducedMotion();
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
		const timer = setTimeout(() => (index += 1), HOLD);
		return () => clearTimeout(timer);
	});

	function go(to: number): void {
		index = Math.max(0, Math.min(stage.shots.length - 1, to));
	}

	function togglePlay(): void {
		if (!playing && last) index = 0;
		playing = !playing;
	}
</script>

<div class="cn">
	<p class="cn-intro">{stage.intro}</p>

	<div class="film cn-frame" bind:clientWidth={width} aria-hidden="true" data-reduced={reduced ? '' : undefined}>
		<div class="cn-world" style:--k={width / STAGE_WIDTH}>
			<Film data={stage.filmData as never} shot={shot.shot} />
		</div>
		<div class="cn-slate">
			<span class="cn-count">{String(index + 1).padStart(2, '0')} / {String(stage.shots.length).padStart(2, '0')}</span>
			<span class="cn-title">{shot.title}</span>
		</div>
		<div class="cn-bar"><span style:width={`${((index + 1) / stage.shots.length) * 100}%`}></span></div>
	</div>

	<div class="cn-narration" aria-live="polite">
		<p class="cn-shot"><strong>{index + 1}. {shot.title}.</strong> {shot.text}</p>
	</div>

	<div class="cn-controls">
		<div class="cta-cluster">
			<button type="button" class="btn btn-ghost" onclick={() => go(index - 1)} disabled={index === 0}>Previous</button>
			<button type="button" class="btn btn-ghost" onclick={togglePlay} aria-pressed={playing}>
				{playing ? 'Pause' : last ? 'Play again' : 'Play'}
			</button>
			<button type="button" class="btn btn-secondary" onclick={() => go(index + 1)} disabled={last}>Next</button>
		</div>
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
	</div>

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
		background:
			radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.55)),
			repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 3px);
	}

	.cn-world {
		position: absolute;
		left: 0;
		top: 0;
		width: 960px;
		height: 540px;
		transform: scale(var(--k));
		transform-origin: 0 0;
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

	.cn-bar span {
		display: block;
		height: 100%;
		background: var(--f-cyan);
		box-shadow: 0 0 10px var(--f-cyan);
		transition: width 0.6s var(--f-ease);
	}

	.cn-controls {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		align-items: center;
		justify-content: space-between;
	}

	.cn-dots {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
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
		.cn-bar span {
			transition: none;
		}
	}
</style>
