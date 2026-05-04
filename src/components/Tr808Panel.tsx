"use client";

import { useRef } from "react";
import type { VoiceId } from "@/voices";
import { VOICES } from "@/voices";
import { KeyboardMapLegend } from "@/components/KeyboardMapLegend";
import styles from "./Tr808Panel.module.css";

export type Tr808PanelProps = {
  pressed: Partial<Record<VoiceId, boolean>>;
  onPadDown: (voice: VoiceId) => void;
  onPadUp: (voice: VoiceId) => void;
  playing: boolean;
  onPlay: () => void;
  onStop: () => void;
  playhead: number | null;
  name: string;
  onNameChange: (name: string) => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  onClear: () => void;
  onSaveFile: () => void;
  onImportClick: () => void;
};

export function Tr808Panel({
  pressed,
  onPadDown,
  onPadUp,
  playing,
  onPlay,
  onStop,
  playhead,
  name,
  onNameChange,
  bpm,
  onBpmChange,
  onClear,
  onSaveFile,
  onImportClick,
}: Tr808PanelProps) {
  const playFromPointer = useRef(false);

  const togglePlay = () => {
    if (playing) onStop();
    else onPlay();
  };

  return (
    <section className={styles.panel} aria-label="Drum machine">
      <div className={styles.transportWrap} role="group" aria-label="Transport">
        <div className={styles.transportBar}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Pattern name</span>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              maxLength={64}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>BPM</span>
            <input
              className={styles.inputNarrow}
              type="number"
              min={40}
              max={200}
              value={bpm}
              onChange={(e) => onBpmChange(Number(e.target.value))}
            />
          </label>
          <div className={styles.transportButtons}>
            <button
              type="button"
              className={styles.btnPrimary}
              onPointerDown={(e) => {
                if (e.pointerType === "mouse" && e.buttons !== 1) return;
                playFromPointer.current = true;
                togglePlay();
              }}
              onClick={() => {
                if (playFromPointer.current) {
                  playFromPointer.current = false;
                  return;
                }
                togglePlay();
              }}
            >
              {playing ? "Stop" : "Play"}
            </button>
            <button type="button" className={styles.btn} onClick={onClear}>
              Clear
            </button>
            <button type="button" className={styles.btn} onClick={onSaveFile}>
              Save
            </button>
            <button type="button" className={styles.btn} onClick={onImportClick}>
              Load
            </button>
          </div>
        </div>
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

      <p className={styles.padHint}>Drum pads — touch or click (keyboard: 1–6 and Q–Y)</p>
      <div className={styles.pads}>
        {VOICES.map((v) => (
          <button
            key={v}
            type="button"
            className={`${styles.pad} ${pressed[v] ? styles.padDown : ""}`}
            aria-pressed={Boolean(pressed[v])}
            aria-label={`${v} pad`}
            onPointerDown={() => {
              onPadDown(v);
            }}
            onPointerUp={() => {
              onPadUp(v);
            }}
            onPointerCancel={() => {
              onPadUp(v);
            }}
          >
            {v}
          </button>
        ))}
      </div>

      <KeyboardMapLegend pressed={pressed} nested />
    </section>
  );
}
