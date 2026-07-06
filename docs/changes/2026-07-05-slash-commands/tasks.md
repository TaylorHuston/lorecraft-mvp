# Tasks: Slash Commands And Tutorial World

## Resume Here

- Current state: `/sdd-review` changes requested; safe review fixes applied.
- Last completed action: fixed review findings for offscreen `/look` locations, broad Tutorial deletion during reseed, empty first-run landing seed action, LC-002 top-level scope wording, and LC-001-S13 Story placement.
- Next action: commit safe review fixes, then rerun `/sdd-review` for a fresh ready verdict.
- Active branch/ref: `change/slash-commands-tutorial`
- Expected dirty files: safe review fixes in implementation, tests, Epic docs, `tasks.md`, and `review.md`
- Known blockers: none identified

## Task Checklist

### 1. Planning Quality

- [x] 1.1 Summarize the proposed scope boundary and confirm unresolved decisions.
- [x] 1.2 Challenge each proposed Story for user-path fit, Epic ownership, and unnecessary UI-task fragmentation.
- [x] 1.3 Refine Requirements and Scenarios into observable behavior.
- [x] 1.4 Record assumptions, open questions, and deferred scope instead of silently expanding the change.
- [x] 1.5 Confirm the planned `Verified By` sections can become scenario-mapped evidence indexes.

### 2. Epic Artifacts

- [x] 2.1 Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.
- [x] 2.2 Add `LC-001-S13` to the Story index/frontmatter.
- [x] 2.3 Update `docs/epics/lc-002-world-adventure-model/epic.md`.
- [x] 2.4 Add `LC-002/S5` to the Story index/frontmatter.
- [x] 2.5 Confirm `LC-001-S13` and `LC-002/S5` have Requirements, Scenarios, Implemented By, Verified By, and Verification Gaps.
- [x] 2.6 Reconcile earlier Stormbound-only and "avoid slash commands" guidance with this narrow pre-turn utility and Tutorial World scope.

### 3. Architecture Decisions

- [x] 3.1 Confirm `design.md` compares viable technical options.
- [x] 3.2 Confirm no ADR is required for this change.
- [x] 3.3 Confirm ADR status is not applicable.

### 4. Implementation

- [x] 4.1 Implement `LC-001-S13` through focused BDD/TDD phases.
  - [x] Story: `LC-001/LC-001-S13` - Pre-Turn Slash Command Utilities
    - [x] Requirement R1: Slash Command Input
      - [x] Scenario R1-S1: Help command
      - [x] Scenario R1-S2: Unsupported command
    - [x] Requirement R2: Look Command
      - [x] Scenario R2-S1: Look around current scene
      - [x] Scenario R2-S2: Look at visible target
      - [x] Scenario R2-S3: Look at unknown target
    - [x] Requirement R3: Utility Feed Persistence And Prompt Exclusion
      - [x] Scenario R3-S1: Utility result survives reload
      - [x] Scenario R3-S2: Utility result is not story-visible history
      - [x] Scenario R3-S3: Utility result does not affect turn lifecycle
    - [x] Requirement R4: Slash Command Autocomplete
      - [x] Scenario R4-S1: Command suggestions
      - [x] Scenario R4-S2: Look target suggestions
      - [x] Scenario R4-S3: Autocomplete remains optional
- [x] 4.2 Implement `LC-002/S5` through focused BDD/TDD phases.
  - [x] Story: `LC-002/S5` - Tutorial World Seed
    - [x] Requirement R1: Seeded Tutorial World
      - [x] Scenario R1-S1: Tutorial appears as a World container
      - [x] Scenario R1-S2: Tutorial Adventure copies its own source version
    - [x] Requirement R2: Progressive Tutorial Content
      - [x] Scenario R2-S1: Starter room with one NPC
      - [x] Scenario R2-S2: Multi-NPC room
      - [x] Scenario R2-S3: Unsupported future systems are not introduced
- [x] 4.3 Add schema/read-model support for Adventure-scoped utility messages.
- [x] 4.4 Add the backend slash-command route and provider-backed `/look` request builder.
- [x] 4.5 Add same-input command dispatch in the Act-expanded input without changing normal Act/Pass behavior.
- [x] 4.6 Generalize seeded World listing/Adventure creation from Stormbound-only to Stormbound plus Tutorial.
- [x] 4.7 Add Tutorial baseline content using current locations, exits, NPCs, facts, objects, and opening narration.
- [x] 4.8 Update Story-level Implemented By maps with current code locations.

### 5. Verification

- [x] 5.1 Add focused tests for parser/dispatch, route behavior, target handling, prompt exclusion, read-model feed behavior, and Tutorial seed/list behavior.
- [x] 5.2 Update Story-level Verified By maps with scenario-mapped evidence.
- [x] 5.3 Add deterministic E2E coverage for `/help`, `/look`, no turn increment, later Act, reload visibility, Tutorial listing, and Tutorial Adventure creation.
- [x] 5.4 Run `npm run ci:required`.
- [x] 5.5 Run `npm run e2e` because this changes browser input, feed rendering, route behavior, and Convex state.

### 6. Review And Closeout

- [x] 6.1 Update root `CHANGELOG.md` because this is user-facing added behavior.
- [x] 6.2 Run `sdd-review` as the local PR gate.
- [x] 6.3 Record review outcome as `review.md` or a clean review ledger note.
- [x] 6.4 Address review findings or explicitly defer accepted non-blocking risks.
- [ ] 6.5 Record manual UI confirmation status.
- [ ] 6.6 Confirm proposal/design/tasks/review artifacts do not contain stale implementation status.
- [ ] 6.7 Confirm closeout state has no contradictory Resume Here, checklist, review, manual confirmation, changelog, ADR, PR/merge, deferred-gap, or folder-location claims.
- [ ] 6.8 Merge only after `sdd-review` is ready and user authorization allows it.
- [ ] 6.9 After review/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

## Implementation Ledger

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-07-05 | Proposal | main | `docs/changes/2026-07-05-slash-commands/` | Drafted proposal, design, and tasks. | `implementation commit` |
| 2026-07-05 | Tutorial expansion | main | `docs/changes/2026-07-05-slash-commands/` | Added Tutorial seed World scope, LC-002 Story plan, and multi-World verification expectations. | `implementation commit` |
| 2026-07-05 | Discovery and Epic truth | main | `docs/changes/2026-07-05-slash-commands/`, LC-001 Epic, LC-002 Epic | Reread change artifacts, repo guidance, current Epics, Convex guidelines, Next guidance, and implementation files; switched from `develop` to `change/slash-commands-tutorial`; added pending LC-001-S13 and LC-002/S5 Stories. | `implementation commit` |
| 2026-07-05 | LC-001-S13 implementation | main + explorer `019f3639-30ae-7e51-bf6c-840d7982feb4` | `convex/schema.ts`, `convex/world.ts`, `src/lib/director/slash-command.ts`, `src/lib/director/look-prompt.ts`, `src/server/director/utility-*`, `src/app/api/director/utility/`, `src/features/play/*` | Added Adventure-scoped utility messages, `/help`, unsupported command handling, provider-backed `/look`, same-input slash dispatch, distinct utility feed rendering, reset/delete cleanup, and focused tests. | `implementation commit` |
| 2026-07-05 | LC-002/S5 implementation | main | `src/lib/world/stormbound-baseline.ts`, `convex/world.ts`, `src/features/play/adventure-landing.tsx`, `src/features/play/world-client.tsx`, `tests/e2e/lorecraft-playtest.spec.ts` | Added Tutorial seeded World, multi-World home containers, selected-World Adventure creation, and browser coverage for Tutorial Adventure creation. | `implementation commit` |
| 2026-07-05 | Docs/changelog reconciliation | main | `README.md`, `CHANGELOG.md`, `docs/architecture.md`, `docs/data-model.md`, `docs/persistence-system.md`, LC-001 Epic, LC-002 Epic | Updated public/current-state docs and scenario-mapped Epic evidence for slash utilities and Tutorial World. | `implementation commit` |
| 2026-07-05 | Forgiving `/look` target matching | main | `src/lib/director/look-prompt.ts`, `src/app/api/director/utility/route.test.ts` | Matched unique target tokens such as `/look Serin` to visible display names such as `Guide Serin` while preserving ambiguity handling. | `a82eb30` |
| 2026-07-05 | LC-001-S13/R4 autocomplete | main + explorer `019f365b-34de-79c0-ad82-40f825780880` | `src/lib/director/slash-command-autocomplete.ts`, `src/lib/director/slash-command-autocomplete.test.ts`, `src/features/play/turn-action-panel.tsx`, `src/features/play/world-client.tsx`, `tests/e2e/lorecraft-playtest.spec.ts`, LC-001 Epic, change artifacts, `README.md`, `CHANGELOG.md` | Added command and `/look` target autocomplete with keyboard/click acceptance, derived targets from current snapshot state, kept backend command parsing authoritative, and updated docs/evidence. | `6e03962` |
| 2026-07-06 | Safe `/sdd-review` remediation | main + artifact/code/security reviewers | `src/lib/director/look-prompt.ts`, `src/app/api/director/utility/route.test.ts`, `convex/world.ts`, `src/features/play/adventure-landing.tsx`, `src/features/play/world-client.tsx`, `tests/e2e/lorecraft-playtest.spec.ts`, LC-001 Epic, LC-002 Epic, `review.md`, `tasks.md` | Fixed offscreen location inspection, scoped reseed deletion to Stormbound, restored empty first-run seed action, and reconciled stale Epic artifact structure/wording. | review remediation commit |

## Verification Ledger

| Date | Check | Evidence Type | What It Proves | Result |
|---|---|---|---|---|
| 2026-07-05 | Artifact reread | planning check | Proposal, design, and task artifacts exist and capture confirmed scope decisions. | Passed |
| 2026-07-05 | Discovery refresh | planning check | Proposal/design/tasks agree on LC-001 slash utility scope and LC-002 Tutorial seed scope; branch policy now satisfied on `change/slash-commands-tutorial`; no blocking duplicate Story labels found in touched Epics. | Passed |
| 2026-07-05 | `npx convex codegen` | generated contract | Regenerated Convex TypeScript bindings after adding `utilityMessages`, `recordUtilityMessage`, and `listWorldContainers`. | Passed |
| 2026-07-05 | `npm run test -- src/lib/director/slash-command.test.ts src/app/api/director/utility/route.test.ts` | focused automated test | Proves slash parser, `/help`, unsupported commands, unknown `/look` target behavior, provider-backed `/look`, and no utility use of turn lifecycle mutations. | Passed |
| 2026-07-05 | `npm run test` | focused/broad automated test | Proves the full Vitest suite remains green with slash utilities and multi-World seed changes. | Passed, 60 tests |
| 2026-07-05 | `npm run typecheck` | broad supporting gate | TypeScript accepts utility route, feed, Convex contracts, and multi-World UI. | Passed |
| 2026-07-05 | `npm run convex:once` | Convex compile | Convex schema/functions compile with `utilityMessages`, Tutorial seed, and multi-World query changes after freeing local port 3210. | Passed |
| 2026-07-05 | `npm run e2e` | deterministic E2E | Browser proves `/help` and `/look` utility feed entries, no turn increment before the first Act, existing play loop, reset/delete, Tutorial container listing, and Tutorial Adventure creation. | Passed |
| 2026-07-05 | `npm run ci:required` | broad supporting gate | Lint, unit tests, typecheck, and production build pass cleanly. | Passed |
| 2026-07-05 | `npm run test -- src/app/api/director/utility/route.test.ts` | focused automated test | Proves unique partial target matching for `/look Serin` against `Guide Serin`. | Passed |
| 2026-07-05 | `npm run typecheck` | broad supporting gate | TypeScript accepts forgiving target matching. | Passed |
| 2026-07-05 | `npm run test -- src/lib/director/slash-command-autocomplete.test.ts` | focused automated test | Proves command suggestions, exact-command submission preservation, visible `/look` target suggestions, exact-target submission preservation, and non-command exclusion for LC-001-S13/R4. | Passed |
| 2026-07-05 | `npm run typecheck` | broad supporting gate | TypeScript accepts autocomplete view model wiring and client component changes. | Passed |
| 2026-07-05 | `npm run e2e` | deterministic E2E | Browser proves `/` command suggestions, `/l` acceptance into `/look `, `/look Mi` target suggestions, Tab acceptance to `/look Mira`, utility submission, and continued slash utility flow. | Passed |
| 2026-07-05 | `npm run ci:required` | broad supporting gate | Lint, unit tests, typecheck, and production build pass after autocomplete. | Passed, 66 tests |
| 2026-07-06 | `npm run test -- src/app/api/director/utility/route.test.ts src/lib/director/slash-command-autocomplete.test.ts` | focused automated test | Proves offscreen known locations are rejected for `/look`, visible targets still work, and autocomplete behavior remains correct. | Passed, 11 tests |
| 2026-07-06 | `npm run typecheck` | broad supporting gate | TypeScript accepts review fixes. | Passed |
| 2026-07-06 | `npm run e2e` | deterministic E2E | Browser playtest still passes after empty-state seed action and review fixes. | Passed |
| 2026-07-06 | `npm run ci:required` | broad supporting gate | Lint, unit tests, typecheck, and production build pass after review fixes. | Passed, 67 tests |

## Specialist Checkpoint

| Date | Slice | Touched Surface / Risk | Specialist Guidance Selected | Loaded / Delegated? | Consequence |
|---|---|---|---|---|---|
| 2026-07-05 | Discovery / next LC-001-S13 implementation slice | Convex schema/functions/read models, Next.js route handlers, React input/feed UI, deterministic E2E | `convex/_generated/ai/guidelines.md`, `next-best-practices`, SDD apply specialist routing, explorer subagent | loaded / delegated | Use bounded Convex tables and validators, keep route orchestration server-owned, keep utility output out of narration history, and verify route/feed/turn lifecycle with focused tests plus E2E. |
| 2026-07-05 | LC-002/S5 Tutorial implementation | Seed data, Convex world listing/create flow, home UI, E2E | `convex/_generated/ai/guidelines.md`, SDD apply specialist routing | loaded / skipped delegation | Kept Tutorial as existing baseline primitives and reused WorldVersion/Adventure copy mechanics; no new gameplay systems or static UI-only tutorial copy. |
| 2026-07-05 | LC-001-S13/R4 autocomplete | React client input UI, keyboard interaction, browser-visible suggestions, E2E | `next-best-practices`, shared visual style guide, SDD apply specialist routing, explorer subagent `019f365b-34de-79c0-ad82-40f825780880` | loaded / delegated | Keep autocomplete client-presentational, derive suggestions from already-loaded snapshot view data, keep backend parsing authoritative, and verify with focused suggestion tests plus E2E. |

## Manual Feedback

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| 2026-07-05 | `/look` should not consume a turn; it is one thing the user can do before they Act. | requirement refinement | Planned pre-turn utility behavior and explicit turn exclusion. | incorporated |
| 2026-07-05 | `/look` should support no target and specific targets. | requirement refinement | Added scene and target scenarios. | incorporated |
| 2026-07-05 | Slash command results should use a reusable distinct visual pattern. | requirement refinement | Planned `utility` feed style and reusable utility message shape. | incorporated |
| 2026-07-05 | Slash commands should use the same Act-expanded input with leading `/`. | requirement refinement | Planned same-input dispatch. | incorporated |
| 2026-07-05 | Add a seeded Tutorial World for learning the app, starting with one NPC and then a multi-NPC room. | scope expansion | Added LC-002 Tutorial World seed Story and kept future item manipulation deferred. | incorporated |
| 2026-07-05 | Add autocomplete for slash commands. | scope expansion accepted by `/sdd-apply` | Added LC-001-S13/R4 for client-side command and `/look` target suggestions while keeping backend parsing authoritative. | incorporated |

## Planning Updates

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|---|
| YYYY-MM-DD | TBD | in-scope refinement / scope expansion / product drift / Epic ownership change / technical constraint / follow-up change | TBD | `/sdd-apply` TBD |
| 2026-07-05 | Discovery refresh during apply | in-scope implementation setup | Confirmed code changes require `change/` branch; added pending Epic Stories before code. | Implement LC-001-S13 utility persistence/route slice. |

## Manual UI Confirmation

- Status: pending Taylor
- App URL / route: `/adventures/<id>`
- Required setup or test data: seeded Stormbound Chapel and Tutorial Worlds, plus at least one playable Adventure
- Steps for the user:
  - Confirm the home screen shows Stormbound Chapel and Tutorial as separate World containers.
  - Create or open a Tutorial Adventure.
  - Open an Adventure.
  - Open Act input.
  - Type `/` and confirm `/help` and `/look` suggestions appear.
  - Type `/look Mi`, accept the `Mira` suggestion with Tab or Enter, and confirm the input becomes `/look Mira`.
  - Submit `/help`, `/look`, `/look Mira`, and a normal Act.
  - Reload the Adventure.
- Expected result:
  - Slash command outputs look distinct from story narration.
  - Slash commands do not increment the turn number or end the decision phase.
  - Autocomplete helps fill commands and visible targets but manually typed commands still submit normally.
  - Normal Act still ends the turn and produces Game Master narration.
  - Utility outputs survive reload.
  - Tutorial starts in a one-NPC room and can lead to a multi-NPC room.
- Feedback that would change artifacts:
  - Utility entries feel too much like story narration.
  - `/look` should or should not call the LLM in specific target cases.
  - Same-input command routing creates confusing Act behavior.
  - Autocomplete key behavior feels intrusive or fails to suggest expected visible targets.

## Blockers / Open Questions

- None identified.

## Closeout

- Epic files updated: complete
- Story labels/references and Requirement/Scenario IDs current: complete
- Implemented By maps current: complete
- Scenario-mapped Verified By maps current: complete
- Superseded earlier Epic truth reconciled: complete
- ADR status: not applicable
- Changelog current: complete
- `sdd-review` verdict: changes-requested, safe fixes applied; fresh rerun pending
- Review record: `docs/changes/2026-07-05-slash-commands/review.md`
- `review.md` findings resolved: fixed in safe review pass; fresh rerun pending
- Planning updates resolved: not applicable
- Manual UI confirmation status: pending Taylor
- PR / merge state: local implementation pending fresh review/merge
- Deferred scope accepted: recorded
- Change moved to `docs/changes/closed/`: no
