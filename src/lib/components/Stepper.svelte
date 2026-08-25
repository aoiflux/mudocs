<script lang="ts">
	/** The numbered install stepper from artboard 2e. */
	let {
		steps,
		current = 1
	}: {
		steps: Array<{ title: string; body: string }>;
		/** 1-based; steps below it read as done. */
		current?: number;
	} = $props();
</script>

<ol class="stepper" style="list-style: none; margin: 0; padding: 0;">
	{#each steps as step, index (step.title)}
		<li class="step" data-fx="fade-up">
			<div class="step-head">
				<span class="step-num" class:is-done={index < current}>{index + 1}</span>
				{#if index < steps.length - 1}
					<span class="step-rule" class:is-done={index < current - 1} aria-hidden="true"></span>
				{/if}
			</div>
			<h3 class="step-title">{step.title}</h3>
			<p class="step-body">{step.body}</p>
		</li>
	{/each}
</ol>
