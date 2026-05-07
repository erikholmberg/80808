---
name: Fix obvious scalability issues
overview: Address the most impactful scalability gaps for hundreds of users while keeping the stack to Vercel + Postgres only — no new services. Focus on bounding queries, adding basic caching, paginating heavy endpoints, and making the cron job resilient.
todos:
  - id: cron-batch
    content: Cap cron to 15 topics per run (ordered by lastResearchAt asc), update vercel.json frequency
    status: completed
  - id: paginate-items
    content: Add pagination to topic detail page research items
    status: completed
  - id: optimize-analytics
    content: Replace per-day query loop with groupBy, cap log queries
    status: completed
  - id: paginate-users
    content: Add take/skip pagination to admin users endpoint
    status: completed
  - id: memoize-config
    content: Add 60s in-memory cache to feature flags and agent model lookups
    status: completed
  - id: log-retention
    content: Add 90-day log cleanup in cron job
    status: completed
  - id: research-txn
    content: Wrap position shift + createMany in $transaction
    status: completed
isProject: false
---

# Fix Obvious Scalability Issues

Target: hundreds of users, Vercel + Postgres only.

## 1. Batch the cron job with a per-run topic cap

**Problem:** One invocation processes every active topic globally — will timeout as topics grow.

**Fix:** In [`src/app/api/cron/research/route.ts`](src/app/api/cron/research/route.ts), add a `take` limit (e.g. 10-20 topics per run) ordered by `lastResearchAt` ascending (oldest first). This naturally round-robins through all topics across successive cron runs. Increase cron frequency in [`vercel.json`](vercel.json) to compensate (e.g. every 2 hours instead of daily).

```typescript
const topics = await db.topic.findMany({
  where: { agentActive: true },
  orderBy: { lastResearchAt: "asc" },
  take: 15,
});
```

## 2. Paginate the research items on topic detail page

**Problem:** [`src/app/(dashboard)/topics/[topicId]/page.tsx`](src/app/(dashboard)/topics/[topicId]/page.tsx) loads all research items for a topic. Heavy topics with hundreds of items load everything.

**Fix:** Add cursor-based or offset pagination. Load the first 50 items server-side, then fetch more via a client-side "load more" button hitting the existing items API with `skip`/`take`.

## 3. Cap and optimize admin analytics

**Problem:** [`src/app/api/admin/analytics/route.ts`](src/app/api/admin/analytics/route.ts) runs ~90+ queries (per-day loops) and loads unbounded API logs.

**Fix:**
- Replace the per-day activity loop with a single `groupBy` query aggregating by date
- Add `take` limits to all log queries (e.g. `take: 1000`)
- Use `db.apiLog.count({ where: ... })` instead of loading rows and counting in JS

## 4. Paginate admin user list

**Problem:** [`src/app/api/admin/users/route.ts`](src/app/api/admin/users/route.ts) loads all users at once.

**Fix:** Add `take`/`skip` with a default page size (e.g. 50). Accept `page` and `limit` query params.

## 5. In-process memoization for hot config reads

**Problem:** `isFeatureEnabled()` and `getAgentModel()` hit the DB on every call with no caching. Feature flags and agent configs change rarely.

**Fix:** Add a simple in-memory cache with a short TTL (e.g. 60 seconds) using a `Map` + timestamp check in [`src/lib/feature-flags.ts`](src/lib/feature-flags.ts) and [`src/lib/agents.ts`](src/lib/agents.ts). This avoids adding Redis while still reducing DB reads significantly in serverless (each function instance gets its own cache, reset on cold start).

```typescript
let cache: { data: Map<string, boolean>; expiresAt: number } | null = null;
const TTL = 60_000;

async function getCachedFlags() {
  if (cache && Date.now() < cache.expiresAt) return cache.data;
  const flags = await db.featureFlag.findMany();
  const map = new Map(flags.map(f => [f.key, f.enabled]));
  cache = { data: map, expiresAt: Date.now() + TTL };
  return map;
}
```

## 6. Add log retention cleanup

**Problem:** `ApiLog` and `CronJobLog` grow unbounded.

**Fix:** Add a cleanup step at the end of the cron job (or a separate cron route) that deletes logs older than 90 days:

```typescript
await db.apiLog.deleteMany({
  where: { createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
});
```

## 7. Wrap research writes in a transaction

**Problem:** Position shift (`$executeRaw`) + `createMany` for research items are not atomic.

**Fix:** Wrap them in `db.$transaction()` in both [`src/app/api/cron/research/route.ts`](src/app/api/cron/research/route.ts) and [`src/app/api/topics/[topicId]/research/route.ts`](src/app/api/topics/[topicId]/research/route.ts).

## Files to modify

- [`src/app/api/cron/research/route.ts`](src/app/api/cron/research/route.ts) — topic cap + log retention + transaction
- [`vercel.json`](vercel.json) — increase cron frequency
- [`src/app/(dashboard)/topics/[topicId]/page.tsx`](src/app/(dashboard)/topics/[topicId]/page.tsx) — paginate items
- [`src/app/api/admin/analytics/route.ts`](src/app/api/admin/analytics/route.ts) — optimize queries
- [`src/app/api/admin/users/route.ts`](src/app/api/admin/users/route.ts) — paginate
- [`src/lib/feature-flags.ts`](src/lib/feature-flags.ts) — memoize flags
- [`src/lib/agents.ts`](src/lib/agents.ts) — memoize agent configs
