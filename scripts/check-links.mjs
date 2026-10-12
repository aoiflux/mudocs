// Crawls the built site and fails on any broken internal link, or any link
// into the Mutant repo that names a moving branch instead of the pinned tag.
//
// It serves the production build with `vite preview`, starts from / and every
// sitemap URL, and follows every same-origin link it finds. Run after a build:
//   npm run build && npm run check:links
//
// In-page anchors (#heading) on doc pages are checked too: a link to a heading
// that does not exist on its target page is reported as broken.

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tag = '[check-links]';

/** Citations must name the pinned tag; a branch moves under the text that cites it. */
const UNPINNED = /https:\/\/github\.com\/aoiflux\/mutant\/(?:tree|blob)\/(?:main|master|dev)\b[^"'\s<)]*/g;

/** Large or generated static files: checked for existence, never downloaded. */
const HEAD_ONLY = /\.(wasm|js|css|png|jpe?g|svg|webp|ico|mp4|woff2?|zip|json|txt)$/i;

function freePort() {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.unref();
		server.on('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const { port } = server.address();
			server.close(() => resolve(port));
		});
	});
}

async function startPreview() {
	const port = await freePort();
	const vite = path.join(siteRoot, 'node_modules', 'vite', 'bin', 'vite.js');
	const child = spawn(process.execPath, [vite, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
		cwd: siteRoot,
		stdio: ['ignore', 'pipe', 'pipe']
	});
	let log = '';
	child.stdout.on('data', (d) => (log += d));
	child.stderr.on('data', (d) => (log += d));

	const origin = `http://127.0.0.1:${port}`;
	for (let i = 0; i < 120; i += 1) {
		if (child.exitCode !== null) throw new Error(`vite preview exited:\n${log}`);
		try {
			await fetch(origin, { method: 'HEAD' });
			return { origin, stop: () => child.kill() };
		} catch {
			await new Promise((r) => setTimeout(r, 250));
		}
	}
	child.kill();
	throw new Error(`vite preview did not start (is there a build? run npm run build):\n${log}`);
}

function extractLinks(html) {
	const hrefs = [];
	for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) hrefs.push(m[1].replace(/&amp;/g, '&'));
	return hrefs;
}

function extractIds(html) {
	return new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
}

async function main() {
	const { origin, stop } = await startPreview();
	const problems = [];
	const pages = new Map(); // path -> { status, ids }
	const anchorRefs = []; // { from, path, fragment }
	const assets = new Map(); // path -> first page that linked it
	const queue = ['/'];
	const queued = new Set(queue);

	const enqueue = (p, from) => {
		if (HEAD_ONLY.test(p)) {
			if (!assets.has(p)) assets.set(p, from);
		} else if (!queued.has(p)) {
			queued.add(p);
			queue.push(p);
		}
	};

	try {
		const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
		for (const m of sitemap.matchAll(/<loc>https?:\/\/[^/<]+([^<]*)<\/loc>/g)) enqueue(m[1] || '/', 'sitemap.xml');

		while (queue.length) {
			const batch = queue.splice(0, 8);
			await Promise.all(
				batch.map(async (pagePath) => {
					const res = await fetch(origin + pagePath, { redirect: 'manual' });
					const html = res.ok && (res.headers.get('content-type') ?? '').includes('text/html') ? await res.text() : '';
					pages.set(pagePath, { status: res.status, ids: extractIds(html) });

					for (const bad of html.matchAll(UNPINNED)) problems.push(`unpinned  ${pagePath} -> ${bad[0]}`);

					for (const raw of extractLinks(html)) {
						if (raw.startsWith('#')) {
							if (raw.length > 1) anchorRefs.push({ from: pagePath, path: pagePath, fragment: raw.slice(1) });
							continue;
						}
						let url;
						try {
							url = new URL(raw, origin + pagePath);
						} catch {
							problems.push(`malformed ${pagePath} -> ${raw}`);
							continue;
						}
						if (url.origin !== origin) continue;
						if (url.hash.length > 1) {
							anchorRefs.push({ from: pagePath, path: url.pathname, fragment: decodeURIComponent(url.hash.slice(1)) });
						}
						enqueue(url.pathname, pagePath);
					}
				})
			);
		}

		for (const [pagePath, { status }] of pages) {
			if (status !== 200) problems.push(`HTTP ${status}  ${pagePath}`);
		}

		for (const [assetPath, from] of assets) {
			const res = await fetch(origin + assetPath, { method: 'HEAD' });
			if (!res.ok) problems.push(`HTTP ${res.status}  ${assetPath} (linked from ${from})`);
		}

		for (const ref of anchorRefs) {
			const page = pages.get(ref.path);
			if (page && page.status === 200 && !page.ids.has(ref.fragment)) {
				problems.push(`anchor    ${ref.from} -> ${ref.path}#${ref.fragment}`);
			}
		}
	} finally {
		stop();
	}

	const unique = [...new Set(problems)].sort();
	if (unique.length) {
		for (const line of unique) console.error(`${tag} ${line}`);
		throw new Error(`${unique.length} problem(s) across ${pages.size} pages`);
	}
	console.log(`${tag} ok: ${pages.size} pages, ${assets.size} assets, ${anchorRefs.length} anchors, no unpinned repo links`);
}

main().catch((error) => {
	console.error(`${tag} FAILED: ${error.message}`);
	process.exitCode = 1;
});
