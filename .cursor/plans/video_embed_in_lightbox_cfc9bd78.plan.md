---
name: Video embed in lightbox
overview: When a VIDEO research item is opened in the lightbox, show an embedded playable player (YouTube, Vimeo, etc.) instead of only the static thumbnail.
todos: []
isProject: false
---

# Plan: Embedded playable videos in lightbox

## Current behavior

- The lightbox is used for both **Images** and **Videos** tabs (grid view). Clicking a card opens [LightboxModal](src/components/research-item-list.tsx) in `research-item-list.tsx`.
- The modal always renders the item’s **thumbnail image** (`currentImageUrl` / `currentItem.imageUrl`). For VIDEO items it shows that same thumbnail and a Video icon fallback; there is no embed.
- Relevant content block: around lines 1645–1696 (comment "Image/Video" and the conditional that renders `<img>` or icon placeholders).

## Approach

1. **URL-to-embed mapping**

When `currentItem.type === "VIDEO"` and we have `currentItem.url`, derive an embed URL for supported platforms. Do this in the same file (or a small helper) to avoid new dependencies.

1. **Lightbox content logic**

In `LightboxModal`:

- If `currentItem.type === "VIDEO"` and we have a valid **embed URL**: render an **iframe** (or platform-specific embed) as the main content, with 16:9 aspect ratio.
- If VIDEO but no embed URL (unsupported or parse failure): keep current behavior (thumbnail + Video icon fallback).
- If `currentItem.type === "IMAGE"`: keep current behavior (image only).

1. **Embed URL rules** (to implement in code):

- **YouTube**: `youtube.com/watch?v=ID`, `youtu.be/ID` → `https://www.youtube.com/embed/ID`
- **Vimeo**: `vimeo.com/ID` or `player.vimeo.com/video/ID` → `https://player.vimeo.com/video/ID`
- **Dailymotion**: `dailymotion.com/video/ID` → `https://www.dailymotion.com/embed/video/ID`
- **TikTok / Facebook / others**: either add embed patterns where well-documented and stable, or treat as “no embed” and keep thumbnail + link.

1. **UI details**

- Use a responsive 16:9 container for the iframe (e.g. max width, aspect-ratio box).
- Keep existing lightbox chrome: prev/next, close, footer with title, description, “Open in new tab” (using `currentItem.url`), star, delete, etc.
- Optional: small “Watch on [platform]” link below the embed that opens `currentItem.url` in a new tab.

1. **Preload / transitions**

The current preload logic is image-based. For VIDEO items with embed, no image preload is needed for the main content; keep preload for adjacent IMAGE items and for VIDEO items that fall back to thumbnail. Avoid loading multiple iframes (e.g. only mount iframe for the current index) to limit memory and API usage.

## Files to change

- [src/components/research-item-list.tsx](src/components/research-item-list.tsx)
- Add a helper (e.g. `getVideoEmbedUrl(url: string): string | null`) that returns an embed URL for known platforms, or `null`.
- In `LightboxModal`, when `currentItem.type === "VIDEO"` and `embedUrl = getVideoEmbedUrl(currentItem.url)` is not null, render the iframe in the main content area instead of the thumbnail image; otherwise keep thumbnail/fallback.
- Optionally hide or repurpose image dimension/size in the footer for VIDEO embed (e.g. show “Video” or platform name instead of dimensions).

## Out of scope

- No backend or API changes.
- No change to how VIDEO items are fetched or stored (thumbnail logic stays as-is).
- Unsupported video URLs continue to show thumbnail + “Open” link as today.

