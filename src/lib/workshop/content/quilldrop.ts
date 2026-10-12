/**
 * Module C · Capstone: QUILLDROP. Mutant's ten-beat case, from the folder to
 * the signed handover, in the order the brief asks its questions. Every beat
 * reads the QUILLDROP corpus, which is generated on the attendee's machine, so
 * every beat's output is simulated (shared/quilldrop-sim.ts).
 */
import type { WorkshopModuleSpec } from '../schema';
import { SIMULATED } from './shared/quilldrop-sim.ts';
import { CASE_QUESTIONS } from './shared/case-questions.ts';

export const spec: WorkshopModuleSpec = {
	id: 'quilldrop',
	pin: 'v2.6.0',
	title: 'Capstone: QUILLDROP',
	lede: 'One workstation, one folder, one list of times. Ten programs, none longer than eighteen lines, take it to a signed handover.',
	relatedDocs: ['evidence_handling_policy'],
	tiers: [
		{
			id: 'beginner',
			title: 'How did it start',
			summary: 'The scene, the lure, the download and the binary: beats 1 to 4.',
			stages: [
				{
					kind: 'hook',
					id: 'brief',
					title: 'The brief',
					paragraphs: [
						'A freight company’s finance team cannot open its quarterly close. The files are where they should be, the right size, and they open to garbage.',
						'IT rebuilt the machine before anyone imaged it. What is left is one triage collection from an accounts-payable workstation: a folder of files, and a bodyfile giving four timestamps for every object that was ever on it, including the ones that are not there any more. No memory, no packets, no disk image.',
						'That is enough.'
					]
				},
				{
					kind: 'concept',
					id: 'board',
					title: 'The case board',
					scene: 'CaseBoard',
					values: CASE_QUESTIONS,
					intro: 'Five questions, in the order a real examination asks them, and the beats that answer each.',
					steps: [
						{
							label: 'The scene',
							text: 'What have we got, and what is wrong with it.',
							focus: 'q1'
						},
						{
							label: 'The start',
							text: 'The mail, the download, the thing that ran.',
							focus: 'q2'
						},
						{ label: 'The day', text: 'Every time, in order.', focus: 'q3' },
						{
							label: 'The lies',
							text: 'The times that cannot all be true.',
							focus: 'q4'
						},
						{
							label: 'The proof',
							text: 'A handover someone else can check.',
							focus: 'q5'
						}
					],
					sources: [
						{ kind: 'mutant-file', ref: 'examples/workshop/CASE_QUILLDROP.md' },
						{ kind: 'mutant-file', ref: 'examples/workshop/README.md' }
					]
				},
				{
					kind: 'build',
					id: 'build-order',
					title: 'Order the examination',
					prompt: 'Put the five questions in the order an examination asks them.',
					blocks: [
						{ id: 'have', label: 'What have we got?' },
						{ id: 'start', label: 'How did it start?' },
						{ id: 'when', label: 'What happened, when?' },
						{ id: 'lie', label: 'What is a lie?' },
						{ id: 'prove', label: 'Can you prove any of it tomorrow?' }
					],
					answer: ['have', 'start', 'when', 'lie', 'prove'],
					explain: 'Each question needs the answer before it: you cannot spot a lie in a timeline you have not built.'
				},
				{
					kind: 'walkthrough',
					id: 'beat-1',
					title: '1 · The scene',
					program: 'examples/workshop/01_scene.mut',
					simulated: SIMULATED['01_scene'],
					steps: [
						{
							lines: [1, 5],
							output: [1, 1],
							note: 'Ask first: you have a folder. Before you open anything, what can you say about it?'
						},
						{
							lines: [6, 7],
							note: 'fs_walk gives every object under the case folder.'
						},
						{
							lines: [8, 15],
							output: [2, 5],
							note: 'fs_entropy gives one number per file. Near 8 bits per byte means compressed or encrypted, and entropy alone cannot tell you which.'
						},
						{
							lines: [16, 17],
							output: [6, 6],
							note: 'Then count what was walked.'
						}
					]
				},
				{
					kind: 'walkthrough',
					id: 'beat-2',
					title: '2 · The lure',
					program: 'examples/workshop/02_lure.mut',
					simulated: SIMULATED['02_lure'],
					steps: [
						{
							lines: [1, 7],
							output: [1, 1],
							note: 'Ask: who wrote to this person, and what did they want them to do? email_parse splits a raw message into headers, body and attachments.'
						},
						{
							lines: [8, 10],
							output: [2, 4],
							note: 'Sender, subject, and every URL in the body from one extract_iocs call.'
						},
						{
							lines: [11, 14],
							output: [5, 5],
							note: 'The attachments, by name. A name with two extensions is the first line of the next beat.'
						}
					]
				},
				{
					kind: 'walkthrough',
					id: 'beat-3',
					title: '3 · The download',
					program: 'examples/workshop/03_download.mut',
					simulated: SIMULATED['03_download'],
					steps: [
						{
							lines: [1, 9],
							output: [1, 2],
							note: 'Ask: is that file what its name says? fs_magic reads the header, not the extension.'
						},
						{
							lines: [10, 13],
							output: [3, 8],
							note: 'Chrome’s history, read with sqlite_query on a copy of the database.'
						},
						{
							lines: [14, 17],
							output: [9, 9],
							note: 'Windows marks a downloaded file with a Zone.Identifier alternate data stream naming where it came from. Three independent sources that agree are corroboration. On a non-NTFS volume the stream is not there, and that line reports nothing.'
						}
					]
				},
				{
					kind: 'walkthrough',
					id: 'beat-4',
					title: '4 · The binary',
					program: 'examples/workshop/04_binary.mut',
					simulated: SIMULATED['04_binary'],
					steps: [
						{
							lines: [1, 8],
							output: [1, 1],
							note: 'Ask: what is the thing in AppData? bin_pe_parse reads the PE headers.'
						},
						{
							lines: [9, 10],
							note: 'The PE build time, normalised from Unix seconds. A zero there reads as 1 January 1970: a scrubbed build date is itself a finding. imphash still clusters the binary by its imports.'
						},
						{
							lines: [11, 14],
							output: [2, 4],
							note: 'Format, machine, sections, build time, import hash.'
						}
					]
				},
				{
					kind: 'check',
					id: 'check-start',
					title: 'Check yourself',
					questions: [
						{
							id: 'entropy',
							prompt: 'An archive and an encrypted spreadsheet both score near 8 on entropy. What does that tell you?',
							choices: [
								'Both are encrypted',
								'Both are compressed or encrypted; entropy cannot say which',
								'Both are malware'
							],
							answer: 1,
							explain: 'Entropy found something; it did not tell you what.'
						},
						{
							id: 'magic',
							prompt: 'How does fs_magic decide what a file is?',
							choices: ['From its extension', 'From its header bytes', 'From its size'],
							answer: 1,
							explain: 'The extension is a claim; the header is evidence.'
						}
					]
				}
			]
		},
		{
			id: 'intermediate',
			title: 'What happened, and what is a lie',
			summary: 'The day in order, its contradictions, the archive’s inventory and someone else’s rules: beats 5 to 8.',
			stages: [
				{
					kind: 'walkthrough',
					id: 'beat-5',
					title: '5 · The day',
					program: 'examples/workshop/05_timeline.mut',
					simulated: SIMULATED['05_timeline'],
					steps: [
						{
							lines: [1, 7],
							output: [1, 1],
							note: 'Ask: what happened, in what order? bodyfile_parse gives four times per object; mactime gives one row per distinct instant.'
						},
						{
							lines: [8, 12],
							output: [2, 27],
							note: 'Count the rows against the moments: four timestamps per file does not mean four events.'
						}
					]
				},
				{
					kind: 'walkthrough',
					id: 'beat-6',
					title: '6 · The contradictions',
					program: 'examples/workshop/06_lies.mut',
					simulated: SIMULATED['06_lies'],
					steps: [
						{
							lines: [1, 10],
							output: [1, 2],
							note: 'Ask: which of those times cannot be true? A file modified before it existed.'
						},
						{
							lines: [11, 16],
							output: [3, 14],
							note: 'A path the timeline names that is no longer on disk. The deletion is what left it visible.'
						}
					]
				},
				{
					kind: 'walkthrough',
					id: 'beat-7',
					title: '7 · The inventory',
					program: 'examples/workshop/07_inventory.mut',
					simulated: SIMULATED['07_inventory'],
					steps: [
						{
							lines: [1, 7],
							output: [1, 1],
							note: 'Ask: what left, and can you answer without opening the archive? zip_open reads only the central directory; zip_entries lists every member without decompressing any.'
						},
						{
							lines: [8, 12],
							output: [2, 14],
							note: 'Each member’s date, CRC-32 and name, then the totals. Nothing was decompressed, and the program says so.'
						},
						{
							lines: [13, 15],
							output: [15, 15],
							note: 'Release the archive handle.'
						}
					]
				},
				{
					kind: 'walkthrough',
					id: 'beat-8',
					title: '8 · The rules',
					program: 'examples/workshop/08_rules.mut',
					simulated: SIMULATED['08_rules'],
					steps: [
						{
							lines: [1, 7],
							output: [1, 1],
							note: 'Ask: what does somebody else’s detection library say about your timeline? events_from turns bodyfile rows into interchange events.'
						},
						{
							lines: [8, 12],
							output: [2, 5],
							note: 'sigma_scan runs the case’s Sigma rules over the events and reports per rule.'
						},
						{
							lines: [13, 15],
							output: [6, 7],
							note: 'The last line lists the fields a rule needed that no event carried. A rule that needs a field the evidence does not have did not clear the host; it never ran.'
						}
					]
				},
				{
					kind: 'check',
					id: 'check-day',
					title: 'Check yourself',
					questions: [
						{
							id: 'zip',
							prompt: 'How can beat 7 say what left without decompressing anything?',
							choices: [
								'The central directory lists every member',
								'It guesses from the file size',
								'It reads the bodyfile'
							],
							answer: 0,
							explain: 'A zip names every member, with size and CRC-32, before any data.'
						},
						{
							id: 'zero',
							prompt:
								'A Sigma rule reports zero hits, and its field appears in the unmatched list. What does that mean?',
							choices: ['The host is clean', 'The rule never had the data to fire', 'The rule is broken'],
							answer: 1,
							explain: '“0 alerts” without “and here is what I could not check” tells you nothing.'
						}
					]
				}
			]
		},
		{
			id: 'advanced',
			title: 'Can you prove it',
			summary: 'Seal the case and check the seal: beats 9 and 10.',
			stages: [
				{
					kind: 'walkthrough',
					id: 'beat-9',
					title: '9 · The verdict',
					program: 'examples/workshop/09_verdict.mut',
					simulated: SIMULATED['09_verdict'],
					steps: [
						{
							lines: [1, 8],
							output: [1, 1],
							note: 'Ask: what has to be in the envelope? case_open starts a chain-of-custody session with a hash policy.'
						},
						{
							lines: [9, 12],
							output: [2, 4],
							note: 'case_evidence brings each exhibit under custody: size, modification time, digest.'
						},
						{
							lines: [13, 15],
							note: 'case_note records the conclusion; case_bundle writes the handover (manifest, reports, SHA256SUMS); case_close ends the session.'
						},
						{
							lines: [16, 18],
							output: [5, 6],
							note: 'The exhibit digests are the same on every machine. The manifest hash is not, and must not be: it records when this examination happened.'
						}
					]
				},
				{
					kind: 'walkthrough',
					id: 'beat-10',
					title: '10 · The seal',
					program: 'examples/workshop/10_seal.mut',
					simulated: SIMULATED['10_seal'],
					steps: [
						{
							lines: [1, 8],
							output: [1, 3],
							note: 'Ask: can a reader tell if you changed the report after you signed it? case_manifest_verify checks the manifest alone, with no key the reader does not already hold.'
						},
						{
							lines: [9, 13],
							output: [4, 5],
							note: 'Hash the reports as they are now. Edit one word of report.md and the manifest still verifies, but this digest moves away from the one the manifest recorded: that is what chain of custody buys.'
						}
					]
				},
				{
					kind: 'build',
					id: 'build-custody',
					title: 'Build the custody',
					prompt: 'Put the custody steps in order. One step does not belong.',
					blocks: [
						{
							id: 'open',
							label: 'Open the case with a hash policy',
							builtins: ['case_open']
						},
						{
							id: 'evidence',
							label: 'Register each exhibit',
							builtins: ['case_evidence']
						},
						{
							id: 'note',
							label: 'Record the conclusion',
							builtins: ['case_note']
						},
						{
							id: 'bundle',
							label: 'Write the handover',
							builtins: ['case_bundle']
						},
						{ id: 'close', label: 'Close the case', builtins: ['case_close'] },
						{
							id: 'verify',
							label: 'Verify the seal',
							builtins: ['case_manifest_verify']
						},
						{ id: 'edit', label: 'Tidy the report after sealing' }
					],
					answer: ['open', 'evidence', 'note', 'bundle', 'close', 'verify'],
					explain: 'Anything changed after the seal is exactly what the seal is there to show.'
				},
				{
					kind: 'check',
					id: 'check-proof',
					title: 'Check yourself',
					questions: [
						{
							id: 'manifest',
							prompt: 'Everyone in the room ran beat 9 on the same corpus. Which values match across machines?',
							choices: ['The exhibit digests', 'The manifest hash', 'Both'],
							answer: 0,
							explain: 'Reproducible evidence, singular custody: the manifest records when each examination happened.'
						},
						{
							id: 'edit',
							prompt: 'You change a word in report.md after sealing. What catches it?',
							choices: [
								'case_manifest_verify fails',
								'The report’s digest no longer matches the one in the manifest',
								'Nothing'
							],
							answer: 1,
							explain: 'The manifest still verifies; the digest it covers has moved.'
						}
					]
				},
				{
					kind: 'takeaways',
					id: 'takeaways',
					title: 'Takeaways',
					points: [
						'You cannot delete a fact. You can only create a contradiction.',
						'An archive’s central directory is an inventory: read it without decompressing a byte.',
						'Zero alerts means nothing until you know which rules had the data to fire.',
						'Analysis is what you did. Evidence is what you can prove you did.'
					]
				},
				{
					kind: 'resources',
					id: 'resources',
					title: 'Run the case yourself',
					files: [
						{
							path: 'examples/workshop/README.md',
							label: 'Build the evidence, then run each beat'
						},
						{ path: 'examples/workshop/CASE_QUILLDROP.md', label: 'The brief' },
						{
							path: 'examples/workshop/RUN_SHEET_2H.md',
							label: 'The two-hour run sheet'
						},
						{
							path: 'examples/workshop/lib/quilldrop.mut',
							label: 'The library every beat imports'
						},
						{
							path: 'examples/workshop/quilldrop.sigma.yaml',
							label: 'The Sigma rules beat 8 runs'
						}
					]
				}
			]
		}
	]
};
