<script lang="ts">
	let { data } = $props();
</script>

<section class="panel" style="margin-bottom: 1rem;">
	<p class="kicker">Quality Dashboard</p>
	<h1 style="margin: 0; text-transform: uppercase;">Docs Quality Report</h1>
	<p class="lede">
		Generated quality checks for the definitive guide corpus. Use this page to track metadata hygiene,
		discoverability, and structural completeness.
	</p>
	<div class="meta-row">
		<span class="meta-chip">Total docs: {data.report.totalDocs}</span>
		<span class="meta-chip">Docs with issues: {data.report.docsWithIssues}</span>
		<span class="meta-chip">Generated: {data.report.generatedAt}</span>
	</div>
</section>

<section class="panel" style="margin-bottom: 1rem;">
	<p class="kicker">Issue Counts</p>
	<div class="related-docs-list">
		{#each Object.entries(data.report.issueCounts) as [kind, count]}
			<div class="related-doc-link">
				<strong>{kind}</strong><br />
				<span style="font-size: 0.95rem; color: #2c2a27;">{count} affected docs</span>
			</div>
		{/each}
	</div>
</section>

<section class="panel">
	<p class="kicker">Affected Documents</p>
	{#if data.report.rows.length === 0}
		<p class="lede" style="margin-bottom: 0;">No issues detected.</p>
	{:else}
		<div class="related-docs-list">
			{#each data.report.rows as row}
				<article class="related-doc-link">
					<strong>{row.title}</strong><br />
					<span style="font-size: 0.85rem; text-transform: uppercase; color: #2c2a27;">
						{row.section} // {row.sourcePath} // audience: {row.audience}
					</span>
					<ul style="margin-top: 0.6rem; margin-bottom: 0; padding-left: 1.1rem;">
						{#each row.issues as issue}
							<li style="margin-bottom: 0.35rem;">{issue.message}</li>
						{/each}
					</ul>
					<p style="margin-top: 0.65rem; margin-bottom: 0;">
						<a href={`/docs/${row.section}/${row.slug}`}>Open document</a>
					</p>
				</article>
			{/each}
		</div>
	{/if}
</section>
