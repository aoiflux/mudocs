import { getExtensionContent } from '$lib/server/page-content';

export async function load() {
	return { extension: await getExtensionContent() };
}
