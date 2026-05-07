---
name: scaling_speed_improvements
overview: Prioritized scaling plan to reduce latency and increase throughput across topic pages, heavy APIs, and cron processing. Focuses on quick wins first, then architecture upgrades for durable scale.
todos:
  - id: phase1-ui-data-volume
    content: Implement pagination and active-tab-only rendering for topics/items to reduce payload and hydration cost
    status: completed
  - id: phase2-db-nplus1-indexes
    content: Replace N+1 writes/reads with bulk operations and add compound indexes for hot query paths
    status: pending
  - id: phase3-queue-heavy-work
    content: Move research/summarize/ingestion work off request path into queued background workers
    status: pending
  - id: phase4-provider-throttling
    content: Add provider-specific throttling/retry policies and global budget guards
    status: pending
  - id: phase5-admin-observability
    content: Refactor admin analytics to DB aggregations + cache and add pipeline metrics
    status: pending
isProject: false
---

# Scaling improvements plan

## Goals

- Lower p95 latency on user-facing topic/research flows.
- Reduce DB and external API pressure as data/users grow.
- Add backpressure and observability so scaling is predictable.

## Phase 1: Quick wins (high ROI, low risk)

- Add pagination/cursor loading to unbounded or oversized item fetches:
  - [src/app/api/topics/[topicId]/route.ts](/Users/erikholmberg/Development/quick-letter/src/app/api/topics/[topicId]/route.ts)
  - [src/app/api/topics/route.ts](/Users/erikholmberg/Development/quick-letter/src/app/api/topics/route.ts)
  - [src/app/(dashboard)/topics/[topicId]/page.tsx](/Users/erikholmberg/Development/quick-letter/src/app/(dashboard)/topics/[topicId]/page.tsx)
- Render only the active tab list and debounce search to avoid O(4N) client filtering:
  - [src/components/topic-tabs.tsx](/Users/erikholmberg/Development/quick-letter/src/components/topic-tabs.tsx)
- Remove per-item list-time metadata network calls (HEAD/image probing) or defer to detail view:
  - [src/components/research-item-list.tsx](/Users/erikholmberg/Development/quick-letter/src/components/research-item-list.tsx)
- Limit DnD overhead by mounting DnD contexts only during reorder mode:
  - [src/components/research-item-list.tsx](/Users/erikholmberg/Development/quick-letter/src/components/research-item-list.tsx)
  - [src/components/topic-list.tsx](/Users/erikholmberg/Development/quick-letter/src/components/topic-list.tsx)

## Phase 2: DB/query efficiency

- Replace N+1 reorder writes with one bulk update statement per request:
  - [src/app/api/topics/[topicId]/items/reorder/route.ts](/Users/erikholmberg/Development/quick-letter/src/app/api/topics/[topicId]/items/reorder/route.ts)
  - [src/app/api/topics/reorder/route.ts](/Users/erikholmberg/Development/quick-letter/src/app/api/topics/reorder/route.ts)
- Optimize URL ingestion image insert path (prefetch existing URLs + createMany):
  - [src/app/api/topics/[topicId]/items/from-url/route.ts](/Users/erikholmberg/Development/quick-letter/src/app/api/topics/[topicId]/items/from-url/route.ts)
- Add compound indexes for hot filters/sorts in Prisma schema:
  - [prisma/schema.prisma](/Users/erikholmberg/Development/quick-letter/prisma/schema.prisma)

## Phase 3: Throughput architecture for heavy work

- Move heavy synchronous pipelines (manual research, summarize, from-url enrichment, cron topic processing) to queued background jobs with bounded worker concurrency.
  - [src/app/api/topics/[topicId]/research/route.ts](/Users/erikholmberg/Development/quick-letter/src/app/api/topics/[topicId]/research/route.ts)
  - [src/app/api/items/[itemId]/summarize/route.ts](/Users/erikholmberg/Development/quick-letter/src/app/api/items/[itemId]/summarize/route.ts)
  - [src/app/api/topics/[topicId]/items/from-url/route.ts](/Users/erikholmberg/Development/quick-letter/src/app/api/topics/[topicId]/items/from-url/route.ts)
  - [src/app/api/cron/research/route.ts](/Users/erikholmberg/Development/quick-letter/src/app/api/cron/research/route.ts)
- Keep cron as scheduler/enqueuer; process jobs outside single long request.

## Phase 4: External API resilience and cost control

- Add provider-level throttling/budgets (Serper/AI Gateway/storage) and honor Retry-After.
  - [src/lib/serper.ts](/Users/erikholmberg/Development/quick-letter/src/lib/serper.ts)
  - [src/lib/ai.ts](/Users/erikholmberg/Development/quick-letter/src/lib/ai.ts)
  - [src/lib/supabase-storage.ts](/Users/erikholmberg/Development/quick-letter/src/lib/supabase-storage.ts)
- Improve retry policy classification (provider-specific errors) to avoid retry storms.

## Phase 5: Admin/analytics scaling and observability

- Move analytics heavy aggregations from app memory to DB grouped queries/pre-aggregates and add short TTL caching.
  - [src/app/api/admin/analytics/route.ts](/Users/erikholmberg/Development/quick-letter/src/app/api/admin/analytics/route.ts)
  - [src/app/api/admin/status/route.ts](/Users/erikholmberg/Development/quick-letter/src/app/api/admin/status/route.ts)
- Reduce log write amplification (sample successful logs, keep errors) and avoid duplicate error logs.
  - [src/lib/api-logger.ts](/Users/erikholmberg/Development/quick-letter/src/lib/api-logger.ts)
- Add stage-level metrics for research pipeline: queue depth, retries, timeout/error rates, and per-route p95/p99.

## Recommended rollout order

1. Pagination + active-tab rendering + debounce.
2. N+1 write fixes + indexes.
3. Admin analytics query optimization + caching.
4. Queue migration for heavy pipelines.
5. Provider-level adaptive throttling + richer observability.

