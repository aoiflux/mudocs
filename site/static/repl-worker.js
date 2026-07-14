let ready = false;
let initError = null;
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
	initError = null;
	invoke = null;
	go = null;
}

function pickInvoker(addedGlobals) {
	const candidates = [
		'runMutant',
		'mutantRun',
		'executeMutant',
		'evalMutant',
		'mutantEval',
		'replEval',
		'replRun',
		'runRepl'
	];

	for (const name of candidates) {
		if (typeof self[name] === 'function') {
			return self[name].bind(self);
		}
	}

	for (const name of addedGlobals) {
		const value = self[name];
		if (typeof value === 'function' && /(mutant|repl|eval|run)/i.test(name)) {
			return value.bind(self);
		}
	}

	for (const name of addedGlobals) {
		const value = self[name];
		if (!value || typeof value !== 'object') continue;

		for (const key of Object.keys(value)) {
			if (typeof value[key] === 'function' && /(mutant|repl|eval|run)/i.test(key)) {
				return value[key].bind(value);
			}
		}
	}

	return null;
}

async function ensureRuntime() {
	if (ready) return;
	if (initError) throw initError;

	try {
		if (typeof self.Go !== 'function') {
			self.importScripts('/wasm-repl/wasm_exec.js');
		}

		if (typeof self.Go !== 'function') {
			throw new Error('Go runtime bootstrap failed: Go class is unavailable after loading wasm_exec.js');
		}

		go = new self.Go();
		const before = new Set(Object.getOwnPropertyNames(self));

		const result = await WebAssembly.instantiateStreaming(fetch('/wasm-repl/mutant_repl.wasm'), go.importObject);

		const runPromise = go.run(result.instance);

		await Promise.race([
			runPromise,
			new Promise((resolve) => setTimeout(resolve, 30))
		]);

		const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
		for (let i = 0; i < 40; i += 1) {
			const after = Object.getOwnPropertyNames(self);
			const added = after.filter((k) => !before.has(k));
			invoke = pickInvoker(added.length ? added : after);
			if (invoke) break;
			await wait(25);
		}

		if (!invoke) {
			const after = Object.getOwnPropertyNames(self);
			const added = after.filter((k) => !before.has(k));
			throw new Error(
				`WASM loaded but no callable REPL function found. Added globals: ${added.join(', ') || '(none)'}`
			);
		}

		ready = true;
	} catch (error) {
		initError = error;
		throw error;
	}
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
	const { id, code } = event.data || {};
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
