# Design: NPC State Mutation

## Context

Lorecraft's current persistent mode sends canonical world state and NPC Cards to a plain-prose Game Master prompt. That improved story quality because the model is no longer forced to embed creative prose inside strict JSON. The tradeoff is that persistent NPC facts are currently read-only unless Taylor changes them through debug overrides.

The product direction remains state-first: the database is the world, and the LLM may propose bounded changes but cannot directly become truth. The next step is to add back writes without repeating the earlier mistake. The storyteller should write prose. A separate extractor should inspect the completed turn and propose only durable NPC fact changes that should survive after recent story context falls away.

For this change, mutable NPC characteristics are intentionally limited to `mood`, `status`, and `memory`. Stable NPC Card fields such as `description`, `background`, `persona`, `voice`, and `knowledge` stay read-only except for seed/manual/debug paths, even though some of them may become story-mutable in a later design.

## Goals / Non-Goals

**Goals:**

- Reintroduce persistent-mode NPC mutation through a separate structured extraction pass after successful narration.
- Keep story generation plain-prose and focused on player-facing narrative quality.
- Persist only validated `mood`, `status`, and `memory` updates for NPCs currently in the scene.
- Preserve no-update as the expected result for ephemeral gestures, short-term reactions, and inconsequential beats.
- Make accepted updates, ignored updates, extractor failures, raw artifacts, and timings inspectable by turn in debug records and local logs.
- Keep transcript mode's no-mutation comparison contract intact.

**Non-Goals:**

- Mutating NPC `description`, `background`, `persona`, `voice`, `knowledge`, relationships, locations, schedules, object state, room state, exits, inventory, combat state, stats, or offscreen consequences.
- Adding a dedicated NPC table or richer memory table.
- Adding rollback, snapshots, campaign instances, or branching timelines.
- Adding dice, hidden adjudication, or TTRPG rules.
- Adding a polished World Builder or persistent admin UI.
- Choosing separate models for writing and extraction in this change.

## Epic Changes

### Update Epic: LC-001 Provider-Agnostic Chat Experience

- Target Epic: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Change Type: added and modified scope

#### Story Changes

- Added: `LC-001-S10: Extracted NPC State Mutation`
- Modified: `LC-001-S3`, `LC-001-S7`, and `LC-001-S9` as needed to reconcile the read-only NPC-card phase with the new extractor-based mutation path.
- Removed: none.

#### Story LC-001-S10: Extracted NPC State Mutation

As a developer-playtester, I want meaningful NPC characteristics to mutate through a separate validated extraction pass, so that the world can remember story consequences without making the creative Game Master response carry persistence decisions.

##### R1: Post-Narration Extraction Pass

The system SHALL run NPC state extraction separately from player-facing story generation in persistent mode.

###### Scenario R1-S1: Successful story turn triggers extraction

- WHEN a persistent-mode Game Master turn returns valid non-empty narration
- THEN the backend stores the narration as player-facing story prose
- AND it builds a separate structured NPC-state extraction request from the current player input, the stored narration, current-scene NPC Cards, and bounded recent story.

###### Scenario R1-S2: Story generation remains plain prose

- WHEN the backend builds the main persistent-mode story request
- THEN the output contract remains player-facing plain prose
- AND the story prompt does not ask the model to return `npcUpdates`, state diffs, or machine-readable mutation proposals.

###### Scenario R1-S3: Transcript mode does not extract NPC state

- WHEN the application runs in transcript mode
- AND a story turn succeeds
- THEN no NPC-state extractor runs
- AND no accepted NPC fact changes, LLM state diffs, or LLM-authored state events are recorded.

##### R2: Bounded NPC Characteristic Updates

The system SHALL accept only validated current-scene NPC updates for `mood`, `status`, and `memory`.

###### Scenario R2-S1: Meaningful attitude change

- WHEN the extractor proposes a non-empty `mood` update for a current-scene NPC with a human-readable reason
- THEN the backend validates the actor and field
- AND persists the accepted `mood` fact with source `llm`.

###### Scenario R2-S2: Durable current circumstance

- WHEN the story establishes an ongoing NPC circumstance that should remain true after the immediate beat
- AND the extractor proposes a `status` update for that current-scene NPC
- THEN the backend persists the accepted `status` fact
- AND records the update in the turn-scoped state diff.

###### Scenario R2-S3: Rolling player-interaction memory

- WHEN the interaction meaningfully changes what an NPC should remember about the player later
- AND the extractor proposes a `memory` rewrite
- THEN the backend persists the accepted `memory` fact
- AND the value remains capped at 500 characters through validation.

###### Scenario R2-S4: Ephemeral beat produces no update

- WHEN the narration contains only a short-term gesture, stumble, glance, flinch, hesitation, or other one-frame reaction
- THEN the extractor may return no NPC update
- AND existing NPC facts remain unchanged.

###### Scenario R2-S5: Read-only NPC card fields are rejected

- WHEN the extractor proposes changes to `description`, `background`, `persona`, `voice`, `knowledge`, relationships, locations, or any other non-allowlisted field
- THEN the backend ignores those fields
- AND records why they were ignored in debug-visible evidence.

###### Scenario R2-S6: Unknown or offscreen NPC is rejected

- WHEN the extractor proposes an update for an unknown NPC or an NPC not currently in the scene
- THEN the backend ignores that update
- AND no fact, state diff, or state event is written for that update.

##### R3: Turn-Scoped Persistence And Debug Evidence

The system SHALL persist accepted NPC updates as canonical state and make all extractor decisions inspectable by turn.

###### Scenario R3-S1: Accepted extraction update persists canonical state

- WHEN one or more NPC fact changes are accepted for a turn
- THEN Convex updates the actor-scoped facts
- AND writes a `stateDiffs` row tied to the same turn and command.

###### Scenario R3-S2: Accepted update summary is specific enough to inspect

- WHEN an accepted update creates debug-visible event or state-diff evidence
- THEN the evidence identifies the affected NPC, changed field keys, and extractor reason
- AND it does not expose hidden private knowledge as player-facing metadata.

###### Scenario R3-S3: Extractor failure does not fake state

- WHEN story narration succeeds but the extraction provider call fails or returns invalid output
- THEN the story turn remains succeeded
- AND no fake NPC update, state diff, or LLM-authored state event is recorded
- AND debug records show the extractor failure.

###### Scenario R3-S4: No-update extraction remains inspectable

- WHEN the extractor returns no updates
- THEN no facts change
- AND debug records show that extraction ran and produced no accepted updates.

##### R4: Provider-Neutral Extractor Contract

The system SHALL use the existing provider-neutral backend boundary for NPC state extraction.

###### Scenario R4-S1: Extractor uses configured OpenAI-compatible provider

- WHEN `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` are configured
- THEN the extractor uses the same provider adapter path as story generation
- AND the UI does not depend on provider-specific SDKs or model APIs.

###### Scenario R4-S2: Extractor request is identifiable

- WHEN a Game Master call or local log records the extraction request
- THEN the request summary identifies it as NPC-state extraction
- AND includes compact metadata such as output contract, actor keys, allowed update keys, accepted update count, ignored update count, model, and provider without logging secrets.

##### Implemented By

Closed implementation summary is maintained in this change's tasks.md and the LC-001 Epic.

##### Verified By

Closed verification evidence is maintained in this change's tasks.md and the LC-001 Epic.

##### Verification Gaps

- Historical placeholder reconciled at closeout; no current implementation-pending claim remains.

## Epic File Rules

- Stories live inside the Epic `epic.md` file.
- Do not create `docs/stories/` or individual Story files.
- Preserve the Epic directory as the future home for supporting artifacts such as mockups, screenshots, research, or design notes.
- Epics and Stories are durable but revisable; Stories may be renamed, reordered, split, merged, or moved between Epics as the product matures.
- Keep Story IDs stable even when Story titles change or Stories move between Epics.
- Keep Story IDs unique across active Epics in the app. `LC-001-S10` was selected after scanning active Epic files and finding `LC-001-S1` through `LC-001-S9` already in use.
- Restart Requirement IDs inside each Story: `R1`, `R2`, `R3`.
- Scope Scenario IDs to their Requirement: `R1-S1`, `R1-S2`, `R2-S1`.

## Technical Approach

Keep the persistent story request as it is conceptually: one plain-prose Game Master call that resolves the current player input and stores narration. Remove stale prompt language that says NPC state is globally read-only in persistent mode, but do not ask the story call to emit mutation JSON.

Add an NPC-state extraction request builder in the Game Master backend modules. The extractor prompt should be compact and structured around the finished turn:

- current player input
- final narration
- current-scene NPC Cards/profiles
- bounded recent story for continuity
- allowed update fields: `mood`, `status`, `memory`
- explicit no-update guidance for ephemeral beats
- JSON-only output contract containing `npcUpdates`

Use the existing `parseDirectorOutput`, `validateNpcUpdates`, memory cap, actor allowlist, field allowlist, and ignored-update shape where practical. The extractor can reuse the same OpenAI-compatible provider adapter with `responseFormat: "json_object"` when supported by the current provider settings. The story call should continue using `responseFormat: "text"`.

Persist extractor results as a second provider/debug record tied to the same turn. The default implementation should distinguish the story and extraction calls with `requestSummary.callRole`, such as `story_generation` and `npc_state_extraction`, rather than adding a schema-level enum immediately. Accepted updates should flow through Convex as actor facts with `source: "llm"`, turn-scoped `stateDiffs`, and debug-visible accepted-update records. Ignored updates and extractor failures should be recorded without changing canonical state.

If story generation succeeds and extraction fails, the turn should still be considered a successful story turn. Failed extraction is a persistence gap for that turn, not a reason to remove already persisted narration. The UI/debug panel should make the extraction error inspectable through existing Game Master call surfaces and local logs.

Transcript mode must continue to use seed-plus-transcript context with no canonical NPC Cards and no mutation extraction.

## Alternatives Considered

- Return narration and NPC updates in one JSON response:
  - Why not: playtests showed this makes the model worse at story writing and pushes persistence decisions into the creative response.
- Parse state changes directly from the prose without a second LLM call:
  - Why not: this would either require brittle heuristics or silently promote narrative flavor into state. The extractor lets the model reason about durable state while the backend still validates the result.
- Keep NPCs read-only until a full World Builder exists:
  - Why not: Lorecraft's core thesis needs state changes to prove value. Debug overrides are useful for testing prompt reads, but they do not prove persistent memory.
- Mutate all NPC card fields now:
  - Why not: `description`, `background`, `persona`, `voice`, and `knowledge` need stronger semantics and visibility rules before model-authored changes should become canonical.
- Add dedicated NPC/memory tables now:
  - Why not: actor-scoped facts already support this proof loop. More structure should wait for concrete authoring, query, or long-session pressure.

## Why This Approach

This approach keeps the strongest lesson from the recent prompt work: story quality improves when the Game Master writes prose as prose. It also preserves Lorecraft's differentiator: the world remembers through validated state, not through hope that the transcript stays in context. A separate extractor gives us a narrow testable bridge between those two needs without adding a broader simulation system.

## Implementation Constraints

- Do not let the creative story prompt emit or own durable state changes.
- Do not run extraction in transcript mode.
- Do not mutate NPC fields outside `mood`, `status`, and `memory` in this change.
- Do not apply updates for unknown or offscreen NPCs.
- Do not treat extractor output as trusted; validate every actor, field, value, and memory length.
- Do not expose private `knowledge` or hidden facts as player-facing metadata while explaining state changes.
- Keep local raw request/response logging behind existing debug flags.
- Keep Convex as the only canonical persistence path for accepted facts and state diffs.

## Verification Strategy

- Add focused unit tests for extractor prompt construction, including allowed keys, no-update guidance, current-scene NPC Cards, final narration, and transcript-mode exclusion.
- Add parser/validation tests for accepted `mood`, `status`, and `memory`; memory truncation; rejected read-only fields; rejected unknown/offscreen NPCs; empty/no-update output; and malformed extractor output.
- Add route/application tests proving a successful story turn can persist narration and accepted extractor updates in the same turn scope.
- Add route/application tests proving extractor failure after narration leaves the turn story succeeded with no fake state changes.
- Add Convex/domain tests or integration-style tests proving accepted updates write facts, state diffs, and inspectable debug evidence.
- Run `npm run ci:required`.
- Run a local `npm run dev:debug` playtest and inspect raw turn logs for one no-update turn and one meaningful NPC update turn.

## Decisions

- Mutable NPC fields for this change are only `mood`, `status`, and `memory`.
- `description`, `background`, `persona`, `voice`, and `knowledge` remain read-only for model-authored mutation in this change.
- Story generation remains plain prose.
- NPC mutation happens after narration through a separate structured extractor.
- Transcript mode remains no-mutation.
- The extractor uses the existing provider-neutral OpenAI-compatible adapter for now.
- The proposal is added as `LC-001-S10` in the existing LC-001 Epic.

## Risks / Trade-Offs

- The extra provider call may increase local turn latency. This is acceptable for the proof loop, but logs should show timing clearly so we can decide whether to optimize, gate, or route extraction separately later.
- Local models may be less reliable at strict JSON extraction than hosted models. The backend must fail closed by recording ignored/failed extraction and applying no mutation.
- Even a bounded extractor may over-update `mood`, `status`, or `memory`. The prompt and tests should bias toward no update unless the change is durable.
- Debug-visible state summaries must avoid leaking hidden NPC knowledge into the player-facing story stream.
- Keeping updates in flexible facts may become too loose for long sessions, but adding tables now would be premature.

## Implementation-Discovery Questions

- Extractor call recording:
  - Default path: record story generation and NPC extraction as separate `directorCalls` rows tied to the same turn, distinguished by `requestSummary.callRole`.
  - Evidence needed: debug panel and local logs make both calls inspectable by turn.
  - Replan trigger: if multi-call turns are too confusing without a schema-level call role or dedicated extraction-call table.
- Extractor failure semantics:
  - Default path: successful narration keeps the turn succeeded even when extraction fails; no NPC mutations are applied.
  - Evidence needed: tests cover provider error, invalid JSON, and no-update output after successful narration.
  - Replan trigger: if manual playtesting shows failed extraction should block the whole turn or surface as a player-visible failure.
- JSON reliability:
  - Default path: use strict prompt guidance, existing JSON parser, and validation; no retry loop in the first implementation.
  - Evidence needed: local debug logs from at least one successful update and one no-update turn.
  - Replan trigger: if the chosen local model repeatedly fails extractor JSON and makes the feature untestable without a retry or separate model.
