---
name: Back to Topics space options
overview: The "Back to Topics" control on the topic page ([src/app/(dashboard)/topics/[topicId]/page.tsx](src/app/(dashboard)/topics/[topicId]/page.tsx)) is a full-width row with a ghost Button and mb-6. Several options can reduce the space it takes.
todos: []
isProject: false
---

# Options to reduce "Back to Topics" space

Current implementation in [src/app/(dashboard)/topics/[topicId]/page.tsx](src/app/(dashboard)/topics/[topicId]/page.tsx):

- Wrapper: `<div className="mb-6">` (24px margin below)
- Link wraps a `<Button variant="ghost" size="sm">` with ArrowLeft icon + "Back to Topics" text
- Button `sm` size is `h-8 px-3 text-xs` from [src/components/ui/button.tsx](src/components/ui/button.tsx)

Space comes from: (1) the margin block, (2) the button’s padding/height, (3) using a full row.

---

## Option A: Shrink margin and use a text link (minimal change)

- Change wrapper from `mb-6` to `mb-3` or `mb-4`.
- Replace the Button with a plain link: same ArrowLeft + "Back to Topics", but use Link with something like `className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"`.
- Result: one less row of “chrome,” lighter look, less vertical space.

---

## Option B: Put back link on the same row as the topic (inline with header)

- Move the back link into the first row of [TopicHeader](src/components/topic-header.tsx) (e.g. left: "Back to Topics", right: topic title), or add a slim row above the header that contains only the back link aligned left.
- Alternatively, keep the back link on the topic page but in a flex row with the TopicHeader block (e.g. back link left, header content right so the back link doesn’t force a full-width row).
- Result: no dedicated full-width row for “Back to Topics”; space is shared with the header.

---

## Option C: Icon-only back with tooltip

- Use only the ArrowLeft icon as the link, with a tooltip "Back to Topics" (e.g. `title` attribute or a proper Tooltip component if the project has one).
- Style as a small icon button or icon link.
- Result: smallest footprint; tradeoff is discoverability for first-time users.

---

## Option D: Back link in the app header (no content area)

- When the route is a topic page, show a “Back” or “Back to Topics” link in the dashboard header ([src/app/(dashboard)/layout.tsx](src/app/(dashboard)/layout.tsx)) next to or near the "Quick Letter" branding.
- Remove the "Back to Topics" block from the topic page entirely.
- Result: no vertical space used in the main content; consistent place for navigation. Requires layout/header logic (e.g. reading pathname or passing a prop).

---

## Recommendation

- **Fastest and low-risk:** Option A (smaller margin + text link).
- **Best use of space:** Option B (share row with header) or Option D (move to header).
- **Minimal UI:** Option C (icon + tooltip) if you’re okay with slightly less obvious affordance.

I can implement any one of these (or a combination, e.g. A + C) once you pick.