import type { VoiceId } from "@/voices";
import { VOICES } from "@/voices";
import type { StepGrid } from "@/state/pattern";
import styles from "./StepGrid.module.css";

type Props = {
  steps: StepGrid;
  playhead: number | null;
  onToggle: (row: number, col: number) => void;
};

export function StepGrid({ steps, playhead, onToggle }: Props) {
  return (
    <div className={styles.wrap}>
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
          {steps[row]?.map((on, col) => (
            <button
              key={col}
              type="button"
              className={`${styles.cell} ${on ? styles.cellOn : ""} ${playhead === col ? styles.cellPlay : ""}`}
              aria-pressed={on}
              aria-label={`${voice} step ${col + 1}`}
              onClick={() => onToggle(row, col)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
