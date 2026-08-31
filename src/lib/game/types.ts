/**
 * Mutant Codebreaker — shared types.
 *
 * Zero runtime code, zero DOM. Imported by SSR-safe modules (`lexer`, `engine`,
 * `puzzles`, `bytecode`) as well as by the browser-only ones.
 *
 * `TokenCategory` is the TextMate scope set from `src/lib/server/mutant-grammar.ts`
 * with the `.mutant` suffix dropped, plus `identifier` and `punctuation`. Reusing
 * the docs' own scope names means the game's token colors and Shiki's highlighting
 * of the same snippet agree by construction rather than by coincidence.
 */

export type TokenCategory =
	/** keyword.control.mutant — break continue else for if return */
	| 'keyword'
	/** storage.type.mutant — enum fn let macro struct */
	| 'storage'
	/** entity.name.type.mutant — the name after `struct` / `enum` */
	| 'type'
	/** entity.name.function.mutant — an identifier in call position */
	| 'function'
	/** keyword.other.macro.mutant — quote unquote */
	| 'macro'
	/** keyword.operator.mutant */
	| 'operator'
	/** keyword.operator.assignment.mutant — = += -= *= /= %= */
	| 'assignment'
	/** constant.numeric.mutant */
	| 'number'
	/** constant.language.mutant — true false null */
	| 'constant'
	/** string.quoted.double.mutant */
	| 'string'
	/** comment.line.double-slash.mutant */
	| 'comment'
	/** ( ) { } [ ] , ; : . */
	| 'punctuation'
	/** a plain binding reference */
	| 'identifier';

/**
 * The token set of `github.com/aoiflux/mutant/token/token.go`, plus `HOLE` for
 * an unfilled slot. Kept as the Go constant names so diagnostics can quote them
 * the way the real parser does (`expected next token to be IDENT`).
 */
export type TokenType =
	| 'LET'
	| 'FN'
	| 'IF'
	| 'ELSE'
	| 'FOR'
	| 'RETURN'
	| 'BREAK'
	| 'CONTINUE'
	| 'STRUCT'
	| 'ENUM'
	| 'MACRO'
	| 'TRUE'
	| 'FALSE'
	| 'QUOTE'
	| 'UNQUOTE'
	| 'IDENT'
	| 'INT'
	| 'FLOAT'
	| 'STRING'
	| 'ASSIGN'
	| 'PLUS'
	| 'MINUS'
	| 'ASTERISK'
	| 'FSLASH'
	| 'MODULO'
	| 'BSLASH'
	| 'DOT'
	| 'LT'
	| 'GT'
	| 'LTE'
	| 'GTE'
	| 'BANG'
	| 'EQUALITY'
	| 'INEQUALITY'
	| 'AND'
	| 'OR'
	| 'COLON'
	| 'PLUS_ASSIGN'
	| 'MINUS_ASSIGN'
	| 'ASTERISK_ASSIGN'
	| 'SLASH_ASSIGN'
	| 'MODULO_ASSIGN'
	| 'INCREMENT'
	| 'DECREMENT'
	| 'COMMA'
	| 'SEMICOLON'
	| 'LPAREN'
	| 'RPAREN'
	| 'LBRACE'
	| 'RBRACE'
	| 'LSQUARE'
	| 'RSQUARE'
	| 'COMMENT'
	| 'ILLEGAL'
	| 'EOF'
	| 'HOLE';

/** A draggable token in the tray. */
export type Tile = {
	id: string;
	type: TokenType;
	literal: string;
	category: TokenCategory;
	/** Decoys are plausible but wrong — they exist to fire a specific rung. */
	decoy: boolean;
};

/** One piece of a puzzle line: literal text, a hole, or leading indentation. */
export type Segment =
	| { kind: 'fixed'; text: string }
	| { kind: 'slot'; index: number }
	| { kind: 'indent'; depth: number };

export type SlotSpec = {
	index: number;
	/** Categories this slot will structurally accept. Rung 1 checks membership. */
	accepts: TokenCategory[];
	expectType: TokenType;
	/** Read aloud by the assertive live region: "Slot 3 of 7, binding keyword". */
	label: string;
	/** Rendered width in `ch`, so the board does not reflow when filled. */
	width: number;
};

/** The compiler pipeline stages, in order. Drives `PipelineStrip`. */
export type Stage = 'lex' | 'parse' | 'compile' | 'bytecode' | 'vm';

export const STAGES: readonly Stage[] = ['lex', 'parse', 'compile', 'bytecode', 'vm'];

/** The seven checks, in the order `validate()` runs them. */
export type Rung =
	| 'legality'
	| 'balance'
	| 'terminator'
	| 'position'
	| 'arity'
	| 'resolve'
	| 'order';

export type Diagnostic = {
	rung: Rung;
	stage: Stage;
	severity: 'error' | 'warning' | 'info' | 'ok';
	source: 'mutant-parser' | 'mutant-lint' | 'mutant-format' | 'vm' | 'compiler';
	text: string;
	line: number;
	col: number;
	/** The slot to outline red, when the diagnostic can be attributed to one. */
	slot: number | null;
};

export type PuzzleLine = { n: number; segments: Segment[] };

export type Puzzle = {
	id: string;
	ordinal: number;
	title: string;
	brief: string;
	concept: string;
	difficulty: 1 | 2 | 3 | 4 | 5;
	lines: PuzzleLine[];
	slots: SlotSpec[];
	tray: Tile[];
	/** Literal text expected in each slot, indexed by slot index. */
	solution: string[];
	/** Alternate accepted literals per slot — both forms attested in the corpus. */
	accept?: Record<number, string[]>;
	/** The solved program, for RECOMPILE. */
	source: string;
	expectedOutput: string;
	/** False when the real browser build cannot run it (host builtins, macros). */
	wasmVerifiable: boolean;
	hints: [string, string, string];
	docHref: string;
};

/** What `validate()` returns: the first failing rung plus at most two secondaries. */
export type ValidationResult = {
	solved: boolean;
	filled: number;
	total: number;
	diagnostics: Diagnostic[];
	/** How far the pipeline got before it stopped. */
	reached: Stage;
};
