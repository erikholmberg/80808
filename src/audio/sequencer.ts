/** 16th-note step length in seconds at `bpm`. */
export function secondsPerStep(bpm: number): number {
  return 60 / bpm / 4;
}
