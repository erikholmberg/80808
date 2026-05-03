"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playVoice, resumeAudioContext } from "@/audio/drumKit";
import { secondsPerStep } from "@/audio/sequencer";
import { voiceForKey } from "@/keymap";
import { BUILT_IN_PRESETS } from "@/presets";
import {
  clearPattern,
  createEmptyPattern,
  isValidBeatPattern,
  toggleStep,
  type BeatPattern,
} from "@/state/pattern";
import { VOICES } from "@/voices";
import type { VoiceId } from "@/voices";
import { KeyboardMapLegend } from "@/components/KeyboardMapLegend";
import { MachineGraphic } from "@/components/MachineGraphic";
import { PresetPicker } from "@/components/PresetPicker";
import { StepGrid } from "@/components/StepGrid";
import { Transport } from "@/components/Transport";
import styles from "./DrumMachine.module.css";

const STORAGE_KEY = "80808-beat-v1";

function loadStored(): BeatPattern | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (isValidBeatPattern(data)) return data;
  } catch {
    /* ignore */
  }
  return null;
}

export function DrumMachine() {
  const [pattern, setPattern] = useState<BeatPattern>(
    () => loadStored() ?? createEmptyPattern(),
  );
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [pressed, setPressed] = useState<Partial<Record<VoiceId, boolean>>>({});

  const audioCtxRef = useRef<AudioContext | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const patternRef = useRef(pattern);
  const playingRef = useRef(playing);

  const stepIndexRef = useRef(0);
  const nextStepTimeRef = useRef(0);

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pattern));
    } catch {
      /* ignore */
    }
  }, [pattern]);

  const ensureCtx = useCallback(async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    await resumeAudioContext(audioCtxRef.current);
    return audioCtxRef.current;
  }, []);

  const beginVoice = useCallback(
    async (v: VoiceId) => {
      const ctx = await ensureCtx();
      playVoice(ctx, v, ctx.currentTime);
      setPressed((p) => ({ ...p, [v]: true }));
    },
    [ensureCtx],
  );

  const endVoice = useCallback((v: VoiceId) => {
    setPressed((p) => {
      const n = { ...p };
      delete n[v];
      return n;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const v = voiceForKey(e.key);
      if (!v || e.repeat) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      void beginVoice(v);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const v = voiceForKey(e.key);
      if (!v) return;
      endVoice(v);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [beginVoice, endVoice]);

  useEffect(() => {
    if (!playing) return;

    const ctx = audioCtxRef.current ?? new AudioContext();
    audioCtxRef.current = ctx;

    let raf = 0;
    let cancelled = false;

    void resumeAudioContext(ctx).then(() => {
      if (cancelled) return;
      nextStepTimeRef.current = ctx.currentTime + 0.05;
      stepIndexRef.current = 0;

      const loop = () => {
        if (!playingRef.current || cancelled) return;
        const scheduleAhead = 0.12;
        while (nextStepTimeRef.current < ctx.currentTime + scheduleAhead) {
          const step = stepIndexRef.current;
          const grid = patternRef.current.steps;
          const sp = secondsPerStep(patternRef.current.bpm);
          for (let r = 0; r < 12; r++) {
            if (grid[r]?.[step]) {
              playVoice(ctx, VOICES[r]!, nextStepTimeRef.current);
            }
          }
          setPlayhead(step);
          stepIndexRef.current = (step + 1) % 16;
          nextStepTimeRef.current += sp;
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [playing]);

  const onToggle = (row: number, col: number) => {
    setPattern((p) => ({ ...p, steps: toggleStep(p.steps, row, col) }));
  };

  const onPlay = () => {
    void ensureCtx().then(() => setPlaying(true));
  };

  const onStop = () => {
    setPlaying(false);
    setPlayhead(null);
  };

  const onClear = () => {
    setPattern((p) => ({ ...p, steps: clearPattern() }));
  };

  const onBpmChange = (bpm: number) => {
    const n = Math.min(200, Math.max(40, Math.round(bpm)) || 120);
    setPattern((p) => ({ ...p, bpm: n }));
  };

  const onSaveFile = () => {
    const blob = new Blob([JSON.stringify(pattern, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    const safe = pattern.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "") || "pattern";
    a.href = URL.createObjectURL(blob);
    a.download = `${safe}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onImportClick = () => fileRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data: unknown = JSON.parse(String(reader.result));
        if (isValidBeatPattern(data)) {
          setPattern({
            ...data,
            steps: data.steps.map((row) => [...row]),
          });
        }
      } catch {
        /* ignore invalid */
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className={styles.page}>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className={styles.hiddenFile}
        onChange={onFile}
      />
      <header className={styles.header}>
        <h1 className={styles.title}>808-style drum machine</h1>
        <p className={styles.sub}>
          Sixteen steps, twelve voices, keyboard-playable pads — save patterns as JSON.
        </p>
      </header>

      <MachineGraphic
        pressed={pressed}
        onPadDown={(v) => void beginVoice(v)}
        onPadUp={endVoice}
      />

      <KeyboardMapLegend pressed={pressed} />

      <Transport
        name={pattern.name}
        onNameChange={(name) => setPattern((p) => ({ ...p, name }))}
        bpm={pattern.bpm}
        onBpmChange={onBpmChange}
        playing={playing}
        onPlay={onPlay}
        onStop={onStop}
        onClear={onClear}
        onSaveFile={onSaveFile}
        onImportClick={onImportClick}
      />

      <PresetPicker
        presets={BUILT_IN_PRESETS}
        onSelect={(p) => setPattern(p)}
      />

      <StepGrid
        steps={pattern.steps}
        playhead={playing ? playhead : null}
        onToggle={onToggle}
      />
    </div>
  );
}
