<script lang="ts">
	/**
	 * Browser visits as a chain. Steps: the visits (visits), each one's link back
	 * to the visit that led to it (from-visit), and the bits of its transition
	 * value (bits), which say whether a server redirected the browser.
	 */
	import './scene.css';
	import type { RedirectChainData } from './data';

	let { data, shown, focus }: { data: RedirectChainData; shown: ReadonlySet<string>; focus: string } = $props();

	/** Whether `bit` is set in `value`, without 32-bit signed bitwise operators. */
	const has = (value: number, bit: number) => Math.floor(value / bit) % 2 === 1;
	const on = (part: string) => (focus === part ? '' : undefined);
</script>

<div class="scene rc">
	<ol class="rc-chain">
		{#each data.visits as visit, i (visit.id)}
			<li class="rc-visit" data-on={on('visits')}>
				<span class="rc-id">visit {visit.id}</span>
				<span class="rc-url">{visit.url}</span>
				{#if visit.note}<span class="rc-note">{visit.note}</span>{/if}
				{#if shown.has('from-visit')}
					<span class="rc-from scene-reveal" data-on={on('from-visit')}>
						from_visit {visit.fromVisit}{visit.fromVisit === 0 ? ' (none: the chain starts here)' : ''}
					</span>
				{/if}
				{#if shown.has('bits')}
					<span class="rc-bits scene-reveal" data-on={on('bits')}>
						transition {visit.transition}
						{#each data.bits as bit (bit.name)}
							{#if has(visit.transition, bit.value)}<span class="scene-tag">{bit.name}</span>{/if}
						{/each}
					</span>
				{/if}
			</li>
			{#if i < data.visits.length - 1}<li class="rc-arrow" aria-hidden="true">↓</li>{/if}
		{/each}
	</ol>

	{#if shown.has('bits')}
		<dl class="rc-legend scene-reveal">
			{#each data.bits as bit (bit.name)}
				<div><dt>{bit.name}</dt><dd>{bit.value}</dd></div>
			{/each}
		</dl>
	{/if}
</div>

<style>
	.rc-chain {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: var(--space-2);
	}

	.rc-visit {
		display: grid;
		gap: var(--space-1);
		padding: var(--space-3);
		border: 1px solid var(--color-divider);
	}

	.rc-id,
	.rc-note,
	.rc-from {
		font-size: 11px;
	}

	.rc-url {
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.rc-bits {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
	}

	.rc-arrow {
		padding-left: var(--space-4);
		opacity: 0.6;
	}

	.rc-legend {
		margin: 0;
		display: grid;
		gap: var(--space-1);
		font-size: 11px;
	}

	.rc-legend div {
		display: flex;
		gap: var(--space-3);
	}

	.rc-legend dd {
		margin: 0;
	}
</style>
