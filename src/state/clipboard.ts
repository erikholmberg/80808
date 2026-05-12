import {
  ROWS,
  STEPS,
  clampStepGain,
  type BeatPattern,
  type StepCell,
  type StepGainGrid,
  type StepGrid,
} from "./pattern";

export const CLIP_VERSION = 1 as const;

export type RowClip = {
  "80808Clip": "row";
  v: number;
  steps: StepCell[];
  gain: number[];
};

export type BarClip = {
  "80808Clip": "bar";
  v: number;
  steps: StepGrid;
  gain: StepGainGrid;
};

/** One vertical slice: all voices at a single step index (0..STEPS-1). */
export type ColumnClip = {
  "80808Clip": "column";
  v: number;
  steps: StepCell[];
  gain: number[];
};

export type SequencerClip = RowClip | BarClip | ColumnClip;

function coerceStepCell(cell: unknown): StepCell | null {
  if (cell === true) return 1;
  if (cell === false || cell == null) return 0;
  if (typeof cell === "number") {
    if (!Number.isFinite(cell)) return null;
    const rounded = Math.round(cell);
    if (rounded < 0 || rounded > 2) return null;
    return rounded as StepCell;
  }
  return null;
}

export function buildRowClip(pattern: BeatPattern, row: number): RowClip | null {
  if (row < 0 || row >= ROWS) return null;
  const steps = pattern.steps[row];
  const gain = pattern.stepGain[row];
  if (!steps || !gain || steps.length !== STEPS || gain.length !== STEPS) return null;
  return {
    "80808Clip": "row",
    v: CLIP_VERSION,
    steps: [...steps],
    gain: gain.map((g) => clampStepGain(g)),
  };
}

export function buildBarClip(pattern: BeatPattern): BarClip {
  return {
    "80808Clip": "bar",
    v: CLIP_VERSION,
    steps: pattern.steps.map((r) => [...r]),
    gain: pattern.stepGain.map((r) => [...r]),
  };
}

export function buildColumnClip(pattern: BeatPattern, col: number): ColumnClip | null {
  if (col < 0 || col >= STEPS) return null;
  const steps: StepCell[] = [];
  const gain: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    const sc = pattern.steps[r]?.[col];
    const g = pattern.stepGain[r]?.[col];
    if (sc === undefined || g === undefined) return null;
    steps.push(sc);
    gain.push(clampStepGain(g));
  }
  return {
    "80808Clip": "column",
    v: CLIP_VERSION,
    steps,
    gain,
  };
}

export function serializeClip(clip: SequencerClip): string {
  return JSON.stringify(clip);
}

function parseRowClip(o: Record<string, unknown>): RowClip | null {
  if (o["80808Clip"] !== "row" || o.v !== CLIP_VERSION) return null;
  if (!Array.isArray(o.steps) || !Array.isArray(o.gain)) return null;
  if (o.steps.length !== STEPS || o.gain.length !== STEPS) return null;
  const steps: StepCell[] = [];
  const gain: number[] = [];
  for (let c = 0; c < STEPS; c++) {
    const sc = coerceStepCell(o.steps[c]);
    if (sc === null) return null;
    steps.push(sc);
    const g = o.gain[c];
    if (typeof g !== "number" || !Number.isFinite(g)) return null;
    gain.push(clampStepGain(g));
  }
  return { "80808Clip": "row", v: CLIP_VERSION, steps, gain };
}

function parseBarClip(o: Record<string, unknown>): BarClip | null {
  if (o["80808Clip"] !== "bar" || o.v !== CLIP_VERSION) return null;
  if (!Array.isArray(o.steps) || !Array.isArray(o.gain)) return null;
  if (o.steps.length !== ROWS || o.gain.length !== ROWS) return null;
  const steps: StepGrid = [];
  const gain: StepGainGrid = [];
  for (let r = 0; r < ROWS; r++) {
    const sr = o.steps[r];
    const gr = o.gain[r];
    if (!Array.isArray(sr) || !Array.isArray(gr)) return null;
    if (sr.length !== STEPS || gr.length !== STEPS) return null;
    const rowSteps: StepCell[] = [];
    const rowGain: number[] = [];
    for (let c = 0; c < STEPS; c++) {
      const sc = coerceStepCell(sr[c]);
      if (sc === null) return null;
      rowSteps.push(sc);
      const g = gr[c];
      if (typeof g !== "number" || !Number.isFinite(g)) return null;
      rowGain.push(clampStepGain(g));
    }
    steps.push(rowSteps);
    gain.push(rowGain);
  }
  return { "80808Clip": "bar", v: CLIP_VERSION, steps, gain };
}

function parseColumnClip(o: Record<string, unknown>): ColumnClip | null {
  if (o["80808Clip"] !== "column" || o.v !== CLIP_VERSION) return null;
  if (!Array.isArray(o.steps) || !Array.isArray(o.gain)) return null;
  if (o.steps.length !== ROWS || o.gain.length !== ROWS) return null;
  const steps: StepCell[] = [];
  const gain: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    const sc = coerceStepCell(o.steps[r]);
    if (sc === null) return null;
    steps.push(sc);
    const g = o.gain[r];
    if (typeof g !== "number" || !Number.isFinite(g)) return null;
    gain.push(clampStepGain(g));
  }
  return { "80808Clip": "column", v: CLIP_VERSION, steps, gain };
}

export function parseClipJson(text: string): SequencerClip | null {
  try {
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    const kind = o["80808Clip"];
    if (kind === "row") return parseRowClip(o);
    if (kind === "bar") return parseBarClip(o);
    if (kind === "column") return parseColumnClip(o);
    return null;
  } catch {
    return null;
  }
}

export function applyRowClip(
  pattern: BeatPattern,
  targetRow: number,
  clip: RowClip,
): BeatPattern | null {
  if (targetRow < 0 || targetRow >= ROWS) return null;
  if (clip.steps.length !== STEPS || clip.gain.length !== STEPS) return null;
  const steps = pattern.steps.map((r) => [...r]);
  const stepGain = pattern.stepGain.map((r) => [...r]);
  for (let c = 0; c < STEPS; c++) {
    const sc = coerceStepCell(clip.steps[c]);
    if (sc === null) return null;
    steps[targetRow]![c] = sc;
    stepGain[targetRow]![c] = clampStepGain(clip.gain[c]!);
  }
  return { ...pattern, steps, stepGain };
}

export function applyBarClip(pattern: BeatPattern, clip: BarClip): BeatPattern | null {
  if (clip.steps.length !== ROWS || clip.gain.length !== ROWS) return null;
  for (let r = 0; r < ROWS; r++) {
    if (clip.steps[r]!.length !== STEPS || clip.gain[r]!.length !== STEPS) return null;
  }
  return {
    ...pattern,
    steps: clip.steps.map((r) => [...r]),
    stepGain: clip.gain.map((r) => [...r]),
  };
}

export function applyColumnClip(
  pattern: BeatPattern,
  targetCol: number,
  clip: ColumnClip,
): BeatPattern | null {
  if (targetCol < 0 || targetCol >= STEPS) return null;
  if (clip.steps.length !== ROWS || clip.gain.length !== ROWS) return null;
  const steps = pattern.steps.map((r) => [...r]);
  const stepGain = pattern.stepGain.map((r) => [...r]);
  for (let r = 0; r < ROWS; r++) {
    const sc = coerceStepCell(clip.steps[r]);
    if (sc === null) return null;
    steps[r]![targetCol] = sc;
    stepGain[r]![targetCol] = clampStepGain(clip.gain[r]!);
  }
  return { ...pattern, steps, stepGain };
}
