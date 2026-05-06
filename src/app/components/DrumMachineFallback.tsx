import styles from "./DrumMachineFallback.module.css";

export function DrumMachinePageFallback() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Loading drum machine">
      <div className={styles.headerBar} />
      <div className={styles.panelBlock} />
      <div className={styles.gridBlock} />
    </div>
  );
}
