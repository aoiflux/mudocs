import { error } from '@sveltejs/kit';

import { listDocsByTheme, listThemes } from '$lib/server/content';

export async function load({ params }) {
	const [themes, docs] = await Promise.all([listThemes(), listDocsByTheme(params.theme)]);
	const current = themes.find((theme) => theme.theme === params.theme);

	if (!current) {
		throw error(404, 'Theme not found');
	}

	return { themes, current, docs };
}
