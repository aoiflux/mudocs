// Re-pins the site to a published Mutant release: rewrites mutant.lock.json
// from the release itself, then installs and verifies its browser REPL.
//
// Every digest in the lock is derived here, never typed by hand. The zip digest
// comes from the release's own SHA256SUMS, and each file inside the zip must
// match the zip's SHA256SUMS before it is recorded.
//
// Usage:
//   npm run pin:mutant -- v2.7.0

import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSums, readZip, sha256 } from './lib/release.mjs';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = path.join(siteRoot, 'mutant.lock.json');
const tag = '[pin-mutant]';

async function getJson(url) {
	const res = await fetch(url, { headers: { accept: 'application/vnd.github+json' } });
	if (!res.ok) throw new Error(`${url}: HTTP ${res.status} ${res.statusText}`);
	return res.json();
}

async function getBytes(url) {
	const res = await fetch(url, { redirect: 'follow' });
	if (!res.ok) throw new Error(`${url}: HTTP ${res.status} ${res.statusText}`);
	return Buffer.from(await res.arrayBuffer());
}

async function main() {
	const wanted = process.argv[2];
	if (!wanted || !/^v\d+\.\d+\.\d+$/.test(wanted)) {
		throw new Error('usage: npm run pin:mutant -- vMAJOR.MINOR.PATCH');
	}

	const old = JSON.parse(await readFile(lockPath, 'utf8'));
	const repo = old.repo;
	const assetName = old.wasm.asset;
	const api = `https://api.github.com/repos/${repo}`;

	const release = await getJson(`${api}/releases/tags/${wanted}`);
	if (release.draft) throw new Error(`${wanted} is a draft release`);
	if (release.prerelease) throw new Error(`${wanted} is marked prerelease; the site pins published releases only`);

	// commits/{ref} peels annotated tags to the commit they point at.
	const { sha: commit } = await getJson(`${api}/commits/${wanted}`);

	const assetUrl = (name) => {
		const asset = release.assets.find((a) => a.name === name);
		if (!asset) throw new Error(`release ${wanted} has no ${name} asset`);
		return asset.browser_download_url;
	};

	console.log(`${tag} downloading ${assetName} from ${wanted}`);
	const zip = await getBytes(assetUrl(assetName));
	const zipSha256 = sha256(zip);

	// Releases up to v2.6.1 list only the binaries in SHA256SUMS. When the zip is
	// listed, it must match; when it is not, the files inside are still checked
	// against the zip's own SHA256SUMS below, and the lock freezes this download.
	const releaseSums = parseSums((await getBytes(assetUrl('SHA256SUMS'))).toString('utf8'));
	const vouchedZip = releaseSums.get(assetName);
	if (vouchedZip && vouchedZip !== zipSha256) {
		throw new Error(`${assetName} does not match the release SHA256SUMS`);
	}
	if (!vouchedZip) {
		console.warn(`${tag} warning: release SHA256SUMS does not list ${assetName}; pinning the downloaded digest`);
	}

	const entries = new Map(
		[...readZip(zip)].map(([name, data]) => [path.posix.basename(name), data])
	);
	const innerSums = entries.get('SHA256SUMS');
	if (!innerSums) throw new Error(`${assetName} has no SHA256SUMS`);
	const vouched = parseSums(innerSums.toString('utf8'));

	const files = {};
	for (const name of Object.keys(old.wasm.files)) {
		const data = entries.get(name);
		if (!data) throw new Error(`${assetName} has no ${name}`);
		const digest = sha256(data);
		if (vouched.get(name) !== digest) throw new Error(`${name} does not match ${assetName}'s SHA256SUMS`);
		files[name] = { sha256: digest, bytes: data.length };
	}

	const lock = {
		$comment: old.$comment,
		repo,
		tag: wanted,
		commit,
		released: release.published_at.slice(0, 10),
		wasm: { asset: assetName, zipSha256, files }
	};
	await writeFile(lockPath, `${JSON.stringify(lock, null, '\t')}\n`);
	console.log(`${tag} mutant.lock.json -> ${wanted} @ ${commit}`);

	// Hand the already-verified archive to the installer instead of downloading twice.
	const cached = path.join(siteRoot, '.cache', 'wasm', wanted, assetName);
	await mkdir(path.dirname(cached), { recursive: true });
	await writeFile(cached, zip);

	const install = spawnSync(process.execPath, [path.join(siteRoot, 'scripts', 'fetch-wasm.mjs')], {
		stdio: 'inherit'
	});
	if (install.status !== 0) throw new Error('fetch-wasm failed after re-pinning');
}

main().catch((error) => {
	console.error(`${tag} FAILED: ${error.message}`);
	process.exitCode = 1;
});
