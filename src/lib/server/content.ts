import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import fg from 'fast-glob';
import matter from 'gray-matter';
import lunr from 'lunr';
import { marked } from 'marked';
import plantumlEncoder from 'plantuml-encoder';
import { z } from 'zod';

import {
	type Audience,
	docsManifest,
	type ManifestEntry,
	type SectionKey
} from '$lib/server/docs-manifest';

function resolveDocsRoot(): string {
	const candidates = [
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
		readingPath: ['what_is_mutant', 'language_reference', 'playground_examples']
	},
	reference: {
		title: 'Reference',
		description: 'Canonical policies, reference sheets, migration matrices, and source-of-truth documentation.',
		intro: 'Use this section when you need exact policy, source-of-truth fields, or implementation mapping rather than narrative explanation.',
		featuredSlug: 'language_reference',
		readingPath: ['language_reference', 'playground_examples', 'quick_reference']
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
			'process_injection_detection_lld'
		]
	},
	tooling: {
		title: 'Tooling',
		description: 'Editor integration, implementation workflow, and operational runbooks.',
		intro: 'This section is for contributors and integrators building around Mutant, especially editor support and maintenance workflows.',
		featuredSlug: 'implementation_guide',
		readingPath: ['implementation_guide', 'lsp_extension_onboarding_60_min', 'lsp_extension_lld']
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

export type HomeReadingPath = {
	id: 'learn-language' | 'understand-security' | 'integrate-tooling';
	title: string;
	description: string;
	audience: Audience;
	steps: Array<{ section: SectionKey; slug: string; title: string }>;
};

export type DocsQualityIssue = {
	type:
		| 'missing_source_meta'
		| 'missing_review_meta'
		| 'weak_description'
		| 'missing_tags'
		| 'missing_themes'
		| 'missing_toc'
		| 'not_in_manifest'
		| 'diagram_transform_mismatch';
	message: string;
};

export type DocsQualityDocRow = {
	title: string;
	section: SectionKey;
	slug: string;
	sourcePath: string;
	audience: Audience;
	issues: DocsQualityIssue[];
};

export type DocsQualityReport = {
	generatedAt: string;
	totalDocs: number;
	docsWithIssues: number;
	manifestEntries: number;
	manifestMissingFiles: string[];
	unmappedDocs: string[];
	totalDiagramFences: number;
	totalRenderedDiagrams: number;
	issueCounts: Record<DocsQualityIssue['type'], number>;
	rows: DocsQualityDocRow[];
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

function slugifyHeading(value: string): string {
	return value
		.toLowerCase()
		.replace(/<[^>]+>/g, '')
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-');
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

async function resolveDocsFilesWithCacheKey(root: string): Promise<{ files: string[]; cacheKey: string }> {
	const files = (await fg(path.join(root, '*.md').replace(/\\/g, '/'), { dot: false })).sort((a, b) =>
		a.localeCompare(b)
	);

	const statParts = await Promise.all(
		files.map(async (file) => {
			const stat = await fs.stat(file);
			return `${path.basename(file)}:${stat.size}:${Math.floor(stat.mtimeMs)}`;
		})
	);

	return {
		files,
		cacheKey: `${root}|${statParts.join('|')}`
	};
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
			return [
				'<figure class="diagram-shell">',
				`  <div class="diagram-mermaid" data-diagram-source="${encoded}" aria-label="Mermaid diagram"></div>`,
				'  <figcaption>Mermaid diagram</figcaption>',
				'</figure>'
			].join('\n');
		}

		const encodedPlantUml = plantumlEncoder.encode(diagramCode);
		const src = `https://www.plantuml.com/plantuml/svg/${encodedPlantUml}`;
		return [
			'<figure class="diagram-shell">',
			`  <img class="diagram-image" src="${src}" alt="PlantUML diagram" loading="lazy" decoding="async" />`,
			'  <figcaption>PlantUML diagram</figcaption>',
			'</figure>'
		].join('\n');
	});
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

	if (/CANONICAL|QUICK_REFERENCE|MIGRATION|TRACEABILITY/.test(upper)) {
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

function inferredFrontmatter(fileName: string, section: SectionKey): DocFrontmatter {
	return {
		title: titleize(fileName.replace(/\.md$/i, '')),
		description: sectionCatalog[section].description,
		source_repo: 'aoiflux/mutant',
		source_path: `docs/${fileName}`,
		source_ref: 'main',
		freshness_tier: section === 'security' || section === 'runtime' ? 'critical' : 'high',
		review_owner: 'docs',
		audience: section === 'security' ? 'security-analyst' : section === 'runtime' ? 'platform-engineer' : 'all'
	};
}

function processMarkdown(body: string): {
	body: string;
	toc: Array<{ id: string; text: string; level: number }>;
} {
	const withDiagrams = applyDiagramFences(body);
	const toc: Array<{ id: string; text: string; level: number }> = [];
	const lines = withDiagrams.split(/\r?\n/);
	let inCodeFence = false;

	const processed = lines.map((line) => {
		if (/^```/.test(line.trim())) {
			inCodeFence = !inCodeFence;
			return line;
		}

		if (inCodeFence) return line;

		const match = /^(#{1,4})\s+(.+)$/.exec(line);
		if (!match) return line;

		const level = match[1].length;
		const text = match[2].trim();
		const id = slugifyHeading(text);

		if (level >= 2 && level <= 4) {
			toc.push({ id, text: text.replace(/`/g, ''), level });
		}

		return `<h${level} id="${id}">${escapeHtml(text)}</h${level}>`;
	});

	return { body: processed.join('\n'), toc };
}

async function loadAllDocs(): Promise<DocItem[]> {
	const definitiveDocsRoot = resolveDocsRoot();
	const { files, cacheKey } = await resolveDocsFilesWithCacheKey(definitiveDocsRoot);

	if (docsCache && docsCache.key === cacheKey) {
		return docsCache.docs;
	}

	const docs = await Promise.all(
		files.map(async (file) => {
			const source = await fs.readFile(file, 'utf8');
			const parsed = matter(source);
			const fileName = path.basename(file);
			const sourcePath = `docs/${fileName}`;
			const manifestEntry: ManifestEntry = docsManifest[sourcePath] ?? {};
			const inferredSection = inferSection(fileName, parsed.content);
			const resolvedSection = resolveSection(manifestEntry.section ?? parsed.data.section, inferredSection);
			const inferred = inferredFrontmatter(fileName, resolvedSection);
			const frontmatter = frontmatterSchema.parse({
				...inferred,
				...manifestEntry,
				...parsed.data,
				section: resolvedSection
			});

			const slug = path.basename(file, '.md').toLowerCase();
			const processed = processMarkdown(parsed.content.trim());
			const body = processed.body;
			const html = await marked.parse(body);
			const tags = [...new Set((frontmatter.tags ?? []).map(normalizeToken).filter(Boolean))];
			const themes = normalizeThemes([...(frontmatter.themes ?? []), ...tags]);
			const audience = frontmatter.audience ?? inferred.audience ?? 'all';
			const order = frontmatter.order ?? manifestEntry.order ?? frontmatter.weight ?? Number.MAX_SAFE_INTEGER;

			return {
				section: resolvedSection,
				slug,
				title: frontmatter.title ?? inferred.title ?? titleize(slug),
				description: frontmatter.description ?? excerptFromBody(parsed.content),
				body,
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

export async function getHomeReadingPaths(): Promise<HomeReadingPath[]> {
	const docs = await loadAllDocs();

	const resolveSteps = (slugs: string[]) =>
		slugs
			.map((slug) => docs.find((doc) => doc.slug === slug))
			.filter((doc): doc is DocItem => Boolean(doc))
			.map((doc) => ({ section: doc.section, slug: doc.slug, title: doc.title }));

	return [
		{
			id: 'learn-language',
			title: 'Learn The Language',
			description: 'Start with orientation, pick up syntax and reference, then explore execution internals.',
			audience: 'language-user',
			steps: resolveSteps(['what_is_mutant', 'language_reference', 'playground_examples', 'bytecode_ir'])
		},
		{
			id: 'understand-security',
			title: 'Understand Security',
			description: 'Move from architecture to policy and operational runbook detail.',
			audience: 'security-analyst',
			steps: resolveSteps([
				'security_lld',
				'security_diagrams',
				'antitamper_probe',
				'sandbox_detection',
				'security_runbook'
			])
		},
		{
			id: 'integrate-tooling',
			title: 'Integrate Tooling',
			description: 'Follow implementation and LSP onboarding paths for production integration work.',
			audience: 'integrator',
			steps: resolveSteps(['implementation_guide', 'lsp_extension_onboarding_60_min', 'lsp_extension_lld'])
		}
	];
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

export async function getDocsQualityReport(): Promise<DocsQualityReport> {
	const docs = await loadAllDocs();
	const sourcePaths = new Set(docs.map((doc) => doc.sourcePath));
	const manifestPaths = Object.keys(docsManifest);
	const manifestMissingFiles = manifestPaths.filter((sourcePath) => !sourcePaths.has(sourcePath));
	const unmappedDocs = docs
		.map((doc) => doc.sourcePath)
		.filter((sourcePath) => !(sourcePath in docsManifest));

	const emptyCounts: Record<DocsQualityIssue['type'], number> = {
		missing_source_meta: 0,
		missing_review_meta: 0,
		weak_description: 0,
		missing_tags: 0,
		missing_themes: 0,
		missing_toc: 0,
		not_in_manifest: 0,
		diagram_transform_mismatch: 0
	};

	let totalDiagramFences = 0;
	let totalRenderedDiagrams = 0;

	const rows = docs
		.map((doc) => {
			const issues: DocsQualityIssue[] = [];
			const diagramFences = (doc.body.match(/```(mermaid|plantuml|puml)\s*\n/gi) ?? []).length;
			const renderedDiagrams = (doc.html.match(/class="diagram-shell"/g) ?? []).length;
			totalDiagramFences += diagramFences;
			totalRenderedDiagrams += renderedDiagrams;

			if (!doc.frontmatter.source_repo || !doc.frontmatter.source_path || !doc.frontmatter.source_ref) {
				issues.push({
					type: 'missing_source_meta',
					message: 'Missing one or more canonical source fields (source_repo/source_path/source_ref).'
				});
			}

			if (!doc.frontmatter.last_reviewed || !doc.frontmatter.review_owner || !doc.frontmatter.freshness_tier) {
				issues.push({
					type: 'missing_review_meta',
					message: 'Missing one or more review fields (last_reviewed/review_owner/freshness_tier).'
				});
			}

			if (!doc.description || doc.description.length < 60) {
				issues.push({
					type: 'weak_description',
					message: 'Description is missing or too short for high-quality discovery surfaces.'
				});
			}

			if (doc.tags.length === 0) {
				issues.push({
					type: 'missing_tags',
					message: 'No tags are assigned.'
				});
			}

			if (doc.themes.length === 0) {
				issues.push({
					type: 'missing_themes',
					message: 'No recognized themes are assigned.'
				});
			}

			if (doc.toc.length === 0) {
				issues.push({
					type: 'missing_toc',
					message: 'No section headings detected (H2-H4), reducing in-page navigability.'
				});
			}

			if (!(doc.sourcePath in docsManifest)) {
				issues.push({
					type: 'not_in_manifest',
					message: 'Document is not explicitly configured in docs manifest overrides.'
				});
			}

			if (diagramFences !== renderedDiagrams) {
				issues.push({
					type: 'diagram_transform_mismatch',
					message: `Diagram fence count (${diagramFences}) does not match rendered diagram count (${renderedDiagrams}).`
				});
			}

			return {
				title: doc.title,
				section: doc.section,
				slug: doc.slug,
				sourcePath: doc.sourcePath,
				audience: doc.audience,
				issues
			} satisfies DocsQualityDocRow;
		})
		.filter((row) => row.issues.length > 0);

	for (const row of rows) {
		for (const issue of row.issues) {
			emptyCounts[issue.type] += 1;
		}
	}

	return {
		generatedAt: new Date().toISOString(),
		totalDocs: docs.length,
		docsWithIssues: rows.length,
		manifestEntries: manifestPaths.length,
		manifestMissingFiles,
		unmappedDocs,
		totalDiagramFences,
		totalRenderedDiagrams,
		issueCounts: emptyCounts,
		rows
	};
}
