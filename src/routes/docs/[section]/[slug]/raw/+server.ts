import { error } from '@sveltejs/kit';

import { getDoc } from '$lib/server/content';

/** The document's source markdown, fetched on demand by the article's Source tab. */
export async function GET({ params }) {
	const doc = await getDoc(params.section, params.slug);

	if (!doc) {
		throw error(404, 'Document not found');
	}

	return new Response(doc.raw, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=300'
		}
	});
}
