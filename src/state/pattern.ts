import { VOICES } from "../voices";

export const STEPS = 16;
export const ROWS = 12;

export type StepCell = 0 | 1 | 2;
export type StepGrid = StepCell[][];

export type BeatPattern = {
  name: string;
  bpm: number;
  steps: StepGrid;
};

export function createEmptyPattern(name = "Untitled"): BeatPattern {
  return {
    name,
    bpm: 120,
    steps: VOICES.map(() => Array<StepCell>(STEPS).fill(0)),
  };
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

export function clearPattern(): StepGrid {
  return VOICES.map(() => Array<StepCell>(STEPS).fill(0));
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
  return { name: o.name, bpm: o.bpm, steps };
}

export function isValidBeatPattern(data: unknown): data is BeatPattern {
  return normalizeBeatPattern(data) !== null;
}
