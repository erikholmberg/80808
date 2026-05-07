---
name: Research by tab category
overview: Add the ability to run research for only the selected tab category (Websites, Articles, Images, or Videos) near the Research items tabs. The backend research API must be extended to accept an optional category filter; the UI can be implemented in several ways.
todos: []
isProject: false
---

# Research by selected tab category

## Current behavior

- **"Research All"** lives in the topic header (`[src/components/topic-header.tsx](src/components/topic-header.tsx)`) and calls `POST /api/topics/[topicId]/research` with no body.
- The research route (`[src/app/api/topics/[topicId]/research/route.ts](src/app/api/topics/[topicId]/research/route.ts)`) runs **all four** Serper calls in parallel via `[searchTopic](src/lib/serper.ts)` (organic search, news, images, videos), merges results, scores relevance, and creates items. There is no way to run only one category today.
- Tabs are in `[src/components/topic-tabs.tsx](src/components/topic-tabs.tsx)`: Websites, Articles, Images, Videos. The row next to the tabs has the "Reorder" button when there are 2+ items in the current tab.

## Backend change (required for any option)

Extend the research API to accept an optional filter so it only runs and creates items for one category:

1. **API** – In `[src/app/api/topics/[topicId]/research/route.ts](src/app/api/topics/[topicId]/research/route.ts)`:
  - Read optional body: `{ types?: ("WEBSITE" | "ARTICLE" | "IMAGE" | "VIDEO")[] }`. If `types` is a single category (e.g. `["VIDEO"]`), only run the corresponding Serper endpoint(s) and only push/process that type into `rawItems`; still use the same relevance scoring and `lastResearchAt` update.
  - Validate: if present, `types` must be a non-empty subset of the four; otherwise treat as "all" (current behavior).
2. **Serper** – In `[src/lib/serper.ts](src/lib/serper.ts)`:
  - Extend `SearchTopicOptions` with an optional `types?: ("WEBSITE" | "ARTICLE" | "IMAGE" | "VIDEO")[]`.
  - In `searchTopic`, when `types` is provided, only call the relevant Serper endpoints (e.g. only `/videos` for VIDEO), and return empty arrays for the omitted types. This saves API calls and keeps the research route logic simple.

No change to the cron job is required for "Research All"; category-specific research is manual-only unless you later add cron support for specific types.

---

## UI options (choose one or combine)

### Option A: Single “Research this tab” button next to the tabs

- **Placement:** In the same row as the tabs in `[topic-tabs.tsx](src/components/topic-tabs.tsx)`, e.g. next to the existing “Reorder” button (or on the left of that row).
- **Behavior:** One button, label depends on active tab: “Research Websites”, “Research Articles”, “Research Images”, “Research Videos”. Click calls `POST …/research` with body `{ types: [currentType] }` (e.g. `getCurrentType()` → `"VIDEO"` → `{ types: ["VIDEO"] }`).
- **Pros:** Minimal UI, clear that it’s “research for what I’m looking at”.  
- **Cons:** Users must switch to a tab before researching that category.

### Option B: Small “Research” control inside each tab’s content

- **Placement:** At the top of each tab’s content (above the list in each `TabsContent`), e.g. a text link or small button: “Find more websites” / “Find more videos”.
- **Behavior:** Same API call as Option A, with the type fixed per tab.
- **Pros:** Very contextual; always obvious which category is being researched.  
- **Cons:** Four repeated controls; slightly more UI.

### Option C: Header dropdown: “Research All” vs “Research [category]”

- **Placement:** In the topic header (`[topic-header.tsx](src/components/topic-header.tsx)`) next to the current “Research All” button: e.g. a dropdown (or split button) with “Research All” plus “Research Websites”, “Research Articles”, “Research Images”, “Research Videos”.
- **Behavior:** Choosing an option calls the same research API with no body (all) or `{ types: [type] }` for that category.
- **Pros:** Single place for all research actions; power users can pick category without going to the tab.  
- **Cons:** Category research is not “next to” the tabs; users might not discover it when focused on a tab.

### Option D: Both header and tab-area (recommended baseline)

- **Placement:** Keep “Research All” in the header. Add one “Research [current tab]” button near the tabs (Option A).
- **Behavior:** Header = research all. Tab row = research only the selected tab’s category (same API with `types`).
- **Pros:** “Research All” stays where it is; “research this category” is exactly where the user is looking (tabs).  
- **Cons:** Two places that trigger research (intentional).

---

## Implementation summary


| Step | Description                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Extend `[src/lib/serper.ts](src/lib/serper.ts)`: add optional `types` to `SearchTopicOptions`; in `searchTopic`, only call Serper endpoints for requested types and return empty arrays for others.                                                                                                                                                                                                             |
| 2    | Extend `[src/app/api/topics/[topicId]/research/route.ts](src/app/api/topics/[topicId]/research/route.ts)`: parse optional body `types`; pass to `searchTopic`; only process and create items for those types (same relevance and position logic as today).                                                                                                                                                      |
| 3    | UI (per chosen option): Add “Research this tab” in `[topic-tabs.tsx](src/components/topic-tabs.tsx)` (Option A or D), and/or header dropdown in `[topic-header.tsx](src/components/topic-header.tsx)` (Option C), and/or per-tab link (Option B). Use existing loading/error/success pattern from the header’s `runResearch` (e.g. disable button, show “Found N new items” or error, then `router.refresh()`). |


If you tell me which option (A–D) you prefer, the next step is to implement that UI plus the backend and Serper changes above.