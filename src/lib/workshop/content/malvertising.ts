/**
 * Module 3 · Malware in ads. How the browser got to the download (the
 * redirect chain in Chrome's History, dfrws/2a_ad_redirects.mut) and which
 * sites knew it was there (the cookie jar, dfrws/2b_ad_cookies.mut). Both read the QUILLDROP
 * corpus, so both outputs are simulated; the scenes' visits and cookies are
 * an illustration.
 */
import type { WorkshopModuleSpec } from '../schema';
import { SIMULATED } from './shared/quilldrop-sim.ts';
import { MALVERTISING_FILM } from './shared/films.ts';

export const spec: WorkshopModuleSpec = {
	id: 'malvertising',
	pin: 'v2.6.1',
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
							ref: 'examples/workshop/dfrws/2a_ad_redirects.mut',
							note: 'The query, line 4; the redirect bits, lines 8 and 11.'
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
					program: 'examples/workshop/dfrws/2a_ad_redirects.mut',
					simulated: SIMULATED['dfrws/2a_ad_redirects'],
					steps: [
						{
							lines: [1, 4],
							output: [1, 1],
							note: 'The History database (change line 3 to read another), and one SQL query joining every visit to its URL, in visit order.'
						},
						{
							lines: [6, 15],
							note: 'how reads a visit’s transition. Its high bits say the visit was a server redirect (2147483648) or a client redirect (1073741824); Mutant has no hex literals, so they are written in decimal. & binds before >, as in Go, so each test reads (transition & bit) > 0.'
						},
						{
							lines: [17, 19],
							note: 'A visit that carries the chain-end bit (536870912) and was reached by a redirect is the last hop of a redirect chain.'
						},
						{
							lines: [21, 29],
							note: 'Without the database, one line and stop. sqlite_query reads a copy of the database, so the original is never modified. The rows are indexed by visit id.'
						},
						{
							lines: [30, 31],
							output: [2, 2],
							note: 'filter keeps the visits that end a chain. Each one starts a walk.'
						},
						{
							lines: [32, 41],
							output: [3, 5],
							note: 'Walk back through from_visit. Chrome stores visit times as WebKit timestamps; timestamp_normalize turns them into ISO time. The walk stops at the first visit that was navigated to: the click that started the chain.'
						}
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
						{ id: 'start', label: 'Keep the visits that end a redirect chain', builtins: ['filter'] },
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
							prompt: 'How does Mutant read transition & 2147483648 > 0?',
							choices: [
								'(transition & 2147483648) > 0',
								'transition & (2147483648 > 0)',
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
						{ kind: 'mutant-file', ref: 'examples/workshop/dfrws/2b_ad_cookies.mut' },
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
					program: 'examples/workshop/dfrws/2b_ad_cookies.mut',
					simulated: SIMULATED['dfrws/2b_ad_cookies'],
					steps: [
						{
							lines: [1, 5],
							output: [1, 1],
							note: 'Chrome’s profile folder (change line 3 to read another), and the two databases in it: History, and Cookies under Network/.'
						},
						{
							lines: [7, 13],
							note: 'site reduces a host to its registrable domain with tld_extract, so www.x.example and x.example count as one site. A host with no registrable domain keeps its whole domain.'
						},
						{
							lines: [15, 20],
							note: 'Without the cookie jar, one line and stop. browser_history and browser_cookies each parse a database into entries. Cookie values are encrypted; the host and name are not, and they are all this question needs.'
						},
						{
							lines: [21, 24],
							note: 'Build the set of visited sites: domain_extract takes the host from each visited URL, and site reduces it.'
						},
						{
							lines: [25, 27],
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
							path: 'examples/workshop/dfrws/2a_ad_redirects.mut',
							label: 'The redirect chain: point line 3 at any Chrome History'
						},
						{
							path: 'examples/workshop/dfrws/2b_ad_cookies.mut',
							label: 'The cookie jar: point line 3 at any Chrome profile'
						},
						{
							path: 'examples/workshop/dfrws/README.md',
							label: 'The DFRWS topic programs, and how to build their evidence'
						}
					]
				}
			]
		}
	]
};
