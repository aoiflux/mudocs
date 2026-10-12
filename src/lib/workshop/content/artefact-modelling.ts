/**
 * Module 1 · Artefact modelling: turning raw evidence into records a program
 * can reason about. Mutant v2.6.1 has no dedicated modelling example (plan
 * item M-5), so the module teaches the idea through three programs that do it:
 * log lines into fields (log_parse), records into counts (top_talkers), both
 * with recorded outputs, and a bodyfile into a timeline (05_timeline), whose
 * input is the QUILLDROP corpus, so its output is simulated.
 */
import type { WorkshopModuleSpec } from '../schema';
import { SIMULATED } from './shared/quilldrop-sim.ts';

export const spec: WorkshopModuleSpec = {
	id: 'artefact-modelling',
	pin: 'v2.6.1',
	title: 'Artefact modelling',
	lede: 'Raw evidence is text and bytes. A program can only reason about it once it is records with named fields: this module is about making them.',
	relatedDocs: ['structured_data'],
	tiers: [
		{
			id: 'beginner',
			title: 'From lines to fields',
			summary: 'One regular expression with a group per field turns a log line into a record.',
			stages: [
				{
					kind: 'hook',
					id: 'hook',
					title: 'Evidence arrives as text',
					paragraphs: [
						'A log line, a bodyfile row, a registry value: each is text until you say what its parts mean. A model of an artefact is just that: the fields it has, and how to read them out.',
						'Once evidence is records, the rest of an examination is ordinary programming: filter, count, sort, compare.'
					]
				},
				{
					kind: 'concept',
					id: 'line-to-record',
					title: 'A line becomes a record',
					scene: 'RecordModel',
					values: {
						raw: '2024-06-01 12:05:33 login user=analyst ip=192.0.2.10 result=ok',
						pattern: 'user=([^ ]+) ip=([^ ]+) result=([^ ]+)',
						fields: [
							{ name: 'user', value: 'analyst' },
							{ name: 'ip', value: '192.0.2.10' },
							{ name: 'result', value: 'ok' }
						]
					},
					intro: 'An illustrative log line, and the pattern log_parse.mut uses on lines like it.',
					steps: [
						{
							label: 'The line',
							text: 'To a program, this is one string. Nothing in it is a field yet.',
							focus: 'raw'
						},
						{
							label: 'The pattern',
							text: 'Each pair of parentheses is a group: one field. [^ ]+ means one or more characters that are not a space.',
							focus: 'pattern'
						},
						{
							label: 'The record',
							text: 'Each group captures one value. Named, they are a record.',
							focus: 'fields'
						}
					],
					sources: [
						{
							kind: 'mutant-file',
							ref: 'examples/workshop/log_parse.mut',
							note: 'The pattern, line 11.'
						},
						{ kind: 'builtin-metadata', ref: 'regex_capture_groups' }
					]
				},
				{
					kind: 'walkthrough',
					id: 'log-parse',
					title: 'Parse logs with Mutant',
					program: 'examples/workshop/log_parse.mut',
					golden: 'examples/workshop/log_parse.golden',
					steps: [
						{
							lines: [1, 4],
							note: 'The header explains the one fact you need: the groups come back as an array, whole match first.'
						},
						{
							lines: [6, 11],
							output: [1, 1],
							note: 'Two raw lines and one pattern, with a group for each of user, ip and result.'
						},
						{
							lines: [13, 20],
							output: [2, 3],
							note: 'regex_capture_groups returns the capture array and an error. Index 0 is the whole match, so the fields are 1, 2 and 3. On an error the program prints [no match] rather than skipping the line silently.'
						}
					]
				},
				{
					kind: 'build',
					id: 'build-parse',
					title: 'Build it',
					prompt: 'Put the parse in order. One step does not belong.',
					blocks: [
						{ id: 'lines', label: 'Collect the raw lines' },
						{ id: 'pattern', label: 'Write one pattern, a group per field' },
						{
							id: 'capture',
							label: 'Capture the groups from each line',
							builtins: ['regex_capture_groups']
						},
						{
							id: 'print',
							label: 'Print one record per line',
							builtins: ['putln']
						},
						{ id: 'sort', label: 'Sort the lines by length first' }
					],
					answer: ['lines', 'pattern', 'capture', 'print'],
					explain: 'The pattern is the model: write it once, apply it to every line.'
				},
				{
					kind: 'check',
					id: 'check-parse',
					title: 'Check yourself',
					questions: [
						{
							id: 'index',
							prompt: 'regex_capture_groups returned g. Where is the first field?',
							choices: ['g[0]', 'g[1]', 'g[3]'],
							answer: 1,
							explain: 'g[0] is the whole match; the groups start at g[1].'
						},
						{
							id: 'nomatch',
							prompt: 'What does the program do with a line the pattern does not match?',
							choices: ['Stops with an error', 'Prints [no match]', 'Prints an empty record'],
							answer: 1,
							explain:
								'The program treats an error from regex_capture_groups as no match: it prints [no match] and carries on with the next line.'
						}
					]
				}
			]
		},
		{
			id: 'intermediate',
			title: 'From records to counts',
			summary: 'Once evidence is records, counting and ranking them is a few lines.',
			stages: [
				{
					kind: 'walkthrough',
					id: 'top-talkers',
					title: 'Top talkers',
					program: 'examples/workshop/top_talkers.mut',
					golden: 'examples/workshop/top_talkers.golden',
					steps: [
						{
							lines: [1, 8],
							output: [1, 1],
							note: 'Each connection is one record here: the source address.'
						},
						{
							lines: [10, 15],
							note: 'Tally into a map. get reads a key with a default of 0; set returns the map with the key changed, so the loop assigns it back to counts.'
						},
						{
							lines: [17, 23],
							output: [2, 4],
							note: 'sort_by orders the addresses by the value the function returns. Returning 0 minus the count puts the busiest first.'
						}
					]
				},
				{
					kind: 'build',
					id: 'build-rank',
					title: 'Build it',
					prompt: 'Put the ranking in order. One step does not belong.',
					blocks: [
						{
							id: 'tally',
							label: 'Count the connections per address',
							builtins: ['get', 'set']
						},
						{
							id: 'rank',
							label: 'Rank the addresses by count',
							builtins: ['sort_by', 'keys']
						},
						{ id: 'print', label: 'Print the ranking', builtins: ['each'] },
						{ id: 'dedupe', label: 'Drop repeated connections first' }
					],
					answer: ['tally', 'rank', 'print'],
					explain: 'Dropping repeats first would throw away the very counts you rank by.'
				},
				{
					kind: 'check',
					id: 'check-rank',
					title: 'Check yourself',
					questions: [
						{
							id: 'negate',
							prompt: 'Why does the sort key return 0 minus the count?',
							choices: ['To sort busiest first', 'Because counts can be negative', 'To skip addresses seen once'],
							answer: 0,
							explain: 'sort_by sorts by the key, smallest first; negating the count puts the largest first.'
						},
						{
							id: 'set',
							prompt: 'Why does the loop write counts = set(counts, …)?',
							choices: ['set returns the changed map', 'set prints the map', 'set clears the map'],
							answer: 0,
							explain: 'set returns the map with the key changed; assigning it back keeps the tally.'
						}
					]
				}
			]
		},
		{
			id: 'advanced',
			title: 'A timeline is a model too',
			summary: 'A bodyfile gives four times per file. mactime turns them into moments.',
			stages: [
				{
					kind: 'walkthrough',
					id: 'timeline',
					title: 'The day, in order',
					program: 'examples/workshop/05_timeline.mut',
					simulated: SIMULATED['05_timeline'],
					steps: [
						{
							lines: [1, 5],
							output: [1, 1],
							note: 'Import the QUILLDROP library, then check the bodyfile is there before reading it.'
						},
						{
							lines: [6, 7],
							note: 'bodyfile_parse gives one row per file with four times. mactime collapses them into one row per distinct instant, with a MACB flag string saying which of the four times fell there.'
						},
						{
							lines: [8, 11],
							output: [2, 27],
							note: 'Print the first 25 moments, then how many moments came from how many rows.'
						}
					]
				},
				{
					kind: 'check',
					id: 'check-timeline',
					title: 'Check yourself',
					questions: [
						{
							id: 'moments',
							prompt: 'A file was born, written and read in the same second. How many moments does mactime give it?',
							choices: ['One, flagged with all three letters', 'Three', 'Four'],
							answer: 0,
							explain: 'mactime makes one row per distinct instant; the flag string says which times fell on it.'
						}
					]
				},
				{
					kind: 'resources',
					id: 'resources',
					title: 'Run them yourself',
					files: [
						{
							path: 'examples/workshop/log_parse.mut',
							label: 'log_parse: lines to fields'
						},
						{
							path: 'examples/workshop/log_parse.golden',
							label: 'Its recorded output'
						},
						{
							path: 'examples/workshop/top_talkers.mut',
							label: 'top_talkers: records to counts'
						},
						{
							path: 'examples/workshop/top_talkers.golden',
							label: 'Its recorded output'
						},
						{
							path: 'examples/workshop/05_timeline.mut',
							label: '05_timeline: a bodyfile to moments'
						},
						{
							path: 'examples/workshop/README.md',
							label: 'How to build the evidence it reads'
						}
					]
				}
			]
		}
	]
};
