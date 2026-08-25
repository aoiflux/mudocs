<script lang="ts">
	/**
	 * Artboard 2c — toolbar / split editor+output / execution graph.
	 *
	 * The worker protocol in static/repl-worker.js is untouched: it already solves
	 * Go WASM export discovery, console capture and "already exited" recovery.
	 */
	import { onDestroy, onMount } from 'svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import PipelineDiagram from '$lib/components/PipelineDiagram.svelte';

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

	// The stages docs/BYTECODE_IR.md §1 actually names, in order. An earlier
	// version of this list invented "lower" and "verify"; neither word appears
	// anywhere in that document, and the language has no lowering step.
	const EXEC_STAGES = ['lex', 'parse', 'compile', 'bytecode', 'vm'];

	let selectedPreset = $state(presets[0].id);
	let code = $state(presets[0].code);
	let output = $state('Ready.');
	let showRawOutput = $state(false);
	let running = $state(false);
	let lastRunOk = $state<boolean | null>(null);
	let friendlyDiagnostic = $state('');
	let timeoutHandle = $state<ReturnType<typeof setTimeout> | null>(null);
	let worker = $state<Worker | null>(null);
	let elapsedMs = $state<number | null>(null);
	let stageIndex = $state(0);

	let startedAt = 0;
	let stageTimers: number[] = [];

	const preflightRules = [
		{
			test: (value: string) => /\b(fs_|net_|exec_|sandbox_|debug_)/.test(value),
			hit: {
				rule: 'restricted-builtins',
				message: 'Filesystem, network, process, and probe builtins are restricted in browser mode.',
				docHref: '/docs/reference/wasm_repl_reference#6-unsupported-builtins-and-rationale',
				docLabel: 'WASM REPL reference'
			}
		}
	];

	function getPreflightHints(value: string): RuleHit[] {
		const hits: RuleHit[] = [];
		for (const rule of preflightRules) {
			if (rule.test(value)) hits.push(rule.hit);
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
		if (!raw) return { display: '(no output)', isPanic: false, hasStack: false };
		if (!/^panic:/i.test(raw)) return { display: raw, isPanic: false, hasStack: false };

		const lines = raw
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean);
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

		return { display: parts.join('\n'), isPanic: true, hasStack: stackLines.length > 0 };
	}

	const preflightHints = $derived(getPreflightHints(code));
	const panicView = $derived(formatOutputView(output));
	const formattedOutput = $derived(showRawOutput ? output : panicView.display);
	const activePreset = $derived(presets.find((item) => item.id === selectedPreset));

	function clearStageTimers() {
		for (const timer of stageTimers) window.clearTimeout(timer);
		stageTimers = [];
	}

	function resetRunState() {
		clearStageTimers();
		stageIndex = 0;
		elapsedMs = null;
		output = 'Ready.';
		lastRunOk = null;
		friendlyDiagnostic = '';
		showRawOutput = false;
	}

	function selectPreset(id: string) {
		selectedPreset = id;
		const preset = presets.find((item) => item.id === id);
		if (!preset) return;
		code = preset.code;
		resetRunState();
	}

	function resetToPreset() {
		const preset = presets.find((item) => item.id === selectedPreset);
		if (preset) code = preset.code;
		resetRunState();
	}

	onMount(() => {
		worker = new Worker('/repl-worker.js');
		worker.onmessage = (event: MessageEvent<{ id: string; ok: boolean; output: string }>) => {
			elapsedMs = performance.now() - startedAt;
			clearStageTimers();
			stageIndex = EXEC_STAGES.length;
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
		elapsedMs = null;
		startedAt = performance.now();
		const id = crypto.randomUUID();

		// The worker returns one result, not per-stage callbacks, so the graph
		// advances on a timer while the run is in flight and snaps to complete when
		// the result lands. It traces the documented compile path; it is not
		// instrumentation of the running VM.
		clearStageTimers();
		stageIndex = 1;
		for (let i = 2; i <= EXEC_STAGES.length; i += 1) {
			stageTimers.push(window.setTimeout(() => (stageIndex = i), (i - 1) * 140));
		}

		timeoutHandle = setTimeout(() => {
			if (running) {
				output = 'Execution timed out after 5 seconds.';
				running = false;
				clearStageTimers();
				stageIndex = 0;
				elapsedMs = performance.now() - startedAt;
			}
		}, 5000);

		worker.postMessage({ id, code });
	}

	onDestroy(() => {
		clearStageTimers();
		worker?.terminate();
	});
</script>

<SeoHead
	title="Playground"
	description="Run Mutant in the browser — a worker-isolated WASM REPL following the language's documented compile path: parse, lower, mutate, verify, exec."
/>

<section class="band" style="padding-top: 0;">
	<p class="eyebrow">Browser REPL</p>
	<h1>Playground</h1>
	<p class="lede">
		The browser-only WASM subset of the Mutant runtime, running in an isolated worker with a five-second
		execution ceiling. Filesystem, network and process builtins are unavailable here by design.
	</p>
</section>

<!-- ── Toolbar ──────────────────────────────────────────────────────────── -->
<div class="pg-toolbar">
	<button class="btn btn-primary" onclick={run} disabled={running}>
		{running ? 'Running…' : 'Run ▸'}
	</button>
	<button class="btn btn-secondary" onclick={resetToPreset} disabled={running}>Reset</button>

	<div class="seg" style="margin-left: auto;" role="group" aria-label="Examples">
		{#each presets as preset (preset.id)}
			<button
				type="button"
				class="seg-opt"
				aria-pressed={selectedPreset === preset.id}
				onclick={() => selectPreset(preset.id)}
			>
				{preset.label}
			</button>
		{/each}
	</div>
</div>

{#if activePreset}
	<p class="text-muted" style="font-size: 13px; margin: var(--space-3) 0;">{activePreset.description}</p>
{/if}

<!-- ── Editor · Output ──────────────────────────────────────────────────── -->
<div class="pg-split">
	<div class="pg-editor">
		<span class="pane-label">main.mut</span>
		<textarea bind:value={code} spellcheck="false" aria-label="Mutant source"></textarea>
	</div>

	<div class="pg-right">
		<div class="pg-output">
			<div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-3);">
				<span class="pane-label">Output</span>
				{#if lastRunOk !== null}
					<span class="tag {lastRunOk ? 'tag-accent' : 'tag-outline'}">{lastRunOk ? 'ok' : 'error'}</span>
				{/if}
			</div>

			{#if friendlyDiagnostic}
				<p class="pg-hint">{friendlyDiagnostic}</p>
			{/if}

			<pre>{formattedOutput}</pre>

			{#if panicView.isPanic}
				<button class="btn btn-ghost btn-sm" onclick={() => (showRawOutput = !showRawOutput)}>
					{showRawOutput ? 'View summary' : 'View raw output'}
				</button>
			{/if}
		</div>

		<div class="pg-stats">
			<div class="pg-stat">
				<span class="stat-label">Time</span>
				<span class="v">{elapsedMs === null ? '—' : `${elapsedMs.toFixed(0)} ms`}</span>
			</div>
			<div class="pg-stat" title="The browser REPL returns a result string, not opcode counters.">
				<span class="stat-label">Ops</span>
				<span class="v">—</span>
			</div>
			<div class="pg-stat" title="The browser REPL returns a result string, not mutation counters.">
				<span class="stat-label">Mutations</span>
				<span class="v">—</span>
			</div>
		</div>
	</div>
</div>

{#if preflightHints.length}
	<div class="pg-hint" style="margin-top: var(--space-4);">
		<strong style="display: block; margin-bottom: var(--space-1);">Preflight hints</strong>
		<ul style="margin: 0; padding-left: var(--space-4);">
			{#each preflightHints as hint (hint.rule)}
				<li>
					{hint.message}
					<a href={hint.docHref}>{hint.docLabel}</a>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<!-- ── Execution graph (M9) ─────────────────────────────────────────────── -->
<section class="band" style="border-bottom: 0;">
	<p class="eyebrow">Execution graph</p>

	<PipelineDiagram
		nodes={EXEC_STAGES}
		activeIndex={stageIndex}
		label="lex, parse, compile, bytecode, vm"
	/>

	<p class="text-muted" style="margin-top: var(--space-4); font-size: 13px; max-width: 62ch;">
		The compile path the runtime docs describe. The browser REPL reports a single result rather than
		per-stage timings, so this traces the documented pipeline while a run is in flight — it is not a live
		profile of the VM.
	</p>

	<div class="cta-cluster">
		<a class="btn btn-secondary btn-sm" href="/extension">Open in extension</a>
		<a class="btn btn-secondary btn-sm" href="/docs/reference/wasm_repl_reference">WASM REPL reference ↗</a>
	</div>
</section>
