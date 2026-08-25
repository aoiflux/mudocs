<script lang="ts">
	import { page } from '$app/state';
	import { SITE } from '$lib/site';

	let {
		title,
		description = SITE.description,
		/** Set false on routes that shouldn't be indexed (search results, reports). */
		index = true,
		type = 'website'
	}: {
		title?: string;
		description?: string;
		index?: boolean;
		type?: string;
	} = $props();

	const fullTitle = $derived(title ? `${SITE.titleTemplate} — ${title}` : SITE.titleTemplate);
	const canonical = $derived(new URL(page.url.pathname, SITE.url).href);
	const image = $derived(new URL(SITE.ogImage, SITE.url).href);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	{#if !index}
		<meta name="robots" content="noindex, follow" />
	{/if}

	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={SITE.name} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={image} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
</svelte:head>
