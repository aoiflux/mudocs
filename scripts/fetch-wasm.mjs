// Installs the Mutant browser REPL into static/wasm-repl/ from the release that
// mutant.lock.json pins, and refuses anything whose digest does not match.
//
// The artifact comes from the GitHub release asset (wasm-repl.zip), not from a
// sibling checkout, so the site can only ever serve a build that was published
// under the pinned tag. Every failure exits non-zero: a build must never ship a
// playground silently running some other version.
//
// Usage:
//   node scripts/fetch-wasm.mjs                 install (download if needed)
//   node scripts/fetch-wasm.mjs --zip <path>    install from a local wasm-repl.zip
//   node scripts/fetch-wasm.mjs --check         verify what is installed; never writes

import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSums, readZip, sha256 } from './lib/release.mjs';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(siteRoot, 'static', 'wasm-repl');
const manifestPath = path.join(outDir, 'manifest.json');
const tag = '[fetch-wasm]';

function parseArgs(argv) {
	const args = { zip: null, check: false };
	for (let i = 0; i < argv.length; i += 1) {
		if (argv[i] === '--check') args.check = true;
		else if (argv[i] === '--zip') args.zip = argv[++i];
		else throw new Error(`unknown argument: ${argv[i]}`);
	}
	return args;
}

async function readIfExists(file) {
	try {
		return await readFile(file);
	} catch {
		return null;
	}
}

/** True when every pinned file is installed with the pinned digest. */
async function installedMatches(lock) {
	const manifest = await readIfExists(manifestPath);
	if (!manifest) return { ok: false, why: 'no manifest.json' };

	let parsed;
	try {
		parsed = JSON.parse(manifest.toString('utf8'));
	} catch {
		return { ok: false, why: 'manifest.json is not JSON' };
	}
	if (parsed.tag !== lock.tag || parsed.commit !== lock.commit) {
		return { ok: false, why: `manifest is ${parsed.tag}@${parsed.commit}, lock is ${lock.tag}@${lock.commit}` };
	}

	for (const [name, want] of Object.entries(lock.wasm.files)) {
		const buf = await readIfExists(path.join(outDir, name));
		if (!buf) return { ok: false, why: `${name} missing` };
		if (buf.length !== want.bytes || sha256(buf) !== want.sha256) {
			return { ok: false, why: `${name} does not match the lock` };
		}
	}
	return { ok: true, why: '' };
}

async function obtainZip(lock, zipArg) {
	if (zipArg) {
		console.log(`${tag} using local archive ${zipArg}`);
		return readFile(path.resolve(zipArg));
	}

	const cached = path.join(siteRoot, '.cache', 'wasm', lock.tag, lock.wasm.asset);
	const hit = await readIfExists(cached);
	if (hit && sha256(hit) === lock.wasm.zipSha256) {
		console.log(`${tag} using cached ${path.relative(siteRoot, cached)}`);
		return hit;
	}

	const url = `https://github.com/${lock.repo}/releases/download/${lock.tag}/${lock.wasm.asset}`;
	console.log(`${tag} downloading ${url}`);
	const res = await fetch(url, { redirect: 'follow' });
	if (!res.ok) throw new Error(`download failed: HTTP ${res.status} ${res.statusText}`);
	const buf = Buffer.from(await res.arrayBuffer());

	await mkdir(path.dirname(cached), { recursive: true });
	await writeFile(cached, buf);
	return buf;
}

async function install(lock, zipArg) {
	const zip = await obtainZip(lock, zipArg);
	const zipDigest = sha256(zip);
	if (zipDigest !== lock.wasm.zipSha256) {
		throw new Error(`${lock.wasm.asset} sha256 ${zipDigest} does not match the lock (${lock.wasm.zipSha256})`);
	}

	const entries = readZip(zip);
	const byBase = new Map([...entries].map(([name, data]) => [path.posix.basename(name), data]));
	const sumsFile = byBase.get('SHA256SUMS');
	if (!sumsFile) throw new Error('archive has no SHA256SUMS');
	const sums = parseSums(sumsFile.toString('utf8'));

	await mkdir(outDir, { recursive: true });
	for (const [name, want] of Object.entries(lock.wasm.files)) {
		const data = byBase.get(name);
		if (!data) throw new Error(`archive has no ${name}`);
		const digest = sha256(data);
		if (sums.get(name) !== digest) throw new Error(`${name} does not match the archive's SHA256SUMS`);
		if (digest !== want.sha256 || data.length !== want.bytes) {
			throw new Error(`${name} sha256 ${digest} (${data.length} B) does not match the lock`);
		}

		const target = path.join(outDir, name);
		const tmp = `${target}.tmp`;
		await writeFile(tmp, data);
		await rm(target, { force: true });
		await rename(tmp, target);
		console.log(`${tag} installed ${name} (${data.length} B)`);
	}

	const manifest = {
		repo: lock.repo,
		tag: lock.tag,
		commit: lock.commit,
		files: lock.wasm.files
	};
	await writeFile(manifestPath, `${JSON.stringify(manifest, null, '\t')}\n`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const lock = JSON.parse(await readFile(path.join(siteRoot, 'mutant.lock.json'), 'utf8'));

	const state = await installedMatches(lock);
	if (state.ok) {
		console.log(`${tag} Mutant ${lock.tag} REPL already installed and verified`);
		return;
	}
	if (args.check) {
		throw new Error(`installed REPL is not ${lock.tag}: ${state.why}`);
	}

	console.log(`${tag} installing Mutant ${lock.tag} REPL (${state.why})`);
	await install(lock, args.zip);

	const after = await installedMatches(lock);
	if (!after.ok) throw new Error(`post-install verification failed: ${after.why}`);
	console.log(`${tag} Mutant ${lock.tag} REPL installed and verified`);
}

main().catch((error) => {
	console.error(`${tag} FAILED: ${error.message}`);
	process.exitCode = 1;
});
