import type { SavedPatternEntry } from "@/state/savedPatterns";
import styles from "./SavedPatternsPanel.module.css";

function TrashIcon() {
  return (
    <svg
      className={styles.trashIcon}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3 6h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 11v6M14 11v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  entries: SavedPatternEntry[];
  onSelect: (pattern: SavedPatternEntry["pattern"]) => void;
  onDelete: (id: string) => void;
};

export function SavedPatternsPanel({ entries, onSelect, onDelete }: Props) {
  return (
    <section className={styles.wrap} aria-label="Saved patterns">
      <h2 className={styles.heading}>Saved patterns</h2>
      {entries.length === 0 ? (
        <p className={styles.empty}>
          No saved patterns yet. Use <strong>Save</strong> on the transport bar to store a copy here.
        </p>
      ) : (
        <ul className={styles.list}>
          {entries.map((e) => (
            <li key={e.id} className={styles.card}>
              <button
                type="button"
                className={styles.presetBtn}
                onClick={() =>
                  onSelect({
                    ...e.pattern,
                    steps: e.pattern.steps.map((r) => [...r]),
                    stepGain: e.pattern.stepGain.map((r) => [...r]),
                  })
                }
              >
                <span className={styles.name}>{e.pattern.name}</span>
                <span className={styles.bpm}>{e.pattern.bpm} BPM</span>
              </button>
              <button
                type="button"
                className={styles.deleteIconBtn}
                aria-label={`Remove ${e.pattern.name}`}
                title="Remove pattern"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onDelete(e.id);
                }}
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
