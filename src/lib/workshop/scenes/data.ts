/**
 * The data each concept scene draws, checked at build time by the module
 * loader. A scene draws either a mirrored Mutant file (its schema is then the
 * shape of that file) or values written in the module, when it illustrates a
 * concept; those carry their sources in the module, and do not publish until
 * someone has checked them (reviewedBy).
 */
import { z } from 'zod';

const text = z.string().trim().min(1);

/** A hive model as reg_open reads it: examples/data/*_hive.json in Mutant. */
export const hiveModel = z.object({
	keys: z.array(
		z.object({
			path: text,
			last_write: text,
			values: z.record(z.string(), z.unknown())
		})
	),
	deleted_keys: z.array(text).default([]),
	timeline: z
		.array(
			z.object({
				timestamp: text,
				path: text,
				action: text,
				name: z.string().optional()
			})
		)
		.default([])
});

const macb = z.object({ created: text, modified: text, accessed: text, changed: text });

/** One MFT record's two clocks, before and after a timestomp. Illustrative times. */
export const mftRecord = z.object({
	file: text,
	si: macb,
	fn: macb,
	/** $STANDARD_INFORMATION after a tool rewrote it; $FILE_NAME is untouched. */
	stomped: macb
});

/** A chain of browser visits, each pointing at the visit that led to it. */
export const redirectChain = z.object({
	visits: z
		.array(
			z.object({
				id: z.number().int(),
				fromVisit: z.number().int(),
				url: text,
				/** The visit's transition value, as the History database stores it. */
				transition: z.number().int().min(0),
				note: z.string().optional()
			})
		)
		.min(2),
	/** Named bits of the transition value, as decimal numbers. */
	bits: z.array(z.object({ name: text, value: z.number().int().min(1) })).min(1)
});

/** Sites the history visited, and the cookies the jar holds, by registrable domain. */
export const cookieJar = z.object({
	visited: z.array(text).min(1),
	cookies: z.array(z.object({ site: text, name: text })).min(1)
});

/** The questions an examination asks, and the beats that answer each. */
export const caseBoard = z.object({
	questions: z.array(z.object({ id: text, text, detail: z.string().optional(), beats: z.array(z.number().int()) })).min(1),
	beats: z.array(z.object({ n: z.number().int(), title: text })).min(1)
});

/** A raw line, the pattern that splits it, and the record that comes out. */
export const recordModel = z.object({
	raw: text,
	pattern: text,
	fields: z.array(z.object({ name: text, value: text })).min(1)
});

/** An IPv4 CIDR block. */
export const cidrBlock = z.object({
	cidr: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/)
});

export type HiveModel = z.output<typeof hiveModel>;
export type MftRecordData = z.output<typeof mftRecord>;
export type RedirectChainData = z.output<typeof redirectChain>;
export type CookieJarData = z.output<typeof cookieJar>;
export type CaseBoardData = z.output<typeof caseBoard>;
export type RecordModelData = z.output<typeof recordModel>;
export type CidrBlockData = z.output<typeof cidrBlock>;

export const SCENE_DATA = {
	RegistryTree: hiveModel,
	MftRecord: mftRecord,
	RedirectChain: redirectChain,
	CookieJar: cookieJar,
	CaseBoard: caseBoard,
	RecordModel: recordModel,
	CidrBlock: cidrBlock
} as const;

export type SceneName = keyof typeof SCENE_DATA;
