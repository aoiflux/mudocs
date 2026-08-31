<!--
	`LEX PARSE COMPILE BYTECODE VM` — how far the program got.

	The strip is a picture of `ValidationResult.reached`: everything before it is
	solid, the stage it stopped at flashes red when a diagnostic halted there, and
	everything after stays dark. The value is duplicated in a visually-hidden
	sentence because the chips themselves are decorative.
-->
<script lang="ts">
	import { STAGES, type Stage } from './types';

	let {
		reached,
		failed = false,
		solved = false
	}: { reached: Stage; failed?: boolean; solved?: boolean } = $props();

	const reachedAt = $derived(STAGES.indexOf(reached));
</script>

<ul class="cb-pipeline" aria-hidden="true">
	{#each STAGES as stage, index (stage)}
		<li
			class="cb-stage"
			class:is-reached={solved || index < reachedAt || (index === reachedAt && !failed)}
			class:is-failed={failed && index === reachedAt}
			class:is-complete={solved}
		>
			{stage}
		</li>
	{/each}
</ul>

<p class="cb-visually-hidden">
	{#if solved}
		Pipeline complete: all five stages passed.
	{:else if failed}
		Pipeline halted at {reached}.
	{:else}
		Pipeline reached {reached}.
	{/if}
</p>
