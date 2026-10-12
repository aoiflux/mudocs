/**
 * Every authored workshop module, by id. Adding a module: write its spec in
 * this directory, add it here and to WORKSHOP_MODULES ($lib/workshop/modules),
 * and add the Mutant files it names to WORKSHOP_FILES in scripts/mutant-sync.mjs.
 */
import type { WorkshopModuleSpec } from '../schema';
import { spec as registryPersistence } from './registry-persistence';

export const WORKSHOP_SPECS: Readonly<Record<string, WorkshopModuleSpec>> = {
	[registryPersistence.id]: registryPersistence
};
