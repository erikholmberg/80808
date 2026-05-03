import { isValidBeatPattern, type BeatPattern } from "./pattern";

export type SavedPatternEntry = {
  id: string;
  pattern: BeatPattern;
};

const STORAGE_KEY = "80808-saved-patterns-v1";

function isSavedEntry(x: unknown): x is SavedPatternEntry {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "string" && isValidBeatPattern(o.pattern);
}

export function loadSavedPatterns(): SavedPatternEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(isSavedEntry).map((e) => ({
      id: e.id,
      pattern: {
        ...e.pattern,
        steps: e.pattern.steps.map((row) => [...row]),
      },
    }));
  } catch {
    return [];
  }
}

export function persistSavedPatterns(entries: SavedPatternEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore quota */
  }
}
