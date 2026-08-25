import { getShowcase } from '$lib/server/page-content';

export async function load() {
	return { showcase: await getShowcase() };
}
