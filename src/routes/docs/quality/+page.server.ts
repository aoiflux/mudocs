import { getDocsQualityReport } from '$lib/server/content';

export async function load() {
	const report = await getDocsQualityReport();
	return { report };
}
