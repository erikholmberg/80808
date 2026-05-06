import styles from "./BeatStepIndicatorRow.module.css";

type Props = {
  playhead: number | null;
  density?: "default" | "compact";
};

export function BeatStepIndicatorRow({ playhead, density = "default" }: Props) {
  const compact = density === "compact";
  return (
    <div
      className={`${styles.steps} ${compact ? styles.stepsCompact : styles.stepsDefault}`}
      role="group"
      aria-label="Beat steps (playing indicator)"
    >
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
  );
}
