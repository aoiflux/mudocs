<script lang="ts">
	/**
	 * An IPv4 CIDR block as 32 bits. Steps: the address (address), the prefix
	 * bits that are fixed (prefix), and the host bits that vary, with the
	 * addresses they give (hosts). Pure arithmetic on the block in the module.
	 */
	import './scene.css';
	import type { CidrBlockData } from './data';

	let { data, shown, focus }: { data: CidrBlockData; shown: ReadonlySet<string>; focus: string } = $props();

	const parsed = $derived.by(() => {
		const [address, prefixText] = data.cidr.split('/');
		const octets = address.split('.').map(Number);
		const prefix = Number(prefixText);
		const bits = octets.flatMap((o) => o.toString(2).padStart(8, '0').split(''));
		const count = 2 ** (32 - prefix);
		const base = octets.reduce((acc, o) => acc * 256 + o, 0);
		const hosts = count <= 16 ? Array.from({ length: count }, (_, i) => base + i) : [];
		return { prefix, bits, count, hosts };
	});

	const dotted = (n: number) => [24, 16, 8, 0].map((shift) => Math.floor(n / 2 ** shift) % 256).join('.');
	const on = (part: string) => (focus === part ? '' : undefined);
</script>

<div class="scene cidr">
	<p class="cidr-label" data-on={on('address')}>{data.cidr}</p>
	<div class="cidr-bits" role="img" aria-label={`${parsed.prefix} fixed prefix bits, ${32 - parsed.prefix} host bits`}>
		{#each parsed.bits as bit, i (i)}
			<span
				class="cidr-bit"
				data-kind={!shown.has('prefix') ? undefined : i < parsed.prefix ? 'prefix' : 'host'}
				data-gap={i % 8 === 7 && i < 31 ? '' : undefined}>{bit}</span
			>
		{/each}
	</div>
	{#if shown.has('prefix')}
		<p class="scene-reveal" data-on={on('prefix')}>
			First {parsed.prefix} bits fixed; {32 - parsed.prefix} host bits left, so 2<sup>{32 - parsed.prefix}</sup> = {parsed.count}
			addresses.
		</p>
	{/if}
	{#if shown.has('hosts') && parsed.hosts.length > 0}
		<ul class="cidr-hosts scene-reveal" data-on={on('hosts')}>
			{#each parsed.hosts as host (host)}<li>{dotted(host)}</li>{/each}
		</ul>
	{/if}
</div>

<style>
	.cidr-label,
	.cidr p {
		margin: 0;
	}

	.cidr-bits {
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
	}

	.cidr-bit {
		display: inline-grid;
		place-items: center;
		width: 1.4em;
		height: 1.8em;
		border: 1px solid var(--color-divider);
	}

	.cidr-bit[data-gap] {
		margin-right: var(--space-3);
	}

	.cidr-bit[data-kind='prefix'] {
		background: color-mix(in srgb, var(--color-accent) 22%, transparent);
	}

	.cidr-bit[data-kind='host'] {
		border-color: var(--color-accent);
		font-weight: 700;
	}

	.cidr-hosts {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
	}
</style>
