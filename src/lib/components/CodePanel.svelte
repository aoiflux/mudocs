<script lang="ts">
	/** The accent-900 code plate the artboards draw, with a copy affordance. */
	let {
		code,
		label = ''
	}: {
		code: string;
		label?: string;
	} = $props();

	let copied = $state(false);
	let timer: number;

	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			clearTimeout(timer);
			timer = window.setTimeout(() => (copied = false), 1600);
		} catch {
			// Clipboard blocked (insecure context, denied permission) — leave the
			// label alone rather than claiming a copy that did not happen.
			copied = false;
		}
	}
</script>

<div class="code-panel">
	{#if label}
		<p class="pane-label" style="margin: 0 0 var(--space-2); color: color-mix(in srgb, #fff 45%, transparent);">
			{label}
		</p>
	{/if}
	<button type="button" class="code-copy" onclick={copy}>{copied ? 'copied' : 'copy'}</button>
	<pre><code>{code}</code></pre>
</div>
