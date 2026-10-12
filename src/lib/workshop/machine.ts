/**
 * Where a learner stands in a module: which stage is open, which are locked.
 *
 * Pure functions over the module's tiers and the recorded stage states in the
 * progress store (`modules[id].stages`, keyed `tier/stage`). Stages open in
 * order: a stage is active once every stage before it, across tiers, is done
 * or skipped. A skip is permanent, as in the language course: completing a
 * skipped stage later does not turn it into done, and a tier with a skip never
 * counts as complete.
 */
import type { ModuleProgress, StepState } from '$lib/interactive/progress';

export type StageStatus = 'locked' | 'active' | StepState;

type TierShape = { id: string; stages: readonly { id: string }[] };

export function stageKey(tierId: string, stageId: string): string {
	return `${tierId}/${stageId}`;
}

/** Status of every stage, by stageKey, in teaching order. */
export function stageStatuses(tiers: readonly TierShape[], recorded: Record<string, StepState>): Map<string, StageStatus> {
	const out = new Map<string, StageStatus>();
	let blocked = false;
	for (const tier of tiers) {
		for (const stage of tier.stages) {
			const key = stageKey(tier.id, stage.id);
			const state = recorded[key];
			if (state) out.set(key, state);
			else if (blocked) out.set(key, 'locked');
			else {
				out.set(key, 'active');
				blocked = true;
			}
		}
	}
	return out;
}

/** done: every stage done. skipped: every stage settled, at least one skipped. */
export function tierState(tier: TierShape, recorded: Record<string, StepState>): StepState | undefined {
	const states = tier.stages.map((stage) => recorded[stageKey(tier.id, stage.id)]);
	if (states.some((state) => !state)) return undefined;
	return states.every((state) => state === 'done') ? 'done' : 'skipped';
}

/** Record a stage as done or skipped. A skip, once recorded, stays. */
export function settleStage(
	current: ModuleProgress | undefined,
	tiers: readonly TierShape[],
	key: string,
	state: StepState
): ModuleProgress {
	const stages = { ...(current?.stages ?? {}) };
	if (stages[key] !== 'skipped') stages[key] = state;
	const tierStates: Record<string, StepState> = {};
	for (const tier of tiers) {
		const settled = tierState(tier, stages);
		if (settled) tierStates[tier.id] = settled;
	}
	return { stages, tiers: tierStates };
}
