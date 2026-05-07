---
name: Product Feature Roadmap
overview: Feature recommendations for Quick Letter as a research and drafting tool that makes it delightful to research and write newsletters before copying to your publisher of choice.
todos: []
---

# Product Feature Roadmap for Quick Letter

## Product Vision

Quick Letter is a **delightful research and drafting tool** for newsletter writers. The goal is to make the research-to-draft workflow seamless and enjoyable, then make it effortless to export your polished draft to Substack, Ghost, Mailchimp, or any other publishing platform. We don't compete with publishers—we make writers better prepared before they publish.

## Current State Analysis

### Strengths

- Strong AI-powered research aggregation
- Effective draft generation with customization
- Good content organization (star, dim, reorder)
- Background automation (cron jobs)
- Rich text editing capabilities
- Clean copy-to-clipboard functionality

### Key Gaps & Opportunities

1. **Limited export formats** - Only HTML copy/paste and download
2. **No platform-specific formatting** - Drafts aren't optimized for specific publishers
3. **Single draft per topic** - No versioning or multiple drafts
4. **Basic filtering** - Hard to find items in large research collections
5. **No research notes** - Can't annotate why items are relevant
6. **Limited search** - No full-text search across items

---

## Priority 1: Seamless Export & Integration (Critical)

### 1.1 Platform-Specific Export Formats

**Impact:** Critical - Makes it effortless to move drafts to publishers

**Complexity:** Medium

**Features:**

- **Substack export** - Format draft for Substack's editor (Markdown + metadata)
- **Ghost export** - Format for Ghost CMS (HTML + frontmatter)
- **Mailchimp export** - Email-friendly HTML with proper inline styles
- **ConvertKit export** - ConvertKit-compatible format
- **WordPress export** - Blog post format with categories/tags
- **Plain Markdown** - Universal format for any Markdown editor
- **Plain HTML** - Enhanced HTML export (already have basic)

**Implementation:**

- Create export formatters in `src/lib/exports/`
- Platform detection (user selects target)
- Handle image links (convert to hosted URLs if needed)
- Preserve formatting, links, and structure
- One-click export button in draft editor

### 1.2 Enhanced Copy Functionality

**Impact:** High - Most users will copy-paste

**Complexity:** Low-Medium

**Features:**

- **Copy with formatting** - Already have HTML copy, enhance it
- **Copy as Markdown** - Alternative format
- **Smart paste detection** - Detect if user is pasting into Substack/Ghost and format accordingly
- **Copy preview** - Show what will be copied before copying
- **Keyboard shortcut** - Cmd+Shift+C for copy with formatting

### 1.3 Export Templates & Presets

**Impact:** Medium-High - Saves time for repeat users

**Complexity:** Low

**Features:**

- Save export preferences (default platform)
- Custom export templates (add metadata, frontmatter)
- Export settings per topic (different platforms for different topics)

---

## Priority 2: Enhanced Research & Organization (High Value)

### 2.1 Advanced Filtering & Search

**Impact:** High - Essential for managing large research collections

**Complexity:** Medium

**Features:**

- **Full-text search** - Search across titles, descriptions, summaries, sources
- **Multi-filter interface** - Combine filters (type, status, date, relevance, source)
- **Filter presets** - Save common filter combinations
- **Date range picker** - Filter by when items were found
- **Source domain filter** - Filter by domain (e.g., only show arxiv.org)
- **Relevance score slider** - Show only items above X% relevance
- **Bulk actions** - Select multiple items to star/dim/delete

**Implementation:**

- Add search index (could use Prisma full-text search or external)
- Enhance `research-item-list.tsx` with filter UI
- Add filter state management
- Persist filters in URL params for sharing/bookmarking

### 2.2 Tags & Categories

**Impact:** High - Better organization for complex topics

**Complexity:** Medium

**Features:**

- **Tags on research items** - Multiple tags per item
- **Color-coded tags** - Visual organization
- **Topic-level tags** - Tags that apply to all items in a topic
- **Filter by tags** - Use tags in advanced filtering
- **Tag suggestions** - AI suggests tags based on content
- **Bulk tag assignment** - Tag multiple items at once
- **Tag-based draft generation** - Generate drafts from specific tags

**Schema Addition:**

```prisma
model Tag {
  id        String   @id @default(cuid())
  name      String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  color     String?  // Hex color for UI
  topicId   String?  // If topic-specific
  createdAt DateTime @default(now())
  
  items     ResearchItemTag[]
}

model ResearchItemTag {
  itemId   String
  tagId    String
  item     ResearchItem @relation(fields: [itemId], references: [id])
  tag      Tag          @relation(fields: [tagId], references: [id])
  
  @@unique([itemId, tagId])
  @@index([tagId])
}
```

### 2.3 Research Item Notes & Highlights

**Impact:** High - Helps capture why items are relevant

**Complexity:** Low-Medium

**Features:**

- **Private notes** - Add notes to research items (e.g., "Good for intro paragraph")
- **Highlight quotes** - Select and highlight key excerpts from descriptions
- **Note templates** - Quick notes like "Use for conclusion" or "Strong opening"
- **Notes in draft generation** - Include notes in AI context when generating drafts
- **Note search** - Search within notes when filtering

**Schema Addition:**

```prisma
model ResearchItem {
  // ... existing fields
  notes     String?   @db.Text  // User notes
  highlights String[] // Array of highlighted text snippets
}
```

### 2.4 Duplicate Detection & Smart Deduplication

**Impact:** Medium-High - Reduces clutter from auto-research

**Complexity:** Medium

**Features:**

- **Auto-detect duplicates** - Flag similar/duplicate items during research
- **Similarity scoring** - Show similarity % for potential duplicates
- **Merge duplicates** - Combine duplicates, preserve best metadata
- **Duplicate preferences** - Auto-merge, flag for review, or ignore
- **Cross-topic duplicate detection** - Find duplicates across all topics

---

## Priority 3: Improved Draft Management (Power User Features)

### 3.1 Multiple Drafts & Versioning

**Impact:** High - Current single draft is limiting

**Complexity:** Medium

**Features:**

- **Multiple drafts per topic** - Create draft v1, v2, etc.
- **Draft versions** - Auto-save versions as you edit
- **Version history** - See all versions, restore previous versions
- **Draft comparison** - Side-by-side diff view
- **Draft naming** - Name drafts (e.g., "Short version", "Deep dive")
- **Default draft** - Set one draft as the main/default

**Schema Changes:**

```prisma
model Draft {
  id          String   @id @default(cuid())
  content     String   @db.Text
  title       String?  // User-assigned draft title
  version     Int      @default(1)
  isDefault   Boolean  @default(false)
  topicId     String
  topic       Topic    @relation(fields: [topicId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  parentId    String?  // For version history
  
  @@index([topicId])
  @@index([topicId, isDefault])
}
```

### 3.2 Draft Templates

**Impact:** Medium - Speeds up drafting for repeat formats

**Complexity:** Low-Medium

**Features:**

- **Save draft as template** - Convert any draft into a reusable template
- **Template library** - Personal template collection
- **Template variables** - Placeholders like {{topic_title}}, {{date}}
- **Apply template** - Start new draft from template
- **Template marketplace** - Share templates with community (future)

### 3.3 Enhanced Draft Editor

**Impact:** Medium-High - Improves writing experience

**Complexity:** Medium

**Features:**

- **Word count** - Show word/character count
- **Readability score** - Flesch-Kincaid, etc.
- **Writing goals** - Set target word count, show progress
- **Distraction-free mode** - Fullscreen writing mode
- **Focus mode** - Highlight current paragraph/sentence
- **Spell check** - Integrated spell checking
- **Grammar suggestions** - Basic grammar checking

### 3.4 Research Item Integration in Draft

**Impact:** High - Better connection between research and writing

**Complexity:** Medium

**Features:**

- **Insert research items** - Quick insert research items into draft (adds link + summary)
- **Research sidebar** - Show research items while writing
- **Item usage tracking** - See which items are used in which drafts
- **Unused items highlight** - Highlight starred items not yet in draft
- **Quick quote insertion** - One-click insert quotes from research items

---

## Priority 4: AI Enhancements (Differentiation)

### 4.1 AI Subject Line Generation

**Impact:** High - Helps complete the draft before export

**Complexity:** Low-Medium

**Features:**

- **Generate subject lines** - Create multiple options from draft content
- **A/B test options** - Generate variations for testing
- **Tone matching** - Match draft tone in subject lines
- **Length optimization** - Generate short, medium, long versions
- **Platform-specific** - Optimize for email vs. blog vs. social

**Implementation:**

- Extend `src/lib/ai.ts` with subject line generation
- Add UI in draft editor header
- Store subject line options with draft

### 4.2 Content Suggestions & Enhancement

**Impact:** Medium-High - Improves draft quality

**Complexity:** Medium

**Features:**

- **Content gap analysis** - Suggest missing topics based on research
- **Additional research suggestions** - AI recommends related items to add
- **Writing improvements** - Suggest clarity, tone, structure improvements
- **Link suggestions** - Suggest where to add links to research items
- **Paragraph enhancement** - Rewrite suggestions for better flow

### 4.3 Smart Research Refinement

**Impact:** Medium-High - Reduces manual curation time

**Complexity:** High

**Features:**

- **Learning from usage** - Track which items get starred/used in drafts
- **Relevance score improvement** - Better scoring based on user behavior
- **Auto-star suggestions** - Suggest items to star based on patterns
- **Auto-dim suggestions** - Suggest low-value items to hide
- **Source quality scoring** - Learn which sources produce best content

### 4.4 AI Research Assistant

**Impact:** High - Makes research more interactive

**Complexity:** High

**Features:**

- **Research questions** - Ask AI "Find more about X" and it searches
- **Research refinement** - "Find more recent articles" or "Find counterpoints"
- **Research summarization** - Generate executive summary of all research
- **Topic expansion** - Suggest related subtopics to research

---

## Priority 5: User Experience Enhancements

### 5.1 Keyboard Shortcuts

**Impact:** Medium-High - Power user productivity

**Complexity:** Low

**Features:**

- **Global shortcuts** - Cmd+K for search, Cmd+N for new topic
- **Draft editor shortcuts** - Standard text editor shortcuts
- **Research item shortcuts** - `S` for star, `D` for dim, `E` for edit
- **Shortcuts help** - `?` key shows all shortcuts
- **Customizable shortcuts** - Let users customize (future)

### 5.2 Improved Research Item Display

**Impact:** Medium - Better information density and scanning

**Complexity:** Low-Medium

**Features:**

- **Grid/list view toggle** - Visual preference
- **Compact/expanded view** - Show more/less detail
- **Thumbnail previews** - Better visual scanning for images/videos
- **Quick preview modal** - Click to preview without navigation
- **Read status indicator** - Show if item has been clicked/viewed
- **Source badges** - Visual indicators for trusted sources

### 5.3 Mobile Optimization

**Impact:** High - Many users work on mobile

**Complexity:** Medium

**Features:**

- **Responsive research view** - Touch-optimized item cards
- **Mobile draft editing** - Improved mobile editor experience
- **Mobile research** - Easy browsing and starring on mobile
- **Progressive Web App** - Installable on mobile devices

### 5.4 Better Navigation & Organization

**Impact:** Medium - Reduces friction

**Complexity:** Low-Medium

**Features:**

- **Topic folders/collections** - Group related topics
- **Pinned topics** - Keep important topics at top
- **Recent topics** - Quick access to recently viewed
- **Search across topics** - Global search for topics and items
- **Breadcrumb navigation** - Clear navigation hierarchy

---

## Priority 6: Integrations & Workflows

### 6.1 Browser Extension

**Impact:** High - Great for content discovery and capture

**Complexity:** High (separate project)

**Features:**

- **Quick capture** - One-click "Add to Quick Letter" from any webpage
- **Context menu** - Right-click to add to specific topic
- **Page preview** - Preview page content before adding
- **Auto-categorize** - Suggest which topic to add to
- **Capture quotes** - Select text and capture as highlight

### 6.2 URL Import Enhancements

**Impact:** Medium - Makes manual research easier

**Complexity:** Low

**Features:**

- **Bulk URL import** - Paste multiple URLs at once
- **URL list from file** - Import URLs from text file
- **RSS feed import** - Subscribe to RSS feeds, auto-add to topics
- **Twitter/X import** - Import tweet threads or lists
- **Reddit import** - Import Reddit posts/discussions

### 6.3 API & Webhooks

**Impact:** Medium - Enables custom integrations

**Complexity:** Medium

**Features:**

- **Public API** - RESTful API for integrations
- **Webhooks** - Notify external services when drafts are ready
- **Zapier/Make integration** - Connect to automation tools
- **API keys** - Secure API access

---

## Priority 7: Collaboration Features (Future)

### 7.1 Sharing & Collaboration

**Impact:** Medium - Enables team use

**Complexity:** High

**Features:**

- **Share topics** - Share read-only or editable topics
- **Comments on items** - Discuss research items with team
- **Shared drafts** - Collaborate on drafts
- **Team workspaces** - Organize topics by team/project

### 7.2 Export Sharing

**Impact:** Low-Medium - Share drafts before publishing

**Complexity:** Low

**Features:**

- **Share draft link** - Generate shareable preview link
- **PDF export** - Export draft as PDF for review
- **Print formatting** - Print-friendly draft format

---

## Implementation Roadmap

### Phase 1 (Next 2-3 months): Export Excellence

1. Platform-specific export formats (Substack, Ghost, Mailchimp)
2. Enhanced copy functionality
3. Export templates/presets
4. Multiple drafts per topic

**Goal:** Make it effortless to move drafts to any publisher

### Phase 2 (Months 4-5): Research Power Tools

1. Advanced filtering & search
2. Tags & categories
3. Research item notes
4. Duplicate detection

**Goal:** Make managing large research collections easy

### Phase 3 (Months 6-8): AI & Writing Enhancements

1. AI subject line generation
2. Content suggestions & enhancement
3. Smart research refinement
4. Enhanced draft editor features

**Goal:** Make the writing experience delightful and AI-assisted

### Phase 4 (Months 9-12): Polish & Scale

1. Keyboard shortcuts
2. Mobile optimization
3. Browser extension (if resources allow)
4. API & integrations

**Goal:** Refine UX and enable advanced workflows

---

## Success Metrics

### Engagement Metrics

- **Research-to-draft conversion** - % of topics that generate at least one draft
- **Draft completion rate** - % of drafts that are exported/copied
- **Research depth** - Avg research items per topic
- **Draft iterations** - Avg drafts per topic (higher = users refining)

### Quality Metrics

- **Star usage rate** - % of starred items used in drafts
- **Research coverage** - Avg items per draft
- **Export success** - % of exports that result in published content (survey)

### Productivity Metrics

- **Time to first draft** - Time from topic creation to draft generation
- **Export time** - Time from draft ready to exported
- **Research efficiency** - Items found per research run

---

## Competitive Positioning

**Not competing with:**

- Substack, Ghost, Mailchimp (publishers)
- Notion, Obsidian (general note-taking)
- Google Docs, Word (general writing)

**Competing with:**

- Research workflow friction
- Context switching between tools
- Manual content curation

**Value proposition:** "The fastest path from idea to polished newsletter draft, ready to publish anywhere."

---

## Key Design Principles

1. **Export-first** - Always optimize for easy export, not for keeping users in-app
2. **Research-first** - Make research curation delightful, not tedious
3. **AI-assist, don't replace** - Writers stay in control, AI helps
4. **Zero lock-in** - Easy to export everything, leave anytime
5. **Delightful details** - Small touches that make the workflow enjoyable