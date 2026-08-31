/**
 * A toy bytecode emitter, and the diff that rung 7b answers with.
 *
 * When every slot is filled and no rung fires, the player has written a program
 * that *compiles* — it is simply not the one the objective asked for. A text
 * error would be a lie there, so the compiler answers in the only register it
 * honestly can: it shows the two instruction streams and where they part.
 *
 * This is not the real Mutant compiler. It is a shunting-yard over the token
 * stream emitting from the language's real 39-opcode set, which is enough to be
 * deterministic, to differ wherever the programs differ, and to point at the
 * offset where the divergence starts.
 *
 * DOM-free. Safe under SSR.
 */

import type { LexToken } from './lexer';
import type { TokenType } from './types';

/** The opcode set of `github.com/aoiflux/mutant/code`. The boot sequence counts these. */
export const OPCODES = [
	'OpConstant',
	'OpPop',
	'OpAdd',
	'OpSub',
	'OpMul',
	'OpDiv',
	'OpMod',
	'OpTrue',
	'OpFalse',
	'OpNull',
	'OpEqual',
	'OpNotEqual',
	'OpGreaterThan',
	'OpLessThan',
	'OpGreaterEqual',
	'OpLessEqual',
	'OpAnd',
	'OpOr',
	'OpMinus',
	'OpBang',
	'OpJump',
	'OpJumpFalse',
	'OpSetGlobal',
	'OpGetGlobal',
	'OpSetLocal',
	'OpGetLocal',
	'OpGetBuiltin',
	'OpGetFree',
	'OpArray',
	'OpHash',
	'OpIndex',
	'OpSetIndex',
	'OpCall',
	'OpClosure',
	'OpReturnValue',
	'OpReturn',
	'OpCurrentClosure',
	'OpStruct',
	'OpEnum'
] as const;

export type Opcode = (typeof OPCODES)[number];

export const OPCODE_COUNT = OPCODES.length;

/** Operand widths in bytes, so offsets advance the way a real chunk would. */
const WIDTHS: Partial<Record<Opcode, number[]>> = {
	OpConstant: [2],
	OpGetGlobal: [2],
	OpSetGlobal: [2],
	OpJump: [2],
	OpJumpFalse: [2],
	OpArray: [2],
	OpHash: [2],
	OpStruct: [2],
	OpEnum: [2],
	OpClosure: [2, 1],
	OpGetLocal: [1],
	OpSetLocal: [1],
	OpGetBuiltin: [1],
	OpGetFree: [1],
	OpCall: [1]
};

export type Instruction = { offset: number; op: Opcode; operands: number[] };

const BINARY: Partial<Record<TokenType, { op: Opcode; prec: number }>> = {
	OR: { op: 'OpOr', prec: 1 },
	AND: { op: 'OpAnd', prec: 2 },
	EQUALITY: { op: 'OpEqual', prec: 3 },
	INEQUALITY: { op: 'OpNotEqual', prec: 3 },
	LT: { op: 'OpLessThan', prec: 4 },
	GT: { op: 'OpGreaterThan', prec: 4 },
	LTE: { op: 'OpLessEqual', prec: 4 },
	GTE: { op: 'OpGreaterEqual', prec: 4 },
	PLUS: { op: 'OpAdd', prec: 5 },
	MINUS: { op: 'OpSub', prec: 5 },
	ASTERISK: { op: 'OpMul', prec: 6 },
	FSLASH: { op: 'OpDiv', prec: 6 },
	MODULO: { op: 'OpMod', prec: 6 },
	DOT: { op: 'OpIndex', prec: 8 }
};

/** The arithmetic folded into each compound assignment. */
const COMPOUND: Partial<Record<TokenType, Opcode>> = {
	PLUS_ASSIGN: 'OpAdd',
	MINUS_ASSIGN: 'OpSub',
	ASTERISK_ASSIGN: 'OpMul',
	SLASH_ASSIGN: 'OpDiv',
	MODULO_ASSIGN: 'OpMod'
};

/** Names resolved through the builtin table rather than the global store. */
const BUILTIN_SLOT = new Map<string, number>();

function builtinSlot(name: string): number {
	let slot = BUILTIN_SLOT.get(name);
	if (slot === undefined) {
		slot = BUILTIN_SLOT.size;
		BUILTIN_SLOT.set(name, slot);
	}
	return slot;
}

type Group = { kind: 'call' | 'array' | 'index' | 'group' | 'block'; argc: number; name?: string };

class Emitter {
	private readonly out: Instruction[] = [];
	private offset = 0;
	private readonly constants = new Map<string, number>();
	private readonly symbols = new Map<string, number>();

	emit(op: Opcode, ...operands: number[]): void {
		this.out.push({ offset: this.offset, op, operands });
		const widths = WIDTHS[op] ?? [];
		this.offset += 1 + widths.reduce((sum, width) => sum + width, 0);
	}

	constant(literal: string): number {
		let index = this.constants.get(literal);
		if (index === undefined) {
			index = this.constants.size;
			this.constants.set(literal, index);
		}
		return index;
	}

	symbol(name: string): number {
		let index = this.symbols.get(name);
		if (index === undefined) {
			index = this.symbols.size;
			this.symbols.set(name, index);
		}
		return index;
	}

	result(): Instruction[] {
		return this.out;
	}
}

/**
 * Walk the token stream and emit a plausible chunk.
 *
 * Operands emit as they are read; operators are held on a precedence stack and
 * flushed at every group boundary, which produces the postfix order a stack VM
 * actually executes.
 */
export function emitBytecode(tokens: readonly LexToken[]): Instruction[] {
	const emitter = new Emitter();
	const operators: { op: Opcode; prec: number }[] = [];
	const groups: Group[] = [];
	/** Store targets waiting for their right-hand side to finish evaluating. */
	const pendingStores: number[] = [];

	const flush = (minPrec: number) => {
		while (operators.length > 0 && operators[operators.length - 1].prec >= minPrec) {
			const pending = operators.pop();
			if (pending) emitter.emit(pending.op);
		}
	};

	const drainStores = () => {
		while (pendingStores.length > 0) {
			const target = pendingStores.pop();
			if (target !== undefined) emitter.emit('OpSetGlobal', target);
		}
	};

	const isCallTarget = (index: number): boolean => tokens[index + 1]?.type === 'LPAREN';

	for (let i = 0; i < tokens.length; i += 1) {
		const token = tokens[i];
		const next = tokens[i + 1];

		switch (token.type) {
			case 'HOLE':
			case 'COMMENT':
			case 'EOF':
				break;

			case 'INT':
			case 'FLOAT':
			case 'STRING':
				emitter.emit('OpConstant', emitter.constant(token.literal));
				break;

			case 'TRUE':
				emitter.emit('OpTrue');
				break;

			case 'FALSE':
				emitter.emit('OpFalse');
				break;

			case 'LET':
				// The declared name is a store target; the store itself is emitted
				// when the assignment operator names it.
				break;

			case 'STRUCT':
			case 'ENUM': {
				const name = tokens[i + 1];
				const operand = emitter.constant(`type@${name?.literal ?? '?'}`);
				emitter.emit(token.type === 'STRUCT' ? 'OpStruct' : 'OpEnum', operand);
				break;
			}

			case 'FN':
			case 'MACRO':
				emitter.emit('OpClosure', emitter.constant(`fn@${token.line}:${token.col}`), 0);
				break;

			case 'QUOTE':
			case 'UNQUOTE':
				emitter.emit('OpGetBuiltin', builtinSlot(token.literal));
				break;

			case 'IF':
				emitter.emit('OpJumpFalse', 0);
				break;

			case 'ELSE':
				emitter.emit('OpJump', 0);
				break;

			case 'RETURN':
				break;

			case 'BREAK':
			case 'CONTINUE':
				emitter.emit('OpJump', 0);
				break;

			case 'IDENT': {
				if (tokens[i - 1]?.type === 'DOT') {
					emitter.emit('OpConstant', emitter.constant(`"${token.literal}"`));
					break;
				}
				if (isCallTarget(i)) {
					emitter.emit('OpGetGlobal', emitter.symbol(token.literal));
					break;
				}
				if (next?.type === 'COLON') {
					emitter.emit('OpConstant', emitter.constant(`"${token.literal}"`));
					break;
				}
				emitter.emit('OpGetGlobal', emitter.symbol(token.literal));
				break;
			}

			case 'LPAREN': {
				const callee = tokens[i - 1];
				const isCall =
					callee !== undefined && (callee.type === 'IDENT' || callee.type === 'RPAREN');
				groups.push({ kind: isCall ? 'call' : 'group', argc: isCall ? 0 : 1 });
				if (isCall && next && next.type !== 'RPAREN') groups[groups.length - 1].argc = 1;
				break;
			}

			case 'RPAREN': {
				flush(1);
				drainStores();
				const group = groups.pop();
				if (group?.kind === 'call') emitter.emit('OpCall', group.argc);
				break;
			}

			case 'LSQUARE': {
				const prev = tokens[i - 1];
				const isIndex =
					prev !== undefined && (prev.type === 'IDENT' || prev.type === 'RSQUARE' || prev.type === 'RPAREN');
				groups.push({ kind: isIndex ? 'index' : 'array', argc: isIndex ? 0 : next?.type === 'RSQUARE' ? 0 : 1 });
				break;
			}

			case 'RSQUARE': {
				flush(1);
				const group = groups.pop();
				if (group?.kind === 'array') emitter.emit('OpArray', group.argc);
				else emitter.emit('OpIndex');
				break;
			}

			case 'LBRACE': {
				flush(1);
				const prev = tokens[i - 1];
				const isLiteral = prev !== undefined && prev.type === 'IDENT';
				groups.push({ kind: isLiteral ? 'array' : 'block', argc: 0 });
				break;
			}

			case 'RBRACE': {
				flush(1);
				const group = groups.pop();
				if (group?.kind === 'array') emitter.emit('OpHash', group.argc);
				break;
			}

			case 'COMMA': {
				flush(1);
				const group = groups[groups.length - 1];
				if (group) group.argc += 1;
				break;
			}

			case 'SEMICOLON': {
				flush(1);
				drainStores();
				emitter.emit('OpPop');
				break;
			}

			case 'COLON':
				break;

			case 'ASSIGN':
			case 'PLUS_ASSIGN':
			case 'MINUS_ASSIGN':
			case 'ASTERISK_ASSIGN':
			case 'SLASH_ASSIGN':
			case 'MODULO_ASSIGN': {
				flush(1);
				// The target is whatever the operator was written against.
				const named = tokens[i - 1];
				const target = emitter.symbol(named?.type === 'IDENT' ? named.literal : 'anon');

				// A compound assignment reads the target before it writes it, and
				// folds in an arithmetic op. That is what makes `+=` and `=` compile
				// to genuinely different chunks — and what lets rung 7b tell them apart.
				const compound = COMPOUND[token.type];
				if (compound) {
					emitter.emit('OpGetGlobal', target);
					operators.push({ op: compound, prec: 5 });
				}

				pendingStores.push(target);
				break;
			}

			case 'INCREMENT':
			case 'DECREMENT':
				emitter.emit('OpConstant', emitter.constant('1'));
				emitter.emit(token.type === 'INCREMENT' ? 'OpAdd' : 'OpSub');
				break;

			case 'BANG':
				operators.push({ op: 'OpBang', prec: 7 });
				break;

			default: {
				const binary = BINARY[token.type];
				if (binary) {
					flush(binary.prec);
					operators.push(binary);
				}
				break;
			}
		}
	}

	flush(1);
	return emitter.result();
}

function hex4(value: number): string {
	return value.toString(16).toUpperCase().padStart(4, '0');
}

/** `0000 OpConstant 0` — the format the real disassembler prints. */
export function formatInstruction(instruction: Instruction, opWidth = 0): string {
	const name = instruction.op.padEnd(opWidth, ' ');
	const operands = instruction.operands.length > 0 ? ` ${instruction.operands.join(' ')}` : '';
	return `${hex4(instruction.offset)} ${name}${operands}`;
}

export function formatChunk(instructions: readonly Instruction[]): string {
	return instructions.map((instruction) => formatInstruction(instruction)).join('\n');
}

function sameInstruction(a: Instruction | undefined, b: Instruction | undefined): boolean {
	if (!a || !b) return a === b;
	if (a.op !== b.op) return false;
	if (a.operands.length !== b.operands.length) return false;
	return a.operands.every((value, index) => value === b.operands[index]);
}

/**
 * The rung 7b message. Returns null when the two chunks are identical — which
 * means the player found a genuinely equivalent program and has solved it.
 */
export function diffBytecode(want: readonly Instruction[], got: readonly Instruction[]): string | null {
	const length = Math.max(want.length, got.length);
	for (let i = 0; i < length; i += 1) {
		const a = want[i];
		const b = got[i];
		if (sameInstruction(a, b)) continue;

		const offset = hex4((a ?? b).offset);
		const width = Math.max(a?.op.length ?? 0, b?.op.length ?? 0);
		const wantLine = a ? formatInstruction(a, width) : '<end of chunk>';
		const gotLine = b ? formatInstruction(b, width) : '<end of chunk>';
		return [
			`bytecode mismatch at offset ${offset}`,
			`  want  ${wantLine}`,
			`  got   ${gotLine}`
		].join('\n');
	}
	return null;
}
