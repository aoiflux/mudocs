import { listAllDocs, listSections, toDocSummary } from '$lib/server/content';

export async function load() {
	const [sections, docs] = await Promise.all([listSections(), listAllDocs()]);
	// Summaries only — the index renders cards, not article bodies.
	return { sections, docs: docs.map(toDocSummary) };
}
