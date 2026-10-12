/**
 * A workshop module as the page receives it: the spec, with every Mutant file
 * it names read from the mirror (src/lib/server/workshop.ts does the reading).
 */
import type { Stage, StageOf, WorkshopModuleData } from './schema';

export type ResolvedWalkthrough = StageOf<'walkthrough'> & {
	programLines: string[];
	goldenLines: string[];
	programUrl: string;
};
export type ResolvedConcept = StageOf<'concept'> & { sceneData: unknown };
export type ResolvedResources = StageOf<'resources'> & {
	resolved: { path: string; label: string; bytes: number; sha256: string; url: string }[];
};
export type ResolvedStage =
	| Exclude<Stage, { kind: 'walkthrough' | 'concept' | 'resources' }>
	| ResolvedWalkthrough
	| ResolvedConcept
	| ResolvedResources;

export type ResolvedModule = Omit<WorkshopModuleData, 'tiers'> & {
	tiers: (Omit<WorkshopModuleData['tiers'][number], 'stages'> & { stages: ResolvedStage[] })[];
};
