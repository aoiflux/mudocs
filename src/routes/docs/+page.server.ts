import { listAllDocs, listSections } from '$lib/server/content';

export async function load() {
	const [sections, docs] = await Promise.all([listSections(), listAllDocs()]);
	return { sections, docs };
}
