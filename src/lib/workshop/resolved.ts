/**
 * A workshop module as the page receives it: the spec, with every Mutant file
 * it names read from the mirror (src/lib/server/workshop.ts does the reading).
 */
import type { Stage, StageOf, WorkshopModuleData } from './schema';

export type ResolvedWalkthrough = StageOf<'walkthrough'> & {
	/** One highlighted HTML string per program line. */
	programLines: string[];
	/** The golden's lines, or the simulated output when there is no golden. */
	outputLines: string[];
	programUrl: string;
};
export type ResolvedConcept = StageOf<'concept'> & { sceneData: unknown };
export type ResolvedCinematic = StageOf<'cinematic'> & { filmData: unknown };
export type ResolvedResources = StageOf<'resources'> & {
	resolved: { path: string; label: string; bytes: number; sha256: string; url: string }[];
};
export type ResolvedStage =
	| Exclude<Stage, { kind: 'walkthrough' | 'concept' | 'cinematic' | 'resources' }>
	| ResolvedWalkthrough
	| ResolvedConcept
	| ResolvedCinematic
	| ResolvedResources;

export type ResolvedModule = Omit<WorkshopModuleData, 'tiers'> & {
	tiers: (Omit<WorkshopModuleData['tiers'][number], 'stages'> & { stages: ResolvedStage[] })[];
};
