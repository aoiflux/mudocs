import { error } from '@sveltejs/kit';

import { getSectionLanding, listDocsBySection, listSections } from '$lib/server/content';

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
		landing,
		docs
	};
}
