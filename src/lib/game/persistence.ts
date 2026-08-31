/**
 * One key, one JSON blob — matching the site's existing single-key
 * `mudocs-theme-mode` habit rather than scattering flags.
 *
 * Every access is wrapped: Safari in private mode throws on `setItem`, and the
 * module is imported by the footer glyph, which renders during SSR. Nothing here
 * touches `localStorage` at module scope.
 */

export const SAVE_KEY = 'mudocs-codebreaker';

export type PuzzleBest = { ms: number; hints: number; errors: number };

export type SaveV1 = {
	v: 1;
	discovered: boolean;
	refused: boolean;
	solved: string[];
	best: Record<string, PuzzleBest>;
	lastPuzzle: string | null;
	muted: boolean;
	seenReward: boolean;
	wasmConsent: boolean;
};

export function emptySave(): SaveV1 {
	return {
		v: 1,
		discovered: false,
		refused: false,
		solved: [],
		best: {},
		lastPuzzle: null,
		muted: true,
		seenReward: false,
		wasmConsent: false
	};
}

function storage(): Storage | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		return localStorage;
	} catch {
		return null;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/** Parse defensively — a hand-edited or half-written blob must not break the site. */
function coerce(raw: unknown): SaveV1 {
	const base = emptySave();
	if (!isRecord(raw)) return base;

	const best: Record<string, PuzzleBest> = {};
	if (isRecord(raw.best)) {
		for (const [id, value] of Object.entries(raw.best)) {
			if (!isRecord(value)) continue;
			best[id] = {
				ms: typeof value.ms === 'number' ? value.ms : 0,
				hints: typeof value.hints === 'number' ? value.hints : 0,
				errors: typeof value.errors === 'number' ? value.errors : 0
			};
		}
	}

	return {
		v: 1,
		discovered: raw.discovered === true,
		refused: raw.refused === true,
		solved: Array.isArray(raw.solved) ? raw.solved.filter((id): id is string => typeof id === 'string') : [],
		best,
		lastPuzzle: typeof raw.lastPuzzle === 'string' ? raw.lastPuzzle : null,
		muted: raw.muted !== false,
		seenReward: raw.seenReward === true,
		wasmConsent: raw.wasmConsent === true
	};
}

export function loadSave(): SaveV1 {
	const store = storage();
	if (!store) return emptySave();
	try {
		const raw = store.getItem(SAVE_KEY);
		if (!raw) return emptySave();
		return coerce(JSON.parse(raw));
	} catch {
		return emptySave();
	}
}

export function writeSave(save: SaveV1): void {
	const store = storage();
	if (!store) return;
	try {
		store.setItem(SAVE_KEY, JSON.stringify(save));
	} catch {
		// Private mode, or the quota is full. The game plays fine unsaved.
	}
}

export function clearSave(): void {
	const store = storage();
	if (!store) return;
	try {
		store.removeItem(SAVE_KEY);
	} catch {
		// nothing to do
	}
}
