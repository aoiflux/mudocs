import { listAllDocs, listSections, listThemes } from '$lib/server/content';
import { SITE } from '$lib/site';

/**
 * Generated from the live corpus, so it regenerates on every build without a
 * separate script. Priorities follow the redesign brief's map.
 */

type Entry = { path: string; priority: number };

export const prerender = true;

export async function GET() {
	const [docs, sections, themes] = await Promise.all([listAllDocs(), listSections(), listThemes()]);

	const entries: Entry[] = [
		{ path: '/', priority: 1.0 },
		{ path: '/docs', priority: 0.9 },
		// Module pages stay out until they publish; they carry noindex meanwhile.
		{ path: '/workshop', priority: 0.9 },
		{ path: '/workshop/language', priority: 0.8 },
		{ path: '/extension', priority: 0.9 },
		{ path: '/playground', priority: 0.8 },
		{ path: '/showcase', priority: 0.7 },
		{ path: '/about', priority: 0.5 },
		{ path: '/docs/themes', priority: 0.5 },
		...sections.map((section) => ({ path: `/docs/${section.section}`, priority: 0.8 })),
		...docs.map((doc) => ({ path: `/docs/${doc.section}/${doc.slug}`, priority: 0.7 })),
		...themes.map((theme) => ({ path: `/docs/themes/${theme.theme}`, priority: 0.4 }))
	];

	// /search returns query-dependent results, so it does not belong in an index.
	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...entries.map((entry) =>
			[
				'\t<url>',
				`\t\t<loc>${new URL(entry.path, SITE.url).href}</loc>`,
				'\t\t<changefreq>daily</changefreq>',
				`\t\t<priority>${entry.priority.toFixed(1)}</priority>`,
				'\t</url>'
			].join('\n')
		),
		'</urlset>',
		''
	].join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}
