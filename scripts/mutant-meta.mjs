// Writes src/lib/generated/mutant-meta.json: every builtin registered in the
// Mutant release mutant.lock.json pins, with its category, stability,
// platforms and whether it has a teaching doc. Any count of builtins the site
// shows is read from this file, never typed by hand.
//
// It needs a local Mutant clone and Go. The clone is only read: the pinned
// commit is exported with `git archive` into .cache/, tools/mutant-meta/main.go
// is copied in as cmd/mudocsmeta, and run there with Mutant's own go.mod.
// The JSON is committed, so the site build needs neither Go nor the clone.
//
// Usage:
//   node scripts/mutant-meta.mjs --mutant <path>   regenerate
//   node scripts/mutant-meta.mjs --check           the file exists and names the locked release
//                                                  (offline; used by `npm run check`)

import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metaPath = path.join(siteRoot, 'src', 'lib', 'generated', 'mutant-meta.json');
const tag = '[mutant-meta]';

function parseArgs(argv) {
	const args = { mutant: null, check: false };
	for (let i = 0; i < argv.length; i += 1) {
		if (argv[i] === '--check') args.check = true;
		else if (argv[i] === '--mutant') args.mutant = argv[++i];
		else throw new Error(`unknown argument: ${argv[i]}`);
	}
	if (args.check === Boolean(args.mutant)) throw new Error('use --mutant <path> to regenerate, or --check');
	return args;
}

async function generate(lock, clone) {
	const tree = path.join(siteRoot, '.cache', 'mutant-src', lock.commit);
	if (!existsSync(path.join(tree, 'go.mod'))) {
		await rm(tree, { recursive: true, force: true });
		await mkdir(tree, { recursive: true });
		const archive = execFileSync('git', ['-C', clone, 'archive', '--format=tar', lock.commit], {
			maxBuffer: 1024 * 1024 * 1024
		});
		// cwd, not -C: GNU tar reads a drive letter (O:) as a remote host.
		execFileSync('tar', ['-x', '-f', '-'], { cwd: tree, input: archive });
		console.log(`${tag} exported ${lock.tag} (${lock.commit.slice(0, 7)}) to ${path.relative(siteRoot, tree)}`);
	}

	const cmdDir = path.join(tree, 'cmd', 'mudocsmeta');
	await mkdir(cmdDir, { recursive: true });
	await copyFile(path.join(siteRoot, 'tools', 'mutant-meta', 'main.go'), path.join(cmdDir, 'main.go'));

	const raw = path.join(tree, 'mudocsmeta.json');
	execFileSync('go', ['run', './cmd/mudocsmeta', '-out', raw], { cwd: tree, stdio: 'inherit' });
	const meta = JSON.parse(await readFile(raw, 'utf8'));
	if (!Number.isInteger(meta.count) || meta.count !== meta.builtins.length || meta.count === 0) {
		throw new Error(`implausible output: count ${meta.count}, ${meta.builtins?.length} entries`);
	}

	const record = {
		$comment: 'Written by scripts/mutant-meta.mjs from builtin.Builtins at the pinned commit; do not edit.',
		repo: lock.repo,
		tag: lock.tag,
		commit: lock.commit,
		count: meta.count,
		builtins: meta.builtins
	};
	await mkdir(path.dirname(metaPath), { recursive: true });
	await writeFile(metaPath, `${JSON.stringify(record, null, '\t')}\n`);
	console.log(`${tag} ${lock.tag}: ${meta.count} builtins -> ${path.relative(siteRoot, metaPath)}`);
}

async function check(lock) {
	let meta;
	try {
		meta = JSON.parse(await readFile(metaPath, 'utf8'));
	} catch {
		throw new Error(`${path.relative(siteRoot, metaPath)} is missing or unreadable; run with --mutant <path>`);
	}
	if (meta.tag !== lock.tag || meta.commit !== lock.commit) {
		throw new Error(
			`metadata is from ${meta.tag}@${String(meta.commit).slice(0, 7)}, lock is ${lock.tag}@${lock.commit.slice(0, 7)}; regenerate with --mutant <path>`
		);
	}
	if (meta.count !== meta.builtins.length) throw new Error(`count ${meta.count} != ${meta.builtins.length} entries`);
	console.log(`${tag} ok: ${meta.count} builtins at ${lock.tag}`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const lock = JSON.parse(await readFile(path.join(siteRoot, 'mutant.lock.json'), 'utf8'));
	if (args.check) await check(lock);
	else await generate(lock, path.resolve(args.mutant));
}

main().catch((error) => {
	console.error(`${tag} FAILED: ${error.message}`);
	process.exitCode = 1;
});
