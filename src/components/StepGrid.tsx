"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { VoiceId } from "@/voices";
import { VOICES } from "@/voices";
import type { StepGainGrid, StepGrid as StepGridType } from "@/state/pattern";
import styles from "./StepGrid.module.css";

const HOLD_MS = 420;
const MOVE_THRESHOLD_PX = 12;

type Props = {
  steps: StepGridType;
  stepGain: StepGainGrid;
  playhead: number | null;
  onToggle: (row: number, col: number) => void;
  onStepGainChange: (row: number, col: number, gain: number) => void;
  compact?: boolean;
  fillHeight?: boolean;
};

type PopoverPos = {
  row: number;
  col: number;
  anchorLeft: number;
  anchorTop: number;
};

export function StepGrid({
  steps,
  stepGain,
  playhead,
  onToggle,
  onStepGainChange,
  compact,
  fillHeight,
}: Props) {
  const fill = Boolean(compact && fillHeight);
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const holdTimerRef = useRef(0);
  const pointerDownRef = useRef<{
    row: number;
    col: number;
    x: number;
    y: number;
    hadHoldEligible: boolean;
  } | null>(null);
  const movedRef = useRef(false);
  const skipTapRef = useRef(false);

  const [gainPopover, setGainPopover] = useState<PopoverPos | null>(null);
  const popoverPanelRef = useRef<HTMLDivElement | null>(null);

  const clearHoldTimer = () => {
    window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = 0;
  };

  useEffect(() => () => clearHoldTimer(), []);

  useEffect(() => {
    if (!gainPopover) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGainPopover(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [gainPopover]);

  useEffect(() => {
    if (!gainPopover) return;
    const onPointerDown = (e: PointerEvent) => {
      const panel = popoverPanelRef.current;
      if (panel?.contains(e.target as Node)) return;
      setGainPopover(null);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [gainPopover]);

  useLayoutEffect(() => {
    if (!gainPopover || !popoverPanelRef.current) return;
    const el = popoverPanelRef.current;
    const pad = 8;
    const rect = el.getBoundingClientRect();
    let left = gainPopover.anchorLeft - rect.width / 2;
    let top = gainPopover.anchorTop - rect.height - pad;
    if (left < pad) left = pad;
    if (left + rect.width > window.innerWidth - pad) {
      left = window.innerWidth - pad - rect.width;
    }
    if (top < pad) {
      top = gainPopover.anchorTop + pad;
    }
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [gainPopover]);

  const handlePointerDown = (
    e: React.PointerEvent,
    row: number,
    col: number,
    on: number,
  ) => {
    movedRef.current = false;
    skipTapRef.current = false;
    pointerDownRef.current = {
      row,
      col,
      x: e.clientX,
      y: e.clientY,
      hadHoldEligible: on > 0,
    };
    if (on > 0) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = 0;
        const meta = pointerDownRef.current;
        if (!meta || meta.row !== row || meta.col !== col || movedRef.current) return;
        const key = `${row}-${col}`;
        const btn = cellRefs.current[key];
        if (!btn) return;
        const r = btn.getBoundingClientRect();
        skipTapRef.current = true;
        setGainPopover({
          row,
          col,
          anchorLeft: r.left + r.width / 2,
          anchorTop: r.top,
        });
      }, HOLD_MS);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const meta = pointerDownRef.current;
    if (!meta) return;
    const dx = e.clientX - meta.x;
    const dy = e.clientY - meta.y;
    if (dx * dx + dy * dy > MOVE_THRESHOLD_PX * MOVE_THRESHOLD_PX) {
      movedRef.current = true;
      clearHoldTimer();
    }
  };

  const finishPointer = (row: number, col: number) => {
    clearHoldTimer();
    pointerDownRef.current = null;
    if (skipTapRef.current) {
      skipTapRef.current = false;
      return;
    }
    if (movedRef.current) return;
    onToggle(row, col);
  };

  return (
    <div
      className={`${styles.wrap} ${compact ? styles.wrapCompact : ""} ${fill ? styles.wrapCompactFill : ""}`}
    >
      {compact ? (
        <>
          <p className={styles.cardTitle}>Step sequencer</p>
          <p className={styles.legend}>
            Tap: Off {"->"} Normal {"->"} Accent. Hold an on-step for level (mix).
          </p>
        </>
      ) : null}
      <div className={styles.headerRow}>
        <div className={styles.corner} />
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={i}
            className={`${styles.stepHead} ${playhead === i ? styles.stepHeadActive : ""}`}
          >
            {i + 1}
          </div>
        ))}
      </div>
      {VOICES.map((voice: VoiceId, row) => (
        <div key={voice} className={styles.row}>
          <div className={styles.voice}>{voice}</div>
          {steps[row]?.map((on, col) => {
            const gain = stepGain[row]?.[col] ?? 1;
            const gainAdjusted = on > 0 && Math.abs(gain - 1) > 0.02;
            const key = `${row}-${col}`;
            return (
              <button
                key={col}
                type="button"
                ref={(el) => {
                  cellRefs.current[key] = el;
                }}
                data-step-cell={key}
                className={`${styles.cell} ${on > 0 ? styles.cellOn : ""} ${on > 1 ? styles.cellAccent : ""} ${gainAdjusted ? styles.cellGainAdjusted : ""} ${playhead === col ? styles.cellPlay : ""}`}
                aria-pressed={on > 0}
                aria-label={`${voice} step ${col + 1} ${on === 0 ? "off" : on === 1 ? "normal" : "accent"}${gainAdjusted ? ` level ${Math.round(gain * 100)}%` : ""}`}
                onPointerDown={(e) => handlePointerDown(e, row, col, on)}
                onPointerMove={handlePointerMove}
                onPointerUp={() => finishPointer(row, col)}
                onPointerCancel={() => finishPointer(row, col)}
              >
                {gainAdjusted ? (
                  <span className={styles.cellGainLabel} aria-hidden="true">
                    {Math.round(gain * 100)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}

      {gainPopover ? (
        <div
          ref={popoverPanelRef}
          className={styles.gainPopover}
          role="dialog"
          aria-label="Step level"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <label className={styles.gainLabel} htmlFor={`step-gain-${gainPopover.row}-${gainPopover.col}`}>
            Level
          </label>
          <input
            id={`step-gain-${gainPopover.row}-${gainPopover.col}`}
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round((stepGain[gainPopover.row]?.[gainPopover.col] ?? 1) * 100)}
            className={styles.gainRange}
            onChange={(e) =>
              onStepGainChange(
                gainPopover.row,
                gainPopover.col,
                Number(e.target.value) / 100,
              )
            }
          />
          <span className={styles.gainValue} aria-live="polite">
            {Math.round((stepGain[gainPopover.row]?.[gainPopover.col] ?? 1) * 100)}%
          </span>
        </div>
      ) : null}
    </div>
  );
}
