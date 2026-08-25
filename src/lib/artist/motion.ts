/**
 * Artist Theme Motion Engine
 * Brutalist + Material foundations, Control-UI geometry, Cyberpunk 2077 motion language.
 *
 * Modules:
 *  - Typewriter engine   (type | type-disappear | type-scroll | type-loop)
 *  - Scroll choreography (IntersectionObserver reveals + parallax depth-shift)
 *  - Physics interactions (magnetic-hover, tilt-3d) via requestAnimationFrame springs
 *  - Cursor FX           (trailing-particles, magnetic-pointer, hologram-ripple)
 *  - Timeline sequencer  (GSAP-like chaining built on the Web Animations API)
 *
 * All systems are SSR-safe and honor prefers-reduced-motion.
 */

export type Cleanup = () => void;

// ---------------------------------------------------------------------------
// Motion tokens (mirrors CSS custom properties in artist-fx.css)
// ---------------------------------------------------------------------------

export const EASE = {
	/** Apple-style physical smoothness */
	apple: 'cubic-bezier(0.22, 1, 0.36, 1)',
	/** Ferrari-style aggressive launch */
	ferrari: 'cubic-bezier(0.9, 0.02, 0.1, 1)',
	/** Control-style hard snap */
	snap: 'cubic-bezier(0.85, 0, 0.15, 1)',
	/** Micro-interaction feedback */
	micro: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
} as const;

export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return true;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isArtistTheme(): boolean {
	if (typeof document === 'undefined') return false;
	return document.documentElement.getAttribute('data-theme') === 'artist';
}

// ---------------------------------------------------------------------------
// 1. Typewriter engine
// ---------------------------------------------------------------------------

export type TypewriterMode = 'type' | 'type-disappear' | 'type-scroll' | 'type-loop';

export type TypewriterOptions = {
	mode?: TypewriterMode;
	/** Phrases to cycle through (loop/disappear modes use all; type uses first). */
	phrases: string[];
	/** ms per character while typing */
	typeSpeed?: number;
	/** ms per character while deleting */
	deleteSpeed?: number;
	/** pause after a phrase completes */
	holdMs?: number;
	/** scroll container progress source for type-scroll (defaults to element's section) */
	scrollAnchor?: HTMLElement | null;
};

export function createTypewriter(target: HTMLElement, options: TypewriterOptions): Cleanup {
	if (typeof window === 'undefined') return () => {};

	const {
		mode = 'type',
		phrases,
		typeSpeed = 46,
		deleteSpeed = 22,
		holdMs = 1400,
		scrollAnchor = null
	} = options;

	if (phrases.length === 0) return () => {};

	// Reduced motion: render final text instantly, no timers.
	if (prefersReducedMotion()) {
		target.textContent = phrases[0];
		return () => {};
	}

	target.classList.add('fx-typewriter');
	let disposed = false;
	let timer = 0;

	const schedule = (fn: () => void, ms: number) => {
		timer = window.setTimeout(() => {
			if (!disposed) fn();
		}, ms);
	};

	// --- type-scroll: characters revealed by scroll progress -----------------
	if (mode === 'type-scroll') {
		const anchor = scrollAnchor ?? target.closest('section') ?? target;
		const text = phrases[0];

		const onScroll = () => {
			const rect = anchor.getBoundingClientRect();
			const viewport = window.innerHeight || 1;
			// progress: 0 when section enters bottom, 1 when its top passes 25% viewport
			const raw = (viewport - rect.top) / (viewport * 0.75);
			const progress = Math.min(Math.max(raw, 0), 1);
			const chars = Math.round(progress * text.length);
			target.textContent = text.slice(0, chars);
			target.classList.toggle('fx-typewriter-done', chars >= text.length);
		};

		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();
		return () => {
			disposed = true;
			window.removeEventListener('scroll', onScroll);
		};
	}

	// --- timer-driven modes ---------------------------------------------------
	let phraseIndex = 0;
	let charIndex = 0;
	let deleting = false;

	const tick = () => {
		const phrase = phrases[phraseIndex % phrases.length];

		if (!deleting) {
			charIndex += 1;
			target.textContent = phrase.slice(0, charIndex);

			if (charIndex >= phrase.length) {
				target.classList.add('fx-typewriter-done');
				if (mode === 'type') return; // single pass, keep caret blinking
				deleting = true;
				schedule(tick, holdMs);
				return;
			}
			schedule(tick, typeSpeed);
			return;
		}

		charIndex -= 1;
		target.textContent = phrase.slice(0, charIndex);
		target.classList.remove('fx-typewriter-done');

		if (charIndex <= 0) {
			deleting = false;
			if (mode === 'type-disappear' && phraseIndex >= phrases.length - 1) {
				return; // typed everything once, ended empty
			}
			phraseIndex += 1;
			schedule(tick, typeSpeed * 3);
			return;
		}
		schedule(tick, deleteSpeed);
	};

	schedule(tick, typeSpeed);

	return () => {
		disposed = true;
		window.clearTimeout(timer);
	};
}

// ---------------------------------------------------------------------------
// 2. Scroll choreography: reveals + parallax depth
// ---------------------------------------------------------------------------

/**
 * Observes every element with [data-fx] and applies .fx-in when it enters the
 * viewport. Stagger children via [data-fx-stagger] on the parent.
 */
export function initScrollReveals(root: ParentNode = document): Cleanup {
	if (typeof window === 'undefined') return () => {};

	const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-fx]'));
	if (targets.length === 0) return () => {};

	if (prefersReducedMotion()) {
		for (const el of targets) el.classList.add('fx-in');
		return () => {};
	}

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				const el = entry.target as HTMLElement;
				const stagger = Number(el.dataset.fxStagger ?? 0);
				if (stagger > 0) {
					let i = 0;
					for (const child of Array.from(el.children) as HTMLElement[]) {
						child.style.transitionDelay = `${i * stagger}ms`;
						i += 1;
					}
				}
				el.classList.add('fx-in');
				observer.unobserve(el);
			}
		},
		{ threshold: 0.25, rootMargin: '0px 0px -8% 0px' }
	);

	for (const el of targets) observer.observe(el);
	return () => observer.disconnect();
}

/**
 * Parallax depth-shift: elements with [data-parallax-depth] translate on scroll
 * proportionally to their depth factor (e.g. 0.2 subtle, 0.8 dramatic).
 */
export function initParallax(root: ParentNode = document): Cleanup {
	if (typeof window === 'undefined' || prefersReducedMotion()) return () => {};

	const layers = Array.from(root.querySelectorAll<HTMLElement>('[data-parallax-depth]'));
	if (layers.length === 0) return () => {};

	let raf = 0;
	const update = () => {
		raf = 0;
		const viewport = window.innerHeight || 1;
		for (const layer of layers) {
			const depth = Number(layer.dataset.parallaxDepth ?? 0.3);
			const rect = layer.getBoundingClientRect();
			const centerDelta = (rect.top + rect.height / 2 - viewport / 2) / viewport;
			layer.style.transform = `translate3d(0, ${(-centerDelta * depth * 64).toFixed(2)}px, 0)`;
		}
	};

	const onScroll = () => {
		if (!raf) raf = requestAnimationFrame(update);
	};

	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onScroll);
	onScroll();

	return () => {
		if (raf) cancelAnimationFrame(raf);
		window.removeEventListener('scroll', onScroll);
		window.removeEventListener('resize', onScroll);
	};
}

// ---------------------------------------------------------------------------
// 3. Physics interactions: magnetic hover + 3D tilt (spring-based rAF)
// ---------------------------------------------------------------------------

type Spring = { x: number; y: number; vx: number; vy: number };

function springStep(s: Spring, tx: number, ty: number, stiffness = 0.12, damping = 0.72) {
	s.vx = (s.vx + (tx - s.x) * stiffness) * damping;
	s.vy = (s.vy + (ty - s.y) * stiffness) * damping;
	s.x += s.vx;
	s.y += s.vy;
}

/** Element is pulled toward the cursor within its bounds (Ferrari launch out, Apple settle back). */
export function attachMagnetic(el: HTMLElement, strength = 0.35): Cleanup {
	if (typeof window === 'undefined' || prefersReducedMotion()) return () => {};

	const spring: Spring = { x: 0, y: 0, vx: 0, vy: 0 };
	let targetX = 0;
	let targetY = 0;
	let raf = 0;
	let active = false;

	const loop = () => {
		springStep(spring, targetX, targetY);
		el.style.transform = `translate3d(${spring.x.toFixed(2)}px, ${spring.y.toFixed(2)}px, 0)`;
		const settled =
			!active && Math.abs(spring.x) < 0.1 && Math.abs(spring.y) < 0.1 && Math.abs(spring.vx) < 0.05;
		if (settled) {
			el.style.transform = '';
			raf = 0;
			return;
		}
		raf = requestAnimationFrame(loop);
	};

	const onMove = (event: PointerEvent) => {
		const rect = el.getBoundingClientRect();
		targetX = (event.clientX - rect.left - rect.width / 2) * strength;
		targetY = (event.clientY - rect.top - rect.height / 2) * strength;
		active = true;
		if (!raf) raf = requestAnimationFrame(loop);
	};

	const onLeave = () => {
		targetX = 0;
		targetY = 0;
		active = false;
		if (!raf) raf = requestAnimationFrame(loop);
	};

	el.addEventListener('pointermove', onMove);
	el.addEventListener('pointerleave', onLeave);

	return () => {
		el.removeEventListener('pointermove', onMove);
		el.removeEventListener('pointerleave', onLeave);
		if (raf) cancelAnimationFrame(raf);
		el.style.transform = '';
	};
}

/** Perspective tilt following the cursor, with springed return. */
export function attachTilt(el: HTMLElement, maxDeg = 7): Cleanup {
	if (typeof window === 'undefined' || prefersReducedMotion()) return () => {};

	const spring: Spring = { x: 0, y: 0, vx: 0, vy: 0 };
	let targetRX = 0;
	let targetRY = 0;
	let raf = 0;
	let active = false;

	el.classList.add('fx-tilt');

	const loop = () => {
		springStep(spring, targetRX, targetRY, 0.14, 0.7);
		el.style.transform = `perspective(720px) rotateX(${spring.x.toFixed(2)}deg) rotateY(${spring.y.toFixed(2)}deg)`;
		const settled = !active && Math.abs(spring.x) < 0.05 && Math.abs(spring.y) < 0.05;
		if (settled) {
			el.style.transform = '';
			raf = 0;
			return;
		}
		raf = requestAnimationFrame(loop);
	};

	const onMove = (event: PointerEvent) => {
		const rect = el.getBoundingClientRect();
		const nx = (event.clientX - rect.left) / rect.width - 0.5;
		const ny = (event.clientY - rect.top) / rect.height - 0.5;
		targetRX = -ny * maxDeg;
		targetRY = nx * maxDeg;
		active = true;
		if (!raf) raf = requestAnimationFrame(loop);
	};

	const onLeave = () => {
		targetRX = 0;
		targetRY = 0;
		active = false;
		if (!raf) raf = requestAnimationFrame(loop);
	};

	el.addEventListener('pointermove', onMove);
	el.addEventListener('pointerleave', onLeave);

	return () => {
		el.removeEventListener('pointermove', onMove);
		el.removeEventListener('pointerleave', onLeave);
		if (raf) cancelAnimationFrame(raf);
		el.style.transform = '';
		el.classList.remove('fx-tilt');
	};
}

// ---------------------------------------------------------------------------
// 4. Cursor FX: trailing particles + magnetic pointer ring + hologram ripple
// ---------------------------------------------------------------------------

type Particle = { x: number; y: number; vx: number; vy: number; life: number; hue: number; size: number };
type Ripple = { x: number; y: number; r: number; alpha: number };

/**
 * Full-viewport cursor FX layer. Only renders while the artist theme is active
 * (watches data-theme). Returns a cleanup function.
 */
export function initCursorFX(canvas: HTMLCanvasElement): Cleanup {
	if (typeof window === 'undefined' || prefersReducedMotion()) return () => {};

	const ctx = canvas.getContext('2d');
	if (!ctx) return () => {};

	const dpr = Math.max(window.devicePixelRatio || 1, 1);
	let width = 0;
	let height = 0;
	let raf = 0;
	let enabled = isArtistTheme();

	const particles: Particle[] = [];
	const ripples: Ripple[] = [];
	const pointer: Spring = { x: -100, y: -100, vx: 0, vy: 0 };
	let mouseX = -100;
	let mouseY = -100;
	let hasMoved = false;

	const resize = () => {
		width = window.innerWidth;
		height = window.innerHeight;
		canvas.width = Math.floor(width * dpr);
		canvas.height = Math.floor(height * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	};

	const spawnParticles = (x: number, y: number, count: number) => {
		for (let i = 0; i < count; i += 1) {
			particles.push({
				x,
				y,
				vx: (Math.random() - 0.5) * 1.6,
				vy: (Math.random() - 0.5) * 1.6 - 0.4,
				life: 1,
				hue: Math.random() > 0.5 ? 187 : 322,
				size: Math.random() * 2.2 + 0.6
			});
		}
		if (particles.length > 220) particles.splice(0, particles.length - 220);
	};

	const onMove = (event: PointerEvent) => {
		mouseX = event.clientX;
		mouseY = event.clientY;
		if (!hasMoved) {
			pointer.x = mouseX;
			pointer.y = mouseY;
			hasMoved = true;
		}
		if (enabled) spawnParticles(mouseX, mouseY, 2);
	};

	const onClick = (event: PointerEvent) => {
		if (!enabled) return;
		ripples.push({ x: event.clientX, y: event.clientY, r: 4, alpha: 0.85 });
		spawnParticles(event.clientX, event.clientY, 14);
	};

	const render = () => {
		ctx.clearRect(0, 0, width, height);

		if (enabled && hasMoved) {
			// magnetic pointer ring (spring-follows the cursor)
			springStep(pointer, mouseX, mouseY, 0.2, 0.68);
			ctx.strokeStyle = 'rgba(70, 241, 255, 0.65)';
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(pointer.x, pointer.y, 14, 0, Math.PI * 2);
			ctx.stroke();
			ctx.fillStyle = 'rgba(255, 111, 207, 0.9)';
			ctx.beginPath();
			ctx.arc(pointer.x, pointer.y, 2, 0, Math.PI * 2);
			ctx.fill();

			// trailing particles
			for (let i = particles.length - 1; i >= 0; i -= 1) {
				const p = particles[i];
				p.x += p.vx;
				p.y += p.vy;
				p.vy += 0.015;
				p.life -= 0.022;
				if (p.life <= 0) {
					particles.splice(i, 1);
					continue;
				}
				ctx.fillStyle = `hsla(${p.hue}, 96%, 64%, ${(p.life * 0.55).toFixed(3)})`;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
				ctx.fill();
			}

			// hologram ripples
			for (let i = ripples.length - 1; i >= 0; i -= 1) {
				const r = ripples[i];
				r.r += 3.4;
				r.alpha -= 0.02;
				if (r.alpha <= 0) {
					ripples.splice(i, 1);
					continue;
				}
				ctx.strokeStyle = `rgba(70, 241, 255, ${r.alpha.toFixed(3)})`;
				ctx.lineWidth = 1.2;
				ctx.beginPath();
				ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
				ctx.stroke();
				ctx.strokeStyle = `rgba(255, 111, 207, ${(r.alpha * 0.6).toFixed(3)})`;
				ctx.beginPath();
				ctx.arc(r.x, r.y, r.r * 0.72, 0, Math.PI * 2);
				ctx.stroke();
			}
		}

		raf = requestAnimationFrame(render);
	};

	// react to theme switches so FX only run in artist mode
	const themeObserver = new MutationObserver(() => {
		enabled = isArtistTheme();
		if (!enabled) {
			particles.length = 0;
			ripples.length = 0;
		}
	});
	themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

	resize();
	window.addEventListener('resize', resize);
	window.addEventListener('pointermove', onMove, { passive: true });
	window.addEventListener('pointerdown', onClick, { passive: true });
	raf = requestAnimationFrame(render);

	return () => {
		cancelAnimationFrame(raf);
		themeObserver.disconnect();
		window.removeEventListener('resize', resize);
		window.removeEventListener('pointermove', onMove);
		window.removeEventListener('pointerdown', onClick);
	};
}

// ---------------------------------------------------------------------------
// 5. Timeline sequencer (GSAP-like chaining over the Web Animations API)
// ---------------------------------------------------------------------------

type TimelineStep = {
	el: Element;
	keyframes: Keyframe[];
	duration: number;
	ease: string;
	/** offset relative to previous step end; negative overlaps */
	offset: number;
};

export type Timeline = {
	to: (
		el: Element,
		keyframes: Keyframe[],
		opts?: { duration?: number; ease?: string; offset?: number }
	) => Timeline;
	play: () => Promise<void>;
	cancel: () => void;
};

export function createTimeline(): Timeline {
	const steps: TimelineStep[] = [];
	const running: Animation[] = [];

	const timeline: Timeline = {
		to(el, keyframes, opts = {}) {
			steps.push({
				el,
				keyframes,
				duration: opts.duration ?? 600,
				ease: opts.ease ?? EASE.apple,
				offset: opts.offset ?? 0
			});
			return timeline;
		},
		async play() {
			if (typeof window === 'undefined') return;
			if (prefersReducedMotion()) {
				// jump to final states instantly
				for (const step of steps) {
					const last = step.keyframes[step.keyframes.length - 1] as Record<string, unknown>;
					for (const [prop, value] of Object.entries(last)) {
						if (prop === 'offset' || prop === 'easing' || prop === 'composite') continue;
						(step.el as HTMLElement).style.setProperty(
							prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`),
							String(value)
						);
					}
				}
				return;
			}

			let cursor = 0;
			const jobs: Promise<unknown>[] = [];
			for (const step of steps) {
				const start = Math.max(cursor + step.offset, 0);
				const animation = step.el.animate(step.keyframes, {
					duration: step.duration,
					delay: start,
					easing: step.ease,
					fill: 'both'
				});
				running.push(animation);
				jobs.push(animation.finished.catch(() => undefined));
				cursor = start + step.duration;
			}
			await Promise.all(jobs);
		},
		cancel() {
			for (const animation of running) animation.cancel();
			running.length = 0;
		}
	};

	return timeline;
}

// ---------------------------------------------------------------------------
// 6. Hero field — cursor-reactive blueprint nodes (M2)
// ---------------------------------------------------------------------------

/**
 * A lattice of square nodes drifting on the hero's blueprint grid. Nodes near
 * the cursor are pulled toward it on a spring and wired to it with hairlines.
 *
 * Deliberately separate from initCursorFX(): that one is a neon particle trail
 * hardcoded to the artist palette (hue 187/322) and gated to the artist theme.
 * This one draws in the Industry idiom and reads its color from the live
 * --color-accent token, so it follows light/dark without a second code path.
 */
export function initHeroField(canvas: HTMLCanvasElement): Cleanup {
	if (typeof window === 'undefined' || prefersReducedMotion()) return () => {};

	const ctx = canvas.getContext('2d');
	if (!ctx) return () => {};

	const dpr = Math.max(window.devicePixelRatio || 1, 1);
	const SPACING = 64;
	const REACH = 132;

	type Node = { hx: number; hy: number; s: Spring };
	let nodes: Node[] = [];
	let width = 0;
	let height = 0;
	let raf = 0;
	let mouseX = -9999;
	let mouseY = -9999;
	let accent = '#5980a6';

	const readAccent = () => {
		const value = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
		if (value) accent = value;
	};

	const build = () => {
		const rect = canvas.getBoundingClientRect();
		width = rect.width;
		height = rect.height;
		canvas.width = Math.floor(width * dpr);
		canvas.height = Math.floor(height * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		nodes = [];
		for (let y = SPACING / 2; y < height; y += SPACING) {
			for (let x = SPACING / 2; x < width; x += SPACING) {
				nodes.push({ hx: x, hy: y, s: { x, y, vx: 0, vy: 0 } });
			}
		}
	};

	const onMove = (event: PointerEvent) => {
		const rect = canvas.getBoundingClientRect();
		mouseX = event.clientX - rect.left;
		mouseY = event.clientY - rect.top;
	};

	const onLeave = () => {
		mouseX = -9999;
		mouseY = -9999;
	};

	const render = () => {
		ctx.clearRect(0, 0, width, height);

		for (const node of nodes) {
			const dx = mouseX - node.hx;
			const dy = mouseY - node.hy;
			const dist = Math.hypot(dx, dy);
			const pull = dist < REACH ? (1 - dist / REACH) * 0.42 : 0;

			springStep(node.s, node.hx + dx * pull, node.hy + dy * pull, 0.1, 0.74);

			const near = pull > 0;
			ctx.fillStyle = accent;
			ctx.globalAlpha = near ? 0.28 + pull * 0.62 : 0.18;
			const size = near ? 2.4 + pull * 2.6 : 2;
			ctx.fillRect(node.s.x - size / 2, node.s.y - size / 2, size, size);

			if (near) {
				ctx.globalAlpha = pull * 0.34;
				ctx.strokeStyle = accent;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(node.s.x, node.s.y);
				ctx.lineTo(mouseX, mouseY);
				ctx.stroke();
			}
		}

		ctx.globalAlpha = 1;
		raf = requestAnimationFrame(render);
	};

	const themeObserver = new MutationObserver(readAccent);
	themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

	readAccent();
	build();
	window.addEventListener('resize', build);
	window.addEventListener('pointermove', onMove, { passive: true });
	window.addEventListener('pointerleave', onLeave, { passive: true });
	raf = requestAnimationFrame(render);

	return () => {
		cancelAnimationFrame(raf);
		themeObserver.disconnect();
		window.removeEventListener('resize', build);
		window.removeEventListener('pointermove', onMove);
		window.removeEventListener('pointerleave', onLeave);
	};
}

// ---------------------------------------------------------------------------
// 7. Counter roll (M7) — tick a number up to its target on reveal
// ---------------------------------------------------------------------------

export function rollCounter(el: HTMLElement, to: number, duration = 900): Cleanup {
	if (typeof window === 'undefined') {
		el.textContent = String(to);
		return () => {};
	}
	if (prefersReducedMotion()) {
		el.textContent = to.toLocaleString();
		return () => {};
	}

	let raf = 0;
	let start = 0;

	const step = (now: number) => {
		if (!start) start = now;
		const t = Math.min((now - start) / duration, 1);
		// ease-out cubic, so the last digits settle rather than snap
		const eased = 1 - Math.pow(1 - t, 3);
		el.textContent = Math.round(to * eased).toLocaleString();
		if (t < 1) raf = requestAnimationFrame(step);
	};

	raf = requestAnimationFrame(step);
	return () => cancelAnimationFrame(raf);
}

// ---------------------------------------------------------------------------
// 8. Momentum carousel (M5) — drag with inertia, clamped to the track
// ---------------------------------------------------------------------------

export function attachMomentumScroll(viewport: HTMLElement, track: HTMLElement): Cleanup {
	if (typeof window === 'undefined') return () => {};

	let offset = 0;
	let velocity = 0;
	let dragging = false;
	let lastX = 0;
	let raf = 0;

	const maxOffset = () => Math.min(0, viewport.clientWidth - track.scrollWidth);

	const apply = () => {
		track.style.transform = `translate3d(${offset.toFixed(2)}px, 0, 0)`;
	};

	const loop = () => {
		if (!dragging) {
			offset += velocity;
			velocity *= 0.94;

			const min = maxOffset();
			// rubber-band back into range rather than hard-stopping at the edge
			if (offset > 0) {
				offset += (0 - offset) * 0.18;
				velocity = 0;
			} else if (offset < min) {
				offset += (min - offset) * 0.18;
				velocity = 0;
			}
			if (Math.abs(velocity) < 0.02) velocity = 0;
			apply();
		}
		raf = requestAnimationFrame(loop);
	};

	const onDown = (event: PointerEvent) => {
		dragging = true;
		lastX = event.clientX;
		velocity = 0;
		viewport.classList.add('is-dragging');
		viewport.setPointerCapture(event.pointerId);
	};

	const onMove = (event: PointerEvent) => {
		if (!dragging) return;
		const dx = event.clientX - lastX;
		lastX = event.clientX;
		offset += dx;
		velocity = dx;
		apply();
	};

	const onUp = (event: PointerEvent) => {
		if (!dragging) return;
		dragging = false;
		viewport.classList.remove('is-dragging');
		if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
	};

	const onWheel = (event: WheelEvent) => {
		const dx = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
		if (!dx) return;
		event.preventDefault();
		velocity = -dx * 0.5;
	};

	viewport.addEventListener('pointerdown', onDown);
	viewport.addEventListener('pointermove', onMove);
	viewport.addEventListener('pointerup', onUp);
	viewport.addEventListener('pointercancel', onUp);
	viewport.addEventListener('wheel', onWheel, { passive: false });
	raf = requestAnimationFrame(loop);

	return () => {
		cancelAnimationFrame(raf);
		viewport.removeEventListener('pointerdown', onDown);
		viewport.removeEventListener('pointermove', onMove);
		viewport.removeEventListener('pointerup', onUp);
		viewport.removeEventListener('pointercancel', onUp);
		viewport.removeEventListener('wheel', onWheel);
	};
}
