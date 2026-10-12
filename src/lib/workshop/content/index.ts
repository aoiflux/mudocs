/**
 * Every authored workshop module, by id. Adding a module: write its spec in
 * this directory, add it here and to WORKSHOP_MODULES ($lib/workshop/modules),
 * and make sure scripts/mutant-sync.mjs mirrors the Mutant files it names.
 */
import type { WorkshopModuleSpec } from '../schema';
import { spec as intro } from './intro';
import { spec as artefactModelling } from './artefact-modelling';
import { spec as timestomping } from './timestomping';
import { spec as malvertising } from './malvertising';
import { spec as registryPersistence } from './registry-persistence';
import { spec as triage } from './triage';
import { spec as quilldrop } from './quilldrop';

export const WORKSHOP_SPECS: Readonly<Record<string, WorkshopModuleSpec>> = Object.fromEntries(
	[intro, artefactModelling, timestomping, malvertising, registryPersistence, triage, quilldrop].map((spec) => [
		spec.id,
		spec
	])
);
