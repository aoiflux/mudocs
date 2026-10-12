<script lang="ts">
	/**
	 * One MFT record's two clocks. Steps: the four times (times), the two
	 * attributes that each hold them (attributes), a timestomp rewriting only
	 * $STANDARD_INFORMATION (stomp), and the test stomp_two_clocks.mut runs (test).
	 */
	import './scene.css';
	import type { MftRecordData } from './data';

	let { data, shown, focus }: { data: MftRecordData; shown: ReadonlySet<string>; focus: string } = $props();

	const FIELDS = [
		['created', 'Created (B)'],
		['modified', 'Modified (M)'],
		['accessed', 'Accessed (A)'],
		['changed', 'Entry changed (C)']
	] as const;

	const stomped = $derived(shown.has('stomp'));
	const si = $derived(stomped ? data.stomped : data.si);
	const bornBeforeName = $derived(si.created < data.fn.created);
	const on = (part: string) => (focus === part ? '' : undefined);
	const testing = (field: string) => (focus === 'test' && field === 'created' ? '' : undefined);
</script>

<div class="scene mft">
	<p class="mft-file">{data.file}</p>
	<table class="mft-table">
		<thead>
			<tr>
				<th scope="col">Time</th>
				<th scope="col" data-on={focus === 'stomp' ? '' : on('attributes')}>
					{shown.has('attributes') ? '$STANDARD_INFORMATION' : 'Value'}
					{#if stomped}<span class="scene-tag">rewritten</span>{/if}
				</th>
				{#if shown.has('attributes')}
					<th scope="col" class="scene-reveal" data-on={on('attributes')}>$FILE_NAME</th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#each FIELDS as [field, label] (field)}
				<tr data-on={focus === 'times' ? '' : undefined}>
					<th scope="row">{label}</th>
					{#key si[field]}
						<td class="scene-reveal" data-on={testing(field)}>{si[field]}</td>
					{/key}
					{#if shown.has('attributes')}
						<td class="scene-reveal" data-on={testing(field)}>{data.fn[field]}</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>

	{#if shown.has('test')}
		<p class="scene-reveal" data-on={on('test')}>
			si_created &lt; fn_created ?
			<span class="scene-flag">{bornBeforeName ? 'yes: born before its name' : 'no'}</span>
		</p>
	{/if}
</div>

<style>
	.mft-file {
		margin: 0;
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.mft-table {
		border-collapse: collapse;
	}

	.mft-table th,
	.mft-table td {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-divider);
		text-align: left;
		vertical-align: top;
	}

	.mft-table thead th {
		font-size: 11px;
		font-weight: 400;
	}

	.mft-table tbody th {
		font-weight: 400;
		white-space: nowrap;
	}
</style>
