"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  analyzeSongAudio,
  decodeBlobToBuffer,
  PREVIEW_ANALYSIS_WINDOW_SECONDS,
  type AnalyzeSongAudioOptions,
} from "@/audio/analyzeSongAudio";
import type { BeatPattern } from "@/state/pattern";
import { WaveformScrubber } from "@/components/WaveformScrubber";
import styles from "./SongBeatPanel.module.css";

type Props = {
  onApplyPattern: (pattern: BeatPattern) => void;
  /** Called when user saves the last song-generated pattern to the library. */
  onSaveToLibrary?: (pattern: BeatPattern) => void;
};

function clonePattern(p: BeatPattern): BeatPattern {
  return {
    ...p,
    steps: p.steps.map((row) => [...row]),
  };
}

function decodePatternNameB64(b64: string | null): string | null {
  if (!b64?.trim()) return null;
  try {
    const binary = atob(b64.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i) & 0xff;
    const s = new TextDecoder().decode(bytes).trim();
    return s || null;
  } catch {
    return null;
  }
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type WebSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<{ 0?: { transcript?: string } }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type WebSpeechRecognitionCtor = new () => WebSpeechRecognition;

type WindowWithSpeech = Window & {
  SpeechRecognition?: WebSpeechRecognitionCtor;
  webkitSpeechRecognition?: WebSpeechRecognitionCtor;
};

function getSpeechSupportedSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as WindowWithSpeech;
  return typeof (w.SpeechRecognition ?? w.webkitSpeechRecognition) === "function";
}

type BusyKind = false | "fetch" | "analyze";

export function SongBeatPanel({ onApplyPattern, onSaveToLibrary }: Props) {
  const [artist, setArtist] = useState("");
  const [track, setTrack] = useState("");
  const [busy, setBusy] = useState<BusyKind>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPattern, setGeneratedPattern] = useState<BeatPattern | null>(null);
  const [listening, setListening] = useState(false);
  const [previewBuffer, setPreviewBuffer] = useState<AudioBuffer | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [startSec, setStartSec] = useState(0);
  const speechSupported = useSyncExternalStore(
    () => () => {},
    getSpeechSupportedSnapshot,
    () => false,
  );
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);

  const windowSec = PREVIEW_ANALYSIS_WINDOW_SECONDS;

  const clampStartSec = useCallback(
    (s: number) => {
      if (!previewBuffer) {
        setStartSec(s);
        return;
      }
      const max = Math.max(0, previewBuffer.duration - windowSec);
      setStartSec(Math.min(max, Math.max(0, s)));
    },
    [previewBuffer, windowSec],
  );

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  const startListening = useCallback(() => {
    const w = window as WindowWithSpeech;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (typeof Ctor !== "function") return;

    stopListening();

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onresult = (ev) => {
      const text = ev.results[0]?.[0]?.transcript?.trim();
      if (text) setTrack(text);
      stopListening();
    };

    rec.onerror = () => {
      stopListening();
    };

    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
    }
  }, [stopListening]);

  const applyAnalyzed = useCallback(
    (pattern: BeatPattern) => {
      const applied = clonePattern(pattern);
      onApplyPattern(applied);
      setGeneratedPattern(clonePattern(pattern));
      setError(null);
    },
    [onApplyPattern],
  );

  const analyzeBuffer = useCallback(
    (buffer: AudioBuffer, nameHint: string, opts?: AnalyzeSongAudioOptions) => {
      const pattern = analyzeSongAudio(buffer, {
        patternName: nameHint,
        ...opts,
      });
      applyAnalyzed(pattern);
    },
    [applyAnalyzed],
  );

  const analyzeCurrentSection = useCallback(() => {
    if (!previewBuffer || !previewName) return;
    setBusy("analyze");
    setError(null);
    try {
      analyzeBuffer(previewBuffer, previewName, {
        offsetSeconds: startSec,
        windowSeconds: windowSec,
      });
    } catch {
      setError("Could not analyze that section.");
    } finally {
      setBusy(false);
    }
  }, [analyzeBuffer, previewBuffer, previewName, startSec, windowSec]);

  const fetchCatalogPreviewAndAnalyze = useCallback(async () => {
    const ar = artist.trim();
    const tr = track.trim();
    if (!ar || !tr) {
      setError("Enter both artist and song title.");
      return;
    }
    setError(null);
    setGeneratedPattern(null);
    setPreviewBuffer(null);
    setPreviewName(null);
    setBusy("fetch");
    try {
      const res = await fetch("/api/song-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist: ar, song: tr }),
      });
      const nameFromHeader = decodePatternNameB64(res.headers.get("X-80808-Pattern-Name-B64"));
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const err =
          typeof data === "object" &&
          data !== null &&
          typeof (data as { error?: string }).error === "string"
            ? (data as { error: string }).error
            : null;
        setError(err || `Request failed (${res.status})`);
        return;
      }
      const buf = await res.arrayBuffer();
      const mime = res.headers.get("Content-Type")?.split(";")[0]?.trim() || "audio/mp4";
      const buffer = await decodeBlobToBuffer(new Blob([buf], { type: mime }));
      const patternName =
        nameFromHeader ?? `${ar} — ${tr}`.slice(0, 128);
      setPreviewBuffer(buffer);
      setPreviewName(patternName);
      setStartSec(0);
      analyzeBuffer(buffer, patternName, {
        offsetSeconds: 0,
        windowSeconds: windowSec,
      });
    } catch {
      setError("Could not fetch or decode the preview. Try again.");
    } finally {
      setBusy(false);
    }
  }, [analyzeBuffer, artist, track, windowSec]);

  const busyDisabled = !!busy;
  const previewDuration = previewBuffer?.duration ?? 0;
  const sectionEnd = Math.min(startSec + windowSec, previewDuration);

  return (
    <section className={styles.wrap} aria-label="Song to beat">
      <h2 className={styles.title}>Song to 808 pattern</h2>

      <div className={styles.lookupFields}>
        <input
          className={`${styles.input} ${styles.inputHalf}`}
          type="text"
          placeholder="Artist"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          maxLength={96}
          disabled={busyDisabled}
          aria-label="Artist name"
        />
        <input
          className={`${styles.input} ${styles.inputHalf}`}
          type="text"
          placeholder="Song title"
          value={track}
          onChange={(e) => setTrack(e.target.value)}
          maxLength={96}
          disabled={busyDisabled}
          aria-label="Song title"
        />
        {speechSupported ? (
          <button
            type="button"
            className={`${styles.btn} ${listening ? styles.btnListening : ""}`}
            onClick={listening ? stopListening : startListening}
            disabled={busyDisabled}
          >
            {listening ? "Stop mic" : "Dictate song"}
          </button>
        ) : null}
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => void fetchCatalogPreviewAndAnalyze()}
          disabled={busyDisabled}
          aria-busy={busy === "fetch"}
        >
          {busy === "fetch" ? (
            <>
              <span className={styles.spinner} aria-hidden />
              Fetching…
            </>
          ) : (
            "Fetch preview & analyze"
          )}
        </button>
      </div>

      {previewBuffer && previewName ? (
        <div className={styles.waveformBlock}>
          <h3 className={styles.waveformTitle}>Choose section ({windowSec}s window)</h3>
          <WaveformScrubber
            buffer={previewBuffer}
            startSec={startSec}
            windowSec={windowSec}
            onStartSecChange={clampStartSec}
          />
          <div className={styles.timeLabels}>
            <span>
              Preview: {formatTime(0)} / {formatTime(previewDuration)}
            </span>
            <span>
              Section: {formatTime(startSec)} – {formatTime(sectionEnd)}
            </span>
          </div>
          <div className={styles.sectionRow}>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => analyzeCurrentSection()}
              disabled={busyDisabled}
              aria-busy={busy === "analyze"}
            >
              {busy === "analyze" ? (
                <>
                  <span className={styles.spinner} aria-hidden />
                  Analyzing…
                </>
              ) : (
                "Analyze section"
              )}
            </button>
            <button
              type="button"
              className={styles.btn}
              onClick={() => clampStartSec(0)}
              disabled={busyDisabled || startSec === 0}
            >
              Reset to start
            </button>
          </div>
        </div>
      ) : null}

      <p className={styles.hint}>
        Looks up a short Apple Music / iTunes preview clip (~30s), downloads it on the server, then
        analyzes a {windowSec}-second slice into a one-bar 808-style grid. Drag the waveform to pick
        which part of the preview to use. Not every track has a preview; spelling matters.
      </p>

      {busy ? (
        <p className={styles.analyzing} aria-live="polite">
          <span className={styles.spinnerDark} aria-hidden />
          {busy === "fetch"
            ? "Fetching preview and analyzing…"
            : "Analyzing selected section…"}
        </p>
      ) : null}
      {!speechSupported ? (
        <p className={styles.micHint}>Voice dictation for the song field is not available here.</p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {generatedPattern && onSaveToLibrary ? (
        <div className={styles.saveRow}>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => {
              onSaveToLibrary(clonePattern(generatedPattern));
              setGeneratedPattern(null);
            }}
          >
            Save to Saved patterns
          </button>
        </div>
      ) : null}
    </section>
  );
}
