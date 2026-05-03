import type { VoiceId } from "../voices";

let noiseBuffer: AudioBuffer | null = null;

function getNoise(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    const len = Math.floor(ctx.sampleRate * 0.25);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function gainEnv(
  ctx: AudioContext,
  t: number,
  peak: number,
  attack: number,
  decay: number,
): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.001, t + attack + decay);
  return g;
}

function playBD(ctx: AudioContext, t: number): void {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.12);
  const g = gainEnv(ctx, t, 0.95, 0.002, 0.22);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.35);
}

function playSD(ctx: AudioContext, t: number): void {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1800, t);
  bp.Q.setValueAtTime(1.2, t);
  const ng = gainEnv(ctx, t, 0.55, 0.001, 0.12);
  src.connect(bp);
  bp.connect(ng);
  ng.connect(ctx.destination);
  src.start(t, 0, 0.15);

  const tone = ctx.createOscillator();
  tone.type = "triangle";
  tone.frequency.setValueAtTime(220, t);
  const tg = gainEnv(ctx, t, 0.35, 0.001, 0.06);
  tone.connect(tg);
  tg.connect(ctx.destination);
  tone.start(t);
  tone.stop(t + 0.08);
}

function playTom(ctx: AudioContext, t: number, startHz: number): void {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(startHz, t);
  osc.frequency.exponentialRampToValueAtTime(startHz * 0.35, t + 0.12);
  const g = gainEnv(ctx, t, 0.45, 0.002, 0.18);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.25);
}

function playRS(ctx: AudioContext, t: number): void {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(1200, t);
  const g = gainEnv(ctx, t, 0.5, 0.0005, 0.04);
  src.connect(hp);
  hp.connect(g);
  g.connect(ctx.destination);
  src.start(t, 0, 0.05);
}

function playCP(ctx: AudioContext, t: number): void {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1400, t);
  const g = gainEnv(ctx, t, 0.6, 0.002, 0.08);
  src.connect(bp);
  bp.connect(g);
  g.connect(ctx.destination);
  src.start(t, 0, 0.1);
}

function playMA(ctx: AudioContext, t: number): void {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(6000, t);
  const g = gainEnv(ctx, t, 0.25, 0.001, 0.03);
  src.connect(hp);
  hp.connect(g);
  g.connect(ctx.destination);
  src.start(t, 0, 0.04);
}

function playCH(ctx: AudioContext, t: number): void {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(7000, t);
  const g = gainEnv(ctx, t, 0.22, 0.0005, 0.035);
  src.connect(hp);
  hp.connect(g);
  g.connect(ctx.destination);
  src.start(t, 0, 0.05);
}

function playOH(ctx: AudioContext, t: number): void {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(5000, t);
  const g = gainEnv(ctx, t, 0.3, 0.002, 0.18);
  src.connect(hp);
  hp.connect(g);
  g.connect(ctx.destination);
  src.start(t, 0, 0.22);
}

function playCY(ctx: AudioContext, t: number): void {
  const freqs = [400, 670, 960];
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f, t);
    const g = gainEnv(ctx, t, 0.08 / (i + 1), 0.001, 0.45 + i * 0.05);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.55);
  });
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(8000, t);
  const g = gainEnv(ctx, t, 0.06, 0.001, 0.5);
  src.connect(bp);
  bp.connect(g);
  g.connect(ctx.destination);
  src.start(t, 0, 0.4);
}

function playCB(ctx: AudioContext, t: number): void {
  const o1 = ctx.createOscillator();
  o1.type = "square";
  o1.frequency.setValueAtTime(540, t);
  const o2 = ctx.createOscillator();
  o2.type = "square";
  o2.frequency.setValueAtTime(800, t);
  const g = gainEnv(ctx, t, 0.15, 0.001, 0.1);
  const m = ctx.createGain();
  m.gain.setValueAtTime(0.5, t);
  o1.connect(m);
  o2.connect(m);
  m.connect(g);
  g.connect(ctx.destination);
  o1.start(t);
  o2.start(t);
  o1.stop(t + 0.15);
  o2.stop(t + 0.15);
}

/** Trigger a voice at audio timeline time `t`. */
export function playVoice(ctx: AudioContext, voice: VoiceId, t: number): void {
  switch (voice) {
    case "BD":
      playBD(ctx, t);
      break;
    case "SD":
      playSD(ctx, t);
      break;
    case "LT":
      playTom(ctx, t, 190);
      break;
    case "MT":
      playTom(ctx, t, 250);
      break;
    case "HT":
      playTom(ctx, t, 320);
      break;
    case "RS":
      playRS(ctx, t);
      break;
    case "CP":
      playCP(ctx, t);
      break;
    case "MA":
      playMA(ctx, t);
      break;
    case "CH":
      playCH(ctx, t);
      break;
    case "OH":
      playOH(ctx, t);
      break;
    case "CY":
      playCY(ctx, t);
      break;
    case "CB":
      playCB(ctx, t);
      break;
    default:
      break;
  }
}

/**
 * Creates an AudioContext with legacy Safari / iOS support (`webkitAudioContext`).
 * Must only run in the browser (client components).
 */
export function createBrowserAudioContext(): AudioContext {
  if (typeof window === "undefined") {
    throw new Error("AudioContext can only be created in the browser");
  }
  const w = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const Ctor = window.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) throw new Error("Web Audio API not supported");
  return new Ctor();
}

/**
 * iOS Safari only unlocks audio when `resume()` is invoked in the same turn as the
 * user gesture (tap/click). Do not `await` before this from a pointer handler.
 */
export function unlockAudioContext(ctx: AudioContext): void {
  if (ctx.state === "suspended") void ctx.resume();
}

/** Await running state — avoid between user gesture and first `playVoice` on iOS; use `unlockAudioContext` in handlers. */
export async function resumeAudioContext(ctx: AudioContext): Promise<void> {
  if (ctx.state === "suspended") await ctx.resume();
}
