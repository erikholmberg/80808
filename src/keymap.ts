import type { VoiceId } from "./voices";
import { VOICES, voiceIndex } from "./voices";

export const KEY_ROW_DIGITS = ["1", "2", "3", "4", "5", "6"] as const;
export const KEY_ROW_LETTERS = ["q", "w", "e", "r", "t", "y"] as const;

export const KEY_TO_VOICE: Record<string, VoiceId> = (() => {
  const m: Record<string, VoiceId> = {};
  KEY_ROW_DIGITS.forEach((k, i) => {
    m[k] = VOICES[i]!;
  });
  KEY_ROW_LETTERS.forEach((k, i) => {
    m[k] = VOICES[i + 6]!;
  });
  return m;
})();

export function normalizeKey(key: string): string {
  if (key.length === 1 && /[A-Za-z]/.test(key)) return key.toLowerCase();
  return key;
}

export function voiceForKey(key: string): VoiceId | undefined {
  return KEY_TO_VOICE[normalizeKey(key)];
}

export function keyLabelForVoice(v: VoiceId): string {
  const i = voiceIndex(v);
  return i < 6 ? KEY_ROW_DIGITS[i]! : KEY_ROW_LETTERS[i - 6]!;
}
