import { createEmptyPattern, STEPS, type BeatPattern } from "@/state/pattern";
import { voiceIndex } from "@/voices";

/** Random starter grooves beyond built-ins (sparse, plausible 808 layout). */
export function generateStarterPatterns(count: number, firstSerial: number): BeatPattern[] {
  const out: BeatPattern[] = [];
  for (let i = 0; i < count; i++) {
    const serial = firstSerial + i;
    const p = createEmptyPattern(`Bonus groove ${serial}`);
    p.bpm = Math.min(190, Math.max(58, Math.round(68 + Math.random() * 82)));
    const g = p.steps;
    const iBD = voiceIndex("BD");
    const iSD = voiceIndex("SD");
    const iCH = voiceIndex("CH");
    const iOH = voiceIndex("OH");
    const iCP = voiceIndex("CP");
    const iRS = voiceIndex("RS");

    const style = Math.floor(Math.random() * 4);

    if (style === 0) {
      for (let c = 0; c < STEPS; c++) {
        if (c % 4 === 0 && Math.random() < 0.72) g[iBD]![c] = 1;
        else if (Math.random() < 0.06) g[iBD]![c] = 1;
      }
      if (Math.random() < 0.88) {
        g[iSD]![4] = 1;
        g[iSD]![12] = 1;
      }
      for (let c = 0; c < STEPS; c++) {
        if (Math.random() < 0.38) g[iCH]![c] = 1;
      }
    } else if (style === 1) {
      for (const c of [0, 8]) if (Math.random() < 0.85) g[iBD]![c] = 1;
      if (Math.random() < 0.5) g[iBD]![4] = 1;
      if (Math.random() < 0.55) g[iBD]![12] = 1;
      if (Math.random() < 0.75) {
        g[iSD]![4] = 1;
        g[iSD]![12] = 1;
      }
      for (let c = 0; c < STEPS; c += 2) {
        if (Math.random() < 0.55) g[iCH]![c] = 1;
      }
      if (Math.random() < 0.35) g[iOH]![14] = 1;
    } else if (style === 2) {
      for (let c = 0; c < STEPS; c++) {
        if (Math.random() < 0.22) g[iBD]![c] = 1;
      }
      for (const c of [4, 12]) if (Math.random() < 0.8) g[iSD]![c] = 1;
      for (let c = 0; c < STEPS; c++) {
        if (Math.random() < 0.42) g[iCH]![c] = 1;
      }
      if (Math.random() < 0.4) g[iCP]![8] = 1;
    } else {
      for (let c = 0; c < STEPS; c++) {
        if (c % 4 === 0 && Math.random() < 0.68) g[iBD]![c] = 1;
      }
      if (Math.random() < 0.7) {
        g[iRS]![8] = 1;
      }
      if (Math.random() < 0.82) {
        g[iSD]![4] = 1;
        g[iSD]![12] = 1;
      }
      for (let c = 0; c < STEPS; c++) {
        if (Math.random() < 0.28) g[iCH]![c] = 1;
      }
    }

    let any = false;
    for (const row of g) {
      for (const cell of row) {
        if (cell) {
          any = true;
          break;
        }
      }
      if (any) break;
    }
    if (!any) g[iBD]![0] = 1;

    out.push(p);
  }
  return out;
}
