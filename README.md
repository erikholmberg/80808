# 80808 Drum Machine

A browser-based drum machine built with **Next.js** and the **Web Audio API**. It follows the classic 12-voice / 16-step layout found on iconic analog drum machines—without using third-party trademarks in the UI.

## What it does

- **Twelve synthesized voices** — bass drum, snare, toms, percussion, hats, cymbal, and cowbell-style sounds, triggered in real time through Web Audio.
- **Sixteen-step sequencer** — toggle steps per voice on the grid; the transport runs the pattern at your chosen **BPM** with a visible playhead.
- **Per-step velocity / accent** — each step cycles through **off → normal → accent**; accented hits play louder than normal hits.
- **Pad playing** — click pads on the panel or use the **keyboard map** (for example `1`–`6` and `Q`–`Y`); the legend shows which key maps to which voice (physical key codes are used so non–US layouts still line up with the digit row).
- **Transport** — play/stop (**Space** toggles play/stop when focus isn’t in a form field), pattern name, BPM, clear pattern, **save pattern as JSON**, and **import JSON** to load a beat from a file.
- **Record** — toggle **Record** to arm live step entry; if playback is stopped, transport starts so the playhead moves. While Record is on and the pattern is playing, each pad or keyboard hit **toggles** that instrument at the **current sequencer step**: adds a hit when the step is off, or **removes** it when that step is already on (the highlighted/yellow cell under the playhead). Stop or Clear disarms Record.
- **Starter patterns** — load built-in presets from the preset list; **More** can request additional grooves via an LLM (**optional** `AI_GATEWAY_API_KEY`; otherwise offline random patterns).
- **Persistence** — your pattern is **autosaved in the browser** (`localStorage`) so it comes back on the next visit.
- **Saved patterns** — after you generate a groove from **Song to 808**, you can **Save to Saved patterns**; stored beats appear in the Saved patterns list (also `localStorage`), where you can reload or delete them.
- **Song to 808** — enter **artist** and **song**; the app calls **`/api/song-preview`** to fetch a short **Apple Music / iTunes preview** via Apple’s public Search API, decodes it in the browser, analyzes a sliding window of that audio into a one-bar grid, and applies it to the sequencer. Optional **Dictate song** fills the title using speech recognition where the browser supports it. Drag the waveform to choose which part of the preview to analyze.
- **Theme** — light / dark mode with persistence; the initial theme is applied before paint to avoid flashing the wrong colors.

## Optional: AI-generated starter patterns

Pressing **More** under Starter patterns calls `/api/starter-patterns` (Vercel AI Gateway). Copy [`.env.example`](.env.example) to `.env.local` and set `AI_GATEWAY_API_KEY` if you want unique LLM grooves; without it, the app uses offline-generated patterns instead.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Development server       |
| `npm run build` | Production build        |
| `npm run start` | Run production server   |
| `npm run lint` | ESLint                   |

## Stack

Next.js (App Router), TypeScript, CSS Modules.
