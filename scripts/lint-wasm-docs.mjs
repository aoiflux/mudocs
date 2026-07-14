import fs from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = process.cwd();

const targets = [
	{
		path: 'docs/PLAYGROUND_EXAMPLES.md',
		extractMode: 'mutant-fences'
	},
	{
		path: 'docs/WASM_REPL_REFERENCE.md',
		extractMode: 'mutant-fences'
	},
	{
		path: 'src/routes/playground/+page.svelte',
		extractMode: 'preset-code'
	}
];

const checks = [
	{
		id: 'legacy-len-multivalue-index',
		description: 'Use len(value) instead of len(value)[0] in browser/REPL samples.',
		pattern: /\blen\s*\([^\n\r\)]*\)\s*\[\s*0\s*\]/g
	},
	{
		id: 'unsupported-for-each',
		description: 'for each(...) is unsupported in Mutant samples.',
		pattern: /\bfor\s+each\s*\(/g
	},
	{
		id: 'unsupported-for-in',
		description: 'for (... in ...) style loops are unsupported in Mutant samples.',
		pattern: /\bfor\s*\(\s*[^;\n\r\)]*\sin\s[^\)]*\)/g
	},
	{
		id: 'host-bound-builtins',
		description: 'Host-bound builtins are not allowed in browser REPL code samples.',
		pattern:
			/\b(?:fs_[A-Za-z0-9_]*|process_[A-Za-z0-9_]*|cmd_[A-Za-z0-9_]*|exec_string|net_[A-Za-z0-9_]*|http_[A-Za-z0-9_]*|reg_[A-Za-z0-9_]*|mem_[A-Za-z0-9_]*|bin_[A-Za-z0-9_]*|email_[A-Za-z0-9_]*|detect_[A-Za-z0-9_]*|db_open_disk)\b/g
	}
];

function lineFromIndex(content, index) {
	let line = 1;
	for (let i = 0; i < index; i++) {
		if (content.charCodeAt(i) === 10) {
			line++;
		}
	}
	return line;
}

function extractMutantFences(content) {
	const segments = [];
	const fenceRegex = /```mutant\s*\n([\s\S]*?)```/g;
	let match;
	while ((match = fenceRegex.exec(content)) !== null) {
		const blockContent = match[1];
		const blockStart = match.index + match[0].indexOf(blockContent);
		segments.push({ content: blockContent, baseIndex: blockStart });
	}
	return segments;
}

function extractPresetCodeBlocks(content) {
	const segments = [];
	const presetCodeRegex = /code:\s*`([\s\S]*?)`/g;
	let match;
	while ((match = presetCodeRegex.exec(content)) !== null) {
		const blockContent = match[1];
		const blockStart = match.index + match[0].indexOf(blockContent);
		segments.push({ content: blockContent, baseIndex: blockStart });
	}
	return segments;
}

function extractSegments(content, mode) {
	if (mode === 'mutant-fences') return extractMutantFences(content);
	if (mode === 'preset-code') return extractPresetCodeBlocks(content);
	throw new Error(`Unsupported extract mode: ${mode}`);
}

function formatMatchSnippet(segmentContent, index) {
	const lines = segmentContent.split(/\r?\n/);
	let consumed = 0;
	for (const line of lines) {
		const next = consumed + line.length + 1;
		if (index < next) {
			return line.trim().slice(0, 160);
		}
		consumed = next;
	}
	return segmentContent.slice(index, index + 160).trim();
}

async function run() {
	const violations = [];

	for (const target of targets) {
		const absPath = path.join(workspaceRoot, target.path);
		let content;
		try {
			content = await fs.readFile(absPath, 'utf8');
		} catch (error) {
			violations.push({
				file: target.path,
				line: 1,
				checkId: 'missing-target',
				description: `Unable to read target file: ${error instanceof Error ? error.message : String(error)}`,
				snippet: ''
			});
			continue;
		}

		const segments = extractSegments(content, target.extractMode);
		for (const segment of segments) {
			for (const check of checks) {
				check.pattern.lastIndex = 0;
				let match;
				while ((match = check.pattern.exec(segment.content)) !== null) {
					const absoluteIndex = segment.baseIndex + match.index;
					violations.push({
						file: target.path,
						line: lineFromIndex(content, absoluteIndex),
						checkId: check.id,
						description: check.description,
						snippet: formatMatchSnippet(segment.content, match.index)
					});
				}
			}
		}
	}

	if (violations.length > 0) {
		console.error('WASM docs lint failed. Violations:');
		for (const violation of violations) {
			console.error(`- ${violation.file}:${violation.line} [${violation.checkId}] ${violation.description}`);
			if (violation.snippet) {
				console.error(`  snippet: ${violation.snippet}`);
			}
		}
		process.exitCode = 1;
		return;
	}

	console.log('WASM docs lint passed.');
}

await run();
