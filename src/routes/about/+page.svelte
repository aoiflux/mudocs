<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';

	let { data } = $props();
</script>

<SeoHead title={data.about.title} description={data.about.description} />

<article class="doc-content" style="max-width: 72ch;">
	<p class="eyebrow">About</p>
	<h1>{data.about.title}</h1>
	<p class="lede">{data.about.description}</p>
	{@html data.about.html}
</article>
