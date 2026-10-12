/**
 * The shape of a workshop module, as authored in src/lib/workshop/content/.
 *
 * A module never carries program text or output text. It names files mirrored
 * from Mutant at the pinned release (content/repo/, written by
 * scripts/mutant-sync.mjs) and points into them by line number, so the code
 * on the page is always the release's, never a copy that can drift from it.
 * The one exception is output: a program with no golden carries a simulated
 * output, which the page labels as such.
 *
 * Validated twice: by scripts/check-workshop.mjs (`npm run check`), which also
 * checks every referenced file and line range, and by the page loader at build
 * time. Keep this file free of relative imports: the check script loads it
 * with Node's type stripping.
 */
import { z } from 'zod';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lower-case words joined by hyphens');

/** A path in the Mutant repo, as listed in mutant.sync.json. */
export const repoPath = z
	.string()
	.regex(/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)*\.[A-Za-z0-9]+$/, 'a relative file path in the Mutant repo')
	.refine((value) => !value.split('/').includes('..'), 'no .. segments');

/** An inclusive, 1-based line range. */
const lineRange = z
	.tuple([z.number().int().min(1), z.number().int().min(1)])
	.refine(([from, to]) => from <= to, 'range starts after it ends');

const text = z.string().trim().min(1);

/** Where a fact shown in a scene comes from. */
export const sceneSource = z.object({
	kind: z.enum(['mutant-file', 'builtin-metadata', 'external-spec']),
	/** A repo path, a builtin name or a URL, by kind. */
	ref: text,
	note: text.optional()
});

const stageBase = { id: slug, title: text };

const hookStage = z.object({
	...stageBase,
	kind: z.literal('hook'),
	paragraphs: z.array(text).min(1)
});

export const SCENES = [
	'RegistryTree',
	'MftRecord',
	'RedirectChain',
	'CookieJar',
	'CaseBoard',
	'RecordModel',
	'CidrBlock'
] as const;

const conceptStage = z
	.object({
		...stageBase,
		kind: z.literal('concept'),
		scene: z.enum(SCENES),
		/** A mirrored file the scene draws, read at build time... */
		data: repoPath.optional(),
		/** ...or the scene's data written here, when it illustrates a concept rather than draws a file. */
		values: z.unknown().optional(),
		intro: text,
		steps: z
			.array(
				z.object({
					label: text,
					text,
					/** Scene-specific: what to highlight at this step. */
					focus: z.string()
				})
			)
			.min(1),
		sources: z.array(sceneSource).min(1),
		/** Who checked the scene against its sources, and when. Unreviewed scenes do not publish. */
		reviewedBy: text.optional(),
		reviewedAt: z.iso.date().optional()
	})
	.refine(
		(value) => (value.data === undefined) !== (value.values === undefined),
		'give the scene data or values, not both'
	);

export const FILMS = ['Timestomp', 'Malvertising', 'RegistryPersistence'] as const;

/** The shots each film draws, in order. A cinematic stage narrates exactly these. */
export const FILM_SHOTS: Record<(typeof FILMS)[number], readonly string[]> = {
	Timestomp: ['system', 'volume', 'mft', 'path', 'attributes', 'reach', 'rewrite', 'split', 'sources', 'catch'],
	Malvertising: ['browse', 'ad', 'click', 'chain', 'hops', 'cookies', 'profile', 'vault', 'ids', 'map'],
	RegistryPersistence: ['boot', 'city', 'navigate', 'locations', 'execute', 'write', 'reboot', 'read', 'spawn', 'artifacts']
};

/**
 * A narrated motion sequence: one film, shot by shot, from the user's action
 * down to the structure it changes. Like a concept scene, it draws case values
 * written here and does not publish until someone has checked it against its
 * sources.
 */
const cinematicStage = z
	.object({
		...stageBase,
		kind: z.literal('cinematic'),
		film: z.enum(FILMS),
		/** The case values the film draws; the loader checks them against the film's own schema. */
		values: z.unknown(),
		intro: text,
		shots: z.array(z.object({ shot: z.string(), title: text, text })).min(1),
		sources: z.array(sceneSource).min(1),
		reviewedBy: text.optional(),
		reviewedAt: z.iso.date().optional()
	})
	.superRefine((value, ctx) => {
		const want = FILM_SHOTS[value.film];
		if (value.shots.map((s) => s.shot).join() !== want.join()) {
			ctx.addIssue({ code: 'custom', message: `${value.film} narrates the shots ${want.join(', ')}, in that order` });
		}
	});

const walkthroughStage = z
	.object({
		...stageBase,
		kind: z.literal('walkthrough'),
		program: repoPath.refine((value) => value.endsWith('.mut'), 'a .mut program'),
		/** The program's recorded output, as Mutant's sweep wrote it. */
		golden: repoPath.refine((value) => value.endsWith('.golden'), 'a .golden file').optional(),
		/**
		 * Without a golden: the output the program would print, written for
		 * teaching and shown labelled as a simulation. It follows the program's
		 * own print statements and the case data its input is generated from.
		 */
		simulated: z.array(z.string()).min(1).optional(),
		steps: z
			.array(
				z.object({
					lines: lineRange,
					/** The output lines this step's code printed, if it printed any. */
					output: lineRange.optional(),
					note: text
				})
			)
			.min(1)
	})
	.superRefine((value, ctx) => {
		const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
		if (!value.golden === !value.simulated) issue('give the walkthrough a golden or a simulated output, not both');
		if (!value.steps.some((step) => step.output)) issue('no step shows any of the output');
	});

const buildStage = z
	.object({
		...stageBase,
		kind: z.literal('build'),
		prompt: text,
		blocks: z
			.array(
				z.object({
					id: slug,
					label: text,
					/** The builtins this step stands for; each must appear in a program this module walks through. */
					builtins: z.array(z.string()).default([])
				})
			)
			.min(2),
		/** Block ids in order. Blocks not listed are distractors. */
		answer: z.array(slug).min(2),
		explain: text
	})
	.superRefine((value, ctx) => {
		const ids = value.blocks.map((b) => b.id);
		for (const id of value.answer) {
			if (!ids.includes(id))
				ctx.addIssue({
					code: 'custom',
					message: `answer names ${id}, which is not a block`
				});
		}
		if (new Set(value.answer).size !== value.answer.length)
			ctx.addIssue({ code: 'custom', message: 'answer repeats a block' });
		if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'two blocks share an id' });
	});

const checkStage = z.object({
	...stageBase,
	kind: z.literal('check'),
	questions: z
		.array(
			z
				.object({
					id: slug,
					prompt: text,
					choices: z.array(text).min(2),
					/** Index into choices. */
					answer: z.number().int().min(0),
					explain: text
				})
				.refine((q) => q.answer < q.choices.length, 'answer is not one of the choices')
		)
		.min(1)
});

const takeawaysStage = z.object({
	...stageBase,
	kind: z.literal('takeaways'),
	points: z.array(text).min(1)
});

const resourcesStage = z.object({
	...stageBase,
	kind: z.literal('resources'),
	files: z.array(z.object({ path: repoPath, label: text })).min(1)
});

export const stage = z.discriminatedUnion('kind', [
	hookStage,
	conceptStage,
	cinematicStage,
	walkthroughStage,
	buildStage,
	checkStage,
	takeawaysStage,
	resourcesStage
]);

/** Every module teaches through these, in some tier; a module without one is not a module (V-B3). */
export const REQUIRED_STAGE_KINDS = ['concept', 'walkthrough', 'build', 'check', 'resources'] as const;

const tier = z
	.object({
		id: z.enum(['beginner', 'intermediate', 'advanced']),
		title: text,
		summary: text,
		stages: z.array(stage).min(1)
	})
	.superRefine((value, ctx) => {
		const ids = value.stages.map((s) => s.id);
		const dup = ids.find((id, i) => ids.indexOf(id) !== i);
		if (dup)
			ctx.addIssue({
				code: 'custom',
				message: `tier ${value.id} repeats stage id ${dup}`
			});
	});

export const workshopModule = z
	.object({
		id: slug,
		/** The Mutant release this module was written against; must equal mutant.lock.json. */
		pin: z.string().regex(/^v\d+\.\d+\.\d+$/),
		title: text,
		lede: text,
		/** Doc slugs a reader can go on to (docs/X.md is slug x). */
		relatedDocs: z.array(z.string()).default([]),
		tiers: z.array(tier).min(1)
	})
	.superRefine((value, ctx) => {
		const order = ['beginner', 'intermediate', 'advanced'];
		const ids = value.tiers.map((t) => t.id);
		if (ids.some((id, i) => i > 0 && order.indexOf(id) <= order.indexOf(ids[i - 1]))) {
			ctx.addIssue({
				code: 'custom',
				message: 'tiers must be in order beginner, intermediate, advanced, each once'
			});
		}
		const kinds = new Set(value.tiers.flatMap((t) => t.stages.map((s) => s.kind)));
		for (const kind of REQUIRED_STAGE_KINDS) {
			if (!kinds.has(kind))
				ctx.addIssue({
					code: 'custom',
					message: `module has no ${kind} stage`
				});
		}
	});

export type WorkshopModuleSpec = z.input<typeof workshopModule>;
export type WorkshopModuleData = z.output<typeof workshopModule>;
export type Tier = WorkshopModuleData['tiers'][number];
export type Stage = z.output<typeof stage>;
export type StageOf<K extends Stage['kind']> = Extract<Stage, { kind: K }>;
export type SceneSource = z.output<typeof sceneSource>;
