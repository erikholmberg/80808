---
name: Application Specification
overview: Create a complete, from-scratch-reproducible specification document for the Quick Letter application -- a newsletter research and drafting tool built with Next.js, Prisma, and Google Gemini AI.
todos:
  - id: spec
    content: Create the specification document covering all aspects of the application
    status: completed
isProject: false
---

# Quick Letter -- Full Application Specification

## Overview

Quick Letter is a newsletter research and drafting web application. Users create **topics** (newsletter subjects), then research content for them by searching the web (via Serper API) or manually adding URLs. An AI agent (Google Gemini) scores relevance, summarizes content, and generates newsletter drafts. A rich text editor (TipTap) allows editing and exporting drafts.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router, React 19)
- **Language:** TypeScript 5.7
- **Database:** PostgreSQL via Prisma ORM 6.1
- **Auth:** NextAuth v5 beta (credentials provider, JWT sessions, Prisma adapter)
- **AI:** Google Generative AI (`@google/generative-ai` 0.24) -- Gemini models
- **Search:** Serper API (Google search, news, images, videos)
- **Email:** Resend (verification, password reset)
- **Storage:** Supabase Storage (images), with local dev fallback
- **Styling:** Tailwind CSS 3.4, shadcn/ui components (Radix primitives), CSS variables for theming
- **Rich Text:** TipTap (with StarterKit, Placeholder, Link, Image extensions)
- **Drag & Drop:** @dnd-kit (core, sortable, utilities)
- **Markdown:** react-markdown + remark-breaks
- **Validation:** Zod
- **Scraping:** Cheerio (HTML parsing)
- **Fonts:** Geist Sans, Geist Mono (Next.js Google Fonts)
- **Testing:** Vitest + Testing Library
- **Deployment:** Vercel (with cron jobs)

---

## Database Schema (Prisma/PostgreSQL)

### Auth Models (NextAuth)

- **User** -- `id` (cuid), `name?`, `email` (unique), `emailVerified?`, `password?`, `image?`, `isAdmin` (default false), timestamps. Has many: Account, Session, Topic.
- **Account** -- OAuth provider data, cascades from User. Unique on `[provider, providerAccountId]`.
- **Session** -- `sessionToken` (unique), `userId`, `expires`. Cascades from User.
- **VerificationToken** -- `identifier`, `token` (unique), `expires`. Unique on `[identifier, token]`.

### Application Models

- **Topic** -- `id` (cuid), `title`, `description?` (text), `position` (int, default 0), `agentActive` (default false), `lastResearchAt?`, `status` (string: "RESEARCH" | "WRITE" | "SEND", default "RESEARCH"), freshness filters (`websiteFreshness?`, `articleFreshness?` default "year", `imageFreshness?`, `videoFreshness?` default "year"), `userId` (FK, cascade delete), timestamps. Has many: ResearchItem, Draft. Indexes on `[userId]`.
- **ResearchItem** -- `id` (cuid), `type` (enum: WEBSITE | ARTICLE | IMAGE | VIDEO), `status` (enum: NORMAL | STARRED | DIMMED, default NORMAL), `position` (int, default 0), `title`, `description?` (text), `url`, `imageUrl?`, `source?`, `relevanceScore?` (float), `summary?` (text), `isClicked` (default false), `isManual` (default false), `topicId` (FK, cascade delete), timestamps. Unique on `[topicId, url]`. Indexes on `[topicId, type]`, `[topicId, status]`.
- **Draft** -- `id` (cuid), `content` (text), `title?`, `topicId` (FK, cascade delete), timestamps. Index on `[topicId]`.

### Monitoring & Config Models

- **ApiLog** -- `id`, `service` (string), `endpoint?`, `success` (bool), `responseTime` (int, ms), `errorMessage?` (text), `createdAt`. Indexes on `[service]`, `[createdAt]`, `[service, createdAt]`.
- **CronJobLog** -- `id`, `jobName`, `success`, `topicsProcessed` (default 0), `itemsAdded` (default 0), `duration` (int, ms), `errorMessage?` (text), `createdAt`. Indexes on `[jobName]`, `[createdAt]`.
- **FeatureFlag** -- `id`, `key` (unique), `enabled` (default true), `description?`, timestamps.
- **AgentConfig** -- `id`, `key` (unique), `name`, `description?`, `model` (default "gemini-2.0-flash"), timestamps.

---

## Environment Variables


| Variable                    | Required | Purpose                                                                        |
| --------------------------- | -------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`              | Yes      | PostgreSQL connection string (pooled)                                          |
| `DIRECT_URL`                | No       | Direct DB connection for migrations                                            |
| `AUTH_SECRET`               | Yes      | NextAuth secret                                                                |
| `AUTH_URL`                  | Yes      | App URL for NextAuth                                                           |
| `NEXT_PUBLIC_APP_URL`       | Yes      | Public app URL for emails                                                      |
| `GOOGLE_AI_API_KEY`         | Yes      | Google Gemini API key                                                          |
| `SERPER_API_KEY`            | Yes      | Serper search API key                                                          |
| `RESEND_API_KEY`            | Yes      | Resend email API key                                                           |
| `EMAIL_FROM`                | No       | Sender email (fallback: [onboarding@resend.dev](mailto:onboarding@resend.dev)) |
| `SUPABASE_URL`              | Prod     | Supabase project URL                                                           |
| `SUPABASE_SERVICE_ROLE_KEY` | Prod     | Supabase service role key                                                      |
| `SUPABASE_STORAGE_BUCKET`   | No       | Bucket name (default: "images")                                                |
| `CRON_SECRET`               | Prod     | Bearer token for cron endpoint                                                 |


---

## Authentication System

- **Provider:** Credentials only (email + password)
- **Strategy:** JWT sessions
- **Password:** bcrypt hashed, minimum 8 characters
- **Signup:** Gated by `allow_signups` feature flag. Optional email verification via `require_email_verification` flag.
- **Verification:** Token-based email verification via Resend. Token stored in VerificationToken table with expiry.
- **Session extensions:** `user.id` and `user.isAdmin` added to JWT and session via callbacks.
- **Custom pages:** `/login` for sign-in and error.

---

## Feature Flag System

Stored in `FeatureFlag` table with hardcoded defaults as fallback:


| Flag Key                     | Default | Purpose                              |
| ---------------------------- | ------- | ------------------------------------ |
| `allow_signups`              | true    | Enable/disable new user registration |
| `enable_auto_research`       | true    | Enable AI-powered research           |
| `enable_ai_summaries`        | true    | Enable AI content summarization      |
| `enable_draft_generation`    | true    | Enable AI draft generation           |
| `maintenance_mode`           | false   | Block dashboard access               |
| `require_email_verification` | false   | Require verified email to log in     |


---

## AI Agent System

Four configurable agents with model selection stored in `AgentConfig` table:


| Agent Key                    | Default Model    | Purpose                                                  |
| ---------------------------- | ---------------- | -------------------------------------------------------- |
| `search_query_generator`     | gemini-2.0-flash | Generate 3-4 search queries from topic title/description |
| `relevance_scorer`           | gemini-2.0-flash | Score items 0-100 for relevance to topic                 |
| `content_summarizer`         | gemini-2.0-flash | Summarize web content for research                       |
| `newsletter_draft_generator` | gemini-2.0-flash | Generate newsletter drafts from curated items            |


Available models: gemini-2.5-flash-preview-04-17, gemini-2.0-flash, gemini-2.0-flash-lite, gemini-1.5-flash, gemini-1.5-pro.

### AI Functions

1. `**generateSearchQueries(title, description)`** -- Returns JSON array of 3-4 search queries. Fallback: `[title]` or `[title + " " + description]`.
2. `**scoreRelevance(topicTitle, topicDescription, item)`** -- Returns 0-100 score. Fallback: 50.
3. `**batchScoreRelevance(...)`** -- Individual calls for <=3 items, batch prompt for larger sets.
4. `**summarizeContent(title, description, url)**` -- Summarize from URL context.
5. `**summarizeWithFullContent(title, content)**` -- Summarize from scraped text (max 6000 chars).
6. `**generateNewsletterDraft(topicTitle, topicDescription, items, options)**` -- Generate Markdown draft with configurable format, tone, and length.

### Draft Generation Options

- **Include:** starred | all (non-dimmed)
- **Format:** weekly-roundup | deep-dive | quick-hits | curated-links | thread-style
- **Tone:** professional | conversational | enthusiastic | analytical
- **Length:** brief | standard | detailed

---

## Search & Research Pipeline

### Serper API Integration

Searches four Google endpoints in parallel via `Promise.allSettled`:

- `/search` (websites) -- with optional freshness filter
- `/news` (articles) -- default freshness: "year"
- `/images` -- with optional freshness filter
- `/videos` -- default freshness: "year"

**Freshness filter** maps to Google's `tbs` parameter: day -> `qdr:d`, week -> `qdr:w`, month -> `qdr:m`, year -> `qdr:y`, null -> no filter.

### Research Flow (Manual Trigger)

1. Generate search queries from topic via AI
2. Run Serper search for each query (optionally filtered by content type)
3. Deduplicate results against existing items (by URL)
4. Score relevance via AI (batch)
5. Filter out items scoring < 30
6. Upload images to Supabase Storage
7. Create ResearchItem records

### Research Flow (Cron -- `/api/cron/research`)

- Runs daily (configurable in `vercel.json`: `0 0 * * *`)
- Authenticated via `CRON_SECRET` bearer token
- Processes all topics where `agentActive: true`
- Same pipeline as manual research
- Results logged to `CronJobLog`

### Web Scraping

- Fetches HTML with Chrome-like User-Agent, 10s timeout
- Uses Cheerio to parse and extract main content
- Removes non-content elements (nav, header, footer, ads, popups, etc.)
- Content selection priority: article -> main -> role="main" -> common content class selectors -> body
- Requires >200 chars to accept a selector

---

## Image Storage (Supabase)

- **Production:** Upload to Supabase Storage bucket. Images stored under optional `userId/` prefix with unique filenames.
- **Development without Supabase:** Falls back to local `public/uploads/images/` directory, or returns data URLs as-is.
- **Image download:** Fetches remote images with 10s timeout. On failure (403/404), returns original URL instead.
- **Deletion:** Removes from Supabase by extracting path from URL. External URLs are no-ops.

---

## API Routes

### Auth Routes


| Endpoint                    | Method    | Auth     | Purpose                                          |
| --------------------------- | --------- | -------- | ------------------------------------------------ |
| `/api/auth/[...nextauth]`   | GET, POST | NextAuth | NextAuth handlers                                |
| `/api/auth/signup`          | POST      | None     | Create account (name, email, password >=8 chars) |
| `/api/auth/verify-email`    | POST      | None     | Verify email with token                          |
| `/api/auth/change-password` | POST      | Session  | Change password (current + new)                  |
| `/api/auth/delete-account`  | POST      | Session  | Delete account (confirm with password)           |


### Topic Routes


| Endpoint                               | Method | Auth    | Purpose                                                                  |
| -------------------------------------- | ------ | ------- | ------------------------------------------------------------------------ |
| `/api/topics`                          | GET    | Session | List user's topics (ordered by position, with item counts)               |
| `/api/topics`                          | POST   | Session | Create topic (title, description) at position 0, shift others            |
| `/api/topics/reorder`                  | POST   | Session | Reorder topics by ID array                                               |
| `/api/topics/[topicId]`                | GET    | Session | Get topic with items (ordered by status, createdAt, position)            |
| `/api/topics/[topicId]`                | PATCH  | Session | Update topic fields (title, description, agentActive, freshness filters) |
| `/api/topics/[topicId]`                | DELETE | Session | Delete topic and cleanup stored images                                   |
| `/api/topics/[topicId]/research`       | POST   | Session | Trigger AI research for topic                                            |
| `/api/topics/[topicId]/items`          | POST   | Session | Manually add research item                                               |
| `/api/topics/[topicId]/items/from-url` | POST   | Session | Add item from URL with metadata extraction (og:tags, type inference)     |
| `/api/topics/[topicId]/items/reorder`  | POST   | Session | Reorder items by ID array                                                |
| `/api/topics/[topicId]/drafts`         | GET    | Session | Get latest draft                                                         |
| `/api/topics/[topicId]/drafts`         | POST   | Session | Create/update draft                                                      |
| `/api/topics/[topicId]/generate-draft` | POST   | Session | AI-generate newsletter draft                                             |


### Item Routes


| Endpoint                        | Method | Auth    | Purpose                                                            |
| ------------------------------- | ------ | ------- | ------------------------------------------------------------------ |
| `/api/items/[itemId]`           | PATCH  | Session | Update item (title, description, url, status, isClicked, position) |
| `/api/items/[itemId]`           | DELETE | Session | Delete item and cleanup stored image                               |
| `/api/items/[itemId]/summarize` | POST   | Session | AI-summarize item content (cached)                                 |


### Admin Routes (require `isAdmin`)


| Endpoint                        | Method           | Purpose                                                              |
| ------------------------------- | ---------------- | -------------------------------------------------------------------- |
| `/api/admin/status`             | GET              | Health checks (DB, Serper, Gemini, Resend), cron status, system info |
| `/api/admin/users`              | GET, PATCH, POST | List users, toggle admin, create user                                |
| `/api/admin/feature-flags`      | GET, PATCH, POST | List, toggle, create feature flags                                   |
| `/api/admin/agents`             | GET, PATCH       | List agent configs, update agent model                               |
| `/api/admin/agents/test`        | GET              | Test Gemini API connection                                           |
| `/api/admin/agents/test-claude` | GET              | Test Claude API connection                                           |
| `/api/admin/analytics`          | GET              | 30-day analytics (user activity, API usage, retention)               |
| `/api/admin/logs`               | GET              | Paginated API logs with filters                                      |


### Cron Routes


| Endpoint             | Method | Auth               | Purpose                              |
| -------------------- | ------ | ------------------ | ------------------------------------ |
| `/api/cron/research` | GET    | CRON_SECRET bearer | Automated research for active topics |


---

## UI Pages & Components

### Public Pages

- `**/`** -- Marketing landing page. Header with logo and Sign In / Get Started buttons. Hero section, 6-card feature grid (Search, AI, Updates, Star & Organize, Visual Content, Video), CTA section. "Get Started" conditionally shown based on `allow_signups` flag.

### Auth Pages (route group `(auth)`)

- **Layout:** Header with logo, centered content, footer.
- `**/login`** -- Email/password form. Error handling for various NextAuth error codes. Links to forgot password and signup.
- `**/signup`** -- Conditional: shows signup form or invite-only message based on `allow_signups` flag. Form: name, email, password, confirm password. Client-side validation (password match, min 8 chars).
- `**/verify-email`** -- Token-based verification. Shows loading spinner, success (green check), or error (red X).

### Dashboard Pages (route group `(dashboard)`)

- **Layout:** Auth-gated. Checks session, email verification (if required), and maintenance mode. Sticky header with logo, `HeaderNav` (Topics + Admin links), and `UserMenu` (avatar dropdown with Settings and Sign Out). Footer.
- `**/dashboard`** -- Server component. Lists topics with item counts. Uses `DashboardContent` (client) with `TopicList` and `CreateTopicDialog`. Topics are drag-and-drop reorderable.
- `**/topics/[topicId]`** -- Server component. Topic detail with `TopicHeader` (agent toggle, research, draft, edit, delete) and `TopicTabs` (Websites, Articles, Images, Videos tabs).
- `**/settings`** -- Change password form and delete account with confirmation dialog (requires password).
- `**/admin**` -- Full admin dashboard: system status, feature flag toggles, agent model selection, connection test, user management (list, create, toggle admin), links to analytics/logs/samples.
- `**/admin/analytics**` -- Charts and tables for 30-day analytics (user activity, API usage, hourly activity, retention).
- `**/admin/logs**` -- Paginated API logs table with service/status filters.

### Key Components

- `**TopicList**` -- Sortable topic cards via @dnd-kit. Each card shows title, description, item counts by type, agent toggle switch.
- `**TopicTabs**` -- Tabs for Websites/Articles/Images/Videos. Add URL form, search filter, research button (per-type or all), reorder toggle, drag-and-drop URL/image drop zone.
- `**TopicHeader**` -- Topic title, agent toggle, Research All button, Generate Draft button, Edit dialog (title, description, 4 freshness selects), Delete confirmation.
- `**ResearchItemList**` -- List/grid of research items. Actions: star/unstar, dim/restore, edit, delete, summarize (websites/articles). Image/video lightbox with keyboard nav. @dnd-kit reordering. Hidden items section (collapsible). "New" badge for items < 24h old.
- `**DraftGeneratorDialog**` -- Full draft workflow. Options panel (include, format, tone, length). TipTap rich text editor with toolbar (headings, bold, italic, strike, code, link, image, lists). Generate, save, copy (HTML + plain text), download as HTML. Insert images from research or upload. Drag-and-drop images into editor.
- `**CreateTopicDialog**` -- Simple dialog with title and description fields.

### UI Component Library (shadcn/ui)

Button, Card, Dialog, DropdownMenu, Input, Label, Separator, Slot, StatusToggle, Switch, Tabs, Textarea -- all built on Radix UI primitives with Tailwind + `class-variance-authority`.

---

## Design System

### Theme (CSS Variables, HSL)

**Light mode:**

- Background: white, Foreground: dark navy
- Primary: dark navy / light foreground
- Muted: light blue-gray
- Destructive: red
- Border radius: 4px

**Dark mode:**

- Background: dark navy, Foreground: light blue
- Muted/accent/secondary: dark blue-gray
- Inverted primary

### Typography

- Body: Geist Sans (variable font)
- Mono: Geist Mono (variable font)
- Antialiased rendering

### Dark Mode

- Class-based toggling (`darkMode: ["class"]` in Tailwind config)

---

## Deployment

- **Host:** Vercel
- **Database:** PostgreSQL (Railway or Supabase)
- **Storage:** Supabase Storage
- **Build command:** `prisma generate && next build`
- **Cron:** `/api/cron/research` runs daily at midnight UTC (`vercel.json`)
- **Remote image patterns:** All HTTPS sources allowed (`images.remotePatterns: [{ protocol: "https", hostname: "**" }]`)

---

## API Logging & Monitoring

- All external API calls (Serper, Gemini, Resend) are logged to `ApiLog` with service name, success/failure, response time, and error message.
- Cron job executions logged to `CronJobLog` with topics processed, items added, duration.
- Admin can view logs (paginated, filterable), analytics (30-day aggregates), and system health checks.

---

## Testing

- **Framework:** Vitest with jsdom environment
- **Setup:** `tests/setup.ts` sets NODE_ENV, NEXTAUTH_SECRET, NEXTAUTH_URL
- **Mocks:** `tests/utils/` contains mock-auth, mock-db, test-helpers
- **Coverage:** v8 provider, text/json/html reporters
- **Test directories:** `tests/api/auth/`, `tests/api/topics/`, `tests/api/items/`, `tests/api/admin/`

