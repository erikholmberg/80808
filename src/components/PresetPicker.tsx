import type { BeatPattern } from "@/state/pattern";
import styles from "./PresetPicker.module.css";

type Props = {
  presets: BeatPattern[];
  onSelect: (p: BeatPattern) => void;
};

export function PresetPicker({ presets, onSelect }: Props) {
  return (
    <section className={styles.wrap} aria-label="Starter patterns">
      <h2 className={styles.heading}>Starter patterns</h2>
      <ul className={styles.list}>
        {presets.map((p) => (
          <li key={p.name}>
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
    </section>
  );
}
