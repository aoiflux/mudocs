import { error } from '@sveltejs/kit';

import { getSectionLanding, listDocsBySection, listSections, toDocSummary } from '$lib/server/content';

export async function load({ params }) {
	const [sections, docs, landing] = await Promise.all([
		listSections(),
		listDocsBySection(params.section),
		getSectionLanding(params.section)
	]);
	const current = sections.find((s) => s.section === params.section);

	if (!current || !landing) {
		throw error(404, 'Section not found');
	}

	return {
		sections,
		current,
		// Summaries only — this page renders cards and lists, never article bodies.
		landing: {
			...landing,
			featuredDoc: landing.featuredDoc ? toDocSummary(landing.featuredDoc) : null,
			additionalDocs: landing.additionalDocs.map(toDocSummary)
		},
		docs: docs.map(toDocSummary)
	};
}
