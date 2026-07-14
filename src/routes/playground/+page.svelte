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
			id: 'expr-boolean',
			label: 'Boolean expression',
			description: 'Quick truthy/falsey expression check.',
			code: '1 < 2'
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
			description: 'Try first/last/rest/push/pop/len on arrays.',
			code: `putln(first([10, 20, 30]))
putln(last([10, 20, 30]))
putln(rest([10, 20, 30]))
putln(push([10, 20, 30], 40))
putln(pop([10, 20, 30]))
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
			label: 'JSON roundtrip',
			description: 'Parse JSON text and stringify it back.',
			code: `putln(json_parse("{\"tool\":\"mutant\",\"ok\":true,\"count\":3}"))
putln(json_stringify(json_parse("{\"path\":\"/playground\",\"track\":\"docs\"}")))`
		},
		{
			id: 'text-builtins',
			label: 'Text builtins',
			description: 'Contains/index/count/split/replace and fuzzy similarity checks.',
			code: `putln(text_contains("mutant security runtime", "security"))
putln(text_index("mutant security runtime", "runtime"))
putln(text_count("a-b-a-b-a", "a"))
putln(text_split("bytecode|sandbox|lsp", "|"))
putln(text_replace("sandbox profile: standard", "standard", "paranoid"))
putln(text_similarity("sandbox", "sand box"))
putln(text_levenshtein("runtime", "run-time"))
putln(text_jaro_winkler("mutant", "mutan"))
putln(text_fuzzy_find("security runbook and runtime docs", "runbok"))`
		},
		{
			id: 'regex-builtins',
			label: 'Regex builtins',
			description: 'Match/find/find_all/captures/replace.',
			code: `putln(regex_match("^mu[a-z]+$", "mutant"))
putln(regex_find("[A-Z]{2,}", "LSP extension"))
putln(regex_find_all("\\d+", "ports 80 443 8080"))
putln(regex_capture_groups("([A-Za-z_]+):(\\d+)", "runtime:4173"))
putln(regex_replace("\\s+", "-", "mutant docs quality"))`
		},
		{
			id: 'bytes-primitives',
			label: 'Bytes primitive helpers',
			description: 'Character/byte conversions and direct indexing helpers.',
			code: `putln(bytes_char_from_int(65))
putln(bytes_int_from_char("A"))
putln(bytes_hex("Mutant"))`
		},
		{
			id: 'bytes-endian-read-write',
			label: 'Bytes endian read/write',
			description: 'Read and write fixed-size values with endian helpers.',
			code: `putln(bytes_write_u16_be("ABCD", 0, 4660))
putln(bytes_write_u16_le("ABCD", 0, 4660))
putln(bytes_write_u32_be("ABCDEFGH", 0, 305419896))
putln(bytes_write_u32_le("ABCDEFGH", 0, 305419896))
putln(bytes_read_u16_be("\x12\x34", 0))
putln(bytes_read_u16_le("\x34\x12", 0))
putln(bytes_read_u32_be("\x12\x34\x56\x78", 0))
putln(bytes_read_u32_le("\x78\x56\x34\x12", 0))`
		},
		{
			id: 'bytes-cursor-walk',
			label: 'Bytes cursor walk',
			description: 'Create a cursor and walk through binary data.',
			code: `let c = bytes_cursor_new("\x01\x02\x03\x04\x05\x06\x07\x08")
putln(bytes_cursor_tell(c))
putln(bytes_cursor_read_u8(c))
putln(bytes_cursor_read_u16_be(c))
putln(bytes_cursor_read_u16_le(c))
putln(bytes_cursor_seek(c, 0))
putln(bytes_cursor_read_u32_be(c))
putln(bytes_cursor_read_u32_le(c))
putln(bytes_cursor_read_u64_be(c))
putln(bytes_cursor_seek(c, 0))
putln(bytes_cursor_read_u64_le(c))
putln(bytes_cursor_eof(c))`
		},
		{
			id: 'bytes-index-slice-cstr',
			label: 'Bytes index/slice/cstr',
			description: 'Use bytes_get/bytes_len/bytes_slice/bytes_cstr_at helpers.',
			code: `let raw = "mutant\x00sandbox"
putln(bytes_len(raw))
putln(bytes_get(raw, 0))
putln(bytes_slice(raw, 0, 6))
putln(bytes_cstr_at(raw, 0))`
		},
		{
			id: 'bytes-64bit-read-write',
			label: 'Bytes 64-bit read/write',
			description: 'Roundtrip 64-bit values using big-endian and little-endian helpers.',
			code: `putln(bytes_write_u64_be("12345678abcdefgh", 0, 72623859790382856))
putln(bytes_write_u64_le("12345678abcdefgh", 0, 72623859790382856))
putln(bytes_read_u64_be("\x01\x02\x03\x04\x05\x06\x07\x08", 0))
putln(bytes_read_u64_le("\x08\x07\x06\x05\x04\x03\x02\x01", 0))`
		},
		{
			id: 'hashmap-json-shape',
			label: 'Hashmap workflow',
			description: 'Create and inspect a hashmap-like object via JSON helpers.',
			code: `putln(json_stringify({"engine":"mutant","section":"runtime","ok":true}))
putln(json_parse("{\"kind\":\"hashmap\",\"entries\":3,\"enabled\":true}"))`
		},
		{
			id: 'loops-for-classic',
			label: 'Loop: for (classic)',
			description: 'Classic init/condition/post loop with accumulation.',
			code: `let sum = 0
for (let i = 0; i < 4; i = i + 1) {
	sum = sum + i
}
putln(sum)`
		},
		{
			id: 'loops-for-indexed-array',
			label: 'Loop: for with array indexing',
			description: 'Iterate collection values using a classic index-driven for loop.',
			code: `let items = ["bytecode", "sandbox", "signing", "lsp"]
for (let i = 0; i < len(items); i = i + 1) {
	putln(items[i])
}`
		},
		{
			id: 'loops-while-indexed-array',
			label: 'Loop: while with array indexing',
			description: 'Traverse an array with state-driven while loop progression.',
			code: `let items = ["parse", "compile", "run"]
let i = 0
while (i < len(items)) {
	putln(items[i])
	i = i + 1
}`
		},
		{
			id: 'loops-while',
			label: 'Loop: while',
			description: 'State-driven loop condition example.',
			code: `let i = 0
while (i < 3) {
	putln(i)
	i = i + 1
}`
		},
		{
			id: 'struct-sample',
			label: 'Struct sample',
			description: 'Struct declaration and value construction sample.',
			code: `struct Finding { id, severity, source }
let f = Finding { id: 7, severity: "high", source: "runtime" }
putln(f)`
		},
		{
			id: 'enum-sample',
			label: 'Enum sample',
			description: 'Enum declaration with value selection sample.',
			code: `enum Verdict { Allow, Observe, Block }
putln(Verdict.Block)`
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
