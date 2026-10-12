// Clears workshop builtins against Mutant's findings ledger, at the pinned release.
//
// Owner-run: the ledger lives in Mutant's gitignored plans/, so CI cannot read
// it. For every builtin a mirrored workshop program calls, this looks for OPEN
// correctness rows that name it (word-bounded, in the title, location or
// claim). A builtin with no such row is cleared. A builtin with rows is listed
// here, on your console, for you to judge; pass --clear <name> for a match you
// have read and found not to apply.
//
// It writes verification/ledger-clearance.json with the cleared names only:
// never row ids, row text or the names that were held back, because that file
// is public and the ledger may hold embargoed rows. scripts/check-workshop.mjs
// reads it.
//
// Usage:
//   node scripts/ledger-clear.mjs --ledger <findings.jsonl> [--clear <name>]... [--dry-run]

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinsCalled } from './lib/mutant-source.mjs';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mirrorRoot = path.join(siteRoot, 'content', 'repo');
const outPath = path.join(siteRoot, 'verification', 'ledger-clearance.json');
const tag = '[ledger-clear]';

function parseArgs(argv) {
	const args = { ledger: null, clear: new Set(), dryRun: false };
	for (let i = 0; i < argv.length; i += 1) {
		if (argv[i] === '--ledger') args.ledger = argv[++i];
		else if (argv[i] === '--clear') args.clear.add(argv[++i]);
		else if (argv[i] === '--dry-run') args.dryRun = true;
		else throw new Error(`unknown argument: ${argv[i]}`);
	}
	if (!args.ledger) throw new Error('name the ledger: --ledger <path to findings.jsonl>');
	return args;
}

async function programsUnder(dir) {
	const out = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...(await programsUnder(full)));
		else if (entry.name.endsWith('.mut')) out.push(full);
	}
	return out;
}

const escape = (name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const lock = JSON.parse(await readFile(path.join(siteRoot, 'mutant.lock.json'), 'utf8'));
	const meta = JSON.parse(await readFile(path.join(siteRoot, 'src', 'lib', 'generated', 'mutant-meta.json'), 'utf8'));
	if (meta.commit !== lock.commit) throw new Error('mutant-meta.json is not from the locked commit; run npm run meta:mutant');
	const builtinNames = new Set(meta.builtins.map((b) => b.name));

	const used = new Set();
	for (const file of await programsUnder(path.join(mirrorRoot, 'examples'))) {
		for (const name of builtinsCalled(await readFile(file, 'utf8'), builtinNames).builtins) used.add(name);
	}

	const ledgerBytes = await readFile(path.resolve(args.ledger));
	const rows = ledgerBytes
		.toString('utf8')
		.split('\n')
		.filter((line) => line.trim())
		.map((line) => JSON.parse(line))
		.filter((row) => row.status === 'OPEN' && row.category === 'correctness');

	const cleared = [];
	for (const name of [...used].sort()) {
		const pattern = new RegExp(`(?<![A-Za-z0-9_])${escape(name)}(?![A-Za-z0-9_])`);
		const hits = rows.filter((row) => [row.title, row.location, row.claim].some((field) => pattern.test(field ?? '')));
		if (hits.length === 0 || args.clear.has(name)) {
			cleared.push(name);
			if (hits.length) console.log(`${tag} cleared by you: ${name} (${hits.map((r) => r.id).join(', ')})`);
			continue;
		}
		console.log(`${tag} held: ${name}`);
		for (const row of hits) console.log(`${tag}     ${row.id}  ${row.title}`);
	}

	const record = {
		$comment: 'Written by scripts/ledger-clear.mjs. Builtins with no OPEN correctness finding at this pin; held names are not recorded.',
		pin: lock.tag,
		commit: lock.commit,
		ledgerSha256: createHash('sha256').update(ledgerBytes).digest('hex'),
		checkedAt: new Date().toISOString().slice(0, 10),
		cleared
	};
	console.log(`${tag} ${cleared.length} of ${used.size} builtins cleared at ${lock.tag}`);
	if (args.dryRun) return;
	await mkdir(path.dirname(outPath), { recursive: true });
	await writeFile(outPath, `${JSON.stringify(record, null, '\t')}\n`);
	console.log(`${tag} wrote ${path.relative(siteRoot, outPath)}`);
}

main().catch((error) => {
	console.error(`${tag} FAILED: ${error.message}`);
	process.exitCode = 1;
});
