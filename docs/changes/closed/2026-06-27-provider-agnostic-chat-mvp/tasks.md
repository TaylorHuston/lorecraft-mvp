# Tasks: Provider-Agnostic Narrative Director MVP

## Resume Here

- Current state: closeout in progress on `feature/provider-agnostic-chat-mvp`
- Last completed action: final verification passed; `review.md` verdict is ready; Taylor authorized closeout and merge
- Next action: commit the closed change folder on the feature branch, then fast-forward `main`
- Active branch/ref: `feature/provider-agnostic-chat-mvp`
- Expected dirty files: closeout docs until committed
- Known blockers: none

## Task Checklist

### 1. Epic Artifacts

- [x] 1.1 Create `docs/epics/lc-001-provider-agnostic-chat-experience/`.
- [x] 1.2 Create `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` from the Story, Requirement, and Scenario scope in `design.md`.
- [x] 1.3 Confirm each Story has Requirements, Scenarios, Implemented By, Verified By, and Verification Gaps.
- [x] 1.4 Document the deferred future model: story/play-session instances generated from world/templates.

### 2. Implementation

- [x] 2.1 Implement Story LC-001-S1: Narrative Play Feed And Unified Input.
  - [x] Requirement R1: Unified Narrative Input
    - [x] Scenario R1-S1: Player submits narrative intent
    - [x] Scenario R1-S2: Narrative movement does not mutate rooms
  - [x] Requirement R2: Resumable Feed
    - [x] Scenario R2-S1: Feed survives reload
    - [x] Scenario R2-S2: Feed distinguishes entry types
  - [x] Requirement R3: Pending And Failed Turns
    - [x] Scenario R3-S1: Request pending
    - [x] Scenario R3-S2: Missing world state
- [x] 2.2 Implement Story LC-001-S2: Provider-Agnostic Backend Director Boundary.
  - [x] Requirement R1: Next Route Handler Director Workflow
    - [x] Scenario R1-S1: UI submits intent
    - [x] Scenario R1-S2: Backend coordinates the turn
    - [x] Scenario R1-S3: Orchestration can move later
    - [x] Scenario R1-S4: Malformed world id
  - [x] Requirement R2: OpenAI-Compatible Provider Adapter
    - [x] Scenario R2-S1: Ollama local endpoint configured
    - [x] Scenario R2-S2: Alternate OpenAI-compatible endpoint configured
    - [x] Scenario R2-S3: No endpoint configured
  - [x] Requirement R3: Stateless Provider Requests With Bounded Context
    - [x] Scenario R3-S1: Director request is built
    - [x] Scenario R3-S2: Multiple narrative turns
- [x] 2.3 Implement Story LC-001-S3: Persistent Current-Scene NPC State.
  - [x] Requirement R1: Seed NPC State
    - [x] Scenario R1-S1: Mira is seeded
    - [x] Scenario R1-S2: Seeded memory has useful baseline text
  - [x] Requirement R2: Structured Director Output
    - [x] Scenario R2-S1: Valid Director output
    - [x] Scenario R2-S2: Invalid JSON
  - [x] Requirement R3: Bounded NPC Updates
    - [x] Scenario R3-S1: Mira is affected by the turn
    - [x] Scenario R3-S2: NPC is not affected
    - [x] Scenario R3-S3: Offscreen or unknown NPC update
  - [x] Requirement R4: Durable Memory Boundary
    - [x] Scenario R4-S1: Ephemeral reaction
    - [x] Scenario R4-S2: Immediate physical beat
    - [x] Scenario R4-S3: Durable interaction memory
  - [x] Requirement R5: Hidden State, Visible Behavior
    - [x] Scenario R5-S1: Narration uses mood naturally
    - [x] Scenario R5-S2: Debug mode shows hidden state
- [x] 2.4 Implement Story LC-001-S4: Debuggable Director Calls And Reset.
  - [x] Requirement R1: Director Call Audit
    - [x] Scenario R1-S1: Successful Director call
    - [x] Scenario R1-S2: Provider or validation failure
  - [x] Requirement R2: Local Debug Log
    - [x] Scenario R2-S1: Local debug logging enabled
    - [x] Scenario R2-S2: Raw LLM logging gated
  - [x] Requirement R3: Accepted And Ignored Update Visibility
    - [x] Scenario R3-S1: Valid and invalid fields mixed
    - [x] Scenario R3-S2: NPC update reason recorded
  - [x] Requirement R4: Rough Reset
    - [x] Scenario R4-S1: Reset playtest state
    - [x] Scenario R4-S2: Future story instances remain deferred
- [x] 2.5 Update Story-level Implemented By maps with current code locations after implementation.

### 3. Verification

- [x] 3.1 Add or update focused automated checks for Director request construction and bounded context selection.
- [x] 3.2 Add or update focused automated checks for provider adapter success, missing config, provider errors, invalid JSON, and strict output parsing.
- [x] 3.3 Add or update focused automated checks for actor key mapping, current-scene NPC validation, partial update acceptance, ignored update recording, and `memory` length limits.
- [x] 3.4 Verify feed reconstruction from `commands`, `narrations`, and `events` after reload.
- [x] 3.5 Verify accepted NPC updates persist as facts and state diffs/events/debug records.
- [x] 3.6 Verify narrative movement does not mutate room or actor-location state.
- [x] 3.7 Verify debug shows hidden NPC facts, director calls, raw/parsed output, accepted updates, ignored updates, and validation reasons.
- [x] 3.8 Run `npm run lint`.
- [x] 3.9 Run `npm run build`.
- [x] 3.10 Run Convex validation or local Convex development check appropriate to the implementation path.
- [x] 3.11 Manually verify a configured local Ollama OpenAI-compatible endpoint can answer a narrative playtest turn.
- [x] 3.12 Manually verify rough reset prepares the single playtest world for another Director/NPC-memory test.
- [x] 3.13 Update Story-level Verified By maps with concrete evidence.

### 4. Review And Closeout

- [x] 4.1 Run `th-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, and branch readiness.
- [x] 4.2 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [x] 4.3 Create a PR or merge only after `th-review` is ready and the app branch policy plus Taylor authorization allow it.
- [x] 4.4 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

### 5. Manual Feedback Continuation

- [x] 5.1 Add optional local-only JSONL Director debug logging.
  - [x] Requirement LC-001-S4 R2: Local Debug Log
    - [x] Scenario R2-S1: Local debug logging enabled
    - [x] Scenario R2-S2: Raw LLM logging gated
- [x] 5.2 Restart the dev server with debug logging enabled for manual playtest.
- [x] 5.3 Fix chat input layout so it is not pinned to the viewport bottom when the debug sidebar is taller.
- [x] 5.4 Make Enter submit the narrative input while preserving Shift+Enter for multiline text.
- [x] 5.5 Fix duplicate React keys in debug lists when repeated event/narration text appears.
- [x] 5.6 Refine NPC `status` guidance so immediate physical beats are not automatically persisted as durable status.
- [x] 5.7 Add `docs/persistence-system.md` and `docs/data-model.md` to codify the evolving persistence model.
- [x] 5.8 Add stable Story, Requirement, and Scenario IDs to the Epic and change design.
- [x] 5.9 Return a structured `400` for malformed Director `worldId` values without recording input or calling the LLM.
- [x] 5.10 Rerun verification and commit the complete review-remediated change set.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-06-27 | Proposal artifacts | main | `changes/2026-06-27-provider-agnostic-chat-mvp/` | Drafted initial proposed change artifacts | uncommitted |
| 2026-06-27 | Design tightening | main | `changes/2026-06-27-provider-agnostic-chat-mvp/` | Revised artifacts for narrative-first Director, persisted feed, structured output, NPC facts, director call debug, and rough reset | uncommitted |
| 2026-06-27 | Blocker resolution | main | `docs/changes/2026-06-27-provider-agnostic-chat-mvp/` | Migrated change to `docs/changes/` and resolved blocking decisions: Next Route Handler orchestration, Ollama-first setup, in-place reset, and no player-facing deterministic command UI | uncommitted |
| 2026-06-27 | TH apply discovery and Epic bootstrap | main with `th-apply`, `next-best-practices`, Convex AI guidance | `docs/changes/2026-06-27-provider-agnostic-chat-mvp/`, `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` | Reread proposal/design/tasks, branch policy, current app code, Next Route Handler/env docs, Convex generated guidance, and created the target Epic. Skipped AI SDK guidance because the change uses a plain OpenAI-compatible fetch adapter. | uncommitted |
| 2026-06-27 | Narrative Director vertical slice | main with `next-best-practices`, Convex AI guidance | `convex/schema.ts`, `convex/world.ts`, `src/app/api/director/turn/route.ts`, `src/lib/director/`, `src/app/world-client.tsx` | Implemented narrative feed/input, Route Handler orchestration, OpenAI-compatible adapter, strict output parsing, bounded current-scene NPC updates, `directorCalls`, Mira facts, debug panel, and rough reset. Removed player-facing command suggestions/parser path from the UI. | commit candidate: `Implement provider-agnostic narrative Director MVP` |
| 2026-06-27 | Docs and release notes | main | `README.md`, `CHANGELOG.md`, Epic, change tasks | Documented Ollama-compatible env vars, narrative-only player surface, deferred story-instance model, and Story-level implementation/verification maps. | commit candidate: `Implement provider-agnostic narrative Director MVP` |
| 2026-06-27 | Final apply self-review | main; no subagents used | Full changed surface | Reviewed proposal scope, design fidelity, Epic truth, tests/coverage, security/data safety, docs, changelog, branch state, and closeout state. Delegation was skipped because the implementation touched one small tightly coupled repo and no isolated implementation subagent was needed. | commit candidate: `Implement provider-agnostic narrative Director MVP` |
| 2026-06-27 | Manual feedback: local debug logs | main with `th-apply`; delegation skipped for small backend-only refinement | `docs/changes/2026-06-27-provider-agnostic-chat-mvp/`, Epic | Classified Taylor's request for local troubleshooting logs as a requirement refinement under the existing Debuggable Director calls Story; updated design and Epic with Local Debug Log scenarios before code edits. | uncommitted |
| 2026-06-27 | Local Director debug log implementation | main; Next Route Handler docs | `src/lib/director/debug-log.ts`, `src/app/api/director/turn/route.ts`, `.gitignore`, `package.json`, `README.md`, Epic/tasks | Implemented opt-in local JSONL logging gated by `LORECRAFT_DEBUG_LOG=1`, omitted raw LLM text unless `LORECRAFT_DEBUG_LOG_RAW_LLM=1`, added `dev:debug`, and kept `logs/` gitignored. | uncommitted |
| 2026-06-27 | Local debug dev restart | main | runtime dev server | Restarted with `npm run dev:debug` and Ollama env vars; verified `logs/director-debug.jsonl` was created by a safe malformed Director request. | uncommitted |
| 2026-06-27 | Manual feedback: chat input layout | main; delegation skipped for targeted UI defect | `src/app/world-client.tsx`, tasks | Classified the screenshot feedback as a UI defect: the input is pinned to the viewport bottom while the debug sidebar can be much taller, making the split layout awkward at zoomed-out or long-debug states. | uncommitted |
| 2026-06-27 | Chat input layout fix | main; browser measurement via system Chrome | `src/app/world-client.tsx`, tasks | Removed viewport-height/flex-auto positioning from the story column, removed the form's `mt-auto`, and kept the input directly below the feed while the debug sidebar can continue longer. | uncommitted |
| 2026-06-27 | Manual feedback: Enter-to-send | main; delegation skipped for targeted input ergonomics refinement | `src/app/world-client.tsx`, tasks | Classified Enter-to-send as a requirement refinement for the existing Unified Narrative Input behavior; Shift+Enter should remain available for multiline narrative text. | uncommitted |
| 2026-06-27 | Enter-to-send implementation | main; browser check via system Chrome | `src/app/world-client.tsx`, tasks | Added textarea key handling that submits the parent form on Enter and preserves Shift+Enter for multiline text. | uncommitted |
| 2026-06-27 | Manual feedback: duplicate debug keys | main; delegation skipped for targeted UI defect | `src/app/world-client.tsx`, tasks | Classified repeated event/narration text causing duplicate React keys as a debug panel UI defect. Local backend JSONL logs would not normally catch this browser-console-only warning. | uncommitted |
| 2026-06-27 | Duplicate debug key fix | main; browser console check via system Chrome | `src/app/world-client.tsx`, tasks | Replaced value-based debug list keys with title/index-scoped keys so repeated event or narration text can render without React key collisions. | uncommitted |
| 2026-06-27 | Manual feedback: durable status boundary | main; delegation skipped for targeted prompt/refinement change | `docs/changes/2026-06-27-provider-agnostic-chat-mvp/design.md`, Epic, tasks | Classified feedback that pushing Mira down should not immediately update `status` as a requirement refinement. Updated durable truth so immediate physical beats stay in narration/recent feed unless they become stable ongoing status. | uncommitted |
| 2026-06-27 | Durable status prompt refinement | main; no subagent used | `src/lib/director/prompt.ts`, `src/lib/director/director.test.ts`, design, Epic, tasks | Added Director guidance that `status` is stable ongoing circumstance, not moment-to-moment physical action, and tested that the request includes that guidance. | uncommitted |
| 2026-06-27 | Persistence documentation | main; research subagent input considered earlier, final docs edited in main repo | `docs/persistence-system.md`, `docs/data-model.md`, design, tasks | Codified the human-readable persistence system and canonical data model after NPC field feedback clarified description, status, and memory boundaries. | uncommitted |
| 2026-06-27 | TH review remediation | main with `th-apply`; specialist checkpoint for Next Route Handler/Convex input handling | `docs/changes/2026-06-27-provider-agnostic-chat-mvp/`, Epic, `src/app/api/director/turn/route.ts`, `src/lib/director/turn-errors.ts`, tests | Addressed required review findings: added stable IDs, documented malformed `worldId`, added structured context-load error handling, and added focused tests. | uncommitted |

## Verification Ledger

Record proof as it happens.

| Date | Check | What It Proves | Result |
|---|---|---|---|
| 2026-06-27 | Initial artifact reread | Proposal, design, and tasks existed and satisfied initial `th-propose` structure | Passed |
| 2026-06-27 | Revised artifact reread | Proposal, design, and tasks reflect the tightened narrative Director/NPC memory scope and still satisfy `th-propose` structure | Passed |
| 2026-06-27 | Blocking-question resolution reread | Proposal, design, and tasks no longer defer implementation-blocking decisions | Passed |
| 2026-06-27 | TH apply discovery | Change artifacts agree on scope, target Epic path is valid, project branch policy permits implementation work after Taylor's apply request, and current repo started clean on `main` | Passed |
| 2026-06-27 | Epic artifact check | `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` exists with embedded Stories, Requirements, Scenarios, Implemented By, Verified By, Verification Gaps, and deferred story-instance note | Passed |
| 2026-06-27 | `npm run test` | Director request construction, strict output parsing, missing config, OpenAI-compatible response extraction, current-scene actor validation, partial update acceptance, unknown NPC ignore, and `memory` cap | Passed: 1 test file, 8 tests |
| 2026-06-27 | `npm run lint` | ESLint checks the app, route, Convex, and Director modules | Passed |
| 2026-06-27 | `npm run build` | Next.js production compile/typecheck includes `/` and dynamic `/api/director/turn` | Passed |
| 2026-06-27 | `npm run convex:once` | Convex schema/functions typecheck and prepare against the local anonymous deployment | Passed |
| 2026-06-27 | Runtime local Ollama route check | `POST /api/director/turn` with `LLM_BASE_URL=http://localhost:11434/v1`, `LLM_API_KEY=ollama`, and `LLM_MODEL=llama3.1:8b` can answer a narrative turn and persist the result | Passed |
| 2026-06-27 | Post-turn Convex snapshot | Feed reconstructs from persisted commands/narrations/events; Mira facts persist under `actor:mira`; state diffs, events, raw/parsed Director call, accepted updates, and request summary are debug-visible | Passed |
| 2026-06-27 | Rough reset runtime check | `world:resetPlaytestWorld` clears commands, narrations, events, state diffs, and Director calls while preserving stable world graph rows and restoring Mira `mood`, `status`, and `memory` | Passed |
| 2026-06-27 | Full dev page GET | `npm run dev` serves `/` successfully at `http://localhost:3000` after removing the external font compile path | Passed |
| 2026-06-27 | `npm run test` after local debug log refinement | Debug log records are opt-in JSONL, raw LLM text is omitted unless enabled, and existing Director tests still pass | Passed: 1 test file, 10 tests |
| 2026-06-27 | `npm run lint` after local debug log refinement | ESLint checks the new log module, route wiring, and docs-adjacent script changes | Passed |
| 2026-06-27 | `npm run build` after local debug log refinement | Next.js production compile/typecheck accepts the Node.js Route Handler filesystem log module | Passed |
| 2026-06-27 | `npm run dev:debug` runtime check | Webpack dev server starts with `CONVEX_AGENT_MODE=anonymous`, `LORECRAFT_DEBUG_LOG=1`, and local Ollama env vars | Passed: Next listening on `:3000`, Convex on `:3210` |
| 2026-06-27 | Malformed Director request log check | Local JSONL logging writes a diagnostic entry without requiring a model call | Passed: `logs/director-debug.jsonl` contains `director.turn.rejected` at `stage: read_body`; tracked dev RSS stayed stable around 0.9-1.1 GB |
| 2026-06-27 | `npm run lint` after chat input layout fix | ESLint accepts the updated `world-client.tsx` layout classes | Passed |
| 2026-06-27 | `npm run build` after chat input layout fix | Next.js production compile/typecheck accepts the updated layout | Passed |
| 2026-06-27 | Chrome layout measurement at 1920x960 | The feed and input are adjacent in normal flow while the debug sidebar remains taller | Passed: feed bottom y=577, form top y=597, sidebar bottom y=1626; screenshot saved to `/tmp/lorecraft-layout-after.png` |
| 2026-06-27 | `npm run lint` after Enter-to-send | ESLint accepts the textarea keyboard handler | Passed |
| 2026-06-27 | `npm run build` after Enter-to-send | Next.js production compile/typecheck accepts the textarea keyboard handler | Passed |
| 2026-06-27 | Chrome keyboard behavior check | Enter submits the narrative form while Shift+Enter inserts a newline without submitting | Passed: intercepted one `POST /api/director/turn` for Enter; Shift+Enter left `requestsAfterShift=0` and textarea value `First line\\n` |
| 2026-06-27 | `npm run lint` after duplicate debug key fix | ESLint accepts the debug list key change | Passed |
| 2026-06-27 | `npm run build` after duplicate debug key fix | Next.js production compile/typecheck accepts the debug list key change | Passed |
| 2026-06-27 | Chrome console check after duplicate debug key fix | Browser no longer reports duplicate React key warnings for repeated debug list text | Passed: only React DevTools info and HMR messages observed |
| 2026-06-27 | `npm run test` after durable status refinement | Director request construction includes guidance that `status` is stable ongoing circumstance and immediate physical beats should be narrated instead | Passed: 1 test file, 10 tests |
| 2026-06-27 | `npm run lint` after durable status refinement | ESLint accepts the prompt/test/docs refinement | Passed |
| 2026-06-27 | `npm run build` after durable status refinement | Next.js production compile/typecheck accepts the prompt/test/docs refinement | Passed |
| 2026-06-27 | Artifact ID consistency scan | Epic and change design no longer contain un-IDed Story, Requirement, or Scenario headings | Passed |
| 2026-06-27 | `npm run test` after TH review remediation | Malformed Convex world ids normalize to structured 400 responses; unexpected context-load failures remain server errors; existing Director/debug tests still pass | Passed: 1 test file, 12 tests |
| 2026-06-27 | `npm run lint` after TH review remediation | ESLint accepts the route error handling, new helper, tests, and docs-adjacent code changes | Passed |
| 2026-06-27 | `npm run build` after TH review remediation | Next.js production compile/typecheck accepts the context-load catch path and typed Route Handler | Passed |
| 2026-06-27 | `git diff --check` after TH review remediation | No whitespace errors in the full dirty diff | Passed |
| 2026-06-27 | Runtime malformed `worldId` route check | `POST /api/director/turn` with `worldId: "not-a-convex-id"` returns structured `400` JSON instead of raw `500`, before player input recording or provider call | Passed: `{"ok":false,"error":"The selected world id is invalid. Seed or reload the world and try again."}` |
| 2026-06-27 | `npm run convex:once` after TH review remediation | Convex schema/functions prepare successfully after stopping the live dev backend that held port `3210` | Passed |

## Blockers

- None.

## Manual Feedback

| Date | Feedback | Classification | Action |
|---|---|---|---|
| 2026-06-27 | Add a local log file so Director/provider issues are easier to troubleshoot together, then restart the dev server with it enabled. | Requirement refinement | Update design/Epic/tasks with a Local Debug Log requirement, implement gitignored JSONL logging gated by env vars, verify, and restart webpack dev mode with logging enabled. |
| 2026-06-27 | The chat input is pinned to the bottom of the screen, causing layout issues when the right debug sidebar is longer. Screenshot: `/Users/taylor/Pictures/Vivaldi Captures/2026-06-27 19.28.16 localhost 24c0645391ed.jpg`. | Defect | Remove the viewport-bottom form behavior and keep the input in normal story-column flow beneath the feed. |
| 2026-06-27 | Pressing Enter in the narrative input should send the message. | Requirement refinement | Add Enter-to-submit keyboard handling to the textarea while preserving Shift+Enter for multiline text. |
| 2026-06-27 | Browser console warning: `Encountered two children with the same key, Mira's state changed after the exchange. (llm)` from `DebugList`. | Defect | Replace value-based debug list keys with position-scoped keys because repeated debug text is legitimate. |
| 2026-06-27 | Pushing Mira down should not immediately update her `status`; immediate physical beats should remain in narration/recent feed unless they become stable ongoing state. | Requirement refinement | Update design/Epic prompt guidance and tests so `status` is reserved for stable ongoing circumstances rather than moment-to-moment physical action. |
| 2026-06-27 | `th-review` required stable Story IDs, Requirement IDs, Scenario IDs, malformed `worldId` handling, persistence-doc ledger updates, and a clean commit-shaped branch. | Review finding | Add artifact IDs, codify the malformed-ID scenario, catch invalid Convex context-load errors as structured `TurnResponse` failures, record persistence docs, verify, and commit. |

## Deferred / Non-Blocking Questions

- Which Ollama model should be recommended after basic wiring works?
- Which deterministic debug affordances, if any, should be reintroduced after the narrative-first loop is working?
- When the POC grows beyond local playtesting, should Director orchestration move from the Next.js Route Handler to Convex actions or another backend service?

## Closeout

- Epic files updated: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Implemented By maps current: yes
- Verified By maps current: yes
- `th-review` verdict: ready in `docs/changes/closed/2026-06-27-provider-agnostic-chat-mvp/review.md`
- `review.md` findings resolved: yes
- PR / merge state: no PR; Taylor authorized fast-forward merge to `main`
- Deferred scope accepted: slash commands, MUD command parser, room mutation, story/play-session instances, provider picker, streaming, combat/rules/inventory remain deferred
- Change moved to `docs/changes/closed/`: yes
