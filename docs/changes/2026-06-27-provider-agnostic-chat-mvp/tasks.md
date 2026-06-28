# Tasks: Provider-Agnostic Narrative Director MVP

## Resume Here

- Current state: proposed, revised after design Q&A
- Last completed action: implementation-blocking questions resolved and artifacts updated for Route Handler orchestration, Ollama-first local setup, in-place reset, and narrative-only player surface
- Next action: create the proposed Epic if accepted
- Active branch/ref: `main`
- Expected dirty files: `docs/changes/2026-06-27-provider-agnostic-chat-mvp/`
- Known blockers: none

## Task Checklist

### 1. Epic Artifacts

- [ ] 1.1 Create `docs/epics/lc-001-provider-agnostic-chat-experience/`.
- [ ] 1.2 Create `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` from the Story, Requirement, and Scenario scope in `design.md`.
- [ ] 1.3 Confirm each Story has Requirements, Scenarios, Implemented By, Verified By, and Verification Gaps.
- [ ] 1.4 Document the deferred future model: story/play-session instances generated from world/templates.

### 2. Implementation

- [ ] 2.1 Implement the narrative play feed and unified input Story.
  - [ ] Requirement: Unified Narrative Input
    - [ ] Scenario: Player submits narrative intent
    - [ ] Scenario: Narrative movement does not mutate rooms
  - [ ] Requirement: Resumable Feed
    - [ ] Scenario: Feed survives reload
    - [ ] Scenario: Feed distinguishes entry types
  - [ ] Requirement: Pending And Failed Turns
    - [ ] Scenario: Request pending
    - [ ] Scenario: Missing world state
- [ ] 2.2 Implement the provider-agnostic backend Director boundary Story.
  - [ ] Requirement: Next Route Handler Director Workflow
    - [ ] Scenario: UI submits intent
    - [ ] Scenario: Backend coordinates the turn
    - [ ] Scenario: Orchestration can move later
  - [ ] Requirement: OpenAI-Compatible Provider Adapter
    - [ ] Scenario: Ollama local endpoint configured
    - [ ] Scenario: Alternate OpenAI-compatible endpoint configured
    - [ ] Scenario: No endpoint configured
  - [ ] Requirement: Stateless Provider Requests With Bounded Context
    - [ ] Scenario: Director request is built
    - [ ] Scenario: Multiple narrative turns
- [ ] 2.3 Implement the persistent current-scene NPC state Story.
  - [ ] Requirement: Seed NPC State
    - [ ] Scenario: Mira is seeded
    - [ ] Scenario: Seeded memory has useful baseline text
  - [ ] Requirement: Structured Director Output
    - [ ] Scenario: Valid Director output
    - [ ] Scenario: Invalid JSON
  - [ ] Requirement: Bounded NPC Updates
    - [ ] Scenario: Mira is affected by the turn
    - [ ] Scenario: NPC is not affected
    - [ ] Scenario: Offscreen or unknown NPC update
  - [ ] Requirement: Durable Memory Boundary
    - [ ] Scenario: Ephemeral reaction
    - [ ] Scenario: Durable interaction memory
  - [ ] Requirement: Hidden State, Visible Behavior
    - [ ] Scenario: Narration uses mood naturally
    - [ ] Scenario: Debug mode shows hidden state
- [ ] 2.4 Implement the debuggable Director calls and reset Story.
  - [ ] Requirement: Director Call Audit
    - [ ] Scenario: Successful Director call
    - [ ] Scenario: Provider or validation failure
  - [ ] Requirement: Accepted And Ignored Update Visibility
    - [ ] Scenario: Valid and invalid fields mixed
    - [ ] Scenario: NPC update reason recorded
  - [ ] Requirement: Rough Reset
    - [ ] Scenario: Reset playtest state
    - [ ] Scenario: Future story instances remain deferred
- [ ] 2.5 Update Story-level Implemented By maps with current code locations after implementation.

### 3. Verification

- [ ] 3.1 Add or update focused automated checks for Director request construction and bounded context selection.
- [ ] 3.2 Add or update focused automated checks for provider adapter success, missing config, provider errors, invalid JSON, and strict output parsing.
- [ ] 3.3 Add or update focused automated checks for actor key mapping, current-scene NPC validation, partial update acceptance, ignored update recording, and `memory` length limits.
- [ ] 3.4 Verify feed reconstruction from `commands`, `narrations`, and `events` after reload.
- [ ] 3.5 Verify accepted NPC updates persist as facts and state diffs/events/debug records.
- [ ] 3.6 Verify narrative movement does not mutate room or actor-location state.
- [ ] 3.7 Verify debug shows hidden NPC facts, director calls, raw/parsed output, accepted updates, ignored updates, and validation reasons.
- [ ] 3.8 Run `npm run lint`.
- [ ] 3.9 Run `npm run build`.
- [ ] 3.10 Run Convex validation or local Convex development check appropriate to the implementation path.
- [ ] 3.11 Manually verify a configured local Ollama OpenAI-compatible endpoint can answer a narrative playtest turn.
- [ ] 3.12 Manually verify rough reset prepares the single playtest world for another Director/NPC-memory test.
- [ ] 3.13 Update Story-level Verified By maps with concrete evidence.

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

## Verification Ledger

Record proof as it happens.

| Date | Check | What It Proves | Result |
|---|---|---|---|
| 2026-06-27 | Initial artifact reread | Proposal, design, and tasks existed and satisfied initial `th-propose` structure | Passed |
| 2026-06-27 | Revised artifact reread | Proposal, design, and tasks reflect the tightened narrative Director/NPC memory scope and still satisfy `th-propose` structure | Passed |
| 2026-06-27 | Blocking-question resolution reread | Proposal, design, and tasks no longer defer implementation-blocking decisions | Passed |

## Blockers

- None.

## Deferred / Non-Blocking Questions

- Which Ollama model should be recommended after basic wiring works?
- Which deterministic debug affordances, if any, should be reintroduced after the narrative-first loop is working?
- When the POC grows beyond local playtesting, should Director orchestration move from the Next.js Route Handler to Convex actions or another backend service?

## Closeout

- Epic files updated:
- Implemented By maps current:
- Verified By maps current:
- `th-review` verdict:
- `review.md` findings resolved:
- PR / merge state:
- Deferred scope accepted:
- Change moved to `docs/changes/closed/`:
