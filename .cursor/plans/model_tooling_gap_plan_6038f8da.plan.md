---
name: Model Tooling Gap Plan
overview: Prioritize the highest-impact model tools that close current gaps in runtime reliability, PM decision quality, and execution automation. Focus first on capabilities that connect existing scripts/prompts/MCP servers into end-to-end workflows.
todos:
  - id: design-runtime-foundation
    content: Define interfaces for model router, fallback policy, and guardrails middleware that can wrap existing scripts/MCP tools.
    status: completed
  - id: build-analytics-ingestion
    content: Implement Product Analytics MCP server with core funnel/retention/cohort tools and auth setup docs.
    status: completed
  - id: add-experiment-and-traceability
    content: Create experiment lifecycle manager and PRD-to-delivery traceability linker with artifact IDs and evidence links.
    status: completed
  - id: close-loop-decision-tools
    content: Implement VoC synthesis, release gate scoring, and roadmap simulation to complete continuous PM decision loop.
    status: completed
isProject: false
---

# Add High-Impact Model Tools

## Recommendation Focus

The toolkit is strong on offline evaluation and cost analysis, but weaker on runtime orchestration and decision-loop automation. Add model tools that make outputs operational, traceable, and continuously improved.

## Priority 1 (Build first)

- Add a **model router + fallback tool** that selects model/provider by task type, latency/cost budget, and quality thresholds.
  - Why: closes runtime reliability gap and leverages existing cost/eval data.
  - Evidence paths:
    - [scripts/model-selection-scorecard.py](/Users/erikholmberg/Development/ai-pm-toolkit/scripts/model-selection-scorecard.py)
    - [scripts/multi-model-cost-comparator.py](/Users/erikholmberg/Development/ai-pm-toolkit/scripts/multi-model-cost-comparator.py)
- Add a **runtime guardrails middleware tool** (PII redaction, prompt-injection checks, safety policy gates) usable across flows.
  - Why: current safety work is mostly offline diagnostics, not enforcement.
  - Evidence paths:
    - [scripts/hallucination-safety-trend.py](/Users/erikholmberg/Development/ai-pm-toolkit/scripts/hallucination-safety-trend.py)
    - [scripts/groundedness-scorer.py](/Users/erikholmberg/Development/ai-pm-toolkit/scripts/groundedness-scorer.py)
- Add a **workflow orchestrator tool** (stateful multi-step runs: PRD -> Jira -> release notes -> launch checks).
  - Why: turns point tools into end-to-end execution.
  - Evidence paths:
    - [workflows/daily-ai-pm-workflow.md](/Users/erikholmberg/Development/ai-pm-toolkit/workflows/daily-ai-pm-workflow.md)
    - [mcps/guides/mcp-use-cases-for-pms.md](/Users/erikholmberg/Development/ai-pm-toolkit/mcps/guides/mcp-use-cases-for-pms.md)

## Priority 2 (Build next)

- Add a **Product Analytics MCP server** (Amplitude/Mixpanel/Pendo) with standardized tools: funnel, retention, cohort, event trend, segment comparison.
  - Why: prioritization and roadmap decisions currently lack live product signal ingestion.
  - Evidence paths:
    - [mcps/README.md](/Users/erikholmberg/Development/ai-pm-toolkit/mcps/README.md)
    - [docs/suggested-tools.md](/Users/erikholmberg/Development/ai-pm-toolkit/docs/suggested-tools.md)
- Add an **Experiment Lifecycle Manager tool** (hypothesis registry, guardrail metrics, stop/ship rules, auto decision memo).
  - Why: calculators exist, but lifecycle governance is missing.
  - Evidence paths:
    - [scripts/ab-test-calculator.py](/Users/erikholmberg/Development/ai-pm-toolkit/scripts/ab-test-calculator.py)
    - [scripts/experiment-result-interpreter.py](/Users/erikholmberg/Development/ai-pm-toolkit/scripts/experiment-result-interpreter.py)
- Add a **traceability linker tool** that maps PRD sections to tickets, commits, PRs, launch checklist items, and KPI dashboards.
  - Why: closes planning-to-delivery visibility gap.
  - Evidence paths:
    - [templates/prd-template.md](/Users/erikholmberg/Development/ai-pm-toolkit/templates/prd-template.md)
    - [prompts/core-pm/prd-generator.prompt.md](/Users/erikholmberg/Development/ai-pm-toolkit/prompts/core-pm/prd-generator.prompt.md)

## Priority 3 (Then)

- Add a **VoC synthesis tool** (dedupe across Slack/support/interviews, pain severity scoring, opportunity ranking).
- Add a **release gate scorer tool** (go/no-go confidence with explicit evidence links).
- Add a **roadmap simulator tool** (scenario planning under capacity/dependency uncertainty).

## Suggested implementation sequence

1. Router + guardrails + orchestrator foundation.
2. Product analytics MCP and experiment lifecycle manager.
3. Traceability linker and VoC synthesis.
4. Release gate scorer and roadmap simulator.

## Success metrics

- Decrease failed/aborted agent workflows due to model/runtime issues.
- Reduce PM cycle time from PRD to launch-ready artifacts.
- Increase decision quality via live analytics-linked prioritization.
- Improve auditability with requirement-to-release trace coverage.

