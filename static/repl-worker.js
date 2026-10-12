// The REPL host for the whole site: src/lib/repl/host.ts owns the one worker and
// sends {type: 'init'} to load the runtime ahead of any program, then {id, code}.
// A bare {id, code} with no init first still works: it loads on demand.
let ready = false;
let booting = null;
let invoke = null;
let go = null;

function normalizeCapturedLines(lines) {
	return lines
		.map((line) => String(line ?? '').trim())
		.filter((line) => line.length > 0 && !/^exit code:\s*\d+/i.test(line));
}

async function withCapturedConsole(run) {
	const originalLog = console.log;
	const originalWarn = console.warn;
	const originalError = console.error;
	const captured = [];

	const capture = (...args) => {
		captured.push(args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '));
	};

	console.log = (...args) => {
		capture(...args);
		originalLog(...args);
	};

	console.warn = (...args) => {
		capture(...args);
		originalWarn(...args);
	};

	console.error = (...args) => {
		capture(...args);
		originalError(...args);
	};

	try {
		const value = await run();
		return {
			value,
			captured: normalizeCapturedLines(captured)
		};
	} finally {
		console.log = originalLog;
		console.warn = originalWarn;
		console.error = originalError;
	}
}

function resetRuntime() {
	ready = false;
	booting = null;
	invoke = null;
	go = null;
}

// The exports cmd/replwasm/main_wasm.go sets on the global object. They are the
// REPL's contract; anything else on `self` is not ours to call.
const EVAL_EXPORT = 'mutantReplEval';
const READY_EXPORT = 'mutantReplReady';
const READY_TIMEOUT_MS = 15000;
const WASM_URL = '/wasm-repl/mutant_repl.wasm';
const PROGRESS_EVERY_MS = 200;

// Fetch the wasm, telling the host how many bytes have arrived. The count is of
// the bytes the body yields, which are decompressed even when the transfer was
// not, so it climbs to the size the lock records.
async function fetchCounted(url) {
	const response = await fetch(url);
	if (!response.ok || !response.body) {
		throw new Error(`${url}: HTTP ${response.status}`);
	}

	let loaded = 0;
	let reportedAt = 0;
	const counted = response.body.pipeThrough(
		new TransformStream({
			transform(chunk, controller) {
				loaded += chunk.byteLength;
				const now = Date.now();
				if (now - reportedAt >= PROGRESS_EVERY_MS) {
					reportedAt = now;
					self.postMessage({ type: 'progress', loaded });
				}
				controller.enqueue(chunk);
			},
			flush() {
				self.postMessage({ type: 'downloaded', loaded });
			}
		})
	);
	return new Response(counted, { headers: { 'Content-Type': 'application/wasm' } });
}

async function startRuntime() {
	if (typeof self.Go !== 'function') {
		self.importScripts('/wasm-repl/wasm_exec.js');
	}

	if (typeof self.Go !== 'function') {
		throw new Error('Go runtime bootstrap failed: Go class is unavailable after loading wasm_exec.js');
	}

	// A previous instance that exited leaves its exports behind; clear them so
	// the wait below only ever sees this instance's.
	delete self[READY_EXPORT];
	delete self[EVAL_EXPORT];

	go = new self.Go();
	const result = await WebAssembly.instantiateStreaming(fetchCounted(WASM_URL), go.importObject);

	// main() blocks forever once the exports are set, so run() settles only if
	// the Go program exits; the next message then sees "already exited".
	go.run(result.instance).finally(() => {
		ready = false;
	});

	const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	const deadline = Date.now() + READY_TIMEOUT_MS;
	while (self[READY_EXPORT] !== true || typeof self[EVAL_EXPORT] !== 'function') {
		if (Date.now() > deadline) {
			throw new Error(
				`WASM started but did not set ${READY_EXPORT} within ${READY_TIMEOUT_MS} ms; is this a Mutant REPL build?`
			);
		}
		await wait(25);
	}

	invoke = (source) => self[EVAL_EXPORT](source);
	ready = true;
}

// One load at a time: an init and a run that arrive together share it. A failed
// load is not remembered, so the next message tries again.
function ensureRuntime() {
	if (ready) return Promise.resolve();
	if (!booting) {
		booting = startRuntime().finally(() => {
			booting = null;
		});
	}
	return booting;
}

function shapeRuntimeResult(value) {
	if (value === undefined || value === null) {
		return { ok: true, output: '(no output)' };
	}

	if (typeof value === 'string') {
		return { ok: true, output: value };
	}

	if (typeof value === 'object') {
		if (typeof value.ok === 'boolean') {
			const output =
				typeof value.output === 'string'
					? value.output
					: typeof value.result === 'string'
						? value.result
						: typeof value.error === 'string'
							? value.error
							: JSON.stringify(value, null, 2);

			return {
				ok: value.ok,
				output
			};
		}

		if (typeof value.output === 'string') return { ok: true, output: value.output };
		if (typeof value.result === 'string') return { ok: true, output: value.result };
		if (typeof value.error === 'string') return { ok: false, output: value.error };
	}

	try {
		return { ok: true, output: JSON.stringify(value, null, 2) };
	} catch {
		return { ok: true, output: String(value) };
	}
}

function mergeResultWithCaptured(shaped, captured) {
	if (captured.length === 0) return shaped;

	const capturedOutput = captured.join('\n');
	const shapedOutput = (shaped.output ?? '').trim();

	if (!shapedOutput || shapedOutput === '(no output)' || shapedOutput === '{}' || shapedOutput === '[]') {
		return {
			ok: shaped.ok,
			output: capturedOutput
		};
	}

	if (!shapedOutput.includes(capturedOutput)) {
		return {
			ok: shaped.ok,
			output: `${capturedOutput}\n${shaped.output}`
		};
	}

	return shaped;
}

self.onmessage = async (event) => {
	const { type, id, code } = event.data || {};

	if (type === 'init') {
		try {
			await ensureRuntime();
			self.postMessage({ type: 'ready' });
		} catch (error) {
			self.postMessage({ type: 'init-failed', message: error && error.message ? error.message : String(error) });
		}
		return;
	}

	const input = code ?? '';

	const runOnce = async () => {
		await ensureRuntime();
		const { value, captured } = await withCapturedConsole(async () => {
			const maybe = invoke(input);
			return maybe && typeof maybe.then === 'function' ? await maybe : maybe;
		});
		const shaped = shapeRuntimeResult(value);
		return mergeResultWithCaptured(shaped, captured);
	};

	try {
		let shaped;

		try {
			shaped = await runOnce();
		} catch (firstError) {
			const message = firstError && firstError.message ? firstError.message : String(firstError);
			if (!/already exited/i.test(message)) {
				throw firstError;
			}

			resetRuntime();
			shaped = await runOnce();
		}

		self.postMessage({
			id,
			ok: shaped.ok,
			output: shaped.output
		});
	} catch (error) {
		self.postMessage({
			id,
			ok: false,
			output: `WASM REPL init/exec failed:\n${error && error.message ? error.message : String(error)}`
		});
	}
};
