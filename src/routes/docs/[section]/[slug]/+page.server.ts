import { error } from '@sveltejs/kit';

import { getDoc } from '$lib/server/content';

export async function load({ params }) {
	const doc = await getDoc(params.section, params.slug);

	if (!doc) {
		throw error(404, 'Document not found');
	}

	// `raw` is only needed by the Source tab, and for a doc like BYTECODE_IR it is
	// another 59 KB in the payload. The tab fetches it from ./raw on first open.
	const { raw: _raw, ...clientDoc } = doc;
	return { doc: clientDoc };
}
