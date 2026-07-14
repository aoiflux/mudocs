import { copyFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');
const srcDir = path.join(repoRoot, 'wasm-repl');
const outDir = path.join(siteRoot, 'static', 'wasm-repl');

const artifacts = ['wasm_exec.js', 'mutant_repl.wasm'];

async function exists(filePath) {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function main() {
	const hasSourceDir = await exists(srcDir);
	if (!hasSourceDir) {
		console.log('[sync-wasm-repl] Source directory not found, skipping:', srcDir);
		return;
	}

	await mkdir(outDir, { recursive: true });

	for (const artifact of artifacts) {
		const source = path.join(srcDir, artifact);
		const target = path.join(outDir, artifact);

		if (!(await exists(source))) {
			console.log(`[sync-wasm-repl] Missing source artifact: ${source}`);
			continue;
		}

		await copyFile(source, target);
		console.log(`[sync-wasm-repl] Copied ${artifact}`);
	}
}

main().catch((error) => {
	console.error('[sync-wasm-repl] Failed:', error);
	process.exitCode = 1;
});
