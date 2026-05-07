"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { BeatPattern } from "@/state/pattern";
import { normalizeBeatPattern } from "@/state/pattern";
import { generateStarterPatterns } from "@/lib/generateStarterPatterns";
import type { SavedPatternEntry } from "@/state/savedPatterns";
import styles from "./StarterPresetsPopover.module.css";

const INITIAL_VISIBLE = 25;
const LOAD_MORE = 5;
const MAX_STARTERS = 100;

type Props = {
  presets: BeatPattern[];
  savedEntries: SavedPatternEntry[];
  onSelect: (p: BeatPattern) => void;
};

export function StarterPresetsPopover({ presets, savedEntries, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [generated, setGenerated] = useState<BeatPattern[]>([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreNote, setMoreNote] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const headingId = useId();

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }, []);

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
        const normalized = normalizeBeatPattern(item);
        if (!normalized) continue;
        additions.push({
          ...normalized,
          steps: normalized.steps.map((row) => [...row]),
          stepGain: normalized.stepGain.map((row) => [...row]),
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

  const pick = useCallback(
    (p: BeatPattern) => {
      onSelect({
        ...p,
        steps: p.steps.map((r) => [...r]),
        stepGain: p.stepGain.map((r) => [...r]),
      });
      close();
    },
    [onSelect, close],
  );

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root || root.contains(e.target as Node)) return;
      close();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        Load…
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={headingId}
          className={styles.panel}
        >
          <div className={styles.panelHeader}>
            <h2 id={headingId} className={styles.panelTitle}>
              Saved patterns
            </h2>
          </div>
          <div className={styles.panelScroll}>
            <h3 className={styles.sectionTitle}>Custom</h3>
            {savedEntries.length === 0 ? (
              <p className={styles.empty}>No saved patterns yet.</p>
            ) : (
              <ul className={styles.list}>
                {savedEntries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={styles.presetBtn}
                      onClick={() => pick(entry.pattern)}
                    >
                      <span className={styles.name}>{entry.pattern.name}</span>
                      <span className={styles.bpm}>{entry.pattern.bpm} BPM</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <h3 className={styles.sectionTitle}>Preset</h3>
            <ul className={styles.list}>
              {visible.map((p, idx) => (
                <li key={`starter-${idx}-${p.name}`}>
                  <button
                    type="button"
                    className={styles.presetBtn}
                    onClick={() => pick(p)}
                  >
                    <span className={styles.name}>{p.name}</span>
                    <span className={styles.bpm}>{p.bpm} BPM</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {canShowMore ? (
            <div className={styles.panelFooter}>
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
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
