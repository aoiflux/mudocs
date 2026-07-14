import { listThemes } from '$lib/server/content';

export async function load() {
	const themes = await listThemes();
	return { themes };
}
