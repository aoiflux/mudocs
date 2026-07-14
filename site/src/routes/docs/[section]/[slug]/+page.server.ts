import { error } from '@sveltejs/kit';

import { getDoc } from '$lib/server/content';

export async function load({ params }) {
	const doc = await getDoc(params.section, params.slug);

	if (!doc) {
		throw error(404, 'Document not found');
	}

	return { doc };
}
