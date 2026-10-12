/**
 * Build-time loader for workshop modules: validates a module's spec and
 * resolves every Mutant file it names from the mirror in content/repo/.
 *
 * Programs arrive highlighted line by line and goldens as plain lines. The
 * page receives nothing else, so every line of code or output it can show is
 * a byte of the pinned release. A missing file or an out-of-range line is a
 * build failure, not a blank panel; scripts/check-workshop.mjs reports the
 * same problems earlier, in `npm run check`.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { WORKSHOP_SPECS } from '$lib/workshop/content';
import { workshopModule, type Stage } from '$lib/workshop/schema';
import type { ResolvedModule, ResolvedStage } from '$lib/workshop/resolved';
import { SCENE_DATA } from '$lib/workshop/scenes/data';
import { MUTANT_TAG } from '$lib/mutant-pin';
import { REPO } from '$lib/site';
import { highlightLines } from './highlight';

const MIRROR_ROOT = path.resolve(process.cwd(), 'content', 'repo');

export function workshopModuleIds(): string[] {
	return Object.keys(WORKSHOP_SPECS);
}

async function readMirrored(repoPath: string): Promise<Buffer> {
	try {
		return await fs.readFile(path.join(MIRROR_ROOT, ...repoPath.split('/')));
	} catch {
		throw new Error(`${repoPath} is not mirrored; add it to WORKSHOP_FILES in scripts/mutant-sync.mjs and re-sync`);
	}
}

function linesOf(buf: Buffer): string[] {
	return buf.toString('utf8').replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
}

function assertRange(range: [number, number], count: number, what: string): void {
	if (range[1] > count) throw new Error(`${what}: lines ${range[0]}-${range[1]}, but it has ${count}`);
}

const blobUrl = (repoPath: string) => `${REPO.docsBlobBase}/${repoPath}`;

async function resolveStage(stage: Stage, where: string): Promise<ResolvedStage> {
	switch (stage.kind) {
		case 'walkthrough': {
			const program = (await readMirrored(stage.program)).toString('utf8');
			const outputLines = stage.golden ? linesOf(await readMirrored(stage.golden)) : (stage.simulated ?? []);
			const programLines = await highlightLines(program, 'mutant');
			for (const [i, step] of stage.steps.entries()) {
				assertRange(step.lines, programLines.length, `${where} step ${i + 1} ${stage.program}`);
				if (step.output) {
					assertRange(step.output, outputLines.length, `${where} step ${i + 1} ${stage.golden ?? 'simulated output'}`);
				}
			}
			return {
				...stage,
				programLines,
				outputLines,
				programUrl: blobUrl(stage.program)
			};
		}
		case 'concept': {
			const raw = stage.data ? JSON.parse((await readMirrored(stage.data)).toString('utf8')) : stage.values;
			const scene = SCENE_DATA[stage.scene].safeParse(raw);
			if (!scene.success) {
				throw new Error(`${where}: ${stage.data ?? 'values'} is not ${stage.scene} data: ${scene.error.message}`);
			}
			return { ...stage, sceneData: scene.data };
		}
		case 'resources': {
			const resolved = await Promise.all(
				stage.files.map(async (file) => {
					const data = await readMirrored(file.path);
					return {
						...file,
						bytes: data.length,
						sha256: createHash('sha256').update(data).digest('hex'),
						url: blobUrl(file.path)
					};
				})
			);
			return { ...stage, resolved };
		}
		default:
			return stage;
	}
}

export async function loadWorkshopModule(id: string): Promise<ResolvedModule | null> {
	const spec = WORKSHOP_SPECS[id];
	if (!spec) return null;
	const parsed = workshopModule.safeParse(spec);
	if (!parsed.success) throw new Error(`workshop module ${id}: ${parsed.error.message}`);
	const module = parsed.data;
	if (module.pin !== MUTANT_TAG) {
		throw new Error(`workshop module ${id} was written for ${module.pin}; the site is pinned to ${MUTANT_TAG}`);
	}
	const tiers = await Promise.all(
		module.tiers.map(async (tier) => ({
			...tier,
			stages: await Promise.all(tier.stages.map((stage) => resolveStage(stage, `${id}/${tier.id}/${stage.id}`)))
		}))
	);
	return { ...module, tiers };
}
