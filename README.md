# 80808 Drum Machine

A browser-based drum machine built with **Next.js** and the **Web Audio API**. It follows the classic 12-voice / 16-step layout found on iconic analog drum machines—without using third-party trademarks in the UI.

## What it does

- **Twelve synthesized voices** — bass drum, snare, toms, percussion, hats, cymbal, and cowbell-style sounds, triggered in real time through Web Audio.
- **Sixteen-step sequencer** — toggle steps per voice on the grid; the transport runs the pattern at your chosen **BPM** with a visible playhead. Use the **?** help control on the sequencer card for editing shortcuts.
- **Per-step velocity, accent, and level** — tap a cell to cycle **off → normal → accent** (accented hits play louder). **Hold** an on-step to adjust its **level** (mix) with a slider; adjusted levels show on the cell when they differ from 100%.
- **Pad playing** — click pads on the panel or use the **keyboard map** (for example `1`–`6` and `Q`–`Y`); the legend shows which key maps to which voice (physical key codes are used so non–US layouts still line up with the digit row).
- **Transport** — play/stop (**Space** toggles play/stop when focus isn’t in a form field), pattern name, BPM, **Clear**, **Undo**, **Redo**, and **Save**. **Save** stores the current pattern in **Saved patterns** (browser `localStorage`), where you can reload or delete it later alongside built-in starters.
- **Undo / redo** — **Undo** and **Redo** buttons (or **⌘Z / Ctrl+Z** and **⌘⇧Z / Ctrl+Shift+Z** or **Ctrl+Y**) revert pattern edits including grid changes, name, BPM, presets, paste, and clear. History keeps up to 80 steps.
- **Copy / paste** — select a **voice label** (row) or a **step number** (column, all voices at that step), then **⌘C / ⌘V** (Ctrl+C / Ctrl+V) to copy and paste that slice. **⌘⇧C / ⌘⇧V** (Ctrl+Shift+C / Ctrl+Shift+V) copies or pastes the **full bar** (all 12 voices × 16 steps). Clips use a small JSON payload on the clipboard (`80808Clip`: `row`, `column`, or `bar`).
- **Record** — toggle **Record** to arm live step entry; if playback is stopped, transport starts so the playhead moves. While Record is on and the pattern is playing, each pad or keyboard hit **toggles** that instrument at the **current sequencer step**: adds a hit when the step is off, or **removes** it when that step is already on (the highlighted cell under the playhead). Stop or Clear disarms Record.
- **Starter patterns** — open **Saved patterns** in the transport bar to load built-in presets or your saved beats; **More** can request additional grooves via an LLM (**optional** `AI_GATEWAY_API_KEY`; otherwise offline random patterns).
- **Persistence** — your working pattern is **autosaved in the browser** (`localStorage`) so it comes back on the next visit.
- **Theme** — light / dark mode with persistence; the initial theme is applied before paint to avoid flashing the wrong colors.

## Optional: AI-generated starter patterns

Pressing **More** in the Saved patterns popover calls `/api/starter-patterns` (Vercel AI Gateway). Copy [`.env.example`](.env.example) to `.env.local` and set `AI_GATEWAY_API_KEY` if you want unique LLM grooves; without it, the app uses offline-generated patterns instead.

## In the repo (not on the home page)

**Song to 808** — [`src/components/SongBeatPanel.tsx`](src/components/SongBeatPanel.tsx) and [`/api/song-preview`](src/app/api/song-preview/route.ts) look up an Apple Music / iTunes preview, analyze a scrubbable window into a one-bar grid, and can apply it to the sequencer (optional speech input for the title). This panel is **not mounted** in the current [`DrumMachine`](src/app/components/DrumMachine.tsx) UI; wire it in if you want that flow on the main page.

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
