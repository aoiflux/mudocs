/**
 * Module 4 · Registry persistence.
 *
 * Beginner: reading a hive with the reg_* builtins, on the JSON hive model in
 * Mutant's examples/data/, with a recorded output.
 *
 * Intermediate: the Run-key deep dive (examples/workshop/run_keys.mut). Its
 * input is the QUILLDROP corpus, so its output is simulated. Not
 * registry_persistence_hunt.mut: at v2.6.0 it reads a fixture with no Run
 * key, so its recorded output is "key not found".
 */
import type { WorkshopModuleSpec } from '../schema';
import { SIMULATED } from './shared/quilldrop-sim.ts';

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
					intro:
						'This is the hive the program below reads: a JSON model of a hive from Mutant’s examples. Step through it before you read any code.',
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
						{
							kind: 'mutant-file',
							ref: 'examples/data/offline_hive.json',
							note: 'Every key, value and time in the scene.'
						}
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
					kind: 'build',
					id: 'build',
					title: 'Build it',
					prompt: 'Put the steps of a hive read in the order the program runs them. One step does not belong.',
					blocks: [
						{
							id: 'open',
							label: 'Open the hive and keep its handle',
							builtins: ['reg_open']
						},
						{
							id: 'keys',
							label: 'List the subkeys of a key',
							builtins: ['reg_enum_keys']
						},
						{
							id: 'values',
							label: 'Read the values a key holds',
							builtins: ['reg_enum_values', 'reg_get_value']
						},
						{
							id: 'deleted',
							label: 'List the deleted keys',
							builtins: ['reg_deleted_keys']
						},
						{
							id: 'timeline',
							label: 'Read the change timeline',
							builtins: ['reg_timeline']
						},
						{
							id: 'close',
							label: 'Release the handle',
							builtins: ['reg_close']
						},
						{ id: 'reopen', label: 'Open the hive again for each key' }
					],
					answer: ['open', 'keys', 'values', 'deleted', 'timeline', 'close'],
					explain: 'One reg_open, one handle for every call, one reg_close at the end.'
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
							explain:
								'reg_deleted_keys printed [HKLM\\Software\\OldMutant]. It is not among the keys reg_enum_keys found.'
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
						{
							path: 'examples/registry/registry_forensics_example.mut',
							label: 'The program'
						},
						{
							path: 'examples/registry/registry_forensics_example.golden',
							label: 'Its recorded output'
						},
						{
							path: 'examples/data/offline_hive.json',
							label: 'The hive model it reads'
						}
					]
				}
			]
		},
		{
			id: 'intermediate',
			title: 'Run keys',
			summary: 'What starts at logon, since when, and from where: Run and RunOnce in a user’s hive.',
			stages: [
				{
					kind: 'concept',
					id: 'autoruns',
					title: 'What starts at logon',
					scene: 'RegistryTree',
					data: 'examples/data/autoruns_hive.json',
					intro:
						'Mutant’s cookbook models a compromised host’s autoruns as a hive. Step through it: this is what a persistence hunt reads.',
					steps: [
						{
							label: 'Run and RunOnce',
							text: 'Windows reads two keys at logon. Each value under Run starts a program at every logon; each value under RunOnce starts one once.',
							focus: 'keys'
						},
						{
							label: 'Commands',
							text: 'A value’s data is the command line Windows runs. Under Run, two start from the Windows and Program Files folders; one starts from a user’s AppData.',
							focus: 'values'
						},
						{
							label: 'Since when',
							text: 'A key’s last-write time is when it last changed, so the Run key dates the persistence.',
							focus: 'last_write'
						},
						{
							label: 'What was removed',
							text: 'The hive still lists a subkey of Run that was deleted.',
							focus: 'deleted_keys'
						},
						{
							label: 'In order',
							text: 'The timeline puts the AppData entry and the RunOnce cleanup fifteen seconds apart.',
							focus: 'timeline'
						}
					],
					sources: [
						{
							kind: 'mutant-file',
							ref: 'examples/data/autoruns_hive.json',
							note: 'Every key, value and time in the scene.'
						},
						{
							kind: 'mutant-file',
							ref: 'examples/workshop/RUN_SHEET_2H.md',
							note: 'The run keys deep dive: last-write time dates the persistence.'
						},
						{
							kind: 'external-spec',
							ref: 'https://learn.microsoft.com/en-us/windows/win32/setupapi/run-and-runonce-registry-keys',
							note: 'What Run and RunOnce do at logon.'
						}
					]
				},
				{
					kind: 'walkthrough',
					id: 'run-keys',
					title: 'Hunt them with Mutant',
					program: 'examples/workshop/run_keys.mut',
					simulated: SIMULATED['run_keys'],
					steps: [
						{
							lines: [1, 3],
							output: [1, 1],
							note: 'Every QUILLDROP program imports the same eighteen-line library, which knows where the evidence is and says so when it is missing.'
						},
						{
							lines: [5, 7],
							note: 'Three inputs: the user’s NTUSER.DAT, the key path to look under, and one regular expression for command lines that start from odd places. The rule is ours, not a vendor’s: change it and run again.'
						},
						{
							lines: [9, 11],
							note: 'hive_open reads a real registry hive file, not a JSON model; hive_list_keys lists the subkeys of CurrentVersion.'
						},
						{
							lines: [12, 15],
							note: 'Skip every subkey whose name does not start with Run, so both Run and RunOnce are kept.'
						},
						{
							lines: [16, 19],
							output: [2, 2],
							note: 'For each Run key: hive_key_info gives its last-write time, hive_list_values its values.'
						},
						{
							lines: [20, 22],
							output: [3, 8],
							note: 'Print each value’s name and command, and whether the odd-place rule matches it.'
						},
						{
							lines: [24, 25],
							note: 'Close the hive.'
						}
					]
				},
				{
					kind: 'build',
					id: 'build-hunt',
					title: 'Build the hunt',
					prompt: 'Put the hunt in order. One step does not belong.',
					blocks: [
						{
							id: 'open',
							label: 'Open the user’s hive',
							builtins: ['hive_open']
						},
						{
							id: 'list',
							label: 'List the subkeys of CurrentVersion',
							builtins: ['hive_list_keys']
						},
						{
							id: 'filter',
							label: 'Keep the keys whose name starts with Run',
							builtins: ['str_starts_with']
						},
						{
							id: 'info',
							label: 'Read each key’s last-write time and values',
							builtins: ['hive_key_info', 'hive_list_values']
						},
						{
							id: 'odd',
							label: 'Test each command against the odd-place rule',
							builtins: ['regex_match']
						},
						{ id: 'close', label: 'Close the hive', builtins: ['hive_close'] },
						{ id: 'delete', label: 'Delete the suspicious value' }
					],
					answer: ['open', 'list', 'filter', 'info', 'odd', 'close'],
					explain: 'An examination reads; it never changes the evidence.'
				},
				{
					kind: 'check',
					id: 'check-run-keys',
					title: 'Check yourself',
					questions: [
						{
							id: 'runonce',
							prompt:
								'Why does the program keep every key whose name starts with Run, instead of looking up Run alone?',
							choices: ['So that RunOnce is read too', 'Because Run has no values', 'To skip the deleted keys'],
							answer: 0,
							explain: 'str_starts_with(key, "Run") keeps both Run and RunOnce.'
						},
						{
							id: 'since',
							prompt: 'Which time dates the persistence?',
							choices: ['The hive file’s modified time', 'The Run key’s last-write time', 'The time the program ran'],
							answer: 1,
							explain: 'A key’s last-write time is when it last changed: when an entry was added or altered.'
						},
						{
							id: 'odd',
							prompt: 'In the autoruns hive, which value starts from a user’s AppData?',
							choices: ['SecurityHealth', 'OneDrive', 'UpdateSvc'],
							answer: 2,
							explain: 'UpdateSvc runs C:\\Users\\deploy\\AppData\\Roaming\\svc.exe, which the odd-place rule matches.'
						}
					]
				},
				{
					kind: 'resources',
					id: 'resources-run-keys',
					title: 'Run it yourself',
					files: [
						{ path: 'examples/workshop/run_keys.mut', label: 'The program' },
						{
							path: 'examples/workshop/lib/quilldrop.mut',
							label: 'The library it imports'
						},
						{
							path: 'examples/data/autoruns_hive.json',
							label: 'The autoruns hive model (cookbook recipe 7)'
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
