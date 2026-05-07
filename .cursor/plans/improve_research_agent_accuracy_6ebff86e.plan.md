---
name: Improve research agent accuracy
overview: "Address the most impactful accuracy issues in the research pipeline: fix the batch scoring blind spot, add user feedback signal, give the query generator awareness of existing content, and make the relevance threshold configurable."
todos:
  - id: batch-descriptions
    content: Include item descriptions in batchScoreRelevance prompt
    status: pending
  - id: query-context
    content: Pass existing item titles to generateSearchQueries to avoid repeat content
    status: pending
  - id: feedback-scoring
    content: Pass starred/dimmed item samples as few-shot examples to relevance scorer
    status: pending
  - id: configurable-threshold
    content: Add relevanceThreshold field to Topic model and use it in research routes + UI
    status: pending
isProject: false
---

# Improve Research Agent Accuracy

All changes are in [`src/lib/ai.ts`](src/lib/ai.ts) and [`src/app/api/cron/research/route.ts`](src/app/api/cron/research/route.ts), with one schema addition.

## 1. Fix batch scoring to include descriptions (biggest quick win)

**Problem:** `batchScoreRelevance` in [`src/lib/ai.ts`](src/lib/ai.ts) line 118-119 only sends title and source to the model. The description/snippet -- the most informative signal -- is dropped. Single-item `scoreRelevance` includes it, but batch (used for 4+ items, the common case) does not.

**Fix:** Add descriptions to the batch prompt:

```typescript
const itemsList = items
  .map((item, i) => 
    `${i + 1}. Title: "${item.title}" | Description: "${item.description || 'N/A'}" | Source: ${item.source || "Unknown"}`
  )
  .join("\n");
```

This is a one-line change with the highest impact on scoring quality.

## 2. Feed existing item titles to the query generator

**Problem:** `generateSearchQueries` generates the same style of queries every run. It doesn't know what's already been found, so it surfaces similar content repeatedly.

**Fix:** In both [`src/app/api/cron/research/route.ts`](src/app/api/cron/research/route.ts) and [`src/app/api/topics/[topicId]/research/route.ts`](src/app/api/topics/[topicId]/research/route.ts), pass a sample of recent existing item titles to `generateSearchQueries`. Update the function signature and prompt:

```typescript
export async function generateSearchQueries(
  title: string,
  description: string | null,
  existingTitles?: string[]
): Promise<string[]>
```

Add to the prompt:
```
${existingTitles?.length ? `\nAlready covered (find NEW angles, avoid similar content):\n${existingTitles.slice(0, 10).map(t => `- ${t}`).join('\n')}` : ''}
```

In the cron/research routes, pass `existingItems.map(i => i.title).slice(0, 10)` (requires adding `title` to the existing items select query which currently only selects `id` and `url`).

## 3. Use starred/dimmed history as scoring context

**Problem:** Users star good items and dim irrelevant ones -- strong relevance signal that the scorer never sees.

**Fix:** In the cron and manual research routes, query a small sample of starred and dimmed items for the topic and pass them to `batchScoreRelevance` as few-shot examples. Update the function to accept optional examples:

```typescript
export async function batchScoreRelevance(
  topicTitle: string,
  topicDescription: string | null,
  items: Array<{ title: string; description: string | null; source: string | null }>,
  examples?: { liked: string[]; disliked: string[] }
): Promise<number[]>
```

Add to the prompt:
```
${examples?.liked?.length ? `\nExamples of content the user found valuable:\n${examples.liked.map(t => `- ${t}`).join('\n')}` : ''}
${examples?.disliked?.length ? `\nExamples of content the user dismissed:\n${examples.disliked.map(t => `- ${t}`).join('\n')}` : ''}
```

In the research routes, query:
```typescript
const [starredSample, dimmedSample] = await Promise.all([
  db.researchItem.findMany({
    where: { topicId: topic.id, status: "STARRED" },
    select: { title: true },
    take: 5,
    orderBy: { createdAt: "desc" },
  }),
  db.researchItem.findMany({
    where: { topicId: topic.id, status: "DIMMED" },
    select: { title: true },
    take: 5,
    orderBy: { createdAt: "desc" },
  }),
]);
```

## 4. Make relevance threshold configurable per topic

**Problem:** The cutoff `relevanceScore >= 30` is hardcoded in both research routes. Some topics need stricter filtering; others are too niche for strict thresholds.

**Fix:** Add a `relevanceThreshold` field to the `Topic` model (default 30):

```prisma
model Topic {
  // ...existing fields...
  relevanceThreshold Int @default(30)
}
```

Use `topic.relevanceThreshold` instead of the hardcoded `30` in both research routes. Expose it in the topic settings UI alongside the existing freshness controls.

## Files to modify

- [`src/lib/ai.ts`](src/lib/ai.ts) -- fix batch scoring, add existingTitles param, add examples param
- [`src/app/api/cron/research/route.ts`](src/app/api/cron/research/route.ts) -- pass existing titles, starred/dimmed examples, use configurable threshold
- [`src/app/api/topics/[topicId]/research/route.ts`](src/app/api/topics/[topicId]/research/route.ts) -- same changes as cron route
- [`prisma/schema.prisma`](prisma/schema.prisma) -- add `relevanceThreshold` to Topic
- Topic settings UI (where freshness filters are configured) -- add threshold slider
