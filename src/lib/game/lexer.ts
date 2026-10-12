/**
 * A small, exact lexer for the fixed text of a puzzle template.
 *
 * The player never types — tiles arrive pre-lexed — so this only has to handle
 * the `fixed` segments the puzzles ship. That is still real lexing: the engine
 * splices tile tokens into these streams and reasons over actual program
 * structure rather than diffing an answer array.
 *
 * DOM-free and side-effect-free. Safe under SSR.
 */

import { MUTANT_BUILTIN_COUNT } from '$lib/mutant-pin';
import type { TokenCategory, TokenType } from './types';

export type LexToken = {
	type: TokenType;
	literal: string;
	category: TokenCategory;
	line: number;
	col: number;
	/** Set when this token came from a filled slot; null for fixed text. */
	slot: number | null;
};

/**
 * The complete reserved-keyword list from `MUTANT_LANGUAGE_REFERENCE.md`.
 * Thirteen entries — the boot sequence prints that count, and rung 6 teaches it
 * by turning every non-member (`while`, `class`, `var`) into a lookup failure.
 */
export const KEYWORDS: Readonly<Record<string, TokenType>> = {
	let: 'LET',
	fn: 'FN',
	if: 'IF',
	else: 'ELSE',
	for: 'FOR',
	return: 'RETURN',
	break: 'BREAK',
	continue: 'CONTINUE',
	struct: 'STRUCT',
	enum: 'ENUM',
	macro: 'MACRO',
	true: 'TRUE',
	false: 'FALSE'
};

export const KEYWORD_COUNT = Object.keys(KEYWORDS).length;

/** `quote` / `unquote` are macro-only forms, not general keywords. */
const MACRO_WORDS: Readonly<Record<string, TokenType>> = {
	quote: 'QUOTE',
	unquote: 'UNQUOTE'
};

/** Longest-match-first: `<=` must beat `<`, `++` must beat `+`. */
const OPERATORS: readonly (readonly [string, TokenType])[] = [
	['<=', 'LTE'],
	['>=', 'GTE'],
	['==', 'EQUALITY'],
	['!=', 'INEQUALITY'],
	['&&', 'AND'],
	['||', 'OR'],
	['+=', 'PLUS_ASSIGN'],
	['-=', 'MINUS_ASSIGN'],
	['*=', 'ASTERISK_ASSIGN'],
	['/=', 'SLASH_ASSIGN'],
	['%=', 'MODULO_ASSIGN'],
	['++', 'INCREMENT'],
	['--', 'DECREMENT'],
	['=', 'ASSIGN'],
	['+', 'PLUS'],
	['-', 'MINUS'],
	['*', 'ASTERISK'],
	['/', 'FSLASH'],
	['%', 'MODULO'],
	['\\', 'BSLASH'],
	['.', 'DOT'],
	['<', 'LT'],
	['>', 'GT'],
	['!', 'BANG'],
	[':', 'COLON'],
	[',', 'COMMA'],
	[';', 'SEMICOLON'],
	['(', 'LPAREN'],
	[')', 'RPAREN'],
	['{', 'LBRACE'],
	['}', 'RBRACE'],
	['[', 'LSQUARE'],
	[']', 'RSQUARE']
];

const PUNCTUATION: ReadonlySet<TokenType> = new Set<TokenType>([
	'COMMA',
	'SEMICOLON',
	'COLON',
	'DOT',
	'LPAREN',
	'RPAREN',
	'LBRACE',
	'RBRACE',
	'LSQUARE',
	'RSQUARE'
]);

const ASSIGNMENTS: ReadonlySet<TokenType> = new Set<TokenType>([
	'ASSIGN',
	'PLUS_ASSIGN',
	'MINUS_ASSIGN',
	'ASTERISK_ASSIGN',
	'SLASH_ASSIGN',
	'MODULO_ASSIGN'
]);

const STORAGE: ReadonlySet<TokenType> = new Set<TokenType>([
	'LET',
	'FN',
	'STRUCT',
	'ENUM',
	'MACRO'
]);

const CONTROL: ReadonlySet<TokenType> = new Set<TokenType>([
	'IF',
	'ELSE',
	'FOR',
	'RETURN',
	'BREAK',
	'CONTINUE'
]);

/**
 * The builtins this game needs to resolve. Mutant ships `BUILTIN_CATALOG_SIZE`
 * of them, generated from `builtin/metadata.go`; a full copy here would go stale, so this is the
 * pure-computation subset the puzzles touch plus the host-bound names a puzzle
 * deliberately reaches for (`fs_read` — see puzzle P2 and §5 of the design).
 */
export const BUILTINS: ReadonlySet<string> = new Set([
	'len',
	'first',
	'last',
	'rest',
	'push',
	'pop',
	'map',
	'filter',
	'reduce',
	'sort_by',
	'type_of',
	'is_null',
	'to_string',
	'to_int',
	'to_float',
	'json_parse',
	'json_stringify',
	'putln',
	'put',
	'putf',
	'str_split',
	'str_join',
	'str_trim',
	'str_upper',
	'str_lower',
	'str_contains',
	'str_replace',
	'abs',
	'min',
	'max',
	'range',
	'keys',
	'values',
	'contains',
	'fs_read',
	'fs_write',
	'fs_exists',
	'fs_list',
	'hash_sha256',
	'hex_encode',
	'hex_decode'
]);

/** The catalog size the boot sequence reports: the pinned release's own count. */
export const BUILTIN_CATALOG_SIZE = MUTANT_BUILTIN_COUNT;

export const NULL_LITERAL = 'null';

function isIdentStart(ch: string): boolean {
	return /[A-Za-z_]/.test(ch);
}

function isIdentPart(ch: string): boolean {
	return /[A-Za-z0-9_]/.test(ch);
}

function isDigit(ch: string): boolean {
	return ch >= '0' && ch <= '9';
}

/** Category for a word token, before call-position resolution. */
function wordCategory(type: TokenType, literal: string): TokenCategory {
	if (type === 'TRUE' || type === 'FALSE') return 'constant';
	if (type === 'QUOTE' || type === 'UNQUOTE') return 'macro';
	if (STORAGE.has(type)) return 'storage';
	if (CONTROL.has(type)) return 'keyword';
	if (literal === NULL_LITERAL) return 'constant';
	return 'identifier';
}

export function categoryOfType(type: TokenType, literal: string): TokenCategory {
	if (type === 'INT' || type === 'FLOAT') return 'number';
	if (type === 'STRING') return 'string';
	if (type === 'COMMENT') return 'comment';
	if (PUNCTUATION.has(type)) return 'punctuation';
	if (ASSIGNMENTS.has(type)) return 'assignment';
	if (type === 'IDENT') return wordCategory(type, literal);
	if (
		type === 'LET' ||
		type === 'FN' ||
		type === 'IF' ||
		type === 'ELSE' ||
		type === 'FOR' ||
		type === 'RETURN' ||
		type === 'BREAK' ||
		type === 'CONTINUE' ||
		type === 'STRUCT' ||
		type === 'ENUM' ||
		type === 'MACRO' ||
		type === 'TRUE' ||
		type === 'FALSE' ||
		type === 'QUOTE' ||
		type === 'UNQUOTE'
	) {
		return wordCategory(type, literal);
	}
	if (type === 'HOLE') return 'punctuation';
	return 'operator';
}

/**
 * Lex one line of fixed template text.
 *
 * `col` is 1-based and counts characters within the rendered line, so the
 * `file:line:col` diagnostics point where a human would point.
 */
export function lexFixed(text: string, line: number, startCol = 1): LexToken[] {
	const out: LexToken[] = [];
	let i = 0;
	let col = startCol;

	const push = (type: TokenType, literal: string, at: number) => {
		out.push({ type, literal, category: categoryOfType(type, literal), line, col: at, slot: null });
	};

	while (i < text.length) {
		const ch = text[i];

		if (ch === ' ' || ch === '\t') {
			i += 1;
			col += 1;
			continue;
		}

		// `//` is the only comment form anywhere in the corpus.
		if (ch === '/' && text[i + 1] === '/') {
			push('COMMENT', text.slice(i), col);
			break;
		}

		if (ch === '"') {
			let j = i + 1;
			while (j < text.length) {
				if (text[j] === '\\') {
					j += 2;
					continue;
				}
				if (text[j] === '"') {
					j += 1;
					break;
				}
				j += 1;
			}
			const literal = text.slice(i, j);
			push('STRING', literal, col);
			col += literal.length;
			i = j;
			continue;
		}

		if (isDigit(ch)) {
			let j = i;
			let float = false;
			while (j < text.length && (isDigit(text[j]) || (text[j] === '.' && !float && isDigit(text[j + 1] ?? '')))) {
				if (text[j] === '.') float = true;
				j += 1;
			}
			const literal = text.slice(i, j);
			push(float ? 'FLOAT' : 'INT', literal, col);
			col += literal.length;
			i = j;
			continue;
		}

		if (isIdentStart(ch)) {
			let j = i;
			while (j < text.length && isIdentPart(text[j])) j += 1;
			const literal = text.slice(i, j);
			const type = KEYWORDS[literal] ?? MACRO_WORDS[literal] ?? 'IDENT';
			push(type, literal, col);
			col += literal.length;
			i = j;
			continue;
		}

		const op = OPERATORS.find(([sym]) => text.startsWith(sym, i));
		if (op) {
			push(op[1], op[0], col);
			col += op[0].length;
			i += op[0].length;
			continue;
		}

		push('ILLEGAL', ch, col);
		col += 1;
		i += 1;
	}

	return out;
}

/**
 * Post-pass: an identifier immediately followed by `(` is a call, and Mutant's
 * grammar names it `entity.name.function`. Applied over the spliced stream so a
 * tile dropped into a call slot picks up the function color too.
 */
export function resolveCallPositions(tokens: LexToken[]): LexToken[] {
	for (let i = 0; i < tokens.length; i += 1) {
		const token = tokens[i];
		if (token.type !== 'IDENT') continue;
		if (tokens[i + 1]?.type === 'LPAREN') token.category = 'function';
		// `struct Point` / `enum Color` name a type, per the grammar's captures.
		const prev = tokens[i - 1];
		if (prev && (prev.type === 'STRUCT' || prev.type === 'ENUM')) token.category = 'type';
	}
	return tokens;
}

/** How the real parser names a token in `expected next token to be X` messages. */
export function describeCategory(category: TokenCategory): string {
	switch (category) {
		case 'identifier':
			return 'IDENT';
		case 'function':
			return 'IDENT';
		case 'type':
			return 'IDENT';
		case 'number':
			return 'INT';
		case 'string':
			return 'STRING';
		case 'storage':
			return 'a declaration keyword';
		case 'keyword':
			return 'a control keyword';
		case 'macro':
			return 'quote';
		case 'assignment':
			return '=';
		case 'operator':
			return 'an operator';
		case 'punctuation':
			return 'a delimiter';
		case 'constant':
			return 'a literal';
		case 'comment':
			return 'a comment';
	}
}
