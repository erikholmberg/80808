---
name: Record mode pads
overview: Add a transport Record toggle that starts playback when needed, tracks the sequencer’s current step via a ref updated inside the audio loop, and on each pad/key hit turns on the corresponding grid cell at that step—without changing unrelated pad behavior when Record is off.
todos:
  - id: pattern-helper
    content: Add setStepValue (or equivalent) to src/state/pattern.ts
    status: completed
  - id: drum-machine-logic
    content: Recording state/refs, recordStepRef in RAF loop, pad wrappers, stop/clear disarm
    status: completed
  - id: tr808-ui
    content: Record button + styles and props on Tr808Panel
    status: completed
  - id: readme
    content: Document Record in README
    status: completed
isProject: false
---

# Record mode for live step entry

## Behavior (agreed defaults)

- **Record** is a **toggle** next to Play/Stop (same transport row in [`src/components/Tr808Panel.tsx`](src/components/Tr808Panel.tsx)).
- **Turn Record on**: set recording armed; if transport is stopped, **start playback** (same as Play—calls existing `touchCtx` path).
- **Turn Record off**: only disarm recording; playback keeps running until Stop.
- **Stop** (button or Space): stop transport and **disarm** recording so state stays intuitive.
- While recording and transport is running, **each pad down** (pointer or keyboard, respecting existing `e.repeat` / modifier rules): **set that voice’s cell at the current sequencer step to on** (additive; idempotent if already on). Live preview still uses existing `playVoice` via `beginVoice`.
- While **not** recording, pads behave exactly as today.

Optional later refinement (out of scope unless you want it): second hit on the same pad/step **toggles off**; Record-only blocking of grid clicks.

## Why a ref for “current step”

React `playhead` state updates once per frame ([`DrumMachine.tsx`](src/app/components/DrumMachine.tsx) RAF loop). Pad hits need the **scheduler’s step index**, not a stale closure. Plan: maintain **`recordStepRef: React.MutableRefObject<number | null>`**, updated **inside the same `while` loop** that schedules notes—set `recordStepRef.current = step` for each scheduled step (and initialize when priming the loop, e.g. treat step `0` as active once scheduling begins). On pad down during record, read `recordStepRef.current`; if `null` or not playing, skip writing to the grid.

## Keep the running sequencer in sync with new hits

`patternRef` is synced from React state in a `useEffect` ([`DrumMachine.tsx`](src/app/components/DrumMachine.tsx)), which can lag one frame behind `setPattern`. When applying a recorded hit, update **`patternRef.current` inside the same `setPattern` functional updater** (assign the computed next pattern to `patternRef` before returning) so the next iterations of the RAF loop see new steps immediately.

## Code changes

1. **[`src/state/pattern.ts`](src/state/pattern.ts)**  
   Add a small helper, e.g. `setStepValue(grid, row, col, value: boolean): StepGrid`, immutable row copy—mirrors style of `toggleStep`.

2. **[`src/app/components/DrumMachine.tsx`](src/app/components/DrumMachine.tsx)**  
   - State: `recording` + `recordingRef` (keep ref in sync with state in a `useEffect`, same pattern as `playingRef`).  
   - Refs: `recordStepRef` as above; update it in the existing playback `useEffect` loop.  
   - Handlers: wrap pad path—introduce `handlePadDown(v)` / `handlePadUp(v)` that call record placement on down when `recordingRef.current && playingRef.current`, then delegate to current `beginVoice`/`endVoice`. Wire [`Tr808Panel`](src/components/Tr808Panel.tsx) and the keyboard listener to these wrappers instead of raw `beginVoice`/`endVoice`.  
   - Record toggle callback: set recording on/off; when turning on and `!playing`, call existing `onPlay` logic.  
   - **Stop** path (`onStop`, Space → stop): also `setRecording(false)`. Optionally disarm record on **Clear** ([`onClear`](src/app/components/DrumMachine.tsx)) for predictable resets.  
   - Pass `recording` + record toggle into `Tr808Panel`.

3. **[`src/components/Tr808Panel.tsx`](src/components/Tr808Panel.tsx)** + **[`Tr808Panel.module.css`](src/components/Tr808Panel.module.css)**  
   - New props: `recording: boolean`, `onRecordToggle: () => void` (or explicit on/off).  
   - Button: **Record**, `aria-pressed={recording}`, visible active style (e.g. accent border/background consistent with existing `--dm-accent` tokens).

4. **[`README.md`](README.md)**  
   One bullet under “What it does” describing Record (toggle, starts transport if stopped, pads write to current step).

## Testing (manual)

- Record off: pads and keys unchanged.  
- Record on from stopped: pattern plays and playhead moves; pad hits fill grid column under playhead.  
- Record on while already playing: arms without restarting.  
- Stop disarms Record; grid edits still work.  
- Rapid BPM: hits stay aligned to steps (no duplicate column writes from key repeat—already blocked).
