<!--
	The entrance: the Y/N dialogue, the refusal, and the power-on print.

	Every number the boot prints is read from the modules that own it: the
	keyword and builtin counts from `lexer.ts`. Nothing here is a decorative
	string. The toy opcode table in `bytecode.ts` is not Mutant's, so neither
	its size nor a listing from it is printed.

	`Y` is also the gesture that creates the `AudioContext`, which is why the
	choice is a real `<button>` and not a keyboard-only prompt.
-->
<script lang="ts">
	import { createTypewriter, prefersReducedMotion } from '$lib/artist/motion';
	import { MUTANT_TAG } from '$lib/mutant-pin';
	import { BUILTIN_CATALOG_SIZE, KEYWORD_COUNT } from './lexer';

	let {
		phase,
		onAccept,
		onRefuse,
		onDismiss,
		onBooted
	}: {
		phase: 'prompt' | 'refused' | 'booting';
		/** The player pressed Y — also the gesture that unlocks audio. */
		onAccept: () => void;
		/** The player pressed N. */
		onRefuse: () => void;
		/** The refusal has finished printing; close the overlay. */
		onDismiss: () => void;
		/** The boot print has finished; hand over to the game. */
		onBooted: () => void;
	} = $props();

	const PROMPT = [
		'mudocs://footer/registration-mark',
		'anomaly: 0x4D55 signature detected in glyph raster',
		'INITIATE MUTANT CODEBREAKER? [Y/N]'
	].join('\n');

	const REFUSAL = [
		'ERROR: type mismatch: BOOLEAN != COURAGE',
		'exit status 1'
	].join('\n');

	const BOOT = [
		'> mutant_codebreaker v0.1.0',
		'> linking local validator ......... OK',
		`> keywords loaded: ${KEYWORD_COUNT}`,
		`> builtins in mutant ${MUTANT_TAG}: ${BUILTIN_CATALOG_SIZE}`,
		'> wasm host: DEFERRED',
		'> ready.'
	].join('\n');

	const text = $derived(phase === 'prompt' ? PROMPT : phase === 'refused' ? REFUSAL : BOOT);

	let screen = $state<HTMLParagraphElement | undefined>(undefined);
	let accept = $state<HTMLButtonElement | undefined>(undefined);

	$effect(() => {
		const body = text;
		const element = screen;
		if (!element) return;
		return createTypewriter(element, { mode: 'type', phrases: [body], typeSpeed: 18 });
	});

	// Focus lands on [Y] the moment the prompt mounts, so Enter is the answer.
	$effect(() => {
		if (phase === 'prompt') accept?.focus();
	});

	// The refusal reads itself out and closes; the boot hands over to the game.
	$effect(() => {
		const current = phase;
		if (current === 'prompt') return;
		const delay = current === 'refused' ? 1400 : prefersReducedMotion() ? 200 : 2100;
		const timer = setTimeout(current === 'refused' ? onDismiss : onBooted, delay);
		return () => clearTimeout(timer);
	});
</script>

<div class="cb-boot">
	<p class="cb-boot-text" bind:this={screen}>{text}</p>

	{#if phase === 'prompt'}
		<div class="cb-boot-choices">
			<button bind:this={accept} type="button" class="cb-btn cb-btn-primary" onclick={onAccept}>
				[Y] initiate
			</button>
			<button type="button" class="cb-btn" onclick={onRefuse}>[N] decline</button>
		</div>
	{:else if phase === 'booting'}
		<p class="cb-boot-skip">press any key to skip</p>
	{/if}
</div>
