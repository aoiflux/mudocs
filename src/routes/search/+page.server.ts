import type { Audience } from '$lib/server/docs-manifest';
import { listSections, listThemes, searchDocs } from '$lib/server/content';

const audienceValues: Audience[] = [
	'all',
	'language-user',
	'security-analyst',
	'platform-engineer',
	'integrator'
];

export async function load({ url }) {
	const query = (url.searchParams.get('q') ?? '').trim();
	const section = (url.searchParams.get('section') ?? '').trim();
	const theme = (url.searchParams.get('theme') ?? '').trim();
	const focus = url.searchParams.get('focus') === '1';
	const audienceCandidate = (url.searchParams.get('audience') ?? '').trim() as Audience;
	const audience = audienceValues.includes(audienceCandidate) ? audienceCandidate : undefined;

	const [sections, themes, results] = await Promise.all([
		listSections(),
		listThemes(),
		query
			? searchDocs({
				query,
				section: section || undefined,
				theme: theme || undefined,
				audience,
				limit: 80
			})
			: Promise.resolve([])
	]);

	return {
		query,
		focus,
		section,
		theme,
		audience: audience ?? '',
		sections,
		themes,
		results,
		audiences: audienceValues
	};
}
