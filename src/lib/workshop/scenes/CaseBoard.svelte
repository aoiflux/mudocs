<script lang="ts">
	/**
	 * The questions an examination asks, each pinned to the beats that answer
	 * it. A step's focus is a question id; every question up to it is shown.
	 */
	import './scene.css';
	import type { CaseBoardData } from './data';

	let { data, shown, focus }: { data: CaseBoardData; shown: ReadonlySet<string>; focus: string } = $props();

	const title = (n: number) => data.beats.find((b) => b.n === n)?.title ?? '';
</script>

<div class="scene cb">
	<ol class="cb-questions">
		{#each data.questions as q (q.id)}
			{#if shown.has(q.id)}
				<li class="cb-q scene-reveal" data-on={focus === q.id ? '' : undefined}>
					<p class="cb-text"><strong>{q.text}</strong>{q.detail ? ` ${q.detail}` : ''}</p>
					<ul class="cb-beats">
						{#each q.beats as n (n)}<li><span class="scene-tag">{n}</span> {title(n)}</li>{/each}
					</ul>
				</li>
			{/if}
		{/each}
	</ol>
</div>

<style>
	.cb-questions {
		margin: 0;
		padding-left: 1.6em;
		display: grid;
		gap: var(--space-3);
		font-family: var(--font-body);
		font-size: 15px;
	}

	.cb-q {
		padding: var(--space-2) var(--space-3);
	}

	.cb-text {
		margin: 0 0 var(--space-2);
	}

	.cb-beats {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		font-family: var(--font-mono);
		font-size: 12px;
	}
</style>
