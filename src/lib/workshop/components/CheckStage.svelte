<script lang="ts">
	/** Multiple-choice questions, checked in the browser. Ready once every answer is right. */
	import type { StageOf } from '../schema';

	let { stage, onready }: { stage: StageOf<'check'>; onready: () => void } = $props();

	let picked = $state<Record<string, number | undefined>>({});
	let checked = $state<Record<string, number | undefined>>({});

	const allRight = $derived(stage.questions.every((q) => checked[q.id] === q.answer));

	$effect(() => {
		if (allRight) onready();
	});

	function check(): void {
		checked = { ...picked };
	}
</script>

<form
	class="ck"
	onsubmit={(event) => {
		event.preventDefault();
		check();
	}}
>
	{#each stage.questions as q, qi (q.id)}
		{@const result = checked[q.id] === undefined ? undefined : checked[q.id] === q.answer}
		<fieldset class="ck-q">
			<legend>{qi + 1}. {q.prompt}</legend>
			{#each q.choices as choice, ci (ci)}
				<label class="ck-choice">
					<input
						type="radio"
						name={`${stage.id}-${q.id}`}
						value={ci}
						checked={picked[q.id] === ci}
						onchange={() => (picked = { ...picked, [q.id]: ci })}
					/>
					{choice}
				</label>
			{/each}
			<p class="ck-result" aria-live="polite" data-result={result === undefined ? undefined : result ? 'right' : 'wrong'}>
				{#if result === true}Right. {q.explain}{:else if result === false}Not quite. Look again at the output, then try another answer.{/if}
			</p>
		</fieldset>
	{/each}

	<div class="cta-cluster">
		<button type="submit" class="btn btn-secondary" disabled={allRight}>Check answers</button>
	</div>
</form>

<style>
	.ck {
		display: grid;
		gap: var(--space-4);
	}

	.ck-q {
		margin: 0;
		padding: var(--space-4);
		border: 1px solid var(--color-divider);
		display: grid;
		gap: var(--space-2);
	}

	.ck-q legend {
		padding: 0 var(--space-2);
		font-weight: 600;
	}

	.ck-choice {
		display: flex;
		gap: var(--space-2);
		align-items: baseline;
		cursor: pointer;
	}

	.ck-result {
		margin: 0;
		min-height: 1.4em;
		font-size: 14px;
	}

	.ck-result[data-result='right'] {
		color: var(--color-accent-700);
	}
</style>
