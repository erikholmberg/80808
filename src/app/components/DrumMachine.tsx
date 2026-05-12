"use client";

import {
  useCallback,
  useEffect,
  useMemo,
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
  beatPatternsEqual,
  clearPattern,
  cloneBeatPattern,
  createEmptyPattern,
  normalizeBeatPattern,
  setStepGain,
  setStepValue,
  toggleStep,
  type BeatPattern,
} from "@/state/pattern";
import {
  applyBarClip,
  applyColumnClip,
  applyRowClip,
  buildBarClip,
  buildColumnClip,
  buildRowClip,
  parseClipJson,
  serializeClip,
} from "@/state/clipboard";
import {
  loadSavedPatterns,
  persistSavedPatterns,
  type SavedPatternEntry,
} from "@/state/savedPatterns";
import { VOICES, voiceIndex } from "@/voices";
import type { VoiceId } from "@/voices";
import { RhythmPanel } from "@/components/RhythmPanel";
import { StepGrid } from "@/components/StepGrid";
import { ThemeToggle } from "@/components/ThemeToggle";
import styles from "./DrumMachine.module.css";

const STORAGE_KEY = "80808-beat-v1";
const PATTERN_HISTORY_MAX = 80;

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
  const initialPattern = useMemo(() => createEmptyPattern(), []);
  const [pattern, setPatternState] = useState<BeatPattern>(() => initialPattern);
  const patternRef = useRef<BeatPattern>(initialPattern);
  const pastRef = useRef<BeatPattern[]>([]);
  const futureRef = useRef<BeatPattern[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncHistoryAvailability = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const setPatternOnly = useCallback(
    (next: BeatPattern) => {
      patternRef.current = next;
      setPatternState(next);
      syncHistoryAvailability();
    },
    [syncHistoryAvailability],
  );

  const commitPattern = useCallback(
    (updater: BeatPattern | ((prev: BeatPattern) => BeatPattern)) => {
      const prev = patternRef.current;
      const next = typeof updater === "function" ? (updater as (p: BeatPattern) => BeatPattern)(prev) : updater;
      if (beatPatternsEqual(prev, next)) return;
      pastRef.current.push(cloneBeatPattern(prev));
      if (pastRef.current.length > PATTERN_HISTORY_MAX) pastRef.current.shift();
      futureRef.current = [];
      patternRef.current = next;
      setPatternState(next);
      syncHistoryAvailability();
    },
    [syncHistoryAvailability],
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const next = pastRef.current.pop()!;
    futureRef.current.unshift(cloneBeatPattern(patternRef.current));
    setPatternOnly(next);
  }, [setPatternOnly]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const current = cloneBeatPattern(patternRef.current);
    const next = futureRef.current.shift()!;
    pastRef.current.push(current);
    if (pastRef.current.length > PATTERN_HISTORY_MAX) pastRef.current.shift();
    setPatternOnly(next);
  }, [setPatternOnly]);

  useEffect(() => {
    const stored = loadStored();
    if (stored) {
      startTransition(() => {
        pastRef.current = [];
        futureRef.current = [];
        setPatternOnly(stored);
      });
    }
  }, [setPatternOnly]);

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
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [activeColumn, setActiveColumn] = useState<number | null>(null);
  const activeRowRef = useRef<number | null>(null);
  const activeColumnRef = useRef<number | null>(null);
  const lastClipFallbackRef = useRef<string>("");

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

  const playingRef = useRef(playing);
  const recordingRef = useRef(recording);
  const recordStepRef = useRef<number | null>(null);

  const stepIndexRef = useRef(0);
  const nextStepTimeRef = useRef(0);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    activeRowRef.current = activeRow;
  }, [activeRow]);

  useEffect(() => {
    activeColumnRef.current = activeColumn;
  }, [activeColumn]);

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
        commitPattern((p) => {
          if (!recordingRef.current || !playingRef.current) return p;
          const col = recordStepRef.current;
          if (col === null || p.steps[row]?.[col] === undefined) return p;
          const on = p.steps[row]![col] > 0;
          const steps = setStepValue(p.steps, row, col, on ? 0 : 1);
          let stepGain = p.stepGain;
          if (!on) {
            stepGain = setStepGain(p.stepGain, row, col, 1);
          }
          const next = { ...p, steps, stepGain };
          return next;
        });
      }
      beginVoice(v);
    },
    [beginVoice, commitPattern],
  );

  const endVoice = useCallback((v: VoiceId) => {
    setPressed((p) => {
      const n = { ...p };
      delete n[v];
      return n;
    });
  }, []);

  const copyBar = useCallback(() => {
    const clip = buildBarClip(patternRef.current);
    const s = serializeClip(clip);
    lastClipFallbackRef.current = s;
    void navigator.clipboard.writeText(s).catch(() => {});
  }, []);

  const pasteBar = useCallback(() => {
    void (async () => {
      let t = "";
      try {
        t = await navigator.clipboard.readText();
      } catch {
        /* ignore */
      }
      let parsed = parseClipJson(t);
      if (!parsed || parsed["80808Clip"] !== "bar") {
        const fb = parseClipJson(lastClipFallbackRef.current);
        parsed = fb && fb["80808Clip"] === "bar" ? fb : null;
      }
      if (!parsed) return;
      const next = applyBarClip(patternRef.current, parsed);
      if (!next) return;
      commitPattern(next);
    })();
  }, [commitPattern]);

  const copyRow = useCallback((row: number) => {
    const clip = buildRowClip(patternRef.current, row);
    if (!clip) return;
    const s = serializeClip(clip);
    lastClipFallbackRef.current = s;
    void navigator.clipboard.writeText(s).catch(() => {});
  }, []);

  const pasteRow = useCallback((row: number) => {
    void (async () => {
      let t = "";
      try {
        t = await navigator.clipboard.readText();
      } catch {
        /* ignore */
      }
      let parsed = parseClipJson(t);
      if (!parsed || parsed["80808Clip"] !== "row") {
        const fb = parseClipJson(lastClipFallbackRef.current);
        parsed = fb && fb["80808Clip"] === "row" ? fb : null;
      }
      if (!parsed) return;
      const next = applyRowClip(patternRef.current, row, parsed);
      if (!next) return;
      commitPattern(next);
    })();
  }, [commitPattern]);

  const copyColumn = useCallback((col: number) => {
    const clip = buildColumnClip(patternRef.current, col);
    if (!clip) return;
    const s = serializeClip(clip);
    lastClipFallbackRef.current = s;
    void navigator.clipboard.writeText(s).catch(() => {});
  }, []);

  const pasteColumn = useCallback((col: number) => {
    void (async () => {
      let t = "";
      try {
        t = await navigator.clipboard.readText();
      } catch {
        /* ignore */
      }
      let parsed = parseClipJson(t);
      if (!parsed || parsed["80808Clip"] !== "column") {
        const fb = parseClipJson(lastClipFallbackRef.current);
        parsed = fb && fb["80808Clip"] === "column" ? fb : null;
      }
      if (!parsed) return;
      const next = applyColumnClip(patternRef.current, col, parsed);
      if (!next) return;
      commitPattern(next);
    })();
  }, [commitPattern]);

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
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.repeat) {
        const k = e.key.length === 1 ? e.key.toLowerCase() : "";
        if (k === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
          return;
        }
        if (k === "y" && !e.shiftKey) {
          e.preventDefault();
          redo();
          return;
        }
        if (k === "c" && e.shiftKey) {
          e.preventDefault();
          copyBar();
          return;
        }
        if (k === "v" && e.shiftKey) {
          e.preventDefault();
          pasteBar();
          return;
        }
        if (k === "c" && !e.shiftKey && activeColumnRef.current !== null) {
          e.preventDefault();
          copyColumn(activeColumnRef.current);
          return;
        }
        if (k === "v" && !e.shiftKey && activeColumnRef.current !== null) {
          e.preventDefault();
          pasteColumn(activeColumnRef.current);
          return;
        }
        if (k === "c" && !e.shiftKey && activeRowRef.current !== null) {
          e.preventDefault();
          copyRow(activeRowRef.current);
          return;
        }
        if (k === "v" && !e.shiftKey && activeRowRef.current !== null) {
          e.preventDefault();
          pasteRow(activeRowRef.current);
          return;
        }
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
  }, [
    handlePadDown,
    endVoice,
    touchCtx,
    undo,
    redo,
    copyBar,
    pasteBar,
    copyRow,
    pasteRow,
    copyColumn,
    pasteColumn,
  ]);

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
        const gains = patternRef.current.stepGain;
        const sp = secondsPerStep(patternRef.current.bpm);
        for (let r = 0; r < 12; r++) {
          const velocity = grid[r]?.[step];
          const gainMul = gains[r]?.[step] ?? 1;
          if (velocity && velocity > 0 && gainMul > 0) {
            playVoice(ctx, VOICES[r]!, nextStepTimeRef.current, velocity, gainMul);
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
    commitPattern((p) => {
      const cur = p.steps[row]![col]!;
      const nextSteps = toggleStep(p.steps, row, col);
      const nextVal = nextSteps[row]![col]!;
      let stepGain = p.stepGain;
      if (nextVal === 0) {
        stepGain = setStepGain(p.stepGain, row, col, 1);
      } else if (cur === 0) {
        stepGain = setStepGain(p.stepGain, row, col, 1);
      }
      return { ...p, steps: nextSteps, stepGain };
    });
  };

  const onStepGainChange = (row: number, col: number, gain: number) => {
    commitPattern((p) => ({
      ...p,
      stepGain: setStepGain(p.stepGain, row, col, gain),
    }));
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
    commitPattern((p) => ({ ...p, ...clearPattern() }));
  };

  const onBpmChange = (bpm: number) => {
    const n = Math.min(200, Math.max(40, Math.round(bpm)) || 120);
    commitPattern((p) => ({ ...p, bpm: n }));
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
        stepGain: p.stepGain.map((row) => [...row]),
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
            <h1 className={styles.title}>80808</h1>
          </div>
          <ThemeToggle />
        </div>
        <p className={styles.sub}>
          Program the step grid, play drums on the pads or with 1–6 and Q–Y, and save copies of
          patterns in this browser.
        </p>
        {showIOSAudioHint ? (
          <p className={styles.mobileAudioHint} role="note">
            iPhone / iPad: turn off silent mode if you don&apos;t hear drums.
          </p>
        ) : null}
      </header>

      <RhythmPanel
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
        onNameChange={(name) => commitPattern((p) => ({ ...p, name }))}
        bpm={pattern.bpm}
        onBpmChange={onBpmChange}
        onClear={onClear}
        onSave={onSave}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        presets={BUILT_IN_PRESETS}
        savedEntries={savedEntries}
        onPresetSelect={(p) =>
          commitPattern({
            name: p.name,
            bpm: p.bpm,
            steps: p.steps.map((row) => [...row]),
            stepGain: p.stepGain.map((row) => [...row]),
          })
        }
        saveAck={saveAck}
      />

      <div className={styles.sequencerSection}>
        <StepGrid
          steps={pattern.steps}
          stepGain={pattern.stepGain}
          playhead={playing ? playhead : null}
          onToggle={onToggle}
          onStepGainChange={onStepGainChange}
          compact
          activeRow={activeRow}
          onActiveRowChange={(row) => {
            setActiveRow(row);
            setActiveColumn(null);
          }}
          activeColumn={activeColumn}
          onActiveColumnChange={(col) => {
            setActiveColumn(col);
            setActiveRow(null);
          }}
        />
      </div>
    </div>
  );
}
