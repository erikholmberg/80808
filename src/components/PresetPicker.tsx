"use client";

import { useMemo, useState } from "react";
import type { BeatPattern } from "@/state/pattern";
import { isValidBeatPattern } from "@/state/pattern";
import { generateStarterPatterns } from "@/lib/generateStarterPatterns";
import styles from "./PresetPicker.module.css";

const INITIAL_VISIBLE = 25;
const LOAD_MORE = 5;
const MAX_STARTERS = 100;

type Props = {
  presets: BeatPattern[];
  onSelect: (p: BeatPattern) => void;
};

export function PresetPicker({ presets, onSelect }: Props) {
  const [generated, setGenerated] = useState<BeatPattern[]>([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreNote, setMoreNote] = useState<string | null>(null);

  const allPresets = useMemo(() => [...presets, ...generated], [presets, generated]);

  const effectiveCount = Math.min(visibleCount, allPresets.length);
  const visible = allPresets.slice(0, effectiveCount);

  const canShowMore =
    effectiveCount < MAX_STARTERS &&
    (effectiveCount < allPresets.length || allPresets.length < MAX_STARTERS);

  const remainingSlots = MAX_STARTERS - effectiveCount;
  const nextBatchSize = Math.min(LOAD_MORE, remainingSlots);

  const handleMore = async () => {
    const totalBefore = presets.length + generated.length;
    const nextVisibleTarget = Math.min(visibleCount + LOAD_MORE, MAX_STARTERS);
    const n = Math.min(LOAD_MORE, MAX_STARTERS - totalBefore);
    if (n <= 0) return;

    setMoreLoading(true);
    setMoreNote(null);

    let additions: BeatPattern[] = [];

    try {
      const res = await fetch("/api/starter-patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: n }),
      });
      const data: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          typeof data === "object" &&
          data !== null &&
          typeof (data as { error?: string }).error === "string"
            ? (data as { error: string }).error
            : `Request failed (${res.status})`;
        throw new Error(msg);
      }

      const list = (data as { patterns?: unknown }).patterns;
      if (!Array.isArray(list)) {
        throw new Error("Invalid response shape.");
      }

      for (const item of list) {
        if (additions.length >= n) break;
        if (!isValidBeatPattern(item)) continue;
        additions.push({
          ...item,
          steps: item.steps.map((row) => [...row]),
        });
      }

      if (additions.length < n) {
        const pad = n - additions.length;
        const serialStart = totalBefore + additions.length + 1;
        additions = [...additions, ...generateStarterPatterns(pad, serialStart)];
        setMoreNote(
          "Filled remaining slots with offline patterns (AI returned fewer valid patterns than requested).",
        );
      }
    } catch {
      additions = generateStarterPatterns(n, totalBefore + 1);
      setMoreNote(
        "Showing offline-generated patterns (configure AI_GATEWAY_API_KEY for AI starters).",
      );
    } finally {
      setMoreLoading(false);
    }

    const totalAfter = totalBefore + additions.length;
    setGenerated((prev) => [...prev, ...additions]);
    setVisibleCount(Math.min(nextVisibleTarget, totalAfter));
  };

  return (
    <section className={styles.wrap} aria-label="Starter patterns">
      <h2 className={styles.heading}>Starter patterns</h2>
      <ul className={styles.list}>
        {visible.map((p, idx) => (
          <li key={`starter-${idx}-${p.name}`}>
            <button
              type="button"
              className={styles.presetBtn}
              onClick={() => onSelect({ ...p, steps: p.steps.map((r) => [...r]) })}
            >
              <span className={styles.name}>{p.name}</span>
              <span className={styles.bpm}>{p.bpm} BPM</span>
            </button>
          </li>
        ))}
      </ul>
      {canShowMore ? (
        <div className={styles.moreColumn}>
          <div className={styles.moreRow}>
            <button
              type="button"
              className={styles.moreBtn}
              onClick={() => void handleMore()}
              disabled={moreLoading}
              aria-busy={moreLoading}
            >
              {moreLoading ? (
                <>
                  <span className={styles.moreSpinner} aria-hidden />
                  Generating…
                </>
              ) : (
                <>
                  More
                  <span className={styles.moreHint} aria-hidden>
                    {" "}
                    (up to {nextBatchSize} more · max {MAX_STARTERS})
                  </span>
                </>
              )}
            </button>
          </div>
          {moreNote ? (
            <p className={styles.moreNote} role="status">
              {moreNote}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
