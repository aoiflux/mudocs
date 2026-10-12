/**
 * Module 2 · Timestomping. The two clocks of an NTFS record and the test
 * that catches a rewritten one (examples/workshop/stomp_two_clocks.mut), then
 * the timeline contradictions of beat 6 (06_lies.mut). Both read the QUILLDROP
 * corpus, so both outputs are simulated; the MFT scene's times are an
 * illustration.
 */
import type { WorkshopModuleSpec } from '../schema';
import { SIMULATED } from './shared/quilldrop-sim.ts';
import { TIMESTOMP_FILM } from './shared/films.ts';

export const spec: WorkshopModuleSpec = {
	id: 'timestomping',
	pin: 'v2.6.0',
	title: 'Timestomping',
	lede: 'Every file on NTFS carries its times twice. The copy that is easy to change is the one every tool shows; the other one is how you catch the change.',
	relatedDocs: ['capability_reference'],
	tiers: [
		{
			id: 'beginner',
			title: 'Two clocks',
			summary:
				'$STANDARD_INFORMATION and $FILE_NAME, and the file that says it was created before it was given its name.',
			stages: [
				{
					kind: 'hook',
					id: 'hook',
					title: 'The clock that is easy to change',
					paragraphs: [
						'Anti-forensics tools rewrite file times so a file planted yesterday looks years old. The times they rewrite are the ones Explorer and most tools show.',
						'NTFS keeps a second set, written when the file’s name is made, that the usual tools leave alone. When the two disagree in a way that cannot happen naturally, the file was edited.'
					]
				},
				TIMESTOMP_FILM,
				{
					kind: 'concept',
					id: 'two-clocks',
					title: 'One record, two clocks',
					scene: 'MftRecord',
					values: {
						file: 'Users/clerk/Documents/report.docx (illustration)',
						si: {
							created: '2026-03-11T14:02:10Z',
							modified: '2026-03-11T14:05:41Z',
							accessed: '2026-03-11T14:05:41Z',
							changed: '2026-03-11T14:05:41Z'
						},
						fn: {
							created: '2026-03-11T14:02:10Z',
							modified: '2026-03-11T14:02:10Z',
							accessed: '2026-03-11T14:02:10Z',
							changed: '2026-03-11T14:02:10Z'
						},
						stomped: {
							created: '2024-01-15T09:00:00Z',
							modified: '2024-01-15T09:00:00Z',
							accessed: '2024-01-15T09:00:00Z',
							changed: '2026-03-11T14:05:41Z'
						}
					},
					intro:
						'One file’s MFT record, with made-up times. Step through what a timestomp changes, and what it leaves.',
					steps: [
						{
							label: 'Four times',
							text: 'A record keeps four times: created (B), modified (M), accessed (A), and when the record itself last changed (C).',
							focus: 'times'
						},
						{
							label: 'Two attributes',
							text: 'It keeps them twice. $STANDARD_INFORMATION is what tools show. $FILE_NAME is written when the name is made.',
							focus: 'attributes'
						},
						{
							label: 'The stomp',
							text: 'SetFileTime writes the created, accessed and modified times in $STANDARD_INFORMATION. $FILE_NAME keeps the times from when the name was made.',
							focus: 'stomp'
						},
						{
							label: 'The test',
							text: 'If $STANDARD_INFORMATION says the file was created before $FILE_NAME says its name was made, the file was born before its name: it was rewritten.',
							focus: 'test'
						}
					],
					sources: [
						{
							kind: 'mutant-file',
							ref: 'examples/workshop/RUN_SHEET_2H.md',
							note: 'The two clocks deep dive.'
						},
						{
							kind: 'mutant-file',
							ref: 'examples/workshop/stomp_two_clocks.mut',
							note: 'The test, line 18.'
						},
						{
							kind: 'builtin-metadata',
							ref: 'mft_parse',
							note: 'si_* and fn_* times per record.'
						},
						{
							kind: 'external-spec',
							ref: 'https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-setfiletime',
							note: 'SetFileTime sets creation, last access and last write times.'
						}
					]
				},
				{
					kind: 'walkthrough',
					id: 'stomp-two-clocks',
					title: 'Catch it with Mutant',
					program: 'examples/workshop/stomp_two_clocks.mut',
					simulated: SIMULATED['stomp_two_clocks'],
					steps: [
						{
							lines: [1, 5],
							output: [1, 1],
							note: 'Import the QUILLDROP library and check the disk image is there.'
						},
						{
							lines: [6, 8],
							note: 'table_open reads the image’s partition table; table_list_partitions lists the partitions. The table handle is closed as soon as the list is out.'
						},
						{
							lines: [9, 12],
							note: 'Keep the allocated partitions and open the first as NTFS. ntfs_open takes the partition itself, so the volume is read where it lies inside the image.'
						},
						{
							lines: [13, 15],
							note: 'Copy $MFT out of the volume to a file (removing any copy from an earlier run first), then close the volume.'
						},
						{
							lines: [16, 21],
							output: [2, 2],
							note: 'mft_parse gives every record’s si_* and fn_* times. A record with no $FILE_NAME time is skipped first with is_null, because null does not compare; the rest are tested: si_created earlier than fn_created.'
						},
						{
							lines: [22, 23],
							output: [3, 3],
							note: 'Print how many records were read. If no file is printed above it, say so: a tool that rewrites both clocks leaves nothing here to find.'
						}
					]
				},
				{
					kind: 'build',
					id: 'build',
					title: 'Build it',
					prompt: 'Put the hunt in order. One step does not belong.',
					blocks: [
						{
							id: 'table',
							label: 'Read the image’s partition table',
							builtins: ['table_open', 'table_list_partitions']
						},
						{
							id: 'volume',
							label: 'Open the NTFS partition',
							builtins: ['ntfs_open']
						},
						{
							id: 'extract',
							label: 'Copy $MFT out to a file',
							builtins: ['ntfs_extract_file']
						},
						{
							id: 'parse',
							label: 'Parse every MFT record',
							builtins: ['mft_parse']
						},
						{
							id: 'compare',
							label: 'Flag records created before their name',
							builtins: ['is_null']
						},
						{ id: 'touch', label: 'Reset the file’s times to check them' }
					],
					answer: ['table', 'volume', 'extract', 'parse', 'compare'],
					explain: 'Read the disk from the outside in; never write to the evidence.'
				},
				{
					kind: 'check',
					id: 'check',
					title: 'Check yourself',
					questions: [
						{
							id: 'which',
							prompt: 'Which attribute’s times does SetFileTime write?',
							choices: ['$FILE_NAME', '$STANDARD_INFORMATION', 'Both'],
							answer: 1,
							explain:
								'$STANDARD_INFORMATION. $FILE_NAME is written when the name is made, and the usual tools leave it alone.'
						},
						{
							id: 'flag',
							prompt: 'The program flags a record when…',
							choices: [
								'si_created is earlier than fn_created',
								'fn_created is earlier than si_created',
								'the two modified times differ'
							],
							answer: 0,
							explain: 'A file cannot be created before its name was made, unless its times were rewritten.'
						},
						{
							id: 'nothing',
							prompt: 'The program prints no file. What can you say?',
							choices: [
								'No file was timestomped',
								'No file failed this test; a tool that rewrites both clocks would also pass it',
								'The MFT is corrupt'
							],
							answer: 1,
							explain: 'Absence of this contradiction is not proof of no edit.'
						}
					]
				}
			]
		},
		{
			id: 'intermediate',
			title: 'Contradictions in the timeline',
			summary:
				'Two tests over a bodyfile: a file modified before it existed, and a file the timeline names that is not on disk.',
			stages: [
				{
					kind: 'walkthrough',
					id: 'lies',
					title: 'Which times cannot be true',
					program: 'examples/workshop/06_lies.mut',
					simulated: SIMULATED['06_lies'],
					steps: [
						{
							lines: [1, 6],
							output: [1, 1],
							note: 'Check the bodyfile is there, then parse it: one row per file, four times each.'
						},
						{
							lines: [7, 10],
							output: [2, 2],
							note: 'A file whose modified time is earlier than its creation time was modified before it existed. That is not a date; it is evidence of an edit.'
						},
						{
							lines: [11, 16],
							output: [3, 14],
							note: 'A file the timeline names that fs_exists cannot find was there and is not now. Deleting it is what left this trace.'
						}
					]
				},
				{
					kind: 'check',
					id: 'check-lies',
					title: 'Check yourself',
					questions: [
						{
							id: 'delete',
							prompt: 'A staging folder was deleted from the disk. Why does the program still find it?',
							choices: ['The bodyfile still lists it', 'fs_exists reads deleted files', 'mactime restores it'],
							answer: 0,
							explain: '“You cannot delete a fact. You can only create a contradiction.”'
						}
					]
				},
				{
					kind: 'resources',
					id: 'resources',
					title: 'Run them yourself',
					files: [
						{
							path: 'examples/workshop/stomp_two_clocks.mut',
							label: 'The two clocks'
						},
						{
							path: 'examples/workshop/06_lies.mut',
							label: 'The contradictions'
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
