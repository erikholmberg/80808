---
name: Improve research accuracy
overview: Increase research agent accuracy by hardening retrieval/ranking quality gates, adding grounding checks for summaries/drafts, and introducing automated quality evaluations to prevent regressions.
todos:
  - id: add-grounding-constraints
    content: Strengthen AI prompts in src/lib/ai.ts to require evidence-only claims and explicit uncertainty behavior.
    status: completed
  - id: implement-citation-checks
    content: Add post-generation citation and claim support checks in summarize and draft API routes.
    status: completed
  - id: calibrate-research-gating
    content: Improve research route scoring gates with freshness/source modifiers and uncertainty banding.
    status: completed
  - id: replace-silent-fallbacks
    content: Add structured schema validation and retries for AI JSON outputs; remove silent fixed-score fallbacks.
    status: completed
  - id: add-research-route-tests
    content: Create missing tests for /api/topics/[topicId]/research and /api/cron/research focused on accuracy-sensitive logic.
    status: completed
  - id: add-quality-metrics
    content: Instrument quality telemetry and expose metrics for ongoing threshold tuning.
    status: completed
isProject: false
---

# Improve Research Agent Accuracy

## Goals

- Increase factual grounding in summaries and drafts.
- Improve relevance precision of ingested research items.
- Detect quality regressions automatically before release.

## Priority 1: Grounding and output safety (highest impact)

- Add explicit anti-hallucination prompt constraints in `[/Users/erikholmberg/Development/quick-letter/src/lib/ai.ts](/Users/erikholmberg/Development/quick-letter/src/lib/ai.ts)`:
  - Require "use only provided evidence".
  - Require uncertainty language when evidence is insufficient.
  - Forbid unverifiable numeric claims and named entities unless present in source content.
- Add post-generation grounding checks in draft/summarization routes:
  - Validate each cited URL exists in selected input items.
  - Reject or downgrade outputs with unsupported claims/citations.
  - Touchpoints: `[/Users/erikholmberg/Development/quick-letter/src/app/api/items/[itemId]/summarize/route.ts](/Users/erikholmberg/Development/quick-letter/src/app/api/items/[itemId]/summarize/route.ts)`, `[/Users/erikholmberg/Development/quick-letter/src/app/api/topics/[topicId]/generate-draft/route.ts](/Users/erikholmberg/Development/quick-letter/src/app/api/topics/[topicId]/generate-draft/route.ts)`.

## Priority 2: Retrieval/ranking quality improvements

- Replace single-pass hard thresholding with calibrated gating in research routes:
  - Keep `relevanceScore` but add source quality + freshness modifiers.
  - Introduce uncertainty band (e.g., keep borderline items for secondary review instead of dropping all `<30`).
  - Files: `[/Users/erikholmberg/Development/quick-letter/src/app/api/topics/[topicId]/research/route.ts](/Users/erikholmberg/Development/quick-letter/src/app/api/topics/[topicId]/research/route.ts)`, `[/Users/erikholmberg/Development/quick-letter/src/app/api/cron/research/route.ts](/Users/erikholmberg/Development/quick-letter/src/app/api/cron/research/route.ts)`.
- Improve scoring inputs by including extracted page text signal (when available), not only title/description/source.
  - Use `[/Users/erikholmberg/Development/quick-letter/src/lib/scraper.ts](/Users/erikholmberg/Development/quick-letter/src/lib/scraper.ts)` output in ranking path for top candidates.

## Priority 3: Robustness for model-output failures

- Remove silent quality degradation defaults in `[/Users/erikholmberg/Development/quick-letter/src/lib/ai.ts](/Users/erikholmberg/Development/quick-letter/src/lib/ai.ts)`:
  - Avoid defaulting parse/model failures to generic query or fixed score `50` without marking uncertainty.
  - Add structured retry with strict schema validation.
  - Emit quality telemetry when fallbacks occur.

## Priority 4: Evaluation and regression prevention

- Add missing tests for key research ingestion routes (currently noted as missing):
  - `[/Users/erikholmberg/Development/quick-letter/tests/api/topics/[topicId]/research.test.ts](/Users/erikholmberg/Development/quick-letter/tests/api/topics/[topicId]/research.test.ts)`
  - `[/Users/erikholmberg/Development/quick-letter/tests/api/cron/research.test.ts](/Users/erikholmberg/Development/quick-letter/tests/api/cron/research.test.ts)`
- Introduce quality-focused eval fixtures and assertions:
  - Faithfulness: no claim without supporting source text.
  - Citation integrity: every citation maps to an ingested item URL.
  - Retrieval precision: top-N includes expected authoritative sources for benchmark topics.

## Priority 5: Observability for accuracy operations

- Log per-run quality metrics:
  - parse failure rate, fallback rate, citation failure rate, unsupported-claim rate, accepted/rejected item counts by source.
- Add lightweight dashboard or periodic report to monitor trend regressions and tune thresholds.

## Suggested rollout

- Phase 1 (fast, low risk): prompt constraints + citation integrity checks + failure telemetry.
- Phase 2: ranking calibration and uncertainty handling.
- Phase 3: eval harness and benchmark-based threshold tuning.

