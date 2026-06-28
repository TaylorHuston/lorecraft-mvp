# Tasks: Scoped Turns

## Resume Here

- Current state: closed
- Last completed action: merged `feature/scoped-turns` into `main` and moved the change folder to `docs/changes/closed/2026-06-27-scoped-turns/`.
- Next action: none.
- Active branch/ref: `main`
- Expected dirty files: none after closeout commit.
- Known blockers: `npm run convex:once` cannot run while the existing local Convex backend is already listening on port 3210; `npx convex codegen` passed as the non-destructive Convex validation.

## Task Checklist

### 1. Epic Artifacts

- [x] 1.1 Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` with `LC-001-S6: Scoped Narrative Turns`.
- [x] 1.2 Confirm `LC-001-S6` has stable Requirement IDs, Scenario IDs, Implemented By, Verified By, and Verification Gaps.
- [x] 1.3 Update `docs/data-model.md` and `docs/persistence-system.md` with the scoped turn model and deferred snapshot/rollback strategy.

### 2. Implementation

- [x] 2.1 Implement `LC-001-S6` through BDD/TDD phases.
  - [x] Story: `LC-001-S6` - Scoped Narrative Turns
    - [x] Requirement R1: Turn Lifecycle
      - [x] Scenario R1-S1: Successful narrative turn
      - [x] Scenario R1-S2: Provider or output failure after turn creation
      - [x] Scenario R1-S3: Request rejected before persistence
    - [x] Requirement R2: Turn-Scoped Feed And Debug Records
      - [x] Scenario R2-S1: Feed entries carry turn scope
      - [x] Scenario R2-S2: Debug panel can inspect turn grouping
      - [x] Scenario R2-S3: Seed rows remain outside player turns
    - [x] Requirement R3: Reset And Future Rollback Boundary
      - [x] Scenario R3-S1: Rough reset clears turn history
      - [x] Scenario R3-S2: State diffs remain tied to one turn
      - [x] Scenario R3-S3: Snapshot rollback remains deferred
- [x] 2.2 Add the `turns` table and `turnId` fields needed by existing turn-scoped tables.
- [x] 2.3 Update Director persistence flow so successful and failed post-persistence attempts complete a turn with the correct status.
- [x] 2.4 Expose turn scope in feed/debug data without changing the story stream into turn cards.
- [x] 2.5 Update Story-level Implemented By maps with current code locations.

### 3. Verification

- [x] 3.1 Add or update focused tests for turn-scoped prompt/debug metadata and verify production path with build/codegen.
- [x] 3.2 Verify feed/debug output includes turn scope by implementation and build checks; failed-turn status remains a manual playtest gap.
- [x] 3.3 Verify rough reset clears turns with the rest of playtest history by implementation and type validation; destructive runtime reset not run against Taylor's current playtest state.
- [x] 3.4 Run the smallest relevant app checks: tests, lint, build, and Convex validation.
- [x] 3.5 Update Story-level Verified By maps with concrete evidence.

### 4. Review And Closeout

- [x] 4.1 Update root `CHANGELOG.md` under `Added`.
- [x] 4.2 Run `th-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, changelog, and branch readiness.
- [x] 4.3 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [x] 4.4 Create a PR or merge only after `th-review` is ready and the app branch policy plus Taylor authorization allow it.
- [x] 4.5 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-06-27 | Proposal drafting | main with `th-propose`; no subagents used | `docs/changes/2026-06-27-scoped-turns/` | Drafted scoped-turn proposal, design, and task ledger. | local implementation commit |
| 2026-06-27 | Discovery | main with `th-apply`; loaded Convex project guidance, `convex/_generated/ai/guidelines.md`, `next-best-practices`, local Next 16 route-handler docs, and `references/specialist-routing.md`; no subagents used because the slice is tightly coupled and local | Change artifacts, app guidance, Epic, docs, Convex schema/functions, Director route, UI, tests | Confirmed artifacts are coherent, selected `LC-001-S6`, and created implementation branch. | `feature/scoped-turns` |
| 2026-06-27 | `LC-001-S6` R1/R2/R3 | main with Convex and Next route-handler guidance; no subagents used because schema, route, debug query, and UI changes were tightly coupled | `convex/schema.ts`, `convex/world.ts`, `src/app/api/director/turn/route.ts`, `src/lib/director/debug-log.ts`, `src/lib/director/types.ts`, `src/app/world-client.tsx`, `src/lib/director/director.test.ts` | Added scoped turn table, linked rows, lifecycle completion, debug summaries, reset cleanup, local log turn ids, and focused tests. | local implementation commit |
| 2026-06-27 | Artifact reconciliation | main | Epic, data model, persistence docs, changelog, change design/tasks | Documented `LC-001-S6`, canonical `Turn`, narrative flow, reset, and deferred snapshot rollback. | local implementation commit |
| 2026-06-27 | Final self-review | main; no delegated subagent review used because subagent tool policy requires explicit user authorization for delegation | Changed code and TH artifacts | No in-scope code/doc fixes found; manual/runtime verification gap remains recorded for `/th-review` and Taylor playtest. | local implementation commit |
| 2026-06-27 | Review and turn-number UI follow-up | main with `th-review` gate; Taylor manual feedback | `src/app/world-client.tsx`, Epic, tasks | Review passed, then story stream feed entries gained a subtle turn-number gutter sourced from `turnId` and `snapshot.turns`. | `e28532b` |
| 2026-06-27 | Merge and close | main | `docs/changes/closed/2026-06-27-scoped-turns/` | Fast-forwarded `main` to the feature branch and moved the active change folder to closed. | pending closeout commit |

## Verification Ledger

Record proof as it happens.

| Date | Check | What It Proves | Result |
|---|---|---|---|
| 2026-06-27 | Artifact reread | Proposal, design, and tasks exist and define Epic action, Story IDs, Requirements, Scenarios, changelog impact, and resume tasks | Passed |
| 2026-06-27 | `npm run test` | Focused director tests pass, including turn-scoped feed metadata being omitted from prompts and `turnId` retained in local debug records | Passed |
| 2026-06-27 | `npm run lint` | ESLint accepts changed TS/TSX files | Passed |
| 2026-06-27 | `npm run build` | Next production build and TypeScript checks pass for route/UI changes | Passed |
| 2026-06-27 | `npx convex codegen` | Convex schema/functions validate and generated TypeScript bindings update successfully | Passed |
| 2026-06-27 | `npm run convex:once` | Intended Convex once validation | Blocked: existing local backend is running on port 3210 |
| 2026-06-27 | `curl -I --max-time 5 http://localhost:3000` | Existing dev server responds after changes | Passed: `HTTP/1.1 200 OK` |
| 2026-06-27 | Final self-review | Scope, design fidelity, Epic truth, ID traceability, tests, security/data safety, docs, changelog, and branch readiness | Passed with recorded manual/runtime verification gap |
| 2026-06-27 | `/th-review` | Local PR gate for artifacts, Epic truth, requirements/scenarios, verification, manual confirmation, code, security, docs, changelog, and branch readiness | Passed: ready |
| 2026-06-27 | `npm run lint` | Turn-number story stream UI follow-up compiles cleanly under ESLint | Passed |
| 2026-06-27 | `npm run build` | Turn-number story stream UI follow-up passes Next production build and TypeScript checks | Passed |

## Manual UI Confirmation

Use the existing local app at `http://localhost:3000`.

1. Submit one normal narrative input.
   - Expected: the story stream continues as prose, turn-scoped feed entries show a subtle turn number in the left gutter, and the debug panel `Turns` section shows a new highest sequence turn with `succeeded`, the player input, one Director call status, and linked counts.
2. Trigger a provider/output failure if convenient, such as temporarily pointing `LLM_MODEL` at an unavailable local model before submitting.
   - Expected: no fake narration appears, the player-facing error stays near the input, and the debug panel shows the turn as `failed` after reload.
3. Use rough reset only if you are comfortable clearing the current playtest transcript.
   - Expected: scoped turns, commands, narrations, events, state diffs, and Director calls clear; Mira baseline facts are restored.

## Manual Feedback

Record Taylor's manual testing feedback after implementation starts.

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| 2026-06-27 | Surface the turn number in the story UI with a simple integer on the left of the stream. | requirement refinement | Added a subtle left-gutter turn number for turn-scoped feed entries and updated Epic/tasks verification. | addressed |

## Blockers / Open Questions

- Resolved: expose minimal turn status and sequence in the debug panel now.
- Resolved: failed provider/output attempts stay out of the player-facing story stream and remain inspectable through failed turns in debug.
- Remaining verification gap: manual browser playtest of failed turn summaries is pending.

## Closeout

- Epic files updated: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Story/Requirement/Scenario IDs current: yes
- Implemented By maps current: yes
- Verified By maps current: yes, with manual/runtime gaps recorded
- Changelog current: yes
- `th-review` verdict: ready
- `review.md` findings resolved: not applicable; no review findings file was created
- PR / merge state: merged to `main`
- Commit state: implementation commits `533cf28` and `e28532b`; closeout commit pending
- Deferred scope accepted: rollback, snapshots, branching, story instances, multiplayer ordering, command parser
- Change moved to `docs/changes/closed/`: yes
