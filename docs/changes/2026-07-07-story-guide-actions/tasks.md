# Tasks: Story And Guide Actions

## Resume Here

- Current state: `/sdd-review` passed locally; ready to merge into `develop` and close.
- Last completed action: local review found no blocking or required findings; `npm run ci:required` passed.
- Next action: merge `change/story-guide-actions` into `develop`, move this change folder to `docs/changes/closed/`, and commit closeout.
- Active branch/ref: `change/story-guide-actions`
- Expected dirty files: review ledger update pending commit before merge.
- Known blockers: none

## Task Checklist

### 1. Planning Quality

- [x] 1.1 Summarize the proposed scope boundary and confirm unresolved decisions.
- [x] 1.2 Challenge the proposed Story for user-path fit, Epic ownership, and unnecessary UI-task fragmentation.
- [x] 1.3 Refine Requirements and Scenarios into observable behavior, including happy path, reload, failure, prompt boundary, reset/delete, and transcript-mode boundary.
- [x] 1.4 Record assumptions, open questions, candidate Stories, and deferred scope instead of silently promoting uncertain behavior.
- [x] 1.5 Confirm the planned `Verified By` sections can become scenario-mapped evidence indexes.

### 2. Epic Artifacts

- [x] 2.1 Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.
- [x] 2.2 Add `LC-001-S14: Pre-Turn Story And Guide Actions`.
- [x] 2.3 Reconcile `LC-001-S1`, `LC-001-S6`, `LC-001-S7`, and `LC-001-S13` wording that this change supersedes.
- [x] 2.4 Confirm Story labels/references and Requirement/Scenario IDs remain unique/current.

### 3. Architecture Decisions

- [x] 3.1 Compare viable technical options in `design.md`.
- [x] 3.2 Decide ADR status.
- [x] 3.3 Confirm ADR status remains accurate after implementation and review.

### 4. Implementation

- [x] 4.1 Implement `LC-001-S14/R1`: Story inserts.
  - [x] Scenario R1-S1: Player records Story setup.
  - [x] Scenario R1-S2: Story insert is visible and resumable.
  - [x] Scenario R1-S3: Story insert is future story context.
- [x] 4.2 Implement `LC-001-S14/R2`: Story inserts do not mutate state immediately.
  - [x] Scenario R2-S1: Story insert does not run extraction.
  - [x] Scenario R2-S2: Later resolving turns can react to Story setup.
- [x] 4.3 Implement `LC-001-S14/R3`: Guide turns.
  - [x] Scenario R3-S1: Guide creates a resolving turn.
  - [x] Scenario R3-S2: Guide text is hidden from the story stream.
  - [x] Scenario R3-S3: Guide text is current-turn context only.
  - [x] Scenario R3-S4: Failed Guide remains debuggable.
- [x] 4.4 Implement `LC-001-S14/R4`: Context category boundaries.
  - [x] Scenario R4-S1: Future prompt context includes only story-visible history.
  - [x] Scenario R4-S2: Reset and delete clean up Story and Guide records.
  - [x] Scenario R4-S3: Transcript mode remains separate.
- [x] 4.5 Update Story-level Implemented By maps with current code locations.
- [x] 4.6 Update `docs/data-model.md`, `docs/persistence-system.md`, README, and testing docs where behavior changes.

### 5. Verification

- [x] 5.1 Add focused verification for each implemented Requirement and Scenario.
- [x] 5.2 Update Story-level Verified By maps with scenario-mapped evidence, not chronological command logs.
- [x] 5.3 Label evidence types: focused automated test, broad supporting gate, deterministic E2E, live-provider playtest, manual UI confirmation, or debug/log inspection.
- [x] 5.4 Run `npm run ci:required`.
- [x] 5.5 Run `npm run convex:once`.
- [x] 5.6 Run `npm run e2e` if browser, route, Convex state, prompt context, or persistence loop changes.
- [ ] 5.7 Optionally run a local live-provider playtest for Guide quality.

### 6. Review And Closeout

- [x] 6.1 Update root `CHANGELOG.md` under `Unreleased` because changelog impact is required.
- [x] 6.2 Run `/sdd-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, changelog, ADR consistency, and branch readiness.
- [x] 6.3 Record review outcome as a `review.md` path, a clean review recorded in this ledger, or an explicit user-approved review waiver.
- [x] 6.4 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [x] 6.5 Record manual UI confirmation status as `not applicable`, `pending Taylor`, `Taylor confirmed`, or `accepted gap`.
- [x] 6.6 Confirm proposal/design/tasks/review artifacts do not still claim completed work is not implemented, not verified, pending, or accepted under obsolete manual status vocabulary.
- [x] 6.7 Confirm closeout state has no contradictory Resume Here, checklist, review, manual confirmation, changelog, ADR, PR/merge, deferred-gap, or folder-location claims.
- [ ] 6.8 Create a PR or merge only after `/sdd-review` is ready and the app branch policy plus user authorization allow it.
- [ ] 6.9 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-07-07 | Proposed Story/Guide action scope | main, `/sdd-propose` | `proposal.md`, `design.md`, `tasks.md` | Planning artifacts drafted | `6384ce2` |
| 2026-07-07 | Discovery and delegation | main, `sdd-apply`; backend/frontend subagents | change artifacts, Epic, Convex/route/prompt/UI surfaces | Branch created and implementation slices delegated | `6384ce2` |
| 2026-07-07 | LC-001-S14/R1-R4 implementation | main orchestrator with backend/frontend subagents | Convex schema/functions, route parsing/orchestration, prompt categories, play UI, read model, E2E fixture path | Story inserts and Guide turns implemented with focused tests, E2E coverage, docs, changelog, and Epic truth reconciled | `6384ce2` |
| 2026-07-07 | Manual UI feedback: Pass last | main | `src/features/play/turn-action-panel.tsx` | Pass moved after Act, Story, and Guide in the decision controls. | `539e229` |
| 2026-07-07 | Manual feedback: tighter NPC extraction | main; `sdd-apply` specialist routing checked | extraction prompt, validation boundary, turn route, route/director tests, LC-001-S10, persistence docs, changelog | Added direct narration-support rules so momentary or intensified extractor proposals are ignored with debug-visible reasons. | `917968a` |

## Specialist Checkpoint

| Date | Slice | Touched Surface / Risk | Specialist Guidance Selected | Loaded / Delegated? | Consequence |
|---|---|---|---|---|---|
| 2026-07-07 | LC-001-S14/R1-R4 | Convex schema/functions, Next Route Handler, prompt contracts, browser-visible React UI, deterministic E2E | `convex/_generated/ai/guidelines.md`, `next-best-practices`, Next 16 local docs, shared visual style guide | loaded and delegated to backend/frontend subagents | Use existing Convex validators and thin route handlers; widen existing narration/turn contracts instead of adding a generalized timeline; keep UI client-only and story-first. |
| 2026-07-07 | LC-001-S10/R2 manual remediation | Prompt/validation boundary, Next Route Handler persistence path, deterministic tests | `sdd-apply` specialist routing; no new stack-specific specialist beyond existing route/prompt/test patterns because this is a narrow validation refinement | loaded routing / main-thread slice | Keep the fix in the extractor validation boundary, preserve debug evidence, and avoid schema or provider-contract expansion. |

## Verification Ledger

Record proof as it happens. Keep chronological command output here; summarize only durable scenario-mapped evidence into Epic `Verified By`. Do not blur deterministic E2E, live-provider playtests, manual UI confirmation, broad gates, and debug/log inspection into one evidence bucket.

| Date | Check | Evidence Type | What It Proves | Result |
|---|---|---|---|---|
| 2026-07-07 | Artifact self-review | planning review | Proposal, design, and task ledger exist and map Story/Requirements/Scenarios before implementation. | Passed |
| 2026-07-07 | `npm run test -- src/app/api/director/turn/route.test.ts src/lib/director/director.test.ts src/features/play/debug-formatters.test.ts src/lib/world/convex-snapshot-read-model.test.ts` | focused automated test | Route, prompt, debug summary, and read-model boundaries for Story/Guide. | Passed: 4 files, 64 tests |
| 2026-07-07 | `npm run test` | broad supporting gate | Full Vitest suite remains green with Story/Guide changes. | Passed: 7 files, 78 tests |
| 2026-07-07 | `npm run lint` | broad supporting gate | ESLint passes after UI, route, prompt, and doc-adjacent code changes. | Passed |
| 2026-07-07 | `npm run typecheck` | broad supporting gate | TypeScript contracts remain valid after schema/type widening. | Passed |
| 2026-07-07 | `npm run build` | broad supporting gate | Production Next build succeeds. | Passed |
| 2026-07-07 | `npm run convex:once` | Convex validation | Convex functions compile against the widened schema and mutations. | Passed; Convex warned AI files are out of date |
| 2026-07-07 | `npm run ci:required` | broad supporting gate | Required local gate passes: lint, test, typecheck, build, including the 78-test Vitest suite. | Passed |
| 2026-07-07 | `npm run e2e -- --grep "records Story setup"` | deterministic E2E | Disposable Adventure records Story setup, uses hidden Guide, verifies story/debug boundaries, reloads, and deletes the Adventure. | Passed |
| 2026-07-07 | `npm run e2e` | deterministic E2E | Full browser fixture suite passes with Story/Guide path plus existing playtest regression path. | Passed: 2 tests |
| 2026-07-07 | `npm run test -- src/lib/director/director.test.ts src/app/api/director/turn/route.test.ts` | focused automated test | Extraction prompt/validation and route persistence reject momentary or overreaching NPC fact proposals while preserving ignored-update debug evidence. | Passed: 2 files, 58 tests |
| 2026-07-07 | `npm run lint` | broad supporting gate | ESLint passes after Pass-order and extraction-boundary changes. | Passed |
| 2026-07-07 | `npm run typecheck` | broad supporting gate | TypeScript contracts remain valid after extractor boundary changes. | Passed |
| 2026-07-07 | `npm run test` | broad supporting gate | Full Vitest suite remains green after manual-feedback remediation. | Passed: 7 files, 80 tests |
| 2026-07-07 | `npm run ci:required` | broad supporting gate | Required local gate passes: lint, test, typecheck, and production build. | Passed |
| 2026-07-07 | `/sdd-review` local source-vs-`develop` review | local PR review | Change artifacts, Epic truth, Requirement/Scenario coverage, code diff, security posture, docs, changelog, and merge readiness were checked against `develop`. | Passed; no `review.md` needed |
| 2026-07-07 | `npm run ci:required` | broad supporting gate | Required pre-merge local gate passes: lint, test, typecheck, and production build. | Passed |
| 2026-07-07 | `npm run convex:once` | Convex validation | Attempted fresh Convex validation during review. | Skipped: existing local Convex backend is running on port 3210 through the dev server, which is intentionally kept running |

## Manual Feedback

Record the user's manual testing feedback after implementation starts.

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| 2026-07-07 | Pass should be the last decision option. | requirement refinement | Updated the turn action panel ordering; no Epic change needed because this is visual ordering inside existing LC-001-S14 controls. | resolved in `539e229` |
| 2026-07-07 | Latest logs showed extractor accepted overreaching momentary/intensified NPC state such as a ledger slipping becoming a dropped ledger or paralysis/frozen status. | defect / requirement refinement | Tightened extraction prompt, added narration-support validation, updated LC-001-S10/docs/changelog, and added focused director/route tests. | resolved in `917968a` |

## Planning Updates

Record `/sdd-propose --replan` updates when implementation or feedback discovers planning-level requirements.

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|---|
| 2026-07-07 | Taylor confirmed both Story and Guide are in scope. | in-scope refinement | Removed Story-only ambiguity from proposal/design and kept UI details as non-blocking manual-feedback scope. | `/sdd-apply` from Task Checklist 2.1 |
| TBD | TBD | in-scope refinement / scope expansion / product drift / Epic ownership change / technical constraint / follow-up change | TBD | `/sdd-apply` TBD |

## Manual UI Confirmation

- Status: accepted gap
- App URL / route: `http://localhost:3000/adventures/<id>`
- Required setup or test data: seeded Stormbound Chapel or Tutorial Adventure
- Steps for the user:
  - Open an Adventure.
  - Add a Story insert and confirm it reads like canonical story setup.
  - Use Act or Pass afterward and confirm the Game Master respects the Story setup.
  - Use Guide and confirm the raw Guide text stays hidden while the resulting narration appears.
  - Reload and confirm the visible story remains coherent.
- Expected result: Story and Guide are understandable, preserve story-first flow, and do not make the interface feel like a command dashboard.
- Feedback that would change artifacts: Story/Guide should be renamed, hidden behind a menu, or treated as slash commands instead of decision actions.

## Blockers / Open Questions

- None blocking.
- Accepted gap: subjective Story/Guide play feel and live-provider extraction quality remain empirical after deterministic coverage.

## Closeout

- Epic files updated: yes
- Story labels/references and Requirement/Scenario IDs current: yes
- Implemented By maps current: yes
- Scenario-mapped Verified By maps current: yes
- Superseded earlier Epic truth reconciled: yes
- ADR status: not applicable
- Changelog current: yes
- `/sdd-review` verdict: ready
- Review record: clean review recorded in this ledger; no `review.md` needed
- `review.md` findings resolved: not applicable
- Planning updates resolved: not applicable
- Manual UI confirmation status: accepted gap
- PR / merge state: authorized by `/close and merge`; pending local merge to `develop`
- Deferred scope accepted: live-provider Guide/extraction quality and subjective play feel remain manual/empirical
- Change moved to `docs/changes/closed/`: no
