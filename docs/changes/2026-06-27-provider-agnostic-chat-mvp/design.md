# Design: Provider-Agnostic Narrative Director MVP

## Context

The current Lorecraft MVP repo is a Next.js 16 and Convex spike with one seeded Stormbound Chapel world. The current UI is command-first: it shows location state, accepts commands like `look` and `go north`, and displays facts, events, narrations, and state diffs in a debug panel.

The revised MVP direction is narrative-first. The player should type natural language into one input, and the backend should treat that input as narrative intent for the Director. MUD-style commands and slash commands are useful future tools, but they should be added when a real precision/debugging need appears. Rooms and movement remain contextual seed data for now; narrative movement does not mutate room/location state in this change. The existing deterministic command examples should be removed from the player-facing path for this change.

The durable architecture rule remains: backend/application logic owns game and Director behavior; React presents data, collects input, and triggers backend operations. For this proof of concept, a Next.js Route Handler owns synchronous Director orchestration because it can call a local model on the MacBook without depending on beta Convex local deployments. Provider-specific AI details stay behind an adapter. Convex remains the source of persisted truth.

## Goals / Non-Goals

**Goals:**

- Provide a narrative-first player experience with one unified input.
- Persist a resumable feed from player inputs, Director narrations, and world events.
- Call an LLM through a provider-neutral backend Director boundary implemented first as a Next.js Route Handler.
- Use an OpenAI-compatible endpoint shape for local-model-first playtesting, with Ollama documented first.
- Require structured Director output that includes `narration` and optional current-scene NPC updates.
- Persist a small mutable NPC state surface for current-scene NPCs using existing facts.
- Make Director calls and validation decisions inspectable in the debug panel.
- Keep the UI split layout: story/feed on the left, debug state on the right.

**Non-Goals:**

- No streaming requirement in the first implementation.
- No slash-command grammar or MUD-style command surface in the player experience.
- No room/location mutation from narrative movement.
- No arbitrary LLM-generated world state changes.
- No dedicated `npcs`, `npcState`, `timeline`, or `messages` table.
- No provider marketplace, model picker, billing, auth, or user preferences.
- No independent story/play-session instance schema yet.
- No player-facing deterministic command UI in this change.
- No combat, HP, inventory, dice, quests, campaign copies, or multiplayer.

## Epic Changes

### Create Epic: Provider-Agnostic Chat Experience

- Proposed directory: `docs/epics/lc-001-provider-agnostic-chat-experience/`
- Proposed file: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Supporting artifacts may later live beside `epic.md` in the same Epic directory.

#### Epic

Lorecraft needs a first playable AI Director loop where the player can interact narratively with a persistent scene, resume the visible transcript, and watch at least one NPC carry structured memory across turns, while the product remains free to change LLM providers and while Convex remains the source of truth.

#### Story LC-001-S1: Narrative play feed and unified input

As a playtester, I want one narrative input and a resumable story feed, so that the MVP feels like interacting with a living scene instead of operating a command parser.

##### Requirement R1: Unified Narrative Input

The system SHALL let the player submit narrative text through one input box.

###### Scenario R1-S1: Player submits narrative intent

- WHEN a seeded world exists
- AND the player submits text such as "I ask Mira what she knows about the storm"
- THEN the backend treats the text as narrative Director input
- AND the UI does not require the player to choose between command mode and chat mode

###### Scenario R1-S2: Narrative movement does not mutate rooms

- WHEN the player submits text such as "I leave the chapel and walk toward the graveyard"
- THEN the Director may narrate the attempted movement
- AND the system does not update room, exit, or actor-location state in this change

##### Requirement R2: Resumable Feed

The system SHALL reconstruct the player-facing feed from persisted commands, narrations, and events.

###### Scenario R2-S1: Feed survives reload

- WHEN the player submits narrative turns and reloads the app
- THEN the feed shows prior player inputs, Director narrations, and world events
- AND entries are ordered by creation time and grouped by command when useful

###### Scenario R2-S2: Feed distinguishes entry types

- WHEN the feed displays persisted entries
- THEN player input, Director narration, and world events are lightly distinguished
- AND all events are shown in the MVP feed until event noise creates a filtering need

##### Requirement R3: Pending And Failed Turns

The system SHALL make synchronous Director turn progress and failure visible to the playtester.

###### Scenario R3-S1: Request pending

- WHEN the player submits a narrative turn
- THEN the input prevents duplicate submission for that turn
- AND the interface shows that the Director response is pending

###### Scenario R3-S2: Missing world state

- WHEN no world is seeded or the selected world cannot be loaded
- THEN the system does not call the LLM
- AND the player sees an actionable message to seed or reload the world

##### Implemented By

Not implemented yet.

##### Verified By

Not verified yet.

##### Verification Gaps

- Implementation and verification are pending.
- Need UI and backend proof that the feed rebuilds from existing tables without adding a timeline table.

#### Story LC-001-S2: Provider-agnostic backend Director boundary

As a developer, I want Lorecraft to call LLMs through backend application logic and a provider adapter, so that the UI can change later and local model playtesting does not lock the app to one provider.

##### Requirement R1: Next Route Handler Director Workflow

The system SHALL keep Director orchestration and provider calls out of React components and place the first POC orchestration boundary in a Next.js Route Handler.

###### Scenario R1-S1: UI submits intent

- WHEN the player submits a narrative turn
- THEN the client calls the Director Route Handler with the input and selected world
- AND React does not import provider SDKs, provider request types, secrets, or durable game rules

###### Scenario R1-S2: Backend coordinates the turn

- WHEN the Route Handler receives player input
- THEN it uses backend application/domain modules to prepare context, invoke the provider adapter, parse and validate structured output, and coordinate persistence through Convex functions
- AND Convex remains the only persistence path for commands, narrations, facts, state diffs, events, and Director debug records

###### Scenario R1-S3: Orchestration can move later

- WHEN the POC outgrows the Next.js Route Handler boundary
- THEN the reusable application/domain modules can move behind Convex actions or another backend service
- AND React-facing behavior does not need to own Director rules

###### Scenario R1-S4: Malformed world id

- WHEN the Route Handler receives a malformed `worldId`
- THEN it returns a structured `400` `TurnResponse` error
- AND it does not record player input or call the LLM

##### Requirement R2: OpenAI-Compatible Provider Adapter

The system SHALL support an OpenAI-compatible chat completions endpoint configured by environment variables.

###### Scenario R2-S1: Ollama local endpoint configured

- WHEN `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` are configured
- THEN the backend can call an Ollama OpenAI-compatible endpoint such as `http://localhost:11434/v1` without changing UI or domain code
- AND no provider-specific model identifier is hard-coded in the client

###### Scenario R2-S2: Alternate OpenAI-compatible endpoint configured

- WHEN `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` point at another compatible endpoint such as LM Studio, OpenRouter, or Vercel AI Gateway
- THEN the same provider adapter contract is used
- AND UI and domain code do not change

###### Scenario R2-S3: No endpoint configured

- WHEN required LLM configuration is missing
- THEN deterministic app surfaces remain usable
- AND a Director turn returns a setup-oriented failure without mutating persisted state

##### Requirement R3: Stateless Provider Requests With Bounded Context

The system SHALL avoid provider-managed chat sessions while still sending enough bounded context for coherent responses.

###### Scenario R3-S1: Director request is built

- WHEN the backend builds a Director request
- THEN it includes the current player message, current structured scene/NPC state, and a small recent feed window
- AND it does not send secrets, raw database dumps, or unrelated debug state

###### Scenario R3-S2: Multiple narrative turns

- WHEN the player sends multiple turns
- THEN each provider request is independently constructed from current persisted state and recent feed context
- AND the system does not depend on a provider conversation ID, assistant thread, or hidden remote memory

##### Implemented By

Not implemented yet.

##### Verified By

Not verified yet.

##### Verification Gaps

- Implementation and verification are pending.
- Need to verify the Route Handler can call a local Ollama endpoint and persist results through Convex.

#### Story LC-001-S3: Persistent current-scene NPC state

As a playtester, I want an NPC in the scene to remember meaningful interaction state, so that Lorecraft can prove structured persistence without modeling the full world yet.

##### Requirement R1: Seed NPC State

The system SHALL seed current-scene NPCs with stable identity and a small mutable fact surface.

###### Scenario R1-S1: Mira is seeded

- WHEN the Stormbound Chapel world is seeded
- THEN Mira exists as an actor with stable `key`, `name`, and `description`
- AND Mira has baseline facts for `mood`, `status`, and `memory`

###### Scenario R1-S2: Seeded memory has useful baseline text

- WHEN Mira's baseline `memory` fact is created
- THEN it contains a short baseline such as "Mira has not yet formed any meaningful memories of Taylor."
- AND it does not start as an empty string

##### Requirement R2: Structured Director Output

The system SHALL require the Director to return strict JSON with player-facing narration and optional NPC updates.

###### Scenario R2-S1: Valid Director output

- WHEN the provider returns valid JSON
- THEN the response includes a non-empty `narration` string
- AND it includes `npcUpdates` as an array that may be empty

###### Scenario R2-S2: Invalid JSON

- WHEN the provider returns malformed JSON or unusable structured output
- THEN the turn fails cleanly
- AND the system does not persist fake narration or NPC state changes from the malformed output

##### Requirement R3: Bounded NPC Updates

The system SHALL accept only bounded updates for NPCs currently in the scene.

###### Scenario R3-S1: Mira is affected by the turn

- WHEN the Director returns an update for `actorKey: "mira"` with a reason and valid changes
- THEN the backend maps the key to the current-scene NPC actor
- AND it persists accepted `mood`, `status`, and `memory` changes as facts

###### Scenario R3-S2: NPC is not affected

- WHEN Mira is not meaningfully affected by the player's turn
- THEN the Director returns no update for Mira
- AND existing facts remain unchanged

###### Scenario R3-S3: Offscreen or unknown NPC update

- WHEN the Director returns an update for an actor key that is unknown or not in the current scene
- THEN the backend ignores that update
- AND the debug panel can show why it was ignored

##### Requirement R4: Durable Memory Boundary

The system SHALL use NPC facts only for state that should matter after recent transcript context falls away.

###### Scenario R4-S1: Ephemeral reaction

- WHEN the narration includes a passing gesture or momentary reaction
- THEN the system can leave NPC facts unchanged
- AND the recent feed carries that short-term continuity

###### Scenario R4-S2: Immediate physical beat

- WHEN the player does something with immediate physical consequences, such as pushing Mira down
- THEN the Director should narrate the immediate result in the visible feed
- AND it should not immediately rewrite Mira's `status` fact unless the condition remains stable and important after the moment has resolved

###### Scenario R4-S3: Durable interaction memory

- WHEN the player interaction meaningfully changes what Mira should remember later
- THEN the Director may rewrite Mira's `memory` as a compact rolling summary capped at 500 characters
- AND the rewrite may preserve important older information, add new important information, and drop stale or low-importance details

##### Requirement R5: Hidden State, Visible Behavior

The system SHALL use NPC facts as hidden Director guidance rather than player-visible metadata.

###### Scenario R5-S1: Narration uses mood naturally

- WHEN Mira's `mood` is included in Director context
- THEN the narration may describe observable behavior influenced by that mood
- AND it does not mechanically expose hidden fields such as "Mira's mood is wary"

###### Scenario R5-S2: Debug mode shows hidden state

- WHEN the debug panel is visible
- THEN it shows Mira's hidden facts plainly for developer/playtest inspection

##### Implemented By

Not implemented yet.

##### Verified By

Not verified yet.

##### Verification Gaps

- Implementation and verification are pending.
- Need prompt and validation tests to prevent unnecessary NPC fact churn.

#### Story LC-001-S4: Debuggable Director calls and reset

As a developer-playtester, I want to inspect Director calls and reset the spike world, so that early LLM behavior can be tuned without losing evidence or hand-editing every playtest cleanup.

##### Requirement R1: Director Call Audit

The system SHALL persist a debug record for each Director call.

###### Scenario R1-S1: Successful Director call

- WHEN a Director call succeeds
- THEN the system stores provider/model metadata, compact request summary, raw response, parsed response, success status, accepted updates, and ignored updates
- AND the debug panel can display those details

###### Scenario R1-S2: Provider or validation failure

- WHEN a provider error, invalid JSON response, or validation failure occurs
- THEN the system stores the raw response or error where available
- AND the debug panel can display enough information to diagnose the failed turn after reload

##### Requirement R2: Local Debug Log

The system SHALL optionally write local-only structured debug logs for Director troubleshooting.

###### Scenario R2-S1: Local debug logging enabled

- WHEN `LORECRAFT_DEBUG_LOG=1` is set during local development
- THEN the backend appends newline-delimited JSON records under a gitignored local log path
- AND each record includes timestamp, event name, route stage, provider host, model, request summary, outcome, errors, accepted/ignored update counts, response length metadata, and timing data without API keys or full environment dumps

###### Scenario R2-S2: Raw LLM logging gated

- WHEN `LORECRAFT_DEBUG_LOG_RAW_LLM=1` is not set
- THEN local log records do not include full raw LLM response text
- AND raw response content can still be inspected from the persisted `directorCalls` debug table when appropriate

##### Requirement R3: Accepted And Ignored Update Visibility

The system SHALL persist accepted NPC fact changes and make ignored update reasons inspectable.

###### Scenario R3-S1: Valid and invalid fields mixed

- WHEN a Director update contains both valid and invalid fields
- THEN valid fields are accepted and persisted
- AND invalid fields are ignored and recorded for debug inspection

###### Scenario R3-S2: NPC update reason recorded

- WHEN an accepted NPC update changes one or more facts
- THEN the system persists a human-readable reason in debug-visible event/director-call data
- AND the reason is not shown as ordinary player-facing narration unless a debug display mode is enabled

##### Requirement R4: Rough Reset

The system SHALL provide a rough developer reset for repeated MVP playtesting.

###### Scenario R4-S1: Reset playtest state

- WHEN the reset action is invoked
- THEN the existing seeded world, rooms, exits, actors, and objects remain in place
- AND transcript/debug rows for that world are cleared from `commands`, `narrations`, `events`, `stateDiffs`, and `directorCalls`
- AND Mira's mutable `mood`, `status`, and `memory` facts are restored to their seed values
- AND the reset is treated as temporary until independent story/play-session instances exist

###### Scenario R4-S2: Future story instances remain deferred

- WHEN the MVP reset behavior is documented
- THEN the design states that future stories/play sessions should be independent instances generated from a world/template
- AND this change does not add story/play-session schema

##### Implemented By

Not implemented yet.

##### Verified By

Not verified yet.

##### Verification Gaps

- Implementation and verification are pending.
- Need implementation proof that reset does not delete stable seeded world rows.

## Epic File Rules

- Stories live inside the Epic `epic.md` file.
- Do not create `docs/stories/` or individual Story files.
- Preserve the Epic directory as the future home for supporting artifacts such as mockups, screenshots, research, or design notes.

## Technical Approach

Use the current single-repo Next.js + Convex shape, but enforce a stronger layer boundary than the current scaffold. The player client stays thin: it renders the feed/debug state, collects one input value, shows pending/error states, and calls a backend Route Handler. Durable behavior should live in backend application/domain modules and Convex functions, not React components.

The first Director workflow should be synchronous and orchestrated by a Next.js Route Handler. The Route Handler calls Convex to record the player's input in `commands` and load bounded context, builds a Director request from current scene/NPC facts plus a small recent feed window, calls an OpenAI-compatible provider adapter configured by `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL`, parses strict JSON, validates `npcUpdates`, calls Convex to persist the Director debug record, stores the player-facing narration, applies accepted NPC fact changes, records state diffs/events for accepted updates, and returns the result to the UI. Queues, streaming, retries, multiple agents, and Convex action orchestration are deferred.

The first documented local runtime should be Ollama on macOS:

```text
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=<installed-ollama-model>
```

The implementation should remain generic enough for LM Studio, OpenRouter, Vercel AI Gateway, or a direct provider later by changing only environment variables.

The structured Director response should be shaped roughly as:

```json
{
  "narration": "Mira glances toward the rain-streaked shutters before answering.",
  "npcUpdates": [
    {
      "actorKey": "mira",
      "reason": "Taylor directly asked Mira what she knows about the storm.",
      "changes": {
        "mood": "concerned",
        "status": "watching Taylor closely near the chapel aisle",
        "memory": "Mira remembers that Taylor asked what she knows about the storm."
      }
    }
  ]
}
```

Only `narration` is required for a successful turn. `npcUpdates` may be empty. The backend partially accepts valid NPC update fields and records ignored fields for debug. Accepted fields are persisted as `facts` on the actor subject, using keys `mood`, `status`, and `memory`. `memory` is a rolling compact summary capped at 500 characters. `status` is for stable ongoing circumstances, not moment-to-moment physical beats; immediate actions such as being pushed, flinching, stumbling, or glancing should usually stay in narration/recent feed unless the resulting condition remains important after the moment resolves. Actor identity should use stable `actor.key` values such as `mira`, not raw Convex IDs in the model-facing contract.

The UI should keep the split layout: story/feed and unified input on the left, debug panel on the right. The feed reconstructs from `commands`, `narrations`, and `events`; no dedicated message/timeline table is added yet. Debug should show hidden facts, raw Director output, parsed output, accepted updates, ignored updates, validation reasons, events, and state diffs.

## Data Model Notes

- Add `key` to `actors`, consistent with existing room/object keys.
- Keep `actors.description` as stable seed/admin-authored baseline identity.
- Seed Mira with baseline facts:
  - `actor:mira.mood = "watchful"`
  - `actor:mira.status = "waiting near the chapel aisle"`
  - `actor:mira.memory = "Mira has not yet formed any meaningful memories of Taylor."`
- Store mutable NPC state in existing `facts`, not an `npcs` or `npcState` table.
- Add `directorCalls` for debug/audit data.
- Do not add story/play-session instance tables in this change.
- Rough reset clears `commands`, `narrations`, `events`, `stateDiffs`, and `directorCalls` for the test world and restores Mira's mutable facts. It does not delete the seeded world graph.

## Alternatives Considered

- Option: Keep plain text Director output.
  - Why not: Plain text is simpler for pure chat, but NPC persistence needs a coupled narration plus validated update payload. A second extraction call would add latency and disagreement risk.
- Option: Add a dedicated `npcs` or `npcState` table.
  - Why not: `actors` already represents NPC identity, and `facts` are better for proving which mutable NPC fields matter before committing to columns.
- Option: Add a dedicated `timeline/messages` table.
  - Why not: The existing `commands`, `narrations`, and `events` tables can reconstruct the MVP feed. A timeline table can wait until ordering/grouping/editing pressure appears.
- Option: Treat bare commands like `look` or `go north` as deterministic shortcuts in the player experience.
  - Why not: The desired MVP is narrative-first. Slash and MUD-style commands can be introduced later when precision/debugging needs become concrete.
- Option: Keep the existing deterministic command UI as a parallel player-facing path.
  - Why not: Two player-facing modes would blur the MVP. Existing deterministic code can remain as internal/debug scaffolding, but the product surface for this change should be narrative-first.
- Option: Introduce story/play-session instances now.
  - Why not: It is the right long-term model, but it would touch every state table and distract from proving narrative Director interaction plus bounded NPC memory.
- Option: Use Convex actions as the first Director orchestration boundary.
  - Why not: It is likely closer to a long-term Convex-centered backend, but local Convex deployments are still beta and local model calls are the first playtest path. A Next.js Route Handler is a pragmatic POC boundary that can call local Ollama directly while Convex remains canonical persistence.
- Option: Call OpenRouter, Vercel AI Gateway, or a frontier provider directly from the first implementation.
  - Why not: Direct use would leak provider choice into the first proof. A generic OpenAI-compatible adapter keeps local playtesting and later provider routing open.

## Why This Approach

This approach proves the first meaningful Lorecraft loop: a player narrates into a scene, the Director responds, the transcript persists, and an NPC's small structured memory changes across turns. It stays basic where complexity is not yet earned: no rooms-as-simulation, no command grammar, no separate NPC table, no timeline table, no play-session instances, no queue, and no streaming. It adds complexity only where the MVP now needs it: structured output, validation, persisted NPC facts, and Director-call debugging.

## Implementation Constraints

- Secrets and provider credentials must stay in environment variables and must not be sent to the browser.
- React/client components must not import provider SDKs, provider request shapes, or durable game rules.
- The Next.js Route Handler should remain an orchestration layer; reusable decisions and transformations should live in plain TypeScript modules where practical.
- Convex functions remain the only persistence path for canonical state and debug records.
- LLM requests should use bounded scene/NPC/feed context, not unbounded database records or the full debug panel.
- Invalid JSON fails the Director turn cleanly and does not produce fake narration or state changes.
- NPC updates are allowed only for current-scene NPCs.
- Accepted NPC update fields are limited to `mood`, `status`, and `memory`.
- `memory` is free text capped at 500 characters.
- `status` should be updated sparingly for stable ongoing state, not transient physical action.
- `description` remains stable seed/admin data for this MVP.
- Debug mode can show hidden NPC facts and raw model output plainly.
- Provider errors must not break the seeded-world deterministic/debug surfaces.
- The player-facing UI should not present deterministic command examples or a parallel command mode in this change.

## Verification Strategy

- Add focused tests around Director request construction and bounded context selection.
- Add focused tests around strict JSON parsing, invalid JSON failure, and missing provider config.
- Add validation tests for current-scene actor key mapping, partial update acceptance, ignored fields, and 500-character memory limits.
- Verify that accepted NPC updates persist as facts and produce state diff/debug evidence.
- Verify that narrative movement does not mutate room/location state.
- Verify that the feed reconstructs from commands, narrations, and events after reload.
- Verify that debug shows director calls, raw/parsed output, accepted updates, ignored updates, and hidden NPC facts.
- Verify that the Route Handler can call a local Ollama-compatible endpoint when configured.
- Verify that rough reset clears transcript/debug rows and restores mutable NPC facts without deleting seeded world rows.
- Run `npm run lint`, `npm run build`, and the appropriate Convex validation/local dev check.

## Decisions

- The player-facing MVP is narrative-first.
- One unified input is used; slash/MUD commands are deferred.
- The Director workflow is backend-owned so UI clients remain replaceable.
- The first orchestration boundary is a Next.js Route Handler for POC/local model practicality.
- Convex remains canonical persistence.
- The first provider adapter targets OpenAI-compatible chat completions via environment variables.
- Ollama is the first documented local runtime example.
- Provider requests are stateless but include bounded current state and recent feed context.
- Director output is strict JSON with required `narration` and optional `npcUpdates`.
- LLM replies are persisted as non-authoritative narrations.
- Player inputs, Director narrations, and events form the resumable feed.
- Events are shown in the MVP feed until they become noisy.
- The first persistent NPC state fields are `mood`, `status`, and `memory`.
- NPC `memory` is a rolling 500-character summary, not a last-turn field.
- Actor `description` stays stable for now.
- NPC updates are accepted only for current-scene NPCs and partially accepted field-by-field.
- Accepted NPC state is stored in `facts`.
- `directorCalls` stores compact request summaries and raw/parsed response debug data.
- A rough in-place reset is included for playtesting.
- Deterministic command UI is removed from the player-facing path for this change.
- Independent story/play-session instances are documented for later, not added now.

## Risks / Trade-Offs

- Structured JSON is more brittle than plain text, but it is now needed to test NPC persistence in one call.
- Showing every event in the feed may get noisy, but filtering can wait until noise is observed.
- Facts are flexible but less explicit than a dedicated NPC state table; this is intentional until the NPC state model proves itself.
- A synchronous call is simpler and avoids race conditions, but it may feel slow with local models.
- Keeping rooms contextual but non-mutating may feel less game-like, but it preserves focus on narrative interaction and NPC memory.
- Next.js Route Handler orchestration may need to move later for scaling/mobile purity, but it keeps this MacBook/local-model POC simple.
