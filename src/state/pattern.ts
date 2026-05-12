import { VOICES } from "../voices";

export const STEPS = 16;
export const ROWS = 12;

export type StepCell = 0 | 1 | 2;
export type StepGrid = StepCell[][];

/** Per-step mix level (0–1), multiplied with normal/accent loudness. Same shape as `steps`. */
export type StepGainGrid = number[][];

export type BeatPattern = {
  name: string;
  bpm: number;
  steps: StepGrid;
  stepGain: StepGainGrid;
};

export function createDefaultStepGain(): StepGainGrid {
  return VOICES.map(() => Array<number>(STEPS).fill(1));
}

export function createEmptyPattern(name = "Untitled"): BeatPattern {
  return {
    name,
    bpm: 120,
    steps: VOICES.map(() => Array<StepCell>(STEPS).fill(0)),
    stepGain: createDefaultStepGain(),
  };
}

export function clampStepGain(n: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, n));
}

export function setStepGain(grid: StepGainGrid, row: number, col: number, value: number): StepGainGrid {
  const next = grid.map((r) => [...r]);
  if (next[row]?.[col] !== undefined) {
    next[row]![col] = clampStepGain(value);
  }
  return next;
}

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

export function toggleStep(grid: StepGrid, row: number, col: number): StepGrid {
  const next = grid.map((r) => [...r]);
  if (next[row]?.[col] !== undefined) {
    const current = next[row]![col];
    next[row]![col] = current === 0 ? 1 : current === 1 ? 2 : 0;
  }
  return next;
}

export function setStepValue(grid: StepGrid, row: number, col: number, value: StepCell): StepGrid {
  const next = grid.map((r) => [...r]);
  if (next[row]?.[col] !== undefined) {
    next[row]![col] = value;
  }
  return next;
}

export function clearPattern(): Pick<BeatPattern, "steps" | "stepGain"> {
  return {
    steps: VOICES.map(() => Array<StepCell>(STEPS).fill(0)),
    stepGain: createDefaultStepGain(),
  };
}

function coerceGainCell(cell: unknown): number | null {
  if (typeof cell !== "number" || !Number.isFinite(cell)) return null;
  return clampStepGain(cell);
}

export function normalizeBeatPattern(data: unknown): BeatPattern | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (typeof o.name !== "string" || typeof o.bpm !== "number") return null;
  if (!Array.isArray(o.steps) || o.steps.length !== ROWS) return null;
  const steps: StepGrid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = o.steps[r];
    if (!Array.isArray(row) || row.length !== STEPS) return null;
    const rowOut: StepCell[] = [];
    for (let c = 0; c < STEPS; c++) {
      const cell = coerceStepCell(row[c]);
      if (cell === null) return null;
      rowOut.push(cell);
    }
    steps.push(rowOut);
  }
  if (o.bpm < 40 || o.bpm > 200) return null;

  let stepGain: StepGainGrid = createDefaultStepGain();
  if (o.stepGain !== undefined) {
    if (!Array.isArray(o.stepGain) || o.stepGain.length !== ROWS) return null;
    const sg: StepGainGrid = [];
    for (let r = 0; r < ROWS; r++) {
      const row = o.stepGain[r];
      if (!Array.isArray(row) || row.length !== STEPS) return null;
      const rowOut: number[] = [];
      for (let c = 0; c < STEPS; c++) {
        const g = coerceGainCell(row[c]);
        if (g === null) return null;
        rowOut.push(g);
      }
      sg.push(rowOut);
    }
    stepGain = sg;
  }

  return { name: o.name, bpm: o.bpm, steps, stepGain };
}

export function isValidBeatPattern(data: unknown): data is BeatPattern {
  return normalizeBeatPattern(data) !== null;
}

export function cloneBeatPattern(p: BeatPattern): BeatPattern {
  return {
    name: p.name,
    bpm: p.bpm,
    steps: p.steps.map((row) => [...row]),
    stepGain: p.stepGain.map((row) => [...row]),
  };
}

export function beatPatternsEqual(a: BeatPattern, b: BeatPattern): boolean {
  if (a.name !== b.name || a.bpm !== b.bpm) return false;
  for (let r = 0; r < ROWS; r++) {
    const ar = a.steps[r];
    const br = b.steps[r];
    const agr = a.stepGain[r];
    const bgr = b.stepGain[r];
    if (!ar || !br || !agr || !bgr) return false;
    for (let c = 0; c < STEPS; c++) {
      if (ar[c] !== br[c]) return false;
      if (agr[c] !== bgr[c]) return false;
    }
  }
  return true;
}
