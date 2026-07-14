<script lang="ts">
	let { data } = $props();
</script>

<article class="panel doc-content">
	<p class="kicker">About</p>
	<h1 style="margin-top: 0;">{data.about.title}</h1>
	<p class="lede">{data.about.description}</p>
	{@html data.about.html}
</article>
