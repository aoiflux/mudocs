<script lang="ts">
	import { onMount } from 'svelte';

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

		return () => {
			cancelAnimationFrame(frame);
			if (raf) cancelAnimationFrame(raf);
			window.removeEventListener('scroll', onScroll);
			media.removeEventListener('change', onMotionPrefChange);
			observer?.disconnect();
			destroyCanvas();
		};
	});
</script>

<section
	class="panel launch-hero"
	class:reveal-ready={revealReady}
	style={`--hero-progress:${scrollProgress.toFixed(3)}; --scene-phase:${scenePhase};`}
>
	<canvas class="lab-hero-canvas" bind:this={heroCanvas} aria-hidden="true"></canvas>
	<div class="launch-aura"></div>
	<div class="hero-grid-fx"></div>
	<div class="hero-orbital hero-orbital-a"></div>
	<div class="hero-orbital hero-orbital-b"></div>
	<p class="kicker">Theme Lab // Experimental</p>
	<h1 class="big-title">Artist Motion Studio</h1>
	<p class="lede">
		This route is the animation-heavy playground for the display system. Activate scenes, test choreography,
		and stress visual depth while preserving readability.
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
		<a class="cta-primary" href="https://github.com/aoiflux/mutant" target="_blank" rel="noopener noreferrer">
			Open Mutant GitHub
		</a>
		<a class="cta-secondary" href="/">Back To Landing</a>
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

<section class="panel cinematic-stage" style="margin-top: 1rem;" style:--scene-phase={scenePhase}>
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

<section class="panel" style="margin-top: 1rem;">
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
