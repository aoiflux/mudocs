/**
 * The eight puzzles.
 *
 * Every snippet is drawn from the docs corpus this site is built on, so solving
 * a board teaches syntax that is actually true of Mutant. Templates are written
 * with `{{n}}` holes; `buildPuzzle` turns each into `lines` (fixed / slot /
 * indent segments) and renders the solved `source` that RECOMPILE sends to the
 * real WASM compiler. Deriving `source` from the template rather than repeating
 * it by hand means the board and the compiler can never drift apart.
 *
 * DOM-free. Safe under SSR.
 */

import type { Puzzle, PuzzleLine, Segment, SlotSpec, Tile } from './types';

const INDENT_WIDTH = 4;

/** `{{3}}` marks slot 3. Mutant never writes `{{`, so this cannot collide. */
const SLOT_MARKER = /\{\{(\d+)\}\}/g;

function parseTemplate(source: string): PuzzleLine[] {
	return source.split('\n').map((raw, index) => {
		const segments: Segment[] = [];
		const lead = /^ */.exec(raw)?.[0].length ?? 0;
		if (lead > 0) segments.push({ kind: 'indent', depth: Math.round(lead / INDENT_WIDTH) });

		const body = raw.slice(lead);
		let cursor = 0;
		SLOT_MARKER.lastIndex = 0;
		let match = SLOT_MARKER.exec(body);
		while (match) {
			if (match.index > cursor) {
				segments.push({ kind: 'fixed', text: body.slice(cursor, match.index) });
			}
			segments.push({ kind: 'slot', index: Number(match[1]) });
			cursor = match.index + match[0].length;
			match = SLOT_MARKER.exec(body);
		}
		if (cursor < body.length) segments.push({ kind: 'fixed', text: body.slice(cursor) });

		return { n: index + 1, segments };
	});
}

/** Render a template with a set of fills — used for `source` and for RECOMPILE. */
export function renderTemplate(
	lines: readonly PuzzleLine[],
	fills: readonly (string | null)[]
): string {
	return lines
		.map((line) =>
			line.segments
				.map((segment) => {
					if (segment.kind === 'indent') return ' '.repeat(segment.depth * INDENT_WIDTH);
					if (segment.kind === 'fixed') return segment.text;
					return fills[segment.index] ?? '';
				})
				.join('')
		)
		.join('\n');
}

type PuzzleSeed = Omit<Puzzle, 'lines' | 'source'> & { template: string };

function buildPuzzle(seed: PuzzleSeed): Puzzle {
	const { template, ...rest } = seed;
	const lines = parseTemplate(template);
	return { ...rest, lines, source: renderTemplate(lines, seed.solution) };
}

/** Terse tile constructor — `tile('let', 'storage', 'LET')`. */
function tile(
	literal: string,
	category: Tile['category'],
	type: Tile['type'],
	decoy = false
): Tile {
	return { id: `${literal}:${category}:${decoy ? 'd' : 's'}`, literal, category, type, decoy };
}

function slot(
	index: number,
	accepts: SlotSpec['accepts'],
	expectType: SlotSpec['expectType'],
	label: string,
	width: number
): SlotSpec {
	return { index, accepts, expectType, label, width };
}

const LANG = '/docs/reference/mutant_language_reference';
const WASM = '/docs/reference/wasm_repl_reference';

const SEEDS: PuzzleSeed[] = [
	{
		id: 'p1-first-contact',
		ordinal: 1,
		title: 'FIRST CONTACT',
		concept: 'BINDINGS',
		difficulty: 1,
		brief:
			'Two statements. A name is bound to a string, then written to stdout. Every Mutant statement ends in a semicolon — those are already in place.',
		template: ['{{0}} name {{1}} "mutant";', '{{2}}({{3}});'].join('\n'),
		slots: [
			slot(0, ['storage'], 'LET', 'binding keyword', 4),
			slot(1, ['assignment'], 'ASSIGN', 'assignment operator', 2),
			slot(2, ['function'], 'IDENT', 'output builtin', 6),
			slot(3, ['identifier'], 'IDENT', 'the bound name', 5)
		],
		tray: [
			tile('let', 'storage', 'LET'),
			tile('=', 'assignment', 'ASSIGN'),
			tile('putln', 'function', 'IDENT'),
			tile('name', 'identifier', 'IDENT'),
			tile('print', 'function', 'IDENT', true),
			tile('var', 'identifier', 'IDENT', true),
			tile('const', 'identifier', 'IDENT', true),
			tile('for', 'keyword', 'FOR', true)
		],
		solution: ['let', '=', 'putln', 'name'],
		expectedOutput: 'mutant',
		wasmVerifiable: true,
		hints: [
			'Mutant has exactly one binding keyword. It is not `var` and it is not `const`.',
			'Writing to stdout is a builtin call, not a statement form. Mutant has no `print`.',
			'The call takes the name you just bound — not the string literal.'
		],
		docHref: LANG
	},
	{
		id: 'p2-the-pair',
		ordinal: 2,
		title: 'THE PAIR',
		concept: 'VALUE + ERROR',
		difficulty: 2,
		brief:
			'Fallible builtins return a value and an error together. Handle the error before you trust the value — and remember that a statement whose value is a block still needs its semicolon.',
		template: [
			'let load = {{0}}(path) {',
			'    let data{{1}} err {{2}} fs_read(path);',
			'    {{3}} (err) {',
			'        putln("[error] fs_read:", err);',
			'        {{4}} "";',
			'    }{{5}}',
			'    return data;',
			'};',
			'',
			'let report = load("report.json");',
			'putln("read", len(report), "bytes");'
		].join('\n'),
		slots: [
			slot(0, ['storage'], 'FN', 'function literal keyword', 4),
			slot(1, ['punctuation'], 'COMMA', 'pair separator', 2),
			slot(2, ['assignment'], 'ASSIGN', 'assignment operator', 2),
			slot(3, ['keyword'], 'IF', 'conditional keyword', 4),
			slot(4, ['keyword'], 'RETURN', 'early exit keyword', 7),
			slot(5, ['punctuation'], 'SEMICOLON', 'block terminator', 2)
		],
		tray: [
			tile('fn', 'storage', 'FN'),
			tile(',', 'punctuation', 'COMMA'),
			tile('=', 'assignment', 'ASSIGN'),
			tile('if', 'keyword', 'IF'),
			tile('return', 'keyword', 'RETURN'),
			tile(';', 'punctuation', 'SEMICOLON'),
			tile('try', 'identifier', 'IDENT', true),
			tile('catch', 'identifier', 'IDENT', true),
			tile('==', 'operator', 'EQUALITY', true)
		],
		solution: ['fn', ',', '=', 'if', 'return', ';'],
		expectedOutput: '[error] fs_read: no such file or directory\nread 0 bytes',
		wasmVerifiable: false,
		hints: [
			'Mutant has no `try` / `catch`. The error arrives as the second half of the binding.',
			'`if` is a statement here, and its value is a block.',
			'A statement whose value is a block still terminates with `;` — the reference calls this out explicitly.'
		],
		docHref: LANG
	},
	{
		id: 'p3-capture',
		ordinal: 3,
		title: 'CAPTURE',
		concept: 'CLOSURES',
		difficulty: 2,
		brief:
			'Functions are values. The inner function outlives the call that made it, and it keeps the free variable it closed over.',
		template: [
			'let adder = {{0}}(n) {',
			'    {{1}} fn(x) { return x + {{2}}; };   // closes over n',
			'};',
			'let add10 = {{3}}(10);',
			'putln({{4}}(5));'
		].join('\n'),
		slots: [
			slot(0, ['storage'], 'FN', 'function literal keyword', 4),
			slot(1, ['keyword'], 'RETURN', 'result keyword', 7),
			slot(2, ['identifier'], 'IDENT', 'the captured free variable', 3),
			slot(3, ['function', 'identifier'], 'IDENT', 'the factory to call', 6),
			slot(4, ['function', 'identifier'], 'IDENT', 'the closure to call', 6)
		],
		tray: [
			tile('fn', 'storage', 'FN'),
			tile('return', 'keyword', 'RETURN'),
			tile('n', 'identifier', 'IDENT'),
			tile('adder', 'function', 'IDENT'),
			tile('add10', 'function', 'IDENT'),
			tile('x', 'identifier', 'IDENT', true),
			tile('let', 'storage', 'LET', true),
			tile('yield', 'identifier', 'IDENT', true)
		],
		solution: ['fn', 'return', 'n', 'adder', 'add10'],
		expectedOutput: '15',
		wasmVerifiable: true,
		hints: [
			'`fn` produces a value like any other literal — it can be returned.',
			'The inner function adds its own parameter to the one it captured.',
			'`adder(10)` is the factory call; `add10(5)` is the closure call.'
		],
		docHref: LANG
	},
	{
		id: 'p4-iterate',
		ordinal: 4,
		title: 'ITERATE',
		concept: 'LOOPS',
		difficulty: 3,
		brief:
			'Mutant has one loop form. Index the array by hand, bound the loop with the array length, and terminate the loop statement like any other.',
		template: [
			'let items = ["bytecode", "sandbox", "signing"];',
			'{{0}} ({{1}} i = 0; i {{2}} {{3}}(items); {{4}}) {',
			'    putln(items[i]);',
			'}{{5}}'
		].join('\n'),
		slots: [
			slot(0, ['keyword', 'identifier', 'function'], 'FOR', 'loop keyword', 8),
			slot(1, ['storage'], 'LET', 'binding keyword', 4),
			slot(2, ['operator'], 'LT', 'bound comparison', 3),
			slot(3, ['function'], 'IDENT', 'length builtin', 5),
			slot(4, ['operator', 'identifier'], 'INCREMENT', 'step expression', 10),
			slot(5, ['punctuation'], 'SEMICOLON', 'block terminator', 2)
		],
		tray: [
			tile('for', 'keyword', 'FOR'),
			tile('let', 'storage', 'LET'),
			tile('<', 'operator', 'LT'),
			tile('len', 'function', 'IDENT'),
			tile('i++', 'operator', 'INCREMENT'),
			tile('i = i + 1', 'identifier', 'IDENT'),
			tile(';', 'punctuation', 'SEMICOLON'),
			tile('while', 'identifier', 'IDENT', true),
			tile('foreach', 'identifier', 'IDENT', true),
			tile('<=', 'operator', 'LTE', true),
			tile('size', 'function', 'IDENT', true)
		],
		solution: ['for', 'let', '<', 'len', 'i++', ';'],
		accept: { 4: ['i = i + 1'] },
		expectedOutput: 'bytecode\nsandbox\nsigning',
		wasmVerifiable: true,
		hints: [
			'There is no `while` and no `foreach`. Mutant has thirteen keywords; check the list.',
			'`len` is the length builtin. `size` is not a Mutant name.',
			'Both `i++` and `i = i + 1` are attested in the corpus — either is accepted.'
		],
		docHref: WASM
	},
	{
		id: 'p5-compose',
		ordinal: 5,
		title: 'COMPOSE',
		concept: 'HIGHER ORDER',
		difficulty: 3,
		brief:
			'Closures compose with the collection builtins. Narrow the array first, then transform what survived — the order of the two stages is the whole puzzle.',
		template: [
			'let nums = [5, 3, 8, 1];',
			'let big = {{0}}(nums, {{1}}(x) { {{2}} x {{3}} 3; });',
			'let doubled = {{4}}({{5}}, fn(x) { return x * 2; });',
			'putln(doubled);'
		].join('\n'),
		slots: [
			slot(0, ['function'], 'IDENT', 'the narrowing builtin', 7),
			slot(1, ['storage'], 'FN', 'function literal keyword', 4),
			slot(2, ['keyword'], 'RETURN', 'result keyword', 7),
			slot(3, ['operator'], 'GT', 'threshold comparison', 3),
			slot(4, ['function'], 'IDENT', 'the transforming builtin', 7),
			slot(5, ['identifier'], 'IDENT', 'the array to transform', 5)
		],
		tray: [
			tile('filter', 'function', 'IDENT'),
			tile('fn', 'storage', 'FN'),
			tile('return', 'keyword', 'RETURN'),
			tile('>', 'operator', 'GT'),
			tile('map', 'function', 'IDENT'),
			tile('big', 'identifier', 'IDENT'),
			tile('nums', 'identifier', 'IDENT', true),
			tile('reduce', 'function', 'IDENT', true),
			tile('each', 'function', 'IDENT', true),
			tile('<', 'operator', 'LT', true)
		],
		solution: ['filter', 'fn', 'return', '>', 'map', 'big'],
		expectedOutput: '[10, 16]',
		wasmVerifiable: true,
		hints: [
			'`filter` keeps elements; `map` replaces them. Only one of them can go first here.',
			'`reduce` takes three arguments, not two. The arity is checked at compile time.',
			'The second stage transforms the filtered array, not the original one.'
		],
		docHref: LANG
	},
	{
		id: 'p6-short-circuit',
		ordinal: 6,
		title: 'SHORT CIRCUIT',
		concept: 'CONTROL FLOW',
		difficulty: 4,
		brief:
			'Accumulate until a threshold trips, then leave the loop. `break` is only meaningful inside one — the slot after the closing brace is not inside anything.',
		template: [
			'let scores = [4, 9, 2, 7];',
			'let total = 0;',
			'for (let i = 0; i < len(scores); i++) {',
			'    if (scores[i] {{0}} 8) { {{1}}; };',
			'    total {{2}} scores[i];',
			'}{{3}}',
			'{{4}}({{5}});'
		].join('\n'),
		slots: [
			slot(0, ['operator'], 'GT', 'threshold comparison', 3),
			slot(1, ['keyword'], 'BREAK', 'loop exit keyword', 9),
			slot(2, ['assignment'], 'PLUS_ASSIGN', 'accumulating assignment', 3),
			slot(3, ['punctuation', 'keyword'], 'SEMICOLON', 'block terminator', 9),
			slot(4, ['function'], 'IDENT', 'output builtin', 6),
			slot(5, ['identifier'], 'IDENT', 'the accumulator', 6)
		],
		tray: [
			tile('>', 'operator', 'GT'),
			tile('break', 'keyword', 'BREAK'),
			tile('+=', 'assignment', 'PLUS_ASSIGN'),
			tile(';', 'punctuation', 'SEMICOLON'),
			tile('putln', 'function', 'IDENT'),
			tile('total', 'identifier', 'IDENT'),
			{ ...tile('break', 'keyword', 'BREAK', true), id: 'break:stray' },
			tile('continue', 'keyword', 'CONTINUE', true),
			tile('<', 'operator', 'LT', true),
			tile('=', 'assignment', 'ASSIGN', true),
			tile('scores', 'identifier', 'IDENT', true)
		],
		solution: ['>', 'break', '+=', ';', 'putln', 'total'],
		expectedOutput: '4',
		wasmVerifiable: true,
		hints: [
			'The first score above the threshold ends the loop, so only what came before it counts.',
			'`+=` accumulates; plain `=` would discard everything but the last score.',
			'The slot after the closing brace is outside the loop. Nothing there can break it.'
		],
		docHref: LANG
	},
	{
		id: 'p7-declare',
		ordinal: 7,
		title: 'DECLARE',
		concept: 'STRUCTS + ENUMS',
		difficulty: 4,
		brief:
			'Two declaration forms and two access forms. Struct literals bind fields with a colon; both structs and enums are reached with a dot.',
		template: [
			'{{0}} Point { x; y; };',
			'{{1}} Color { Red, Green, Blue };',
			'',
			'let p = {{2}} { x{{3}} 3, y: 4 };',
			'putln(p{{4}}x);',
			'putln({{5}}{{6}}Green);'
		].join('\n'),
		slots: [
			slot(0, ['storage', 'identifier'], 'STRUCT', 'record declaration keyword', 7),
			slot(1, ['storage', 'identifier'], 'ENUM', 'variant declaration keyword', 6),
			slot(2, ['type', 'identifier', 'function'], 'IDENT', 'the struct being built', 6),
			slot(3, ['punctuation'], 'COLON', 'field binder', 2),
			slot(4, ['punctuation'], 'DOT', 'field access', 2),
			slot(5, ['type', 'identifier'], 'IDENT', 'the enum being read', 6),
			slot(6, ['punctuation'], 'DOT', 'variant access', 2)
		],
		tray: [
			tile('struct', 'storage', 'STRUCT'),
			tile('enum', 'storage', 'ENUM'),
			tile('Point', 'type', 'IDENT'),
			tile(':', 'punctuation', 'COLON'),
			tile('.', 'punctuation', 'DOT'),
			tile('Color', 'type', 'IDENT'),
			{ ...tile('.', 'punctuation', 'DOT'), id: 'dot:second' },
			tile('class', 'identifier', 'IDENT', true),
			tile('new', 'identifier', 'IDENT', true),
			tile('=', 'assignment', 'ASSIGN', true),
			tile('record', 'identifier', 'IDENT', true)
		],
		solution: ['struct', 'enum', 'Point', ':', '.', 'Color', '.'],
		expectedOutput: '3\nGreen',
		wasmVerifiable: true,
		hints: [
			'Mutant has no `class` and no `new`. Records are declared with one keyword and built by name.',
			'Inside a struct literal a field is bound with `:`, not with `=`.',
			'Enum variants are reached the same way struct fields are.'
		],
		docHref: WASM
	},
	{
		id: 'p8-expand',
		ordinal: 8,
		title: 'EXPAND',
		concept: 'MACROS',
		difficulty: 5,
		brief:
			'A macro receives its arguments unevaluated. `quote` builds the AST it returns; `unquote` splices an argument back in. Neither means anything outside a macro body.',
		template: [
			'let unless = {{0}}(condition, consequence, alternative) {',
			'    {{1}}(if (!({{2}}(condition))) {',
			'        {{3}}(consequence);',
			'    } {{4}} {',
			'        unquote(alternative);',
			'    });',
			'};',
			'',
			'{{5}}(1 {{6}} 2, putln("smaller"), putln("bigger"));'
		].join('\n'),
		slots: [
			slot(0, ['storage'], 'MACRO', 'macro literal keyword', 7),
			slot(1, ['macro'], 'QUOTE', 'AST constructor', 8),
			slot(2, ['macro'], 'UNQUOTE', 'argument splice', 9),
			slot(3, ['macro'], 'UNQUOTE', 'argument splice', 9),
			slot(4, ['keyword'], 'ELSE', 'alternative keyword', 5),
			slot(5, ['function', 'identifier'], 'IDENT', 'the macro to invoke', 8),
			slot(6, ['operator'], 'GT', 'the false comparison', 3)
		],
		tray: [
			tile('macro', 'storage', 'MACRO'),
			tile('quote', 'macro', 'QUOTE'),
			tile('unquote', 'macro', 'UNQUOTE'),
			{ ...tile('unquote', 'macro', 'UNQUOTE'), id: 'unquote:second' },
			tile('else', 'keyword', 'ELSE'),
			tile('unless', 'function', 'IDENT'),
			tile('>', 'operator', 'GT'),
			tile('fn', 'storage', 'FN', true),
			tile('if', 'keyword', 'IF', true),
			tile('<', 'operator', 'LT', true),
			tile('expand', 'function', 'IDENT', true)
		],
		solution: ['macro', 'quote', 'unquote', 'unquote', 'else', 'unless', '>'],
		expectedOutput: 'smaller',
		wasmVerifiable: false,
		hints: [
			'`fn` evaluates its arguments before the body runs. A macro must not.',
			'`quote` wraps the whole returned expression; `unquote` appears inside it, once per argument.',
			'`1 > 2` is false, so the negated condition holds and the consequence runs.'
		],
		docHref: LANG
	}
];

export const PUZZLES: readonly Puzzle[] = SEEDS.map(buildPuzzle);

export const PUZZLE_COUNT = PUZZLES.length;

export function puzzleAt(ordinal: number): Puzzle {
	const index = Math.min(Math.max(ordinal, 1), PUZZLES.length) - 1;
	return PUZZLES[index];
}

export function puzzleById(id: string): Puzzle | null {
	return PUZZLES.find((puzzle) => puzzle.id === id) ?? null;
}
