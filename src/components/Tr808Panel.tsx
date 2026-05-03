"use client";

import type { VoiceId } from "@/voices";
import { VOICES } from "@/voices";
import styles from "./Tr808Panel.module.css";

export type Tr808PanelProps = {
  pressed: Partial<Record<VoiceId, boolean>>;
  onPadDown: (voice: VoiceId) => void;
  onPadUp: (voice: VoiceId) => void;
  playing: boolean;
  onPlay: () => void;
  onStop: () => void;
  playhead: number | null;
  patternName?: string;
  bpm: number;
};

export function Tr808Panel({
  pressed,
  onPadDown,
  onPadUp,
  playing,
  onPlay,
  onStop,
  playhead,
  patternName = "Untitled",
  bpm,
}: Tr808PanelProps) {
  return (
    <section className={styles.panel} aria-label="Drum machine">
      <div className={styles.topBar}>
        <div className={styles.lcd}>
          <span className={styles.lcdLine}>{patternName}</span>
          <span className={styles.lcdSub}>{bpm} BPM</span>
        </div>
        <button
          type="button"
          className={styles.transport}
          onClick={() => (playing ? onStop() : onPlay())}
        >
          {playing ? "Stop" : "Play"}
        </button>
      </div>

      <div className={styles.steps} role="group" aria-label="Beat steps (playing indicator)">
        {Array.from({ length: 16 }, (_, i) => {
          const band = Math.min(3, Math.floor(i / 4));
          const lit = playhead !== null && playhead === i;
          return (
            <div
              key={i}
              className={`${styles.stepCell} ${styles[`band${band}`]} ${lit ? styles.stepLit : ""}`}
              aria-current={lit ? "step" : undefined}
            >
              <span className={styles.stepNum}>{i + 1}</span>
            </div>
          );
        })}
      </div>

      <p className={styles.padHint}>Pads — click or keys 1–6 and Q–Y</p>
      <div className={styles.pads}>
        {VOICES.map((v) => (
          <button
            key={v}
            type="button"
            className={`${styles.pad} ${pressed[v] ? styles.padDown : ""}`}
            aria-pressed={Boolean(pressed[v])}
            aria-label={`${v} pad`}
            onPointerDown={(e) => {
              e.preventDefault();
              (e.target as HTMLButtonElement).setPointerCapture(e.pointerId);
              onPadDown(v);
            }}
            onPointerUp={(e) => {
              try {
                (e.target as HTMLButtonElement).releasePointerCapture(e.pointerId);
              } catch {
                /* noop */
              }
              onPadUp(v);
            }}
            onPointerCancel={(e) => {
              try {
                (e.target as HTMLButtonElement).releasePointerCapture(e.pointerId);
              } catch {
                /* noop */
              }
              onPadUp(v);
            }}
            onLostPointerCapture={() => onPadUp(v)}
          >
            {v}
          </button>
        ))}
      </div>
    </section>
  );
}
