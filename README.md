# 80808 Drum Machine

A browser-based drum machine built with **Next.js** and the **Web Audio API**. It follows the classic 12-voice / 16-step layout found on iconic analog drum machines—without using third-party trademarks in the UI.

## What it does

- **Twelve synthesized voices** — bass drum, snare, toms, percussion, hats, cymbal, and cowbell-style sounds, triggered in real time through Web Audio.
- **Sixteen-step sequencer** — toggle steps per voice on the grid; the transport runs the pattern at your chosen **BPM** with a visible playhead.
- **Pad playing** — click pads on the panel or use the **keyboard map** (for example `1`–`6` and `Q`–`Y`); the legend shows which key maps to which voice.
- **Transport** — play/stop, pattern name, BPM, clear pattern, **save pattern as JSON**, and **import JSON** to load a beat from a file.
- **Starter patterns** — load built-in presets from the preset list; **More** can request additional grooves via an LLM (**optional** `AI_GATEWAY_API_KEY`; otherwise offline random patterns).
- **Persistence** — your pattern is **autosaved in the browser** (`localStorage`) so it comes back on the next visit.
- **Song to 808** — enter **artist** and **song**; the app looks up an **iTunes / Apple Music preview** clip via the public Search API, analyzes that audio in the browser, and loads a one-bar groove into the sequencer (optional **Dictate** for the song field where supported).

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
