---
name: Image Grid Layout
overview: Transform IMAGE and VIDEO items from a vertical list layout to a 5-across grid layout with hover overlays showing title/metadata and action buttons. The grid will focus on the visual content while keeping essential actions accessible.
todos: []
---

# Image Grid Layout Implementation

## Overview

Convert IMAGE and VIDEO research items from a full-width list format to a compact 5-column grid layout that emphasizes the visual content. Each grid item will show the image/video thumbnail prominently, with title and metadata appearing in an overlay on hover, along with action buttons.

## Files to Modify

### 1. `src/components/research-item-list.tsx`

- **Conditional rendering**: Add logic to detect when `type === "IMAGE" || type === "VIDEO"` and render a grid layout instead of the list layout
- **Grid container**: Create a new grid container with `grid-cols-5` (responsive: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`)
- **Grid item component**: Create a new `GridItem` component that:
  - Displays the image/video thumbnail as the primary visual (aspect ratio maintained)
  - Shows title, dimensions, and metadata in an overlay that appears on hover
  - Displays action buttons (star, hide, external link, edit, delete) in the hover overlay
  - Maintains visual indicators for starred (yellow border/background) and dimmed (opacity) states
  - Supports click to open image/video in new tab
- **Drag and drop**: Adapt drag-and-drop for grid layout using `@dnd-kit` with a grid sorting strategy
- **Reordering mode**: When reordering is enabled, show drag handles on grid items
- **Hidden items**: Keep hidden items in the existing compact list format below the grid

### 2. Responsive Design

- **Mobile (< 640px)**: 2 columns
- **Tablet (640px - 768px)**: 3 columns  
- **Desktop (768px - 1024px)**: 4 columns
- **Large desktop (≥ 1024px)**: 5 columns

## Implementation Details

### Grid Item Structure

```
┌─────────────────┐
│                 │
│   Image/Video   │
│   Thumbnail     │
│                 │
│  [Hover Overlay]│ ← Title, metadata, actions
└─────────────────┘
```

### Hover Overlay Content

- Title (truncated if long)
- Image dimensions (if available)
- File size (if available)
- Action buttons: Star, Hide, External Link, Edit, Delete
- Visual indicator for starred state (yellow accent)
- Visual indicator for dimmed state (reduced opacity)

### Key Features to Preserve

- Star/unstar functionality
- Hide/show functionality
- Click to open in new tab
- Edit item dialog
- Delete item
- Drag-and-drop reordering (when enabled)
- Search/filter compatibility
- New item indicator (blue badge)
- Clicked state tracking

### Technical Considerations

- Use CSS Grid for layout
- Maintain aspect ratio for images (suggest 16:9 or 4:3)
- Use Next.js Image component with proper sizing
- Handle data URLs for images
- Ensure hover states work on touch devices (use `hover:` classes with `group`)
- Preserve existing state management and API calls
- Keep the same item data structure

## Visual Design

- Grid items: Rounded corners, subtle border, hover elevation
- Overlay: Semi-transparent dark background with white text
- Actions: Compact icon buttons in overlay
- Starred: Yellow border or background tint
- Dimmed: 50% opacity
- New items: Blue accent border or badge