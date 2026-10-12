/**
 * The local validator: a seven-rung check ladder over real program structure.
 *
 * Tiles are spliced into the pre-lexed fixed segments and the result is a
 * genuine token stream, so every diagnostic is computed from the program the
 * player actually assembled rather than diffed against an answer array. That is
 * what lets a wrong-but-legal program get a bytecode diff instead of a buzzer.
 *
 * Message text is written in the shapes the real compiler uses — `expected next
 * token to be X, but got Y instead`, `identifier not found: X`, `wrong number of
 * arguments. got=N, want=M`, and the `file:line:col: severity: msg [source]`
 * form the linter uses.
 *
 * Runs on every drop: O(n) over at most ~70 tokens with two structural passes.
 * DOM-free. Safe under SSR.
 */

import { diffBytecode, emitBytecode } from './bytecode';
import { BUILTINS, describeCategory, lexFixed, resolveCallPositions, type LexToken } from './lexer';
import type { Diagnostic, Puzzle, SlotSpec, Stage, Tile, TokenType, ValidationResult } from './types';

const FILENAME = 'codebreaker.mut';
const INDENT_WIDTH = 4;

/** Arity of the pure-computation builtins the puzzles can reach. */
const ARITY: Readonly<Record<string, { min: number; max: number }>> = {
	len: { min: 1, max: 1 },
	first: { min: 1, max: 1 },
	last: { min: 1, max: 1 },
	rest: { min: 1, max: 1 },
	push: { min: 2, max: 2 },
	map: { min: 2, max: 3 },
	filter: { min: 2, max: 3 },
	reduce: { min: 3, max: 3 },
	sort_by: { min: 2, max: 2 },
	type_of: { min: 1, max: 1 },
	is_null: { min: 1, max: 1 },
	to_string: { min: 1, max: 1 },
	json_parse: { min: 1, max: 1 },
	json_stringify: { min: 1, max: 1 },
	putln: { min: 1, max: Number.POSITIVE_INFINITY },
	putf: { min: 1, max: Number.POSITIVE_INFINITY },
	str_split: { min: 2, max: 2 }
};

/** Builtins whose sole argument must be a sequence, not a number. */
const SEQUENCE_ARG = new Set(['len', 'first', 'last', 'rest']);

const CLOSERS: Partial<Record<TokenType, TokenType>> = {
	LPAREN: 'RPAREN',
	LBRACE: 'RBRACE',
	LSQUARE: 'RSQUARE'
};

const OPENERS: Partial<Record<TokenType, TokenType>> = {
	RPAREN: 'LPAREN',
	RBRACE: 'LBRACE',
	RSQUARE: 'LSQUARE'
};

const CLOSER_LITERAL: Partial<Record<TokenType, string>> = {
	RPAREN: ')',
	RBRACE: '}',
	RSQUARE: ']'
};

export type Fills = readonly (Tile | null)[];

// ---------------------------------------------------------------------------
// Stream construction
// ---------------------------------------------------------------------------

/**
 * Splice the filled tiles into the template's fixed text.
 *
 * A tile's literal is lexed rather than assumed to be one token, so compound
 * tiles like `i = i + 1` participate in structure exactly as their characters do.
 */
export function buildStream(puzzle: Puzzle, fills: Fills): LexToken[] {
	const tokens: LexToken[] = [];
	let lastLine = 1;
	let lastCol = 1;

	for (const line of puzzle.lines) {
		let col = 1;
		for (const segment of line.segments) {
			if (segment.kind === 'indent') {
				col += segment.depth * INDENT_WIDTH;
				continue;
			}
			if (segment.kind === 'fixed') {
				tokens.push(...lexFixed(segment.text, line.n, col));
				col += segment.text.length;
				continue;
			}

			const spec = puzzle.slots.find((candidate) => candidate.index === segment.index);
			const tile = fills[segment.index] ?? null;
			if (tile) {
				const lexed = lexFixed(tile.literal, line.n, col);
				for (const token of lexed) token.slot = segment.index;
				tokens.push(...lexed);
				col += tile.literal.length;
			} else {
				tokens.push({
					type: 'HOLE',
					literal: '',
					category: 'punctuation',
					line: line.n,
					col,
					slot: segment.index
				});
				col += spec?.width ?? 2;
			}
		}
		lastLine = line.n;
		lastCol = col;
	}

	tokens.push({
		type: 'EOF',
		literal: 'EOF',
		category: 'punctuation',
		line: lastLine,
		col: lastCol,
		slot: null
	});

	return resolveCallPositions(tokens);
}

/** Skip holes and comments — the parser never sees either. */
function meaningfulAfter(tokens: readonly LexToken[], index: number): LexToken | null {
	for (let i = index + 1; i < tokens.length; i += 1) {
		const token = tokens[i];
		if (token.type === 'HOLE' || token.type === 'COMMENT') continue;
		return token;
	}
	return null;
}

function meaningfulBefore(tokens: readonly LexToken[], index: number): LexToken | null {
	for (let i = index - 1; i >= 0; i -= 1) {
		const token = tokens[i];
		if (token.type === 'HOLE' || token.type === 'COMMENT') continue;
		return token;
	}
	return null;
}

// ---------------------------------------------------------------------------
// Structural pass
// ---------------------------------------------------------------------------

type BraceKind = 'if' | 'else' | 'for' | 'fn' | 'macro' | 'struct' | 'enum' | 'literal' | 'block';

type Structure = {
	/** Index of the matching partner for every bracket token. */
	match: Map<number, number>;
	/** Kind of every `{`, keyed by the index of the opening token. */
	braceKind: Map<number, BraceKind>;
	/** Enclosing `for` blocks at each token index. */
	loopDepth: number[];
	/** Enclosing `macro` bodies at each token index. */
	macroDepth: number[];
	/** Enclosing brace count at each token index. */
	braceDepth: number[];
	/** Kind of the innermost enclosing brace, or null at top level. */
	innerKind: (BraceKind | null)[];
	/** The first unbalanced bracket, if any. */
	imbalance: { index: number; expected: TokenType | null } | null;
};

function classifyBrace(tokens: readonly LexToken[], index: number, match: Map<number, number>): BraceKind {
	const prev = meaningfulBefore(tokens, index);
	if (!prev) return 'block';

	if (prev.type === 'ELSE') return 'else';

	if (prev.type === 'RPAREN') {
		const prevIndex = tokens.indexOf(prev);
		const open = match.get(prevIndex);
		const head = open === undefined ? null : meaningfulBefore(tokens, open);
		if (head?.type === 'IF') return 'if';
		if (head?.type === 'FOR') return 'for';
		if (head?.type === 'FN') return 'fn';
		if (head?.type === 'MACRO') return 'macro';
		return 'block';
	}

	if (prev.type === 'IDENT') {
		const prevIndex = tokens.indexOf(prev);
		const head = meaningfulBefore(tokens, prevIndex);
		if (head?.type === 'STRUCT') return 'struct';
		if (head?.type === 'ENUM') return 'enum';
		return 'literal';
	}

	return 'block';
}

function analyze(tokens: readonly LexToken[]): Structure {
	const match = new Map<number, number>();
	const braceKind = new Map<number, BraceKind>();
	const loopDepth: number[] = new Array(tokens.length).fill(0);
	const macroDepth: number[] = new Array(tokens.length).fill(0);
	const braceDepth: number[] = new Array(tokens.length).fill(0);
	const innerKind: (BraceKind | null)[] = new Array(tokens.length).fill(null);

	const stack: { index: number; type: TokenType; kind: BraceKind | null }[] = [];
	let imbalance: Structure['imbalance'] = null;

	for (let i = 0; i < tokens.length; i += 1) {
		const token = tokens[i];

		if (token.type === 'LPAREN' || token.type === 'LSQUARE') {
			stack.push({ index: i, type: token.type, kind: null });
		} else if (token.type === 'LBRACE') {
			const kind = classifyBrace(tokens, i, match);
			braceKind.set(i, kind);
			stack.push({ index: i, type: token.type, kind });
		} else if (token.type === 'RPAREN' || token.type === 'RBRACE' || token.type === 'RSQUARE') {
			const wanted = OPENERS[token.type];
			const top = stack[stack.length - 1];
			if (!top || top.type !== wanted) {
				if (!imbalance) {
					imbalance = { index: i, expected: top ? (CLOSERS[top.type] ?? null) : null };
				}
			} else {
				stack.pop();
				match.set(top.index, i);
				match.set(i, top.index);
			}
		}

		// Record enclosure *after* an opener is pushed and *before* a closer pops,
		// so the braces themselves read as inside their own block.
		braceDepth[i] = stack.filter((entry) => entry.type === 'LBRACE').length;
		loopDepth[i] = stack.filter((entry) => entry.kind === 'for').length;
		macroDepth[i] = stack.filter((entry) => entry.kind === 'macro').length;
		const innermost = [...stack].reverse().find((entry) => entry.type === 'LBRACE');
		innerKind[i] = innermost?.kind ?? null;
	}

	if (!imbalance && stack.length > 0) {
		const top = stack[stack.length - 1];
		imbalance = { index: tokens.length - 1, expected: CLOSERS[top.type] ?? null };
	}

	return { match, braceKind, loopDepth, macroDepth, braceDepth, innerKind, imbalance };
}

// ---------------------------------------------------------------------------
// Diagnostics helpers
// ---------------------------------------------------------------------------

function diagnostic(
	rung: Diagnostic['rung'],
	stage: Stage,
	severity: Diagnostic['severity'],
	source: Diagnostic['source'],
	text: string,
	token: { line: number; col: number },
	slot: number | null
): Diagnostic {
	return { rung, stage, severity, source, text, line: token.line, col: token.col, slot };
}

/** How the parser names what it wanted in this slot. */
function expectation(puzzle: Puzzle, spec: SlotSpec): string {
	if (spec.accepts.length > 1) {
		const names: string[] = [];
		for (const category of spec.accepts) {
			const name = describeCategory(category);
			if (!names.includes(name)) names.push(name);
		}
		return names.join(' or ');
	}
	if (spec.expectType === 'IDENT') return 'IDENT';
	return puzzle.solution[spec.index] ?? describeCategory(spec.accepts[0]);
}

function firstTokenOfSlot(tokens: readonly LexToken[], slot: number): LexToken | null {
	return tokens.find((token) => token.slot === slot) ?? null;
}

// ---------------------------------------------------------------------------
// The ladder
// ---------------------------------------------------------------------------

/** Rung 1 — the tile's category is not one this slot can hold. */
function rungLegality(puzzle: Puzzle, fills: Fills, tokens: readonly LexToken[]): Diagnostic[] {
	const found: Diagnostic[] = [];
	for (const spec of puzzle.slots) {
		const tile = fills[spec.index];
		if (!tile) continue;
		if (spec.accepts.includes(tile.category)) continue;

		const at = firstTokenOfSlot(tokens, spec.index) ?? { line: 1, col: 1 };
		found.push(
			diagnostic(
				'legality',
				'lex',
				'error',
				'mutant-parser',
				`expected next token to be ${expectation(puzzle, spec)}, but got ${tile.literal} instead`,
				at,
				spec.index
			)
		);
	}
	return found;
}

/** Rung 2 — brackets do not nest. */
function rungBalance(tokens: readonly LexToken[], structure: Structure): Diagnostic[] {
	if (!structure.imbalance) return [];
	const { index, expected } = structure.imbalance;
	const token = tokens[index] ?? tokens[tokens.length - 1];
	const wanted = expected ? (CLOSER_LITERAL[expected] ?? String(expected)) : 'EOF';
	const got = token.type === 'EOF' ? 'EOF' : token.literal;
	return [
		diagnostic(
			'balance',
			'parse',
			'error',
			'mutant-parser',
			`expected next token to be ${wanted}, but got ${got} instead`,
			token,
			token.slot
		)
	];
}

/**
 * Rung 3 — a statement whose value is a block still needs its semicolon.
 *
 * This is the language's signature rule (`MUTANT_LANGUAGE_REFERENCE.md`, Notes)
 * and it is the one check that earns the linter's own message shape.
 */
function rungTerminator(tokens: readonly LexToken[], structure: Structure): Diagnostic[] {
	const found: Diagnostic[] = [];
	const STATEMENT_BLOCK = new Set<BraceKind>(['if', 'else', 'for', 'struct', 'enum']);
	// A `}` sitting in expression position is an argument or an element, not a
	// statement — those are terminated by whatever encloses them.
	const EXPRESSION_FOLLOW = new Set<TokenType>([
		'SEMICOLON',
		'ELSE',
		'RPAREN',
		'RSQUARE',
		'COMMA',
		'DOT'
	]);

	for (const [openIndex, kind] of structure.braceKind) {
		if (!STATEMENT_BLOCK.has(kind)) continue;
		const closeIndex = structure.match.get(openIndex);
		if (closeIndex === undefined) continue;

		const next = meaningfulAfter(tokens, closeIndex);
		if (next && EXPRESSION_FOLLOW.has(next.type)) continue;

		const close = tokens[closeIndex];
		// Point at the character position the `;` should occupy, and blame the
		// empty slot sitting there if there is one.
		const hole = tokens[closeIndex + 1];
		const slot = hole && hole.type === 'HOLE' ? hole.slot : null;
		const col = close.col + close.literal.length;

		found.push(
			diagnostic(
				'terminator',
				'parse',
				'warning',
				'mutant-lint',
				`${FILENAME}:${close.line}:${col}: warning: missing semicolon after block statement [mutant-lint]`,
				{ line: close.line, col },
				slot
			)
		);
	}

	return found.sort((a, b) => a.line - b.line || a.col - b.col);
}

/** Rung 4 — the token is legal, but not here. */
/**
 * `macroSlotPending` is true while the slot that is supposed to hold `macro` is
 * still empty. Without it, an untouched P8 board would open with
 * `unquote is only valid inside a macro body` — the hole *is* the missing macro
 * keyword, so the diagnostic would be blaming the player for the scaffold. Once
 * that slot is filled with anything (`fn`, say) the check runs again and fires
 * for real, which is exactly the lesson that puzzle is built around.
 */
function rungPosition(
	tokens: readonly LexToken[],
	structure: Structure,
	macroSlotPending: boolean
): Diagnostic[] {
	const found: Diagnostic[] = [];

	for (let i = 0; i < tokens.length; i += 1) {
		const token = tokens[i];

		if (token.type === 'ELSE') {
			const prev = meaningfulBefore(tokens, i);
			if (!prev || prev.type !== 'RBRACE') {
				found.push(
					diagnostic(
						'position',
						'parse',
						'error',
						'mutant-parser',
						'no prefix parse function for else found',
						token,
						token.slot
					)
				);
			}
			continue;
		}

		if (token.type === 'BREAK' || token.type === 'CONTINUE') {
			if (structure.loopDepth[i] === 0) {
				found.push(
					diagnostic(
						'position',
						'parse',
						'error',
						'mutant-parser',
						token.type === 'BREAK' ? 'no loop to break' : 'no loop to continue',
						token,
						token.slot
					)
				);
			}
			continue;
		}

		if (token.type === 'MACRO' && structure.braceDepth[i] > 0) {
			found.push(
				diagnostic(
					'position',
					'parse',
					'error',
					'mutant-parser',
					'macro definitions are only allowed at the top level',
					token,
					token.slot
				)
			);
			continue;
		}

		if (
			!macroSlotPending &&
			(token.type === 'QUOTE' || token.type === 'UNQUOTE') &&
			structure.macroDepth[i] === 0
		) {
			found.push(
				diagnostic(
					'position',
					'parse',
					'error',
					'mutant-parser',
					`${token.literal} is only valid inside a macro body`,
					token,
					token.slot
				)
			);
		}
	}

	return found;
}

/** Split a call's arguments at the top level of its own parentheses. */
function countArguments(tokens: readonly LexToken[], open: number, close: number): number {
	let depth = 0;
	let count = 0;
	let sawToken = false;

	for (let i = open + 1; i < close; i += 1) {
		const token = tokens[i];
		if (token.type === 'HOLE' || token.type === 'COMMENT') continue;
		if (token.type === 'LPAREN' || token.type === 'LBRACE' || token.type === 'LSQUARE') depth += 1;
		else if (token.type === 'RPAREN' || token.type === 'RBRACE' || token.type === 'RSQUARE') depth -= 1;
		else if (token.type === 'COMMA' && depth === 0) {
			count += 1;
			continue;
		}
		sawToken = true;
	}

	return sawToken ? count + 1 : 0;
}

/** Rung 5 — the call is well-formed but the builtin does not take that. */
function rungArity(tokens: readonly LexToken[], structure: Structure): Diagnostic[] {
	const found: Diagnostic[] = [];

	for (let i = 0; i < tokens.length; i += 1) {
		const token = tokens[i];
		if (token.type !== 'IDENT') continue;
		if (token.slot === null) continue; // only blame calls the player placed
		const open = i + 1;
		if (tokens[open]?.type !== 'LPAREN') continue;
		const close = structure.match.get(open);
		if (close === undefined) continue;

		const spec = ARITY[token.literal];
		if (!spec) continue;

		const got = countArguments(tokens, open, close);
		if (got < spec.min || got > spec.max) {
			const want = spec.max === Number.POSITIVE_INFINITY ? `${spec.min}+` : spec.min === spec.max ? `${spec.min}` : `${spec.min}..${spec.max}`;
			found.push(
				diagnostic(
					'arity',
					'compile',
					'error',
					'compiler',
					`wrong number of arguments. got=${got}, want=${want}`,
					token,
					token.slot
				)
			);
			continue;
		}

		if (SEQUENCE_ARG.has(token.literal) && got === 1) {
			const arg = tokens[open + 1];
			const after = tokens[open + 2];
			const isBareNumber =
				arg !== undefined && (arg.type === 'INT' || arg.type === 'FLOAT') && after?.type === 'RPAREN';
			if (isBareNumber) {
				found.push(
					diagnostic(
						'arity',
						'compile',
						'error',
						'compiler',
						`argument to \`${token.literal}\` must be STRING or ARRAY, got ${arg.type === 'INT' ? 'INTEGER' : 'FLOAT'}`,
						token,
						token.slot
					)
				);
			}
		}
	}

	return found;
}

/**
 * Rung 6 — the name does not resolve.
 *
 * The richest rung: `while`, `class`, `print` and `var` are not Mutant, so the
 * compiler answers the way it answers any unknown name, and the thirteen-keyword
 * list gets learned through the failure rather than from a table.
 *
 * Only names the player placed are reported. Fixed template text is by
 * construction resolvable, and blaming it would just be noise.
 */
function rungResolve(tokens: readonly LexToken[], structure: Structure): Diagnostic[] {
	const defined = new Set<string>();

	for (let i = 0; i < tokens.length; i += 1) {
		const token = tokens[i];

		if (token.type === 'LET') {
			let cursor = i + 1;
			while (tokens[cursor]) {
				const candidate = tokens[cursor];
				if (candidate.type === 'IDENT') {
					defined.add(candidate.literal);
					cursor += 1;
					if (tokens[cursor]?.type === 'COMMA') {
						cursor += 1;
						continue;
					}
				}
				break;
			}
			continue;
		}

		if (token.type === 'STRUCT' || token.type === 'ENUM') {
			const name = tokens[i + 1];
			if (name?.type === 'IDENT') defined.add(name.literal);
			continue;
		}

		if (token.type === 'FN' || token.type === 'MACRO') {
			const open = i + 1;
			if (tokens[open]?.type !== 'LPAREN') continue;
			const close = structure.match.get(open);
			if (close === undefined) continue;
			for (let j = open + 1; j < close; j += 1) {
				if (tokens[j].type === 'IDENT') defined.add(tokens[j].literal);
			}
		}
	}

	const found: Diagnostic[] = [];

	for (let i = 0; i < tokens.length; i += 1) {
		const token = tokens[i];
		if (token.type !== 'IDENT') continue;
		if (token.slot === null) continue;

		// Member names, field keys and declaration sites are not lookups.
		const prev = meaningfulBefore(tokens, i);
		if (prev?.type === 'DOT') continue;
		if (prev?.type === 'LET' || prev?.type === 'STRUCT' || prev?.type === 'ENUM') continue;
		if (tokens[i + 1]?.type === 'COLON') continue;

		const enclosing = structure.innerKind[i];
		if (enclosing === 'struct' || enclosing === 'enum') continue;

		if (defined.has(token.literal) || BUILTINS.has(token.literal)) continue;

		found.push(
			diagnostic(
				'resolve',
				'compile',
				'error',
				'compiler',
				`identifier not found: ${token.literal}`,
				token,
				token.slot
			)
		);
	}

	return found;
}

/** Rung 7a — is this fill the answer, or an accepted alternate? */
function isAccepted(puzzle: Puzzle, index: number, literal: string): boolean {
	if (puzzle.solution[index] === literal) return true;
	return puzzle.accept?.[index]?.includes(literal) ?? false;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function validate(puzzle: Puzzle, fills: Fills): ValidationResult {
	const tokens = buildStream(puzzle, fills);
	const structure = analyze(tokens);

	const total = puzzle.slots.length;
	const filled = puzzle.slots.filter((spec) => fills[spec.index] != null).length;
	const complete = filled === total;

	// A hole in the slot that declares the macro cannot be read as "quote used
	// outside a macro body" — see `rungPosition`.
	const macroSlotPending = puzzle.slots.some(
		(spec) => spec.expectType === 'MACRO' && fills[spec.index] == null
	);

	const warnings: Diagnostic[] = [];
	let errors: Diagnostic[] = [];

	const ladder: (() => Diagnostic[])[] = [
		() => rungLegality(puzzle, fills, tokens),
		() => rungBalance(tokens, structure),
		() => rungTerminator(tokens, structure),
		() => rungPosition(tokens, structure, macroSlotPending),
		// Rungs 5 and 6 reason about whole calls and whole scopes; a hole would
		// make them miscount arguments and lose declarations, so they wait until
		// the board is complete rather than inventing failures.
		() => (complete ? rungArity(tokens, structure) : []),
		() => (complete ? rungResolve(tokens, structure) : [])
	];

	for (const rung of ladder) {
		const found = rung();
		for (const item of found) {
			if (item.severity === 'warning') warnings.push(item);
		}
		const failures = found.filter((item) => item.severity === 'error');
		if (failures.length > 0) {
			errors = failures;
			break;
		}
	}

	if (errors.length > 0) {
		const diagnostics = [...errors, ...warnings].slice(0, 3);
		return { solved: false, filled, total, diagnostics, reached: diagnostics[0].stage };
	}

	if (warnings.length > 0) {
		const diagnostics = warnings.slice(0, 3);
		return { solved: false, filled, total, diagnostics, reached: 'parse' };
	}

	if (!complete) {
		return { solved: false, filled, total, diagnostics: [], reached: 'lex' };
	}

	// Rung 7 — well-formed. Either it is the answer, or it is a different program.
	// The toy emitter in `bytecode.ts` decides equivalence, but its listing is
	// never shown: it is not Mutant's compiler output, and nothing printed here
	// may claim to be (the site's traceability rule). Re-enable a listing only
	// once Mutant can disassemble its own chunks.
	const literals = puzzle.slots.map((spec) => fills[spec.index]?.literal ?? '');
	const exact = puzzle.slots.every((spec) => isAccepted(puzzle, spec.index, literals[spec.index]));

	if (exact) {
		return {
			solved: true,
			filled,
			total,
			diagnostics: [
				diagnostic(
					'order',
					'vm',
					'ok',
					'vm',
					`program compiled — ${puzzle.expectedOutput.split('\n').length} line(s) of output`,
					{ line: puzzle.lines.length, col: 1 },
					null
				)
			],
			reached: 'vm'
		};
	}

	const want = emitBytecode(buildStream(puzzle, puzzle.solution.map((literal, index) => ({
		id: `solution:${index}`,
		literal,
		category: puzzle.slots[index]?.accepts[0] ?? 'identifier',
		type: puzzle.slots[index]?.expectType ?? 'IDENT',
		decoy: false
	}))));
	const got = emitBytecode(tokens);

	if (!diffBytecode(want, got)) {
		// The two chunks are identical: an equivalent program. Accept it.
		return {
			solved: true,
			filled,
			total,
			diagnostics: [
				diagnostic(
					'order',
					'vm',
					'ok',
					'vm',
					'program compiled — equivalent to the reference',
					{ line: puzzle.lines.length, col: 1 },
					null
				)
			],
			reached: 'vm'
		};
	}

	// Blame the first slot that differs, so the board can outline it.
	const wrong = puzzle.slots.find((spec) => !isAccepted(puzzle, spec.index, literals[spec.index]));
	const at = wrong ? (firstTokenOfSlot(tokens, wrong.index) ?? { line: 1, col: 1 }) : { line: 1, col: 1 };

	return {
		solved: false,
		filled,
		total,
		diagnostics: [
			diagnostic(
				'order',
				'bytecode',
				'error',
				'compiler',
				'well-formed, but not the program this objective asks for: check the order of the tokens',
				at,
				wrong?.index ?? null
			)
		],
		reached: 'bytecode'
	};
}

/** The assembled program text, for RECOMPILE and for the terminal pane. */
export function assembledSource(puzzle: Puzzle, fills: Fills): string {
	return puzzle.lines
		.map((line) =>
			line.segments
				.map((segment) => {
					if (segment.kind === 'indent') return ' '.repeat(segment.depth * INDENT_WIDTH);
					if (segment.kind === 'fixed') return segment.text;
					const spec = puzzle.slots.find((candidate) => candidate.index === segment.index);
					return fills[segment.index]?.literal ?? '_'.repeat(spec?.width ?? 2);
				})
				.join('')
		)
		.join('\n');
}
