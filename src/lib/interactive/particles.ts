/**
 * The overlay's own particle field.
 *
 * `initCursorFX` in `motion.ts` is the obvious candidate to reuse, and it is the
 * wrong one: it is gated on `:root[data-theme='artist']` and draws nothing in
 * light or dark, which is where this game opens from. The algorithm below is
 * adapted from it with the theme gate removed and the hardcoded hues replaced by
 * the overlay's own `--cb-neon` / `--cb-magenta`, read from the live element so
 * the canvas and the CSS can never disagree.
 *
 * `motion.ts` itself is left untouched.
 *
 * Reduced motion is checked here, not inherited: the global CSS override in
 * `app.css` collapses transitions but does not touch `requestAnimationFrame`, so
 * without this check a reduced-motion player would get a particle storm.
 */

import { prefersReducedMotion, type Cleanup } from '$lib/artist/motion';

type Particle = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	decay: number;
	size: number;
	color: string;
};

const MAX_PARTICLES = 160;
const GRAVITY = 0.015;
const TRAIL_DECAY = 0.028;

export type ParticleField = {
	/** Two particles per pointer move, while a tile is being dragged. */
	trail: (x: number, y: number) => void;
	/** A radial burst — 18 on a snap, 120 on a solve. */
	burst: (x: number, y: number, count: number, spread?: number) => void;
	stop: Cleanup;
};

const NOOP_FIELD: ParticleField = {
	trail: () => {},
	burst: () => {},
	stop: () => {}
};

function readColor(source: HTMLElement, property: string, fallback: string): string {
	const value = getComputedStyle(source).getPropertyValue(property).trim();
	return value.length > 0 ? value : fallback;
}

/** Blend a CSS color with an alpha without parsing it — `color-mix` does the work. */
function withAlpha(color: string, alpha: number): string {
	const percent = Math.max(0, Math.min(100, Math.round(alpha * 100)));
	return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

/**
 * Mount a particle canvas sized to the overlay's bounding box.
 *
 * `palette` is read from `overlay`, which carries the `--cb-*` tokens, so the
 * field is correct in every site theme without knowing which one is active.
 * Another host names its own two custom properties in `tokens`.
 */
export function initParticles(
	canvas: HTMLCanvasElement,
	overlay: HTMLElement,
	tokens: { primary: string; secondary: string } = { primary: '--cb-neon', secondary: '--cb-magenta' }
): ParticleField {
	if (typeof window === 'undefined' || prefersReducedMotion()) return NOOP_FIELD;

	const context = canvas.getContext('2d');
	if (!context) return NOOP_FIELD;

	const neon = readColor(overlay, tokens.primary, '#46f1ff');
	const magenta = readColor(overlay, tokens.secondary, '#ff2eb8');

	const dpr = Math.max(window.devicePixelRatio || 1, 1);
	const particles: Particle[] = [];
	let width = 0;
	let height = 0;
	let raf = 0;
	let running = true;

	// Measure `overlay`, never `canvas`.
	//
	// A canvas is a *replaced* element, so `inset: 0` does not stretch it the way
	// it stretches a div: with `width: auto` a replaced element takes its
	// intrinsic size, which for a canvas is its `width`/`height` attributes. So
	// measuring the canvas and then writing `canvas.width = measured * dpr` sets
	// the very box the next measurement reads. On any display where `dpr > 1`
	// that is a feedback loop — a `ResizeObserver` on the canvas re-fires on the
	// write, and the backing store grows by `dpr` every frame until it hits the
	// ~268 MB canvas budget, the 2D surface fails to allocate, and the tab stops
	// rasterising. `codebreaker.css` now pins the canvas to `100%/100%` as well,
	// so the two guards are independent.
	const resize = () => {
		const rect = overlay.getBoundingClientRect();
		width = rect.width;
		height = rect.height;
		const backingWidth = Math.max(1, Math.floor(width * dpr));
		const backingHeight = Math.max(1, Math.floor(height * dpr));
		// Writing an unchanged size still drops the surface and clears the frame.
		if (canvas.width !== backingWidth) canvas.width = backingWidth;
		if (canvas.height !== backingHeight) canvas.height = backingHeight;
		context.setTransform(dpr, 0, 0, dpr, 0, 0);
	};

	const spawn = (x: number, y: number, count: number, speed: number, decay: number) => {
		for (let i = 0; i < count; i += 1) {
			const angle = Math.random() * Math.PI * 2;
			const velocity = Math.random() * speed;
			particles.push({
				x,
				y,
				vx: Math.cos(angle) * velocity,
				vy: Math.sin(angle) * velocity - 0.4,
				life: 1,
				decay,
				size: Math.random() * 2.2 + 0.6,
				color: i % 2 === 0 ? neon : magenta
			});
		}
		if (particles.length > MAX_PARTICLES) {
			particles.splice(0, particles.length - MAX_PARTICLES);
		}
	};

	const render = () => {
		if (!running) return;
		context.clearRect(0, 0, width, height);

		for (let i = particles.length - 1; i >= 0; i -= 1) {
			const particle = particles[i];
			particle.x += particle.vx;
			particle.y += particle.vy;
			particle.vy += GRAVITY;
			particle.life -= particle.decay;

			if (particle.life <= 0) {
				particles.splice(i, 1);
				continue;
			}

			context.fillStyle = withAlpha(particle.color, particle.life * 0.6);
			context.beginPath();
			context.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
			context.fill();
		}

		raf = requestAnimationFrame(render);
	};

	const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
	observer?.observe(overlay);

	resize();
	raf = requestAnimationFrame(render);

	return {
		trail: (x, y) => spawn(x, y, 2, 1.6, TRAIL_DECAY),
		burst: (x, y, count, spread = 3.2) => spawn(x, y, count, spread, 0.02),
		stop: () => {
			running = false;
			cancelAnimationFrame(raf);
			observer?.disconnect();
			particles.length = 0;
			context.clearRect(0, 0, width, height);
		}
	};
}
