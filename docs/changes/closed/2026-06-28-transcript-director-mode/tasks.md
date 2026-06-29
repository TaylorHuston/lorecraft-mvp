# Tasks: Transcript Director Mode

## Resume Here

- Current state: closed
- Last completed action: Taylor authorized closeout; review was ready with Taylor's explicit branch-policy waiver, and the change folder was moved to `docs/changes/closed/2026-06-28-transcript-director-mode/`
- Next action: start a new SDD change for follow-up gameplay or UI work
- Active branch/ref: `develop`
- Expected dirty files: LC-001 Epic, Director route/lib tests/scripts/docs/package files, and this change folder
- Known blockers: none; manual UI confirmation remains pending Taylor as an accepted closeout gap for this prototype change

## Task Checklist

### 1. Epic Artifacts

- [x] 1.1 Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` with Story `LC-001-S8`.
- [x] 1.2 Confirm any cross-references in LC-001 existing Stories remain consistent with persistent vs transcript Director modes.
- [x] 1.3 Confirm Story `LC-001-S8` has app-unique stable Story ID, local Requirement IDs, local Scenario IDs, Implemented By, Verified By, and Verification Gaps.

### 2. Implementation

- [x] 2.1 Implement Story LC-001-S8: Transcript Director Mode.
  - [x] Requirement R1: Director Mode Configuration.
    - [x] Scenario R1-S1: Persistent mode remains default.
    - [x] Scenario R1-S2: Transcript startup flag enabled.
    - [x] Scenario R1-S3: Invalid startup mode rejected before persistence.
  - [x] Requirement R2: Plain-Prose Story Contract.
    - [x] Scenario R2-S1: Transcript prompt asks for prose.
    - [x] Scenario R2-S2: Non-empty prose succeeds.
    - [x] Scenario R2-S3: Empty prose fails cleanly.
  - [x] Requirement R3: Transcript And Debug Persistence Without World Mutation.
    - [x] Scenario R3-S1: Transcript turn resumes after reload.
    - [x] Scenario R3-S2: Director debug identifies mode and output contract.
    - [x] Scenario R3-S3: Raw artifacts remain gated.
  - [x] Requirement R4: Canonical State Mutation Disabled.
    - [x] Scenario R4-S1: NPC facts do not change.
    - [x] Scenario R4-S2: No LLM state diffs or world events.
    - [x] Scenario R4-S3: Context may still be read-only.
  - [x] Requirement R5: Mode Comparison Remains Testable.
    - [x] Scenario R5-S1: Same input can be tested in either server mode.
    - [x] Scenario R5-S2: Smoke playtest can prove no-mutation behavior.
- [x] 2.2 Add server-startup Director mode configuration, with persistent as the default and transcript enabled only by local flag.
- [x] 2.3 Update Story-level Implemented By maps with current code locations after implementation.

### 3. Verification

- [x] 3.1 Add focused tests for Director mode parsing/defaulting, transcript prompt construction, plain-prose output parsing, and no-mutation completion behavior.
- [x] 3.2 Verify persistent mode still follows the existing JSON and bounded NPC update path.
- [x] 3.3 Verify transcript mode by starting the app server with the startup flag, using a local model, and inspecting Convex snapshot/debug logs.
- [x] 3.4 Run `npm run ci:required`.
- [x] 3.5 Run `npx convex codegen` if Convex schema/functions/types are changed.
- [x] 3.6 Keep `npm run playtest:director` focused on persistent mode and add a separate transcript smoke command or check.
- [x] 3.7 Update Story-level Verified By maps with concrete evidence.

### 4. Documentation

- [x] 4.1 Update `docs/persistence-system.md` with the precise transcript-mode definition.
- [x] 4.2 Update `docs/data-model.md` if Director mode metadata, parsed response shape, or debug semantics are documented there.
- [x] 4.3 Update `README.md` with local startup-flag and playtest guidance for comparing modes.
- [x] 4.4 Update root `CHANGELOG.md` under `Unreleased` / `Added`.

### 5. Review And Closeout

- [x] 5.1 Run `sdd-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, changelog, and branch readiness.
- [x] 5.2 Record `/sdd-review` outcome as a `review.md` path, a clean review recorded in this ledger, or an explicit Taylor-approved review waiver.
- [x] 5.3 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [x] 5.4 Record manual UI confirmation status as `not applicable`, `pending Taylor`, `Taylor confirmed`, or `accepted gap`.
- [x] 5.5 Confirm closeout state has no contradictory Resume Here, checklist, review, manual confirmation, changelog, PR/merge, deferred-gap, or folder-location claims.
- [x] 5.6 Create a PR or merge only after `sdd-review` is ready and Taylor authorization allows it. Branch policy was explicitly waived for this review run only; Taylor authorized local closeout without PR.
- [x] 5.7 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-06-28 | Proposal | main | `docs/changes/2026-06-28-transcript-director-mode/` | Initial SDD artifacts drafted | uncommitted |
| 2026-06-28 | Discovery | main / sdd-apply | Change artifacts, LC-001 Epic, app guidance, Convex guidance, Next local docs | Confirmed no blockers; selected LC-001-S8 R1-R5 implementation path | uncommitted |
| 2026-06-28 | LC-001-S8 R1-R4 | main | `src/lib/director/mode.ts`, `src/lib/director/prompt.ts`, `src/lib/director/output.ts`, `src/lib/director/provider.ts`, `src/app/api/director/turn/route.ts`, `convex/world.ts`, `src/app/world-client.tsx` | Added startup mode config, plain-prose transcript contract, provider text mode, no-mutation completion, and debug mode/output display | uncommitted |
| 2026-06-28 | LC-001-S8 R5/docs | main | `scripts/director-transcript-playtest.mjs`, `package.json`, `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`, README, persistence/data model docs, changelog | Added separate transcript smoke check and reconciled durable docs | uncommitted |
| 2026-06-28 | LC-001-S8 verification | main | local Convex/Next/Ollama, task/design/Epic artifacts | Proved transcript no-mutation smoke and persistent default smoke; no server processes left running | uncommitted |
| 2026-06-28 | Final review remediation | main; delegation skipped because multi-agent tool requires explicit user authorization | `src/lib/director/prompt.ts`, `src/lib/director/director.test.ts`, verification docs | Removed contradictory nested `allowsNpcUpdates: true` guidance from transcript prompt payload and covered it with tests | uncommitted |
| 2026-06-28 | Manual feedback refinement | main | `src/lib/director/scene-beat.ts`, Director route/prompt/debug-log/tests, SDD artifacts | Added LLM scene-beat preflight while exploring no-mutation mode; later superseded for transcript mode | uncommitted |
| 2026-06-28 | Manual feedback refinement | main | `convex/world.ts`, `src/app/api/director/turn/route.ts`, `src/lib/director/prompt.ts`, tests, docs, script | Replaced read-only world prompt context with true seed-plus-transcript prompt context and renamed mode to `transcript` | uncommitted |
| 2026-06-28 | Manual feedback refinement | main | `convex/world.ts`, playtest scripts, UI copy, docs | Made demo world seeding fresh and boot-scoped; prior demo worlds are purged during seed | uncommitted |

## Verification Ledger

Record proof as it happens.

| Date | Check | What It Proves | Result |
|---|---|---|---|
| 2026-06-28 | Artifact self-check | Proposal/design/tasks exist and identify LC-001-S8 scope | passed |
| 2026-06-28 | `npm run test` | Mode defaulting/validation, prose prompt construction, plain-prose parsing, provider text-mode request, and existing Director logic | passed |
| 2026-06-28 | `npm run typecheck` | Type contract split for Director mode/output contract and Convex route calls | passed |
| 2026-06-28 | `npm run ci:required` | Lint, tests, typecheck, and production build for the full app | passed |
| 2026-06-28 | `npx convex codegen` | Convex generated bindings remain valid after no-mutation completion argument | passed |
| 2026-06-28 | `LORECRAFT_DIRECTOR_MODE=transcript npm run dev:debug` + `npm run playtest:director:transcript` | Transcript turn stores command/turn/narration/director-call debug evidence while preserving baseline Mira facts and creating no LLM diffs/events | passed |
| 2026-06-28 | `npm run dev:debug` + `npm run playtest:director` | Default persistent strict-JSON Director path still produces narration and keeps existing smoke behavior | passed |
| 2026-06-28 | Final-review rerun: `npm run test`, `npm run typecheck`, `npm run ci:required`, `LORECRAFT_DIRECTOR_MODE=transcript npm run dev:debug` + `npm run playtest:director:transcript` | Prompt contradiction fix did not regress typed code, build, or no-mutation smoke behavior | passed |
| 2026-06-28 | Focused rerun: `npm run test -- src/lib/director/director.test.ts`, `npm run typecheck` | Scene-beat interpreter request/parse contracts, prompt override behavior, nested raw-log gating, and TypeScript contracts | passed |
| 2026-06-28 | `npm run ci:required` | Lint, tests, typecheck, and production build after scene-beat interpreter changes and docs updates | passed |
| 2026-06-28 | `npm run test -- src/lib/director/director.test.ts`, `npm run typecheck`, `npx convex codegen` | Transcript prompt now uses seed/transcript context and typed Convex/API bindings remain valid | passed |
| 2026-06-28 | `npm run ci:required` | Lint, tests, typecheck, and production build after transcript-only context changes | passed |
| 2026-06-28 | `npm run playtest:director:transcript` | Transcript mode stores the turn/narration/debug record, reports `directorMode: "transcript"`, and records zero accepted/ignored updates | passed |
| 2026-06-28 | Latest `logs/director-debug.jsonl` inspection | Raw transcript-mode prompt includes `worldSeed` and `transcript`; omits `sceneState`, `visibleFacts`, `hiddenNpcKnowledge`, and `requiredSceneBeat` | passed |
| 2026-06-28 | `npx convex codegen`, `npm run typecheck`, `npm run test -- src/lib/director/director.test.ts` | Fresh boot-scoped seed changes keep Convex bindings, TypeScript, and focused Director contracts valid | passed |
| 2026-06-28 | `npm run ci:required` | Full app lint, test, typecheck, and production build after fresh seed changes | passed |
| 2026-06-28 | `npm run playtest:director:transcript` | Smoke script seeds a fresh demo world directly and transcript mode completes without mutations | passed |
| 2026-06-28 | Latest `logs/director-debug.jsonl` inspection after fresh seed smoke | Latest transcript turn uses a new world id, seed/transcript prompt components, empty actor/NPC fact context, and zero accepted/ignored updates | passed |
| 2026-06-29 | Latest `logs/director-debug.jsonl` inspection | Manual playtest exposed symbol-only input persistence and current-input/continuity conflict handling bugs in transcript mode | issue found |
| 2026-06-29 | `npm run test -- src/lib/director/director.test.ts`, `npm run typecheck`, `npm run lint` | Narrative input validation rejects symbol-only turns; transcript prompt includes current-input priority and continuity-conflict guidance; TypeScript and lint remain clean | passed |
| 2026-06-29 | Latest `logs/director-debug.jsonl` inspection | Manual playtest exposed weak recency weighting: the Director saw the bartender's question but restated the player's ale request instead of resolving the exchange | issue found |
| 2026-06-29 | `npm run test -- src/lib/director/director.test.ts`, `npm run typecheck` | Transcript prompt now includes a high-priority `immediateContext` slice, exchange-resolution guidance, and filters previously persisted invalid turns plus their paired Director responses | passed |
| 2026-06-29 | AI Dungeon prompting research report review | Report reinforced explicit context assembly order, latest-action priority, input-mode canonicalization, and near-output Author's Note style guidance | actionable |
| 2026-06-29 | `npm run test -- src/lib/director/director.test.ts`, `npm run typecheck` | Transcript prompt now exposes ordered `worldSeed`, `transcript`, `immediateContext`, `lastAction`, and `sceneDirective` sections with inferred input mode and near-output guidance | passed |
| 2026-06-29 | `npm run test -- src/lib/director/director.test.ts`, `npm run typecheck` | Transcript prompt now explicitly treats player input as intent to resolve rather than already-canonical story prose | passed |
| 2026-06-29 | `/sdd-review` rerun with Taylor branch-policy waiver: `npx convex codegen`, `npm run ci:required`, `git diff --check`, `npm run playtest:director:transcript` | Full review gate remains clean after treating branch policy as waived for this run | passed |

## Manual Feedback

Record Taylor's manual testing feedback after implementation starts.

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| 2026-06-28 | Taylor agreed the first transcript mode should use plain prose output rather than minimal JSON. | requirement refinement | Captured in `design.md` decisions and R2. | accepted |
| 2026-06-28 | Taylor chose application-server startup flag mode selection instead of an in-app selector. | requirement refinement | Captured in `proposal.md`, `design.md`, and `tasks.md`. | accepted |
| 2026-06-28 | Taylor confirmed the existing Director playtest should remain persistent-mode focused and transcript should get a separate smoke check. | verification refinement | Captured in `design.md` verification strategy and task checklist. | accepted |
| 2026-06-28 | Taylor confirmed lore-card / keyword-triggered context injection is deferred; the preferred next direction after core chat works is real Lorecraft persistence. | scope clarification | Captured as deferred scope and design decision. | accepted |
| 2026-06-28 | Taylor chose to try an LLM-inferred scene beat instead of expanding hard-coded classification permutations. | superseded refinement | Added a scene-beat interpreter during exploration; later superseded when transcript mode became seed-plus-transcript only. | superseded |
| 2026-06-28 | Taylor identified that no-mutation mode was not truly transcript-only because canonical room/actor context still fought the transcript. | requirement correction | Renamed the mode to `transcript`; prompt now uses opening seed plus transcript only and omits runtime scene state, NPC facts, hidden knowledge, exits, objects, and scene-beat classification. | accepted |
| 2026-06-28 | Taylor clarified that world persistence is unnecessary for now; each server restart should start from a fresh seeded world. | requirement correction | `seedDemoWorld` now creates a boot-scoped fresh demo world and deletes prior demo worlds/dependent rows; smoke scripts seed directly instead of seed-plus-reset. | accepted |
| 2026-06-29 | Latest play logs showed transcript mode accepted a symbol-only `√` input and could ignore continuity-conflicting current input, such as asking Mira a question after leaving her days behind. | manual bug report | Added narrative input validation for symbol-only inputs and tightened transcript Director guidance around current-input priority and transcript-continuity conflicts. | accepted |
| 2026-06-29 | Latest play logs showed the Director did not weight the immediate bartender exchange strongly enough, causing the first ale request to be repeated rather than answered. | manual bug report | Added high-priority `immediateContext`, exchange-resolution guidance, and prompt-time filtering for previously persisted invalid turns. | accepted |
| 2026-06-29 | Taylor asked to apply suggestions from the AI Dungeon LLM dungeon master prompting report. | manual refinement | Reworked transcript prompt assembly into explicit AI-Dungeon-inspired priority sections: older transcript, immediate context, last action, and scene directive. | accepted |
| 2026-06-29 | Taylor agreed the MVP should explicitly treat unified player input as Director-resolved intent rather than already-canonical story prose. | manual refinement | Added system and scene-directive guidance not to copy `lastAction` verbatim as the next story paragraph unless it is quoted dialogue. | accepted |

## Planning Updates

Record `/sdd-propose --replan` updates when implementation or feedback discovers planning-level requirements.

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|---|
| 2026-06-28 | Initial proposal created from exploration of stateless vs transcript mode. | in-scope refinement | Created proposal.md / design.md / tasks.md | `/sdd-apply` from LC-001-S8 R1 |
| 2026-06-28 | Blocking questions resolved: startup flag selection, separate transcript smoke check, and context injection deferred. | in-scope refinement | Updated proposal.md / design.md / tasks.md | `/sdd-apply` from LC-001-S8 R1 |

## Manual UI Confirmation

- Status: pending Taylor; accepted closeout gap for this prototype change
- App URL / route: `http://localhost:3000`
- Required setup or test data: seeded Stormbound Chapel world, configured local LLM endpoint, app started in persistent mode and then started with the transcript startup flag
- Steps for Taylor: submit a direct Mira question in persistent mode, restart with the transcript flag, submit the same or comparable direct Mira question, reload the app, compare story/debug evidence
- Expected result: player input and Director narration persist, debug records show transcript/plain-prose mode, and NPC facts/state diffs/LLM world events remain unchanged
- Feedback that would change artifacts: startup flag should be replaced by per-turn UI selection, plain prose should be replaced by minimal JSON, or transcript turns should not persist transcript/debug records

## Questions And Readiness

### Blocking Questions

- None.

### Implementation-Discovery Questions

- None.

### Deferred Scope

- In-app or player-facing mode selection.
- Lore cards, keyword-triggered context injection, SillyTavern-style World Info, AI Dungeon-style Story Cards, embeddings, and retrieval.
- Broader persistence reintroduction after the core chat experience works in transcript mode.

### Apply Readiness

- Status: ready.
- Reason: Startup-flag mode selection, separate transcript smoke testing, and context-injection deferral have been decided.

## Closeout

- Epic files updated: yes
- Story/Requirement/Scenario IDs current: yes
- Implemented By maps current: yes
- Verified By maps current: yes
- Changelog current: yes
- `sdd-review` verdict: ready
- Review record: `docs/changes/closed/2026-06-28-transcript-director-mode/review.md`
- `review.md` findings resolved: yes
- Planning updates resolved: yes
- Manual UI confirmation status: pending Taylor; accepted closeout gap
- PR / merge state: not applicable; Taylor authorized local closeout on `develop` with branch policy waived for this change
- Deferred scope accepted: in-app mode selection, lore cards/keyword-triggered context injection, story instances, rollback, world mutation expansion
- Change moved to `docs/changes/closed/`: yes
