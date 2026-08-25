/**
 * A minimal TextMate grammar for the Mutant language.
 *
 * Shiki ships no grammar for Mutant, and Mutant is the one language this site
 * exists to document — leaving its 23 fences as the only unhighlighted code on
 * the site would be a strange outcome. Everything encoded here is taken from
 * `docs/MUTANT_LANGUAGE_REFERENCE.md` rather than guessed:
 *
 *   - the keyword list is its "Reserved Keywords" section, verbatim and complete
 *   - `quote` / `unquote` come from its macro section
 *   - `//` is the only comment form that appears anywhere in the corpus
 *   - strings are "simple quoted strings" with limited escapes, per its Notes
 *
 * Builtins are matched structurally (any identifier in call position) instead of
 * by name. There are 409 of them and the catalog is generated from
 * `builtin/metadata.go`, so a hardcoded list here would go stale the moment one
 * is added — the structural rule never does.
 */

const KEYWORD_CONTROL = ['break', 'continue', 'else', 'for', 'if', 'return'];
const KEYWORD_DECL = ['enum', 'fn', 'let', 'macro', 'struct'];
const CONSTANTS = ['false', 'null', 'true'];

// Identifiers in call position, minus every keyword that is also followed by a
// paren — `if (`, `for (`, `macro (` must not read as function calls.
const NOT_KEYWORD = `(?!(?:${[...KEYWORD_CONTROL, ...KEYWORD_DECL, 'quote', 'unquote'].join('|')})\\b)`;

export const mutantGrammar = {
	name: 'mutant',
	scopeName: 'source.mutant',
	patterns: [
		{ include: '#comment' },
		{ include: '#string' },
		{ include: '#number' },
		{ include: '#type-declaration' },
		{ include: '#function-declaration' },
		{ include: '#keyword' },
		{ include: '#constant' },
		{ include: '#call' },
		{ include: '#operator' }
	],
	repository: {
		comment: {
			match: '//.*$',
			name: 'comment.line.double-slash.mutant'
		},
		string: {
			begin: '"',
			end: '"',
			name: 'string.quoted.double.mutant',
			patterns: [{ match: '\\\\.', name: 'constant.character.escape.mutant' }]
		},
		number: {
			match: '\\b\\d+(?:\\.\\d+)?\\b',
			name: 'constant.numeric.mutant'
		},
		// `struct Point { x, y }` / `enum Color { Red, Green, Blue }`
		'type-declaration': {
			match: '\\b(struct|enum)\\s+([A-Za-z_][A-Za-z0-9_]*)',
			captures: {
				'1': { name: 'storage.type.mutant' },
				'2': { name: 'entity.name.type.mutant' }
			}
		},
		// `let load = fn(path) {` — name the binding as the function it is.
		'function-declaration': {
			match: '\\b(let)\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*(=)\\s*(fn|macro)\\b',
			captures: {
				'1': { name: 'storage.type.mutant' },
				'2': { name: 'entity.name.function.mutant' },
				'3': { name: 'keyword.operator.assignment.mutant' },
				'4': { name: 'storage.type.function.mutant' }
			}
		},
		keyword: {
			patterns: [
				{ match: `\\b(?:${KEYWORD_CONTROL.join('|')})\\b`, name: 'keyword.control.mutant' },
				{ match: `\\b(?:${KEYWORD_DECL.join('|')})\\b`, name: 'storage.type.mutant' },
				{ match: '\\b(?:quote|unquote)\\b', name: 'keyword.other.macro.mutant' }
			]
		},
		constant: {
			match: `\\b(?:${CONSTANTS.join('|')})\\b`,
			name: 'constant.language.mutant'
		},
		call: {
			match: `\\b${NOT_KEYWORD}([A-Za-z_][A-Za-z0-9_]*)\\s*(?=\\()`,
			captures: { '1': { name: 'entity.name.function.mutant' } }
		},
		operator: {
			match: '\\+\\+|--|[-+*/%]=|[=!<>]=|&&|\\|\\||[-+*/%=<>!&|]',
			name: 'keyword.operator.mutant'
		}
	}
};
