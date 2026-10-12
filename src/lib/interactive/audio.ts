/**
 * Thirteen voices, synthesized. No audio files of any kind ship with this game.
 *
 * Graph: every voice → master gain → compressor → destination, with a shared
 * 90 ms delay line and feedback gain standing in for reverb. The one noise
 * buffer is generated once and reused by the voices that need transient hiss.
 *
 * Muted by default. The context is created inside the Y/N click handler — a real
 * user gesture — and if it does not reach `running` the whole module silently
 * disables itself rather than leaving a dead toggle in the UI.
 */

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

export type AudioStatus = 'idle' | 'running' | 'blocked' | 'unsupported';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wet: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let status: AudioStatus = 'idle';
let muted = true;
let reduced = false;

/** Rate limit for the hover tick, which can otherwise fire per pixel. */
let lastHover = 0;
/** Rate limit for the cursor tick, which repeats for as long as a key is held. */
let lastCursor = 0;
/** Combo pitch, in cents. Climbs on consecutive correct drops, resets on error. */
let combo = 0;

function resolveConstructor(): typeof AudioContext | null {
	if (typeof window === 'undefined') return null;
	const scoped = window as WebkitWindow;
	return window.AudioContext ?? scoped.webkitAudioContext ?? null;
}

/**
 * Read the live state through a widened return type. Inside a
 * `ctx.state !== 'running'` guard TypeScript keeps the pre-`resume()` narrowing
 * pinned, and `resume()` is exactly what makes it stale.
 */
function stateOf(context: AudioContext): AudioContextState {
	return context.state;
}

function makeNoise(context: AudioContext): AudioBuffer {
	const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
	const channel = buffer.getChannelData(0);
	for (let i = 0; i < channel.length; i += 1) channel[i] = Math.random() * 2 - 1;
	return buffer;
}

/**
 * Create the graph. Must be called from inside a user gesture.
 * Returns the resulting status so the caller can label the toggle honestly.
 */
export function initAudio(prefersReduced = false): AudioStatus {
	reduced = prefersReduced;
	if (ctx) return status;

	const Ctor = resolveConstructor();
	if (!Ctor) {
		status = 'unsupported';
		return status;
	}

	try {
		ctx = new Ctor();
	} catch {
		status = 'unsupported';
		return status;
	}

	master = ctx.createGain();
	master.gain.value = 0.9;

	const compressor = ctx.createDynamicsCompressor();
	compressor.threshold.value = -18;
	compressor.knee.value = 22;
	compressor.ratio.value = 8;
	compressor.attack.value = 0.004;
	compressor.release.value = 0.18;

	// Synthetic room: a short delay fed back on itself. No impulse response.
	const delay = ctx.createDelay(0.5);
	delay.delayTime.value = 0.09;
	const feedback = ctx.createGain();
	feedback.gain.value = 0.28;
	wet = ctx.createGain();
	wet.gain.value = 0;

	wet.connect(delay);
	delay.connect(feedback);
	feedback.connect(delay);
	delay.connect(master);
	master.connect(compressor);
	compressor.connect(ctx.destination);

	noiseBuffer = makeNoise(ctx);

	void ctx.resume().catch(() => undefined);
	status = stateOf(ctx) === 'running' ? 'running' : 'blocked';
	return status;
}

export function audioStatus(): AudioStatus {
	return status;
}

/**
 * Mute or unmute, and report the status once the context has actually settled.
 *
 * Unmuting is itself a click, so it is a legitimate second chance at `resume()`
 * — and it needs to be. `initAudio` reads `state` synchronously on the line
 * after calling `resume()`, which on any browser that hands back a suspended
 * context is simply too early: the promise has not landed yet. Recording
 * `'blocked'` there and never revisiting it is exactly what would leave a
 * player looking at a dead toggle with no way to turn sound on, so the caller
 * gets a promise here and re-reads the status from it.
 */
export function setMuted(next: boolean): Promise<AudioStatus> {
	muted = next;
	if (next || !ctx) return Promise.resolve(status);

	const context = ctx;
	if (stateOf(context) === 'running') {
		status = 'running';
		return Promise.resolve(status);
	}

	return context
		.resume()
		.then(() => settle(context))
		.catch(() => settle(context));
}

/** Re-read a context's state, ignoring one that has since been closed out. */
function settle(context: AudioContext): AudioStatus {
	if (ctx !== context) return status;
	status = stateOf(context) === 'running' ? 'running' : 'blocked';
	return status;
}

export function isMuted(): boolean {
	return muted;
}

export function setReducedMotion(next: boolean): void {
	reduced = next;
}

export function resetCombo(): void {
	combo = 0;
}

export function closeAudio(): void {
	if (!ctx) return;
	const closing = ctx;
	ctx = null;
	master = null;
	wet = null;
	noiseBuffer = null;
	status = 'idle';
	combo = 0;
	lastHover = 0;
	lastCursor = 0;
	void closing.close().catch(() => undefined);
}

/** Every voice funnels through here, so muting really does create no nodes. */
function live(): { context: AudioContext; out: GainNode; send: GainNode } | null {
	if (muted || !ctx || !master || !wet) return null;
	if (ctx.state !== 'running') return null;
	return { context: ctx, out: master, send: wet };
}

type VoiceOptions = {
	/** How much of this voice goes to the delay line. */
	reverb?: number;
};

function tone(
	context: AudioContext,
	out: GainNode,
	send: GainNode,
	type: OscillatorType,
	frequency: number,
	at: number,
	duration: number,
	peak: number,
	options: VoiceOptions = {}
): OscillatorNode {
	const osc = context.createOscillator();
	osc.type = type;
	osc.frequency.setValueAtTime(frequency, at);

	const gain = context.createGain();
	gain.gain.setValueAtTime(0.0001, at);
	gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + 0.006);
	gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

	osc.connect(gain);
	gain.connect(out);
	if (options.reverb) {
		const tap = context.createGain();
		tap.gain.value = options.reverb;
		gain.connect(tap);
		tap.connect(send);
	}

	osc.start(at);
	osc.stop(at + duration + 0.02);
	return osc;
}

function noise(
	context: AudioContext,
	out: AudioNode,
	at: number,
	duration: number,
	peak: number,
	filter?: { type: BiquadFilterType; frequency: number; q?: number }
): void {
	if (!noiseBuffer) return;
	const source = context.createBufferSource();
	source.buffer = noiseBuffer;

	const gain = context.createGain();
	gain.gain.setValueAtTime(peak, at);
	gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

	if (filter) {
		const biquad = context.createBiquadFilter();
		biquad.type = filter.type;
		biquad.frequency.value = filter.frequency;
		if (filter.q !== undefined) biquad.Q.value = filter.q;
		source.connect(biquad);
		biquad.connect(gain);
	} else {
		source.connect(gain);
	}

	gain.connect(out);
	source.start(at);
	source.stop(at + duration + 0.02);
}

// ---------------------------------------------------------------------------
// The voices
// ---------------------------------------------------------------------------

/** A 40 ms tick under the footer glyph. Rate limited to one per 250 ms. */
export function glyphHover(): void {
	const graph = live();
	if (!graph) return;
	const now = graph.context.currentTime;
	if (now - lastHover < 0.25) return;
	lastHover = now;

	tone(graph.context, graph.out, graph.send, 'sine', 1760, now, 0.04, 0.03);
	noise(graph.context, graph.out, now, 0.03, 0.01, { type: 'highpass', frequency: 1200 });
}

/** CRT power-on: two detuned saws beating at ~0.4 Hz, plus the flyback whine. */
export function bootHum(): void {
	const graph = live();
	if (!graph) return;
	const now = graph.context.currentTime;
	const duration = reduced ? 0.3 : 1.6;

	const filter = graph.context.createBiquadFilter();
	filter.type = 'lowpass';
	filter.Q.value = 6;
	filter.frequency.setValueAtTime(180, now);
	filter.frequency.linearRampToValueAtTime(900, now + Math.min(0.7, duration));

	const gain = graph.context.createGain();
	gain.gain.setValueAtTime(0.0001, now);
	gain.gain.exponentialRampToValueAtTime(0.06, now + 0.18);
	gain.gain.exponentialRampToValueAtTime(0.02, now + duration);

	for (const frequency of [55, 55.4]) {
		const osc = graph.context.createOscillator();
		osc.type = 'sawtooth';
		osc.frequency.value = frequency;
		osc.connect(filter);
		osc.start(now);
		osc.stop(now + duration + 0.05);
	}

	filter.connect(gain);
	gain.connect(graph.out);

	// 15.75 kHz — the line frequency of an NTSC CRT, and the reason old rooms whined.
	tone(graph.context, graph.out, graph.send, 'sine', 15750, now, duration, 0.006);
}

/** Picking a tile up. Detuned by slot so the board reads as a scale. */
export function tokenPickUp(slotIndex = 0): void {
	const graph = live();
	if (!graph) return;
	const now = graph.context.currentTime;

	const osc = graph.context.createOscillator();
	osc.type = 'triangle';
	osc.detune.value = slotIndex * 40;
	osc.frequency.setValueAtTime(320, now);
	osc.frequency.exponentialRampToValueAtTime(640, now + 0.06);

	const gain = graph.context.createGain();
	gain.gain.setValueAtTime(0.05, now);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

	osc.connect(gain);
	gain.connect(graph.out);
	osc.start(now);
	osc.stop(now + 0.08);
}

/** Dropping a tile home. Climbs 100 cents per consecutive correct drop. */
export function tokenSnap(correct = true): void {
	if (correct) combo = Math.min(combo + 100, 1200);
	else combo = 0;

	const graph = live();
	if (!graph) return;
	const now = graph.context.currentTime;

	const osc = graph.context.createOscillator();
	osc.type = 'square';
	osc.frequency.value = 180;
	osc.detune.value = combo;

	const gain = graph.context.createGain();
	gain.gain.setValueAtTime(0.04, now);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

	const lowpass = graph.context.createBiquadFilter();
	lowpass.type = 'lowpass';
	lowpass.frequency.value = 900;

	osc.connect(lowpass);
	lowpass.connect(gain);
	gain.connect(graph.out);
	osc.start(now);
	osc.stop(now + 0.09);

	noise(graph.context, graph.out, now, 0.025, 0.05, { type: 'bandpass', frequency: 2400, q: 8 });
}

/** A buzzer, not a tone: two saws beating at 5 Hz, soft-clipped and gated. */
export function errorBuzz(): void {
	combo = 0;
	const graph = live();
	if (!graph) return;
	const now = graph.context.currentTime;
	const duration = 0.26;

	const shaper = graph.context.createWaveShaper();
	const curve = new Float32Array(1024);
	const k = 8;
	for (let i = 0; i < curve.length; i += 1) {
		const x = (i * 2) / curve.length - 1;
		curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
	}
	shaper.curve = curve;

	const lowpass = graph.context.createBiquadFilter();
	lowpass.type = 'lowpass';
	lowpass.frequency.value = 1400;

	const gain = graph.context.createGain();
	gain.gain.setValueAtTime(0.07, now);
	// Three 40 ms chops, so it reads as a buzzer rather than a sustained note.
	for (let chop = 0; chop < 3; chop += 1) {
		const start = now + 0.04 + chop * 0.07;
		gain.gain.setValueAtTime(0.07, start);
		gain.gain.setValueAtTime(0.0, start + 0.02);
		gain.gain.setValueAtTime(0.07, start + 0.04);
	}
	gain.gain.setValueAtTime(0.0, now + duration);

	for (const frequency of [92, 97]) {
		const osc = graph.context.createOscillator();
		osc.type = 'sawtooth';
		osc.frequency.value = frequency;
		osc.connect(shaper);
		osc.start(now);
		osc.stop(now + duration + 0.02);
	}

	shaper.connect(lowpass);
	lowpass.connect(gain);
	gain.connect(graph.out);
}

/** A-D-F: suspended and unresolved on purpose. A hint is not a win. */
export function hintChime(): void {
	const graph = live();
	if (!graph) return;
	const now = graph.context.currentTime;
	const notes = [880, 1174.7, 1396.9];
	notes.forEach((frequency, index) => {
		tone(graph.context, graph.out, graph.send, 'sine', frequency, now + index * 0.06, 0.38, 0.035, {
			reverb: 0.5
		});
	});
}

/** C-E-G-C over a sub, with the filter opening as it climbs. */
export function successFanfare(verified = false): void {
	const graph = live();
	if (!graph) return;
	const now = graph.context.currentTime;
	const notes = [523.25, 659.25, 783.99, 1046.5];

	notes.forEach((frequency, index) => {
		const at = now + index * 0.09;
		const osc = graph.context.createOscillator();
		osc.type = 'square';
		osc.frequency.value = frequency;

		const lowpass = graph.context.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.setValueAtTime(800, at);
		lowpass.frequency.exponentialRampToValueAtTime(6000, at + 0.3);

		const gain = graph.context.createGain();
		gain.gain.setValueAtTime(0.05, at);
		gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);

		const tap = graph.context.createGain();
		tap.gain.value = 0.35;

		osc.connect(lowpass);
		lowpass.connect(gain);
		gain.connect(graph.out);
		gain.connect(tap);
		tap.connect(graph.send);
		osc.start(at);
		osc.stop(at + 0.34);
	});

	tone(graph.context, graph.out, graph.send, 'sine', 65.4, now, 0.7, 0.08);

	// The real compiler agreeing earns its own ping.
	if (verified) {
		tone(graph.context, graph.out, graph.send, 'sine', 1568, now + 0.9, 0.24, 0.05, { reverb: 0.6 });
	}
}
