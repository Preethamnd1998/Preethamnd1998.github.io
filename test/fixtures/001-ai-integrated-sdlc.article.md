# AI-Driven Software Development: A Practical Engineering Experiment

> **Draft — pending review.** This article is unpublished and has no publication date. It describes a plan and a method; it contains no results.

## The engineering question

Experienced developers are being told that AI coding agents change how software gets built. Fewer people publish reproducible evidence about *where* they help across the whole lifecycle, what they cost, and where they fail.

This series asks one question: **how can an experienced developer use AI coding agents effectively across the software development lifecycle while controlling cost and preserving engineering quality?**

## Context and constraints

The series is one end-to-end experiment, not a collection of unrelated opinions. The roadmap ([`ROADMAP.md`](../../ROADMAP.md)) outlines 24 planned articles in five parts: establishing evidence, building an application with AI, testing and quality, working in existing codebases, and reusable practices.

The test subject is a deliberately conventional **Task and Approval Management System** ([problem statement](../../specifications/problem-statement.md)). The application is not the point; the methodology and its evidence are.

Constraints:
- **Cost awareness.** The work uses an existing AI environment and a documented low-cost subscription reference. Actual plan limits and any extra costs will be recorded; no fixed total cost is promised.
- **Privacy.** Synthetic data and public-safe examples only. No credentials, private agent configuration, employer code or confidential data.
- **Deployment is optional.** A reproducible build, automated tests and documented release readiness can show lifecycle coverage without a public deployment.
- **No premature complexity.** Start with ordinary repository search and clear instructions. Knowledge graphs, RAG, embeddings or MCP are introduced only when an experiment justifies them.

## Method

### Evidence rules
Every public claim follows the [Evidence Standard](../../evidence/EVIDENCE-STANDARD.md): state the claim, link its source, explain how it was collected, record environment and assumptions, disclose failures, and separate measurements from estimates. Six labels are used consistently: *Measured, Verified, Observed, Estimated, Planned, Not available*.

### Baseline first
Nothing is optimized before a baseline exists. The [baseline experiment](../../experiments/BASELINE-EXPERIMENT.md) implements one small vertical slice and records, among other things, commit SHA, agent and plan, context supplied, developer active versus elapsed time, available usage metrics (or `Not available`), tests run, defects and rework. Later experiments change one major variable at a time and compare like with like.

Experiment plans exist for [prompt evaluation](../../experiments/prompt-evaluation/README.md), [context retrieval](../../experiments/context-retrieval/README.md) and [token optimization](../../experiments/token-optimization/README.md). Measurements will be recorded in the [measurement log](../../evidence/MEASUREMENT-LOG.csv) and reported with the [experiment report template](../../experiments/EXPERIMENT-REPORT-TEMPLATE.md). The [test strategy](../../testing/TEST-STRATEGY.md) defines how quality is checked.

### Human accountability
AI-generated code, tests and documents are reviewed and verified by a person. Test coverage is not treated as proof of correctness.

## Evidence and results

**Planned.** At the time of this draft, no baseline run, test result, performance result or cost result has been recorded. This article therefore makes no quantitative claim. Results will appear in later articles, each linked to its experiment record.

## Failures and limitations

- A single developer, one demonstration application and a small number of runs will not generalize to every team or codebase.
- Tool behaviour, plan limits and models change; every result will be tied to a date and configuration.
- Some tools do not expose usage data. Those gaps will be labelled *Not available*, not filled with estimates presented as measurements.

## Reusable takeaways

1. Define the question and the evidence rules before running experiments.
2. Establish a baseline before optimizing.
3. Change one variable at a time and keep raw evidence.
4. Label what is measured, verified, observed, estimated, planned or unavailable.
5. Publish failures and limits alongside successes.

## Artifacts

See [`references.md`](references.md) for linked repository artifacts. Commit links will be added when the supporting work is committed and reviewed.
