# Design: LC-001 Epic Verify Fixes

## Current Understanding

LC-001 is the durable map for the current Lorecraft MVP. The Epic-verify report confirmed that core implementation, CI, and deterministic E2E pass, but several artifacts and tests lag the current architecture:

- Persistent story generation now returns plain prose.
- NPC and movement mutation are handled by a separate post-narration extractor.
- Route-level malformed request/context errors should be rejected before provider configuration is required.
- Epic `Verified By` should be a scenario-mapped evidence index rather than a chronological command list.

## Technical Approach

1. Add focused route-level coverage for malformed `worldId` behavior when LLM configuration is missing.
2. Move or duplicate the cheap malformed-world/context validation ahead of LLM provider configuration in `/api/director/turn`, without creating persisted turns or calling the provider.
3. Add focused tests for extractor failure/no-update and browser persistence gaps where the existing harness can cover them deterministically without live providers.
4. Reconcile LC-001 Epic text to current product truth:
   - story generation is read-only plain prose
   - extraction proposes bounded NPC updates and actor moves
   - autonomous/offscreen mutations are rejected
   - zero-diff successful turns are valid when extraction accepts no mutations
5. Normalize safe lifecycle artifacts:
   - manual confirmation vocabulary uses `not applicable`, `pending Taylor`, `Taylor confirmed`, or `accepted gap`
   - closed design files no longer say accepted completed work is unimplemented or unverified unless marked historical

## Affected Epic Truth

| Epic | Story | Requirement / Scenario | Impact | Needed Update |
|---|---|---|---|---|
| LC-001 | S2 | R1-S4 | Implementation/test hardening | Route rejects malformed `worldId` before LLM setup checks. |
| LC-001 | S3 | R2/R3 | Artifact reconciliation | Story prose is read-only; extractor owns bounded updates. |
| LC-001 | S4 | Debug/failure paths | Verification | Add focused evidence or record remaining gap. |
| LC-001 | S5 | Browser story stream paths | Verification | Map deterministic E2E evidence and add missing assertion if practical. |
| LC-001 | S7 | Context assembly | Artifact reconciliation | Replace stale `npcUpdates` story-generation wording with extractor wording. |
| LC-001 | S8 | Transcript mode | Verification | Map transcript-mode checks and retain any browser/manual gaps clearly. |
| LC-001 | S9 | Read-only NPC context | Artifact reconciliation | Scope read-only boundary to story generation after S10 supersession. |
| LC-001 | S10 | Extracted NPC state mutation | Verification | Add focused extractor no-update/failure coverage or record remaining gap. |
| LC-001 | S11 | Deterministic E2E | Artifact reconciliation | Clarify UI-level duplicate submission scope. |
| LC-001 | S12 | Location cards and movement | Artifact reconciliation | Clarify autonomous movement rejection and live-provider movement gap. |

## Verification Strategy

- Focused automated tests:
  - `npm run test -- src/lib/director/director.test.ts`
  - Additional focused tests as needed for route or extraction behavior.
- Deterministic E2E:
  - `npm run e2e` when browser route/feed/debug behavior changes.
- Broad supporting gate:
  - `npm run ci:required`
- Artifact checks:
  - `git diff --check`
  - targeted scans for stale manual status vocabulary and stale implementation-pending text.

## Alternatives / Deferred

- Narrowing `LC-001-S2 R1-S4` to require LLM configuration was rejected for now because malformed request/context validation is cheap and should not require provider setup.
- Backend duplicate-submit prevention is deferred. Current S1 duplicate prevention is client pending-state behavior unless a future Story adds server idempotency.
- Live-provider movement and model-quality playtests remain empirical optional checks.

## Open Questions

None blocking.
