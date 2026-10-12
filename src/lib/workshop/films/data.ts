/**
 * The case values each film draws, checked at build time by the module loader.
 * Structure that every Windows machine shares (NTFS system records, partition
 * types, hive files, the boot chain) is drawn by the film itself and cited in
 * the stage's sources; what belongs to the case (paths, times, hosts, values)
 * is written in the module and checked here.
 */
import { z } from 'zod';
import type { FILMS } from '../schema';

const text = z.string().trim().min(1);
const macb = z.object({ created: text, modified: text, accessed: text, changed: text });

/** One file's record before and after a timestomp, and what else the timeline holds around it. */
export const timestompFilm = z.object({
	/** Directories from the volume root down to the file, the file last. */
	path: z.array(text).min(2),
	si: macb,
	fn: macb,
	/** $STANDARD_INFORMATION after the rewrite; $FILE_NAME is untouched. */
	stomped: macb,
	/** Other moments the case timeline holds that morning. */
	neighbours: z.array(z.object({ time: text, what: text })).min(1),
	/** What stomp_two_clocks.mut prints for the file. */
	verdict: text
});

/** A click on an ad, the hops it set off, the cookies they left and the download at the end. */
export const malvertisingFilm = z.object({
	page: z.object({ url: text, query: text }),
	/** Oldest first: the page with the ad, the click, the server's hops, the download. */
	hops: z.array(z.object({ time: text, url: text, redirect: z.boolean() })).min(3),
	cookies: z.array(z.object({ site: text, name: text, visited: z.boolean() })).min(1),
	/** The browser profile folder, as the case evidence holds it. */
	profile: text,
	download: text
});

/** A Run key before and after the implant writes itself into it. */
export const registryFilm = z.object({
	user: text,
	hive: text,
	key: text,
	written: text,
	values: z.array(z.object({ name: text, data: text, odd: z.boolean() })).min(1),
	/** The value the implant wrote; one of values. */
	planted: text,
	runOnce: z.object({ written: text, name: text, data: text })
});

export type TimestompFilmData = z.output<typeof timestompFilm>;
export type MalvertisingFilmData = z.output<typeof malvertisingFilm>;
export type RegistryFilmData = z.output<typeof registryFilm>;

export const FILM_DATA = {
	Timestomp: timestompFilm,
	Malvertising: malvertisingFilm,
	RegistryPersistence: registryFilm.refine(
		(value) => value.values.some((v) => v.name === value.planted),
		'planted names none of the values'
	)
} as const satisfies Record<(typeof FILMS)[number], z.ZodType>;

export type FilmName = keyof typeof FILM_DATA;
