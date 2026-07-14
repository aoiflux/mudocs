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
			description: 'Safe expression-only snippet for web REPL smoke test.',
			code: '2 + 40'
		},
		{
			id: 'expr-boolean',
			label: 'Boolean expression',
			description: 'Quick truthy/falsey expression check.',
			code: '1 < 2'
		},
		{
			id: 'call-putln',
			label: 'Builtin call',
			description: 'Function call without assignment statement.',
			code: 'putln(21 + 21)'
		}
	];

	let selectedPreset = presets[0].id;
	let code = presets[0].code;
	let output = 'Ready.';
	let formattedOutput = 'Ready.';
	let showRawOutput = false;
	let panicView: OutputView = { display: 'Ready.', isPanic: false, hasStack: false };
	let running = false;
	let lastRunOk: boolean | null = null;
	let friendlyDiagnostic = '';
	let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
	let worker: Worker | null = null;

	const preflightRules = [
		{
			test: (value: string) => /\blet\s+[A-Za-z_][A-Za-z0-9_]*\s*=/.test(value),
			hit: {
				rule: 'assignment-not-supported',
				message:
					'Assignment-style statements are currently rejected by this browser REPL profile. Try expression-only snippets.',
				docHref: '/docs/languagedocs/variables',
				docLabel: 'Variables docs'
			}
		},
		{
			test: (value: string) => /\b(fs_|net_|exec_|sandbox_|debug_)/.test(value),
			hit: {
				rule: 'restricted-builtins',
				message:
					'Filesystem, network, process, and probe builtins are restricted in browser mode.',
				docHref: '/docs/security',
				docLabel: 'Security model docs'
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

		if (/unsupported syntax.*AssignExpression/i.test(raw)) {
			return 'Web REPL currently accepts expression-oriented input. Remove assignment statements and retry with a pure expression or function call.';
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

	$: preflightHints = getPreflightHints(code);
	$: panicView = formatOutputView(output);
	$: formattedOutput = showRawOutput ? output : panicView.display;

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
		<div style="display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.6rem; margin-bottom: 0.7rem;">
			<select
				bind:value={selectedPreset}
				style="border: 3px solid #121212; padding: 0.45rem; background: #fff8eb; font: 600 0.88rem/1 'Space Grotesk', sans-serif; text-transform: uppercase;"
			>
				{#each presets as preset}
					<option value={preset.id}>{preset.label}</option>
				{/each}
			</select>
			<button
				onclick={applyPreset}
				style="border: 3px solid #121212; background: #ff6f3c; color: #121212; font-weight: 800; text-transform: uppercase; padding: 0.45rem 0.7rem; cursor: pointer;"
			>
				Load
			</button>
		</div>
		<p style="margin: 0 0 0.6rem; font-size: 0.9rem; color: #2c2a27;">{presets.find((p) => p.id === selectedPreset)?.description}</p>
		<textarea
			bind:value={code}
			style="width: 100%; min-height: 320px; border: 3px solid #121212; padding: 0.75rem; font: 500 0.95rem/1.5 'IBM Plex Mono', Consolas, monospace;"
		></textarea>

		{#if preflightHints.length}
			<div
				style="margin-top: 0.8rem; border: 3px solid #121212; background: #fce8d9; padding: 0.7rem; font-size: 0.88rem; line-height: 1.4;"
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
				style="border: 3px solid #121212; background: #00a8a8; color: #121212; font-weight: 800; text-transform: uppercase; padding: 0.5rem 0.8rem; cursor: pointer;"
			>
				{running ? 'Running...' : 'Run'}
			</button>
		</div>
	</div>

	<div class="card" style="grid-column: span 5;">
		<h3>Output</h3>
		{#if friendlyDiagnostic}
			<div
				style="margin-bottom: 0.7rem; border: 3px solid #121212; background: #e6f9f6; padding: 0.65rem; font-size: 0.86rem;"
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
						style="border: 2px solid #121212; background: #fff8eb; font: 700 0.75rem/1 'Space Grotesk', sans-serif; text-transform: uppercase; padding: 0.25rem 0.45rem; cursor: pointer;"
					>
						{showRawOutput ? 'View summary' : 'View raw output'}
					</button>
				{/if}
			</div>
		{/if}
		<pre style="min-height: 320px; white-space: pre-wrap;">{formattedOutput}</pre>
	</div>
</section>
