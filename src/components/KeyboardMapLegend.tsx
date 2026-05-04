import type { VoiceId } from "@/voices";
import { VOICES, VOICE_LABELS } from "@/voices";
import { keyLabelForVoice } from "@/keymap";
import styles from "./KeyboardMapLegend.module.css";

type Props = {
  pressed: Partial<Record<VoiceId, boolean>>;
  onPadDown: (voice: VoiceId) => void;
  onPadUp: (voice: VoiceId) => void;
  /** Remove outer spacing when placed in a composite row (e.g. beside the step grid) */
  embedded?: boolean;
  /** Inside TR-808 panel — no duplicated card border/background */
  nested?: boolean;
};

export function KeyboardMapLegend({
  pressed,
  onPadDown,
  onPadUp,
  embedded,
  nested,
}: Props) {
  return (
    <section
      className={`${styles.wrap} ${embedded ? styles.wrapEmbedded : ""} ${nested ? styles.wrapNested : ""}`}
      aria-label="Drum pads"
    >
      <p className={styles.title}>Drum pads — tap, click, or keys 1–6 and Q–Y</p>
      <div className={styles.rows}>
        <div className={styles.row}>
          {VOICES.slice(0, 6).map((v) => (
            <button
              key={v}
              type="button"
              className={`${styles.chip} ${pressed[v] ? styles.chipActive : ""}`}
              aria-pressed={Boolean(pressed[v])}
              aria-label={`${v}, key ${keyLabelForVoice(v)}`}
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
              <kbd className={styles.kbd}>{keyLabelForVoice(v)}</kbd>
              <span className={styles.label}>{v}</span>
              <span className={styles.hint}>{VOICE_LABELS[v]}</span>
            </button>
          ))}
        </div>
        <div className={styles.row}>
          {VOICES.slice(6).map((v) => (
            <button
              key={v}
              type="button"
              className={`${styles.chip} ${pressed[v] ? styles.chipActive : ""}`}
              aria-pressed={Boolean(pressed[v])}
              aria-label={`${v}, key ${keyLabelForVoice(v)}`}
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
              <kbd className={styles.kbd}>{keyLabelForVoice(v)}</kbd>
              <span className={styles.label}>{v}</span>
              <span className={styles.hint}>{VOICE_LABELS[v]}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
