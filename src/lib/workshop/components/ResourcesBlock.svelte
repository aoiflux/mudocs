<script lang="ts">
	/** The module's files at the pinned release, with sizes and SHA-256 digests of the mirrored bytes. */
	import type { ResolvedResources } from '../resolved';
	import { MUTANT_TAG } from '$lib/mutant-pin';

	let { stage, folderUrl }: { stage: ResolvedResources; folderUrl?: string } = $props();

	const size = (bytes: number) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);
</script>

<div class="rs">
	<p class="rs-lede">
		Every file below is the one in Mutant {MUTANT_TAG}. Run the program from the root of a checkout of that
		release{#if folderUrl}; <a href={folderUrl}>the program’s folder</a> explains how{/if}.
	</p>
	<ul class="rs-files">
		{#each stage.resolved as file (file.path)}
			<li>
				<span class="rs-label">{file.label}</span>
				<a href={file.url}>{file.path}</a>
				<span class="rs-meta">{size(file.bytes)} · SHA-256 <code class="rs-sha">{file.sha256}</code></span>
			</li>
		{/each}
	</ul>
</div>

<style>
	.rs {
		display: grid;
		gap: var(--space-3);
	}

	.rs-lede {
		margin: 0;
		max-width: 70ch;
	}

	.rs-files {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: var(--space-3);
	}

	.rs-files li {
		display: grid;
		gap: var(--space-1);
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--color-divider);
	}

	.rs-label {
		font-weight: 600;
	}

	.rs-meta {
		font-size: 12px;
	}

	.rs-sha {
		overflow-wrap: anywhere;
	}
</style>
