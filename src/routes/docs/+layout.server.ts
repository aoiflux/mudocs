import { getDocsTree } from '$lib/server/page-content';

/** The section tree the sidebar renders on every /docs route. */
export async function load() {
	return { tree: await getDocsTree() };
}
