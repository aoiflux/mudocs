/**
 * Module 3 · Malware in ads. How the browser got to the download (the
 * redirect chain in Chrome's History, ad_redirects.mut) and which sites knew
 * it was there (the cookie jar, ad_cookies.mut). Both read the QUILLDROP
 * corpus, so both outputs are simulated; the scenes' visits and cookies are
 * an illustration.
 */
import type { WorkshopModuleSpec } from '../schema';
import { SIMULATED } from './shared/quilldrop-sim.ts';
import { MALVERTISING_FILM } from './shared/films.ts';

export const spec: WorkshopModuleSpec = {
	id: 'malvertising',
	pin: 'v2.6.0',
	title: 'Malware in ads',
	lede: 'The user clicked one ad. Everything after that click happened without them: the browser’s own records say how.',
	relatedDocs: ['capability_reference'],
	tiers: [
		{
			id: 'beginner',
			title: 'The redirect chain',
			summary:
				'Walk Chrome’s visits back from the download, one from_visit at a time, and mark the hops a server sent.',
			stages: [
				{
					kind: 'hook',
					id: 'hook',
					title: 'One click, many hops',
					paragraphs: [
						'Malicious advertising rarely needs the user to do more than click. The ad network’s servers pass the browser along, hop by hop, until it lands on a download.',
						'Chrome records every one of those visits, and for each one, the visit that led to it.'
					]
				},
				MALVERTISING_FILM,
				{
					kind: 'concept',
					id: 'chain',
					title: 'Visits, linked backwards',
					scene: 'RedirectChain',
					values: {
						visits: [
							{
								id: 1,
								fromVisit: 0,
								url: 'https://news-site.example/story',
								transition: 805306368,
								note: 'the page the user was reading'
							},
							{
								id: 2,
								fromVisit: 1,
								url: 'https://ad-network.example/click?c=7',
								transition: 268435456,
								note: 'the ad they clicked'
							},
							{
								id: 3,
								fromVisit: 2,
								url: 'https://tracker.example/r',
								transition: 2147483648
							},
							{
								id: 4,
								fromVisit: 3,
								url: 'https://download-host.example/invoice.pdf.exe',
								transition: 2684354560
							}
						],
						bits: [
							{ name: 'CHAIN_START', value: 268435456 },
							{ name: 'CHAIN_END', value: 536870912 },
							{ name: 'SERVER_REDIRECT', value: 2147483648 }
						]
					},
					intro: 'Four made-up visits, the way Chrome’s History database links them.',
					steps: [
						{
							label: 'Visits',
							text: 'Each row of the visits table is one page the browser loaded.',
							focus: 'visits'
						},
						{
							label: 'from_visit',
							text: 'Each visit names the visit that led to it. Follow from_visit back from the download and you have the chain.',
							focus: 'from-visit'
						},
						{
							label: 'Transition bits',
							text: 'transition packs flags into one number. Its high bit, 2147483648, marks a hop a server redirected: a hop the user never clicked.',
							focus: 'bits'
						}
					],
					sources: [
						{
							kind: 'mutant-file',
							ref: 'examples/workshop/ad_redirects.mut',
							note: 'The query, and the high bit, line 7.'
						},
						{
							kind: 'mutant-file',
							ref: 'examples/workshop/RUN_SHEET_2H.md',
							note: 'The redirect chain deep dive.'
						},
						{
							kind: 'external-spec',
							ref: 'https://source.chromium.org/chromium/chromium/src/+/main:ui/base/page_transition_types.h',
							note: 'Chromium’s transition qualifier bits.'
						}
					]
				},
				{
					kind: 'walkthrough',
					id: 'redirects',
					title: 'Walk it with Mutant',
					program: 'examples/workshop/ad_redirects.mut',
					simulated: SIMULATED['ad_redirects'],
					steps: [
						{
							lines: [1, 7],
							output: [1, 1],
							note: 'The History database, one SQL query joining visits to their URLs, and the server-redirect bit. Mutant has no hex literals, so the bit is written in decimal.'
						},
						{
							lines: [9, 14],
							note: 'sqlite_query copies the database before reading it, so the original is never modified. The rows are indexed by visit id.'
						},
						{
							lines: [15, 16],
							note: 'Start at the last visit and keep going while there is one. The first visit’s from_visit points at nothing, which ends the walk.'
						},
						{
							lines: [17, 18],
							output: [2, 6],
							note: 'Chrome stores visit times as WebKit timestamps; timestamp_normalize turns them into ISO time. Mutant’s & binds before >, as in Go, so the test reads (transition & server_redirect) > 0.'
						},
						{ lines: [19, 21], note: 'Step back to the visit that led here.' }
					]
				},
				{
					kind: 'build',
					id: 'build',
					title: 'Build it',
					prompt: 'Put the walk in order. One step does not belong.',
					blocks: [
						{
							id: 'query',
							label: 'Query the visits and their URLs',
							builtins: ['sqlite_query']
						},
						{ id: 'index', label: 'Index the visits by id' },
						{ id: 'start', label: 'Start at the last visit' },
						{
							id: 'time',
							label: 'Convert the visit time to ISO',
							builtins: ['timestamp_normalize']
						},
						{
							id: 'back',
							label: 'Step back to its from_visit',
							builtins: ['is_null']
						},
						{ id: 'sort', label: 'Sort the visits by URL' }
					],
					answer: ['query', 'index', 'start', 'time', 'back'],
					explain: 'The chain is in the links between visits, not in their order on the page.'
				},
				{
					kind: 'check',
					id: 'check',
					title: 'Check yourself',
					questions: [
						{
							id: 'from-visit',
							prompt: 'Which column links a visit to the one that led to it?',
							choices: ['transition', 'from_visit', 'visit_time'],
							answer: 1,
							explain: 'from_visit is the id of the previous visit in the chain.'
						},
						{
							id: 'bit',
							prompt: 'Why is the server-redirect bit written as 2147483648?',
							choices: ['Mutant has no hex literals', 'Chrome stores it in decimal', 'It is a timestamp'],
							answer: 0,
							explain: 'It is 0x80000000; Mutant takes it in decimal.'
						},
						{
							id: 'precedence',
							prompt: 'How does Mutant read transition & server_redirect > 0?',
							choices: [
								'(transition & server_redirect) > 0',
								'transition & (server_redirect > 0)',
								'It is a syntax error'
							],
							answer: 0,
							explain: 'Mutant’s bitwise precedence is Go’s: & binds as tightly as *, before any comparison.'
						}
					]
				}
			]
		},
		{
			id: 'intermediate',
			title: 'The cookie jar',
			summary: 'Which sites left a cookie, and which of them the user never visited.',
			stages: [
				{
					kind: 'concept',
					id: 'jar',
					title: 'Cookies without a visit',
					scene: 'CookieJar',
					values: {
						visited: ['news-site.example', 'ad-network.example', 'download-host.example'],
						cookies: [
							{ site: 'news-site.example', name: 'session' },
							{ site: 'tracker.example', name: 'uid' },
							{ site: 'ad-network.example', name: 'clk' },
							{ site: 'metrics.example', name: '_id' }
						]
					},
					intro: 'Made-up sites: the ones the history visited, beside the ones that left a cookie.',
					steps: [
						{
							label: 'The history',
							text: 'The sites the browser visited, by registrable domain.',
							focus: 'visits'
						},
						{
							label: 'The jar',
							text: 'The sites that set a cookie.',
							focus: 'cookies'
						},
						{
							label: 'Never visited',
							text: 'A cookie from a site the history never visited came from something embedded in a page the user did visit: an ad, a tracker.',
							focus: 'orphans'
						}
					],
					sources: [
						{ kind: 'mutant-file', ref: 'examples/workshop/ad_cookies.mut' },
						{
							kind: 'mutant-file',
							ref: 'examples/workshop/RUN_SHEET_2H.md',
							note: 'The cookie jar deep dive.'
						},
						{
							kind: 'builtin-metadata',
							ref: 'browser_cookies',
							note: 'Chromium cookie values are encrypted; host and name are not.'
						}
					]
				},
				{
					kind: 'walkthrough',
					id: 'cookies',
					title: 'Compare them with Mutant',
					program: 'examples/workshop/ad_cookies.mut',
					simulated: SIMULATED['ad_cookies'],
					steps: [
						{
							lines: [1, 7],
							output: [1, 1],
							note: 'Chrome’s profile folder, and a check that its Cookies database is there.'
						},
						{
							lines: [8, 9],
							note: 'browser_history and browser_cookies each parse a database into entries. Cookie values are encrypted by the OS; the host and name are not, and they are all this question needs.'
						},
						{
							lines: [10, 13],
							note: 'Build a set of visited sites. domain_extract takes the host from a URL; tld_extract’s etld1 is its registrable domain, so www.x.example and x.example count as one site.'
						},
						{
							lines: [14, 18],
							output: [2, 7],
							note: 'For every cookie: its site, its name, and whether the history ever visited that site.'
						}
					]
				},
				{
					kind: 'build',
					id: 'build-jar',
					title: 'Build it',
					prompt: 'Put the comparison in order. One step does not belong.',
					blocks: [
						{
							id: 'history',
							label: 'Parse the history',
							builtins: ['browser_history']
						},
						{
							id: 'cookies',
							label: 'Parse the cookie jar',
							builtins: ['browser_cookies']
						},
						{
							id: 'sites',
							label: 'Reduce each visited URL to its site',
							builtins: ['domain_extract', 'tld_extract']
						},
						{
							id: 'compare',
							label: 'Mark each cookie’s site as visited or not',
							builtins: ['has_key']
						},
						{ id: 'decrypt', label: 'Decrypt the cookie values' }
					],
					answer: ['history', 'cookies', 'sites', 'compare'],
					explain: 'The question is about hosts, not values: nothing here needs the encrypted part.'
				},
				{
					kind: 'check',
					id: 'check-jar',
					title: 'Check yourself',
					questions: [
						{
							id: 'orphan',
							prompt: 'A cookie’s site never appears in the history. Where did it most likely come from?',
							choices: ['Something embedded in a visited page', 'A typed URL', 'A browser update'],
							answer: 0,
							explain: 'An ad or tracker inside a page the user did visit.'
						},
						{
							id: 'etld1',
							prompt: 'Why compare registrable domains (etld1) rather than full host names?',
							choices: [
								'So www.x.example and x.example count as the same site',
								'Because cookies have no host',
								'To decrypt the values'
							],
							answer: 0,
							explain: 'A cookie set for x.example is the same site as a visit to www.x.example.'
						}
					]
				},
				{
					kind: 'resources',
					id: 'resources',
					title: 'Run them yourself',
					files: [
						{
							path: 'examples/workshop/ad_redirects.mut',
							label: 'The redirect chain'
						},
						{
							path: 'examples/workshop/ad_cookies.mut',
							label: 'The cookie jar'
						},
						{
							path: 'examples/workshop/lib/quilldrop.mut',
							label: 'The library they import'
						},
						{
							path: 'examples/workshop/README.md',
							label: 'How to build the evidence they read'
						}
					]
				}
			]
		}
	]
};
