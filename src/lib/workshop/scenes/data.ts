/**
 * The data each concept scene draws, checked at build time by the module
 * loader. A scene only ever draws a mirrored Mutant file, so its schema is the
 * shape of that file, not something the scene invents.
 */
import { z } from 'zod';

/** A hive model as reg_open reads it: examples/data/*_hive.json in Mutant. */
export const hiveModel = z.object({
	keys: z.array(
		z.object({
			path: z.string().min(1),
			last_write: z.string().min(1),
			values: z.record(z.string(), z.unknown())
		})
	),
	deleted_keys: z.array(z.string().min(1)).default([]),
	timeline: z
		.array(
			z.object({
				timestamp: z.string().min(1),
				path: z.string().min(1),
				action: z.string().min(1),
				name: z.string().optional()
			})
		)
		.default([])
});

export type HiveModel = z.output<typeof hiveModel>;

export const SCENE_DATA = {
	RegistryTree: hiveModel
} as const;

export type SceneName = keyof typeof SCENE_DATA;
