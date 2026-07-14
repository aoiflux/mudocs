<script lang="ts">
	let { data } = $props();
</script>

<section class="panel" style="margin-bottom: 1rem;">
	<p class="kicker">Theme</p>
	<h1 style="margin: 0; text-transform: uppercase;">{data.current.title}</h1>
	<p class="lede">{data.current.description}</p>
	<div class="meta-row">
		<span class="meta-chip">{data.docs.length} docs</span>
	</div>
</section>

<section class="grid">
	{#each data.docs as doc}
		<article class="card">
			<h3>{doc.title}</h3>
			<p>{doc.description}</p>
			<div class="meta-row">
				<span class="meta-chip">{doc.sectionTitle}</span>
				<span class="meta-chip">Audience: {doc.audience}</span>
			</div>
			<p style="margin-bottom: 0; margin-top: 0.8rem;">
				<a href={`/docs/${doc.section}/${doc.slug}`}>Open document</a>
			</p>
		</article>
	{/each}
</section>
