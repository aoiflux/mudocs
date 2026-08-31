/**
 * Pointer Events drag controller.
 *
 * Not HTML5 drag-and-drop, and not by preference: HTML5 DnD has no touch support
 * on iOS Safari or Chrome-Android, which disqualifies it on the phone
 * requirement alone; its drag image is a browser-rasterized bitmap, so
 * `setDragImage` cannot carry a live springed, glowing element with a particle
 * trail; and `dragover` gives throttled coordinates with no `setPointerCapture`
 * equivalent. `attachMomentumScroll` in `motion.ts` already sets the precedent
 * for pointer capture in this codebase.
 *
 * One handler serves two interaction models. Below a 6 px threshold a
 * `pointerup` is a *select-tap*, which is exactly the keyboard path — so the
 * mobile experience and the accessible experience are the same code, and both
 * get exercised continuously.
 */

import { prefersReducedMotion, type Cleanup } from '$lib/artist/motion';
import type { Tile } from './types';

/** Below this, the gesture is a tap, not a drag. */
const DRAG_THRESHOLD_PX = 6;
/** A slot arms when the proxy's centre comes within this. */
const MAGNET_RADIUS_PX = 96;

type Spring = { x: number; y: number; vx: number; vy: number };

/**
 * Semi-implicit Euler. The form is copied from `springStep` in `motion.ts`
 * (module-private there) rather than exported from it, so `motion.ts` stays
 * untouched by this feature.
 */
function springStep(spring: Spring, tx: number, ty: number, stiffness: number, damping: number): void {
	spring.vx = (spring.vx + (tx - spring.x) * stiffness) * damping;
	spring.vy = (spring.vy + (ty - spring.y) * stiffness) * damping;
	spring.x += spring.vx;
	spring.y += spring.vy;
}

/** Follow lags with weight; snap overshoots twice; a rejection sulks home. */
const PHASE = {
	follow: { k: 0.3, d: 0.68 },
	snap: { k: 0.42, d: 0.58 },
	reject: { k: 0.22, d: 0.8 }
} as const;

export type SlotTarget = { index: number; element: HTMLElement };

export type DragHandlers = {
	/** Empty slots that could accept the tile currently in hand. */
	targets: () => SlotTarget[];
	/** The armed slot changed. Null means nothing is in range. */
	onArm: (index: number | null) => void;
	/** A drag finished over a slot, or over nothing. */
	onDrop: (tile: Tile, slotIndex: number | null) => void;
	/** A press that never crossed the threshold — same semantics as Enter. */
	onSelect: (tile: Tile) => void;
	/** Viewport coordinates, for the particle trail. */
	onMove?: (x: number, y: number) => void;
	/** The drag actually started (past the threshold). */
	onLift?: (tile: Tile) => void;
};

export type DragController = {
	begin: (event: PointerEvent, tile: Tile, source: HTMLElement) => void;
	/** Escape while a tile is held. */
	cancel: () => void;
	dragging: () => boolean;
	destroy: Cleanup;
};

type Session = {
	tile: Tile;
	source: HTMLElement;
	pointerId: number;
	startX: number;
	startY: number;
	grabX: number;
	grabY: number;
	proxy: HTMLElement | null;
	spring: Spring;
	armed: number | null;
	lifted: boolean;
	settling: boolean;
	raf: number;
};

function centreOf(element: HTMLElement): { x: number; y: number } {
	const rect = element.getBoundingClientRect();
	return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function createDragController(layer: HTMLElement, handlers: DragHandlers): DragController {
	const reduced = prefersReducedMotion();
	let session: Session | null = null;
	let pointerX = 0;
	let pointerY = 0;

	const teardown = (active: Session) => {
		cancelAnimationFrame(active.raf);
		active.proxy?.remove();
		active.source.classList.remove('cb-tile-ghost');
		try {
			active.source.releasePointerCapture(active.pointerId);
		} catch {
			// The pointer may already be gone; nothing to release.
		}
		active.source.removeEventListener('pointermove', onPointerMove);
		active.source.removeEventListener('pointerup', onPointerUp);
		active.source.removeEventListener('pointercancel', onPointerCancel);
		session = null;
	};

	const lift = (active: Session) => {
		active.lifted = true;
		active.source.classList.add('cb-tile-ghost');

		const rect = active.source.getBoundingClientRect();
		const proxy = active.source.cloneNode(true) as HTMLElement;
		proxy.classList.remove('cb-tile-ghost');
		proxy.classList.add('cb-tile-proxy');
		proxy.setAttribute('aria-hidden', 'true');
		proxy.removeAttribute('id');
		proxy.style.width = `${rect.width}px`;
		proxy.style.height = `${rect.height}px`;
		layer.appendChild(proxy);

		active.proxy = proxy;
		active.spring = { x: rect.left, y: rect.top, vx: 0, vy: 0 };
		handlers.onLift?.(active.tile);

		if (!reduced) active.raf = requestAnimationFrame(frame);
		else paint(active);
	};

	const paint = (active: Session) => {
		if (!active.proxy) return;
		const rotation = reduced ? 0 : Math.max(-11, Math.min(11, active.spring.vx * 0.9));
		active.proxy.style.transform = `translate3d(${active.spring.x}px, ${active.spring.y}px, 0) rotate(${rotation}deg)`;
	};

	/** Nearest empty slot within the magnet radius, and how hard it pulls. */
	const magnet = (x: number, y: number): { index: number; x: number; y: number; pull: number } | null => {
		let best: { index: number; x: number; y: number; distance: number } | null = null;
		for (const target of handlers.targets()) {
			const centre = centreOf(target.element);
			const distance = Math.hypot(centre.x - x, centre.y - y);
			if (distance > MAGNET_RADIUS_PX) continue;
			if (!best || distance < best.distance) {
				best = { index: target.index, x: centre.x, y: centre.y, distance };
			}
		}
		if (!best) return null;
		// Squared falloff, so it grabs late and hard rather than dragging the
		// tile around from across the pane.
		const pull = Math.pow(Math.max(0, Math.min(1, 1 - best.distance / MAGNET_RADIUS_PX)), 2);
		return { index: best.index, x: best.x, y: best.y, pull };
	};

	function frame(): void {
		const active = session;
		if (!active || !active.proxy) return;

		const rect = active.proxy.getBoundingClientRect();
		const half = { x: rect.width / 2, y: rect.height / 2 };

		let targetX = pointerX - active.grabX;
		let targetY = pointerY - active.grabY;

		if (!active.settling) {
			const found = magnet(targetX + half.x, targetY + half.y);
			const nextArmed = found?.index ?? null;
			if (nextArmed !== active.armed) {
				active.armed = nextArmed;
				handlers.onArm(nextArmed);
			}
			if (found) {
				targetX = targetX + (found.x - half.x - targetX) * found.pull;
				targetY = targetY + (found.y - half.y - targetY) * found.pull;
			}
		} else if (active.armed !== null) {
			const target = handlers.targets().find((entry) => entry.index === active.armed);
			if (target) {
				const centre = centreOf(target.element);
				targetX = centre.x - half.x;
				targetY = centre.y - half.y;
			}
		}

		const phase = active.settling ? (active.armed === null ? PHASE.reject : PHASE.snap) : PHASE.follow;
		springStep(active.spring, targetX, targetY, phase.k, phase.d);
		paint(active);

		if (active.settling) {
			const still =
				Math.abs(active.spring.vx) < 0.4 &&
				Math.abs(active.spring.vy) < 0.4 &&
				Math.abs(active.spring.x - targetX) < 0.5 &&
				Math.abs(active.spring.y - targetY) < 0.5;
			if (still) {
				const { tile, armed } = active;
				teardown(active);
				handlers.onArm(null);
				handlers.onDrop(tile, armed);
				return;
			}
		}

		active.raf = requestAnimationFrame(frame);
	}

	function onPointerMove(event: PointerEvent): void {
		const active = session;
		if (!active || event.pointerId !== active.pointerId || active.settling) return;

		pointerX = event.clientX;
		pointerY = event.clientY;

		if (!active.lifted) {
			const travelled = Math.hypot(event.clientX - active.startX, event.clientY - active.startY);
			if (travelled < DRAG_THRESHOLD_PX) return;
			lift(active);
		}

		handlers.onMove?.(event.clientX, event.clientY);

		if (reduced) {
			active.spring.x = event.clientX - active.grabX;
			active.spring.y = event.clientY - active.grabY;
			const found = magnet(active.spring.x, active.spring.y);
			const nextArmed = found?.index ?? null;
			if (nextArmed !== active.armed) {
				active.armed = nextArmed;
				handlers.onArm(nextArmed);
			}
			paint(active);
		}
	}

	function onPointerUp(event: PointerEvent): void {
		const active = session;
		if (!active || event.pointerId !== active.pointerId) return;

		if (!active.lifted) {
			const { tile } = active;
			teardown(active);
			handlers.onSelect(tile);
			return;
		}

		if (reduced) {
			const { tile, armed } = active;
			teardown(active);
			handlers.onArm(null);
			handlers.onDrop(tile, armed);
			return;
		}

		// Hand over to the settle phase: underdamped into an armed slot, heavily
		// damped back to the tray if there is nothing to land on.
		active.settling = true;
		if (active.armed === null) {
			const rect = active.source.getBoundingClientRect();
			pointerX = rect.left + active.grabX;
			pointerY = rect.top + active.grabY;
		}
	}

	function onPointerCancel(event: PointerEvent): void {
		const active = session;
		if (!active || event.pointerId !== active.pointerId) return;
		teardown(active);
		handlers.onArm(null);
	}

	return {
		begin(event, tile, source) {
			if (session) return;
			if (event.button !== undefined && event.button !== 0) return;

			const rect = source.getBoundingClientRect();
			pointerX = event.clientX;
			pointerY = event.clientY;

			session = {
				tile,
				source,
				pointerId: event.pointerId,
				startX: event.clientX,
				startY: event.clientY,
				grabX: event.clientX - rect.left,
				grabY: event.clientY - rect.top,
				proxy: null,
				spring: { x: rect.left, y: rect.top, vx: 0, vy: 0 },
				armed: null,
				lifted: false,
				settling: false,
				raf: 0
			};

			try {
				source.setPointerCapture(event.pointerId);
			} catch {
				// Capture is an optimisation; the listeners below still work.
			}

			source.addEventListener('pointermove', onPointerMove);
			source.addEventListener('pointerup', onPointerUp);
			source.addEventListener('pointercancel', onPointerCancel);
		},

		cancel() {
			if (!session) return;
			teardown(session);
			handlers.onArm(null);
		},

		dragging() {
			return session?.lifted ?? false;
		},

		destroy() {
			if (session) teardown(session);
		}
	};
}

/** The rejection shake. WAAPI, so it needs its own reduced-motion guard. */
export function shakeSlot(element: HTMLElement): void {
	if (prefersReducedMotion()) return;
	element.animate(
		[
			{ transform: 'translateX(0)' },
			{ transform: 'translateX(-6px)' },
			{ transform: 'translateX(5px)' },
			{ transform: 'translateX(-3px)' },
			{ transform: 'translateX(0)' }
		],
		{ duration: 300, easing: 'cubic-bezier(0.85, 0, 0.15, 1)' }
	);
}

/** The accept accent: a ring of light that pops and settles. */
export function accentSlot(element: HTMLElement, neon: string): void {
	if (prefersReducedMotion()) return;
	element.animate(
		[
			{ boxShadow: '0 0 0 0 transparent', transform: 'scale(1)' },
			{ boxShadow: `0 0 24px 2px ${neon}`, transform: 'scale(1.06)' },
			{ boxShadow: '0 0 0 0 transparent', transform: 'scale(1)' }
		],
		{ duration: 260, easing: 'cubic-bezier(0.85, 0, 0.15, 1)' }
	);
}
