# Tasks: Turn Context And Pass

## Resume Here

- Current state: reviewed; ready for merge confirmation
- Last completed action: `/sdd-review` was rerun after stopping the dev server; required CI, deterministic E2E, and merge-tree checks passed.
- Next action: ask Taylor whether to perform the policy-defined merge-and-close into `develop`.
- Active branch/ref: `change/turn-context-and-pass`
- Expected dirty files: implementation/docs/tests listed in the implementation ledger plus this change folder
- Known blockers: none. Manual UI confirmation remains pending Taylor.

## Task Checklist

### 1. Planning Quality

- [x] 1.1 Summarize the proposed scope boundary and confirm unresolved decisions.
- [x] 1.2 Challenge each proposed Story for user-path fit, Epic ownership, and unnecessary UI-task fragmentation.
- [x] 1.3 Refine Requirements and Scenarios into observable behavior, including Pass happy path, failure/debug path, prompt-context filtering, and extractor alignment.
- [x] 1.4 Record assumptions, open questions, candidate Stories, and deferred scope instead of silently promoting uncertain behavior into accepted Requirements.
- [x] 1.5 Confirm the planned `Verified By` sections can become scenario-mapped evidence indexes.

### 2. Epic Artifacts

- [x] 2.1 Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.
- [x] 2.2 Modify `LC-001-S1`, `LC-001-S6`, and `LC-001-S7` with the planned Requirements and Scenarios.
- [x] 2.3 Confirm each modified Story keeps stable legacy Story IDs, local Requirement IDs, local Scenario IDs, Implemented By, Verified By, and Verification Gaps.
- [x] 2.4 Reconcile stale "recent feed" wording so player-facing/debug feed remains distinct from future GM story context.

### 3. Architecture Decisions

- [x] 3.1 Confirm `design.md` compares viable technical options and selects derived story-visible history without a materialized visibility system.
- [x] 3.2 Confirm no ADR is required for this slice.
- [x] 3.3 Reconsider ADR need only if implementation expands into snapshots, retry, rollback, materialized story-history projections, or multiplayer turn ordering.

### 4. Implementation

- [x] 4.1 Implement Requirements through BDD/TDD phases.
  - [x] Story: LC-001-S1 - Narrative Play Feed And Unified Input
    - [x] Requirement R4: Pass Control
      - [x] Scenario R4-S1: Player passes the turn
      - [x] Scenario R4-S2: Pass is not story prose
  - [x] Story: LC-001-S6 - Scoped Narrative Turns
    - [x] Requirement R4: Turn Triggers
      - [x] Scenario R4-S1: Action turn uses committed player input
      - [x] Scenario R4-S2: Pass turn has no command
      - [x] Scenario R4-S3: Pass failure is debuggable
    - [x] Requirement R5: Retry Remains Deferred
      - [x] Scenario R5-S1: Retry is not exposed as a player control
  - [x] Story: LC-001-S7 - Active Game Master Guidance And Context Assembly
    - [x] Requirement R10: Story-Visible History
      - [x] Scenario R10-S1: Prior commands are excluded from future story context
      - [x] Scenario R10-S2: Prior events are excluded from future story context
      - [x] Scenario R10-S3: Prior successful narrations are included
    - [x] Requirement R11: Pass Prompt Context
      - [x] Scenario R11-S1: Pass continues the scene
      - [x] Scenario R11-S2: Pass can produce bounded consequences
    - [x] Requirement R12: Extractor Uses The Same History Policy
      - [x] Scenario R12-S1: Extractor excludes prior commands and events
      - [x] Scenario R12-S2: Extractor remains grounded in canonical state
- [x] 4.2 Add enabling schema/API phases only if needed to represent commandless Pass turns cleanly.
- [x] 4.3 Update Story-level Implemented By maps with current code locations.
- [x] 4.4 Update README, `docs/data-model.md`, `docs/persistence-system.md`, and relevant testing/debug docs.

### 5. Verification

- [x] 5.1 Add focused prompt-construction tests for story-visible history filtering.
- [x] 5.2 Add focused route/Convex tests for Pass turn creation, commandless turn shape, success, and failure.
- [x] 5.3 Add or update deterministic E2E for the Pass button, no visible player Pass entry, visible GM narration, and debug-visible Pass turn.
- [x] 5.4 Verify extractor prompt context follows the same filtered history policy.
- [x] 5.5 Run `npm run ci:required`.
- [x] 5.6 Run `npm run e2e` because browser turn controls and persistence behavior are affected.
- [x] 5.7 Run optional live-provider playtest only after deterministic checks pass and only if useful for story-feel confidence.
- [x] 5.8 Inspect debug/log evidence for Pass trigger, story-visible prompt history, and absence of prior commands/events in future GM prompt context.
- [x] 5.9 Update Story-level Verified By maps with scenario-mapped evidence, not chronological command logs.

### 6. Review And Closeout

- [x] 6.1 Update root `CHANGELOG.md` under `Unreleased`.
- [x] 6.2 Run `sdd-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, changelog, ADR consistency, and branch readiness.
- [x] 6.3 Record review outcome as a `review.md` path, a clean review recorded in this ledger, or an explicit user-approved review waiver.
- [x] 6.4 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [x] 6.5 Record manual UI confirmation status as `not applicable`, `pending Taylor`, `Taylor confirmed`, or `accepted gap`.
- [x] 6.6 Confirm proposal/design/tasks/review artifacts do not still claim completed work is not implemented, not verified, pending, or accepted under obsolete manual status vocabulary.
- [x] 6.7 Confirm closeout state has no contradictory Resume Here, checklist, review, manual confirmation, changelog, ADR, PR/merge, deferred-gap, or folder-location claims.
- [ ] 6.8 Create a PR or merge only after `sdd-review` is ready and the app branch policy plus user authorization allow it.
- [ ] 6.9 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-07-02 | Planning | main with `/sdd-propose` | `docs/changes/2026-07-02-turn-context-and-pass/` | Proposal, design, and task ledger drafted after interview on turn framing, story-visible history, and Pass semantics. | e40a145 |
| 2026-07-02 | Discovery | main orchestrator; read `sdd-apply`, project `AGENTS.md`, `developer-guide.md`, Convex generated guidance, Next route docs; read-only subagent Newton (`019f25eb-8b28-76a1-9f8c-0dd75b88d0ee`) | Convex schema/functions, route handler, prompt assembly, UI, fixture, tests, docs | Confirmed player/debug feed should remain separate from GM story-visible history; commandless Pass needs a turn trigger and optional command handling in completion/extraction. | e40a145 |
| 2026-07-02 | LC-001-S1/R4, LC-001-S6/R4/R5, LC-001-S7/R10-R12 | main implementation with Convex, Next route, prompt, and browser verification guidance | `convex/schema.ts`, `convex/world.ts`, `src/app/api/director/turn/route.ts`, `src/app/world-client.tsx`, `src/lib/director/*`, fixture and E2E tests | Added `act`/`pass` turn triggers, commandless Pass turns, narration-only story-visible history for persistent story/extraction prompts, Pass UI, debug trigger visibility, fixture support, and deterministic coverage. | e40a145 |
| 2026-07-02 | Artifact reconciliation | main | LC-001 Epic, `README.md`, `CHANGELOG.md`, `docs/data-model.md`, `docs/persistence-system.md`, this task ledger | Updated Epic Requirements/Scenarios/Implemented By/Verified By, public docs, canonical data model, persistence strategy, and changelog to match implementation. | e40a145 |
| 2026-07-02 | Apply-side self-check fixes | main plus read-only subagents Jason, Turing, and Godel | `convex/world.ts`, `docs/architecture.md`, LC-001 Epic, `design.md`, this task ledger | Tightened pending-turn and trigger/command validation for commandless Pass completion/extraction; corrected stale design/Epic wording; recorded existing destructive client mutation exposure as a follow-up risk instead of broadening this change. | e40a145 |
| 2026-07-02 | Review follow-up cleanup | main | `.agents/`, `.claude/`, `.llm/`, `src/app/world-client.tsx`, `tests/e2e/lorecraft-playtest.spec.ts`, this task ledger | Committed unrelated vendored-skill deletions separately, retained Taylor's Act-expanded input feedback as in-scope UI behavior, and updated E2E helpers to open Act before typing. | 35770a1 / 5d2093e |

## Verification Ledger

Record proof as it happens. Keep chronological command output here; summarize only durable scenario-mapped evidence into Epic `Verified By`. Do not blur deterministic E2E, live-provider playtests, manual UI confirmation, broad gates, and debug/log inspection into one evidence bucket.

| Date | Check | Evidence Type | What It Proves | Result |
|---|---|---|---|---|
| 2026-07-02 | Planning artifact self-check | planning verification | Proposal/design/tasks exist, name LC-001 Epic actions, capture user decisions, defer Retry, and plan scenario-mapped verification. | passed |
| 2026-07-02 | `npx convex codegen` | generated/backend validation | Convex schema/functions compile after adding optional turn trigger, story-visible history query field, and commandless Pass mutations. | passed |
| 2026-07-02 | `npm test -- src/lib/director/director.test.ts src/app/api/director/turn/route.test.ts --run` | focused automated tests | Prompt construction excludes prior commands/events, includes narration history, renders Pass directive, extraction uses the same history policy, and route persists successful/failed Pass without command ids. | passed: 49 tests |
| 2026-07-02 | `npm run e2e` | deterministic E2E | Browser can click Pass, receive Game Master narration, avoid player-side Pass story prose, inspect Pass turn metadata, and continue through existing failure/travel/reset/adventure flows. | passed |
| 2026-07-02 | `npm run ci:required` | broad supporting gate | Lint, unit tests, typecheck, and production build pass after implementation and E2E fixture updates. | passed |
| 2026-07-02 | Source/doc inspection | artifact verification | Retry remains deferred; prior commands/events remain visible/debuggable but are excluded from persistent future GM story context. | passed |
| 2026-07-02 | Read-only self-check subagents | delegated review | Found stale artifact wording, an overclaimed Pass-specific mutation evidence statement, and a new commandless-Pass validation concern; no core implementation blocker remained after fixes. | addressed |
| 2026-07-02 | `npx convex codegen` after self-check fixes | generated/backend validation | Convex schema/functions still compile after explicit pending-turn and trigger/command validation. | passed |
| 2026-07-02 | `npm test -- src/lib/director/director.test.ts src/app/api/director/turn/route.test.ts --run` after self-check fixes | focused automated tests | Prompt/route coverage still passes after validation and artifact changes. | passed: 49 tests |
| 2026-07-02 | `npm run ci:required` after self-check fixes | broad supporting gate | Lint, unit tests, typecheck, and production build still pass. | passed |
| 2026-07-02 | `npm run e2e` after self-check fixes | deterministic E2E rerun attempt | Rerun was blocked because the user-requested dev server kept local Convex active on port 3210 and Playwright is configured to start its own Convex with `reuseExistingServer: false`; earlier E2E pass remains the browser evidence for this slice. | blocked by existing dev server, accepted for apply handoff |
| 2026-07-02 | `/sdd-review`; `npm run ci:required`; `git merge-tree --write-tree develop HEAD` | local PR-style review | Required CI passed and committed branch merges cleanly, but `review.md` recorded changes-requested because the app repo has uncommitted scoped UI changes, unrelated tracked deletions, and stale manual-feedback artifacts. | changes-requested |
| 2026-07-02 | Artifact follow-up inspection | artifact verification | `review.md` findings were addressed by committing deletion cleanup separately and updating this ledger for the Act-expanded input behavior. Latest E2E files now exercise clicking Act before typing. | ready for review rerun |
| 2026-07-02 | `npm run ci:required` during review rerun | broad supporting gate | Lint, unit tests, typecheck, and production build pass on the committed review branch. | passed |
| 2026-07-02 | `git merge-tree --write-tree develop HEAD` during review rerun | branch readiness | The committed branch merges cleanly into `develop`. | passed: `3ca22fa4ada63875bc4c4bedf8cac28cbc80f235` |
| 2026-07-02 | `npm run e2e` during review rerun | deterministic E2E | Attempted to verify the latest Act-expanded UI through Playwright. | blocked: local Convex dev server already listening on port `3210` |
| 2026-07-02 | `npm run e2e` after stopping dev server | deterministic E2E | Browser verifies Act opens the input, action turns submit, Pass advances without player prose, debug turn metadata is visible, and existing reset/travel/adventure flows still work. | passed: 1 test |

## Manual Feedback

Record the user's manual testing feedback after implementation starts.

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| 2026-07-02 | A turn starts when the Game Master asks what the player does, can include other player-side interactions, and ends after the player action or Pass is resolved by Game Master narration. | requirement refinement | Reframed turn as a resolved story beat with explicit triggers and deferred broader turn interactions. | incorporated |
| 2026-07-02 | Future Game Master context should read previous narration blocks plus canonical state, not raw commands/events, to reduce confusion. | requirement refinement | Added story-visible history policy for story generation and extraction. | incorporated |
| 2026-07-02 | Add Pass, equivalent to AI Dungeon Continue but game-framed. Retry should wait until snapshots/supersession exist. | requirement refinement | Added Pass trigger and deferred Retry. | incorporated |
| 2026-07-02 | Make the prompt read `What do you do?` above `Act` and `Pass`; clicking `Act` should expand into the text bubble and hide sibling buttons. | manual UI refinement | Kept the Act-expanded input behavior in this change, updated E2E submit helpers to click Act before typing, and refreshed manual UI confirmation steps. | incorporated |

## Planning Updates

Record `/sdd-propose --replan` updates when implementation or feedback discovers planning-level requirements.

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|
| YYYY-MM-DD | TBD | in-scope refinement / scope expansion / product drift / Epic ownership change / technical constraint / follow-up change | proposal.md / design.md / tasks.md | `/sdd-apply` TBD |

## Manual UI Confirmation

- Status: pending Taylor
- App URL / route: `http://localhost:3000/adventures/<id>`
- Required setup or test data: seeded Stormbound Chapel WorldVersion and at least one Adventure
- Steps for the user: open an Adventure, confirm `What do you do?` appears above the `Act` and `Pass` buttons, click `Act`, confirm the buttons are replaced by the text bubble, submit a normal action, then click `Pass` and confirm the story stream shows new Game Master narration without a player-side Pass message. Inspect the debug panel for `Act` and `Pass` turn metadata.
- Expected result: `Act` opens the text input only when needed, action turns still show player input, `Pass` advances the story as a turn trigger without story-prose player text, the debug turn list labels `Act` and `Pass`, and future persistent-mode GM context is less chat-like.
- Feedback that would change artifacts: desire to label the button Continue, show Pass in the story stream, support Retry now, hide events from the player stream, or treat typed `pass` as a command.

## Blockers / Open Questions

- None identified for this change.
- Follow-up risk: existing client-callable destructive Convex mutations (`seedDemoWorld`, `deleteAdventure`, `resetPlaytestWorld`) should move behind the same server/local guard policy before shared deployment. This predates the Pass work and is not required for this slice's behavior.
- None blocking for review; see `docs/changes/2026-07-02-turn-context-and-pass/review.md`.

## Closeout

- Epic files updated: yes, `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.
- Story labels/references and Requirement/Scenario IDs current: yes.
- Implemented By maps current: yes.
- Scenario-mapped Verified By maps current: yes.
- Superseded earlier Epic truth reconciled: yes; older recent-feed wording was narrowed where it referred to future GM prompt context.
- ADR status: not applicable for this slice; Retry/snapshot architecture may need a future ADR.
- Changelog current: yes.
- `sdd-review` verdict: ready.
- Review record: `docs/changes/2026-07-02-turn-context-and-pass/review.md`.
- `review.md` findings resolved: yes.
- Planning updates resolved: none.
- Manual UI confirmation status: pending Taylor.
- PR / merge state: not started; local implementation commit `e40a145` created; ledger updated in follow-up commit.
- Deferred scope accepted: Retry, snapshots, rollback, reversible diffs, turn supersession, event feed redesign, multiplayer turn ordering, and broader turn interactions.
- Change moved to `docs/changes/closed/`: no.
