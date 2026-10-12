/**
 * The one Mutant REPL runtime the whole site shares.
 *
 * static/repl-worker.js hosts the pinned wasm build (mutant.lock.json,
 * `WASM_SIZE_LABEL` raw). Downloading, compiling and booting it takes seconds
 * to minutes, far longer than any program it runs. So one worker lives for the
 * life of the tab and that cost is paid once:
 *
 * - The root layout calls `preload()` once the first page is idle, unless the
 *   connection or the device says not to (`preloadBlockedReason`).
 * - The playground and the codebreaker call `boot()`, which starts the same
 *   load if preload did not, and `subscribe()` to show how far it has got.
 * - `run()` waits for the runtime, then gives the program alone its time limit.
 *   A run that overruns leaves the Go heap busy, so the worker is replaced.
 *
 * Worker protocol (static/repl-worker.js):
 *   → {type: 'init'}           ← {type: 'progress', loaded} … {type: 'downloaded', loaded}
 *                               ← {type: 'ready'} | {type: 'init-failed', message}
 *   → {id, code}               ← {id, ok, output}
 *
 * Nothing touches `window` or `Worker` at module scope.
 */

import { WASM_BYTES } from '$lib/mutant-pin';

export type ReplPhase = 'idle' | 'downloading' | 'starting' | 'ready' | 'failed';

export type ReplSnapshot = {
	phase: ReplPhase;
	/** Bytes of the wasm received so far. */
	loaded: number;
	/** The size the lock records: the decompressed bytes the stream yields. */
	total: number;
	/** `Date.now()` when the current load began; 0 before any. */
	startedAt: number;
	/** Why the last load failed. */
	reason: string;
};

export type ReplResult = { ok: boolean; output: string; timedOut: boolean };

/** No bytes for this long and the download has stalled. */
const STALL_MS = 30_000;
/** Compiling and booting after the last byte. */
const START_MS = 90_000;

let worker: Worker | null = null;
let state: ReplSnapshot = { phase: 'idle', loaded: 0, total: WASM_BYTES, startedAt: 0, reason: '' };
let booting: Promise<boolean> | null = null;
let settle: ((ready: boolean) => void) | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;
let pending = new Map<string, (response: { ok: boolean; output: string }) => void>();
let sequence = 0;

type Listener = (snapshot: ReplSnapshot) => void;
const listeners = new Set<Listener>();

function update(patch: Partial<ReplSnapshot>): void {
	state = { ...state, ...patch };
	for (const listener of listeners) listener(state);
}

export function subscribe(listener: Listener): () => void {
	listeners.add(listener);
	listener(state);
	return () => listeners.delete(listener);
}

export function replSnapshot(): ReplSnapshot {
	return state;
}

function arm(ms: number, why: string): void {
	disarm();
	watchdog = setTimeout(() => fail(why), ms);
}

function disarm(): void {
	if (watchdog) clearTimeout(watchdog);
	watchdog = null;
}

/** Drop the worker, answer whatever was waiting on it, and settle the boot. */
function discard(why: string): void {
	disarm();
	worker?.terminate();
	worker = null;
	for (const [, resolve] of pending) resolve({ ok: false, output: `Mutant runtime unavailable: ${why}` });
	pending = new Map();
	settle?.(false);
	settle = null;
	booting = null;
}

function fail(why: string): void {
	discard(why);
	update({ phase: 'failed', reason: why });
}

function onMessage(event: MessageEvent): void {
	const message = event.data ?? {};
	switch (message.type) {
		case 'progress':
			// The worker reloads by itself after the Go program exits; that is not
			// a load anyone is waiting on, so a ready runtime ignores its progress.
			if (state.phase !== 'downloading') return;
			update({ loaded: message.loaded });
			arm(STALL_MS, 'the download stalled');
			return;
		case 'downloaded':
			if (state.phase !== 'downloading') return;
			update({ phase: 'starting', loaded: message.loaded });
			arm(START_MS, 'the runtime did not start');
			return;
		case 'ready':
			disarm();
			update({ phase: 'ready', reason: '' });
			settle?.(true);
			settle = null;
			return;
		case 'init-failed':
			fail(String(message.message ?? 'the runtime failed to start'));
			return;
	}

	const resolve = pending.get(message.id);
	if (!resolve) return;
	pending.delete(message.id);
	resolve({ ok: Boolean(message.ok), output: String(message.output ?? '') });
}

/**
 * Start the runtime, or join the load already under way. Resolves true once it
 * can run a program, false if the load failed (the snapshot says why). Calling
 * it after a failure tries again.
 */
export function boot(): Promise<boolean> {
	if (state.phase === 'ready') return Promise.resolve(true);
	if (booting) return booting;

	if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') {
		update({ phase: 'failed', reason: 'this browser cannot run WebAssembly in a worker' });
		return Promise.resolve(false);
	}

	booting = new Promise<boolean>((resolve) => (settle = resolve));
	const started = booting;
	try {
		worker = new Worker('/repl-worker.js');
	} catch {
		fail('the worker could not be created');
		return started;
	}
	worker.onmessage = onMessage;
	worker.onerror = () => fail('the worker crashed');
	update({ phase: 'downloading', loaded: 0, startedAt: Date.now(), reason: '' });
	arm(STALL_MS, 'the download stalled');
	worker.postMessage({ type: 'init' });
	return started;
}

type ConstrainedNavigator = Navigator & {
	connection?: { saveData?: boolean; effectiveType?: string };
	deviceMemory?: number;
};

/**
 * Why the site should not fetch the runtime unasked. A page that needs it
 * (the playground, a RECOMPILE) still calls `boot()`: asking for it is consent.
 */
export function preloadBlockedReason(): string | null {
	if (typeof navigator === 'undefined') return 'server';
	const nav = navigator as ConstrainedNavigator;
	if (nav.connection?.saveData) return 'data saver on';
	const effective = nav.connection?.effectiveType;
	if (effective === 'slow-2g' || effective === '2g' || effective === '3g') return 'connection too slow';
	if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4) return 'device memory low';
	return null;
}

/** Load the runtime in the background, if nothing argues against it. */
export function preload(): void {
	if (state.phase !== 'idle' || preloadBlockedReason()) return;
	void boot();
}

/**
 * Run a program. Waits for the runtime first; `timeoutMs` covers the program
 * only. On a timeout the worker is replaced, because the Go heap is still in
 * that program and would answer nothing else until it returned.
 */
export async function run(code: string, timeoutMs: number): Promise<ReplResult> {
	if (!(await boot()) || !worker) {
		return { ok: false, output: `Mutant runtime unavailable: ${state.reason}`, timedOut: false };
	}

	const active = worker;
	const id = `run-${(sequence += 1)}`;
	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			pending.delete(id);
			discard('a program overran its time limit, so the runtime restarted');
			update({ phase: 'idle', loaded: 0, startedAt: 0 });
			void boot();
			resolve({ ok: false, output: `Execution timed out after ${timeoutMs} ms.`, timedOut: true });
		}, timeoutMs);

		pending.set(id, (response) => {
			clearTimeout(timer);
			resolve({ ...response, timedOut: false });
		});
		active.postMessage({ id, code });
	});
}
