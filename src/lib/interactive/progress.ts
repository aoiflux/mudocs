/**
 * All learner progress on the site, in one localStorage key.
 *
 * The language course (opened from `/workshop/language` or the footer glyph)
 * and the workshop modules read and write the same blob, so both entry points
 * always show the same progress. Nothing leaves the browser.
 *
 * Every access is wrapped: Safari in private mode throws on `setItem`, and the
 * footer glyph imports this during SSR. Nothing here touches `localStorage` at
 * module scope.
 *
 * Version 1 was the Codebreaker's own key, `mudocs-codebreaker`. It is read
 * once, folded into version 2, and removed after the new key is written.
 */

export const PROGRESS_KEY = 'mudocs-progress';
const LEGACY_CODEBREAKER_KEY = 'mudocs-codebreaker';

export type PuzzleBest = { ms: number; hints: number; errors: number };

export type CourseProgress = {
	discovered: boolean;
	refused: boolean;
	solved: string[];
	/**
	 * Sections the learner skipped. A skip is permanent until progress is reset:
	 * solving the section later still counts as solved, but the final reward
	 * stays forfeit (owner decision D-8).
	 */
	skipped: string[];
	best: Record<string, PuzzleBest>;
	lastPuzzle: string | null;
	seenReward: boolean;
};

export type StepState = 'done' | 'skipped';

export type ModuleProgress = {
	/** Stage id → state. A stage with no entry has not been finished. */
	stages: Record<string, StepState>;
	/** Tier id (beginner, intermediate, advanced) → state. */
	tiers: Record<string, StepState>;
};

export type ProgressSettings = {
	muted: boolean;
	/** The learner agreed to download the browser REPL. */
	wasmConsent: boolean;
};

export type ProgressV2 = {
	v: 2;
	course: CourseProgress;
	modules: Record<string, ModuleProgress>;
	settings: ProgressSettings;
};

export function emptyProgress(): ProgressV2 {
	return {
		v: 2,
		course: {
			discovered: false,
			refused: false,
			solved: [],
			skipped: [],
			best: {},
			lastPuzzle: null,
			seenReward: false
		},
		modules: {},
		settings: { muted: true, wasmConsent: false }
	};
}

/** The course reward: every section solved, and none ever skipped. */
export function courseRewardEarned(course: CourseProgress, total: number): boolean {
	return course.solved.length >= total && course.skipped.length === 0;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function storage(): Storage | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		return localStorage;
	} catch {
		return null;
	}
}

function readJson(store: Storage, key: string): unknown {
	try {
		const raw = store.getItem(key);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function persist(store: Storage, progress: ProgressV2): boolean {
	try {
		store.setItem(PROGRESS_KEY, JSON.stringify(progress));
		return true;
	} catch {
		// Private mode, or the quota is full. Everything still works unsaved.
		return false;
	}
}

// ---------------------------------------------------------------------------
// Parsing: a hand-edited or half-written blob must not break the site.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] {
	return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : [];
}

function bests(value: unknown): Record<string, PuzzleBest> {
	const out: Record<string, PuzzleBest> = {};
	if (!isRecord(value)) return out;
	for (const [id, entry] of Object.entries(value)) {
		if (!isRecord(entry)) continue;
		out[id] = {
			ms: typeof entry.ms === 'number' ? entry.ms : 0,
			hints: typeof entry.hints === 'number' ? entry.hints : 0,
			errors: typeof entry.errors === 'number' ? entry.errors : 0
		};
	}
	return out;
}

function steps(value: unknown): Record<string, StepState> {
	const out: Record<string, StepState> = {};
	if (!isRecord(value)) return out;
	for (const [id, state] of Object.entries(value)) {
		if (state === 'done' || state === 'skipped') out[id] = state;
	}
	return out;
}

function coerceCourse(raw: unknown): CourseProgress {
	const base = emptyProgress().course;
	if (!isRecord(raw)) return base;
	return {
		discovered: raw.discovered === true,
		refused: raw.refused === true,
		solved: strings(raw.solved),
		skipped: strings(raw.skipped),
		best: bests(raw.best),
		lastPuzzle: typeof raw.lastPuzzle === 'string' ? raw.lastPuzzle : null,
		seenReward: raw.seenReward === true
	};
}

function coerceV2(raw: Record<string, unknown>): ProgressV2 {
	const modules: Record<string, ModuleProgress> = {};
	if (isRecord(raw.modules)) {
		for (const [id, entry] of Object.entries(raw.modules)) {
			if (!isRecord(entry)) continue;
			modules[id] = { stages: steps(entry.stages), tiers: steps(entry.tiers) };
		}
	}
	const settings = isRecord(raw.settings) ? raw.settings : {};
	return {
		v: 2,
		course: coerceCourse(raw.course),
		modules,
		settings: { muted: settings.muted !== false, wasmConsent: settings.wasmConsent === true }
	};
}

/** Version 1: the Codebreaker's flat save. It had no skips, so none are invented. */
function fromV1(raw: Record<string, unknown>): ProgressV2 {
	const progress = emptyProgress();
	progress.course = coerceCourse({ ...raw, skipped: [] });
	progress.settings = { muted: raw.muted !== false, wasmConsent: raw.wasmConsent === true };
	return progress;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function loadProgress(): ProgressV2 {
	const store = storage();
	if (!store) return emptyProgress();

	const current = readJson(store, PROGRESS_KEY);
	if (isRecord(current) && current.v === 2) return coerceV2(current);

	const legacy = readJson(store, LEGACY_CODEBREAKER_KEY);
	if (isRecord(legacy)) {
		const migrated = fromV1(legacy);
		// Drop the old key only once the new one is safely written.
		if (persist(store, migrated)) {
			try {
				store.removeItem(LEGACY_CODEBREAKER_KEY);
			} catch {
				// Harmless: the new key wins from now on.
			}
		}
		return migrated;
	}

	return emptyProgress();
}

/**
 * Read the stored progress, apply `change`, and write it back. Reading first
 * means one part of the site never overwrites what another part just saved.
 */
export function updateProgress(change: (progress: ProgressV2) => ProgressV2): ProgressV2 {
	const next = change(loadProgress());
	const store = storage();
	if (store) persist(store, next);
	return next;
}

export function resetProgress(): void {
	const store = storage();
	if (!store) return;
	try {
		store.removeItem(PROGRESS_KEY);
		store.removeItem(LEGACY_CODEBREAKER_KEY);
	} catch {
		// nothing to do
	}
}

/** The stored progress as pretty JSON, for the learner to download. */
export function exportProgress(): string {
	return `${JSON.stringify(loadProgress(), null, 2)}\n`;
}
