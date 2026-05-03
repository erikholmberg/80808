export type VoiceId =
  | "BD"
  | "SD"
  | "LT"
  | "MT"
  | "HT"
  | "RS"
  | "CP"
  | "MA"
  | "CH"
  | "OH"
  | "CY"
  | "CB";

export const VOICES: VoiceId[] = [
  "BD",
  "SD",
  "LT",
  "MT",
  "HT",
  "RS",
  "CP",
  "MA",
  "CH",
  "OH",
  "CY",
  "CB",
];

export const VOICE_LABELS: Record<VoiceId, string> = {
  BD: "Bass drum",
  SD: "Snare",
  LT: "Low tom",
  MT: "Mid tom",
  HT: "Hi tom",
  RS: "Rimshot",
  CP: "Hand clap",
  MA: "Maracas",
  CH: "Closed hat",
  OH: "Open hat",
  CY: "Cymbal",
  CB: "Cowbell",
};

export function voiceIndex(id: VoiceId): number {
  return VOICES.indexOf(id);
}
