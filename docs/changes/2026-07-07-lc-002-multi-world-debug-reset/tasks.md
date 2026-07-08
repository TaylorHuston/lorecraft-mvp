# Tasks: LC-002 Multi-World Debug Reset Fixes

## Resume Here

- Current state: `/sdd-review` safe-fix remediation committed
- Last completed action: committed review remediation slice `712844b`
- Next action: rerun `/sdd-review`
- Active branch/ref: `fix/lc-002-multi-world-debug-reset`
- Expected dirty files: change artifacts, Convex/world helper code, tests, LC-002 Epic, changelog
- Known blockers: none identified

## Task Checklist

### 1. Discovery And Artifacts

- [x] 1.1 Read app guidance, SDD apply guidance, Convex guidance, LC-002 Epic, and Epic verification report.
- [x] 1.2 Create tracked SDD change artifacts for the LC-002 follow-up.
- [x] 1.3 Confirm the selected fix belongs to LC-002 and does not require splitting or merging Epics.

### 2. Implementation

- [x] 2.1 Add source-version-aware seeded baseline helpers.
- [x] 2.2 Update debug-created Location and NPC counting to use the Adventure source baseline.
- [x] 2.3 Update per-NPC reset to restore seeded NPCs from the Adventure source baseline and delete only debug-created NPCs.

### 3. Verification

- [x] 3.1 Add deterministic tests for Stormbound and Tutorial baseline classification/reset data.
- [x] 3.2 Run focused tests.
- [x] 3.3 Run `npm run ci:required`.
- [x] 3.4 Record E2E as not run if the dev server must remain running.

### 4. Artifact Reconciliation

- [x] 4.1 Update LC-002 `Implemented By`, `Verified By`, and `Verification Gaps`.
- [x] 4.2 Update supporting docs if source-version-aware debug semantics change their truth.
- [x] 4.3 Update `CHANGELOG.md` with a public-safe `Fixed` entry.
- [x] 4.4 Record manual UI confirmation status.

### 5. Apply Self-Check

- [x] 5.1 Run implementation self-check for scope, Epic truth, tests, docs, changelog, and dirty state.
- [x] 5.2 Commit verified changes if the slice is complete and commit-shaped.

## Specialist Checkpoint

| Date | Slice | Touched Surface / Risk | Specialist Guidance Selected | Loaded / Delegated? | Consequence |
|---|---|---|---|---|---|
| 2026-07-07 | LC-002 debug reset/accounting | Convex mutations, source-version data, resettable debug state, tests | `convex`, Convex AI guidelines, SDD delegated explorer | loaded / delegated | Use Adventure source WorldVersion baseline rather than Stormbound constants; keep edits narrow and tested. |

## Implementation Ledger

| Date | Entry | Commit |
|---|---|---|
| 2026-07-07 | Created tracked change artifacts for LC-002 multi-world debug reset/accounting follow-up. | `2742b0b` |
| 2026-07-07 | Added `src/lib/world/adventure-baseline.ts` helpers and focused tests for selected-baseline seeded/debug-created classification across Stormbound and Tutorial. | `2742b0b` |
| 2026-07-07 | Updated Convex debug-created NPC/Location counting and per-NPC reset to use the Adventure source WorldVersion baseline. | `2742b0b` |
| 2026-07-07 | Updated LC-002 Epic evidence and `CHANGELOG.md` for the debug reset/accounting fix. | `2742b0b` |
| 2026-07-07 | Remediated apply self-check findings by preserving Mira legacy fact cleanup in the Stormbound baseline and removing contradictory changelog status. | `2742b0b` |
| 2026-07-07 | Remediated `/sdd-review` findings by passing legacy cleanup keys through seeded NPC reset and adding a fallback for older stored Stormbound baselines. | `712844b` |

## Verification Ledger

| Date | Check | Result | Evidence Type | Notes |
|---|---|---|---|---|
| 2026-07-07 | Epic verification report | changes-requested | Epic verification | Identified Stormbound-specific debug reset/accounting as the implementation follow-up. |
| 2026-07-07 | `npm run test -- src/lib/world/adventure-baseline.test.ts` | passed, 1 file / 3 tests | focused automated test | Proves source-baseline classification differs correctly for Stormbound and Tutorial seeded/debug-created entities. |
| 2026-07-07 | `npm run typecheck` | passed | broad supporting gate | Confirms Convex and helper type integration compiles. |
| 2026-07-07 | `npx convex codegen` | passed | Convex compile/codegen | Confirms Convex functions and generated bindings compile after world mutation changes. |
| 2026-07-07 | `npm run test` | passed, 8 files / 83 tests | broad supporting gate | Confirms full Vitest suite passes with the new baseline helper tests. |
| 2026-07-07 | `npm run ci:required` | passed | broad supporting gate | Lint, unit tests, typecheck, and production build passed. |
| 2026-07-07 | `python3 .../epic_template_check.py docs/epics/lc-002-world-adventure-model/epic.md --format markdown` | passed, findings=0 | artifact verification | LC-002 Epic still satisfies the template after evidence updates. |
| 2026-07-07 | `npm run e2e` | not run | deterministic E2E gap | Skipped because the normal dev server must remain running and E2E owns local Convex/Next test ports. |
| 2026-07-07 | delegated apply self-check | findings remediated | implementation self-check | Found and fixed Mira legacy fact cleanup regression plus duplicate changelog status. |
| 2026-07-07 | `npm run test -- src/lib/world/adventure-baseline.test.ts` after self-check fix | passed, 1 file / 3 tests | focused automated test | Confirms Stormbound baseline still carries Mira legacy fact cleanup metadata. |
| 2026-07-07 | `npx convex codegen` after self-check fix | passed | Convex compile/codegen | Confirms Convex functions still compile after remediation. |
| 2026-07-07 | `npm run ci:required` after self-check fix | passed | broad supporting gate | Final required gate before commit. |
| 2026-07-07 | delegated code review | required finding remediated | source-vs-target code review | Found that seeded NPC reset did not pass legacy cleanup keys into `restoreSeededNpc`. |
| 2026-07-07 | delegated security review | required finding remediated | security review | Confirmed no debug write gate bypass, but flagged stale hidden fact retention until legacy cleanup keys were passed through. |
| 2026-07-07 | delegated artifact review | blocking finding remediated | artifact/lifecycle review | Found task ledger claimed self-check remediation before the reset implementation actually used the legacy cleanup metadata. |
| 2026-07-07 | `npm run test -- src/lib/world/adventure-baseline.test.ts` after review remediation | passed, 1 file / 4 tests | focused automated test | Confirms older stored Stormbound baselines still resolve Mira legacy fact cleanup keys. |
| 2026-07-07 | `npm run typecheck` after review remediation | passed | broad supporting gate | Confirms helper and Convex integration types compile after review remediation. |
| 2026-07-07 | `npx convex codegen` after review remediation | passed | Convex compile/codegen | Confirms Convex functions still compile after review remediation. |
| 2026-07-07 | `npm run ci:required` after review remediation | passed | broad supporting gate | Lint, full unit suite, typecheck, and production build passed after the review fix. |

## Manual UI Confirmation

- Status: pending Taylor
- App URL / route: `http://localhost:3000`
- Required setup or test data: Tutorial Adventure with Guide Serin and Stormbound Adventure with seeded NPCs.
- Steps for the user: open a Tutorial Adventure, edit Guide Serin in the debug NPC tab, reset that NPC, and confirm Serin is restored rather than deleted; optionally create a debug NPC and reset it to confirm debug-created NPC deletion still works.
- Expected result: seeded Tutorial NPCs reset to Tutorial baseline; debug-created NPCs still disappear on reset.
- Feedback that would change artifacts: different desired reset semantics for seeded NPCs, debug-created NPCs, or Tutorial entities.

## Blockers / Open Questions

- None identified.

## Closeout

- Review record: `/sdd-review` found safe-fix findings; remediation verified and committed. No `review.md` created because no unresolved unsafe findings remain after the safe-fix pass.
- Manual UI confirmation status: pending Taylor.
- Changelog status: updated under `Unreleased / Fixed`.
- PR / merge state: implementation committed on `fix/lc-002-multi-world-debug-reset`; review-fix committed; not merged.
- Folder location: active under `docs/changes/`.
