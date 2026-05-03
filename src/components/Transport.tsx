"use client";

import { useRef } from "react";
import styles from "./Transport.module.css";

type Props = {
  name: string;
  onNameChange: (name: string) => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  playing: boolean;
  onPlay: () => void;
  onStop: () => void;
  onClear: () => void;
  onSaveFile: () => void;
  onImportClick: () => void;
};

export function Transport({
  name,
  onNameChange,
  bpm,
  onBpmChange,
  playing,
  onPlay,
  onStop,
  onClear,
  onSaveFile,
  onImportClick,
}: Props) {
  const playFromPointer = useRef(false);

  const togglePlay = () => {
    if (playing) onStop();
    else onPlay();
  };

  return (
    <section className={styles.bar} aria-label="Transport">
      <label className={styles.field}>
        <span className={styles.label}>Pattern name</span>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          maxLength={64}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>BPM</span>
        <input
          className={styles.inputNarrow}
          type="number"
          min={40}
          max={200}
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
        />
      </label>
      <div className={styles.buttons}>
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
          Clear pattern
        </button>
        <button type="button" className={styles.btn} onClick={onSaveFile}>
          Save JSON
        </button>
        <button type="button" className={styles.btn} onClick={onImportClick}>
          Load JSON
        </button>
      </div>
    </section>
  );
}
