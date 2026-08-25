/**
 * Server-side syntax highlighting for fenced code blocks.
 *
 * This runs as a pre-pass over the markdown body, in the same idiom as
 * applyDiagramFences(): each fence is replaced with finished HTML, which marked
 * then passes through untouched as a block-level HTML element. That keeps the
 * async work (shiki is async, processMarkdown is not) out of the synchronous
 * markdown transform, and avoids overriding marked's renderer.
 *
 * Nothing here ships to the browser — highlighting happens once per docs-cache
 * generation on the server, and the client receives plain HTML.
 */
import { createHighlighter, type Highlighter } from 'shiki';
import { mutantGrammar } from './mutant-grammar';

/**
 * Every language the corpus actually uses (go 51, mutant 23, powershell 8,
 * bash 6, json 3, lua 2, javascript 1, text 1), plus the few a docs corpus
 * like this tends to grow into. Loading the full shiki bundle would pull
 * hundreds of grammars to serve eight.
 */
const LANGS = ['go', 'powershell', 'bash', 'json', 'lua', 'javascript', 'typescript', 'yaml'];

/** All three site themes use a dark --code-bg, so one dark theme covers them. */
const THEME = 'github-dark-dimmed';

const ALIASES: Record<string, string> = {
	sh: 'bash',
	shell: 'bash',
	zsh: 'bash',
	console: 'bash',
	ps1: 'powershell',
	pwsh: 'powershell',
	js: 'javascript',
	ts: 'typescript',
	yml: 'yaml',
	jsonc: 'json'
};

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
	// Shared across calls: creating a highlighter loads and compiles grammars,
	// which is far too expensive to repeat per fence.
	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: [THEME],
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			langs: [...LANGS, mutantGrammar as any]
		});
	}
	return highlighterPromise;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Drop shiki's inline background so the panel inherits --code-bg and stays
 * correct when the reader switches theme. The foreground colours are kept.
 */
/**
 * github-dark-dimmed's comment colour is #768390, which lands at 3.6:1 on the
 * code panel — under AA for body text. The rest of its palette clears the bar,
 * so the one token is lifted here rather than swapping the whole theme.
 */
const DIMMED_COMMENT = /#768390/gi;
const COMMENT_LIFTED = '#8b98a5';

function stripBackground(html: string): string {
	return html.replace(/background-color:[^;"]*;?/g, '').replace(DIMMED_COMMENT, COMMENT_LIFTED);
}

function wrap(inner: string, label: string): string {
	const attr = label ? ` data-lang="${escapeHtml(label)}"` : '';
	return `<div class="code-block"${attr}>\n${inner}\n</div>`;
}

/** An unhighlighted block that still looks like every other code panel. */
function plainBlock(code: string, label: string): string {
	return wrap(`<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`, label);
}

/**
 * Replace every fenced code block in `body` with highlighted HTML.
 *
 * Diagram fences (mermaid/plantuml/puml) are already gone by the time this
 * runs — applyDiagramFences() converts them to <figure> elements first.
 */
export async function highlightFences(body: string): Promise<string> {
	if (!body.includes('```')) return body;

	const fences: Array<{ full: string; lang: string; code: string }> = [];
	const pattern = /^```([A-Za-z0-9_+-]*)[^\n]*\n([\s\S]*?)^```[ \t]*$/gm;

	let match: RegExpExecArray | null;
	while ((match = pattern.exec(body)) !== null) {
		fences.push({ full: match[0], lang: match[1] ?? '', code: match[2] });
	}
	if (fences.length === 0) return body;

	let highlighter: Highlighter;
	try {
		highlighter = await getHighlighter();
	} catch {
		// Highlighting is a progressive enhancement of the reading experience.
		// If shiki cannot start, the docs must still render.
		return body;
	}

	const loaded = new Set(highlighter.getLoadedLanguages());
	let result = body;

	for (const fence of fences) {
		const declared = fence.lang.toLowerCase();
		const lang = ALIASES[declared] ?? declared;
		const code = fence.code.replace(/\s+$/, '');
		let replacement: string;

		if (!lang || !loaded.has(lang)) {
			// No language, or one we deliberately do not carry a grammar for.
			replacement = plainBlock(code, declared);
		} else {
			try {
				const html = highlighter.codeToHtml(code, { lang, theme: THEME });
				replacement = wrap(stripBackground(html), declared);
			} catch {
				replacement = plainBlock(code, declared);
			}
		}

		result = result.replace(fence.full, () => replacement);
	}

	return result;
}
