import { getAboutPage } from '$lib/server/content';

export async function load() {
	const about = await getAboutPage();
	return { about };
}
