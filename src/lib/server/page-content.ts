/**
 * Page content derived from the markdown corpus.
 *
 * The redesign brief requires every product claim on the marketing pages to come
 * out of docs/*.md rather than being written here. These helpers read the docs
 * that content.ts has already loaded and cached, pull out the headings and
 * opening prose, and hand the routes plain data. Summaries are condensed but
 * never invented; each block also carries the sourcePath it came from so the
 * page can show its own provenance the way the artboards do.
 */

import { listAllDocs, listSections, type DocItem } from './content';
import { highlightFences } from './highlight';
import type { SectionKey } from './docs-manifest';

// ---------------------------------------------------------------------------
// Markdown helpers
// ---------------------------------------------------------------------------

export type MarkdownSection = {
	title: string;
	/** Everything under the heading, up to the next one, still as markdown. */
	markdown: string;
};

/** Split a document's raw markdown into its `## ` sections. */
function splitSections(raw: string): MarkdownSection[] {
	const sections: MarkdownSection[] = [];
	const lines = raw.split(/\r?\n/);
	let current: MarkdownSection | null = null;
	let inFence = false;

	for (const line of lines) {
		if (line.trim().startsWith('```')) inFence = !inFence;

		const heading = inFence ? null : /^##\s+(.+)$/.exec(line);
		if (heading) {
			if (current) sections.push(current);
			current = { title: heading[1].trim(), markdown: '' };
			continue;
		}
		if (current) current.markdown += line + '\n';
	}

	if (current) sections.push(current);
	return sections;
}

/** Strip markdown down to readable prose. */
function plainText(markdown: string): string {
	return markdown
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/^\s*[-*+]\s+/gm, '')
		.replace(/[*_>#]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/** The first prose paragraph of a markdown block, ignoring lists and fences. */
function firstParagraph(markdown: string): string {
	const blocks = markdown.split(/\r?\n\s*\r?\n/);
	const candidates: string[] = [];
	for (const block of blocks) {
		const trimmed = block.trim();
		if (!trimmed) continue;
		if (trimmed.startsWith('```') || trimmed.startsWith('|')) continue;
		const text = plainText(trimmed);
		if (text.length > 24) candidates.push(text);
	}

	// A paragraph ending on a colon only introduces whatever follows it, so
	// prefer a self-contained one whenever the block offers any.
	return candidates.find((text) => !text.endsWith(':')) ?? candidates[0] ?? plainText(markdown);
}

/** Trim prose to whole sentences, at most `max` characters. */
function condense(text: string, max = 220): string {
	const trimmed = trimToLength(text, max);
	// A lead-in ending on a colon promises a list the summary does not carry.
	// Closing the sentence keeps it faithful instead of leaving it hanging.
	return trimmed.replace(/\s*:\s*$/, '.');
}

function trimToLength(text: string, max: number): string {
	if (text.length <= max) return text;
	const cut = text.slice(0, max);
	const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
	if (lastStop > max * 0.5) return cut.slice(0, lastStop + 1);
	return cut.replace(/\s+\S*$/, '') + '…';
}

/** Strip a leading "3. " / "12. " numbering off a doc's section heading. */
function unnumber(title: string): string {
	return title.replace(/^\d+\.\s*/, '');
}

function bulletsOf(markdown: string, limit: number): string[] {
	const out: string[] = [];
	let inFence = false;
	for (const line of markdown.split(/\r?\n/)) {
		if (line.trim().startsWith('```')) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		const bullet = /^\s*[-*+]\s+(.+)$/.exec(line);
		if (bullet) {
			out.push(plainText(bullet[1]));
			if (out.length >= limit) break;
		}
	}
	return out;
}

/**
 * The first substantial code fence in a document, highlighted, for the
 * showcase plate. Diagram fences are skipped — they render as figures, not
 * code, and carry nothing readable at thumbnail size.
 */
async function firstCodeFence(raw: string, maxLines = 10): Promise<string | null> {
	const pattern = /```([A-Za-z0-9_+-]*)[^\n]*\n([\s\S]*?)```/g;
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(raw)) !== null) {
		const lang = (match[1] ?? '').toLowerCase();
		if (lang === 'mermaid' || lang === 'plantuml' || lang === 'puml') continue;

		const body = match[2].replace(/\s+$/, '');
		const lines = body.split('\n');
		if (lines.length < 2) continue;

		const clipped = lines.slice(0, maxLines).join('\n');
		// Round-trip through the same highlighter the doc pages use.
		return await highlightFences('```' + lang + '\n' + clipped + '\n```');
	}

	return null;
}

function fencesOf(raw: string): { code: number; diagrams: number } {
	const all = raw.match(/```([a-zA-Z]*)\s*\n/g) ?? [];
	let code = 0;
	let diagrams = 0;
	for (let i = 0; i < all.length; i += 2) {
		const lang = all[i].replace(/```/, '').trim().toLowerCase();
		if (lang === 'mermaid' || lang === 'plantuml' || lang === 'puml') diagrams += 1;
		else code += 1;
	}
	return { code, diagrams };
}

/**
 * A human-readable description of a doc section.
 *
 * The LLD chapters open with a "Core file:" pointer and a bare label line
 * ("Diagnostics sources:"), so the first paragraph is metadata rather than
 * prose. Walk past those and return the first block that actually says
 * something — falling back to its bullets when the section leads with a list.
 */
/**
 * The first block of real prose in a chapter, or an empty string when the
 * chapter holds nothing but pointers, tables and code. Callers that have a
 * better fallback than "whatever the first paragraph happens to be" should
 * use this and supply their own.
 */
function prose(markdown: string): string {
	const blocks = markdown.split(/\r?\n\s*\r?\n/);

	for (const block of blocks) {
		const trimmed = block.trim();
		if (!trimmed) continue;
		if (trimmed.startsWith('```') || trimmed.startsWith('|') || trimmed.startsWith('#')) continue;

		// Chapter-opening pointers: an optional label line followed by nothing but a
		// link to the implementation ("Core file:", "Teaching metadata source:").
		if (/^([^\n]*:[ \t]*\n)?[ \t]*\[[^\]]+\]\([^)]+\)[ \t]*$/.test(trimmed)) continue;

		const isList = /^\s*[-*+]\s+/m.test(trimmed);
		if (isList) {
			// Some chapters open with a one-bullet list holding only a source-file
			// link, which reduces to a bare path. Keep bullets that read as prose.
			const bullets = bulletsOf(trimmed, 4).filter(
				(bullet) => bullet.includes(' ') && bullet.length >= 12
			);
			if (bullets.length) return bullets.slice(0, 2).join(' · ');
			continue;
		}

		const text = plainText(trimmed);
		// A bare label ("Behavior model:") introduces the next block, it is not prose.
		if (text.endsWith(':') || text.length < 40) continue;
		return text;
	}

	return '';
}

function describe(markdown: string): string {
	return prose(markdown) || firstParagraph(markdown);
}

export function docHref(doc: Pick<DocItem, 'section' | 'slug'>): string {
	return `/docs/${doc.section}/${doc.slug}`;
}

function byFile(docs: DocItem[], fileName: string): DocItem | undefined {
	return docs.find((doc) => doc.sourcePath === `docs/${fileName}`);
}

// ---------------------------------------------------------------------------
// 2a — Landing
// ---------------------------------------------------------------------------

export type ValueProp = {
	title: string;
	body: string;
	href: string;
};

export type ToolCard = {
	title: string;
	description: string;
	href: string;
	count: number;
	/** Titles of the first few docs in the section, so the card shows its contents. */
	docs: Array<{ title: string; href: string }>;
};

export type LandingContent = {
	hero: {
		kicker: string;
		title: string;
		lede: string;
		sourcePath: string | null;
		href: string | null;
	};
	whatIs: {
		title: string;
		summary: string;
		bullets: string[];
		sourcePath: string | null;
		href: string | null;
	};
	pipeline: string[];
	valueProps: ValueProp[];
	tools: ToolCard[];
	extension: {
		title: string;
		summary: string;
		sourcePath: string | null;
		href: string | null;
	};
	totalDocs: number;
};

export async function getLandingContent(): Promise<LandingContent> {
	const [docs, sections] = await Promise.all([listAllDocs(), listSections()]);

	const whatIsDoc = byFile(docs, 'WHAT_IS_MUTANT.md');
	const extensionDoc = byFile(docs, 'LSP_EXTENSION_ONBOARDING_60_MIN.md');
	const whatIsSections = whatIsDoc ? splitSections(whatIsDoc.raw) : [];

	// Everything above the first "## " is the doc's own opening — the hero reads
	// from there so the headline is the corpus's own description of the language.
	const opening = whatIsDoc ? whatIsDoc.raw.split(/^##\s+/m)[0] : '';
	const openingBlocks = opening
		.split(/\r?\n\s*\r?\n/)
		.map((block) => block.trim())
		.filter((block) => block && !block.startsWith('#'));

	const leadSentence = openingBlocks[0] ? plainText(openingBlocks[0]) : '';
	const secondBlock = openingBlocks[1] ? plainText(openingBlocks[1]) : '';

	// The doc opens "Mutant is a programming language built for practical security
	// work, forensic automation, and cross-platform analysis tooling." That whole
	// sentence is five lines at display size, so the headline takes the first
	// clause and the full sentence becomes the lede beneath it.
	const builtFor = /built for ([^,.]+)/i.exec(leadSentence);
	const heroTitle = builtFor ? 'Built for ' + builtFor[1].trim() : (whatIsDoc?.title ?? 'Mutant');

	const shortVersion = whatIsSections.find((section) => /short version/i.test(section.title));

	const valuePropTitles = [
		'What you can do with it',
		'Why Mutant exists',
		'The security model',
		'Practical use cases'
	];
	const valueProps: ValueProp[] = valuePropTitles
		.map((wanted) => whatIsSections.find((section) => section.title.toLowerCase() === wanted.toLowerCase()))
		.filter((section): section is MarkdownSection => Boolean(section))
		.map((section) => ({
			title: section.title,
			body: condense(describe(section.markdown), 150),
			href: whatIsDoc ? `${docHref(whatIsDoc)}#${slugOf(section.title)}` : '/docs'
		}));

	// Fall back to whatever sections the doc does have, so the band never empties
	// out if the corpus is reorganised upstream.
	if (valueProps.length < 4) {
		for (const section of whatIsSections) {
			if (valueProps.length >= 4) break;
			if (valueProps.some((prop) => prop.title === section.title)) continue;
			valueProps.push({
				title: section.title,
				body: condense(describe(section.markdown), 150),
				href: whatIsDoc ? `${docHref(whatIsDoc)}#${slugOf(section.title)}` : '/docs'
			});
		}
	}

	const tools: ToolCard[] = sections.map((section) => ({
		title: section.title,
		description: condense(section.description, 110),
		href: `/docs/${section.section}`,
		count: section.count,
		// What is actually in the section. The card used to show a hatched
		// placeholder here, which told the reader nothing.
		docs: docs
			.filter((doc) => doc.section === section.section)
			.slice(0, 3)
			.map((doc) => ({ title: doc.title, href: docHref(doc) }))
	}));

	const extensionSections = extensionDoc ? splitSections(extensionDoc.raw) : [];
	const architecture = extensionSections.find((section) => /architecture map/i.test(section.title));

	return {
		hero: {
			kicker: 'A language that mutates its own bytecode',
			title: heroTitle,
			lede: condense(leadSentence, 240),
			sourcePath: whatIsDoc?.sourcePath ?? null,
			href: whatIsDoc ? docHref(whatIsDoc) : null
		},
		whatIs: {
			title: whatIsDoc?.title ?? 'What is Mutant',
			summary: condense(secondBlock || leadSentence, 260),
			bullets: shortVersion ? bulletsOf(shortVersion.markdown, 3).map((b) => condense(b, 96)) : [],
			sourcePath: whatIsDoc?.sourcePath ?? null,
			href: whatIsDoc ? docHref(whatIsDoc) : null
		},
		// The compile path exactly as docs/BYTECODE_IR.md §1 draws it. That
		// document is explicit that nothing sits between the AST and the byte
		// stream — "the compiler walks the AST and emits bytes directly" — so
		// there is no IR stage to name here, and the repo has no ir/ package.
		pipeline: ['AST', 'BYTECODE', 'VM'],
		valueProps: valueProps.slice(0, 4),
		tools,
		extension: {
			title: 'Mutant for VSCode',
			summary: condense(
				(architecture ? prose(architecture.markdown) : '') || (extensionDoc?.description ?? ''),
				180
			),
			sourcePath: extensionDoc?.sourcePath ?? null,
			href: extensionDoc ? docHref(extensionDoc) : null
		},
		totalDocs: docs.length
	};
}

/** Matches content.ts's slugifyHeading so in-page anchors actually resolve. */
function slugOf(value: string): string {
	return value
		.toLowerCase()
		.replace(/<[^>]+>/g, '')
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-');
}

// ---------------------------------------------------------------------------
// 2d — Showcase
// ---------------------------------------------------------------------------

export type ShowcaseItem = {
	section: SectionKey;
	sectionTitle: string;
	slug: string;
	title: string;
	description: string;
	href: string;
	sourcePath: string;
	tags: string[];
	diagrams: number;
	codeBlocks: number;
	/** Highlighted HTML for the first code fence, or null when the doc has none. */
	excerpt: string | null;
	/** Section headings, shown on the plate for docs that carry no code at all. */
	outline: string[];
};

export type ShowcaseContent = {
	featured: ShowcaseItem | null;
	secondary: ShowcaseItem[];
	mini: ShowcaseItem[];
	filters: Array<{ key: string; label: string; count: number }>;
	all: ShowcaseItem[];
};

/**
 * "Built with Mutant" — the docs that actually carry worked examples. A doc
 * earns a slot by shipping diagrams or code, so the grid tracks the corpus
 * rather than a hand-kept list.
 */
export async function getShowcase(): Promise<ShowcaseContent> {
	const docs = await listAllDocs();

	const ranked = docs
		.map((doc) => ({ doc, ...fencesOf(doc.raw) }))
		.filter((entry) => entry.diagrams > 0 || entry.code > 0)
		.sort((a, b) => b.diagrams * 3 + b.code - (a.diagrams * 3 + a.code));

	// Every item gets its plate content, not just the top one: the filter chips
	// re-pick the featured document on the client, so any of these can end up
	// in the plate. Excerpts are cheap here — the docs themselves are cached and
	// each fence is at most ten lines.
	const scored: ShowcaseItem[] = await Promise.all(
		ranked.map(async ({ doc, code, diagrams }) => ({
			section: doc.section,
			sectionTitle: doc.sectionTitle,
			slug: doc.slug,
			title: doc.title,
			description: condense(doc.description, 180),
			href: docHref(doc),
			sourcePath: doc.sourcePath,
			tags: doc.tags.slice(0, 3),
			diagrams,
			codeBlocks: code,
			excerpt: await firstCodeFence(doc.raw),
			// A diagram-only document has no fence to show; its chapter list says
			// what it covers just as well.
			outline: doc.toc
				.filter((entry) => entry.level === 2)
				.map((entry) => unnumber(entry.text))
				.slice(0, 7)
		}))
	);

	// The artboard annotates the featured plate "from DETAILED_EXPLANATIONS.md", but
	// that document carries no code or diagram fences, so it is not a showcase entry
	// at all. Feature the document with the most worked material instead — the sort
	// above ranks by weight, counting a diagram as worth three code blocks.
	const featured = scored[0] ?? null;
	const rest = scored.filter((item) => item !== featured);

	const counts = new Map<string, number>();
	for (const item of scored) counts.set(item.section, (counts.get(item.section) ?? 0) + 1);

	const filters = [
		{ key: 'all', label: 'All', count: scored.length },
		...[...counts.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([key, count]) => ({
				key,
				label: scored.find((item) => item.section === key)?.sectionTitle ?? key,
				count
			}))
	];

	return {
		featured,
		secondary: rest.slice(0, 3),
		mini: rest.slice(3, 12),
		filters,
		all: scored
	};
}

// ---------------------------------------------------------------------------
// 2e — Extension
// ---------------------------------------------------------------------------

export type ExtensionContent = {
	title: string;
	lede: string;
	steps: Array<{ title: string; body: string }>;
	features: Array<{ title: string; body: string; href: string }>;
	onboarding: { title: string; href: string; sourcePath: string } | null;
	lld: { title: string; href: string; sourcePath: string } | null;
};

export async function getExtensionContent(): Promise<ExtensionContent> {
	const docs = await listAllDocs();
	const onboardingDoc = byFile(docs, 'LSP_EXTENSION_ONBOARDING_60_MIN.md');
	const lldDoc = byFile(docs, 'LSP_EXTENSION_LLD.md');

	const onboardingSections = onboardingDoc ? splitSections(onboardingDoc.raw) : [];
	const lldSections = lldDoc ? splitSections(lldDoc.raw) : [];

	// The three-step install the artboard draws, taken from the onboarding
	// guide's own prerequisites -> commands -> hands-on progression.
	const wantedSteps = [/prerequisites/i, /golden path/i, /hands-on|exercises/i];
	const steps = wantedSteps
		.map((pattern) => onboardingSections.find((section) => pattern.test(section.title)))
		.filter((section): section is MarkdownSection => Boolean(section))
		.map((section) => ({
			title: unnumber(section.title),
			body: condense(describe(section.markdown), 150)
		}));

	// Four capability areas, from the LLD's own chapter titles.
	const wantedFeatures = [
		/diagnostics/i,
		/formatting/i,
		/hover|signature/i,
		/semantic tokens/i
	];
	const features = wantedFeatures
		.map((pattern) => lldSections.find((section) => pattern.test(section.title)))
		.filter((section): section is MarkdownSection => Boolean(section))
		.map((section) => ({
			title: unnumber(section.title),
			body: condense(describe(section.markdown), 150),
			href: lldDoc ? `${docHref(lldDoc)}#${slugOf(section.title)}` : '/docs/tooling'
		}));

	const outcomes = onboardingSections.find((section) => /outcomes/i.test(section.title));

	return {
		title: 'Mutant for VSCode',
		lede: condense(
			outcomes ? bulletsOf(outcomes.markdown, 2).join(' ') : (onboardingDoc?.description ?? ''),
			230
		),
		steps,
		features,
		onboarding: onboardingDoc
			? { title: onboardingDoc.title, href: docHref(onboardingDoc), sourcePath: onboardingDoc.sourcePath }
			: null,
		lld: lldDoc ? { title: lldDoc.title, href: docHref(lldDoc), sourcePath: lldDoc.sourcePath } : null
	};
}

// ---------------------------------------------------------------------------
// Docs sidebar — the section tree every /docs/** route shares
// ---------------------------------------------------------------------------

export type SidebarSection = {
	section: SectionKey;
	title: string;
	href: string;
	docs: Array<{ slug: string; title: string; href: string }>;
};

export async function getDocsTree(): Promise<SidebarSection[]> {
	const [docs, sections] = await Promise.all([listAllDocs(), listSections()]);

	return sections.map((section) => ({
		section: section.section,
		title: section.title,
		href: `/docs/${section.section}`,
		docs: docs
			.filter((doc) => doc.section === section.section)
			.map((doc) => ({ slug: doc.slug, title: doc.title, href: docHref(doc) }))
	}));
}
