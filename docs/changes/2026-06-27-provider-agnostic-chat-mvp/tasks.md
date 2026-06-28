# Tasks: Provider-Agnostic Narrative Director MVP

## Resume Here

- Current state: implementation-complete on `feature/provider-agnostic-chat-mvp`; ready for `/th-review`
- Last completed action: narrative Director MVP implemented, verified, Epic maps reconciled, and local playtest world reset to baseline
- Next action: run `th-review` as the independent local PR gate
- Active branch/ref: `feature/provider-agnostic-chat-mvp`
- Expected dirty files: implementation/docs changes until committed
- Known blockers: none

## Task Checklist

### 1. Epic Artifacts

- [x] 1.1 Create `docs/epics/lc-001-provider-agnostic-chat-experience/`.
- [x] 1.2 Create `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` from the Story, Requirement, and Scenario scope in `design.md`.
- [x] 1.3 Confirm each Story has Requirements, Scenarios, Implemented By, Verified By, and Verification Gaps.
- [x] 1.4 Document the deferred future model: story/play-session instances generated from world/templates.

### 2. Implementation

- [x] 2.1 Implement the narrative play feed and unified input Story.
  - [x] Requirement: Unified Narrative Input
    - [x] Scenario: Player submits narrative intent
    - [x] Scenario: Narrative movement does not mutate rooms
  - [x] Requirement: Resumable Feed
    - [x] Scenario: Feed survives reload
    - [x] Scenario: Feed distinguishes entry types
  - [x] Requirement: Pending And Failed Turns
    - [x] Scenario: Request pending
    - [x] Scenario: Missing world state
- [x] 2.2 Implement the provider-agnostic backend Director boundary Story.
  - [x] Requirement: Next Route Handler Director Workflow
    - [x] Scenario: UI submits intent
    - [x] Scenario: Backend coordinates the turn
    - [x] Scenario: Orchestration can move later
  - [x] Requirement: OpenAI-Compatible Provider Adapter
    - [x] Scenario: Ollama local endpoint configured
    - [x] Scenario: Alternate OpenAI-compatible endpoint configured
    - [x] Scenario: No endpoint configured
  - [x] Requirement: Stateless Provider Requests With Bounded Context
    - [x] Scenario: Director request is built
    - [x] Scenario: Multiple narrative turns
- [x] 2.3 Implement the persistent current-scene NPC state Story.
  - [x] Requirement: Seed NPC State
    - [x] Scenario: Mira is seeded
    - [x] Scenario: Seeded memory has useful baseline text
  - [x] Requirement: Structured Director Output
    - [x] Scenario: Valid Director output
    - [x] Scenario: Invalid JSON
  - [x] Requirement: Bounded NPC Updates
    - [x] Scenario: Mira is affected by the turn
    - [x] Scenario: NPC is not affected
    - [x] Scenario: Offscreen or unknown NPC update
  - [x] Requirement: Durable Memory Boundary
    - [x] Scenario: Ephemeral reaction
    - [x] Scenario: Durable interaction memory
  - [x] Requirement: Hidden State, Visible Behavior
    - [x] Scenario: Narration uses mood naturally
    - [x] Scenario: Debug mode shows hidden state
- [x] 2.4 Implement the debuggable Director calls and reset Story.
  - [x] Requirement: Director Call Audit
    - [x] Scenario: Successful Director call
    - [x] Scenario: Provider or validation failure
  - [x] Requirement: Accepted And Ignored Update Visibility
    - [x] Scenario: Valid and invalid fields mixed
    - [x] Scenario: NPC update reason recorded
  - [x] Requirement: Rough Reset
    - [x] Scenario: Reset playtest state
    - [x] Scenario: Future story instances remain deferred
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

- [ ] 4.1 Run `th-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, and branch readiness.
- [ ] 4.2 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [ ] 4.3 Create a PR or merge only after `th-review` is ready and the app branch policy plus Taylor authorization allow it.
- [ ] 4.4 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

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

## Blockers

- None.

## Deferred / Non-Blocking Questions

- Which Ollama model should be recommended after basic wiring works?
- Which deterministic debug affordances, if any, should be reintroduced after the narrative-first loop is working?
- When the POC grows beyond local playtesting, should Director orchestration move from the Next.js Route Handler to Convex actions or another backend service?

## Closeout

- Epic files updated: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Implemented By maps current: yes
- Verified By maps current: yes
- `th-review` verdict: pending
- `review.md` findings resolved: not applicable until `/th-review`
- PR / merge state: no PR; local commit pending on `feature/provider-agnostic-chat-mvp`
- Deferred scope accepted: slash commands, MUD command parser, room mutation, story/play-session instances, provider picker, streaming, combat/rules/inventory remain deferred
- Change moved to `docs/changes/closed/`: no; closeout requires `/th-review` or explicit Taylor override
