import { error } from '@sveltejs/kit';

import { listDocsByTheme, listThemes, toDocSummary } from '$lib/server/content';

export async function load({ params }) {
	const [themes, docs] = await Promise.all([listThemes(), listDocsByTheme(params.theme)]);
	const current = themes.find((theme) => theme.theme === params.theme);

	if (!current) {
		throw error(404, 'Theme not found');
	}

	// Summaries only — this page renders cards, not article bodies.
	return { themes, current, docs: docs.map(toDocSummary) };
}
