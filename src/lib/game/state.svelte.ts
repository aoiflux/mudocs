/**
 * The game's single reactive store.
 *
 * Everything the overlay renders is derived from here, and every mutation runs
 * the local validator, so the compiler stream, the pipeline strip, the board
 * outline and the live regions can never disagree about what just happened.
 *
 * The local validator is authoritative for progression. `recompile()` asks the
 * real 57 MB Go compiler and reconciles its answer *alongside* the local one —
 * never instead of it. A disagreement is reported and the player still advances,
 * because a bug in this game must not be able to block someone.
 */

import * as audio from './audio';
import { assembledSource, validate, type Fills } from './engine';
import { loadSave, writeSave, type SaveV1 } from './persistence';
import { PUZZLE_COUNT, PUZZLES, puzzleById } from './puzzles';
import type { Diagnostic, Puzzle, Stage, Tile } from './types';
import * as wasm from './wasm';

export type Phase = 'prompt' | 'refused' | 'booting' | 'playing' | 'solved' | 'complete';

export type LogKind = 'system' | 'error' | 'warning' | 'ok' | 'info' | 'wasm' | 'bytecode';

export type LogLine = {
	id: number;
	kind: LogKind;
	text: string;
	source?: string;
};

export type WasmVerdict =
	| { kind: 'none' }
	| { kind: 'verified'; output: string }
	| { kind: 'drift'; output: string }
	| { kind: 'expected'; output: string }
	| { kind: 'disagrees'; output: string }
	| { kind: 'curious'; output: string; ok: boolean };

let logSequence = 0;

export class GameState {
	// --- lifecycle -----------------------------------------------------------
	phase = $state<Phase>('prompt');
	pathname = $state('/');
	closing = $state(false);

	// --- board ---------------------------------------------------------------
	puzzleIndex = $state(0);
	fills = $state<(Tile | null)[]>([]);
	held = $state<Tile | null>(null);
	armedSlot = $state<number | null>(null);
	errorSlot = $state<number | null>(null);
	slotCursor = $state(0);
	trayCursor = $state(0);

	// --- feedback ------------------------------------------------------------
	lines = $state<LogLine[]>([]);
	announcement = $state('');
	reached = $state<Stage>('lex');
	diagnostics = $state<Diagnostic[]>([]);
	hintsShown = $state(0);
	errorCount = $state(0);
	startedAt = $state(0);
	elapsedMs = $state(0);

	// --- services ------------------------------------------------------------
	muted = $state(true);
	audioState = $state<audio.AudioStatus>('idle');
	wasmView = $state<wasm.WasmSnapshot>({ status: 'idle', elapsedSeconds: 0, reason: '' });
	wasmBusy = $state(false);
	verdict = $state<WasmVerdict>({ kind: 'none' });
	consentPending = $state(false);

	// --- persistence ---------------------------------------------------------
	save = $state<SaveV1>(loadSave());

	puzzle = $derived<Puzzle>(PUZZLES[this.puzzleIndex]);

	/** Tray tiles that are not currently sitting in a slot. */
	available = $derived<Tile[]>(
		this.puzzle.tray.filter((tile) => !this.fills.some((fill) => fill?.id === tile.id))
	);

	filledCount = $derived(this.fills.filter((fill) => fill != null).length);

	source = $derived(assembledSource(this.puzzle, this.fills as Fills));

	solvedCount = $derived(this.save.solved.length);

	progressLabel = $derived(
		`PUZZLE ${String(this.puzzle.ordinal).padStart(2, '0')}/${String(PUZZLE_COUNT).padStart(2, '0')} · ${this.puzzle.concept}`
	);

	// -------------------------------------------------------------------------
	// Logging
	// -------------------------------------------------------------------------

	log(kind: LogKind, text: string, source?: string): void {
		logSequence += 1;
		this.lines = [...this.lines, { id: logSequence, kind, text, source }].slice(-120);
	}

	say(text: string): void {
		// A trailing space forces re-announcement when the same text repeats.
		this.announcement = this.announcement === text ? `${text} ` : text;
	}

	// -------------------------------------------------------------------------
	// Session
	// -------------------------------------------------------------------------

	accept(prefersReduced: boolean): void {
		this.save = { ...this.save, discovered: true, refused: false };
		this.persist();

		this.audioState = audio.initAudio(prefersReduced);
		void audio.setMuted(this.save.muted).then((state) => {
			this.audioState = state;
		});
		this.muted = this.save.muted;

		this.phase = 'booting';
		audio.bootHum();

		const resume = this.save.lastPuzzle ? puzzleById(this.save.lastPuzzle) : null;
		const nextUnsolved = PUZZLES.find((puzzle) => !this.save.solved.includes(puzzle.id));
		const target = resume && !this.save.solved.includes(resume.id) ? resume : (nextUnsolved ?? PUZZLES[0]);
		this.loadPuzzle(target.ordinal - 1, false);
	}

	refuse(): void {
		this.save = { ...this.save, discovered: true, refused: true };
		this.persist();
		this.phase = 'refused';
	}

	beginPlay(): void {
		this.phase = 'playing';
		this.startedAt = Date.now();
	}

	loadPuzzle(index: number, announce = true): void {
		const bounded = Math.max(0, Math.min(PUZZLES.length - 1, index));
		this.puzzleIndex = bounded;
		this.fills = PUZZLES[bounded].slots.map(() => null);
		this.held = null;
		this.armedSlot = null;
		this.errorSlot = null;
		this.slotCursor = 0;
		this.trayCursor = 0;
		this.diagnostics = [];
		this.reached = 'lex';
		this.hintsShown = 0;
		this.errorCount = 0;
		this.verdict = { kind: 'none' };
		this.startedAt = Date.now();
		audio.resetCombo();

		this.save = { ...this.save, lastPuzzle: this.puzzle.id };
		this.persist();

		if (announce) {
			this.log('system', `> loading ${this.puzzle.id} · difficulty ${this.puzzle.difficulty}/5`);
			this.say(`Puzzle ${this.puzzle.ordinal} of ${PUZZLE_COUNT}. ${this.puzzle.title}. ${this.puzzle.brief}`);
		}

		// Warm the real compiler once the player is past the first board, so the
		// download happens while they are busy rather than while they wait.
		//
		// Only for a player who has already linked the host once. `warm()` fetches
		// and compiles a 59.6 MB Go module; on a constrained machine that is enough
		// to take the renderer down, and here it would land inside the boot print,
		// before the board has painted — the player would watch the game die
		// without ever having asked for a compiler. Everyone else links on their
		// first explicit RECOMPILE, which is what `> wasm host: DEFERRED` promises.
		if (this.puzzle.ordinal === 2 && this.save.wasmConsent) void this.warmWasm();
	}

	nextPuzzle(): void {
		if (this.puzzle.ordinal >= PUZZLE_COUNT) {
			this.phase = 'complete';
			this.save = { ...this.save, seenReward: true };
			this.persist();
			return;
		}
		this.phase = 'playing';
		this.loadPuzzle(this.puzzleIndex + 1);
	}

	// -------------------------------------------------------------------------
	// Board mutation
	// -------------------------------------------------------------------------

	pickUp(tile: Tile): void {
		this.held = tile;
		audio.tokenPickUp(this.slotCursor);
		this.say(`picked up: ${tile.literal}`);
	}

	cancelPickup(): void {
		if (!this.held) return;
		const literal = this.held.literal;
		this.held = null;
		this.armedSlot = null;
		this.say(`cancelled: ${literal} returned to the tray`);
	}

	/** Place a tile. Returns true when the slot accepted it structurally. */
	place(slotIndex: number, tile: Tile): boolean {
		const spec = this.puzzle.slots.find((candidate) => candidate.index === slotIndex);
		if (!spec) return false;

		const next = [...this.fills];
		next[slotIndex] = tile;
		this.fills = next;
		this.held = null;
		this.armedSlot = null;

		const result = validate(this.puzzle, this.fills as Fills);
		this.diagnostics = result.diagnostics;
		this.reached = result.reached;

		const failure = result.diagnostics.find((entry) => entry.severity === 'error');
		const warning = result.diagnostics.find((entry) => entry.severity === 'warning');

		this.say(`placed ${tile.literal} in slot ${slotIndex + 1} of ${this.puzzle.slots.length}`);
		audio.tokenSnap(!failure);

		for (const entry of result.diagnostics) {
			if (entry.severity === 'ok') continue;
			this.log(
				entry.severity === 'warning' ? 'warning' : entry.rung === 'order' ? 'bytecode' : 'error',
				entry.text,
				entry.source
			);
		}

		if (failure) {
			this.errorCount += 1;
			this.errorSlot = failure.slot;
			audio.errorBuzz();
			this.say(`slot ${(failure.slot ?? slotIndex) + 1} rejected: ${failure.text}`);
			return false;
		}

		this.errorSlot = warning?.slot ?? null;

		if (result.solved) this.onSolved();
		return true;
	}

	retract(slotIndex: number): void {
		const tile = this.fills[slotIndex];
		if (!tile) return;

		const next = [...this.fills];
		next[slotIndex] = null;
		this.fills = next;
		this.errorSlot = null;

		const result = validate(this.puzzle, this.fills as Fills);
		this.diagnostics = result.diagnostics;
		this.reached = result.reached;
		this.say(`removed ${tile.literal} from slot ${slotIndex + 1}`);
	}

	private onSolved(): void {
		this.phase = 'solved';
		this.elapsedMs = Date.now() - this.startedAt;

		this.log('ok', `> program compiled — ${this.puzzle.slots.length} tokens resolved`);
		for (const line of this.puzzle.expectedOutput.split('\n')) this.log('ok', line, 'vm');

		const id = this.puzzle.id;
		const previous = this.save.best[id];
		const attempt = { ms: this.elapsedMs, hints: this.hintsShown, errors: this.errorCount };
		const best = !previous || attempt.ms < previous.ms ? attempt : previous;

		this.save = {
			...this.save,
			solved: this.save.solved.includes(id) ? this.save.solved : [...this.save.solved, id],
			best: { ...this.save.best, [id]: best }
		};
		this.persist();

		audio.successFanfare(false);
		this.say(`Solved. ${this.puzzle.title}. Output: ${this.puzzle.expectedOutput.replace(/\n/g, ', ')}`);
	}

	// -------------------------------------------------------------------------
	// Hints
	// -------------------------------------------------------------------------

	hint(): void {
		if (this.hintsShown >= this.puzzle.hints.length) {
			this.log('info', '> no hints remain for this objective');
			return;
		}
		const text = this.puzzle.hints[this.hintsShown];
		this.hintsShown += 1;
		this.log('info', `hint ${this.hintsShown}/${this.puzzle.hints.length}: ${text}`);
		this.say(`Hint ${this.hintsShown}: ${text}`);
		audio.hintChime();
	}

	// -------------------------------------------------------------------------
	// Audio
	// -------------------------------------------------------------------------

	toggleMute(): void {
		this.muted = !this.muted;
		this.save = { ...this.save, muted: this.muted };
		this.persist();
		this.say(this.muted ? 'audio muted' : 'audio on');

		// The status is re-read from the promise rather than kept as the snapshot
		// `initAudio` returned. A context that came back suspended is not a dead
		// one — this click is a fresh user gesture and a real second chance at
		// `resume()` — so the toggle has to be allowed to change its own verdict.
		void audio.setMuted(this.muted).then((state) => {
			this.audioState = state;
			// Proof the switch did something. Without it the first confirmation a
			// player gets that sound is on is whenever they next move a tile.
			if (!this.muted && state === 'running') audio.glyphHover();
		});
	}

	// -------------------------------------------------------------------------
	// The real compiler
	// -------------------------------------------------------------------------

	bindWasm(): () => void {
		return wasm.subscribe((snapshot) => {
			this.wasmView = snapshot;
		});
	}

	async warmWasm(): Promise<void> {
		if (wasm.shouldAskConsent() && !this.save.wasmConsent) {
			this.consentPending = true;
			return;
		}
		await wasm.warm(this.pathname);
	}

	grantWasmConsent(granted: boolean): void {
		this.consentPending = false;
		if (!granted) {
			wasm.markDisabled('link declined');
			this.log('wasm', '> link declined; local validator stands');
			return;
		}
		this.save = { ...this.save, wasmConsent: true };
		this.persist();
		void wasm.warm(this.pathname);
	}

	/**
	 * Ask the real compiler. Reconciliation is decorative by design — the row
	 * that matters is a solved, non-`wasmVerifiable` puzzle, where the browser
	 * build tells the player the truth about its own sandbox.
	 */
	async recompile(): Promise<void> {
		if (this.wasmBusy) return;

		if (this.consentPending || (wasm.shouldAskConsent() && !this.save.wasmConsent)) {
			this.consentPending = true;
			this.log('wasm', `> link real compiler? ${wasm.WASM_SIZE_LABEL}. [Y/N]`);
			return;
		}

		// An explicit RECOMPILE *is* the consent. Recording it lets the next
		// session prefetch on puzzle 2 instead of making the player wait here.
		if (!this.save.wasmConsent) {
			this.save = { ...this.save, wasmConsent: true };
			this.persist();
		}

		this.wasmBusy = true;
		this.log('wasm', '> handing source to the wasm host …');

		const solvedNow = validate(this.puzzle, this.fills as Fills).solved;
		const response = await wasm.run(this.pathname, this.source);
		const output = wasm.summarizePanic(response.output.trim());

		this.wasmBusy = false;

		if (/wasm host (unreachable|unavailable|disabled)/i.test(output)) {
			this.log('wasm', output);
			this.verdict = { kind: 'none' };
			return;
		}

		if (!solvedNow) {
			// Running an unfinished board is legitimate curiosity, and the real
			// error is the reward for it.
			this.log('wasm', output || '(no output)', 'wasm');
			this.verdict = { kind: 'curious', output, ok: response.ok };
			return;
		}

		if (response.ok) {
			const matches = output === this.puzzle.expectedOutput.trim();
			this.verdict = matches ? { kind: 'verified', output } : { kind: 'drift', output };
			this.log('wasm', matches ? 'VERIFIED ✓' : 'ACCEPTED · output drift');
			if (!matches) {
				this.log('wasm', `expected: ${this.puzzle.expectedOutput.replace(/\n/g, ' / ')}`);
				this.log('wasm', `wasm:     ${output.replace(/\n/g, ' / ')}`);
			}
			if (matches) audio.successFanfare(true);
			this.say(matches ? 'Verified by the real compiler.' : 'Accepted. The real compiler produced different output.');
			return;
		}

		if (!this.puzzle.wasmVerifiable) {
			this.verdict = { kind: 'expected', output };
			this.log('wasm', 'EXPECTED · host-bound builtin unavailable in browser mode');
			this.log('wasm', output, 'wasm');
			this.say('Expected. This program needs a builtin the browser build does not have.');
			return;
		}

		// The game and the compiler disagree on a puzzle that should have run.
		// Report it honestly and let the player continue regardless.
		this.verdict = { kind: 'disagrees', output };
		this.log('wasm', 'SOLVED (local) · compiler disagrees');
		this.log('wasm', output, 'wasm');
		this.say('Solved locally. The real compiler disagreed; the diagnostic is in the log.');
	}

	// -------------------------------------------------------------------------

	persist(): void {
		writeSave(this.save);
	}

	teardown(): void {
		wasm.terminate('overlay closed');
		audio.closeAudio();
		this.persist();
	}
}
