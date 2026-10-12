// Mirrors Mutant's docs/ into this site at the commit mutant.lock.json pins,
// and detects any drift between the two.
//
// The mirror is exact: every file under Mutant docs/ at the pinned commit, with
// the same bytes, and nothing else. mutant.sync.json records the commit and the
// git blob id of each file, so drift can be checked offline (has anyone edited
// docs/, or re-pinned without re-syncing?) and against the source (does the
// record match Mutant at that commit?).
//
// Usage:
//   node scripts/mutant-sync.mjs --mutant <path>            mirror from a local Mutant clone
//   node scripts/mutant-sync.mjs --remote                   mirror from GitHub
//   node scripts/mutant-sync.mjs --check                    offline drift check (used by the build)
//   node scripts/mutant-sync.mjs --check --mutant <path>    also compare with the source
//   node scripts/mutant-sync.mjs --check --remote
//
// The local clone is only read (git ls-tree / cat-file); nothing in it changes.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(siteRoot, 'docs');
const recordPath = path.join(siteRoot, 'mutant.sync.json');
const SOURCE_PREFIX = 'docs/';
const tag = '[mutant-sync]';

function parseArgs(argv) {
	const args = { mutant: null, remote: false, check: false };
	for (let i = 0; i < argv.length; i += 1) {
		if (argv[i] === '--check') args.check = true;
		else if (argv[i] === '--remote') args.remote = true;
		else if (argv[i] === '--mutant') args.mutant = argv[++i];
		else throw new Error(`unknown argument: ${argv[i]}`);
	}
	if (args.mutant && args.remote) throw new Error('use --mutant <path> or --remote, not both');
	if (!args.check && !args.mutant && !args.remote) {
		throw new Error('to sync, name a source: --mutant <path> or --remote');
	}
	return args;
}

/** The id git gives this content as a blob, after git's CRLF-to-LF clean step. */
function blobId(buf) {
	const text = Buffer.from(buf.toString('binary').replace(/\r\n/g, '\n'), 'binary');
	return createHash('sha1').update(`blob ${text.length}\0`).update(text).digest('hex');
}

async function listLocal(dir, prefix = '') {
	const out = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) out.push(...(await listLocal(path.join(dir, entry.name), rel)));
		else out.push(rel);
	}
	return out.sort();
}

/** Source adapters: list blob ids under docs/ at a commit, and read one blob. */
function localSource(clone, commit) {
	const git = (...args) => execFileSync('git', ['-C', clone, ...args], { maxBuffer: 64 * 1024 * 1024 });
	return {
		label: `${clone} @ ${commit.slice(0, 7)}`,
		async list() {
			const out = git('ls-tree', '-r', '-z', commit, '--', SOURCE_PREFIX).toString('utf8');
			const files = new Map();
			for (const line of out.split('\0').filter(Boolean)) {
				const [meta, filePath] = line.split('\t');
				const [, type, id] = meta.split(' ');
				if (type === 'blob') files.set(filePath.slice(SOURCE_PREFIX.length), id);
			}
			return files;
		},
		async read(_rel, id) {
			return git('cat-file', 'blob', id);
		}
	};
}

function remoteSource(repo, commit) {
	return {
		label: `github.com/${repo} @ ${commit.slice(0, 7)}`,
		async list() {
			const url = `https://api.github.com/repos/${repo}/git/trees/${commit}?recursive=1`;
			const res = await fetch(url, { headers: { accept: 'application/vnd.github+json' } });
			if (!res.ok) throw new Error(`${url}: HTTP ${res.status} ${res.statusText}`);
			const tree = await res.json();
			if (tree.truncated) throw new Error('GitHub truncated the tree listing; sync from a local clone instead');
			const files = new Map();
			for (const item of tree.tree) {
				if (item.type === 'blob' && item.path.startsWith(SOURCE_PREFIX)) {
					files.set(item.path.slice(SOURCE_PREFIX.length), item.sha);
				}
			}
			return files;
		},
		async read(rel) {
			const encoded = `${SOURCE_PREFIX}${rel}`.split('/').map(encodeURIComponent).join('/');
			const url = `https://raw.githubusercontent.com/${repo}/${commit}/${encoded}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`${url}: HTTP ${res.status} ${res.statusText}`);
			return Buffer.from(await res.arrayBuffer());
		}
	};
}

/** Differences between two {path -> blob id} maps, as printable lines. */
function diff(expected, actual, expectedLabel, actualLabel) {
	const lines = [];
	for (const [rel, id] of expected) {
		if (!actual.has(rel)) lines.push(`missing  docs/${rel}  (in ${expectedLabel}, not in ${actualLabel})`);
		else if (actual.get(rel) !== id) lines.push(`changed  docs/${rel}`);
	}
	for (const rel of actual.keys()) {
		if (!expected.has(rel)) lines.push(`extra    docs/${rel}  (in ${actualLabel}, not in ${expectedLabel})`);
	}
	return lines;
}

async function localIds() {
	const ids = new Map();
	for (const rel of await listLocal(docsDir)) {
		ids.set(rel, blobId(await readFile(path.join(docsDir, rel))));
	}
	return ids;
}

async function sync(lock, source) {
	const wanted = await source.list();
	if (wanted.size === 0) throw new Error(`${source.label} has no files under ${SOURCE_PREFIX}`);

	for (const rel of await listLocal(docsDir).catch(() => [])) {
		if (!wanted.has(rel)) {
			await rm(path.join(docsDir, rel));
			console.log(`${tag} removed docs/${rel}`);
		}
	}

	const current = await localIds().catch(() => new Map());
	let written = 0;
	for (const [rel, id] of wanted) {
		if (current.get(rel) === id) continue;
		const data = await source.read(rel, id);
		if (blobId(data) !== id) throw new Error(`docs/${rel}: content does not match its blob id ${id}`);
		const target = path.join(docsDir, ...rel.split('/'));
		await mkdir(path.dirname(target), { recursive: true });
		await writeFile(target, data);
		written += 1;
		console.log(`${tag} wrote docs/${rel}`);
	}

	const record = {
		$comment: 'Written by scripts/mutant-sync.mjs. Git blob ids of docs/ as mirrored from Mutant; do not edit.',
		repo: lock.repo,
		tag: lock.tag,
		commit: lock.commit,
		source: SOURCE_PREFIX,
		files: Object.fromEntries([...wanted].sort(([a], [b]) => a.localeCompare(b)))
	};
	await writeFile(recordPath, `${JSON.stringify(record, null, '\t')}\n`);
	console.log(`${tag} docs/ mirrors ${source.label}: ${wanted.size} files, ${written} written`);
}

async function check(lock, source) {
	const problems = [];

	let record;
	try {
		record = JSON.parse(await readFile(recordPath, 'utf8'));
	} catch {
		throw new Error('mutant.sync.json is missing or unreadable; run a sync first');
	}
	if (record.commit !== lock.commit || record.tag !== lock.tag) {
		problems.push(
			`pin    docs/ was synced from ${record.tag}@${record.commit.slice(0, 7)}, lock is ${lock.tag}@${lock.commit.slice(0, 7)}`
		);
	}

	const recorded = new Map(Object.entries(record.files));
	problems.push(...diff(recorded, await localIds(), 'mutant.sync.json', 'docs/'));

	if (source) {
		problems.push(...diff(await source.list(), recorded, source.label, 'mutant.sync.json'));
	}

	if (problems.length) {
		for (const line of problems) console.error(`${tag} ${line}`);
		throw new Error(`${problems.length} difference(s); re-sync with --mutant <path> or --remote`);
	}
	const against = source ? ` and ${source.label}` : '';
	console.log(`${tag} zero drift: docs/ matches mutant.sync.json (${lock.tag})${against}, ${recorded.size} files`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const lock = JSON.parse(await readFile(path.join(siteRoot, 'mutant.lock.json'), 'utf8'));
	const source = args.mutant
		? localSource(path.resolve(args.mutant), lock.commit)
		: args.remote
			? remoteSource(lock.repo, lock.commit)
			: null;

	if (args.check) await check(lock, source);
	else await sync(lock, source);
}

main().catch((error) => {
	console.error(`${tag} FAILED: ${error.message}`);
	process.exitCode = 1;
});
