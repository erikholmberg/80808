---
name: Ops quick wins
overview: Deliver high-impact operational improvements in the next 2 weeks focused on reliability, observability, and performance of research and cron workflows.
todos:
  - id: structured-logging
    content: Add correlation IDs and structured logs across research/cron/external-call paths.
    status: completed
  - id: retry-timeout-policy
    content: Introduce shared retry-timeout helper and apply to Serper, scraper, storage, and email calls.
    status: completed
  - id: cron-reliability
    content: Implement cron overlap lock and degraded run semantics with per-topic failure accounting.
    status: completed
  - id: research-performance
    content: Bound concurrency for thumbnail/content fetch and optimize network-heavy loops.
    status: completed
  - id: admin-analytics-optimization
    content: Reduce large-scan query load and improve admin analytics response latency.
    status: completed
  - id: schedule-status-fix
    content: Align dashboard next-run calculation with actual cron schedule configuration.
    status: completed
  - id: ops-test-expansion
    content: Add and expand tests for cron reliability, admin status/analytics/logs, and from-url operational paths.
    status: completed
isProject: false
---

# 2-Week Ops Improvement Plan

## Outcomes
- Reduce flaky failures from external dependencies.
- Improve incident debugging speed with consistent structured logs.
- Increase cron reliability and runtime efficiency.
- Close key operational test coverage gaps.

## Week 1: Reliability + Observability
- Implement structured logging and correlation IDs in:
  - [`/Users/erikholmberg/Development/quick-letter/src/lib/api-logger.ts`](/Users/erikholmberg/Development/quick-letter/src/lib/api-logger.ts)
  - [`/Users/erikholmberg/Development/quick-letter/src/app/api/cron/research/route.ts`](/Users/erikholmberg/Development/quick-letter/src/app/api/cron/research/route.ts)
  - [`/Users/erikholmberg/Development/quick-letter/src/app/api/topics/[topicId]/research/route.ts`](/Users/erikholmberg/Development/quick-letter/src/app/api/topics/[topicId]/research/route.ts)
  - [`/Users/erikholmberg/Development/quick-letter/src/lib/ai.ts`](/Users/erikholmberg/Development/quick-letter/src/lib/ai.ts)
  - [`/Users/erikholmberg/Development/quick-letter/src/lib/serper.ts`](/Users/erikholmberg/Development/quick-letter/src/lib/serper.ts)
- Add a shared retry/timeout helper (exponential backoff + jitter + retryable error classifier) and adopt it for external calls in:
  - [`/Users/erikholmberg/Development/quick-letter/src/lib/serper.ts`](/Users/erikholmberg/Development/quick-letter/src/lib/serper.ts)
  - [`/Users/erikholmberg/Development/quick-letter/src/lib/scraper.ts`](/Users/erikholmberg/Development/quick-letter/src/lib/scraper.ts)
  - [`/Users/erikholmberg/Development/quick-letter/src/lib/supabase-storage.ts`](/Users/erikholmberg/Development/quick-letter/src/lib/supabase-storage.ts)
  - [`/Users/erikholmberg/Development/quick-letter/src/lib/email.ts`](/Users/erikholmberg/Development/quick-letter/src/lib/email.ts)
- Harden cron run semantics in [`/Users/erikholmberg/Development/quick-letter/src/app/api/cron/research/route.ts`](/Users/erikholmberg/Development/quick-letter/src/app/api/cron/research/route.ts):
  - prevent overlap via lock mechanism
  - track per-topic success/failure counts
  - mark run as degraded/failed when topic failure rate crosses threshold

## Week 2: Performance + Coverage
- Reduce research route runtime by bounding network-heavy concurrency in:
  - [`/Users/erikholmberg/Development/quick-letter/src/app/api/cron/research/route.ts`](/Users/erikholmberg/Development/quick-letter/src/app/api/cron/research/route.ts)
  - [`/Users/erikholmberg/Development/quick-letter/src/app/api/topics/[topicId]/research/route.ts`](/Users/erikholmberg/Development/quick-letter/src/app/api/topics/[topicId]/research/route.ts)
- Optimize heavy analytics queries in [`/Users/erikholmberg/Development/quick-letter/src/app/api/admin/analytics/route.ts`](/Users/erikholmberg/Development/quick-letter/src/app/api/admin/analytics/route.ts) by limiting large scans and computing aggregates incrementally.
- Fix scheduling visibility mismatch (actual cron cadence vs displayed cadence) across:
  - [`/Users/erikholmberg/Development/quick-letter/vercel.json`](/Users/erikholmberg/Development/quick-letter/vercel.json)
  - [`/Users/erikholmberg/Development/quick-letter/src/app/api/admin/status/route.ts`](/Users/erikholmberg/Development/quick-letter/src/app/api/admin/status/route.ts)
  - [`/Users/erikholmberg/Development/quick-letter/src/app/(dashboard)/admin/page.tsx`](/Users/erikholmberg/Development/quick-letter/src/app/(dashboard)/admin/page.tsx)
- Expand operational tests:
  - extend [`/Users/erikholmberg/Development/quick-letter/tests/api/cron/research.test.ts`](/Users/erikholmberg/Development/quick-letter/tests/api/cron/research.test.ts) and [`/Users/erikholmberg/Development/quick-letter/tests/api/topics/[topicId]/research.test.ts`](/Users/erikholmberg/Development/quick-letter/tests/api/topics/[topicId]/research.test.ts)
  - add tests for admin status/analytics/logs APIs and from-url reliability paths

## Acceptance Metrics
- External dependency timeout/5xx failure rate reduced by at least 30%.
- 95%+ error logs include `requestId`/`jobRunId`, service, operation, and topic context.
- Cron overlap incidents reduced to 0.
- Cron p95 duration improved by at least 25%.
- Admin analytics p95 latency below 1.5s.
- 20+ operational tests added with strong coverage over cron/status/analytics reliability paths.