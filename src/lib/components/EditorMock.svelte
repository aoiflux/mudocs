<script lang="ts">
	/** M12 — the extension preview whose completions type themselves. */
	import { onMount } from 'svelte';
	import { createTypewriter } from '$lib/artist/motion';

	let { suggestions }: { suggestions: string[] } = $props();

	let target: HTMLSpanElement;

	onMount(() =>
		createTypewriter(target, {
			mode: 'type-loop',
			phrases: suggestions,
			typeSpeed: 46,
			holdMs: 1400
		})
	);
</script>

<div class="editor-mock">
	<div class="editor-dots" aria-hidden="true">
		<i></i><i></i><i></i>
	</div>

	<div class="editor-body">
		<div class="editor-gutter" aria-hidden="true">
			<span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
		</div>
		<div class="editor-lines">
			<div><span class="kw">import</span> <span class="dim">"forensics"</span></div>
			<div>&nbsp;</div>
			<div><span class="kw">fn</span> scan(target) {'{'}</div>
			<div>&nbsp;&nbsp;<span class="dim">let</span> report = <span bind:this={target} class="fx-typewriter"></span></div>
			<div>{'}'}</div>
		</div>
	</div>

	<div class="editor-suggest" aria-hidden="true">
		<div>mlsp · completion</div>
		<div>hover · signature help · diagnostics</div>
	</div>
</div>
