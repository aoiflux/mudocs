import { error } from '@sveltejs/kit';
import { listAllDocs } from '$lib/server/content';
import { loadWorkshopModule, workshopModuleIds } from '$lib/server/workshop';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () => workshopModuleIds().map((module) => ({ module }));

export const load: PageServerLoad = async ({ params }) => {
	const module = await loadWorkshopModule(params.module);
	if (!module) throw error(404, 'Workshop module not found');

	const docs = await listAllDocs();
	const relatedDocs = module.relatedDocs.map((slug) => {
		const doc = docs.find((d) => d.slug === slug);
		if (!doc) throw new Error(`workshop module ${module.id}: relatedDocs names ${slug}, which is not a doc`);
		return { href: `/docs/${doc.section}/${doc.slug}`, title: doc.title };
	});

	return { module, relatedDocs };
};
