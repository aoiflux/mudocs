<script lang="ts">
	import { onMount } from 'svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';

	// These two sheets are this route's alone. They used to load globally from
	// +layout.svelte, which shipped ~1200 lines of neon showcase CSS on every page.
	import '$lib/artist/artist-fx.css';
	import '$lib/artist/theme-lab.css';

	import {
		attachMagnetic,
		attachTilt,
		createTimeline,
		createTypewriter,
		EASE,
		initCursorFX,
		initParallax,
		initScrollReveals,
		type Cleanup
	} from '$lib/artist/motion';

	type DisplayTheme = 'light' | 'dark' | 'artist';

	const themeShowcase: Array<{
		id: DisplayTheme;
		title: string;
		tagline: string;
		description: string;
		traits: string[];
	}> = [
		{
			id: 'light',
			title: 'Light',
			tagline: 'Precision In Daylight',
			description:
				'A bright editorial surface tuned for scanning complex docs, architecture maps, and reference material with low friction.',
			traits: ['Clean hierarchy', 'Balanced contrast', 'Fast scanning']
		},
		{
			id: 'dark',
			title: 'Dark',
			tagline: 'Focused After Hours',
			description:
				'Engine-room contrast for deep sessions in runtime internals, security investigations, and long-form analysis at night.',
			traits: ['Low glare', 'High legibility', 'Context-rich glow']
		},
		{
			id: 'artist',
			title: 'Artist',
			tagline: 'Cyberpunk Meets Control',
			description:
				'An expressive, layered, kinetic mode designed to show depth, atmosphere, and motion while keeping content readable.',
			traits: ['Neon gradients', 'Depth + drama', 'Showcase motion']
		}
	];

	const artistScenes = [
		{
			title: 'Neon Control Room',
			copy: 'Layered gradients, precision grids, and cinematic highlights for high-focus command surfaces.',
			theme: 'artist' as const,
			meter: 'Depth 92%'
		},
		{
			title: 'Velocity Tunnel',
			copy: 'Directional motion, sweeping light beams, and parallax rhythm to create perceived speed.',
			theme: 'dark' as const,
			meter: 'Motion 88%'
		},
		{
			title: 'Editorial Precision',
			copy: 'Readable hierarchy and crisp contrast so visual drama never sacrifices legibility.',
			theme: 'light' as const,
			meter: 'Clarity 95%'
		}
	];

	let activatedTheme = $state<DisplayTheme | null>(null);
	let revealReady = $state(false);
	let scenePhase = $state(0);
	let scrollProgress = $state(0);
	let reduceMotion = $state(false);
	let heroCanvas = $state<HTMLCanvasElement | null>(null);
	let cursorCanvas = $state<HTMLCanvasElement | null>(null);
	let typeTarget = $state<HTMLElement | null>(null);
	let typeScrollTarget = $state<HTMLElement | null>(null);
	let heroPanel = $state<HTMLElement | null>(null);

	function activateTheme(theme: DisplayTheme) {
		activatedTheme = theme;
		window.dispatchEvent(new CustomEvent('mudocs:set-theme', { detail: { mode: theme } }));
	}

	function activateSceneTheme(theme: DisplayTheme, phase: number) {
		scenePhase = phase;
		activateTheme(theme);
	}

	onMount(() => {
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		reduceMotion = media.matches;
		activateTheme('artist');

		const frame = requestAnimationFrame(() => {
			revealReady = true;
		});

		const onMotionPrefChange = () => {
			reduceMotion = media.matches;
		};

		let raf = 0;
		const onScroll = () => {
			if (reduceMotion) return;
			if (raf) return;
			raf = requestAnimationFrame(() => {
				const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
				scrollProgress = Math.min(window.scrollY / maxScroll, 1);
				raf = 0;
			});
		};

		let observer: IntersectionObserver | null = null;
		if (!reduceMotion) {
			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (!entry.isIntersecting) continue;
						const phase = Number((entry.target as HTMLElement).dataset.artistScene ?? 0);
						if (!Number.isNaN(phase)) {
							scenePhase = phase;
						}
					}
				},
				{ threshold: 0.65 }
			);

			for (const element of document.querySelectorAll<HTMLElement>('[data-artist-scene]')) {
				observer.observe(element);
			}
		}

		let destroyCanvas = () => {};
		if (!reduceMotion && heroCanvas) {
			const ctx = heroCanvas.getContext('2d');
			if (ctx) {
				const dpr = Math.max(window.devicePixelRatio || 1, 1);
				const particles = Array.from({ length: 46 }).map(() => ({
					x: Math.random(),
					y: Math.random(),
					vx: (Math.random() - 0.5) * 0.0005,
					vy: (Math.random() - 0.5) * 0.0007,
					size: Math.random() * 2 + 0.8,
					hue: Math.random() > 0.5 ? 188 : 322
				}));

				let width = 0;
				let height = 0;
				const resize = () => {
					if (!heroCanvas) return;
					const bounds = heroCanvas.getBoundingClientRect();
					width = Math.max(1, bounds.width);
					height = Math.max(1, bounds.height);
					heroCanvas.width = Math.floor(width * dpr);
					heroCanvas.height = Math.floor(height * dpr);
					ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
				};

				resize();
				window.addEventListener('resize', resize);

				let animationId = 0;
				const render = () => {
					ctx.clearRect(0, 0, width, height);
					for (const particle of particles) {
						particle.x += particle.vx;
						particle.y += particle.vy;

						if (particle.x < -0.05) particle.x = 1.05;
						if (particle.x > 1.05) particle.x = -0.05;
						if (particle.y < -0.05) particle.y = 1.05;
						if (particle.y > 1.05) particle.y = -0.05;

						const px = particle.x * width;
						const py = particle.y * height;
						ctx.fillStyle = `hsla(${particle.hue}, 95%, 64%, 0.4)`;
						ctx.beginPath();
						ctx.arc(px, py, particle.size, 0, Math.PI * 2);
						ctx.fill();
					}

					animationId = requestAnimationFrame(render);
				};

				render();
				destroyCanvas = () => {
					cancelAnimationFrame(animationId);
					window.removeEventListener('resize', resize);
				};
			}
		}

		window.addEventListener('scroll', onScroll, { passive: true });
		media.addEventListener('change', onMotionPrefChange);
		onScroll();

		// --- Artist FX engine wiring -----------------------------------------
		const fxCleanups: Cleanup[] = [];

		// Typewriter hero title: loops through motion-language phrases
		if (typeTarget) {
			fxCleanups.push(
				createTypewriter(typeTarget, {
					mode: 'type-loop',
					phrases: ['Artist Motion Studio', 'Cyberpunk Meets Control', 'Brutalist. Material. Kinetic.'],
					typeSpeed: 52,
					deleteSpeed: 24,
					holdMs: 2100
				})
			);
		}

		// Scroll-driven typewriter for the FX index section
		if (typeScrollTarget) {
			fxCleanups.push(
				createTypewriter(typeScrollTarget, {
					mode: 'type-scroll',
					phrases: ['Every effect below is a reusable utility: apply a class or data attribute and ship it.']
				})
			);
		}

		// Scroll choreography: reveals + parallax depth layers
		fxCleanups.push(initScrollReveals());
		fxCleanups.push(initParallax());

		// Cursor FX layer (artist-mode gated internally)
		if (cursorCanvas) {
			fxCleanups.push(initCursorFX(cursorCanvas));
		}

		// Magnetic CTAs + 3D tilt cards
		for (const cta of document.querySelectorAll<HTMLElement>('.launch-hero .cta-primary, .launch-hero .cta-secondary')) {
			fxCleanups.push(attachMagnetic(cta, 0.3));
		}
		for (const stage of document.querySelectorAll<HTMLElement>('.theme-stage')) {
			fxCleanups.push(attachTilt(stage, 6));
		}

		// Entrance timeline: hero elements sequenced Ferrari-launch -> Apple-settle
		if (heroPanel && !reduceMotion) {
			const kicker = heroPanel.querySelector('.kicker');
			const title = heroPanel.querySelector('.big-title');
			const spectrum = heroPanel.querySelector('.hero-spectrum');
			const timeline = createTimeline();
			if (kicker) {
				timeline.to(kicker, [{ opacity: 0, transform: 'translateX(-28px)' }, { opacity: 1, transform: 'none' }], {
					duration: 420,
					ease: EASE.ferrari
				});
			}
			if (title) {
				timeline.to(
					title,
					[{ opacity: 0, transform: 'translateY(26px) scale(0.97)' }, { opacity: 1, transform: 'none' }],
					{ duration: 640, ease: EASE.apple, offset: -180 }
				);
			}
			if (spectrum) {
				timeline.to(spectrum, [{ opacity: 0, transform: 'scaleX(0.6)' }, { opacity: 1, transform: 'none' }], {
					duration: 520,
					ease: EASE.snap,
					offset: -240
				});
			}
			void timeline.play();
			fxCleanups.push(() => timeline.cancel());
		}

		return () => {
			cancelAnimationFrame(frame);
			if (raf) cancelAnimationFrame(raf);
			window.removeEventListener('scroll', onScroll);
			media.removeEventListener('change', onMotionPrefChange);
			observer?.disconnect();
			destroyCanvas();
			for (const dispose of fxCleanups) dispose();
		};
	});
</script>

<SeoHead
	title="Theme lab"
	description="The animation and effects showcase. Not part of the documentation corpus."
	index={false}
/>

<canvas class="fx-cursor-canvas" bind:this={cursorCanvas} aria-hidden="true"></canvas>

<section
	class="panel launch-hero fx-grain fx-scanlines"
	class:reveal-ready={revealReady}
	bind:this={heroPanel}
	style={`--hero-progress:${scrollProgress.toFixed(3)}; --scene-phase:${scenePhase};`}
>
	{#if reduceMotion}
		<img class="artist-hero-video-fallback" src="/artist/banner.png" alt="" aria-hidden="true" loading="eager" />
	{:else}
		<video class="artist-hero-video" autoplay muted loop playsinline preload="metadata" poster="/artist/banner.png" aria-hidden="true">
			<source src="/artist/banner-vid.mp4" type="video/mp4" />
		</video>
	{/if}
	<canvas class="lab-hero-canvas" bind:this={heroCanvas} aria-hidden="true"></canvas>
	<img class="artist-hero-emblem" src="/artist/banner.png" alt="" aria-hidden="true" loading="lazy" decoding="async" />
	<div class="launch-aura"></div>
	<div class="hero-grid-fx"></div>
	<div class="hero-orbital hero-orbital-a"></div>
	<div class="hero-orbital hero-orbital-b"></div>
	<div class="fx-shard" style="width: 7rem; height: 5rem; top: 14%; right: 22%;" aria-hidden="true"></div>
	<div class="fx-shard fx-shard--magenta" style="width: 5rem; height: 3.6rem; bottom: 20%; left: 12%;" aria-hidden="true"></div>
	<p class="kicker">Theme Lab // Experimental</p>
	<h1 class="big-title"><span bind:this={typeTarget}>Artist Motion Studio</span></h1>
	<p class="lede">
		<span class="fx-glitch fx-glitch-hover" data-text="Brutalist structure. Material depth. Cyberpunk motion.">Brutalist structure. Material depth. Cyberpunk motion.</span>
		Activate scenes, test choreography, and stress visual depth while preserving readability.
	</p>
	<div class="hero-spectrum" aria-hidden="true">
		<span></span>
		<span></span>
		<span></span>
	</div>
	<div class="meta-row">
		<span class="meta-chip">Theme engine: live</span>
		<span class="meta-chip">Motion profile: cinematic</span>
		<span class="meta-chip">Mode count: 4 incl. auto</span>
	</div>
	<div class="cta-cluster">
		<a class="cta-primary fx-neon-outline" href="https://github.com/aoiflux/mutant" target="_blank" rel="noopener noreferrer">
			Open Mutant GitHub
		</a>
		<a class="cta-secondary fx-neon-outline" href="/">Back To Landing</a>
	</div>
</section>

<hr class="fx-separator" style="margin-top: 1rem;" />

<section class="panel fx-holo fx-scanlines" style="margin-top: 1rem;" data-fx="panel-reveal">
	<p class="kicker">FX Index</p>
	<h2 class="fx-glitch" data-text="MOTION VOCABULARY" style="margin-top: 0; text-transform: uppercase;">Motion Vocabulary</h2>
	<p class="lede" style="max-width: 64ch; min-height: 3.2em;"><span bind:this={typeScrollTarget}></span></p>
	<div class="grid" style="margin-top: 0.9rem;" data-fx="fade-up" data-fx-stagger="90">
		<article class="card fx-angled fx-metal" style="grid-column: span 4; color: #e9f2ff;">
			<h3 style="color: #e9f2ff;">Typewriter</h3>
			<p>type, type-disappear, type-scroll, and type-loop engines driving hero and section copy.</p>
			<span class="doc-nav-label" style="color: #9fb4d8;">createTypewriter()</span>
		</article>
		<article class="card fx-angled" style="grid-column: span 4;">
			<h3>Glitch</h3>
			<p><span class="fx-glitch fx-glitch-hover" data-text="pixel-shift + chromatic aberration">pixel-shift + chromatic aberration</span> with scanline flicker overlays. Hover me.</p>
			<span class="doc-nav-label">.fx-glitch / .fx-scanlines</span>
		</article>
		<article class="card fx-angled fx-grid-flow" style="grid-column: span 4;">
			<h3>Ambient Loops</h3>
			<p>neon-pulse, breathing-light, and this flowing grid keep surfaces alive without stealing focus.</p>
			<span class="doc-nav-label meta-chip fx-neon-pulse">.fx-grid-flow</span>
		</article>
		<article class="card fx-angled" style="grid-column: span 4;" data-parallax-depth="0.25">
			<h3>Parallax Depth</h3>
			<p>This card translates on scroll via data-parallax-depth for layered Z-motion.</p>
			<span class="doc-nav-label">data-parallax-depth</span>
		</article>
		<article class="card fx-angled fx-neon-outline" style="grid-column: span 4;">
			<h3>Neon Outline</h3>
			<p>Ferrari-curve hover feedback with hard brutalist offset shadows. Hover me.</p>
			<span class="doc-nav-label">.fx-neon-outline</span>
		</article>
		<article class="card fx-angled fx-breathing" style="grid-column: span 4;">
			<h3>Physics Springs</h3>
			<p>Magnetic CTAs and 3D-tilt gallery cards run on requestAnimationFrame spring solvers.</p>
			<span class="doc-nav-label">attachMagnetic() / attachTilt()</span>
		</article>
	</div>
</section>

<section class="panel artist-media-panel fx-grain" style="margin-top: 1rem;" data-fx="slide-diagonal">
	<p class="kicker">Artist Signature Assets</p>
	<h2 style="margin-top: 0; text-transform: uppercase;">Banner Motion + Identity Frame</h2>
	<p class="lede" style="max-width: 64ch; margin-top: 0.25rem;">
		These assets are now part of the artist theme language. The motion plate sets atmosphere while the banner frame
		anchors brand identity and clarity.
	</p>
	<div class="grid artist-media-grid" style="margin-top: 0.85rem;">
		<article class="card artist-media-card" style="grid-column: span 8;">
			<p class="doc-nav-label">Motion Plate</p>
			<video
				class="artist-video"
				autoplay
				muted
				loop
				playsinline
				controls
				preload="metadata"
				poster="/artist/banner.png"
			>
				<source src="/artist/banner-vid.mp4" type="video/mp4" />
				Your browser does not support embedded video playback.
			</video>
		</article>
		<article class="card artist-media-card" style="grid-column: span 4;">
			<p class="doc-nav-label">Identity Banner</p>
			<img
				class="artist-banner"
				src="/artist/banner.png"
				alt="Mutant banner showing entropy defined security mark"
				loading="lazy"
				decoding="async"
			/>
		</article>
	</div>
</section>

<section class="panel kinetic-strip-panel" style="margin-top: 1rem;">
	<div class="kinetic-strip" aria-hidden="true">
		<div class="kinetic-track">
			<span>Artist Mode</span>
			<span>Depth</span>
			<span>Motion</span>
			<span>Atmosphere</span>
			<span>Precision</span>
			<span>Artist Mode</span>
			<span>Depth</span>
			<span>Motion</span>
			<span>Atmosphere</span>
			<span>Precision</span>
		</div>
	</div>
</section>

<section class="panel cinematic-stage" style="margin-top: 1rem;" style:--scene-phase={scenePhase} data-fx="fade-up">
	<p class="kicker">Design Chapters</p>
	<h2 style="margin-top: 0; text-transform: uppercase;">Motion Built In Layers</h2>
	<p class="lede" style="max-width: 60ch; margin-top: 0.2rem;">
		A design-first narrative where each chapter pushes a cinematic quality and can immediately trigger the
		corresponding theme.
	</p>
	<div class="grid scene-grid" style="margin-top: 0.9rem;">
		{#each artistScenes as scene, index}
			<article
				class="card scene-card"
				class:scene-active={scenePhase === index}
				data-artist-scene={index}
				onmouseenter={() => (scenePhase = index)}
			>
				<div class="scene-meter" style={`--meter:${72 + index * 10}%`}>
					<span>{scene.meter}</span>
				</div>
				<h3>{scene.title}</h3>
				<p>{scene.copy}</p>
				<div class="theme-card-actions">
					<button type="button" class="theme-activate" onclick={() => activateSceneTheme(scene.theme, index)}>
						Cue Scene
					</button>
				</div>
			</article>
		{/each}
	</div>
</section>

<section class="panel" style="margin-top: 1rem;" data-fx="scale-in">
	<p class="kicker">Theme Gallery</p>
	<h2 style="margin-top: 0; text-transform: uppercase;">Choose Your Lens</h2>
	<div class="grid theme-gallery-grid" style="margin-top: 0.8rem;">
		{#each themeShowcase as theme}
			<article class="card theme-stage theme-{theme.id}" class:is-active={activatedTheme === theme.id}>
				<div class="theme-stage-glow"></div>
				<p class="doc-nav-label">{theme.tagline}</p>
				<h3>{theme.title}</h3>
				<p>{theme.description}</p>
				<div class="meta-row" style="margin-top: 0.9rem;">
					{#each theme.traits as trait}
						<span class="meta-chip">{trait}</span>
					{/each}
				</div>
				<div class="theme-card-actions">
					<button type="button" class="theme-activate" onclick={() => activateTheme(theme.id)}>
						Activate {theme.title}
					</button>
					<span class="doc-nav-label">Live preview on entire site</span>
				</div>
			</article>
		{/each}
	</div>
</section>
