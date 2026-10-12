// Checks every workshop module against the pinned Mutant release.
//
// Errors fail the check for every module, published or not:
//   - the module does not match the schema (V-B3: concept, walkthrough, check
//     and resources stages in every tier), or names another release than the lock
//   - it names a Mutant file that is not mirrored (scripts/mutant-sync.mjs)
//   - a walkthrough step points past the end of its program or output, or the
//     golden is not the program's own (V-B2)
//   - a program calls something that is neither a builtin at the pin nor its
//     own binding, or a builtin with no teaching doc, not stable, or not on
//     every platform (V-B1 a-d)
// Blockers only stop publication: a module is published when WORKSHOP_MODULES
// marks it `available`, and then a blocker is an error too.
//   - a concept scene or film nobody has checked against its sources (V-B6)
//   - a builtin not cleared against the ledger at this pin (V-B1 e,
//     verification/ledger-clearance.json, written by scripts/ledger-clear.mjs)
// Blocked builtin names are printed only with --names: CI logs are public, and
// the names alone could point at an embargoed finding.
//
// Usage: node --experimental-strip-types scripts/check-workshop.mjs [--names]

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { builtinsCalled, importsOf } from './lib/mutant-source.mjs';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(siteRoot, 'src', 'lib', 'workshop', 'content');
const mirrorRoot = path.join(siteRoot, 'content', 'repo');
const tag = '[check-workshop]';
const showNames = process.argv.includes('--names');

const readJson = async (...parts) => JSON.parse(await readFile(path.join(siteRoot, ...parts), 'utf8'));
const importTs = (file) => import(pathToFileURL(file).href);

async function readOptionalJson(...parts) {
	try {
		return await readJson(...parts);
	} catch {
		return null;
	}
}

const linesOf = (text) => text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');

function filesNamed(module) {
	const files = [];
	for (const tier of module.tiers) {
		for (const stage of tier.stages) {
			if (stage.kind === 'cinematic') {
				files.push(...stage.sources.filter((s) => s.kind === 'mutant-file').map((s) => s.ref));
			}
			if (stage.kind === 'concept') {
				if (stage.data) files.push(stage.data);
				files.push(...stage.sources.filter((s) => s.kind === 'mutant-file').map((s) => s.ref));
			}
			if (stage.kind === 'walkthrough') files.push(stage.program, ...(stage.golden ? [stage.golden] : []));
			if (stage.kind === 'resources') files.push(...stage.files.map((f) => f.path));
		}
	}
	return [...new Set(files)];
}

async function checkModule(file, ctx) {
	const errors = [];
	const blockers = [];
	const { spec } = await importTs(file);
	const parsed = ctx.schema.workshopModule.safeParse(spec);
	if (!parsed.success) {
		for (const issue of parsed.error.issues)
			errors.push(`schema: ${issue.path.join('.') || '(module)'}: ${issue.message}`);
		return {
			id: spec?.id ?? path.basename(file),
			errors,
			blockers,
			builtins: []
		};
	}
	const module = parsed.data;

	if (module.pin !== ctx.lock.tag) errors.push(`written for ${module.pin}, the lock pins ${ctx.lock.tag}`);
	if (!ctx.indexSource.includes(`'./${path.basename(file, '.ts')}'`)) {
		errors.push(`not listed in src/lib/workshop/content/index.ts`);
	}
	const entry = ctx.pathMap.find((m) => m.id === module.id);
	if (!entry) errors.push('not on the path map (WORKSHOP_MODULES)');
	else if (entry.href !== `/workshop/${module.id}`)
		errors.push(`path map links ${entry.href}, the page is /workshop/${module.id}`);

	for (const repoPath of filesNamed(module)) {
		if (!ctx.mirrored.has(repoPath))
			errors.push(`${repoPath} is not mirrored: add it to WORKSHOP_FILES in scripts/mutant-sync.mjs`);
	}

	const builtins = new Set();
	const blockBuiltins = [];
	let simulated = 0;
	for (const tier of module.tiers) {
		for (const stage of tier.stages) {
			const where = `${tier.id}/${stage.id}`;
			if (stage.kind === 'concept' && !stage.reviewedBy)
				blockers.push(`${where}: scene not yet checked against its sources (reviewedBy)`);
			if (stage.kind === 'cinematic' && !stage.reviewedBy)
				blockers.push(`${where}: film not yet checked against its sources (reviewedBy)`);
			if (stage.kind === 'build') {
				for (const block of stage.blocks) for (const name of block.builtins) blockBuiltins.push({ where, name });
			}
			if (stage.kind !== 'walkthrough') continue;
			if (stage.golden && stage.golden !== stage.program.replace(/\.mut$/, '.golden')) {
				errors.push(`${where}: ${stage.golden} is not the recorded output of ${stage.program}`);
			}
			if (!stage.golden) simulated += 1;
			if (!ctx.mirrored.has(stage.program) || (stage.golden && !ctx.mirrored.has(stage.golden))) continue;
			let program = await readFile(path.join(mirrorRoot, ...stage.program.split('/')), 'utf8');
			const programCount = linesOf(program).length;
			const goldenCount = stage.golden
				? linesOf(await readFile(path.join(mirrorRoot, ...stage.golden.split('/')), 'utf8')).length
				: stage.simulated.length;
			for (const [i, step] of stage.steps.entries()) {
				if (step.lines[1] > programCount)
					errors.push(`${where} step ${i + 1}: lines ${step.lines.join('-')}, program has ${programCount}`);
				if (step.output && step.output[1] > goldenCount) {
					errors.push(
						`${where} step ${i + 1}: output ${step.output.join('-')}, ${stage.golden ? 'golden' : 'simulated output'} has ${goldenCount}`
					);
				}
			}
			// An imported library's builtins are this program's builtins too.
			for (const imported of importsOf(program)) {
				const repoPathOf = path.posix.join(path.posix.dirname(stage.program), imported);
				if (!ctx.mirrored.has(repoPathOf)) {
					errors.push(`${stage.program} imports ${repoPathOf}, which is not mirrored`);
					continue;
				}
				program += `\n${await readFile(path.join(mirrorRoot, ...repoPathOf.split('/')), 'utf8')}`;
			}
			const called = builtinsCalled(program, ctx.builtinNames);
			for (const name of called.unknown)
				errors.push(`${stage.program}: calls ${name}(), not a builtin at ${ctx.lock.tag}`);
			for (const name of called.builtins) builtins.add(name);
		}
	}

	// V-B1 f: a builder block may only name builtins this module's programs really call.
	for (const { where, name } of blockBuiltins) {
		if (!ctx.builtinNames.has(name)) errors.push(`${where}: block names ${name}, not a builtin at ${ctx.lock.tag}`);
		else if (!builtins.has(name)) errors.push(`${where}: block names ${name}, which no program in this module calls`);
	}

	let uncleared = [];
	for (const name of builtins) {
		const meta = ctx.builtins.get(name);
		if (!meta.documented) errors.push(`builtin ${name} has no teaching doc at ${ctx.lock.tag}`);
		if (meta.stability !== 'stable')
			errors.push(`builtin ${name} is ${meta.stability}${meta.replacedBy ? `, use ${meta.replacedBy}` : ''}`);
		if (meta.platforms.length > 0) errors.push(`builtin ${name} runs only on ${meta.platforms.join(', ')}`);
		if (!ctx.cleared.has(name)) uncleared.push(name);
	}
	if (uncleared.length > 0) {
		const names = showNames ? `: ${uncleared.join(', ')}` : ' (--names lists them)';
		blockers.push(
			`${uncleared.length} of ${builtins.size} builtins not cleared against the ledger at ${ctx.lock.tag}${names}`
		);
	}

	if (entry?.status === 'available') errors.push(...blockers.map((b) => `published, but ${b}`));
	return {
		id: module.id,
		errors,
		blockers,
		builtins: [...builtins],
		simulated,
		published: entry?.status === 'available'
	};
}

async function main() {
	const lock = await readJson('mutant.lock.json');
	const sync = await readJson('mutant.sync.json');
	const meta = await readJson('src', 'lib', 'generated', 'mutant-meta.json');
	if (meta.commit !== lock.commit)
		throw new Error('mutant-meta.json is not from the locked commit; run npm run meta:mutant');

	const clearance = await readOptionalJson('verification', 'ledger-clearance.json');
	let cleared = new Set();
	let clearanceNote = 'no ledger clearance yet (npm run ledger:clear)';
	if (clearance) {
		if (clearance.commit === lock.commit) {
			cleared = new Set(clearance.cleared);
			clearanceNote = `ledger clearance from ${clearance.checkedAt}: ${cleared.size} builtins cleared`;
		} else {
			clearanceNote = `ledger clearance is for ${clearance.pin}, not ${lock.tag}: ignored; re-run npm run ledger:clear`;
		}
	}

	const ctx = {
		lock,
		cleared,
		mirrored: new Set(Object.keys(sync.files)),
		builtins: new Map(meta.builtins.map((b) => [b.name, b])),
		builtinNames: new Set(meta.builtins.map((b) => b.name)),
		schema: await importTs(path.join(siteRoot, 'src', 'lib', 'workshop', 'schema.ts')),
		pathMap: (await importTs(path.join(siteRoot, 'src', 'lib', 'workshop', 'modules.ts'))).WORKSHOP_MODULES,
		indexSource: await readFile(path.join(contentDir, 'index.ts'), 'utf8')
	};

	const files = (await readdir(contentDir)).filter((f) => f.endsWith('.ts') && f !== 'index.ts').sort();
	let failed = 0;
	console.log(`${tag} ${clearanceNote}`);
	for (const file of files) {
		const result = await checkModule(path.join(contentDir, file), ctx);
		const state = result.published
			? 'published'
			: result.blockers.length
				? 'preview, not publishable yet'
				: 'preview, publishable';
		const outputs = result.simulated
			? ` · ${result.simulated} simulated output${result.simulated === 1 ? '' : 's'}`
			: '';
		console.log(
			`${tag} ${result.id}: ${result.errors.length ? 'FAILED' : 'ok'} · ${result.builtins.length} builtins${outputs} · ${state}`
		);
		for (const line of result.errors) console.error(`${tag}   error    ${line}`);
		for (const line of result.published ? [] : result.blockers) console.log(`${tag}   blocks   ${line}`);
		if (result.errors.length) failed += 1;
	}
	if (failed) throw new Error(`${failed} module(s) failed`);
}

main().catch((error) => {
	console.error(`${tag} FAILED: ${error.message}`);
	process.exitCode = 1;
});
