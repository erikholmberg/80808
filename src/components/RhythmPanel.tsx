"use client";

import { useRef } from "react";
import type { BeatPattern } from "@/state/pattern";
import type { SavedPatternEntry } from "@/state/savedPatterns";
import type { VoiceId } from "@/voices";
import { KeyboardMapLegend } from "@/components/KeyboardMapLegend";
import { StarterPresetsPopover } from "@/components/StarterPresetsPopover";
import styles from "./RhythmPanel.module.css";

export type RhythmPanelProps = {
  pressed: Partial<Record<VoiceId, boolean>>;
  onPadDown: (voice: VoiceId) => void;
  onPadUp: (voice: VoiceId) => void;
  playing: boolean;
  recording: boolean;
  onPlay: () => void;
  onStop: () => void;
  onRecordToggle: () => void;
  playhead: number | null;
  name: string;
  onNameChange: (name: string) => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  onClear: () => void;
  onSave: () => void;
  presets: BeatPattern[];
  savedEntries: SavedPatternEntry[];
  onPresetSelect: (p: BeatPattern) => void;
  saveAck?: boolean;
};

export function RhythmPanel({
  pressed,
  onPadDown,
  onPadUp,
  playing,
  recording,
  onPlay,
  onStop,
  onRecordToggle,
  playhead,
  name,
  onNameChange,
  bpm,
  onBpmChange,
  onClear,
  onSave,
  presets,
  savedEntries,
  onPresetSelect,
  saveAck = false,
}: RhythmPanelProps) {
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
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Saved Patterns</span>
            <StarterPresetsPopover
              presets={presets}
              savedEntries={savedEntries}
              onSelect={onPresetSelect}
            />
          </div>
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
            <button
              type="button"
              className={`${styles.btn} ${recording ? styles.btnRecordActive : ""}`}
              aria-pressed={recording}
              onClick={onRecordToggle}
            >
              Record
            </button>
            <button type="button" className={styles.btn} onClick={onClear}>
              Clear
            </button>
            <button type="button" className={styles.btn} onClick={onSave}>
              Save
            </button>
            {saveAck ? (
              <span className={styles.saveAck} aria-live="polite" role="status">
                Saved
              </span>
            ) : null}
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

      <KeyboardMapLegend
        pressed={pressed}
        nested
        onPadDown={onPadDown}
        onPadUp={onPadUp}
      />
    </section>
  );
}
