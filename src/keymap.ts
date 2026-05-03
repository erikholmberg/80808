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

/** Physical keys (works on non-US layouts where digit row characters differ). */
export const CODE_TO_VOICE: Partial<Record<string, VoiceId>> = {
  Digit1: VOICES[0],
  Digit2: VOICES[1],
  Digit3: VOICES[2],
  Digit4: VOICES[3],
  Digit5: VOICES[4],
  Digit6: VOICES[5],
  KeyQ: VOICES[6],
  KeyW: VOICES[7],
  KeyE: VOICES[8],
  KeyR: VOICES[9],
  KeyT: VOICES[10],
  KeyY: VOICES[11],
  Numpad1: VOICES[0],
  Numpad2: VOICES[1],
  Numpad3: VOICES[2],
  Numpad4: VOICES[3],
  Numpad5: VOICES[4],
  Numpad6: VOICES[5],
};

export function normalizeKey(key: string): string {
  if (key.length === 1 && /[A-Za-z]/.test(key)) return key.toLowerCase();
  return key;
}

export function voiceForKey(key: string): VoiceId | undefined {
  return KEY_TO_VOICE[normalizeKey(key)];
}

/** Prefer `event.code` (physical position), fall back to `event.key` for printed character. */
export function voiceForKeyboardEvent(e: KeyboardEvent): VoiceId | undefined {
  const byCode = e.code ? CODE_TO_VOICE[e.code] : undefined;
  if (byCode) return byCode;
  return voiceForKey(e.key);
}

export function keyLabelForVoice(v: VoiceId): string {
  const i = voiceIndex(v);
  return i < 6 ? KEY_ROW_DIGITS[i]! : KEY_ROW_LETTERS[i - 6]!;
}
