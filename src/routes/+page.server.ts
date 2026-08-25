import { getLandingContent } from '$lib/server/page-content';

export async function load() {
	return { landing: await getLandingContent() };
}
