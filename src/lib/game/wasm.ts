/**
 * The game's client for the real Mutant compiler.
 *
 * It runs programs in the site's one shared REPL runtime ($lib/repl/host), the
 * same one the playground uses, so there is only ever one Go heap in a tab and
 * a runtime the layout already loaded in the background is ready at once.
 *
 * The local validator is always authoritative for progression. Everything here
 * only decorates — if it never loads, all eight puzzles remain completable.
 *
 * Nothing touches `window` or `Worker` at module scope.
 */

import { prefersReducedMotion } from '$lib/artist/motion';
import { WASM_SIZE_LABEL } from '$lib/mutant-pin';
import * as host from '$lib/repl/host';

export type WasmStatus = 'idle' | 'downloading' | 'ready' | 'failed' | 'disabled';

export type ReplRequest = { id: string; code: string };
export type ReplResponse = { id: string; ok: boolean; output: string };

/** The size the chip reports. Real: read from the lock the served artifact is verified against. */
export { WASM_SIZE_LABEL };

const RUN_TIMEOUT_MS = 6_000;

/** Why the game itself declined the runtime ("link declined", a weak device); '' when it has not. */
let declined = '';

type Listener = (snapshot: WasmSnapshot) => void;
const listeners = new Set<Listener>();

export type WasmSnapshot = {
	status: WasmStatus;
	/** Whole seconds since the warm started — an honest timer, not a fake percentage. */
	elapsedSeconds: number;
	reason: string;
};

function snapshot(): WasmSnapshot {
	if (declined) return { status: 'disabled', elapsedSeconds: 0, reason: declined };
	const shared = host.replSnapshot();
	if (shared.phase === 'downloading' || shared.phase === 'starting') {
		const elapsedSeconds = shared.startedAt > 0 ? Math.floor((Date.now() - shared.startedAt) / 1000) : 0;
		return { status: 'downloading', elapsedSeconds, reason: shared.reason };
	}
	return { status: shared.phase, elapsedSeconds: 0, reason: shared.reason };
}

function publish(): void {
	const current = snapshot();
	for (const listener of listeners) listener(current);
}

export function subscribe(listener: Listener): () => void {
	listeners.add(listener);
	const stop = host.subscribe(() => listener(snapshot()));
	return () => {
		stop();
		listeners.delete(listener);
	};
}

export function wasmSnapshot(): WasmSnapshot {
	return snapshot();
}

// ---------------------------------------------------------------------------
// Capability detection
// ---------------------------------------------------------------------------

type ConstrainedNavigator = Navigator & {
	connection?: { saveData?: boolean; effectiveType?: string };
	deviceMemory?: number;
};

/**
 * Why the game would refuse to boot the runtime. Returns null when it is free
 * to try. Deliberately conservative — a download this size is not something to
 * sneak onto a metered connection. The playground shares the runtime, so it is
 * no reason to refuse.
 */
export function disabledReason(): string | null {
	if (typeof window === 'undefined') return 'server';
	if (typeof Worker === 'undefined') return 'no worker support';
	if (typeof WebAssembly === 'undefined') return 'no webassembly';

	const nav = navigator as ConstrainedNavigator;
	if (nav.connection?.saveData) return 'data saver on';
	const effective = nav.connection?.effectiveType;
	if (effective === '2g' || effective === 'slow-2g') return 'connection too slow';
	if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4) return 'device memory low';

	return null;
}

/** True when we should ask before spending the download rather than just spending it. */
export function shouldAskConsent(): boolean {
	if (typeof navigator === 'undefined') return true;
	if (host.replSnapshot().phase === 'ready') return false;
	const nav = navigator as ConstrainedNavigator;
	const effective = nav.connection?.effectiveType;
	return effective === '3g' || nav.connection?.saveData === true;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * The game stops listening. The runtime itself is shared and stays loaded, so
 * reopening the game, or visiting the playground, does not load it again.
 */
export function terminate(): void {
	// Nothing of the game's own to release: subscribers unsubscribe themselves.
}

/** Start the shared runtime, or join its load. Called on puzzle 2, so it loads while the player is busy. */
export async function warm(): Promise<WasmStatus> {
	if (declined) return 'disabled';
	if (host.replSnapshot().phase !== 'ready') {
		const blocked = disabledReason();
		if (blocked) {
			markDisabled(blocked);
			return 'disabled';
		}
	}
	await host.boot();
	return snapshot().status;
}

/** Run a program. Returns the raw worker response; the caller reconciles it. */
export async function run(code: string): Promise<ReplResponse> {
	if (declined) {
		return { id: 'disabled', ok: false, output: `wasm host disabled: ${declined}` };
	}
	if ((await warm()) !== 'ready') {
		return { id: 'unavailable', ok: false, output: `wasm host unavailable: ${snapshot().reason}` };
	}

	const result = await host.run(code, RUN_TIMEOUT_MS);
	if (result.timedOut) {
		return { id: 'timeout', ok: false, output: `timeout after ${RUN_TIMEOUT_MS} ms` };
	}

	// The worker prefixes its own boot failures. Those are host problems, not
	// puzzle problems, and must never be shown as a compiler diagnostic.
	if (/WASM REPL init\/exec failed|Mutant runtime unavailable/i.test(result.output)) {
		return { id: 'unreachable', ok: false, output: `wasm host unreachable; local validator stands` };
	}

	return { id: 'run', ok: result.ok, output: result.output };
}

export function markDisabled(why: string): void {
	declined = why;
	publish();
}

// ---------------------------------------------------------------------------
// Output shaping
// ---------------------------------------------------------------------------

/**
 * Condense a Go panic to a headline, its goroutine, and at most six frames.
 *
 * Deliberately duplicated from `playground/+page.svelte` rather than extracted:
 * the playground owns its own presentation, and this game is meant to be
 * removable without touching a single line of it.
 */
export function summarizePanic(raw: string): string {
	if (!/^panic:/i.test(raw)) return raw;

	const lines = raw
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	const headline = lines[0] ?? 'panic';
	const goroutine = lines.find((line) => /^goroutine\s+/i.test(line));
	const frames = lines
		.filter((line) => /\/|\\|\.go:\d+/i.test(line) && !/^syscall\/js\.handleEvent/i.test(line))
		.slice(0, 6);

	return [
		headline,
		goroutine ? `context: ${goroutine}` : null,
		frames.length > 0 ? 'stack:' : null,
		...frames.map((line) => `  ${line}`)
	]
		.filter((line): line is string => line !== null)
		.join('\n');
}

/** The chip's glyph and label for each state. */
export function chipLabel(current: WasmSnapshot): { mark: string; text: string } {
	switch (current.status) {
		case 'downloading':
			return { mark: '◐', text: `LINKING · ${WASM_SIZE_LABEL} · ${current.elapsedSeconds}s` };
		case 'ready':
			return { mark: '●', text: 'READY' };
		case 'failed':
			return { mark: '⊘', text: 'OFFLINE' };
		case 'disabled':
			return { mark: '⊘', text: `OFFLINE (${current.reason})` };
		default:
			return { mark: '○', text: 'DEFERRED' };
	}
}

/** Reduced motion also means "do not run a scanline sweep on the chip". */
export function chipAnimates(): boolean {
	return !prefersReducedMotion();
}
