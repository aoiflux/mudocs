import { getHomeReadingPaths, listSections, listThemes } from '$lib/server/content';

export async function load() {
	const [sections, readingPaths, themes] = await Promise.all([
		listSections(),
		getHomeReadingPaths(),
		listThemes()
	]);

	return {
		sections,
		readingPaths,
		themes
	};
}
