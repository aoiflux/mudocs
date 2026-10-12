/**
 * The workshop's path, in teaching order: the DFRWS APAC 2026 session plan
 * (introduction, artefact modelling, timestomping, malware in ads, registry)
 * framed by the language course before it and the QUILLDROP case after it.
 *
 * A module is `available` only once every program, output and builtin it shows
 * traces to a recorded run at the pinned Mutant release. Until then it is listed
 * as in preparation, and its page, if it has one, is a noindex preview that
 * the path map does not link.
 */

export type ModuleStatus = 'available' | 'in-preparation';

export type WorkshopModule = {
	id: string;
	/** Short label on the path map: 0, L, 1..4, T, C. */
	mark: string;
	title: string;
	summary: string;
	/** Session minutes in the workshop plan, where the plan sets them. */
	minutes?: number;
	status: ModuleStatus;
	href?: string;
};

export const WORKSHOP_MODULES: readonly WorkshopModule[] = [
	{
		id: 'intro',
		mark: '0',
		title: 'Introduction',
		summary: 'Why a forensics language, and what a Mutant program looks like end to end.',
		minutes: 10,
		status: 'in-preparation'
	},
	{
		id: 'language',
		mark: 'L',
		title: 'Intro to the language',
		summary:
			'Eight short sections: bindings, value and error pairs, closures, loops, higher-order functions, control flow, structs and enums, macros.',
		status: 'available',
		href: '/workshop/language'
	},
	{
		id: 'artefact-modelling',
		mark: '1',
		title: 'Artefact modelling',
		summary: 'Turning raw evidence into typed records a pipeline can reason about.',
		minutes: 20,
		status: 'in-preparation'
	},
	{
		id: 'timestomping',
		mark: '2',
		title: 'Timestomping',
		summary: 'Two clocks in every MFT record, and the test that catches a file whose times were rewritten.',
		minutes: 20,
		status: 'in-preparation'
	},
	{
		id: 'malvertising',
		mark: '3',
		title: 'Malware in ads',
		summary: 'Following a redirect chain through browser history, and the cookies each hop left behind.',
		minutes: 20,
		status: 'in-preparation'
	},
	{
		id: 'registry-persistence',
		mark: '4',
		title: 'Registry persistence',
		summary: 'Run and RunOnce keys: what Windows starts at logon, and how to spot the entry that does not belong.',
		minutes: 20,
		status: 'in-preparation',
		href: '/workshop/registry-persistence'
	},
	{
		id: 'triage',
		mark: 'T',
		title: 'Triage toolkit',
		summary: 'Small, input-free snippets for indicators, encodings and fuzzy matching, run live in the browser.',
		status: 'in-preparation'
	},
	{
		id: 'quilldrop',
		mark: 'C',
		title: 'Capstone: QUILLDROP',
		summary: 'One case, start to finish, using every technique on the path.',
		status: 'in-preparation'
	}
];
