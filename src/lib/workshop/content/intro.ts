/**
 * Module 0 · Introduction. What an examination asks, and what a Mutant
 * program looks like end to end: examples/workshop/ioc_extract.mut, which
 * needs no input and has a recorded output.
 */
import type { WorkshopModuleSpec } from '../schema';
import { CASE_QUESTIONS } from './shared/case-questions.ts';

export const spec: WorkshopModuleSpec = {
	id: 'intro',
	pin: 'v2.6.1',
	title: 'Introduction',
	lede: 'The questions every examination asks, and a first Mutant program from top to bottom.',
	relatedDocs: ['tutorial_30_min'],
	tiers: [
		{
			id: 'beginner',
			title: 'A program, end to end',
			summary: 'The five questions of an examination, then one short program that pulls indicators out of a report.',
			stages: [
				{
					kind: 'hook',
					id: 'hook',
					title: 'Why a forensics language',
					paragraphs: [
						'An examination is a chain of small questions, each answered from evidence: what is this file, who sent this mail, which of these times cannot be true. Mutant’s builtins read that evidence directly, so each answer is a short program you can read aloud and run again.',
						'Mutant’s own workshop case puts it in one line: “You cannot delete a fact. You can only create a contradiction.” Most of this workshop is about finding the contradiction.'
					]
				},
				{
					kind: 'concept',
					id: 'questions',
					title: 'The questions, in order',
					scene: 'CaseBoard',
					values: CASE_QUESTIONS,
					intro:
						'Mutant’s QUILLDROP case asks five questions, in the order a real examination asks them. Ten short programs answer them; the capstone walks through all ten.',
					steps: [
						{
							label: 'What have we got',
							text: 'Before opening anything: what is in the collection, and what is wrong with it.',
							focus: 'q1'
						},
						{
							label: 'How did it start',
							text: 'The mail, the download, and the thing that ran.',
							focus: 'q2'
						},
						{
							label: 'What happened, when',
							text: 'Every timestamp, put in order.',
							focus: 'q3'
						},
						{
							label: 'What is a lie',
							text: 'The timestamps that cannot all be true.',
							focus: 'q4'
						},
						{
							label: 'Can you prove it',
							text: 'A handover someone else can check tomorrow.',
							focus: 'q5'
						}
					],
					sources: [
						{
							kind: 'mutant-file',
							ref: 'examples/workshop/CASE_QUILLDROP.md',
							note: 'The five questions.'
						},
						{
							kind: 'mutant-file',
							ref: 'examples/workshop/README.md',
							note: 'The ten programs and their titles.'
						}
					]
				},
				{
					kind: 'walkthrough',
					id: 'ioc-extract',
					title: 'A first program',
					program: 'examples/workshop/ioc_extract.mut',
					golden: 'examples/workshop/ioc_extract.golden',
					steps: [
						{
							lines: [1, 4],
							note: 'Comments start with //. The header says what the program does and what it needs as input: nothing.'
						},
						{
							lines: [6, 8],
							output: [1, 1],
							note: 'putln prints a line. The report is one string, built from three pieces joined with +.'
						},
						{
							lines: [10, 16],
							output: [2, 6],
							note: 'extract_iocs takes the whole text and returns one map, with a list of indicators for each kind: addresses, domains, URLs, emails, hashes.'
						},
						{
							lines: [18, 19],
							output: [7, 7],
							note: 'defang rewrites a URL so nobody can click it by accident: http becomes hxxp and every dot is bracketed.'
						}
					]
				},
				{
					kind: 'build',
					id: 'build',
					title: 'Build it',
					prompt: 'Put the program’s steps in order. One step does not belong.',
					blocks: [
						{ id: 'text', label: 'Collect the report text' },
						{
							id: 'extract',
							label: 'Pull out every indicator in one call',
							builtins: ['extract_iocs']
						},
						{
							id: 'print',
							label: 'Print each kind of indicator',
							builtins: ['putln']
						},
						{
							id: 'defang',
							label: 'Defang the URL for the ticket',
							builtins: ['defang']
						},
						{ id: 'visit', label: 'Open the URL to see what it serves' }
					],
					answer: ['text', 'extract', 'print', 'defang'],
					explain: 'Nothing in triage needs the indicator to be live: extract it, report it, defang it.'
				},
				{
					kind: 'check',
					id: 'check',
					title: 'Check yourself',
					questions: [
						{
							id: 'returns',
							prompt: 'What does extract_iocs give back?',
							choices: [
								'A value and an error',
								'One map, with a list for each kind of indicator',
								'A single list of strings'
							],
							answer: 1,
							explain: 'The program reads iocs["ipv4"], iocs["domains"] and so on from the one map it returned.'
						},
						{
							id: 'defang',
							prompt: 'What did defang turn http://evil.example.com/panel into?',
							choices: ['hxxp://evil[.]example[.]com/panel', 'http://evil.example.com', 'evil[.]example[.]com'],
							answer: 0,
							explain: 'The last line of the recorded output.'
						},
						{
							id: 'comments',
							prompt: 'How does a comment start in Mutant?',
							choices: ['#', '//', '--'],
							answer: 1,
							explain: 'Every comment in the program starts with //.'
						}
					]
				},
				{
					kind: 'takeaways',
					id: 'takeaways',
					title: 'Takeaways',
					points: [
						'An examination is a sequence of questions; each Mutant program answers one.',
						'A builtin like extract_iocs does a whole triage step in one call.',
						'Output marked recorded is a real run of the program beside it; output marked simulated shows what the program prints on the case evidence.'
					]
				},
				{
					kind: 'resources',
					id: 'resources',
					title: 'Run it yourself',
					files: [
						{ path: 'examples/workshop/ioc_extract.mut', label: 'The program' },
						{
							path: 'examples/workshop/ioc_extract.golden',
							label: 'Its recorded output'
						},
						{
							path: 'examples/workshop/CASE_QUILLDROP.md',
							label: 'The QUILLDROP brief'
						}
					]
				}
			]
		}
	]
};
