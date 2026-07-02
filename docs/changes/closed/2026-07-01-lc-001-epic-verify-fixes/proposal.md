# Proposal: LC-001 Epic Verify Fixes

## Why

The LC-001 Epic verification report found that the implementation is broadly healthy but not fully aligned with the durable Epic truth. The highest-risk issue is a route-level malformed `worldId` contract that can return LLM setup failure before validating malformed world context. The report also found stale extractor-boundary wording, broad `Verified By` evidence, lifecycle/manual-confirmation drift, and missing focused checks for failure/browser edge paths.

## Scope

- Fix the malformed `worldId` route contract so malformed world IDs are rejected before LLM provider configuration is required.
- Add or update focused verification for the route contract and practical failure/browser edge paths called out by the Epic verification report.
- Reconcile LC-001 Epic wording around plain-prose story generation and separate post-narration extraction.
- Convert currently safe LC-001 `Verified By` evidence into scenario-mapped evidence where existing checks already prove the Scenario.
- Normalize manual confirmation vocabulary and stale closed-change wording that contradicts accepted implementation truth.
- Record the remediation against the Epic-verify report.

## Out Of Scope

- Hosted multi-user auth, ownership, rate limiting, and debug/reset hardening.
- New provider integrations or live-provider model-quality guarantees.
- A new movement system, command parser, combat/rules system, or broader world-builder scope.
- Private product-doc cleanup for command/MUD-oriented examples unless separately requested.

## Epic / Story Impact

- Epic: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Primary Story impact:
  - `LC-001-S2` malformed `worldId` contract and provider boundary evidence.
  - `LC-001-S3`, `LC-001-S7`, `LC-001-S9`, and `LC-001-S12` extractor-boundary wording.
  - `LC-001-S4`, `LC-001-S5`, `LC-001-S8`, and `LC-001-S10` focused verification gaps.
  - All Stories as needed for scenario-mapped `Verified By` cleanup.

## Changelog Impact

No public changelog entry expected unless implementation changes user-facing runtime behavior beyond error ordering and verification hardening.

## Source Report

- `docs/epics/lc-001-provider-agnostic-chat-experience/reviews/2026-07-01-0254-epic-verify.md`

## Open Questions

- None blocking. Use the report's recommended default: fix the code contract rather than narrowing the Scenario.
