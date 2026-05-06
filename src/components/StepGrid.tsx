import type { VoiceId } from "@/voices";
import { VOICES } from "@/voices";
import type { StepGrid } from "@/state/pattern";
import styles from "./StepGrid.module.css";

type Props = {
  steps: StepGrid;
  playhead: number | null;
  onToggle: (row: number, col: number) => void;
  /** Tighter cell sizing for side-by-side layouts */
  compact?: boolean;
  /** Stretch vertically to fill the column (pair with compact beside keyboard card) */
  fillHeight?: boolean;
};

export function StepGrid({ steps, playhead, onToggle, compact, fillHeight }: Props) {
  const fill = Boolean(compact && fillHeight);
  return (
    <div
      className={`${styles.wrap} ${compact ? styles.wrapCompact : ""} ${fill ? styles.wrapCompactFill : ""}`}
    >
      {compact ? (
        <>
          <p className={styles.cardTitle}>Step sequencer</p>
          <p className={styles.legend}>Click step: Off {"->"} Normal {"->"} Accent</p>
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
          {steps[row]?.map((on, col) => (
            <button
              key={col}
              type="button"
              className={`${styles.cell} ${on > 0 ? styles.cellOn : ""} ${on > 1 ? styles.cellAccent : ""} ${playhead === col ? styles.cellPlay : ""}`}
              aria-pressed={on > 0}
              aria-label={`${voice} step ${col + 1} ${on === 0 ? "off" : on === 1 ? "normal" : "accent"}`}
              onClick={() => onToggle(row, col)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
