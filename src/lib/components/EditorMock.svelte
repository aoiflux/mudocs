<script lang="ts">
	/**
	 * M12 — the extension preview whose completions type themselves.
	 *
	 * The code shown here is real Mutant. An earlier version opened with
	 * `import "forensics"`, which is not a thing: the language has no module or
	 * package system, and `import` is not among its reserved keywords
	 * (docs/MUTANT_LANGUAGE_REFERENCE.md). What is shown instead is the
	 * `(value, err)` idiom that same reference documents, calling builtins that
	 * exist in docs/CAPABILITY_REFERENCE.md.
	 */
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
			<div><span class="kw">let</span> scan = <span class="kw">fn</span>(path) {'{'}</div>
			<div>
				&nbsp;&nbsp;<span class="kw">let</span> info, err = fs_hash(path,
				<span class="dim">"sha256"</span>);
			</div>
			<div>
				&nbsp;&nbsp;<span class="kw">if</span> (err) {'{'} <span class="kw">return</span> err; {'}'};
			</div>
			<div>
				&nbsp;&nbsp;<span class="kw">return</span>
				<span bind:this={target} class="fx-typewriter"></span>
			</div>
			<div>{'}'};</div>
		</div>
	</div>

	<div class="editor-suggest" aria-hidden="true">
		<div>mlsp · completion</div>
		<div>hover · signature help · diagnostics</div>
	</div>
</div>
