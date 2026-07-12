# Tasks: Adventure Workbench UI And NPC Inspection

## Resume Here

Resume with `/sdd-apply` on `change/ui-improvements`. Code and deterministic remediation are complete. Await the delegated self-check results, address any findings, and then complete the manual UI confirmation plus full E2E when Convex port `3210` can be freed without violating the always-on server instruction.

Preserve the unrelated historical path-migration documentation edits already present in the worktree. The current implementation is uncommitted.

## Replan Classification

- Classification: accepted scope expansion plus technical/data constraint.
- Trigger: 2026-07-11 `/sdd-review` returned `changes-requested` after the interactive UI session expanded beyond cosmetic scope.
- Product decision: for the current internal MVP, Room Info intentionally exposes every canonical NPC field, including `knowledge`.
- Next workflow: fresh `/sdd-apply` beginning with the data-safety Requirement slice.

## Planning Updates

| Date | Discovery | Classification | Artifact Response | Next Action |
|---|---|---|---|---|
| 2026-07-11 | Interactive feedback added responsive panes, modals, NPC drill-down/location editing, and new command semantics beyond cosmetic polish. | Accepted scope expansion | Replaced original cosmetic proposal/design with the full Adventure workbench scope. | Reconcile code and Epic truth through `/sdd-apply`. |
| 2026-07-11 | Room NPC fields were sourced from debug-only bounded facts. | Technical/data constraint | Selected a typed subject-complete player NPC projection independent of debug mode. | Add focused snapshot tests, then implement. |
| 2026-07-11 | Full NPC writes can delete omitted facts and debounced saves/reset can commit out of order. | Data-integrity defect | Selected patch-only writes and serialized per-NPC queues. | Add preservation/ordering tests, then implement. |
| 2026-07-11 | Existing docs call `knowledge` private, while accepted feedback requests every field in Room Info. | Product-boundary refinement | Recorded an explicit internal-MVP exception and future visibility-policy deferral. | Reconcile Epic, data, persistence, README, and tests. |

## Requirement Checklist

### Data Safety And NPC Projection

- [x] `LC-001-S16/R2-S5`: Add failing test proving complete NPC profiles are available without debug snapshot flags.
- [x] `LC-001-S16/R2-S4`: Implement typed current-scene NPC profiles with every canonical field.
- [x] `LC-001-S9/R3-S6`: Add failing tests proving omitted facts survive a patch and explicit empty values delete only named facts.
- [x] `LC-001-S9/R3-S5`: Replace full NPC update writes with validated field/fact patches.
- [x] `LC-001-S9/R3-S7`: Add failing save-order test and serialize saves per NPC.
- [x] `LC-001-S9/R3-S8`: Add failing save/reset-order test and wait/invalidate before reset.

### NPC Creation And Editing UX

- [x] `LC-001-S9/R3-S4`: Preserve explicit selected-location creation and backend Adventure validation.
- [x] `LC-001-S9/R3-S9`: Add local required-field validation, modal-visible error/pending state, and duplicate-submit prevention.
- [x] Correct stale current-location creation copy.
- [x] Add deterministic create, move, invalid, and repeated-submit assertions; full browser execution remains pending.

### Command Surface

- [x] `LC-001-S1/R4-S5`: Add risk-shaped coverage for long textarea growth and successful reset.
- [x] Cap textarea growth, restore default height after successful submission, and preserve failed/draft text correctly.
- [x] Verify Act/Enter, Story, Guide, Pass-with-draft, and slash autocomplete semantics in deterministic code/E2E assertions; browser execution remains pending.

### Responsive And Modal Semantics

- [x] Remove mobile-only tabpanel semantics from simultaneous desktop panes.
- [x] Add deterministic browser assertions that Player/Room collapse leaves Story geometry unchanged.
- [x] Add deterministic browser assertions for Help and Debug Close/Escape/backdrop/focus/internal-scroll behavior.
- [x] Add deterministic browser assertions for narrow Player/Story/Room tabs and no horizontal overflow.

### Artifact And Supporting Truth

- [x] Reconcile `LC-001-S1`, `S4`, `S5`, `S9`, `S15`, and `S16` Requirements, Scenarios, implementation maps, evidence, and gaps.
- [x] Reconcile superseded hidden-knowledge, debug-drawer, expanding-input, and current-location-default wording.
- [x] Update `README.md`, `docs/data-model.md`, `docs/persistence-system.md`, and relevant style guidance.
- [x] Update `[Unreleased]` in `CHANGELOG.md` with user-facing changes only.
- [x] Remove or downgrade overstated verification evidence.

### Verification And Handoff

- [x] Run focused tests for each Requirement slice.
- [x] Run `npm run ci:required`.
- [ ] Run `npm run e2e` with Convex port `3210` free.
- [ ] Complete the manual UI confirmation walkthrough.
- [x] Run delegated implementation self-checks for code, coverage, security, and artifacts.
- [ ] Commit verified implementation slices without unrelated path-migration edits.
- [ ] Rerun `/sdd-review` against an immutable source commit.

## Existing Implementation Ledger

- Branch: `change/ui-improvements` from `develop` at `643c958`.
- 2026-07-11 apply restart: Discovery confirmed the replanned proposal/design/tasks agree, LC-001 owns every revised Story, no duplicate Story labels exist, and the next slice is the data-safety boundary. Expected dirty state includes the uncommitted UI implementation plus unrelated historical path-migration documentation edits.
- Implemented but not yet accepted: responsive tabs, three desktop panes, independent scrolling, fixed-track collapses, Help/debug modals, explicit NPC creation form/location selector, Room-to-NPC drill-down, complete-field UI, and persistent command surface.
- 2026-07-11 remediation: added subject-complete normal-mode NPC profiles, patch-only Convex writes, Adventure-aware serialized per-NPC save/reset ordering, bounded textarea reset behavior, creation validation/feedback, and desktop-only semantic cleanup. Supporting docs and Epic evidence were reconciled.
- 2026-07-11 delegated self-check: fixed stale cross-Adventure save-queue ownership, blocked NPC writes/creation during reset, keyed Room selection by canonical room key, and added missing command/create/modal assertions. The public unauthenticated `knowledge` projection remains the accepted local-only MVP boundary and blocks production/shared deployment without auth/visibility work.
- Review record: `review.md` returned `changes-requested` on 2026-07-11.
- Required CI at review: passed lint, 93 tests, typecheck, and production build.
- Deterministic E2E: assertions parse but have not executed because the always-on debug server owns port `3210`.

## Verification Ledger

| Date | Evidence | Type | Result | Notes |
|---|---|---|---|---|
| 2026-07-11 | `npm run ci:required` | Broad supporting gate | Pass | Lint, 93 Vitest tests, typecheck, and production build passed on the reviewed working tree. |
| 2026-07-11 | `npx playwright test --list` | Test discovery | Pass | Two Chromium E2E scenarios discovered. |
| 2026-07-11 | `npm run e2e` | Deterministic E2E | Blocked | Port `3210` occupied by preserved debug server. |
| 2026-07-11 | Deep `/sdd-review` | Independent review | Changes requested | Privacy/product boundary, fact preservation, save ordering, textarea, validation, semantics, artifact, and evidence findings recorded in `review.md`. |
| 2026-07-11 | Focused remediation suite | Requirement tests | Pass | 21 tests cover snapshot projection, NPC patch/create validation, save/reset ordering, creation form validation, Room identity, and textarea sizing/restoration. |
| 2026-07-11 | `npm run ci:required` | Broad supporting gate | Pass | Lint, 107 Vitest tests, typecheck, and production build passed after delegated self-check remediation. |
| 2026-07-11 | `git diff --check`, `npx playwright test --list`, runtime `curl` | Static/runtime smoke | Pass | Diff is clean, two Chromium scenarios are discovered, and the preserved dev server returns HTTP 200. |

## Manual UI Confirmation

- Status: pending user
- Route/setup: `npm run dev:debug`, then open an existing Adventure at `http://localhost:3000/adventures/<adventureId>`.
- Desktop:
  - Scroll Player, Story, and Room independently.
  - Collapse Player and Room; Story must not move or resize.
  - Submit a long action; the cleared textarea must return to its default bounded height.
  - Submit the same short draft through Act, Story, and Guide; use Pass while a draft exists.
- NPC/debug:
  - Open a present NPC and inspect every field, including `knowledge`, then return to Room.
  - Create an NPC in one selected location, move it to another, and verify unrelated facts remain unchanged.
  - Try invalid and repeated NPC creation; feedback must remain visible inside the modal and only one actor may be created.
- Narrow viewport near `375x812`:
  - Switch Player/Story/Room tabs with pointer and keyboard.
  - Open/close Help and Debug by Close, Escape, and backdrop.
  - Confirm focus return, internal modal scrolling, and no horizontal overflow.
- Expected result: accepted action semantics remain distinct, canonical facts are preserved, complete NPC profiles work in normal/debug modes, and layout remains contained.

## Blockers And Open Questions

- No planning blocker remains.
- The original findings in `review.md` have been remediated or explicitly accepted by the replan; a fresh `/sdd-review` is still required against the completed source commit.
- Full deterministic E2E requires temporarily freeing local Convex port `3210`; do not stop the always-on server without coordinating that verification step.

## Closeout

- Review record: `review.md`; latest verdict `changes-requested` on 2026-07-11.
- Manual confirmation status: pending user.
- Release communication status: `[Unreleased]` updated with user-facing behavior.
- PR / merge state: source branch uncommitted; no PR or merge authorized.
- ADR status: not applicable; no durable cross-project architecture decision proposed.
- Accepted deferred gaps: future public/authenticated NPC-field visibility policy.
- Folder state: active under `docs/changes/2026-07-11-ui-improvements/`.
