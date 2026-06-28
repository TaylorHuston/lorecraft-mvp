# Epic: Provider-Agnostic Chat Experience

## Summary

Lorecraft needs a first playable AI Director loop where the player can interact narratively with a persistent scene, resume the visible transcript, and watch at least one NPC carry structured memory across turns, while the product remains free to change LLM providers and while Convex remains the source of truth.

## Deferred Model

This Epic keeps the MVP to one editable persistent world. The later target model is independent story/play-session instances generated from a world or template, so each story can mutate separately from canonical authored world data.

## Story LC-001-S1: Narrative Play Feed And Unified Input

As a playtester, I want one narrative input and a resumable story feed, so that the MVP feels like interacting with a living scene instead of operating a command parser.

### Requirement R1: Unified Narrative Input

The system SHALL let the player submit narrative text through one input box.

#### Scenario R1-S1: Player submits narrative intent

- WHEN a seeded world exists
- AND the player submits text such as "I ask Mira what she knows about the storm"
- THEN the backend treats the text as narrative Director input
- AND the UI does not require the player to choose between command mode and chat mode

#### Scenario R1-S2: Narrative movement does not mutate rooms

- WHEN the player submits text such as "I leave the chapel and walk toward the graveyard"
- THEN the Director may narrate the attempted movement
- AND the system does not update room, exit, or actor-location state in this change

### Requirement R2: Resumable Feed

The system SHALL reconstruct the player-facing feed from persisted commands, narrations, and events.

#### Scenario R2-S1: Feed survives reload

- WHEN the player submits narrative turns and reloads the app
- THEN the feed shows prior player inputs, Director narrations, and world events
- AND entries are ordered by creation time and grouped by command when useful

#### Scenario R2-S2: Feed distinguishes entry types

- WHEN the feed displays persisted entries
- THEN player input, Director narration, and world events are lightly distinguished
- AND all events are shown in the MVP feed until event noise creates a filtering need

### Requirement R3: Pending And Failed Turns

The system SHALL make synchronous Director turn progress and failure visible to the playtester.

#### Scenario R3-S1: Request pending

- WHEN the player submits a narrative turn
- THEN the input prevents duplicate submission for that turn
- AND the interface shows that the Director response is pending

#### Scenario R3-S2: Missing world state

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

## Story LC-001-S2: Provider-Agnostic Backend Director Boundary

As a developer, I want Lorecraft to call LLMs through backend application logic and a provider adapter, so that the UI can change later and local model playtesting does not lock the app to one provider.

### Requirement R1: Next Route Handler Director Workflow

The system SHALL keep Director orchestration and provider calls out of React components and place the first POC orchestration boundary in a Next.js Route Handler.

#### Scenario R1-S1: UI submits intent

- WHEN the player submits a narrative turn
- THEN the client calls the Director Route Handler with the input and selected world
- AND React does not import provider SDKs, provider request types, secrets, or durable game rules

#### Scenario R1-S2: Backend coordinates the turn

- WHEN the Route Handler receives player input
- THEN it uses backend application/domain modules to prepare context, invoke the provider adapter, parse and validate structured output, and coordinate persistence through Convex functions
- AND Convex remains the only persistence path for commands, narrations, facts, state diffs, events, and Director debug records

#### Scenario R1-S3: Orchestration can move later

- WHEN the POC outgrows the Next.js Route Handler boundary
- THEN the reusable application/domain modules can move behind Convex actions or another backend service
- AND React-facing behavior does not need to own Director rules

#### Scenario R1-S4: Malformed world id

- WHEN the Route Handler receives a malformed `worldId`
- THEN it returns a structured `400` `TurnResponse` error
- AND it does not record player input or call the LLM

### Requirement R2: OpenAI-Compatible Provider Adapter

The system SHALL support an OpenAI-compatible chat completions endpoint configured by environment variables.

#### Scenario R2-S1: Ollama local endpoint configured

- WHEN `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` are configured
- THEN the backend can call an Ollama OpenAI-compatible endpoint such as `http://localhost:11434/v1` without changing UI or domain code
- AND no provider-specific model identifier is hard-coded in the client

#### Scenario R2-S2: Alternate OpenAI-compatible endpoint configured

- WHEN `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` point at another compatible endpoint such as LM Studio, OpenRouter, or Vercel AI Gateway
- THEN the same provider adapter contract is used
- AND UI and domain code do not change

#### Scenario R2-S3: No endpoint configured

- WHEN required LLM configuration is missing
- THEN deterministic app surfaces remain usable
- AND a Director turn returns a setup-oriented failure without mutating persisted state

### Requirement R3: Stateless Provider Requests With Bounded Context

The system SHALL avoid provider-managed chat sessions while still sending enough bounded context for coherent responses.

#### Scenario R3-S1: Director request is built

- WHEN the backend builds a Director request
- THEN it includes the current player message, current structured scene/NPC state, and a small recent feed window
- AND it does not send secrets, raw database dumps, or unrelated debug state

#### Scenario R3-S2: Multiple narrative turns

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

## Story LC-001-S3: Persistent Current-Scene NPC State

As a playtester, I want an NPC in the scene to remember meaningful interaction state, so that Lorecraft can prove structured persistence without modeling the full world yet.

### Requirement R1: Seed NPC State

The system SHALL seed current-scene NPCs with stable identity and a small mutable fact surface.

#### Scenario R1-S1: Mira is seeded

- WHEN the Stormbound Chapel world is seeded
- THEN Mira exists as an actor with stable `key`, `name`, and `description`
- AND Mira has baseline facts for `mood`, `status`, and `memory`

#### Scenario R1-S2: Seeded memory has useful baseline text

- WHEN Mira's baseline `memory` fact is created
- THEN it contains a short baseline such as "Mira has not yet formed any meaningful memories of Taylor."
- AND it does not start as an empty string

### Requirement R2: Structured Director Output

The system SHALL require the Director to return strict JSON with player-facing narration and optional NPC updates.

#### Scenario R2-S1: Valid Director output

- WHEN the provider returns valid JSON
- THEN the response includes a non-empty `narration` string
- AND it includes `npcUpdates` as an array that may be empty

#### Scenario R2-S2: Invalid JSON

- WHEN the provider returns malformed JSON or unusable structured output
- THEN the turn fails cleanly
- AND the system does not persist fake narration or NPC state changes from the malformed output

### Requirement R3: Bounded NPC Updates

The system SHALL accept only bounded updates for NPCs currently in the scene.

#### Scenario R3-S1: Mira is affected by the turn

- WHEN the Director returns an update for `actorKey: "mira"` with a reason and valid changes
- THEN the backend maps the key to the current-scene NPC actor
- AND it persists accepted `mood`, `status`, and `memory` changes as facts

#### Scenario R3-S2: NPC is not affected

- WHEN Mira is not meaningfully affected by the player's turn
- THEN the Director returns no update for Mira
- AND existing facts remain unchanged

#### Scenario R3-S3: Offscreen or unknown NPC update

- WHEN the Director returns an update for an actor key that is unknown or not in the current scene
- THEN the backend ignores that update
- AND the debug panel can show why it was ignored

### Requirement R4: Durable Memory Boundary

The system SHALL use NPC facts only for state that should matter after recent transcript context falls away.

#### Scenario R4-S1: Ephemeral reaction

- WHEN the narration includes a passing gesture or momentary reaction
- THEN the system can leave NPC facts unchanged
- AND the recent feed carries that short-term continuity

#### Scenario R4-S2: Immediate physical beat

- WHEN the player does something with immediate physical consequences, such as pushing Mira down
- THEN the Director should narrate the immediate result in the visible feed
- AND it should not immediately rewrite Mira's `status` fact unless the condition remains stable and important after the moment has resolved

#### Scenario R4-S3: Durable interaction memory

- WHEN the player interaction meaningfully changes what Mira should remember later
- THEN the Director may rewrite Mira's `memory` as a compact rolling summary capped at 500 characters
- AND the rewrite may preserve important older information, add new important information, and drop stale or low-importance details

### Requirement R5: Hidden State, Visible Behavior

The system SHALL use NPC facts as hidden Director guidance rather than player-visible metadata.

#### Scenario R5-S1: Narration uses mood naturally

- WHEN Mira's `mood` is included in Director context
- THEN the narration may describe observable behavior influenced by that mood
- AND it does not mechanically expose hidden fields such as "Mira's mood is wary"

#### Scenario R5-S2: Debug mode shows hidden state

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

## Story LC-001-S4: Debuggable Director Calls And Reset

As a developer-playtester, I want to inspect Director calls and reset the spike world, so that early LLM behavior can be tuned without losing evidence or hand-editing every playtest cleanup.

### Requirement R1: Director Call Audit

The system SHALL persist a debug record for each Director call.

#### Scenario R1-S1: Successful Director call

- WHEN a Director call succeeds
- THEN the system stores provider/model metadata, compact request summary, raw response, parsed response, success status, accepted updates, and ignored updates
- AND the debug panel can display those details

#### Scenario R1-S2: Provider or validation failure

- WHEN a provider error, invalid JSON response, or validation failure occurs
- THEN the system stores the raw response or error where available
- AND the debug panel can display enough information to diagnose the failed turn after reload

### Requirement R2: Local Debug Log

The system SHALL optionally write local-only structured debug logs for Director troubleshooting.

#### Scenario R2-S1: Local debug logging enabled

- WHEN `LORECRAFT_DEBUG_LOG=1` is set during local development
- THEN the backend appends newline-delimited JSON records under a gitignored local log path
- AND each record includes timestamp, event name, route stage, provider host, model, request summary, outcome, errors, accepted/ignored update counts, response length metadata, and timing data without API keys or full environment dumps

#### Scenario R2-S2: Raw LLM logging gated

- WHEN `LORECRAFT_DEBUG_LOG_RAW_LLM=1` is not set
- THEN local log records do not include full raw LLM response text
- AND raw response content can still be inspected from the persisted `directorCalls` debug table when appropriate

### Requirement R3: Accepted And Ignored Update Visibility

The system SHALL persist accepted NPC fact changes and make ignored update reasons inspectable.

#### Scenario R3-S1: Valid and invalid fields mixed

- WHEN a Director update contains both valid and invalid fields
- THEN valid fields are accepted and persisted
- AND invalid fields are ignored and recorded for debug inspection

#### Scenario R3-S2: NPC update reason recorded

- WHEN an accepted NPC update changes one or more facts
- THEN the system persists a human-readable reason in debug-visible event/director-call data
- AND the reason is not shown as ordinary player-facing narration unless a debug display mode is enabled

### Requirement R4: Rough Reset

The system SHALL provide a rough developer reset for repeated MVP playtesting.

#### Scenario R4-S1: Reset playtest state

- WHEN the reset action is invoked
- THEN the existing seeded world, rooms, exits, actors, and objects remain in place
- AND transcript/debug rows for that world are cleared from `commands`, `narrations`, `events`, `stateDiffs`, and `directorCalls`
- AND Mira's mutable `mood`, `status`, and `memory` facts are restored to their seed values
- AND the reset is treated as temporary until independent story/play-session instances exist

#### Scenario R4-S2: Future story instances remain deferred

- WHEN the MVP reset behavior is documented
- THEN the design states that future stories/play sessions should be independent instances generated from a world/template
- AND this change does not add story/play-session schema

### Implemented By

- `convex/schema.ts` defines `directorCalls` for provider/model metadata, compact request summaries, raw/parsed responses, status, accepted updates, ignored updates, and errors.
- `convex/world.ts` persists Director call audit records, accepted NPC fact diffs, generic world events, and rough reset behavior.
- `src/lib/director/debug-log.ts` writes opt-in gitignored JSONL debug records for local troubleshooting and gates raw LLM text behind `LORECRAFT_DEBUG_LOG_RAW_LLM`.
- `src/app/api/director/turn/route.ts` records local log entries for rejected, provider-error, invalid-output, and successful Director turns when `LORECRAFT_DEBUG_LOG=1` is enabled.
- `src/app/world-client.tsx` renders hidden facts, events, narrations, state diffs, and Director calls in the debug panel and exposes rough reset.
- `.gitignore`, `package.json`, and `README.md` document and support the local-only debug log path.

### Verified By

- `npm run test` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run convex:once` passed.
- Runtime Ollama turn persisted a successful `directorCalls` record with raw output, parsed output, accepted updates, and no ignored updates.
- `CONVEX_AGENT_MODE=anonymous npx convex run world:resetPlaytestWorld` returned `deletedCommands: 2`, `deletedDirectorCalls: 1`, `deletedEvents: 2`, `deletedNarrations: 3`, `deletedStateDiffs: 1`, and `restoredFacts: 3`.
- Post-reset Convex snapshot showed actors, exits, objects, room, and world preserved while feed, narrations, events, state diffs, and director calls were empty.
- `npm run test` includes local debug log coverage proving JSONL writes are opt-in and raw LLM response text is omitted unless explicitly enabled.
- `npm run build` passed with the Node.js Route Handler and local filesystem debug log module.

### Verification Gaps

- No unresolved implementation gap for this Story.
- Rough reset intentionally remains a temporary single-world playtest tool until story/play-session instances exist.

## Story LC-001-S5: Story Stream Reading Experience

As a playtester, I want the play surface to read like an unfolding story and stay anchored near the newest turn, so that long sessions feel like interactive fiction instead of a chat log I have to manage.

### Requirement R1: Story-First Feed Presentation

The system SHALL present the main feed as a prose-oriented story stream instead of a chat-bubble transcript.

#### Scenario R1-S1: Director narration is primary prose

- WHEN the feed contains Director narration
- THEN the narration appears as the dominant story text in the main stream
- AND it is not styled as a chat bubble competing with player input

#### Scenario R1-S2: Player input reads as an authored action

- WHEN the feed contains player input
- THEN the player input is visually distinct from Director narration
- AND it reads as an action or authored turn within the story flow rather than as a support-chat message

#### Scenario R1-S3: World events do not interrupt the story

- WHEN world events appear in the feed
- THEN they are visually quieter than narration and player input
- AND the debug panel remains the place for full event/state inspection

### Requirement R2: Bottom-Anchored Continuation

The system SHALL keep the latest story turn and continuation input easy to reach as the session grows.

#### Scenario R2-S1: New turn appears near the continuation point

- WHEN a player submits a turn and the Director response is persisted
- THEN the story stream settles near the newest feed content
- AND the player does not need to manually scroll down to find the continuation point

#### Scenario R2-S2: Reload resumes near latest content

- WHEN a playtester reloads a world with an existing long feed
- THEN the story surface opens near the latest story content
- AND the input remains available for continuing the session

#### Scenario R2-S3: Debug sidebar is taller than the story column

- WHEN the debug sidebar contains more content than the visible story stream
- THEN the story input is not stranded at the viewport bottom away from the feed
- AND the main story stream remains independently usable from the debug panel

### Requirement R3: Empty, Pending, And Error States Fit The Story Surface

The system SHALL keep empty, pending, and error states understandable without reverting the main experience to a chat-debug layout.

#### Scenario R3-S1: Empty story

- WHEN the seeded world has no feed entries
- THEN the main surface presents an empty story state that invites narrative input
- AND it does not show placeholder chat bubbles

#### Scenario R3-S2: Director response pending

- WHEN the player submits a turn and waits for the Director
- THEN the UI shows pending state near the continuation input
- AND duplicate submission remains disabled for that turn

#### Scenario R3-S3: Director response fails

- WHEN the Director turn fails
- THEN the error is shown near the continuation input
- AND the existing story stream remains readable and unchanged

### Implemented By

- `src/app/world-client.tsx` renders persisted feed rows as a prose-first story stream, with Director narration as normalized app-font prose, player turns as authored action text, and world events as quiet inline notices.
- `src/app/world-client.tsx` keeps the play surface in a constrained first-viewport layout where the story stream scrolls independently and the continuation input stays visible across desktop and narrow viewports.
- `src/app/world-client.tsx` scrolls the story pane to the bottom when feed length, pending state, or error state changes, while preserving the existing unified narrative input and Enter-to-send behavior.

### Verified By

- `npm run lint` passed.
- `npm run build` passed.
- Browser verification at `http://localhost:3000` showed the document body no longer scrolls at desktop height, the story pane uses independent overflow, the debug panel uses independent overflow, and the story pane settles at exact bottom with a long persisted feed.
- Browser verification at `390x844` showed the continuation form remains in the first viewport, the story pane uses independent overflow, and the story pane settles at exact bottom with a long persisted feed.
- Browser verification after manual typography feedback showed narration uses the app sans font at a reduced scale, without serif or italic styling, while desktop and narrow viewport bottom anchoring remains intact.
- Browser verification with a page-local `fetch` stub showed Enter submits the narrative textarea, the submit button changes to disabled "Director thinking" while pending, and no Convex mutation or real LLM call is required for that check.
- Browser verification with a page-local error `fetch` stub showed Director errors appear near the continuation input and the existing story remains readable.

### Verification Gaps

- Live empty-feed browser verification was not run because it would require clearing the current local playtest feed with rough reset. The empty-feed branch is implemented in `src/app/world-client.tsx` and remains a focused manual check before acceptance.
