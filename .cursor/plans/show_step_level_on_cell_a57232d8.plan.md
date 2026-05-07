---
name: Show step level on cell
overview: Render a small numeric level (percentage) inside each active step whose gain differs from 100%, reusing existing `gainAdjusted` logic and mono styling so the grid stays readable in compact mode.
todos:
  - id: stepgrid-span
    content: "StepGrid.tsx: render optional cellGainLabel span when gainAdjusted"
    status: completed
  - id: stepgrid-css
    content: "StepGrid.module.css: flex cell + cellGainLabel typography/contrast"
    status: completed
isProject: false
---

# Show adjusted level on the step cell

## Context

- [`StepGrid.tsx`](src/components/StepGrid.tsx) already computes `gain`, `gainAdjusted` (`on > 0 && Math.abs(gain - 1) > 0.02`), and exposes the value in `aria-label`.
- Cells are `<button>` elements with **no inner content** today; compact rows use small squares ([`.wrapCompact .cell`](src/components/StepGrid.module.css), [`wrapCompactFill`](src/components/StepGrid.module.css)).

## Approach

1. **Inline label (chosen)** — When `gainAdjusted`, render a single child inside the button:
   - `<span className={styles.cellGainLabel} aria-hidden="true">{Math.round(gain * 100)}</span>`
   - Omit the `%` character in the glyph to save width; the legend / slider already imply “percent.” If readability is fine at your breakpoints, optionally append `%` via CSS `::after { content: '%'; font-size: smaller }` or a tiny second span.

2. **Layout / styling** — In [`StepGrid.module.css`](src/components/StepGrid.module.css):
   - Make `.cell` a **flex container** (`display: flex; align-items: center; justify-content: center`) so the number stays centered. Existing aspect-ratio and sizing stay as-is.
   - Add `.cellGainLabel`: `font-family` mono stack (match `.gainValue`), **tabular nums**, `font-size` using **`clamp()`** (e.g. ~`0.45rem`–`0.65rem`) so it scales down in tiny cells.
   - **Color**: use something readable on yellow “on” cells — e.g. `var(--dm-cell-on-text)` from [`globals.css`](src/app/globals.css) or a slightly muted variant so accent/normal/on backgrounds all pass contrast.

3. **Overflow** — If the number clips on the smallest cells, add `min-width: 0`, `overflow: hidden`, `text-overflow: ellipsis` on the label (unlikely for 2–3 digits) or reduce `clamp` minimum slightly.

4. **Accessibility** — Keep the descriptive `aria-label` as the single spoken source; the visible span stays `aria-hidden="true"` to avoid duplication with screen readers.

## Files to touch

| File | Change |
|------|--------|
| [`src/components/StepGrid.tsx`](src/components/StepGrid.tsx) | Conditionally render the span when `gainAdjusted`. |
| [`src/components/StepGrid.module.css`](src/components/StepGrid.module.css) | Flex on `.cell`, new `.cellGainLabel` rules (and tweak `.cellOn` / `.cellAccent` only if contrast needs a token switch). |

## Verification

- Manually: adjust level on a step → number appears; at 100% or step off → number hidden; compact + fill-height layout still legible.
- `npm run build`

No changes to [`pattern.ts`](src/state/pattern.ts) or playback logic — display-only.
