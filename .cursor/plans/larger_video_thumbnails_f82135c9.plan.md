---
name: Larger Video Thumbnails
overview: Improve video research item thumbnails by enhancing image quality fetching (especially for YouTube) to retrieve higher resolution images.
todos:
  - id: enhance-thumbnail-fetching
    content: Create async function to verify and fetch best available YouTube thumbnail quality with fallback chain
    status: completed
  - id: update-research-route
    content: Update research route to use improved thumbnail fetching with verification
    status: completed
  - id: update-cron-route
    content: Apply same thumbnail enhancement to cron research route
    status: completed
isProject: false
---

# Plan: Larger Video Research Item Thumbnails

## Current State

1. **Thumbnail Enhancement**: The `enhanceVideoThumbnailUrl` function in `[src/app/api/topics/[topicId]/research/route.ts](src/app/api/topics/[topicId]/research/route.ts)` attempts to upgrade YouTube thumbnails to `maxresdefault.jpg` (1280×720) but doesn't verify if the URL exists before using it.
2. **YouTube Thumbnail Sizes Available**:

- `maxresdefault.jpg` - 1280×720 (may not always exist)
- `sddefault.jpg` - 640×480
- `hqdefault.jpg` - 480×360
- `mqdefault.jpg` - 320×180
- `default.jpg` - 120×90

## Changes Required

### 1. Improve Thumbnail Quality Fetching

**File**: `[src/app/api/topics/[topicId]/research/route.ts](src/app/api/topics/[topicId]/research/route.ts)`

- Enhance `enhanceVideoThumbnailUrl` to verify thumbnail URLs exist before using them
- Implement fallback chain: `maxresdefault.jpg` → `sddefault.jpg` → `hqdefault.jpg` → `mqdefault.jpg` → original
- Add async verification function that checks if a URL returns a valid image (HEAD request or fetch with small timeout)
- Apply the same enhancement logic to the cron research route at `[src/app/api/cron/research/route.ts](src/app/api/cron/research/route.ts)`

### 2. Implementation Details

**Thumbnail Verification Function**:

- Create a helper function that attempts to fetch thumbnail URLs in order of quality
- Use a short timeout (2-3 seconds) to avoid blocking
- Return the first URL that successfully loads, or fallback to original

**YouTube URL Pattern**:

- Extract video ID from various YouTube URL formats
- Construct thumbnail URLs: `https://i.ytimg.com/vi/{videoId}/{quality}.jpg`
- Try qualities in descending order of resolution

## Files to Modify

1. `[src/app/api/topics/[topicId]/research/route.ts](src/app/api/topics/[topicId]/research/route.ts)` - Enhance thumbnail fetching with verification
2. `[src/app/api/cron/research/route.ts](src/app/api/cron/research/route.ts)` - Apply same enhancement

## Testing Considerations

- Test with various YouTube video URLs
- Verify fallback behavior when `maxresdefault.jpg` doesn't exist
- Test with non-YouTube video sources to ensure they still work
- Verify that higher resolution thumbnails are successfully fetched and stored

