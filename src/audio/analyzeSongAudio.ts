import { createEmptyPattern, STEPS, type BeatPattern } from "@/state/pattern";
import { voiceIndex } from "@/voices";

const MAX_ANALYZE_SECONDS = 45;

/** Default analysis window for catalog preview scrubbing (seconds). */
export const PREVIEW_ANALYSIS_WINDOW_SECONDS = 7;
const NOVELTY_HOP_MS = 11;
const NOVELTY_WIN_MS = 23;
const MIN_BPM = 58;
const MAX_BPM = 198;
const ZCR_LOW = 0.012;
const ZCR_HIGH = 0.055;

function monoDownmix(buf: AudioBuffer): Float32Array {
  const len = buf.length;
  const out = new Float32Array(len);
  const nCh = buf.numberOfChannels;
  if (nCh === 0) return out;
  for (let c = 0; c < nCh; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < len; i++) out[i] += ch[i]!;
  }
  const inv = 1 / nCh;
  for (let i = 0; i < len; i++) out[i] *= inv;
  return out;
}

function sliceMono(mono: Float32Array, sr: number): Float32Array {
  const maxLen = Math.floor(sr * MAX_ANALYZE_SECONDS);
  if (mono.length <= maxLen) return mono;
  return mono.subarray(0, maxLen);
}

function buildNovelty(
  mono: Float32Array,
  sr: number,
): { novelty: Float32Array; hop: number; win: number } {
  const hop = Math.max(128, Math.floor((NOVELTY_HOP_MS / 1000) * sr));
  const win = Math.max(256, Math.floor((NOVELTY_WIN_MS / 1000) * sr));
  const n = Math.floor((mono.length - win) / hop);
  const novelty = new Float32Array(n);
  let prevE = 0;
  for (let i = 0; i < n; i++) {
    const start = i * hop;
    let acc = 0;
    for (let j = 0; j < win; j++) {
      const x = mono[start + j]!;
      acc += x * x;
    }
    const e = Math.sqrt(acc / win);
    novelty[i] = Math.max(0, e - prevE);
    prevE = e;
  }
  return { novelty, hop, win };
}

function autocorrScore(nov: Float32Array, lag: number): number {
  if (lag < 1 || lag >= nov.length) return 0;
  let s = 0;
  for (let i = lag; i < nov.length; i++) s += nov[i]! * nov[i - lag]!;
  return s;
}

function lagBounds(hop: number, sr: number): { minLag: number; maxLag: number } {
  const minLag = Math.max(2, Math.floor((sr * 60) / (MAX_BPM * hop)));
  const maxLag = Math.max(minLag + 1, Math.ceil((sr * 60) / (MIN_BPM * hop)));
  return { minLag, maxLag };
}

function refineQuarterLag(nov: Float32Array, hop: number, sr: number, L: number): number {
  const { minLag, maxLag } = lagBounds(hop, sr);

  let Lq = Math.min(maxLag, Math.max(minLag, Math.round(L)));
  let best = autocorrScore(nov, Lq);
  for (let d = -4; d <= 4; d++) {
    const lag = Lq + d;
    if (lag < minLag || lag > maxLag) continue;
    const sc = autocorrScore(nov, lag);
    if (sc > best) {
      best = sc;
      Lq = lag;
    }
  }

  const baseScore = best;
  if (Lq / 2 >= minLag) {
    const lagHalf = Math.round(Lq / 2);
    const scH = autocorrScore(nov, lagHalf);
    const bpmH = 60 / ((lagHalf * hop) / sr);
    if (bpmH <= MAX_BPM && scH > baseScore * 0.72) Lq = lagHalf;
  }
  if (Lq * 2 <= maxLag) {
    const scD = autocorrScore(nov, Lq * 2);
    const bpmD = 60 / ((Lq * 2 * hop) / sr);
    if (bpmD >= MIN_BPM && scD > baseScore * 0.78) Lq = Lq * 2;
  }
  return Lq;
}

function estimateQuarterLag(nov: Float32Array, hop: number, sr: number): number {
  const { minLag, maxLag } = lagBounds(hop, sr);

  let bestLag = minLag;
  let bestScore = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const s = autocorrScore(nov, lag);
    if (s > bestScore) {
      bestScore = s;
      bestLag = lag;
    }
  }
  return refineQuarterLag(nov, hop, sr, bestLag);
}

function windowRmsZcr(mono: Float32Array, center: number, half: number): { rms: number; zcr: number } {
  const from = Math.max(0, Math.floor(center - half));
  const to = Math.min(mono.length, Math.floor(center + half));
  if (to - from < 4) return { rms: 0, zcr: 0 };
  let acc = 0;
  let crosses = 0;
  let prev = mono[from]!;
  for (let i = from; i < to; i++) {
    const x = mono[i]!;
    acc += x * x;
    if (i > from && prev * x < 0) crosses++;
    prev = x;
  }
  const rms = Math.sqrt(acc / (to - from));
  const zcr = crosses / (to - from);
  return { rms, zcr };
}

function pickBarStart(nov: Float32Array, quarterFrames: number): number {
  const barLen = Math.floor(quarterFrames * 4);
  if (barLen < 8 || nov.length <= barLen) return 0;
  const searchEnd = Math.min(nov.length - barLen, barLen * 16);
  let best = 0;
  let bestSum = -1;
  const step = Math.max(1, Math.floor(quarterFrames / 6));
  for (let start = 0; start <= searchEnd; start += step) {
    let sum = 0;
    for (let i = start; i < start + barLen; i++) sum += nov[i]!;
    if (sum > bestSum) {
      bestSum = sum;
      best = start;
    }
  }
  const q4 = quarterFrames / 4;
  return Math.max(0, Math.min(nov.length - barLen - 1, Math.round(best / q4) * q4));
}

export type AnalyzeSongAudioOptions = {
  /** Display name for the pattern (e.g. file basename). */
  patternName?: string;
  /** Start of analysis window in seconds (requires windowSeconds or use with offset-only + default length). */
  offsetSeconds?: number;
  /** Length of analysis window in seconds; capped at 45, minimum 2 when windowing is used. */
  windowSeconds?: number;
};

/** When offset/window are omitted, uses legacy first-45s slice. */
function sliceMonoForAnalysis(
  monoFull: Float32Array,
  sr: number,
  options?: AnalyzeSongAudioOptions,
): { mono: Float32Array; windowed: boolean } {
  const hasExplicitWindow =
    options != null &&
    (options.offsetSeconds !== undefined || options.windowSeconds !== undefined);

  if (!hasExplicitWindow) {
    return { mono: sliceMono(monoFull, sr), windowed: false };
  }

  const offsetSec = Math.max(0, options.offsetSeconds ?? 0);
  const winSec = Math.min(
    MAX_ANALYZE_SECONDS,
    Math.max(2, options.windowSeconds ?? MAX_ANALYZE_SECONDS),
  );
  const start = Math.min(monoFull.length, Math.floor(offsetSec * sr));
  const end = Math.min(monoFull.length, start + Math.floor(winSec * sr));
  return { mono: monoFull.subarray(start, end), windowed: true };
}

/**
 * Derives a one-bar 16-step pattern and BPM from decoded audio (file or mic).
 * Heuristic onset + band-proxy features — not a full drum transcription.
 */
export function analyzeSongAudio(buffer: AudioBuffer, options?: AnalyzeSongAudioOptions): BeatPattern {
  const sr = buffer.sampleRate;
  const monoFull = monoDownmix(buffer);
  const { mono, windowed } = sliceMonoForAnalysis(monoFull, sr, options);
  const tooShortName = windowed ? "Window too short" : "Audio too short";
  if (mono.length < sr * 0.35) {
    const p = createEmptyPattern(options?.patternName?.trim() || tooShortName);
    p.bpm = 120;
    return p;
  }

  const { novelty: nov, hop, win } = buildNovelty(mono, sr);
  if (nov.length < 64) {
    const p = createEmptyPattern(options?.patternName?.trim() || tooShortName);
    p.bpm = 120;
    return p;
  }

  const quarterFrames = estimateQuarterLag(nov, hop, sr);
  const quarterSec = (quarterFrames * hop) / sr;
  let bpm = Math.round(60 / quarterSec);
  bpm = Math.min(200, Math.max(40, bpm));

  const barStart = pickBarStart(nov, quarterFrames);
  const step16 = quarterFrames / 4;
  const slotSums: number[] = [];
  for (let k = 0; k < STEPS; k++) {
    const i0 = Math.max(0, Math.floor(barStart + k * step16));
    const i1 = Math.min(nov.length, Math.floor(barStart + (k + 1) * step16));
    let sum = 0;
    for (let i = i0; i < i1; i++) sum += nov[i]!;
    slotSums.push(sum);
  }
  const sorted = [...slotSums].sort((a, b) => a - b);
  const med = sorted[Math.floor(STEPS / 2)] ?? 0;
  const thresh = Math.max(med * 1.35, sorted[STEPS - 1]! * 0.18);

  const pattern = createEmptyPattern(
    options?.patternName?.trim() || "From audio",
  );
  pattern.bpm = bpm;

  const halfWin = Math.max(48, Math.floor(sr * 0.006));
  const iBD = voiceIndex("BD");
  const iSD = voiceIndex("SD");
  const iCH = voiceIndex("CH");

  type Hit = { k: number; rms: number; zcr: number };
  const hits: Hit[] = [];

  for (let k = 0; k < STEPS; k++) {
    if (slotSums[k]! < thresh) continue;
    const i0 = Math.max(0, Math.floor(barStart + k * step16));
    const i1 = Math.min(nov.length, Math.floor(barStart + (k + 1) * step16));
    let peakI = i0;
    let peakV = -1;
    for (let i = i0; i < i1; i++) {
      if (nov[i]! > peakV) {
        peakV = nov[i]!;
        peakI = i;
      }
    }
    const centerSample = Math.min(
      mono.length - 1,
      Math.max(0, peakI * hop + Math.floor(win / 2)),
    );
    const { rms, zcr } = windowRmsZcr(mono, centerSample, halfWin);
    hits.push({ k, rms, zcr });
  }

  let maxHitRms = 1e-9;
  for (const h of hits) maxHitRms = Math.max(maxHitRms, h.rms);

  for (const { k, rms, zcr } of hits) {
    const rel = rms / maxHitRms;
    if (rel < 0.18) continue;

    if (zcr < ZCR_LOW && rel > 0.35) {
      pattern.steps[iBD]![k] = true;
    } else if (zcr > ZCR_HIGH) {
      pattern.steps[iCH]![k] = true;
    } else {
      pattern.steps[iSD]![k] = true;
    }
  }

  let any = false;
  for (const row of pattern.steps) {
    for (const cell of row) {
      if (cell) {
        any = true;
        break;
      }
    }
    if (any) break;
  }
  if (!any) {
    const kMax = slotSums.indexOf(Math.max(...slotSums));
    pattern.steps[iBD]![kMax] = true;
  }

  return pattern;
}

export async function decodeAudioFileToBuffer(file: File): Promise<AudioBuffer> {
  const ab = await file.arrayBuffer();
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(ab.slice(0));
  } finally {
    await ctx.close();
  }
}

export async function decodeBlobToBuffer(blob: Blob): Promise<AudioBuffer> {
  const ab = await blob.arrayBuffer();
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(ab.slice(0));
  } finally {
    await ctx.close();
  }
}
