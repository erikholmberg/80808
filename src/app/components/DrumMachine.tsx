"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
  isValidBeatPattern,
  toggleStep,
  type BeatPattern,
} from "@/state/pattern";
import {
  loadSavedPatterns,
  persistSavedPatterns,
  type SavedPatternEntry,
} from "@/state/savedPatterns";
import { VOICES } from "@/voices";
import type { VoiceId } from "@/voices";
import { KeyboardMapLegend } from "@/components/KeyboardMapLegend";
import { Tr808Panel } from "@/components/Tr808Panel";
import { PresetPicker } from "@/components/PresetPicker";
import { StepGrid } from "@/components/StepGrid";
import { SavedPatternsPanel } from "@/components/SavedPatternsPanel";
import { SongBeatPanel } from "@/components/SongBeatPanel";
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
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [pressed, setPressed] = useState<Partial<Record<VoiceId, boolean>>>({});

  const keyboardColumnRef = useRef<HTMLDivElement>(null);
  const [programRowSideBySide, setProgramRowSideBySide] = useState(false);
  const [keyboardColumnHeight, setKeyboardColumnHeight] = useState<number | undefined>(
    undefined,
  );

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

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 721px)");
    const sync = () => setProgramRowSideBySide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useLayoutEffect(() => {
    const el = keyboardColumnRef.current;
    if (!programRowSideBySide || !el) {
      setKeyboardColumnHeight(undefined);
      return;
    }
    const measure = () => setKeyboardColumnHeight(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [programRowSideBySide]);

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
      void beginVoice(v);
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
  }, [beginVoice, endVoice, touchCtx]);

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
        primed = true;
      }
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

    return () => {
      cancelled = true;
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
        <h1 className={styles.title}>80808 Drum Machine</h1>
        <p className={styles.sub}>
          Program the step grid, play pads with 1–6 and Q–Y, save patterns as JSON.
        </p>
        {showIOSAudioHint ? (
          <p className={styles.mobileAudioHint} role="note">
            iPhone / iPad: turn off silent mode if you don&apos;t hear drums.
          </p>
        ) : null}
      </header>

      <SongBeatPanel
        onApplyPattern={(p) =>
          setPattern({
            ...p,
            steps: p.steps.map((row) => [...row]),
          })
        }
        onSaveToLibrary={savePatternToLibrary}
      />

      <Tr808Panel
        pressed={pressed}
        onPadDown={beginVoice}
        onPadUp={endVoice}
        playing={playing}
        onPlay={onPlay}
        onStop={onStop}
        playhead={playing ? playhead : null}
        patternName={pattern.name}
        bpm={pattern.bpm}
      />

      <div className={styles.programRow}>
        <div ref={keyboardColumnRef} className={styles.keyboardColumn}>
          <KeyboardMapLegend pressed={pressed} embedded />
        </div>
        <div
          className={styles.gridColumn}
          style={
            programRowSideBySide &&
            keyboardColumnHeight != null &&
            keyboardColumnHeight > 0
              ? { height: keyboardColumnHeight, minHeight: keyboardColumnHeight }
              : undefined
          }
        >
          <StepGrid
            steps={pattern.steps}
            playhead={playing ? playhead : null}
            onToggle={onToggle}
            compact
            fillHeight={programRowSideBySide}
          />
        </div>
      </div>

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

      <PresetPicker
        presets={BUILT_IN_PRESETS}
        onSelect={(p) =>
          setPattern({
            ...p,
            steps: p.steps.map((row) => [...row]),
          })
        }
      />
    </div>
  );
}
