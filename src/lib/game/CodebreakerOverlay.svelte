<!--
	The root dialog.

	Everything expensive lives behind this module: `codebreaker.css`, the puzzle
	set, the engine, the audio graph, the particle field and the wasm bridge are
	all reachable only from here, and this component is only ever reached through
	an `await import()` in `CodebreakerGlyph.svelte`.

	Three things are centralised here on purpose:

	  1. **Keys.** One capture-phase `window` listener claims the whole key set.
	     Capture at window precedes the bubble-phase handler in `+layout.svelte`,
	     which is what makes Ctrl/Cmd+K a no-op in here instead of a navigation to
	     `/search` in the middle of a drag.
	  2. **Focus and scroll.** `inert` on the page behind, plus an iOS-safe
	     `position: fixed` body lock, plus a manual Tab wrap as a fallback.
	  3. **Slot geometry.** `dnd.ts` finds its magnet targets by querying
	     `.cb-slot[data-empty='true']`, so no slot element is ever passed around.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { EASE, createTimeline, attachMagnetic, prefersReducedMotion } from '$lib/artist/motion';
	import './codebreaker.css';

	import TerminalPane from './TerminalPane.svelte';
	import BootSequence from './BootSequence.svelte';
	import CompilerStream from './CompilerStream.svelte';
	import PipelineStrip from './PipelineStrip.svelte';
	import RewardCard from './RewardCard.svelte';
	import TokenTray from './TokenTray.svelte';

	import { accentSlot, createDragController, shakeSlot, type DragController } from './dnd';
	import { initParticles, type ParticleField } from './particles';
	import { PUZZLE_COUNT } from './puzzles';
	import { GameState } from './state.svelte';
	import { chipAnimates, chipLabel } from './wasm';
	import type { Tile } from './types';

	let { onClose }: { onClose: () => void } = $props();

	const game = new GameState();

	let root = $state<HTMLDivElement | undefined>(undefined);
	let shell = $state<HTMLDivElement | undefined>(undefined);
	let dragLayer = $state<HTMLDivElement | undefined>(undefined);
	let canvas = $state<HTMLCanvasElement | undefined>(undefined);
	let recompileButton = $state<HTMLButtonElement | undefined>(undefined);
	let hintButton = $state<HTMLButtonElement | undefined>(undefined);

	let controller: DragController | null = null;
	let particles: ParticleField | null = null;

	/** Which region owns the roving focus. */
	let region = $state<'tray' | 'slots'>('tray');
	/** Phone only: which pane the tab bar has selected. The tray is never hidden. */
	let pane = $state<'source' | 'stream'>('source');

	const chip = $derived(chipLabel(game.wasmView));
	const failed = $derived(game.diagnostics.some((entry) => entry.severity === 'error'));
	const output = $derived(game.phase === 'solved' || game.phase === 'complete' ? game.puzzle.expectedOutput : '');

	/**
	 * Difficulty as a five-bar waveform. Duplicated in a visually-hidden span,
	 * because the shape itself carries no accessible information.
	 */
	const WAVEFORMS: Record<number, number[]> = {
		1: [3, 4, 3, 2, 3],
		2: [3, 6, 4, 5, 3],
		3: [4, 8, 5, 7, 5],
		4: [4, 9, 6, 10, 7],
		5: [4, 11, 7, 13, 9]
	};
	const waveform = $derived(WAVEFORMS[game.puzzle.difficulty] ?? WAVEFORMS[1]);

	// -------------------------------------------------------------------------
	// Geometry helpers
	// -------------------------------------------------------------------------

	function slotElement(index: number): HTMLElement | null {
		return shell?.querySelector<HTMLElement>(`.cb-slot[data-slot='${index}']`) ?? null;
	}

	function neonColor(): string {
		if (!root) return '#46f1ff';
		return getComputedStyle(root).getPropertyValue('--cb-neon').trim() || '#46f1ff';
	}

	function centreOf(element: Element): { x: number; y: number } {
		const rect = element.getBoundingClientRect();
		return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
	}

	// -------------------------------------------------------------------------
	// Placement — one path for pointer, tap and keyboard
	// -------------------------------------------------------------------------

	function commit(slotIndex: number, tile: Tile): void {
		const accepted = game.place(slotIndex, tile);
		const element = slotElement(slotIndex);
		if (!element) return;

		if (accepted) {
			accentSlot(element, neonColor());
			const centre = centreOf(element);
			particles?.burst(centre.x, centre.y, 18);
		} else {
			shakeSlot(element);
			glitch();
		}
	}

	/** The on-demand error glitch. WAAPI, so it needs its own guard. */
	function glitch(): void {
		if (!root || prefersReducedMotion()) return;
		root.animate(
			[
				{ transform: 'translate3d(0, 0, 0)' },
				{ transform: 'translate3d(-4px, 1px, 0)' },
				{ transform: 'translate3d(5px, -1px, 0)' },
				{ transform: 'translate3d(-2px, 0, 0)' },
				{ transform: 'translate3d(0, 0, 0)' }
			],
			{ duration: 220, easing: 'steps(4)' }
		);
	}

	function nextEmpty(from: number, direction: 1 | -1): number {
		const total = game.puzzle.slots.length;
		for (let step = 1; step <= total; step += 1) {
			const index = (from + direction * step + total * 2) % total;
			if (game.fills[index] == null) return index;
		}
		return from;
	}

	// -------------------------------------------------------------------------
	// Lifecycle
	// -------------------------------------------------------------------------

	function close(): void {
		game.teardown();
		onClose();
	}

	onMount(() => {
		game.pathname = page.url.pathname;

		// --- scroll lock (iOS-safe: `overflow: hidden` on body is unreliable) ---
		const scrollY = window.scrollY;
		const body = document.body;
		const gutter = window.innerWidth - document.documentElement.clientWidth;
		const previous = {
			position: body.style.position,
			top: body.style.top,
			width: body.style.width,
			paddingRight: body.style.paddingRight
		};
		body.style.position = 'fixed';
		body.style.top = `-${scrollY}px`;
		body.style.width = '100%';
		if (gutter > 0) body.style.paddingRight = `${gutter}px`;

		// --- focus trap ------------------------------------------------------
		// `inert` implies `aria-hidden` and removal from the tab order in one
		// attribute. The overlay is mounted as a sibling of the glyph inside the
		// colophon, so that subtree is inerted element-by-element around us
		// rather than wholesale.
		const inerted: Element[] = [];
		const inertize = (element: Element | null) => {
			if (!element || element === root || element.hasAttribute('inert')) return;
			element.setAttribute('inert', '');
			inerted.push(element);
		};
		inertize(document.querySelector('header.site-header'));
		inertize(document.querySelector('main#main'));
		inertize(document.querySelector('.site-footer-inner'));
		for (const sibling of Array.from(root?.parentElement?.children ?? [])) inertize(sibling);

		// --- services ---------------------------------------------------------
		if (canvas && root) particles = initParticles(canvas, root);
		if (dragLayer) {
			controller = createDragController(dragLayer, {
				targets: () =>
					Array.from(shell?.querySelectorAll<HTMLElement>(".cb-slot[data-empty='true']") ?? []).map(
						(element) => ({ index: Number(element.dataset.slot), element })
					),
				onArm: (index) => {
					game.armedSlot = index;
				},
				onDrop: (tile, slotIndex) => {
					if (slotIndex == null) {
						game.cancelPickup();
						return;
					}
					commit(slotIndex, tile);
				},
				onSelect: (tile) => {
					if (game.held?.id === tile.id) game.cancelPickup();
					else game.pickUp(tile);
				},
				onMove: (x, y) => particles?.trail(x, y),
				onLift: (tile) => game.pickUp(tile)
			});
		}

		const unbind = game.bindWasm();
		window.addEventListener('keydown', onKeydown, { capture: true });

		return () => {
			window.removeEventListener('keydown', onKeydown, { capture: true });
			unbind();
			controller?.destroy();
			particles?.stop();
			for (const element of inerted) element.removeAttribute('inert');
			body.style.position = previous.position;
			body.style.top = previous.top;
			body.style.width = previous.width;
			body.style.paddingRight = previous.paddingRight;
			window.scrollTo(0, scrollY);
		};
	});

	// Magnetic pull on the two action buttons, straight from `motion.ts`.
	$effect(() => {
		const element = recompileButton;
		if (!element) return;
		return attachMagnetic(element, 0.18);
	});

	$effect(() => {
		const element = hintButton;
		if (!element) return;
		return attachMagnetic(element, 0.18);
	});

	/**
	 * The success explosion. Final keyframes equal the resting state, so the
	 * inline styles `createTimeline` writes under reduced motion are a no-op.
	 */
	$effect(() => {
		if (game.phase !== 'solved') return;
		const chips = Array.from(shell?.querySelectorAll('.cb-stage') ?? []);
		const timeline = createTimeline();
		for (const [index, element] of chips.entries()) {
			timeline.to(
				element,
				[{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }],
				{ duration: 260, ease: EASE.snap, offset: index === 0 ? 380 : -200 }
			);
		}
		void timeline.play();

		const board = shell?.querySelector('.cb-source');
		if (board) {
			const centre = centreOf(board);
			particles?.burst(centre.x, centre.y, 120, 4.2);
		}

		return () => timeline.cancel();
	});

	// -------------------------------------------------------------------------
	// Keys
	// -------------------------------------------------------------------------

	const CLAIMED = new Set([
		'Escape',
		'Enter',
		' ',
		'ArrowLeft',
		'ArrowRight',
		'ArrowUp',
		'ArrowDown',
		'Home',
		'End',
		'Backspace',
		'Delete'
	]);

	function claim(event: KeyboardEvent, alsoPrevent: boolean): void {
		event.stopPropagation();
		if (alsoPrevent) event.preventDefault();
	}

	function focusables(): HTMLElement[] {
		if (!root) return [];
		return Array.from(
			root.querySelectorAll<HTMLElement>(
				'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
			)
		).filter((element) => element.offsetParent !== null || element === document.activeElement);
	}

	function onKeydown(event: KeyboardEvent): void {
		// Ctrl/Cmd+K would otherwise reach `+layout.svelte` and navigate away.
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
			claim(event, true);
			return;
		}

		// Manual Tab wrap, as a fallback behind `inert`.
		if (event.key === 'Tab') {
			const items = focusables();
			if (items.length === 0) return;
			const first = items[0];
			const last = items[items.length - 1];
			if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			} else if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			}
			return;
		}

		if (event.altKey || event.ctrlKey || event.metaKey) return;

		if (game.phase === 'prompt') {
			const key = event.key.toLowerCase();
			if (key === 'y' || event.key === 'Enter') {
				claim(event, true);
				game.accept(prefersReducedMotion());
			} else if (key === 'n' || event.key === 'Escape') {
				claim(event, true);
				game.refuse();
			}
			return;
		}

		if (game.phase === 'refused') {
			if (event.key === 'Escape') {
				claim(event, false);
				close();
			}
			return;
		}

		if (game.phase === 'booting') {
			// Any key skips the power-on print.
			claim(event, event.key === ' ');
			game.beginPlay();
			return;
		}

		if (game.consentPending) {
			const key = event.key.toLowerCase();
			if (key === 'y' || key === 'n') {
				claim(event, true);
				game.grantWasmConsent(key === 'y');
				return;
			}
		}

		if (event.key === 'Escape') {
			claim(event, false);
			// Layered: cancelling a held token never closes the overlay.
			if (game.held) game.cancelPickup();
			else close();
			return;
		}

		if (game.phase === 'complete') return;

		switch (event.key.toLowerCase()) {
			case 'h':
				claim(event, false);
				game.hint();
				return;
			case 'r':
				claim(event, false);
				void game.recompile();
				return;
			case 'm':
				claim(event, false);
				game.toggleMute();
				return;
		}

		if (!CLAIMED.has(event.key)) return;

		const slotCount = game.puzzle.slots.length;
		const trayCount = game.available.length;

		switch (event.key) {
			case 'ArrowLeft':
			case 'ArrowUp':
				claim(event, true);
				if (region === 'tray') game.trayCursor = (game.trayCursor - 1 + Math.max(trayCount, 1)) % Math.max(trayCount, 1);
				else game.slotCursor = (game.slotCursor - 1 + slotCount) % slotCount;
				return;

			case 'ArrowRight':
			case 'ArrowDown':
				claim(event, true);
				if (region === 'tray') game.trayCursor = (game.trayCursor + 1) % Math.max(trayCount, 1);
				else game.slotCursor = (game.slotCursor + 1) % slotCount;
				return;

			case 'Home':
				claim(event, true);
				region = 'slots';
				game.slotCursor = nextEmpty(slotCount - 1, 1);
				return;

			case 'End':
				claim(event, true);
				region = 'slots';
				game.slotCursor = nextEmpty(0, -1);
				return;

			case 'Backspace':
			case 'Delete':
				claim(event, true);
				game.retract(game.slotCursor);
				return;

			case 'Enter':
			case ' ': {
				claim(event, true);
				if (region === 'tray') {
					const tile = game.available[game.trayCursor];
					if (!tile) return;
					if (game.held?.id === tile.id) {
						// A second Enter on the held tile carries it to the board.
						region = 'slots';
						game.slotCursor = nextEmpty(game.slotCursor - 1, 1);
						return;
					}
					game.pickUp(tile);
					return;
				}
				if (game.held) commit(game.slotCursor, game.held);
				else if (game.fills[game.slotCursor]) game.retract(game.slotCursor);
				return;
			}
		}
	}

	function onSlotClick(index: number): void {
		region = 'slots';
		game.slotCursor = index;
		if (game.held) commit(index, game.held);
		else if (game.fills[index]) game.retract(index);
	}

	function onGrab(event: PointerEvent, tile: Tile, element: HTMLElement): void {
		region = 'tray';
		const position = game.available.findIndex((candidate) => candidate.id === tile.id);
		if (position >= 0) game.trayCursor = position;
		controller?.begin(event, tile, element);
	}
</script>

<div
	bind:this={root}
	class="cb-root"
	role="dialog"
	aria-modal="true"
	aria-labelledby="cb-title"
	aria-describedby="cb-progress"
>
	<button class="cb-backdrop" type="button" aria-label="Close Codebreaker" onclick={close}></button>

	<div bind:this={shell} class="cb-shell" data-pane={pane}>
		<div class="cb-bar">
			<svg class="cb-bar-mark" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
				<g stroke="currentColor" stroke-width="1" fill="none" shape-rendering="crispEdges">
					<path d="M6 0 V12" />
					<path d="M0 6 H5" />
					<path d="M7 6 H12" />
				</g>
			</svg>

			<span class="cb-bar-title" id="cb-title">Mutant Codebreaker</span>
			<span class="cb-bar-progress" id="cb-progress">{game.progressLabel}</span>

			<svg class="cb-wave" width="56" height="14" viewBox="0 0 56 14" aria-hidden="true">
				{#each waveform as height, index (index)}
					<rect x={index * 11 + 1} y={14 - height} width="8" height={height} />
				{/each}
			</svg>
			<span class="cb-visually-hidden">Difficulty {game.puzzle.difficulty} of 5</span>

			<div class="cb-bar-actions">
				<button
					type="button"
					class="cb-btn"
					aria-pressed={!game.muted}
					onclick={() => game.toggleMute()}
					title="Sound effects ({game.muted ? 'off' : 'on'}) — M"
					disabled={game.audioState === 'unsupported'}
				>
					{game.audioState === 'unsupported'
						? 'no audio'
						: game.audioState === 'blocked' && !game.muted
							? 'audio blocked'
							: game.muted
								? 'sfx off'
								: 'sfx on'}
				</button>

				<span class="cb-chip" data-status={game.wasmView.status} class:is-sweeping={game.wasmView.status === 'downloading' && chipAnimates()}>
					<span aria-hidden="true">{chip.mark}</span>
					<span>wasm {chip.text}</span>
				</span>

				<button type="button" class="cb-btn" onclick={close} aria-label="Close Codebreaker">✕</button>
			</div>
		</div>

		<TerminalPane
			puzzle={game.puzzle}
			fills={game.fills}
			armed={game.armedSlot}
			errorSlot={game.errorSlot}
			cursor={game.slotCursor}
			active={region === 'slots'}
			solved={game.phase === 'solved'}
			{output}
			onSlot={onSlotClick}
		/>

		<section class="cb-pane cb-tray" aria-label="Token tray">
			<span class="cb-corner tl" aria-hidden="true"></span>
			<span class="cb-corner br" aria-hidden="true"></span>
			<div class="cb-pane-head">
				<span>tokens</span>
				<span>{game.filledCount}/{game.puzzle.slots.length} placed</span>
			</div>
			<div class="cb-pane-body">
				<TokenTray
					tiles={game.available}
					held={game.held}
					cursor={game.trayCursor}
					active={region === 'tray'}
					{onGrab}
				/>
			</div>
		</section>

		<section class="cb-pane cb-stream" aria-label="Compiler">
			<div class="cb-stream-side">
				<PipelineStrip reached={game.reached} {failed} solved={game.phase === 'solved'} />

				<div class="cb-actions">
					<button
						bind:this={hintButton}
						type="button"
						class="cb-btn"
						onclick={() => game.hint()}
						disabled={game.hintsShown >= game.puzzle.hints.length}
					>
						hint ({game.puzzle.hints.length - game.hintsShown})
					</button>

					<button
						bind:this={recompileButton}
						type="button"
						class="cb-btn cb-btn-primary"
						onclick={() => void game.recompile()}
						disabled={game.wasmBusy || game.wasmView.status === 'disabled' || game.wasmView.status === 'failed'}
						title={game.wasmView.status === 'disabled' || game.wasmView.status === 'failed'
							? `wasm host unavailable: ${game.wasmView.reason}`
							: 'Run the real Mutant compiler'}
					>
						{game.wasmBusy ? 'linking…' : 'recompile'}
					</button>
				</div>

				{#if game.consentPending}
					<div class="cb-actions">
						<button type="button" class="cb-btn cb-btn-primary" onclick={() => game.grantWasmConsent(true)}>
							[Y] link
						</button>
						<button type="button" class="cb-btn" onclick={() => game.grantWasmConsent(false)}>
							[N] skip
						</button>
					</div>
				{/if}

				{#if game.phase === 'solved'}
					<div class="cb-actions">
						<button type="button" class="cb-btn cb-btn-primary" onclick={() => game.nextPuzzle()}>
							{game.puzzle.ordinal >= PUZZLE_COUNT ? 'collect reward' : 'next objective →'}
						</button>
					</div>
				{/if}
			</div>

			<CompilerStream lines={game.lines} />
		</section>

		<div class="cb-tabs" role="tablist" aria-label="Panes">
			<!-- Two tabs, not three: the tray never hides — it is a pinned rail in
			     every mode, so tap-a-tile-then-tap-a-slot always works. -->
			<button
				type="button"
				class="cb-tab"
				role="tab"
				aria-selected={pane === 'source'}
				onclick={() => (pane = 'source')}>source</button
			>
			<button
				type="button"
				class="cb-tab"
				role="tab"
				aria-selected={pane === 'stream'}
				onclick={() => (pane = 'stream')}>stream</button
			>
		</div>
	</div>

	<canvas bind:this={canvas} class="cb-particles" aria-hidden="true"></canvas>
	<div bind:this={dragLayer} class="cb-drag-layer" aria-hidden="true"></div>

	{#if game.phase === 'prompt' || game.phase === 'refused' || game.phase === 'booting'}
		<BootSequence
			phase={game.phase}
			onAccept={() => game.accept(prefersReducedMotion())}
			onRefuse={() => game.refuse()}
			onDismiss={close}
			onBooted={() => game.beginPlay()}
		/>
	{/if}

	{#if game.phase === 'complete'}
		<RewardCard
			save={game.save}
			onReplay={() => {
				game.loadPuzzle(0);
				game.phase = 'playing';
			}}
			onClose={close}
		/>
	{/if}

	<p class="cb-visually-hidden" role="status" aria-live="assertive">{game.announcement}</p>
</div>
