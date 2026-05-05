import { VOICES } from "../voices";

export const STEPS = 16;
export const ROWS = 12;

export type StepGrid = boolean[][];

export type BeatPattern = {
  name: string;
  bpm: number;
  steps: StepGrid;
};

export function createEmptyPattern(name = "Untitled"): BeatPattern {
  return {
    name,
    bpm: 120,
    steps: VOICES.map(() => Array<boolean>(STEPS).fill(false)),
  };
}

export function toggleStep(grid: StepGrid, row: number, col: number): StepGrid {
  const next = grid.map((r) => [...r]);
  if (next[row]?.[col] !== undefined) {
    next[row]![col] = !next[row]![col];
  }
  return next;
}

export function setStepValue(grid: StepGrid, row: number, col: number, value: boolean): StepGrid {
  const next = grid.map((r) => [...r]);
  if (next[row]?.[col] !== undefined) {
    next[row]![col] = value;
  }
  return next;
}

export function clearPattern(): StepGrid {
  return VOICES.map(() => Array<boolean>(STEPS).fill(false));
}

export function isValidBeatPattern(data: unknown): data is BeatPattern {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (typeof o.name !== "string" || typeof o.bpm !== "number") return false;
  if (!Array.isArray(o.steps) || o.steps.length !== ROWS) return false;
  for (let r = 0; r < ROWS; r++) {
    const row = o.steps[r];
    if (!Array.isArray(row) || row.length !== STEPS) return false;
    for (let c = 0; c < STEPS; c++) {
      if (typeof row[c] !== "boolean") return false;
    }
  }
  return o.bpm >= 40 && o.bpm <= 200;
}
