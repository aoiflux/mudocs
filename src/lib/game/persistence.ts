/**
 * The course's view of the site-wide progress store (`$lib/interactive/progress`).
 *
 * The game works with one flat object: its own course progress plus the two
 * settings it owns (sound and REPL consent). Writes go through
 * `updateProgress`, so workshop module progress saved elsewhere is never lost.
 */

import {
	loadProgress,
	updateProgress,
	type CourseProgress,
	type ProgressSettings
} from '$lib/interactive/progress';

export type { PuzzleBest } from '$lib/interactive/progress';

export type CourseSave = CourseProgress & ProgressSettings;

export function loadSave(): CourseSave {
	const { course, settings } = loadProgress();
	return { ...course, ...settings };
}

export function writeSave(save: CourseSave): void {
	const { muted, wasmConsent, ...course } = save;
	updateProgress((progress) => ({ ...progress, course, settings: { ...progress.settings, muted, wasmConsent } }));
}
