<script lang="ts">
	let { data } = $props();
</script>

<section class="panel" style="margin-bottom: 1rem;">
	<p class="kicker">Themes</p>
	<h1 style="margin: 0; text-transform: uppercase;">Documentation Themes</h1>
	<p class="lede">Cross-link the definitive guide by technical themes across sections.</p>
</section>

<section class="grid">
	{#each data.themes as theme}
		<article class="card">
			<h3>{theme.title}</h3>
			<p>{theme.description}</p>
			<div class="meta-row">
				<span class="meta-chip">{theme.count} docs</span>
			</div>
			<p style="margin-bottom: 0; margin-top: 0.8rem;">
				<a href={`/docs/themes/${theme.theme}`}>Explore theme</a>
			</p>
		</article>
	{/each}
</section>
