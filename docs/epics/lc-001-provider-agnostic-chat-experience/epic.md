# Epic: Provider-Agnostic Chat Experience

## Summary

Lorecraft needs a first playable AI Director loop where the player can interact narratively with a persistent scene, resume the visible transcript, and watch at least one NPC carry structured memory across turns, while the product remains free to change LLM providers and while Convex remains the source of truth.

## Deferred Model

This Epic keeps the MVP to one editable persistent world. The later target model is independent story/play-session instances generated from a world or template, so each story can mutate separately from canonical authored world data.

## Story: Narrative Play Feed And Unified Input

As a playtester, I want one narrative input and a resumable story feed, so that the MVP feels like interacting with a living scene instead of operating a command parser.

### Requirement: Unified Narrative Input

The system SHALL let the player submit narrative text through one input box.

#### Scenario: Player submits narrative intent

- WHEN a seeded world exists
- AND the player submits text such as "I ask Mira what she knows about the storm"
- THEN the backend treats the text as narrative Director input
- AND the UI does not require the player to choose between command mode and chat mode

#### Scenario: Narrative movement does not mutate rooms

- WHEN the player submits text such as "I leave the chapel and walk toward the graveyard"
- THEN the Director may narrate the attempted movement
- AND the system does not update room, exit, or actor-location state in this change

### Requirement: Resumable Feed

The system SHALL reconstruct the player-facing feed from persisted commands, narrations, and events.

#### Scenario: Feed survives reload

- WHEN the player submits narrative turns and reloads the app
- THEN the feed shows prior player inputs, Director narrations, and world events
- AND entries are ordered by creation time and grouped by command when useful

#### Scenario: Feed distinguishes entry types

- WHEN the feed displays persisted entries
- THEN player input, Director narration, and world events are lightly distinguished
- AND all events are shown in the MVP feed until event noise creates a filtering need

### Requirement: Pending And Failed Turns

The system SHALL make synchronous Director turn progress and failure visible to the playtester.

#### Scenario: Request pending

- WHEN the player submits a narrative turn
- THEN the input prevents duplicate submission for that turn
- AND the interface shows that the Director response is pending

#### Scenario: Missing world state

- WHEN no world is seeded or the selected world cannot be loaded
- THEN the system does not call the LLM
- AND the player sees an actionable message to seed or reload the world

### Implemented By

- `src/app/world-client.tsx` renders the narrative-only split layout, one unified textarea, pending/error states, persisted feed entries, and debug panel.
- `src/app/api/director/turn/route.ts` receives narrative input from the client and routes it through the backend Director workflow.
- `convex/world.ts` records player inputs, reconstructs the feed from `commands`, `narrations`, and `events`, and does not mutate room, exit, or actor-location state through the Director path.

### Verified By

- `npm run test` passed with focused Director request/output/provider tests.
- `npm run lint` passed.
- `npm run build` passed and included `/` plus dynamic `/api/director/turn`.
- `npm run convex:once` passed.
- Runtime `curl http://localhost:3000` under `npm run dev` returned the narrative UI HTML.
- Runtime POST to `/api/director/turn` with local Ollama `llama3.1:8b` returned a persisted Director narration.
- `CONVEX_AGENT_MODE=anonymous npx convex run world:getSnapshot` showed player input, Director narration, and event feed entries ordered from persisted rows.

### Verification Gaps

- No unresolved implementation gap for this Story.
- Full browser click automation is not yet installed; verification used route-level HTTP checks, Convex snapshot reads, and build/lint/type checks.

## Story: Provider-Agnostic Backend Director Boundary

As a developer, I want Lorecraft to call LLMs through backend application logic and a provider adapter, so that the UI can change later and local model playtesting does not lock the app to one provider.

### Requirement: Next Route Handler Director Workflow

The system SHALL keep Director orchestration and provider calls out of React components and place the first POC orchestration boundary in a Next.js Route Handler.

#### Scenario: UI submits intent

- WHEN the player submits a narrative turn
- THEN the client calls the Director Route Handler with the input and selected world
- AND React does not import provider SDKs, provider request types, secrets, or durable game rules

#### Scenario: Backend coordinates the turn

- WHEN the Route Handler receives player input
- THEN it uses backend application/domain modules to prepare context, invoke the provider adapter, parse and validate structured output, and coordinate persistence through Convex functions
- AND Convex remains the only persistence path for commands, narrations, facts, state diffs, events, and Director debug records

#### Scenario: Orchestration can move later

- WHEN the POC outgrows the Next.js Route Handler boundary
- THEN the reusable application/domain modules can move behind Convex actions or another backend service
- AND React-facing behavior does not need to own Director rules

### Requirement: OpenAI-Compatible Provider Adapter

The system SHALL support an OpenAI-compatible chat completions endpoint configured by environment variables.

#### Scenario: Ollama local endpoint configured

- WHEN `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` are configured
- THEN the backend can call an Ollama OpenAI-compatible endpoint such as `http://localhost:11434/v1` without changing UI or domain code
- AND no provider-specific model identifier is hard-coded in the client

#### Scenario: Alternate OpenAI-compatible endpoint configured

- WHEN `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` point at another compatible endpoint such as LM Studio, OpenRouter, or Vercel AI Gateway
- THEN the same provider adapter contract is used
- AND UI and domain code do not change

#### Scenario: No endpoint configured

- WHEN required LLM configuration is missing
- THEN deterministic app surfaces remain usable
- AND a Director turn returns a setup-oriented failure without mutating persisted state

### Requirement: Stateless Provider Requests With Bounded Context

The system SHALL avoid provider-managed chat sessions while still sending enough bounded context for coherent responses.

#### Scenario: Director request is built

- WHEN the backend builds a Director request
- THEN it includes the current player message, current structured scene/NPC state, and a small recent feed window
- AND it does not send secrets, raw database dumps, or unrelated debug state

#### Scenario: Multiple narrative turns

- WHEN the player sends multiple turns
- THEN each provider request is independently constructed from current persisted state and recent feed context
- AND the system does not depend on a provider conversation ID, assistant thread, or hidden remote memory

### Implemented By

- `src/app/api/director/turn/route.ts` is the synchronous Next.js Route Handler orchestration boundary.
- `src/lib/director/prompt.ts` builds stateless bounded Director requests from current scene/NPC/feed context.
- `src/lib/director/provider.ts` reads `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` and calls OpenAI-compatible chat completions through `fetch`.
- `src/lib/director/output.ts` parses strict JSON and validates NPC updates outside React.
- `convex/world.ts` remains the only persistence path for commands, narrations, facts, state diffs, events, and Director call records.

### Verified By

- `npm run test` passed, including bounded request construction, missing config, and OpenAI-compatible response extraction.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run convex:once` passed.
- Runtime POST to `/api/director/turn` with `LLM_BASE_URL=http://localhost:11434/v1`, `LLM_API_KEY=ollama`, and `LLM_MODEL=llama3.1:8b` succeeded.
- Post-turn Convex snapshot showed `provider`, `model`, compact `requestSummary`, raw response, parsed response, accepted updates, and feed rows persisted.

### Verification Gaps

- No unresolved implementation gap for this Story.
- Provider coverage is OpenAI-compatible by contract and tested with Ollama/local fetch stubs; provider-specific quirks for LM Studio, OpenRouter, and Vercel AI Gateway remain future playtest coverage.

## Story: Persistent Current-Scene NPC State

As a playtester, I want an NPC in the scene to remember meaningful interaction state, so that Lorecraft can prove structured persistence without modeling the full world yet.

### Requirement: Seed NPC State

The system SHALL seed current-scene NPCs with stable identity and a small mutable fact surface.

#### Scenario: Mira is seeded

- WHEN the Stormbound Chapel world is seeded
- THEN Mira exists as an actor with stable `key`, `name`, and `description`
- AND Mira has baseline facts for `mood`, `status`, and `memory`

#### Scenario: Seeded memory has useful baseline text

- WHEN Mira's baseline `memory` fact is created
- THEN it contains a short baseline such as "Mira has not yet formed any meaningful memories of Taylor."
- AND it does not start as an empty string

### Requirement: Structured Director Output

The system SHALL require the Director to return strict JSON with player-facing narration and optional NPC updates.

#### Scenario: Valid Director output

- WHEN the provider returns valid JSON
- THEN the response includes a non-empty `narration` string
- AND it includes `npcUpdates` as an array that may be empty

#### Scenario: Invalid JSON

- WHEN the provider returns malformed JSON or unusable structured output
- THEN the turn fails cleanly
- AND the system does not persist fake narration or NPC state changes from the malformed output

### Requirement: Bounded NPC Updates

The system SHALL accept only bounded updates for NPCs currently in the scene.

#### Scenario: Mira is affected by the turn

- WHEN the Director returns an update for `actorKey: "mira"` with a reason and valid changes
- THEN the backend maps the key to the current-scene NPC actor
- AND it persists accepted `mood`, `status`, and `memory` changes as facts

#### Scenario: NPC is not affected

- WHEN Mira is not meaningfully affected by the player's turn
- THEN the Director returns no update for Mira
- AND existing facts remain unchanged

#### Scenario: Offscreen or unknown NPC update

- WHEN the Director returns an update for an actor key that is unknown or not in the current scene
- THEN the backend ignores that update
- AND the debug panel can show why it was ignored

### Requirement: Durable Memory Boundary

The system SHALL use NPC facts only for state that should matter after recent transcript context falls away.

#### Scenario: Ephemeral reaction

- WHEN the narration includes a passing gesture or momentary reaction
- THEN the system can leave NPC facts unchanged
- AND the recent feed carries that short-term continuity

#### Scenario: Durable interaction memory

- WHEN the player interaction meaningfully changes what Mira should remember later
- THEN the Director may rewrite Mira's `memory` as a compact rolling summary capped at 500 characters
- AND the rewrite may preserve important older information, add new important information, and drop stale or low-importance details

### Requirement: Hidden State, Visible Behavior

The system SHALL use NPC facts as hidden Director guidance rather than player-visible metadata.

#### Scenario: Narration uses mood naturally

- WHEN Mira's `mood` is included in Director context
- THEN the narration may describe observable behavior influenced by that mood
- AND it does not mechanically expose hidden fields such as "Mira's mood is wary"

#### Scenario: Debug mode shows hidden state

- WHEN the debug panel is visible
- THEN it shows Mira's hidden facts plainly for developer/playtest inspection

### Implemented By

- `convex/schema.ts` adds actor keys and the `directorCalls` table while continuing to store NPC state in `facts`.
- `convex/world.ts` seeds Taylor and Mira with stable actor keys and initializes Mira's `mood`, `status`, and `memory` facts.
- `src/lib/director/output.ts` requires strict JSON, ignores unknown/offscreen NPC updates, partially accepts valid fields, and caps `memory` at 500 characters.
- `src/lib/director/prompt.ts` sends current-scene NPC facts as hidden Director guidance.
- `src/app/world-client.tsx` shows hidden NPC facts only in the debug panel.

### Verified By

- `npm run test` passed, including malformed JSON rejection, partial NPC update acceptance, unknown actor ignoring, and 500-character memory cap.
- `npm run build` passed.
- `npm run convex:once` passed.
- Runtime Ollama turn accepted `mira` updates for `mood`, `status`, and `memory`.
- Post-turn Convex snapshot showed accepted Mira facts persisted under `actor:mira` with `source: "llm"` and state-diff `setFact` operations.
- Post-reset Convex snapshot showed Mira baseline `mood`, `status`, and `memory` restored with `source: "seed"`.

### Verification Gaps

- No unresolved implementation gap for this Story.
- Prompt tuning for unnecessary NPC fact churn remains an empirical playtesting concern, but validation bounds and tests are in place.

## Story: Debuggable Director Calls And Reset

As a developer-playtester, I want to inspect Director calls and reset the spike world, so that early LLM behavior can be tuned without losing evidence or hand-editing every playtest cleanup.

### Requirement: Director Call Audit

The system SHALL persist a debug record for each Director call.

#### Scenario: Successful Director call

- WHEN a Director call succeeds
- THEN the system stores provider/model metadata, compact request summary, raw response, parsed response, success status, accepted updates, and ignored updates
- AND the debug panel can display those details

#### Scenario: Provider or validation failure

- WHEN a provider error, invalid JSON response, or validation failure occurs
- THEN the system stores the raw response or error where available
- AND the debug panel can display enough information to diagnose the failed turn after reload

### Requirement: Accepted And Ignored Update Visibility

The system SHALL persist accepted NPC fact changes and make ignored update reasons inspectable.

#### Scenario: Valid and invalid fields mixed

- WHEN a Director update contains both valid and invalid fields
- THEN valid fields are accepted and persisted
- AND invalid fields are ignored and recorded for debug inspection

#### Scenario: NPC update reason recorded

- WHEN an accepted NPC update changes one or more facts
- THEN the system persists a human-readable reason in debug-visible event/director-call data
- AND the reason is not shown as ordinary player-facing narration unless a debug display mode is enabled

### Requirement: Rough Reset

The system SHALL provide a rough developer reset for repeated MVP playtesting.

#### Scenario: Reset playtest state

- WHEN the reset action is invoked
- THEN the existing seeded world, rooms, exits, actors, and objects remain in place
- AND transcript/debug rows for that world are cleared from `commands`, `narrations`, `events`, `stateDiffs`, and `directorCalls`
- AND Mira's mutable `mood`, `status`, and `memory` facts are restored to their seed values
- AND the reset is treated as temporary until independent story/play-session instances exist

#### Scenario: Future story instances remain deferred

- WHEN the MVP reset behavior is documented
- THEN the design states that future stories/play sessions should be independent instances generated from a world/template
- AND this change does not add story/play-session schema

### Implemented By

- `convex/schema.ts` defines `directorCalls` for provider/model metadata, compact request summaries, raw/parsed responses, status, accepted updates, ignored updates, and errors.
- `convex/world.ts` persists Director call audit records, accepted NPC fact diffs, generic world events, and rough reset behavior.
- `src/app/world-client.tsx` renders hidden facts, events, narrations, state diffs, and Director calls in the debug panel and exposes rough reset.
- `CHANGELOG.md` and `README.md` document the new narrative Director path and local model setup.

### Verified By

- `npm run test` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run convex:once` passed.
- Runtime Ollama turn persisted a successful `directorCalls` record with raw output, parsed output, accepted updates, and no ignored updates.
- `CONVEX_AGENT_MODE=anonymous npx convex run world:resetPlaytestWorld` returned `deletedCommands: 2`, `deletedDirectorCalls: 1`, `deletedEvents: 2`, `deletedNarrations: 3`, `deletedStateDiffs: 1`, and `restoredFacts: 3`.
- Post-reset Convex snapshot showed actors, exits, objects, room, and world preserved while feed, narrations, events, state diffs, and director calls were empty.

### Verification Gaps

- No unresolved implementation gap for this Story.
- Rough reset intentionally remains a temporary single-world playtest tool until story/play-session instances exist.
