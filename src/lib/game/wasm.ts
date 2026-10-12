/**
 * A lazy client for the real Mutant compiler.
 *
 * The site already ships `static/wasm-repl/mutant_repl.wasm` (the pinned Go build, `WASM_SIZE_LABEL`)
 * behind `static/repl-worker.js`, protocol `postMessage({id, code})` →
 * `{id, ok, output}`. This module opens its own worker so the game can produce
 * genuine compiler diagnostics — and never touches `/playground`, which owns the
 * same runtime on its own page.
 *
 * Three independent guards make a second Go heap impossible:
 *   1. the bridge disables itself on any `/playground` path,
 *   2. the `worker` binding below is module-level and checked before construction,
 *   3. the worker is terminated on close and on a prolonged tab hide.
 *
 * The local validator is always authoritative for progression. Everything here
 * only decorates — if it never loads, all eight puzzles remain completable.
 *
 * Nothing touches `window` or `Worker` at module scope.
 */

import { prefersReducedMotion } from '$lib/artist/motion';
import { WASM_SIZE_LABEL } from '$lib/mutant-pin';

export type WasmStatus = 'idle' | 'downloading' | 'ready' | 'failed' | 'disabled';

export type ReplRequest = { id: string; code: string };
export type ReplResponse = { id: string; ok: boolean; output: string };

/** The size the chip reports. Real: read from the lock the served artifact is verified against. */
export { WASM_SIZE_LABEL };

const WARM_TIMEOUT_MS = 45_000;
const RUN_TIMEOUT_MS = 6_000;
const HIDDEN_TERMINATE_MS = 60_000;

/** Single-instance guard. Never construct a Worker without checking this. */
let worker: Worker | null = null;
let status: WasmStatus = 'idle';
let startedAt = 0;
let reason = '';
let pending = new Map<string, (response: ReplResponse) => void>();
let sequence = 0;
let hiddenTimer: ReturnType<typeof setTimeout> | null = null;
let visibilityBound = false;

type Listener = (snapshot: WasmSnapshot) => void;
const listeners = new Set<Listener>();

export type WasmSnapshot = {
	status: WasmStatus;
	/** Whole seconds since the warm started — an honest timer, not a fake percentage. */
	elapsedSeconds: number;
	reason: string;
};

function snapshot(): WasmSnapshot {
	return {
		status,
		elapsedSeconds: startedAt > 0 ? Math.floor((Date.now() - startedAt) / 1000) : 0,
		reason
	};
}

function publish(): void {
	const current = snapshot();
	for (const listener of listeners) listener(current);
}

export function subscribe(listener: Listener): () => void {
	listeners.add(listener);
	listener(snapshot());
	return () => listeners.delete(listener);
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
 * Why the bridge would refuse to boot. Returns null when it is free to try.
 * Deliberately conservative — a download this size is not something to sneak onto
 * a metered connection.
 */
export function disabledReason(pathname: string): string | null {
	if (typeof window === 'undefined') return 'server';
	if (pathname.startsWith('/playground')) return 'host in use';
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
	const nav = navigator as ConstrainedNavigator;
	const effective = nav.connection?.effectiveType;
	return effective === '3g' || nav.connection?.saveData === true;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

function bindVisibility(): void {
	if (visibilityBound || typeof document === 'undefined') return;
	visibilityBound = true;
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') {
			hiddenTimer = setTimeout(() => {
				terminate('tab hidden');
			}, HIDDEN_TERMINATE_MS);
		} else if (hiddenTimer) {
			clearTimeout(hiddenTimer);
			hiddenTimer = null;
		}
	});
}

function handleMessage(event: MessageEvent<ReplResponse>): void {
	const response = event.data;
	const resolve = pending.get(response.id);
	if (!resolve) return;
	pending.delete(response.id);
	resolve(response);
}

/**
 * Construct the worker. This downloads nothing on its own — `repl-worker.js`
 * initialises its runtime lazily on the *first* message, so the wasm fetch
 * begins at `warm()`, not here.
 */
function ensureWorker(pathname: string): Worker | null {
	if (worker) return worker;

	const blocked = disabledReason(pathname);
	if (blocked) {
		status = 'disabled';
		reason = blocked;
		publish();
		return null;
	}

	try {
		// Root-relative static path served by the adapter — the same one
		// `playground/+page.svelte` uses.
		worker = new Worker('/repl-worker.js');
		worker.onmessage = handleMessage;
		worker.onerror = () => {
			fail('worker error');
		};
		bindVisibility();
		return worker;
	} catch {
		status = 'failed';
		reason = 'worker construction failed';
		publish();
		return null;
	}
}

function fail(why: string): void {
	status = 'failed';
	reason = why;
	for (const [, resolve] of pending) {
		resolve({ id: 'aborted', ok: false, output: `wasm host unreachable: ${why}` });
	}
	pending.clear();
	publish();
}

export function terminate(why = 'closed'): void {
	if (hiddenTimer) {
		clearTimeout(hiddenTimer);
		hiddenTimer = null;
	}
	if (!worker) return;
	worker.terminate();
	worker = null;
	pending = new Map();
	if (status !== 'disabled') {
		status = 'idle';
		reason = why;
	}
	startedAt = 0;
	publish();
}

function post(request: ReplRequest, timeoutMs: number): Promise<ReplResponse> {
	return new Promise((resolve) => {
		const active = worker;
		if (!active) {
			resolve({ id: request.id, ok: false, output: 'wasm host unavailable' });
			return;
		}

		const timer = setTimeout(() => {
			pending.delete(request.id);
			resolve({ id: request.id, ok: false, output: `timeout after ${timeoutMs} ms` });
		}, timeoutMs);

		pending.set(request.id, (response) => {
			clearTimeout(timer);
			resolve(response);
		});

		active.postMessage(request);
	});
}

/**
 * Begin the download by sending a real, trivial program. Called on puzzle 2, so
 * the link happens while the player is busy and the UI stays interactive.
 */
export async function warm(pathname: string): Promise<WasmStatus> {
	if (status === 'ready' || status === 'downloading' || status === 'disabled') return status;

	const active = ensureWorker(pathname);
	if (!active) return status;

	status = 'downloading';
	reason = '';
	startedAt = Date.now();
	publish();

	const response = await post({ id: `cb-warm-${(sequence += 1)}`, code: '1;' }, WARM_TIMEOUT_MS);

	if (!response.ok && /timeout after/i.test(response.output)) {
		fail('link timed out');
		return status;
	}
	if (/WASM REPL init\/exec failed/i.test(response.output)) {
		fail('runtime init failed');
		return status;
	}

	status = 'ready';
	reason = '';
	publish();
	return status;
}

/** Run a program. Returns the raw worker response; the caller reconciles it. */
export async function run(pathname: string, code: string): Promise<ReplResponse> {
	if (status === 'disabled') {
		return { id: 'disabled', ok: false, output: `wasm host disabled: ${reason}` };
	}
	if (status !== 'ready') {
		const result = await warm(pathname);
		if (result !== 'ready') {
			return { id: 'unavailable', ok: false, output: `wasm host unavailable: ${reason}` };
		}
	}

	const response = await post({ id: `cb-run-${(sequence += 1)}`, code }, RUN_TIMEOUT_MS);

	// The worker prefixes its own boot failures. Those are host problems, not
	// puzzle problems, and must never be shown as a compiler diagnostic.
	if (/WASM REPL init\/exec failed/i.test(response.output)) {
		fail('runtime init failed');
		return { ...response, output: `wasm host unreachable; local validator stands` };
	}

	return response;
}

export function markDisabled(why: string): void {
	status = 'disabled';
	reason = why;
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
