import fs from 'node:fs/promises';
import path from 'node:path';

import fg from 'fast-glob';
import matter from 'gray-matter';
import { marked } from 'marked';
import { z } from 'zod';

import {
	type Audience,
	docsManifest,
	type ManifestEntry,
	type SectionKey
} from '$lib/server/docs-manifest';

const DEFINITIVE_DOCS_ROOT = path.resolve(process.cwd(), '..', 'docs');

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
		readingPath: ['what_is_mutant', 'quick_reference', 'final_summary']
	},
	reference: {
		title: 'Reference',
		description: 'Canonical policies, reference sheets, migration matrices, and source-of-truth documentation.',
		intro: 'Use this section when you need exact policy, source-of-truth fields, or implementation mapping rather than narrative explanation.',
		featuredSlug: 'canonical_sources',
		readingPath: ['canonical_sources', 'quick_reference', 'migration_matrix']
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
		readingPath: ['security_lld', 'security_runbook', 'sandbox_detection']
	},
	tooling: {
		title: 'Tooling',
		description: 'Editor integration, implementation workflow, and operational runbooks.',
		intro: 'This section is for contributors and integrators building around Mutant, especially editor support and maintenance workflows.',
		featuredSlug: 'implementation_guide',
		readingPath: ['implementation_guide', 'manual_update_workflow', 'lsp_extension_onboarding_60_min']
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
		description: 'Environment checks, sandbox signals, and anti-analysis handling.'
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
		| 'not_in_manifest';
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
	issueCounts: Record<DocsQualityIssue['type'], number>;
	rows: DocsQualityDocRow[];
};

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
	const toc: Array<{ id: string; text: string; level: number }> = [];
	const lines = body.split(/\r?\n/);
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
	const files = await fg(path.join(DEFINITIVE_DOCS_ROOT, '*.md').replace(/\\/g, '/'), { dot: false });

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

	return sorted.map((doc) => {
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
			steps: resolveSteps(['what_is_mutant', 'quick_reference', 'bytecode_ir'])
		},
		{
			id: 'understand-security',
			title: 'Understand Security',
			description: 'Move from architecture to policy and operational runbook detail.',
			audience: 'security-analyst',
			steps: resolveSteps(['security_lld', 'sandbox_detection', 'security_runbook'])
		},
		{
			id: 'integrate-tooling',
			title: 'Integrate Tooling',
			description: 'Follow implementation and LSP onboarding paths for production integration work.',
			audience: 'integrator',
			steps: resolveSteps(['implementation_guide', 'manual_update_workflow', 'lsp_extension_onboarding_60_min'])
		}
	];
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

	const emptyCounts: Record<DocsQualityIssue['type'], number> = {
		missing_source_meta: 0,
		missing_review_meta: 0,
		weak_description: 0,
		missing_tags: 0,
		missing_themes: 0,
		missing_toc: 0,
		not_in_manifest: 0
	};

	const rows = docs
		.map((doc) => {
			const issues: DocsQualityIssue[] = [];

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
		issueCounts: emptyCounts,
		rows
	};
}
