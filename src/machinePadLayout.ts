import type { VoiceId } from "./voices";

export const MACHINE_PAD_LAYOUT: Record<
  VoiceId,
  { top: number; left: number; width: number; height: number }
> = {
  BD: { top: 30, left: 4, width: 13, height: 24 },
  SD: { top: 30, left: 19, width: 13, height: 24 },
  LT: { top: 30, left: 34, width: 13, height: 24 },
  MT: { top: 30, left: 49, width: 13, height: 24 },
  HT: { top: 30, left: 64, width: 13, height: 24 },
  RS: { top: 30, left: 79, width: 13, height: 24 },
  CP: { top: 58, left: 4, width: 13, height: 24 },
  MA: { top: 58, left: 19, width: 13, height: 24 },
  CH: { top: 58, left: 34, width: 13, height: 24 },
  OH: { top: 58, left: 49, width: 13, height: 24 },
  CY: { top: 58, left: 64, width: 13, height: 24 },
  CB: { top: 58, left: 79, width: 13, height: 24 },
};
