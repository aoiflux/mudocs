<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	type RuleHit = {
		rule: string;
		message: string;
		docHref: string;
		docLabel: string;
	};

	type Preset = {
		id: string;
		label: string;
		description: string;
		code: string;
	};

	type OutputView = {
		display: string;
		isPanic: boolean;
		hasStack: boolean;
	};

	const presets: Preset[] = [
	{
			id: 'expr-arithmetic',
			label: 'Arithmetic expression',
			description: 'Quick arithmetic smoke test for web REPL execution.',
			code: '2 + 40'
		},
		{
			id: 'builtin-help',
			label: 'Builtin help',
			description: 'Print builtin reference from the REPL runtime.',
			code: 'help()'
		},
		{
			id: 'collections-basic',
			label: 'Collections basics',
			description: 'Try first/last/rest and len on arrays.',
			code: `putln(first([10, 20, 30]))
putln(last([10, 20, 30]))
putln(rest([10, 20, 30]))
putln(len([10, 20, 30, 40]))`
		},
		{
			id: 'output-formatting',
			label: 'Output formatting',
			description: 'Use putln and putf for formatted output.',
			code: `putln("Mutant WASM REPL")
putf("score=%d, mode=%s", 98, "sandbox")`
		},
		{
			id: 'json-roundtrip',
			label: 'JSON stringify',
			description: 'Build a hash and serialize it safely.',
			code: `let obj = {"tool": "mutant", "ok": true}
putln(json_stringify(obj))`
		},
		{

			id: 'for-loop',
			label: 'For Loop',
			description: 'Simple for loop over an array',
			code: `let items = [1, 2, 3];
for (let i = 0; i < len(items); i = i+1) {
    putln(items[i]);
}`
	}
	];

	let selectedPreset = $state(presets[0].id);
	let code = $state(presets[0].code);
	let output = $state('Ready.');
	let showRawOutput = $state(false);
	let running = $state(false);
	let lastRunOk = $state<boolean | null>(null);
	let friendlyDiagnostic = $state('');
	let timeoutHandle = $state<ReturnType<typeof setTimeout> | null>(null);
	let worker = $state<Worker | null>(null);

	const preflightRules = [
		{
			test: (value: string) => /\b(fs_|net_|exec_|sandbox_|debug_)/.test(value),
			hit: {
				rule: 'restricted-builtins',
				message:
					'Filesystem, network, process, and probe builtins are restricted in browser mode.',
				docHref: '/docs/reference/wasm_repl_reference#6-unsupported-builtins-and-rationale',
				docLabel: 'WASM REPL reference'
			}
		}
	];

	function getPreflightHints(value: string): RuleHit[] {
		const hits: RuleHit[] = [];
		for (const rule of preflightRules) {
			if (rule.test(value)) {
				hits.push(rule.hit);
			}
		}
		return hits;
	}

	function mapFriendlyDiagnostic(raw: string): string {
		if (/^panic:/i.test(raw)) {
			return 'Runtime panic detected. Showing concise summary; use View raw output for full stack.';
		}

		if (/already exited/i.test(raw)) {
			return 'Runtime instance ended unexpectedly. The worker will auto-restart the WASM runtime on retry.';
		}

		if (/unsupported syntax/i.test(raw)) {
			return 'This syntax is outside the current browser subset. Try one of the presets, then expand gradually.';
		}

		if (/init\/exec failed/i.test(raw)) {
			return 'Runtime boot error: verify wasm artifacts are synced and refresh the page.';
		}

		return '';
	}

	function formatOutputView(raw: string): OutputView {
		if (!raw) {
			return { display: '(no output)', isPanic: false, hasStack: false };
		}

		if (!/^panic:/i.test(raw)) {
			return { display: raw, isPanic: false, hasStack: false };
		}

		const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
		const headline = lines[0] ?? 'panic';
		const goroutineLine = lines.find((line) => /^goroutine\s+/i.test(line));
		const stackLines = lines
			.filter((line) => /\/|\\|\.go:\d+/i.test(line) && !/^syscall\/js\.handleEvent/i.test(line))
			.slice(0, 6);

		const parts = [
			headline,
			goroutineLine ? `Context: ${goroutineLine}` : null,
			stackLines.length ? 'Stack preview:' : null,
			...stackLines.map((line) => `- ${line}`)
		].filter(Boolean);

		return {
			display: parts.join('\n'),
			isPanic: true,
			hasStack: stackLines.length > 0
		};
	}

	const preflightHints = $derived(getPreflightHints(code));
	const panicView = $derived(formatOutputView(output));
	const formattedOutput = $derived(showRawOutput ? output : panicView.display);

	function applyPreset() {
		const preset = presets.find((item) => item.id === selectedPreset);
		if (!preset) return;
		code = preset.code;
		friendlyDiagnostic = '';
		lastRunOk = null;
		showRawOutput = false;
	}

	onMount(() => {
		worker = new Worker('/repl-worker.js');
		worker.onmessage = (event: MessageEvent<{ id: string; ok: boolean; output: string }>) => {
			output = event.data.output;
			showRawOutput = false;
			lastRunOk = event.data.ok;
			friendlyDiagnostic = mapFriendlyDiagnostic(event.data.output);
			running = false;
			if (timeoutHandle) {
				clearTimeout(timeoutHandle);
				timeoutHandle = null;
			}
		};
	});

	function run() {
		if (running || !worker) return;

		running = true;
		friendlyDiagnostic = '';
		lastRunOk = null;
		showRawOutput = false;
		const id = crypto.randomUUID();

		timeoutHandle = setTimeout(() => {
			if (running) {
				output = 'Execution timed out after 5 seconds.';
				running = false;
			}
		}, 5000);

		worker.postMessage({ id, code });
	}

	onDestroy(() => {
		worker?.terminate();
	});
</script>

<section class="panel" style="margin-bottom: 1rem;">
	<p class="kicker">Browser REPL Track</p>
	<h1 style="margin: 0; text-transform: uppercase;">Mutant Playground</h1>
	<p class="lede">
		This route is the implementation starting point for the browser-only WASM subset REPL. It already uses a
		worker execution channel and timeout safety model.
	</p>
	<div class="meta-row">
		<span class="meta-chip">Worker isolated</span>
		<span class="meta-chip">Timeout enforced</span>
		<span class="meta-chip">WASM wired</span>
	</div>
</section>

<section class="grid" style="align-items: start;">
	<div class="card" style="grid-column: span 7;">
		<h3>Editor</h3>
		<div style="margin-bottom: 0.7rem;">
			<select
				bind:value={selectedPreset}
				onchange={applyPreset}
				style="border: 3px solid var(--ink); padding: 0.45rem; background: var(--input-bg); color: var(--ink); font: 600 0.88rem/1 'Space Grotesk', sans-serif; text-transform: uppercase;"
			>
				{#each presets as preset}
					<option value={preset.id}>{preset.label}</option>
				{/each}
			</select>
		</div>
		<p style="margin: 0 0 0.6rem; font-size: 0.9rem; color: var(--ink-soft);">{presets.find((p) => p.id === selectedPreset)?.description}</p>
		<textarea
			bind:value={code}
			style="width: 100%; min-height: 320px; border: 3px solid var(--ink); background: var(--input-bg); color: var(--ink); padding: 0.75rem; font: 500 0.95rem/1.5 'IBM Plex Mono', Consolas, monospace;"
		></textarea>

		{#if preflightHints.length}
			<div
				style="margin-top: 0.8rem; border: 3px solid var(--ink); background: var(--quote-bg); padding: 0.7rem; font-size: 0.88rem; line-height: 1.4;"
			>
				<strong style="text-transform: uppercase; display: block; margin-bottom: 0.35rem;">Preflight hints</strong>
				<ul style="margin: 0; padding-left: 1.1rem;">
					{#each preflightHints as hint}
						<li style="margin-bottom: 0.4rem;">
							{hint.message}
							<a href={hint.docHref} style="margin-left: 0.35rem;">{hint.docLabel}</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div style="margin-top: 0.8rem; display: flex; gap: 0.7rem;">
			<button
				onclick={run}
				disabled={running}
				style="border: 3px solid var(--ink); background: var(--accent); color: var(--ink); font-weight: 800; text-transform: uppercase; padding: 0.5rem 0.8rem; cursor: pointer;"
			>
				{running ? 'Running...' : 'Run'}
			</button>
		</div>
	</div>

	<div class="card" style="grid-column: span 5;">
		<h3>Output</h3>
		{#if friendlyDiagnostic}
			<div
				style="margin-bottom: 0.7rem; border: 3px solid var(--ink); background: var(--chip-bg); padding: 0.65rem; font-size: 0.86rem;"
			>
				<strong style="text-transform: uppercase;">Hint:</strong> {friendlyDiagnostic}
			</div>
		{/if}
		{#if lastRunOk !== null}
			<div class="meta-row" style="margin-bottom: 0.6rem;">
				<span class="meta-chip">Status: {lastRunOk ? 'ok' : 'error'}</span>
				{#if panicView.isPanic}
					<button
						onclick={() => (showRawOutput = !showRawOutput)}
						style="border: 2px solid var(--ink); background: var(--surface); color: var(--ink); font: 700 0.75rem/1 'Space Grotesk', sans-serif; text-transform: uppercase; padding: 0.25rem 0.45rem; cursor: pointer;"
					>
						{showRawOutput ? 'View summary' : 'View raw output'}
					</button>
				{/if}
			</div>
		{/if}
		<pre style="min-height: 320px; white-space: pre-wrap;">{formattedOutput}</pre>
	</div>
</section>
