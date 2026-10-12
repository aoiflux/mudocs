<script lang="ts">
	/**
	 * A hive model drawn as a tree: keys, their values and last-write times,
	 * deleted keys, and the change timeline. Everything drawn comes from the
	 * mirrored hive file; `shown` reveals parts in step order and `focus` marks
	 * the one the current step is about.
	 */
	import type { HiveModel } from './data';

	let { data, shown, focus }: { data: HiveModel; shown: ReadonlySet<string>; focus: string } = $props();

	type Node = {
		name: string;
		path: string;
		deleted: boolean;
		key?: HiveModel['keys'][number];
		children: Node[];
	};

	function buildTree(model: HiveModel): Node[] {
		const roots: Node[] = [];
		const add = (fullPath: string, deleted: boolean, key?: HiveModel['keys'][number]) => {
			let level = roots;
			let prefix = '';
			const parts = fullPath.split('\\');
			parts.forEach((name, i) => {
				prefix = prefix ? `${prefix}\\${name}` : name;
				let node = level.find((n) => n.name === name);
				if (!node) {
					node = { name, path: prefix, deleted: false, children: [] };
					level.push(node);
				}
				if (i === parts.length - 1) {
					node.deleted = deleted;
					if (key) node.key = key;
				}
				level = node.children;
			});
		};
		for (const key of model.keys) add(key.path, false, key);
		for (const path of model.deleted_keys) add(path, true);
		return roots;
	}

	const tree = $derived(buildTree(data));
	const on = (part: string) => (focus === part ? '' : undefined);
	const show = (part: string) => shown.has(part);
	const render = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value));
</script>

{#snippet branch(nodes: Node[])}
	<ul class="rt-level">
		{#each nodes as node (node.path)}
			{#if !node.deleted || show('deleted_keys')}
				<li class="rt-node">
					<div class="rt-key" data-deleted={node.deleted ? '' : undefined} data-on={node.deleted ? on('deleted_keys') : on('keys')}>
						<span class="rt-name">{node.name}</span>
						{#if node.deleted}<span class="rt-tag">deleted</span>{/if}
						{#if node.key && show('last_write')}
							<span class="rt-time" data-on={on('last_write')}>last write {node.key.last_write}</span>
						{/if}
					</div>
					{#if node.key && show('values') && Object.keys(node.key.values).length > 0}
						<dl class="rt-values" data-on={on('values')}>
							{#each Object.entries(node.key.values) as [name, value] (name)}
								<div><dt>{name}</dt><dd>{render(value)}</dd></div>
							{/each}
						</dl>
					{/if}
					{#if node.children.length > 0}{@render branch(node.children)}{/if}
				</li>
			{/if}
		{/each}
	</ul>
{/snippet}

<div class="rt">
	{@render branch(tree)}

	{#if show('timeline') && data.timeline.length > 0}
		<ol class="rt-timeline" data-on={on('timeline')} aria-label="Timeline">
			{#each data.timeline as event, i (i)}
				<li>
					<span class="rt-time">{event.timestamp}</span>
					<span>{event.action}{event.name ? ` ${event.name}` : ''}</span>
					<span class="rt-path">{event.path}</span>
				</li>
			{/each}
		</ol>
	{/if}
</div>

<style>
	.rt {
		display: grid;
		gap: var(--space-4);
		padding: var(--space-4);
		border: 1px solid var(--color-divider);
		font-family: var(--font-mono);
		font-size: 13px;
		overflow-x: auto;
	}

	.rt-level {
		list-style: none;
		margin: 0;
		padding: 0 0 0 var(--space-6);
		border-left: 1px solid var(--color-divider);
	}

	.rt > .rt-level {
		padding-left: 0;
		border-left: 0;
	}

	.rt-node {
		margin: var(--space-2) 0;
	}

	.rt-key {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-3);
		align-items: baseline;
	}

	.rt-name {
		font-weight: 600;
	}

	.rt-key[data-deleted] .rt-name {
		text-decoration: line-through;
		opacity: 0.75;
	}

	.rt-tag,
	.rt-time {
		font-size: 11px;
		opacity: 0.8;
	}

	.rt-values {
		margin: var(--space-2) 0 0 var(--space-6);
		display: grid;
		gap: var(--space-1);
	}

	.rt-values div {
		display: flex;
		gap: var(--space-3);
	}

	.rt-values dt::after {
		content: ' =';
	}

	.rt-values dd {
		margin: 0;
	}

	.rt-timeline {
		margin: 0;
		padding: var(--space-3) 0 0;
		list-style: none;
		display: grid;
		gap: var(--space-2);
		border-top: 1px solid var(--color-divider);
	}

	.rt-timeline li {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}

	.rt-path {
		opacity: 0.75;
	}

	[data-on] {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
		animation: rt-focus var(--fx-dur-fast) var(--fx-ease-apple);
	}

	@keyframes rt-focus {
		from {
			outline-color: transparent;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		[data-on] {
			animation: none;
		}
	}
</style>
