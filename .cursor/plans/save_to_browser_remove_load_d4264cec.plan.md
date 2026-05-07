---
name: Save to browser remove Load
overview: Replace the transport bar’s JSON file download with “save to Saved patterns” (localStorage library), remove the Load/file-import flow from the panel for now, and adjust copy so it matches the new behavior.
todos:
  - id: drum-machine-save-remove-import
    content: "DrumMachine: Save → savePatternToLibrary(pattern); remove file import plumbing; update header copy; add brief Saved feedback + aria-live on success"
    status: completed
  - id: drum-machine-panel
    content: "RhythmPanel: remove Load; rename onSaveFile → onSave; wire new prop"
    status: completed
  - id: saved-panel-copy
    content: "SavedPatternsPanel: update empty-state copy for transport Save"
    status: completed
isProject: false
---

# Save to browser, remove Load

## Current behavior

- **Save** in [`RhythmPanel`](src/components/RhythmPanel.tsx) calls [`onSaveFile`](src/app/components/DrumMachine.tsx) → downloads `pattern` as a `.json` blob.
- **Load** opens a hidden `<input type="file">` and [`onFile`](src/app/components/DrumMachine.tsx) parses JSON into the active pattern.
- The **active pattern** is already persisted continuously via `useEffect` → `localStorage.setItem("80808-beat-v1", …)` in [`DrumMachine.tsx`](src/app/components/DrumMachine.tsx) (lines ~125–131).
- The **Saved patterns library** (array) uses [`persistSavedPatterns`](src/state/savedPatterns.ts) / `"80808-saved-patterns-v1"`. [`savePatternToLibrary`](src/app/components/DrumMachine.tsx) (lines ~347–361) already appends a normalized entry with a new id—this is what the song panel’s “Save to Saved patterns” uses.

## Target behavior (per your choice)

1. **Save** → call the same logic as `savePatternToLibrary` with the **current** `pattern` (append to `savedEntries`, which syncs to localStorage). No JSON download.
2. **Load** → remove button, handler, hidden file input, and `fileRef` / `onFile` from [`DrumMachine.tsx`](src/app/components/DrumMachine.tsx).
3. **Copy** → update the header subtitle (“save patterns as JSON”) and [`SavedPatternsPanel`](src/components/SavedPatternsPanel.tsx) empty state (currently only mentions generating from a song).
4. **Rename prop** → `onSaveFile` → `onSave` on [`RhythmPanel`](src/components/RhythmPanel.tsx) and pass the updated prop from [`DrumMachine.tsx`](src/app/components/DrumMachine.tsx).
5. **Save feedback** → after a successful save to the library, show a short “Saved” indication (e.g. transient UI state next to the transport or via `aria-live="polite"` so assistive tech announces it). Clear or reset after ~1.5–2s; avoid blocking repeat saves.

## Files to change

| File | Change |
|------|--------|
| [`src/app/components/DrumMachine.tsx`](src/app/components/DrumMachine.tsx) | Wire `onSave` to `savePatternToLibrary(pattern)`. Remove `fileRef`, hidden file `<input>`, `onImportClick`, and `onFile`. Tweak intro copy. Implement save-success feedback (state + `aria-live` region or equivalent). |
| [`src/components/RhythmPanel.tsx`](src/components/RhythmPanel.tsx) | Rename `onSaveFile` → `onSave`. Drop `onImportClick` from props and remove the **Load** button. If feedback lives in the panel, add optional props (e.g. `saveAcknowledged?: boolean` or `saveMessage?: string`) or render a sibling live region from the parent—choose the least awkward fit for layout. |
| [`src/components/SavedPatternsPanel.tsx`](src/components/SavedPatternsPanel.tsx) | Empty-state text: mention saving from the machine (e.g. Save on the transport) in addition to the song flow. |

## Verification

- Run `npm run build` (and smoke-test: Save adds a row under **Saved patterns**, selecting a row loads it, deleting works; no file picker remains).
