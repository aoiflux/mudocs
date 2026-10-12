/**
 * Module T · Triage toolkit. Input-free snippets from examples/workshop/, each
 * with a recorded output.
 */
import type { WorkshopModuleSpec } from '../schema';

export const spec: WorkshopModuleSpec = {
	id: 'triage',
	pin: 'v2.6.0',
	title: 'Triage toolkit',
	lede: 'Small questions that come up in every case: what does this blob decode to, is this address ours, is that domain pretending to be us, what is in this token.',
	relatedDocs: ['cookbook'],
	tiers: [
		{
			id: 'beginner',
			title: 'Decode and classify',
			summary: 'Peel encodings off a payload, then sort addresses into internal and external.',
			stages: [
				{
					kind: 'walkthrough',
					id: 'decode-payload',
					title: 'Decode a payload',
					program: 'examples/workshop/decode_payload.mut',
					golden: 'examples/workshop/decode_payload.golden',
					steps: [
						{
							lines: [1, 4],
							note: 'One rule worth remembering: encoders return a string; decoders return a value and an error, because input can be malformed.'
						},
						{
							lines: [6, 11],
							output: [1, 2],
							note: 'To have something to decode, the program encodes a command with base64_encode first.'
						},
						{
							lines: [13, 14],
							output: [3, 3],
							note: 'base64_decode returns bytes and an error; to_string turns the bytes into text you can read.'
						},
						{
							lines: [16, 19],
							output: [4, 5],
							note: 'hex works the same way: hex_encode returns a string, hex_decode returns bytes and an error.'
						}
					]
				},
				{
					kind: 'build',
					id: 'build-decode',
					title: 'Build it',
					prompt: 'You found an encoded blob in a script. Put the steps to read it in order. One step does not belong.',
					blocks: [
						{ id: 'find', label: 'Take the encoded blob' },
						{
							id: 'decode',
							label: 'Decode it, keeping the error',
							builtins: ['base64_decode']
						},
						{
							id: 'text',
							label: 'Turn the bytes into text',
							builtins: ['to_string']
						},
						{ id: 'print', label: 'Print what it says', builtins: ['putln'] },
						{
							id: 'encode',
							label: 'Encode it once more',
							builtins: ['base64_encode']
						}
					],
					answer: ['find', 'decode', 'text', 'print'],
					explain: 'Decoding gives bytes; reading needs text.'
				},
				{
					kind: 'concept',
					id: 'cidr',
					title: 'What a /29 is',
					scene: 'CidrBlock',
					values: { cidr: '192.168.1.0/29' },
					intro: 'The block the next program expands, drawn as its 32 bits.',
					steps: [
						{
							label: 'The address',
							text: 'An IPv4 address is 32 bits, written as four 8-bit numbers.',
							focus: 'address'
						},
						{
							label: 'The prefix',
							text: '/29 fixes the first 29 bits. Every address in the block shares them.',
							focus: 'prefix'
						},
						{
							label: 'The hosts',
							text: 'The last 3 bits vary: 2³ = 8 addresses.',
							focus: 'hosts'
						}
					],
					sources: [
						{
							kind: 'mutant-file',
							ref: 'examples/workshop/ip_triage.mut',
							note: 'The block, line 15.'
						},
						{
							kind: 'external-spec',
							ref: 'https://www.rfc-editor.org/rfc/rfc4632',
							note: 'CIDR notation.'
						}
					]
				},
				{
					kind: 'walkthrough',
					id: 'ip-triage',
					title: 'Triage addresses',
					program: 'examples/workshop/ip_triage.mut',
					golden: 'examples/workshop/ip_triage.golden',
					steps: [
						{
							lines: [1, 8],
							output: [1, 1],
							note: 'Four addresses to sort into internal and external.'
						},
						{
							lines: [9, 12],
							output: [2, 5],
							note: 'ip_is_private returns a plain boolean: true for private, loopback and link-local ranges.'
						},
						{
							lines: [14, 14],
							output: [6, 6],
							note: 'ip_in_cidr asks whether an address falls inside a block.'
						},
						{
							lines: [15, 15],
							output: [7, 7],
							note: 'cidr_hosts lists every address in a block: the eight of the /29.'
						}
					]
				},
				{
					kind: 'check',
					id: 'check-beginner',
					title: 'Check yourself',
					questions: [
						{
							id: 'pair',
							prompt: 'Which of these returns a value and an error?',
							choices: ['base64_encode', 'base64_decode', 'hex_encode'],
							answer: 1,
							explain: 'Decoders can fail on malformed input, so they return an error too.'
						},
						{
							id: 'private',
							prompt: 'Which address did ip_is_private call private?',
							choices: ['8.8.8.8', '1.1.1.1', '192.168.1.20'],
							answer: 2,
							explain: '192.168.1.20 is in 192.168.0.0/16, a private range.'
						},
						{
							id: 'hosts',
							prompt: 'How many addresses does 192.168.1.0/29 hold?',
							choices: ['8', '29', '32'],
							answer: 0,
							explain: '32 − 29 = 3 host bits, and 2³ = 8.'
						}
					]
				}
			]
		},
		{
			id: 'intermediate',
			title: 'Look-alikes and tokens',
			summary: 'Score domains for how close they are to a brand, and read a JWT without trusting it.',
			stages: [
				{
					kind: 'walkthrough',
					id: 'typosquat',
					title: 'Spot look-alike domains',
					program: 'examples/workshop/typosquat.mut',
					golden: 'examples/workshop/typosquat.golden',
					steps: [
						{
							lines: [1, 9],
							output: [1, 1],
							note: 'The brand to protect, and the domains seen in traffic.'
						},
						{
							lines: [11, 13],
							note: 'Two scores per domain. text_levenshtein counts the edits between two strings; text_jaro_winkler gives a similarity from 0 to 1.'
						},
						{
							lines: [15, 21],
							output: [2, 6],
							note: 'Close to the brand but not the brand: a similarity above 0.85 for any other name is flagged.'
						}
					]
				},
				{
					kind: 'walkthrough',
					id: 'jwt',
					title: 'Read a JWT',
					program: 'examples/workshop/jwt_inspect.mut',
					golden: 'examples/workshop/jwt_inspect.golden',
					steps: [
						{
							lines: [1, 9],
							output: [1, 1],
							note: 'A token is three base64url parts joined by dots: header, claims, signature.'
						},
						{
							lines: [11, 19],
							output: [2, 5],
							note: 'jwt_decode reads the header and claims without checking the signature, so verified is always false. Reading a token is not trusting it.'
						}
					]
				},
				{
					kind: 'check',
					id: 'check-intermediate',
					title: 'Check yourself',
					questions: [
						{
							id: 'distance',
							prompt: 'A look-alike differs from the brand by one swapped character. What is its Levenshtein distance?',
							choices: ['0', '1', '0.96'],
							answer: 1,
							explain: 'One substitution is one edit.'
						},
						{
							id: 'verified',
							prompt: 'What does jwt_decode’s verified field tell you?',
							choices: [
								'That the signature is valid',
								'Nothing: it is always false, because decode never verifies',
								'That the token has expired'
							],
							answer: 1,
							explain: 'jwt_decode decodes; it does not verify.'
						}
					]
				},
				{
					kind: 'resources',
					id: 'resources',
					title: 'Run them yourself',
					files: [
						{
							path: 'examples/workshop/decode_payload.mut',
							label: 'decode_payload'
						},
						{ path: 'examples/workshop/ip_triage.mut', label: 'ip_triage' },
						{ path: 'examples/workshop/typosquat.mut', label: 'typosquat' },
						{ path: 'examples/workshop/jwt_inspect.mut', label: 'jwt_inspect' },
						{ path: 'examples/workshop/README.md', label: 'More snippets' }
					]
				}
			]
		}
	]
};
