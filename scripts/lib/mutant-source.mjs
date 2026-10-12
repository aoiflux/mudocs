// Reads which builtins a Mutant program calls, for the workshop checks.
//
// Not a parser: it blanks strings and comments, then takes every `name(` that
// is not a keyword and not a name the program binds itself (let, fn params).
// That over-reports rather than under-reports, which is the safe side for a
// check that blocks publication.

const KEYWORDS = new Set([
	'fn',
	'macro',
	'if',
	'else',
	'while',
	'for',
	'in',
	'return',
	'let',
	'quote',
	'unquote',
	'struct',
	'enum',
	'match',
	'break',
	'continue'
]);

/** The source with string contents and comments replaced by spaces, line breaks kept. */
function blank(source) {
	let out = '';
	for (let i = 0; i < source.length; i += 1) {
		const ch = source[i];
		if (ch === '"') {
			out += '"';
			for (i += 1; i < source.length && source[i] !== '"'; i += 1) {
				if (source[i] === '\\') {
					out += ' ';
					i += 1;
				}
				out += source[i] === '\n' ? '\n' : ' ';
			}
			out += '"';
		} else if (ch === '/' && source[i + 1] === '/') {
			while (i < source.length && source[i] !== '\n') i += 1;
			out += '\n';
		} else {
			out += ch;
		}
	}
	return out;
}

/**
 * @param {string} source
 * @returns {{ calls: Set<string>, bound: Set<string> }}
 */
export function scanProgram(source) {
	const code = blank(source);
	const bound = new Set();
	for (const m of code.matchAll(/\blet\s+([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s*=/g)) {
		for (const name of m[1].split(',')) bound.add(name.trim());
	}
	for (const m of code.matchAll(/\b(?:fn|macro)\s*\(([^)]*)\)/g)) {
		for (const name of m[1].split(',')) if (name.trim()) bound.add(name.trim());
	}
	const calls = new Set();
	// A name after a dot is a member of an imported module (quilldrop.ready), not a builtin.
	for (const m of code.matchAll(/(?<![.\w])([A-Za-z_]\w*)\s*\(/g)) {
		if (!KEYWORDS.has(m[1])) calls.add(m[1]);
	}
	return { calls, bound };
}

/** The files a program imports, as written (`import "lib/x.mut";`). */
export function importsOf(source) {
	return [...source.matchAll(/^\s*import\s+"([^"]+)"/gm)].map((m) => m[1]);
}

/**
 * Builtins a program calls, and calls that are neither a builtin nor bound in the program.
 * @param {string} source
 * @param {Set<string>} builtinNames
 */
export function builtinsCalled(source, builtinNames) {
	const { calls, bound } = scanProgram(source);
	const builtins = [];
	const unknown = [];
	for (const name of [...calls].sort()) {
		if (bound.has(name)) continue;
		if (builtinNames.has(name)) builtins.push(name);
		else unknown.push(name);
	}
	return { builtins, unknown };
}
