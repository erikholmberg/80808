"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  startTransition,
  useSyncExternalStore,
} from "react";
import {
  createBrowserAudioContext,
  playVoice,
  primeAudioContext,
} from "@/audio/drumKit";
import { secondsPerStep } from "@/audio/sequencer";
import { voiceForKeyboardEvent } from "@/keymap";
import { BUILT_IN_PRESETS } from "@/presets";
import {
  clearPattern,
  createEmptyPattern,
  normalizeBeatPattern,
  setStepValue,
  toggleStep,
  type BeatPattern,
} from "@/state/pattern";
import {
  loadSavedPatterns,
  persistSavedPatterns,
  type SavedPatternEntry,
} from "@/state/savedPatterns";
import { VOICES, voiceIndex } from "@/voices";
import type { VoiceId } from "@/voices";
import { Tr808Panel } from "@/components/Tr808Panel";
import { PresetPicker } from "@/components/PresetPicker";
import { StepGrid } from "@/components/StepGrid";
import { SavedPatternsPanel } from "@/components/SavedPatternsPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SongBeatPanelFallback } from "./DrumMachineFallback";
import styles from "./DrumMachine.module.css";

const SongBeatPanel = dynamic(
  () => import("@/components/SongBeatPanel").then((m) => ({ default: m.SongBeatPanel })),
  { loading: () => <SongBeatPanelFallback /> },
);

const STORAGE_KEY = "80808-beat-v1";

function loadStored(): BeatPattern | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    return normalizeBeatPattern(data);
  } catch {
    /* ignore */
  }
  return null;
}

export function DrumMachine() {
  const [pattern, setPattern] = useState<BeatPattern>(() => createEmptyPattern());

  useEffect(() => {
    const stored = loadStored();
    if (stored) startTransition(() => setPattern(stored));
  }, []);

  const [savedEntries, setSavedEntries] = useState<SavedPatternEntry[]>([]);

  useEffect(() => {
    startTransition(() => {
      setSavedEntries(loadSavedPatterns());
    });
  }, []);

  useEffect(() => {
    persistSavedPatterns(savedEntries);
  }, [savedEntries]);

  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [pressed, setPressed] = useState<Partial<Record<VoiceId, boolean>>>({});
  const [saveAck, setSaveAck] = useState(false);
  const saveAckTimeoutRef = useRef(0);

  const showIOSAudioHint = useSyncExternalStore(
    () => () => {},
    () => {
      const nav = navigator as Navigator & { audioSession?: unknown };
      const hasAudioSession = typeof nav.audioSession !== "undefined";
      const ua = navigator.userAgent;
      const iOSDevice =
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1);
      return iOSDevice && !hasAudioSession;
    },
    () => false,
  );

  const audioCtxRef = useRef<AudioContext | null>(null);

  const patternRef = useRef(pattern);
  const playingRef = useRef(playing);
  const recordingRef = useRef(recording);
  const recordStepRef = useRef<number | null>(null);

  const stepIndexRef = useRef(0);
  const nextStepTimeRef = useRef(0);

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pattern));
    } catch {
      /* ignore */
    }
  }, [pattern]);

  useEffect(() => () => window.clearTimeout(saveAckTimeoutRef.current), []);

  /** Create context if needed and prime output — call synchronously from user input (iOS). */
  const touchCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = createBrowserAudioContext();
    }
    const ctx = audioCtxRef.current;
    primeAudioContext(ctx);
    return ctx;
  }, []);

  /** First touch primes the graph — `touchstart` and `touchend` (Safari differs by version). */
  useEffect(() => {
    const primeOnce = () => {
      try {
        touchCtx();
      } catch {
        /* ignore */
      }
      window.removeEventListener("touchstart", primeOnce, { capture: true });
      window.removeEventListener("touchend", primeOnce, { capture: true });
    };
    window.addEventListener("touchstart", primeOnce, { capture: true, passive: true });
    window.addEventListener("touchend", primeOnce, { capture: true, passive: true });
    return () => {
      window.removeEventListener("touchstart", primeOnce, { capture: true });
      window.removeEventListener("touchend", primeOnce, { capture: true });
    };
  }, [touchCtx]);

  const beginVoice = useCallback((v: VoiceId) => {
    const ctx = touchCtx();
    playVoice(ctx, v, ctx.currentTime);
    setPressed((p) => ({ ...p, [v]: true }));
  }, [touchCtx]);

  const handlePadDown = useCallback(
    (v: VoiceId) => {
      if (recordingRef.current && playingRef.current) {
        const row = voiceIndex(v);
        setPattern((p) => {
          if (!recordingRef.current || !playingRef.current) return p;
          const col = recordStepRef.current;
          if (col === null || p.steps[row]?.[col] === undefined) return p;
          const on = p.steps[row]![col] > 0;
          const steps = setStepValue(p.steps, row, col, on ? 0 : 1);
          const next = { ...p, steps };
          patternRef.current = next;
          return next;
        });
      }
      beginVoice(v);
    },
    [beginVoice],
  );

  const endVoice = useCallback((v: VoiceId) => {
    setPressed((p) => {
      const n = { ...p };
      delete n[v];
      return n;
    });
  }, []);

  useEffect(() => {
    /** Block pads while typing in form fields (use activeElement — reliable with capture-phase listeners). */
    const typing = () => {
      const el = document.activeElement;
      return (
        el instanceof HTMLElement &&
        Boolean(
          el.closest(
            'input, textarea, select, [contenteditable="true"], [role="textbox"]',
          ),
        )
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (typing()) return;
      if (e.code === "Space" || e.key === " ") {
        if (e.repeat) return;
        e.preventDefault();
        if (playingRef.current) {
          setPlaying(false);
          setPlayhead(null);
          setRecording(false);
        } else {
          touchCtx();
          setPlaying(true);
        }
        return;
      }
      const v = voiceForKeyboardEvent(e);
      if (!v || e.repeat) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      void handlePadDown(v);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (typing()) return;
      const v = voiceForKeyboardEvent(e);
      if (!v) return;
      endVoice(v);
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("keyup", onKeyUp, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("keyup", onKeyUp, { capture: true });
    };
  }, [handlePadDown, endVoice, touchCtx]);

  useEffect(() => {
    if (!playing) return;

    const ctx = audioCtxRef.current ?? createBrowserAudioContext();
    audioCtxRef.current = ctx;

    let raf = 0;
    let cancelled = false;
    let primed = false;

    const loop = () => {
      if (!playingRef.current || cancelled) return;
      if (ctx.state !== "running") {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (!primed) {
        nextStepTimeRef.current = ctx.currentTime + 0.05;
        stepIndexRef.current = 0;
        recordStepRef.current = 0;
        primed = true;
      }
      const scheduleAhead = 0.12;
      let lastUiStep: number | null = null;
      while (nextStepTimeRef.current < ctx.currentTime + scheduleAhead) {
        const step = stepIndexRef.current;
        recordStepRef.current = step;
        const grid = patternRef.current.steps;
        const sp = secondsPerStep(patternRef.current.bpm);
        for (let r = 0; r < 12; r++) {
          const velocity = grid[r]?.[step];
          if (velocity && velocity > 0) {
            playVoice(ctx, VOICES[r]!, nextStepTimeRef.current, velocity);
          }
        }
        lastUiStep = step;
        stepIndexRef.current = (step + 1) % 16;
        nextStepTimeRef.current += sp;
      }
      if (lastUiStep !== null) {
        setPlayhead(lastUiStep);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      recordStepRef.current = null;
      cancelAnimationFrame(raf);
    };
  }, [playing]);

  const onToggle = (row: number, col: number) => {
    setPattern((p) => ({ ...p, steps: toggleStep(p.steps, row, col) }));
  };

  const onPlay = () => {
    touchCtx();
    setPlaying(true);
  };

  const onStop = () => {
    setPlaying(false);
    setPlayhead(null);
    setRecording(false);
  };

  const onRecordToggle = useCallback(() => {
    setRecording((was) => {
      if (!was) {
        touchCtx();
        setPlaying(true);
        return true;
      }
      return false;
    });
  }, [touchCtx]);

  const onClear = () => {
    setRecording(false);
    setPattern((p) => ({ ...p, steps: clearPattern() }));
  };

  const onBpmChange = (bpm: number) => {
    const n = Math.min(200, Math.max(40, Math.round(bpm)) || 120);
    setPattern((p) => ({ ...p, bpm: n }));
  };

  const savePatternToLibrary = useCallback((p: BeatPattern) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `saved-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const entry: SavedPatternEntry = {
      id,
      pattern: {
        ...p,
        steps: p.steps.map((row) => [...row]),
      },
    };
    setSavedEntries((prev) => [entry, ...prev]);
  }, []);

  const onSave = useCallback(() => {
    savePatternToLibrary(pattern);
    setSaveAck(true);
    window.clearTimeout(saveAckTimeoutRef.current);
    saveAckTimeoutRef.current = window.setTimeout(() => setSaveAck(false), 1800);
  }, [pattern, savePatternToLibrary]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerIntro}>
            <h1 className={styles.title}>
              <img
                src="/80808-logo.svg"
                alt="80808 Drum Machine"
                className={styles.logo}
                width={1527}
                height={579}
                decoding="async"
              />
            </h1>
            <p className={styles.sub}>
              Program the step grid, play drums on the pads or with 1–6 and Q–Y, and save copies
              of patterns in this browser.
            </p>
          </div>
          <ThemeToggle />
        </div>
        {showIOSAudioHint ? (
          <p className={styles.mobileAudioHint} role="note">
            iPhone / iPad: turn off silent mode if you don&apos;t hear drums.
          </p>
        ) : null}
      </header>

      <Tr808Panel
        pressed={pressed}
        onPadDown={handlePadDown}
        onPadUp={endVoice}
        playing={playing}
        recording={recording}
        onPlay={onPlay}
        onStop={onStop}
        onRecordToggle={onRecordToggle}
        playhead={playing ? playhead : null}
        name={pattern.name}
        onNameChange={(name) => setPattern((p) => ({ ...p, name }))}
        bpm={pattern.bpm}
        onBpmChange={onBpmChange}
        onClear={onClear}
        onSave={onSave}
        saveAck={saveAck}
      />

      <div className={styles.sequencerSection}>
        <StepGrid
          steps={pattern.steps}
          playhead={playing ? playhead : null}
          onToggle={onToggle}
          compact
        />
      </div>

      <PresetPicker
        presets={BUILT_IN_PRESETS}
        onSelect={(p) =>
          setPattern({
            ...p,
            steps: p.steps.map((row) => [...row]),
          })
        }
      />

      <SongBeatPanel
        onApplyPattern={(p) =>
          setPattern({
            ...p,
            steps: p.steps.map((row) => [...row]),
          })
        }
        onSaveToLibrary={savePatternToLibrary}
      />

      <SavedPatternsPanel
        entries={savedEntries}
        onSelect={(p) =>
          setPattern({
            ...p,
            steps: p.steps.map((row) => [...row]),
          })
        }
        onDelete={(id) => setSavedEntries((prev) => prev.filter((e) => e.id !== id))}
      />
    </div>
  );
}
