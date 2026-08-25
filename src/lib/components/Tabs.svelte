<script lang="ts">
	/** Guide / Diagrams / Source, with the accent underline on the active tab. */
	let {
		tabs,
		active = $bindable(tabs[0]?.id ?? '')
	}: {
		tabs: Array<{ id: string; label: string; disabled?: boolean }>;
		active?: string;
	} = $props();

	function onKeydown(event: KeyboardEvent) {
		const enabled = tabs.filter((tab) => !tab.disabled);
		const index = enabled.findIndex((tab) => tab.id === active);
		if (index < 0) return;

		if (event.key === 'ArrowRight') {
			event.preventDefault();
			active = enabled[(index + 1) % enabled.length].id;
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			active = enabled[(index - 1 + enabled.length) % enabled.length].id;
		}
	}
</script>

<div class="tabs" role="tablist">
	{#each tabs as tab (tab.id)}
		<button
			type="button"
			role="tab"
			class="tab"
			class:is-active={active === tab.id}
			aria-selected={active === tab.id}
			aria-controls={`panel-${tab.id}`}
			id={`tab-${tab.id}`}
			tabindex={active === tab.id ? 0 : -1}
			disabled={tab.disabled}
			onclick={() => (active = tab.id)}
			onkeydown={onKeydown}
		>
			{tab.label}
		</button>
	{/each}
</div>
