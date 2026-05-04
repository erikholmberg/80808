import type { VoiceId } from "@/voices";
import { VOICES, VOICE_LABELS } from "@/voices";
import { keyLabelForVoice } from "@/keymap";
import styles from "./KeyboardMapLegend.module.css";

type Props = {
  pressed: Partial<Record<VoiceId, boolean>>;
  /** Remove outer spacing when placed in a composite row (e.g. beside the step grid) */
  embedded?: boolean;
  /** Inside TR-808 panel — no duplicated card border/background */
  nested?: boolean;
};

export function KeyboardMapLegend({ pressed, embedded, nested }: Props) {
  return (
    <section
      className={`${styles.wrap} ${embedded ? styles.wrapEmbedded : ""} ${nested ? styles.wrapNested : ""}`}
      aria-label="Keyboard mapping"
    >
      <p className={styles.title}>Computer keyboard · drum pads</p>
      <div className={styles.rows}>
        <div className={styles.row}>
          {VOICES.slice(0, 6).map((v) => (
            <span
              key={v}
              className={`${styles.chip} ${pressed[v] ? styles.chipActive : ""}`}
            >
              <kbd className={styles.kbd}>{keyLabelForVoice(v)}</kbd>
              <span className={styles.label}>{v}</span>
              <span className={styles.hint}>{VOICE_LABELS[v]}</span>
            </span>
          ))}
        </div>
        <div className={styles.row}>
          {VOICES.slice(6).map((v) => (
            <span
              key={v}
              className={`${styles.chip} ${pressed[v] ? styles.chipActive : ""}`}
            >
              <kbd className={styles.kbd}>{keyLabelForVoice(v)}</kbd>
              <span className={styles.label}>{v}</span>
              <span className={styles.hint}>{VOICE_LABELS[v]}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
