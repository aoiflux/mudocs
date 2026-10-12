<script lang="ts">
	/**
	 * A raw line becoming a record. Steps: the line (raw), the pattern with one
	 * group per field (pattern), the fields marked in the line and pulled out
	 * as a record (fields).
	 */
	import './scene.css';
	import type { RecordModelData } from './data';

	let { data, shown, focus }: { data: RecordModelData; shown: ReadonlySet<string>; focus: string } = $props();

	const on = (part: string) => (focus === part ? '' : undefined);

	/** The raw line cut into plain text and field values, in order. */
	const pieces = $derived.by(() => {
		const out: { text: string; field?: string }[] = [];
		let rest = data.raw;
		for (const field of data.fields) {
			const at = rest.indexOf(field.value);
			if (at < 0) continue;
			if (at > 0) out.push({ text: rest.slice(0, at) });
			out.push({ text: field.value, field: field.name });
			rest = rest.slice(at + field.value.length);
		}
		if (rest) out.push({ text: rest });
		return out;
	});
</script>

<div class="scene rm">
	<p class="rm-line" data-on={on('raw')}>
		{#each pieces as piece, i (i)}{#if piece.field && shown.has('fields')}<mark class="rm-mark" title={piece.field}
					>{piece.text}</mark
				>{:else}{piece.text}{/if}{/each}
	</p>

	{#if shown.has('pattern')}
		<p class="rm-pattern scene-reveal" data-on={on('pattern')}>{data.pattern}</p>
	{/if}

	{#if shown.has('fields')}
		<dl class="rm-record scene-reveal" data-on={on('fields')}>
			{#each data.fields as field (field.name)}
				<div><dt>{field.name}</dt><dd>{field.value}</dd></div>
			{/each}
		</dl>
	{/if}
</div>

<style>
	.rm-line,
	.rm-pattern {
		margin: 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.rm-pattern {
		color: var(--color-accent-700);
	}

	.rm-mark {
		background: color-mix(in srgb, var(--color-accent) 28%, transparent);
		color: inherit;
	}

	.rm-record {
		margin: 0;
		display: grid;
		gap: var(--space-1);
	}

	.rm-record div {
		display: flex;
		gap: var(--space-3);
	}

	.rm-record dt {
		min-width: 6ch;
		font-weight: 600;
	}

	.rm-record dd {
		margin: 0;
	}
</style>
