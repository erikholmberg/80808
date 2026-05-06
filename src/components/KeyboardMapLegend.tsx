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
  /** Compact pads for sticky dock — no title, tighter layout */
  dense?: boolean;
  /** All twelve pads in one row (use with `dense` for sticky dock) */
  singleRow?: boolean;
};

export function KeyboardMapLegend({
  pressed,
  onPadDown,
  onPadUp,
  embedded,
  nested,
  dense,
  singleRow = false,
}: Props) {
  const rowSlices = singleRow ? [VOICES] : [VOICES.slice(0, 6), VOICES.slice(6)];

  const chipClass = (v: VoiceId) =>
    `${styles.chip} ${dense ? styles.chipDense : ""} ${singleRow ? styles.chipSingleRow : ""} ${pressed[v] ? styles.chipActive : ""}`;

  return (
    <section
      className={`${styles.wrap} ${embedded ? styles.wrapEmbedded : ""} ${nested ? styles.wrapNested : ""} ${dense ? styles.wrapDense : ""}`}
      aria-label="Drum pads"
    >
      {dense ? null : (
        <p className={styles.title}>Drum pads — tap, click, or keys 1–6 and Q–Y</p>
      )}
      <div
        className={`${styles.rows} ${dense ? styles.rowsDense : ""} ${singleRow ? styles.rowsSingleWrap : ""}`}
      >
        {rowSlices.map((slice, rowIdx) => (
          <div
            key={rowIdx}
            className={`${styles.row} ${dense ? styles.rowDense : ""} ${singleRow ? styles.rowSingle : ""}`}
          >
            {slice.map((v) => (
              <button
                key={v}
                type="button"
                className={chipClass(v)}
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
        ))}
      </div>
    </section>
  );
}
