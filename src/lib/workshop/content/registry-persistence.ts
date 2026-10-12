/**
 * Module 4 · Registry persistence. Beginner tier only: reading a hive with the
 * reg_* builtins, on the JSON hive model in Mutant's examples/data/.
 *
 * The persistence tier (Run and RunOnce keys) is not here yet. The one program
 * at v2.6.0 that looks for a Run key, examples/registry/registry_persistence_hunt.mut,
 * runs against a fixture that has no Run key, so its recorded output is
 * "key not found". It waits on a Mutant example with a Run-key fixture and
 * a recorded output.
 */
import type { WorkshopModuleSpec } from '../schema';

export const spec: WorkshopModuleSpec = {
	id: 'registry-persistence',
	pin: 'v2.6.0',
	title: 'Registry persistence',
	lede: 'Before you can spot the entry that does not belong, you need to read a hive: its keys, their values, what was deleted and when things changed.',
	relatedDocs: ['capability_reference'],
	tiers: [
		{
			id: 'beginner',
			title: 'Reading a hive',
			summary: 'Open a hive model, walk its keys and values, and pull out deleted keys and the write timeline.',
			stages: [
				{
					kind: 'hook',
					id: 'hook',
					title: 'Why the registry',
					paragraphs: [
						'Windows keeps its configuration in the registry, a tree of keys. Each key holds named values and records when it was last written.',
						'Persistence lives there too. Before you can tell a planted entry from a normal one, you need to be able to read a hive and say what is in it.'
					]
				},
				{
					kind: 'concept',
					id: 'hive-model',
					title: 'What a hive holds',
					scene: 'RegistryTree',
					data: 'examples/data/offline_hive.json',
					intro: 'This is the hive the program below reads: a JSON model of a hive from Mutant’s examples. Step through it before you read any code.',
					steps: [
						{
							label: 'Keys',
							text: 'Keys form a tree. Here, HKLM\\Software has one subkey, HKLM\\Software\\Mutant.',
							focus: 'keys'
						},
						{
							label: 'Values',
							text: 'A key holds named values. HKLM\\Software\\Mutant has two: InstallPath and Enabled.',
							focus: 'values'
						},
						{
							label: 'Last write',
							text: 'Every key records when it was last written. That time belongs to the key, not to any one value.',
							focus: 'last_write'
						},
						{
							label: 'Deleted keys',
							text: 'A hive can still hold keys that were deleted. This model lists one: HKLM\\Software\\OldMutant.',
							focus: 'deleted_keys'
						},
						{
							label: 'Timeline',
							text: 'The model also carries a timeline of changes: the Mutant key was created, then its InstallPath value was set ten minutes later.',
							focus: 'timeline'
						}
					],
					sources: [
						{ kind: 'mutant-file', ref: 'examples/data/offline_hive.json', note: 'Every key, value and time in the scene.' }
					]
				},
				{
					kind: 'walkthrough',
					id: 'walkthrough',
					title: 'Read it with Mutant',
					program: 'examples/registry/registry_forensics_example.mut',
					golden: 'examples/registry/registry_forensics_example.golden',
					steps: [
						{
							lines: [1, 6],
							output: [1, 2],
							note: 'reg_open returns a map and an error. The map carries the handle every later call takes; source_type says the hive was read from a JSON model. The empty err means it opened.'
						},
						{
							lines: [8, 9],
							output: [3, 3],
							note: 'reg_enum_keys lists the subkeys directly under a key: one, HKLM\\Software\\Mutant.'
						},
						{
							lines: [11, 15],
							output: [4, 5],
							note: 'reg_enum_values lists every value under a key, each with its name, type and data. reg_get_value fetches one value by name.'
						},
						{
							lines: [17, 18],
							output: [6, 6],
							note: 'reg_deleted_keys lists the keys the hive records as deleted.'
						},
						{
							lines: [20, 21],
							output: [7, 7],
							note: 'reg_timeline returns the hive’s changes in order, each with a timestamp, the key path and the action.'
						},
						{
							lines: [23, 24],
							output: [8, 8],
							note: 'reg_close releases the handle.'
						}
					]
				},
				{
					kind: 'check',
					id: 'check',
					title: 'Check yourself',
					questions: [
						{
							id: 'subkeys',
							prompt: 'You want the keys directly under HKLM\\Software. Which call gives you them?',
							choices: ['reg_enum_values', 'reg_enum_keys', 'reg_timeline'],
							answer: 1,
							explain: 'reg_enum_keys lists subkeys. reg_enum_values lists the values inside one key.'
						},
						{
							id: 'handle',
							prompt: 'What does every call after reg_open take as its first argument?',
							choices: ['The path of the hive file', 'The handle from the map reg_open returned', 'The key path'],
							answer: 1,
							explain: 'The program reads hive["handle"] once and passes it to every later call, including reg_close.'
						},
						{
							id: 'deleted',
							prompt: 'Which key does this hive record as deleted?',
							choices: ['HKLM\\Software\\Mutant', 'HKLM\\Software', 'HKLM\\Software\\OldMutant'],
							answer: 2,
							explain: 'reg_deleted_keys printed [HKLM\\Software\\OldMutant]. It is not among the keys reg_enum_keys found.'
						}
					]
				},
				{
					kind: 'takeaways',
					id: 'takeaways',
					title: 'Takeaways',
					points: [
						'Open a hive once with reg_open, keep the handle, and close it with reg_close when you are done.',
						'reg_enum_keys walks the tree; reg_enum_values and reg_get_value read what a key holds.',
						'Deleted keys and the change timeline are evidence in their own right: reg_deleted_keys and reg_timeline.'
					]
				},
				{
					kind: 'resources',
					id: 'resources',
					title: 'Run it yourself',
					files: [
						{ path: 'examples/registry/registry_forensics_example.mut', label: 'The program' },
						{ path: 'examples/registry/registry_forensics_example.golden', label: 'Its recorded output' },
						{ path: 'examples/data/offline_hive.json', label: 'The hive model it reads' }
					]
				}
			]
		}
	]
};
