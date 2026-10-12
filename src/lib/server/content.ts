import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import fg from 'fast-glob';
import matter from 'gray-matter';
import lunr from 'lunr';
import { marked } from 'marked';
import plantumlEncoder from 'plantuml-encoder';
import { highlightFences } from './highlight';
import { injectCharts } from './charts';
import { z } from 'zod';

import {
	type Audience,
	docsManifest,
	docsManifestDirectories,
	type ManifestEntry,
	type SectionKey
} from '$lib/server/docs-manifest';
import { MUTANT_TAG } from '$lib/mutant-pin';
import { REPO } from '$lib/site';

function resolveDocsRoot(): string {
	const configuredRoot = process.env.MUDOCS_DOCS_ROOT?.trim();
	const candidates = [
		configuredRoot ? path.resolve(configuredRoot) : null,
		path.resolve(process.cwd(), 'docs'),
		path.resolve(process.cwd(), '..', 'docs'),
		path.resolve(process.cwd(), '..', 'mutant', 'docs')
	].filter((value): value is string => Boolean(value));

	for (const candidate of candidates) {
		if (fsSync.existsSync(candidate) && fsSync.statSync(candidate).isDirectory()) {
			return candidate;
		}
	}

	throw new Error(`Unable to locate definitive docs root. Checked: ${candidates.join(', ')}`);
}

const sectionCatalog: Record<SectionKey, {
	title: string;
	description: string;
	intro: string;
	featuredSlug: string;
	readingPath: string[];
}> = {
	overview: {
		title: 'Overview',
		description: 'Big-picture explanations, quick reference material, and definitive orientation docs.',
		intro: 'Start here if you need the shape of the language, why it exists, and which foundational documents to read first.',
		featuredSlug: 'what_is_mutant',
		readingPath: ['what_is_mutant', 'tutorial_30_min', 'comparison', 'detailed_explanations']
	},
	reference: {
		title: 'Reference',
		description: 'Canonical policies, reference sheets, migration matrices, and source-of-truth documentation.',
		intro: 'Use this section when you need exact policy, source-of-truth fields, or implementation mapping rather than narrative explanation.',
		featuredSlug: 'mutant_language_reference',
		readingPath: ['mutant_language_reference', 'cookbook', 'capability_reference', 'quick_reference', 'wasm_repl_reference']
	},
	runtime: {
		title: 'Runtime',
		description: 'Bytecode, VM, polymorphism, and execution internals.',
		intro: 'Read this track when you need to understand bytecode layout, execution behavior, and how runtime hardening fits together.',
		featuredSlug: 'bytecode_ir',
		readingPath: ['bytecode_ir', 'polymorphic_bytecode_lld', 'binary_artifact_security_deep_dive']
	},
	security: {
		title: 'Security',
		description: 'Tamper resistance, sandboxing, remote scan policy, and security deep dives.',
		intro: 'This is the operational security handbook: hardening model, response policy, probes, sandbox behavior, and runbook guidance.',
		featuredSlug: 'security_lld',
		readingPath: [
			'security_lld',
			'security_diagrams',
			'security_runbook',
			'antitamper_probe',
			'sandbox_detection',
			'process_injection_detection_lld',
			'advisories'
		]
	},
	tooling: {
		title: 'Tooling',
		description: 'Editor integration, implementation workflow, and operational runbooks.',
		intro: 'This section is for contributors and integrators building around Mutant, especially editor support and maintenance workflows.',
		featuredSlug: 'lsp_extension_onboarding_60_min',
		readingPath: ['lsp_extension_onboarding_60_min', 'debugging', 'testing', 'lsp_extension_lld']
	}
};

const audienceValues: Audience[] = [
	'all',
	'language-user',
	'security-analyst',
	'platform-engineer',
	'integrator'
];

const themeCatalog = {
	bytecode: {
		title: 'Bytecode',
		description: 'IR, VM internals, polymorphism, and runtime instruction behavior.'
	},
	sandboxing: {
		title: 'Sandboxing',
		description: 'Sandbox signals, runtime probes, and anti-analysis handling.'
	},
	signing: {
		title: 'Signing',
		description: 'Artifact signing, provenance, trust chain, and verification policy.'
	},
	repl: {
		title: 'REPL',
		description: 'Interactive execution workflows and web playground integration.'
	},
	lsp: {
		title: 'LSP',
		description: 'Language server protocol integration and editor tooling workflows.'
	}
} as const;

type ThemeKey = keyof typeof themeCatalog;

const frontmatterSchema = z
	.object({
		title: z.string().optional(),
		description: z.string().optional(),
		weight: z.number().optional(),
		draft: z.boolean().optional(),
		source_repo: z.string().optional(),
		source_path: z.string().optional(),
		source_ref: z.string().optional(),
		last_reviewed: z.string().optional(),
		review_owner: z.string().optional(),
		freshness_tier: z.string().optional(),
		section: z.string().optional(),
		audience: z.enum(audienceValues).optional(),
		order: z.number().optional(),
		tags: z.array(z.string()).optional(),
		themes: z.array(z.string()).optional()
	})
	.catchall(z.unknown());

export type DocFrontmatter = z.infer<typeof frontmatterSchema>;

export type DocItem = {
	section: SectionKey;
	slug: string;
	title: string;
	description: string;
	body: string;
	/** The markdown exactly as it sits on disk, before diagram/heading rewriting. */
	raw: string;
	html: string;
	toc: Array<{ id: string; text: string; level: number }>;
	frontmatter: DocFrontmatter;
	filePath: string;
	sourcePath: string;
	sectionTitle: string;
	sectionDescription: string;
	audience: Audience;
	order: number;
	tags: string[];
	themes: ThemeKey[];
	relatedDocs: Array<{ section: SectionKey; slug: string; title: string }>;
	previousDoc: { section: SectionKey; slug: string; title: string } | null;
	nextDoc: { section: SectionKey; slug: string; title: string } | null;
};

/**
 * A doc without its rendered HTML or its source markdown.
 *
 * List pages only need the card fields, but a DocItem carries the doc's full
 * `html` and `raw`. Sending those for every document made /docs a 1.6 MB
 * response. Loads that render lists must map through toDocSummary().
 */
export type DocSummary = Omit<DocItem, 'html' | 'raw' | 'body' | 'toc'>;

export function toDocSummary(doc: DocItem): DocSummary {
	const { html: _html, raw: _raw, body: _body, toc: _toc, ...summary } = doc;
	return summary;
}

export type SectionSummary = {
	section: SectionKey;
	title: string;
	description: string;
	count: number;
};

export type SectionLanding = {
	section: SectionKey;
	title: string;
	description: string;
	intro: string;
	featuredDoc: DocItem | null;
	readingPath: Array<{ section: SectionKey; slug: string; title: string }>;
	additionalDocs: DocItem[];
};

export type ThemeSummary = {
	theme: ThemeKey;
	title: string;
	description: string;
	count: number;
};

export type DocsSearchParams = {
	query: string;
	section?: string;
	theme?: string;
	audience?: Audience;
	limit?: number;
};

export type DocsSearchHit = {
	doc: Pick<
		DocItem,
		'section' | 'slug' | 'title' | 'description' | 'sectionTitle' | 'sourcePath' | 'audience' | 'tags' | 'themes'
	>;
	score: number;
	preview: string;
	previewHtml: string;
	matchedTerms: string[];
};

type SearchRow = {
	searchId: string;
	section: SectionKey;
	themeTokens: string;
	audience: Audience;
	title: string;
	description: string;
	headings: string;
	tags: string;
	body: string;
	doc: Pick<
		DocItem,
		'section' | 'slug' | 'title' | 'description' | 'sectionTitle' | 'sourcePath' | 'audience' | 'tags' | 'themes'
	>;
};

type DocsCacheEntry = {
	key: string;
	docs: DocItem[];
};

type SearchIndexCacheEntry = {
	key: string;
	index: lunr.Index;
	rowById: Map<string, SearchRow>;
};

let docsCache: DocsCacheEntry | null = null;
let searchIndexCache: SearchIndexCacheEntry | null = null;

marked.setOptions({ gfm: true, breaks: false });

/**
 * The document's own first `# ` heading.
 *
 * No doc in the corpus carries frontmatter, so without this every title falls
 * back to the SCREAMING_FILENAME ("BYTECODE IR"). The H1 is the title the
 * authors actually wrote ("Mutant IR / ByteCode Reference"), and it is the same
 * heading processMarkdown() demotes for exactly that reason.
 */
function firstHeading(body: string): string | null {
	let inFence = false;
	for (const line of body.split(/\r?\n/)) {
		if (line.trim().startsWith('```')) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		const match = /^#\s+(.+)$/.exec(line);
		if (match) return match[1].trim().replace(/`/g, '');
	}
	return null;
}

function titleize(input: string): string {
	return input
		.replace(/[-_]/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

function excerptFromBody(body: string): string {
	const flattened = body
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`[^`]+`/g, ' ')
		.replace(/[#>*_\-[\]()]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	return flattened.slice(0, 220) + (flattened.length > 220 ? '...' : '');
}

/**
 * A document's own opening prose.
 *
 * Every doc used to fall back to sectionCatalog[section].description, and no
 * doc in the corpus carries a description in its frontmatter — so all seven
 * security docs described themselves with one identical sentence, on their
 * cards and in their <meta name="description">. This gives each doc the
 * sentence it actually opens with.
 */
function leadParagraph(raw: string): string | null {
	const blocks = raw.split(/\r?\n\s*\r?\n/);
	const leadIns: string[] = [];

	for (const block of blocks) {
		const trimmed = block.trim();
		if (!trimmed) continue;
		// Headings, fences, tables, quotes, images, lists and bare links are not prose.
		if (/^(#|```|\||>|!\[)/.test(trimmed)) continue;
		if (/^\s*[-*+]\s/.test(trimmed)) continue;
		if (/^\s*\d+[.)]\s/.test(trimmed)) continue;
		if (/^\[[^\]]+\]\([^)]+\)$/.test(trimmed)) continue;
		// A paragraph that is nothing but one code span is a format string or a
		// path, not a description of the document.
		if (/^`[^`]+`$/.test(trimmed)) continue;

		const text = trimmed
			.replace(/`([^`]+)`/g, '$1')
			.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
			.replace(/[*_]/g, '')
			.replace(/\s+/g, ' ')
			.trim();

		if (text.length < 40) continue;

		// Reject ASCII diagrams and envelope layouts, which pass a length test but
		// are mostly punctuation. Real prose is overwhelmingly letters and spaces.
		const letters = (text.match(/[A-Za-z ]/g) ?? []).length;
		if (letters / text.length < 0.8) continue;
		if ((text.match(/ /g) ?? []).length < 6) continue;

		// A colon lead-in introduces a list rather than standing on its own, so it
		// is only used when the document offers nothing better.
		if (text.endsWith(':')) {
			leadIns.push(text.replace(/\s*:\s*$/, '.'));
			continue;
		}

		return clampSentence(text);
	}

	return leadIns.length ? clampSentence(leadIns[0]) : null;
}

/** Trim to whole sentences, at most ~200 characters. */
function clampSentence(text: string): string {
	if (text.length <= 200) return text;
	const cut = text.slice(0, 200);
	const stop = cut.lastIndexOf('. ');
	return stop > 80 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, '') + '…';
}

/**
 * GitHub's heading-anchor algorithm, deliberately including the part that looks
 * like a bug: punctuation is dropped *before* spaces become hyphens, so
 * "7. Symbol Table & Scoping" anchors as `7-symbol-table--scoping` with two
 * hyphens. The corpus is authored against GitHub, and its own cross-references
 * use those anchors — collapsing runs of whitespace here left links such as
 * `#10-closures--free-variables` and `#notes--limits` pointing at nothing.
 */
export function slugifyHeading(value: string): string {
	return value
		.toLowerCase()
		.replace(/<[^>]+>/g, '')
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s/g, '-');
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function normalizeToken(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');
}

function normalizeThemes(values: string[]): ThemeKey[] {
	const set = new Set<ThemeKey>();
	for (const value of values.map(normalizeToken)) {
		if (value in themeCatalog) {
			set.add(value as ThemeKey);
		}
	}
	return [...set];
}

function escapeAttribute(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tokenizeQuery(query: string): string[] {
	const seen = new Set<string>();
	for (const token of query.toLowerCase().split(/\s+/)) {
		const cleaned = token.trim().replace(/[^a-z0-9_-]/g, '');
		if (cleaned.length >= 2) {
			seen.add(cleaned);
		}
	}
	return [...seen];
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripHtml(value: string): string {
	return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeForIndex(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9\s_-]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** A Markdown file on disk and the path it has in the Mutant repo (`docs/X.md`, `README.md`). */
type DocFile = { file: string; repoPath: string };

/**
 * Project files mirrored from the Mutant repo root (README, CHANGELOG, ...) by
 * scripts/mutant-sync.mjs. Optional: a docs root alone is a complete site.
 */
function resolveRepoFilesRoot(): string | null {
	const candidate = path.resolve(process.cwd(), 'content', 'repo');
	return fsSync.existsSync(candidate) && fsSync.statSync(candidate).isDirectory() ? candidate : null;
}

async function markdownUnder(root: string, prefix: string): Promise<DocFile[]> {
	const files = await fg(path.join(root, '**/*.md').replace(/\\/g, '/'), { dot: false });
	return files.map((file) => ({ file, repoPath: `${prefix}${path.relative(root, file).split(path.sep).join('/')}` }));
}

async function resolveDocsFilesWithCacheKey(root: string): Promise<{ files: DocFile[]; cacheKey: string }> {
	// Recursive: Mutant's docs/ has subdirectories (advisories/), mirrored as-is.
	const repoRoot = resolveRepoFilesRoot();
	const files = [
		...(await markdownUnder(root, 'docs/')),
		...(repoRoot ? await markdownUnder(repoRoot, '') : [])
	].sort((a, b) => a.repoPath.localeCompare(b.repoPath));

	const statParts = await Promise.all(
		files.map(async ({ file, repoPath }) => {
			const stat = await fs.stat(file);
			return `${repoPath}:${stat.size}:${Math.floor(stat.mtimeMs)}`;
		})
	);

	return {
		files,
		cacheKey: `${root}|${repoRoot ?? ''}|${statParts.join('|')}`
	};
}

/**
 * One URL segment per document. A file is named by its base name; a README
 * inside a directory stands for that directory, so docs/advisories/README.md
 * is `advisories`. A manifest entry may name the slug outright.
 */
function docSlug(repoPath: string): string {
	const parts = repoPath.split('/');
	const base = path.posix.basename(repoPath, '.md');
	const name = base.toLowerCase() === 'readme' && parts.length > 1 ? parts[parts.length - 2] : base;
	return name.toLowerCase();
}

/** Manifest entry for a file, layered over the defaults of the directory it sits in. */
function manifestFor(sourcePath: string): ManifestEntry {
	const dir = Object.keys(docsManifestDirectories).find((prefix) => sourcePath.startsWith(prefix));
	return { ...(dir ? docsManifestDirectories[dir] : {}), ...(docsManifest[sourcePath] ?? {}) };
}

function computeSearchIndexKey(docs: DocItem[]): string {
	return docs
		.map((doc) => `${doc.section}/${doc.slug}:${doc.order}:${doc.body.length}:${doc.title.length}:${doc.description.length}`)
		.join('|');
}

function extractPreview(text: string, terms: string[]): string {
	const normalized = text.replace(/\s+/g, ' ').trim();
	if (!normalized) return '';
	if (terms.length === 0) return normalized.slice(0, 220) + (normalized.length > 220 ? '...' : '');

	const lowered = normalized.toLowerCase();
	let index = -1;
	for (const term of terms) {
		const candidate = lowered.indexOf(term);
		if (candidate >= 0 && (index === -1 || candidate < index)) {
			index = candidate;
		}
	}

	if (index < 0) return normalized.slice(0, 220) + (normalized.length > 220 ? '...' : '');

	const start = Math.max(0, index - 80);
	const end = Math.min(normalized.length, index + 180);
	const snippet = normalized.slice(start, end);
	const prefix = start > 0 ? '...' : '';
	const suffix = end < normalized.length ? '...' : '';
	return `${prefix}${snippet}${suffix}`;
}

function highlightPreview(preview: string, terms: string[]): string {
	let html = escapeHtml(preview);
	for (const term of [...terms].sort((a, b) => b.length - a.length)) {
		const escapedTerm = escapeHtml(term);
		const rx = new RegExp(`(${escapeRegex(escapedTerm)})`, 'gi');
		html = html.replace(rx, '<mark>$1</mark>');
	}
	return html;
}

function applyDiagramFences(body: string): string {
	return body.replace(/```(mermaid|plantuml|puml)\s*\n([\s\S]*?)```/gi, (_full, lang: string, code: string) => {
		const diagramCode = code.trim();
		if (!diagramCode) return _full;

		if (lang.toLowerCase() === 'mermaid') {
			const encoded = escapeAttribute(encodeURIComponent(diagramCode));
			const kind = mermaidKind(diagramCode);
			return [
				'<figure class="diagram-shell" data-fx="fade-up">',
				`  <div class="diagram-mermaid" data-diagram-source="${encoded}" aria-label="${escapeAttribute(kind)}"></div>`,
				`  <figcaption>${kind}</figcaption>`,
				'</figure>'
			].join('\n');
		}

		const encodedPlantUml = plantumlEncoder.encode(diagramCode);
		const src = `https://www.plantuml.com/plantuml/svg/${encodedPlantUml}`;
		return [
			'<figure class="diagram-shell" data-fx="fade-up">',
			`  <img class="diagram-image" src="${src}" alt="PlantUML diagram" loading="lazy" decoding="async" />`,
			'  <figcaption>Diagram</figcaption>',
			'</figure>'
		].join('\n');
	});
}

/**
 * "Mermaid diagram" tells a reader which library drew the picture, not what the
 * picture is. Mermaid states its own kind on the first non-empty line, so use
 * that; anything unrecognised keeps the generic caption.
 */
function mermaidKind(code: string): string {
	const first = code
		.split('\n')
		.map((line) => line.trim())
		.find((line) => line && !line.startsWith('%%') && !line.startsWith('---'));
	if (!first) return 'Diagram';

	const keyword = /^([A-Za-z-]+)/.exec(first)?.[1] ?? '';
	switch (keyword.toLowerCase()) {
		case 'flowchart':
		case 'graph':
			return 'Flowchart';
		case 'sequencediagram':
			return 'Sequence diagram';
		case 'classdiagram':
			return 'Class diagram';
		case 'statediagram':
		case 'statediagram-v2':
			return 'State diagram';
		case 'erdiagram':
			return 'Entity relationship diagram';
		case 'journey':
			return 'User journey';
		case 'gantt':
			return 'Gantt chart';
		case 'pie':
			return 'Pie chart';
		case 'mindmap':
			return 'Mind map';
		case 'timeline':
			return 'Timeline';
		default:
			return 'Diagram';
	}
}

function inferSection(fileName: string, source: string): SectionKey {
	const upper = fileName.toUpperCase();
	const combined = `${upper}\n${source.toUpperCase()}`;

	if (
		/SECURITY|SANDBOX|ANTITAMPER|REMOTE_PROCESS_SCAN|PROCESS_INJECTION|BINARY_ARTIFACT|RUNBOOK/.test(upper)
	) {
		return 'security';
	}

	if (/BYTECODE|POLYMORPHIC|VM|OPCODE|IR/.test(upper) || /BYTECODE|VIRTUAL MACHINE|OPERAND/.test(combined)) {
		return 'runtime';
	}

	if (/LSP|IMPLEMENTATION_GUIDE|MANUAL_UPDATE_WORKFLOW|ONBOARDING/.test(upper)) {
		return 'tooling';
	}

	// Capability guides (the db_*, network, structured-data and Lua-embedding
	// docs) are reference material. Without these names they fall through to the
	// catch-all below and land in Overview, which is where the showcase's
	// Overview filter started offering the graph-database doc.
	if (
		/CANONICAL|QUICK_REFERENCE|MIGRATION|TRACEABILITY|CAPABILITY|DATABASE|NETWORKING|STRUCTURED|RUNTIME_INTEGRATION/.test(
			upper
		)
	) {
		return 'reference';
	}

	return 'overview';
}

function resolveSection(candidate: string | undefined, fallback: SectionKey): SectionKey {
	if (candidate && candidate in sectionCatalog) {
		return candidate as SectionKey;
	}
	return fallback;
}

function inferredFrontmatter(repoPath: string, section: SectionKey): DocFrontmatter {
	return {
		title: titleize(path.posix.basename(repoPath).replace(/\.md$/i, '')),
		description: sectionCatalog[section].description,
		source_repo: 'aoiflux/mutant',
		source_path: repoPath,
		source_ref: MUTANT_TAG,
		freshness_tier: section === 'security' || section === 'runtime' ? 'critical' : 'high',
		review_owner: 'docs',
		audience: section === 'security' ? 'security-analyst' : section === 'runtime' ? 'platform-engineer' : 'all'
	};
}

/**
 * The docs corpus is authored inside the language repo, so its links assume the
 * files that sit beside docs/ over there. None of them exist here: rendered
 * as-is, `../examples/...`, `../builtin/net.go` and even a sibling
 * `SECURITY_LLD.md` all resolve against /docs/<section>/<slug> and 404.
 *
 * Every link is relative to the document that contains it, as on GitHub. A
 * link to another document in the corpus becomes this site's page for it;
 * everything else becomes an absolute URL into the language repo at the pinned
 * release tag, never a branch, so a citation keeps meaning what it meant when
 * the doc was written. GitHub redirects a /tree/ path that names a file to its
 * /blob/ view, fragment intact, so one base serves files and directories.
 */
function rewriteRepoLinks(body: string, docPages: Map<string, string>, docRepoPath: string): string {
	let inCodeFence = false;
	return body
		.split(/\r?\n/)
		.map((line) => {
			if (/^```/.test(line.trim())) {
				inCodeFence = !inCodeFence;
				return line;
			}
			if (inCodeFence) return line;

			// Images are served as files, so they resolve to the raw blob, not a page.
			return line
				.replace(/(!\[[^\]]*\]\()([^)\s]+)\)/g, (match, head: string, target: string) => {
					const resolved = resolveRepoAsset(target, docRepoPath);
					return resolved ? `${head}${resolved})` : match;
				})
				.replace(/(<img\b[^>]*\bsrc=)(['"])([^'"]+)\2/gi, (match, head: string, quote: string, target: string) => {
					const resolved = resolveRepoAsset(target, docRepoPath);
					return resolved ? `${head}${quote}${resolved}${quote}` : match;
				})
				.replace(/\]\(([^)\s]+)\)/g, (match, target: string) => {
					const resolved = resolveRepoLink(target, docPages, docRepoPath);
					return resolved ? `](${resolved})` : match;
				});
		})
		.join('\n');
}

/** A relative link target as a path in the Mutant repo, or null if it is not one. */
function repoPathOf(target: string, docRepoPath: string): { repoPath: string; fragment: string } | null {
	// Absolute URLs, protocol-relative links and in-page anchors already work.
	if (/^([a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(target)) return null;

	const hashIndex = target.indexOf('#');
	const fragment = hashIndex === -1 ? '' : target.slice(hashIndex);
	const filePath = hashIndex === -1 ? target : target.slice(0, hashIndex);
	if (!filePath) return null;

	// Resolve against the containing document's directory inside the repo.
	const repoPath = path.posix.normalize(path.posix.join(path.posix.dirname(docRepoPath), filePath));
	if (repoPath === '..' || repoPath.startsWith('../')) return null;
	return { repoPath, fragment };
}

function resolveRepoLink(target: string, docPages: Map<string, string>, docRepoPath: string): string | null {
	const resolved = repoPathOf(target, docRepoPath);
	if (!resolved) return null;
	const { repoPath, fragment } = resolved;

	// A line anchor (#L42) only means something in GitHub's file view, so a doc
	// carrying one keeps pointing at the repo rather than at the rendered page.
	if (!/^#L\d/.test(fragment)) {
		const page = docPages.get(repoPath.toLowerCase());
		if (page) return `${page}${fragment}`;
	}

	return `${REPO.treeBase}/${repoPath.replace(/\/+$/, '')}${fragment}`;
}

function resolveRepoAsset(target: string, docRepoPath: string): string | null {
	const resolved = repoPathOf(target, docRepoPath);
	return resolved ? `${REPO.rawBase}/${resolved.repoPath}` : null;
}

function normalizeHeading(value: string): string {
	return value
		.replace(/`/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

function processMarkdown(
	body: string,
	pageTitle: string
): {
	body: string;
	toc: Array<{ id: string; text: string; level: number }>;
} {
	const withDiagrams = applyDiagramFences(body);
	const toc: Array<{ id: string; text: string; level: number }> = [];
	const lines = withDiagrams.split(/\r?\n/);
	let inCodeFence = false;
	let seenTopHeading = false;
	const usedIds = new Map<string, number>();

	const processed = lines.map((line): string | null => {
		if (/^```/.test(line.trim())) {
			inCodeFence = !inCodeFence;
			return line;
		}

		if (inCodeFence) return line;

		const match = /^(#{1,4})\s+(.+)$/.exec(line);
		if (!match) return line;

		const rawLevel = match[1].length;
		const text = match[2].trim();

		// The route already renders the doc's own <h1> from the title, and that
		// title is usually taken from this very heading — rendering it again as
		// an H2 showed the reader the same words twice. Drop it when it repeats
		// the title; demote it when it genuinely differs (a frontmatter or
		// manifest override), so the page still never has two top-level headings.
		const level = rawLevel === 1 ? 2 : rawLevel;
		const isTitleRepeat =
			rawLevel === 1 &&
			!seenTopHeading &&
			normalizeHeading(text) === normalizeHeading(pageTitle);
		if (rawLevel === 1) seenTopHeading = true;
		if (isTitleRepeat) return null;

		// Repeated headings would otherwise emit duplicate ids, breaking both
		// deep links and the TOC scroll-spy.
		const base = slugifyHeading(text);
		const seenCount = usedIds.get(base) ?? 0;
		usedIds.set(base, seenCount + 1);
		const id = seenCount === 0 ? base : base + '-' + (seenCount + 1);

		if (level >= 2 && level <= 4) {
			toc.push({ id, text: text.replace(/`/g, ''), level });
		}

		// A permalink per heading: these documents are long and are linked into
		// from issues and chat, and there is otherwise no way to copy a deep link.
		const anchor = `<a class="heading-anchor" href="#${id}" aria-label="Link to this section">#</a>`;
		return `<h${level} id="${id}">${escapeHtml(text)}${anchor}</h${level}>`;
	});

	return { body: processed.filter((line) => line !== null).join('\n'), toc };
}

async function loadAllDocs(): Promise<DocItem[]> {
	let definitiveDocsRoot: string;
	try {
		definitiveDocsRoot = resolveDocsRoot();
	} catch (error) {
		console.error('[docs] Unable to resolve docs root', error);
		docsCache = {
			key: 'missing-docs-root',
			docs: []
		};
		return [];
	}
	const { files, cacheKey } = await resolveDocsFilesWithCacheKey(definitiveDocsRoot);

	if (docsCache && docsCache.key === cacheKey) {
		return docsCache.docs;
	}

	// Two passes: a document can only be linked to its page on this site once
	// every document's section is known, and sections are resolved per file.
	const parsedFiles = await Promise.all(
		files.map(async ({ file, repoPath }) => {
			const source = await fs.readFile(file, 'utf8');
			const parsed = matter(source);
			const fileName = path.basename(file);
			const sourcePath = repoPath;
			const manifestEntry = manifestFor(sourcePath);
			const inferredSection = inferSection(fileName, parsed.content);
			const resolvedSection = resolveSection(manifestEntry.section ?? parsed.data.section, inferredSection);
			const inferred = inferredFrontmatter(repoPath, resolvedSection);
			const frontmatter = frontmatterSchema.parse({
				...inferred,
				...manifestEntry,
				...parsed.data,
				section: resolvedSection
			});

			const slug = manifestEntry.slug ?? docSlug(repoPath);
			const raw = parsed.content.trim();
			const title =
				(typeof parsed.data.title === 'string' ? parsed.data.title : null) ??
				firstHeading(raw) ??
				frontmatter.title ??
				titleize(slug);

			return {
				file,
				fileName,
				repoPath,
				sourcePath,
				manifestEntry,
				inferred,
				frontmatter,
				resolvedSection,
				slug,
				raw,
				title,
				data: parsed.data
			};
		})
	);

	/** Lower-cased repo path (as the corpus links to it) → this site's page. */
	const docPages = new Map(
		parsedFiles.map((entry) => [
			entry.repoPath.toLowerCase(),
			`/docs/${entry.resolvedSection}/${entry.slug}`
		])
	);

	const docs = await Promise.all(
		parsedFiles.map(async (entry) => {
			const {
				file,
				repoPath,
				sourcePath,
				manifestEntry,
				inferred,
				frontmatter,
				resolvedSection,
				slug,
				raw,
				title,
				data
			} = entry;
			const processed = processMarkdown(rewriteRepoLinks(injectCharts(raw), docPages, repoPath), title);
			const body = processed.body;
			// Fences become finished HTML before marked runs; see highlightFences().
			const html = await marked.parse(await highlightFences(body));
			const tags = [...new Set((frontmatter.tags ?? []).map(normalizeToken).filter(Boolean))];
			const themes = normalizeThemes([...(frontmatter.themes ?? []), ...tags]);
			const audience = frontmatter.audience ?? inferred.audience ?? 'all';
			const order = frontmatter.order ?? manifestEntry.order ?? frontmatter.weight ?? Number.MAX_SAFE_INTEGER;

			return {
				section: resolvedSection,
				slug,
				title,
				// The section blurb is the last resort, not the first: it describes a
				// whole track, so using it here made every doc in a track identical.
				description:
					(typeof data.description === 'string' ? data.description : null) ??
					leadParagraph(raw) ??
					sectionCatalog[resolvedSection].description,
				body,
				raw,
				html,
				toc: processed.toc,
				frontmatter,
				filePath: file,
				sourcePath,
				sectionTitle: sectionCatalog[resolvedSection].title,
				sectionDescription: sectionCatalog[resolvedSection].description,
				audience,
				order,
				tags,
				themes,
				relatedDocs: [],
				previousDoc: null,
				nextDoc: null
			} satisfies DocItem;
		})
	);

	const sorted = docs.sort((a, b) => {
		if (a.order !== b.order) return a.order - b.order;
		return a.title.localeCompare(b.title);
	});

	const enrichedDocs = sorted.map((doc) => {
		const sameSection = sorted.filter((candidate) => candidate.section === doc.section);
		const sectionIndex = sameSection.findIndex((candidate) => candidate.slug === doc.slug);
		const previousDoc =
			sectionIndex > 0
				? {
					section: sameSection[sectionIndex - 1].section,
					slug: sameSection[sectionIndex - 1].slug,
					title: sameSection[sectionIndex - 1].title
				}
				: null;
		const nextDoc =
			sectionIndex >= 0 && sectionIndex < sameSection.length - 1
				? {
					section: sameSection[sectionIndex + 1].section,
					slug: sameSection[sectionIndex + 1].slug,
					title: sameSection[sectionIndex + 1].title
				}
				: null;

		const relatedDocs = sorted
			.filter((candidate) => candidate.slug !== doc.slug)
			.filter((candidate) => {
				const sharedTheme = candidate.themes.some((theme) => doc.themes.includes(theme));
				const sharedTag = candidate.tags.some((tag) => doc.tags.includes(tag));
				return candidate.section === doc.section || sharedTheme || sharedTag;
			})
			.slice(0, 4)
			.map((candidate) => ({
				section: candidate.section,
				slug: candidate.slug,
				title: candidate.title
			}));

		return {
			...doc,
			relatedDocs,
			previousDoc,
			nextDoc
		};
	});

	docsCache = {
		key: cacheKey,
		docs: enrichedDocs
	};

	return enrichedDocs;
}

export async function listAllDocs(): Promise<DocItem[]> {
	return loadAllDocs();
}

export async function listSections(): Promise<SectionSummary[]> {
	const docs = await loadAllDocs();

	return (Object.keys(sectionCatalog) as SectionKey[])
		.map((section) => {
			const matches = docs.filter((doc) => doc.section === section);
			return {
				section,
				title: sectionCatalog[section].title,
				description: sectionCatalog[section].description,
				count: matches.length
			};
		})
		.filter((section) => section.count > 0);
}

export async function listDocsBySection(section: string): Promise<DocItem[]> {
	const docs = await loadAllDocs();
	return docs.filter((doc) => doc.section === section);
}

export async function getSectionLanding(section: string): Promise<SectionLanding | null> {
	if (!(section in sectionCatalog)) {
		return null;
	}

	const key = section as SectionKey;
	const config = sectionCatalog[key];
	const docs = (await loadAllDocs()).filter((doc) => doc.section === key);
	const featuredDoc = docs.find((doc) => doc.slug === config.featuredSlug) ?? docs[0] ?? null;
	const readingPath = config.readingPath
		.map((slug) => docs.find((doc) => doc.slug === slug))
		.filter((doc): doc is DocItem => Boolean(doc))
		.map((doc) => ({ section: doc.section, slug: doc.slug, title: doc.title }));
	const readingSet = new Set(readingPath.map((doc) => doc.slug));
	const additionalDocs = docs.filter((doc) => !readingSet.has(doc.slug));

	return {
		section: key,
		title: config.title,
		description: config.description,
		intro: config.intro,
		featuredDoc,
		readingPath,
		additionalDocs
	};
}

export async function getDoc(section: string, slug: string): Promise<DocItem | null> {
	const docs = await loadAllDocs();
	return docs.find((doc) => doc.section === section && doc.slug === slug) ?? null;
}

export async function listThemes(): Promise<ThemeSummary[]> {
	const docs = await loadAllDocs();
	return (Object.keys(themeCatalog) as ThemeKey[])
		.map((theme) => {
			const matches = docs.filter((doc) => doc.themes.includes(theme));
			return {
				theme,
				title: themeCatalog[theme].title,
				description: themeCatalog[theme].description,
				count: matches.length
			};
		})
		.filter((entry) => entry.count > 0);
}

export async function listDocsByTheme(theme: string): Promise<DocItem[]> {
	if (!(theme in themeCatalog)) return [];
	const key = theme as ThemeKey;
	const docs = await loadAllDocs();
	return docs.filter((doc) => doc.themes.includes(key));
}

export async function searchDocs(params: DocsSearchParams): Promise<DocsSearchHit[]> {
	const phrase = params.query.trim().toLowerCase();
	const terms = tokenizeQuery(params.query);
	if (!phrase || terms.length === 0) return [];

	const docs = await loadAllDocs();
	const limit = Math.max(1, Math.min(params.limit ?? 40, 200));

	const searchIndexKey = computeSearchIndexKey(docs);
	if (!searchIndexCache || searchIndexCache.key !== searchIndexKey) {
		const searchRows: SearchRow[] = docs.map((doc) => {
			const bodyText = stripHtml(doc.body);
			return {
				searchId: `${doc.section}/${doc.slug}`,
				section: doc.section,
				themeTokens: doc.themes.join(' '),
				audience: doc.audience,
				title: normalizeForIndex(doc.title),
				description: normalizeForIndex(doc.description),
				headings: normalizeForIndex(doc.toc.map((h) => h.text).join(' ')),
				tags: normalizeForIndex(doc.tags.join(' ')),
				body: normalizeForIndex(bodyText),
				doc: {
					section: doc.section,
					slug: doc.slug,
					title: doc.title,
					description: doc.description,
					sectionTitle: doc.sectionTitle,
					sourcePath: doc.sourcePath,
					audience: doc.audience,
					tags: doc.tags,
					themes: doc.themes
				}
			};
		});

		const rowById = new Map(searchRows.map((row) => [row.searchId, row]));

		const index = lunr(function (this: lunr.Builder) {
			this.ref('searchId');
			this.field('title', { boost: 20 });
			this.field('headings', { boost: 14 });
			this.field('tags', { boost: 12 });
			this.field('description', { boost: 8 });
			this.field('body', { boost: 2 });

			for (const row of searchRows) {
				this.add(row);
			}
		});

		searchIndexCache = {
			key: searchIndexKey,
			index,
			rowById
		};
	}

	const index = searchIndexCache.index;
	const rowById = searchIndexCache.rowById;

	const lunrQuery = terms
		.map((term) => term.replace(/[^a-z0-9_-]/g, ''))
		.filter(Boolean)
		.map((term) => `${term}*`)
		.join(' ');

	let lunrResults: lunr.Index.Result[] = [];
	try {
		lunrResults = index.search(lunrQuery);
	} catch {
		lunrResults = [];
	}

	if (lunrResults.length === 0) return [];

	return lunrResults
		.map((result) => {
			const row = rowById.get(result.ref);
			if (!row) return null;
			if (params.section && row.doc.section !== params.section) return null;
			if (params.theme && !row.doc.themes.includes(params.theme as ThemeKey)) return null;
			if (params.audience && row.doc.audience !== params.audience) return null;

			const matchedTerms = terms.filter(
				(term) =>
					row.title.includes(term) ||
					row.description.includes(term) ||
					row.tags.includes(term) ||
					row.headings.includes(term) ||
					row.body.includes(term)
			);

			const preview = extractPreview(row.body, terms);

			return {
				doc: row.doc,
				score: Math.round(result.score * 1000) / 1000,
				preview,
				previewHtml: highlightPreview(preview, matchedTerms),
				matchedTerms: matchedTerms.slice(0, 6)
			} satisfies DocsSearchHit;
		})
		.filter((entry): entry is DocsSearchHit => Boolean(entry))
		.slice(0, limit);
}

export async function getAboutPage(): Promise<Pick<DocItem, 'title' | 'description' | 'html'>> {
	return {
		title: 'About Mutant Docs',
		description: 'The official Mutant documentation platform built with SvelteKit and powered by the repository docs corpus.',
		html: `
			<p>Mutant Docs is the official documentation platform for the Mutant language and runtime.</p>
			<p>It is built with SvelteKit, uses the repository-level docs corpus as its source of truth, and includes an in-browser WASM REPL under <a href="/playground">/playground</a>.</p>
			<p>Use <a href="/docs">/docs</a> to browse canonical implementation, runtime, security, and tooling documentation.</p>
		`.trim()
	};
}
