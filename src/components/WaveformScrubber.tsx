"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "./WaveformScrubber.module.css";

type Peaks = { min: Float32Array; max: Float32Array };

function monoFromBuffer(buf: AudioBuffer): Float32Array {
  const len = buf.length;
  const out = new Float32Array(len);
  const nCh = buf.numberOfChannels;
  if (nCh === 0) return out;
  for (let c = 0; c < nCh; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < len; i++) out[i] += ch[i]!;
  }
  const inv = 1 / nCh;
  for (let i = 0; i < len; i++) out[i] *= inv;
  return out;
}

function computePeaks(mono: Float32Array, bins: number): Peaks {
  const min = new Float32Array(bins);
  const max = new Float32Array(bins);
  const len = mono.length;
  if (len === 0 || bins < 1) return { min, max };

  for (let b = 0; b < bins; b++) {
    const i0 = Math.floor((b * len) / bins);
    const i1 = Math.floor(((b + 1) * len) / bins);
    let lo = mono[i0] ?? 0;
    let hi = lo;
    for (let i = i0; i < i1; i++) {
      const s = mono[i]!;
      if (s < lo) lo = s;
      if (s > hi) hi = s;
    }
    min[b] = lo;
    max[b] = hi;
  }
  return { min, max };
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  buffer: AudioBuffer;
  startSec: number;
  windowSec: number;
  onStartSecChange: (sec: number) => void;
};

export function WaveformScrubber({ buffer, startSec, windowSec, onStartSecChange }: Props) {
  const duration = buffer.duration;
  const maxStart = Math.max(0, duration - windowSec);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cssWidth, setCssWidth] = useState(320);
  const dragRef = useRef(false);

  const mono = useMemo(() => monoFromBuffer(buffer), [buffer]);
  const peaks = useMemo(() => computePeaks(mono, Math.max(32, cssWidth)), [mono, cssWidth]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setCssWidth(Math.max(32, Math.floor(el.clientWidth)));
    });
    ro.observe(el);
    setCssWidth(Math.max(32, Math.floor(el.clientWidth)));
    return () => ro.disconnect();
  }, []);

  const timeFromClientX = (clientX: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    return Math.min(duration, Math.max(0, ratio * duration));
  };

  const applyTimeAsStart = useCallback(
    (t: number) => {
      const clamped = Math.min(maxStart, Math.max(0, t));
      onStartSecChange(clamped);
    },
    [maxStart, onStartSecChange],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = true;
    applyTimeAsStart(timeFromClientX(e.clientX));
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    applyTimeAsStart(timeFromClientX(e.clientX));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = false;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const step = e.shiftKey ? 1 : 0.1;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      applyTimeAsStart(startSec - step);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      applyTimeAsStart(startSec + step);
    } else if (e.key === "Home") {
      e.preventDefault();
      applyTimeAsStart(0);
    } else if (e.key === "End") {
      e.preventDefault();
      applyTimeAsStart(maxStart);
    }
  };

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!Number.isFinite(duration) || duration <= 0) return;

    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const hCss = 64;
    canvas.style.width = "100%";
    canvas.style.height = `${hCss}px`;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(hCss * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const w = cssWidth;
    const h = hCss;
    ctx.clearRect(0, 0, w, h);

    const cs = getComputedStyle(canvas);
    const muted = cs.getPropertyValue("--dm-text-muted").trim() || "#888";
    const accent = cs.getPropertyValue("--dm-accent").trim() || "#3b82f6";
    const bg = cs.getPropertyValue("--dm-bg").trim() || "#111";

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    let norm = 1e-9;
    for (let i = 0; i < peaks.min.length; i++) {
      norm = Math.max(norm, Math.abs(peaks.min[i]!), Math.abs(peaks.max[i]!));
    }
    const cy = h / 2;
    const amp = (h / 2 - 4) * 0.92;
    const bins = peaks.min.length;

    ctx.strokeStyle = muted;
    ctx.lineWidth = 1;
    for (let i = 0; i < bins; i++) {
      const x = (i / bins) * w + 0.5;
      const y1 = cy - (peaks.max[i]! / norm) * amp;
      const y2 = cy - (peaks.min[i]! / norm) * amp;
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
    }

    const x0 = (startSec / duration) * w;
    const x1 = (Math.min(startSec + windowSec, duration) / duration) * w;
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(x0, 0, Math.max(1, x1 - x0), h);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < bins; i++) {
      const t0 = (i / bins) * duration;
      const t1 = ((i + 1) / bins) * duration;
      if (t1 < startSec || t0 > startSec + windowSec) continue;
      const x = (i / bins) * w + 0.5;
      const y1 = cy - (peaks.max[i]! / norm) * amp;
      const y2 = cy - (peaks.min[i]! / norm) * amp;
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const mx = (startSec / duration) * w;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx + 0.5, 0);
    ctx.lineTo(mx + 0.5, h);
    ctx.stroke();
  }, [cssWidth, duration, peaks, startSec, windowSec]);

  const endSec = Math.min(startSec + windowSec, duration);
  const ariaMax = duration >= windowSec ? maxStart : 0;

  return (
    <div className={styles.wrap}>
      <div ref={wrapRef} className={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          role="slider"
          tabIndex={0}
          aria-label="Preview section start"
          aria-valuemin={0}
          aria-valuemax={ariaMax}
          aria-valuenow={Math.round(startSec * 100) / 100}
          aria-valuetext={`${formatTime(startSec)} to ${formatTime(endSec)} of ${formatTime(duration)}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        />
      </div>
      <p className={styles.label} aria-hidden>
        Drag the waveform or use arrow keys to move the start of the {windowSec.toFixed(0)}s analysis
        window. Section: {formatTime(startSec)} – {formatTime(endSec)} · Preview {formatTime(duration)}
      </p>
    </div>
  );
}
