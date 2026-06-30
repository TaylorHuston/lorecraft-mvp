# Epic: Provider-Agnostic Chat Experience

## Summary

Lorecraft needs a first playable AI Game Master loop where the player can interact narratively with a persistent scene, resume the visible transcript, and watch at least one NPC carry structured memory across turns, while the product remains free to change LLM providers and while Convex remains the source of truth.

## Deferred Model

This Epic keeps the MVP to one editable persistent world. The later target model is independent story/play-session instances generated from a world or template, so each story can mutate separately from canonical authored world data.

## Story LC-001-S1: Narrative Play Feed And Unified Input

As a playtester, I want one narrative input and a resumable story feed, so that the MVP feels like interacting with a living scene instead of operating a command parser.

### Requirement R1: Unified Narrative Input

The system SHALL let the player submit narrative text through one input box.

#### Scenario R1-S1: Player submits narrative intent

- WHEN a seeded world exists
- AND the player submits text such as "I ask Mira what she knows about the storm"
- THEN the backend treats the text as narrative Game Master input
- AND the UI does not require the player to choose between command mode and chat mode

#### Scenario R1-S2: Narrative movement does not mutate rooms

- WHEN the player submits text such as "I leave the chapel and walk toward the graveyard"
- THEN the Game Master may narrate the attempted movement
- AND the system does not update room, exit, or actor-location state in this change

### Requirement R2: Resumable Feed

The system SHALL reconstruct the player-facing feed from persisted commands, narrations, and events.

#### Scenario R2-S1: Feed survives reload

- WHEN the player submits narrative turns and reloads the app
- THEN the feed shows prior player inputs, Game Master narrations, and world events
- AND entries are ordered by creation time and grouped by command when useful

#### Scenario R2-S2: Feed distinguishes entry types

- WHEN the feed displays persisted entries
- THEN player input, Game Master narration, and world events are lightly distinguished
- AND all events are shown in the MVP feed until event noise creates a filtering need

### Requirement R3: Pending And Failed Turns

The system SHALL make synchronous Game Master turn progress and failure visible to the playtester.

#### Scenario R3-S1: Request pending

- WHEN the player submits a narrative turn
- THEN the input prevents duplicate submission for that turn
- AND the interface shows that the Game Master response is pending

#### Scenario R3-S2: Missing world state

- WHEN no world is seeded or the selected world cannot be loaded
- THEN the system does not call the LLM
- AND the player sees an actionable message to seed or reload the world

### Implemented By

- `src/app/world-client.tsx` renders the narrative-only split layout, one unified textarea, pending/error states, persisted feed entries, and debug panel.
- `src/app/api/director/turn/route.ts` receives narrative input from the client and routes it through the backend Game Master workflow.
- `convex/world.ts` records player inputs, reconstructs the feed from `commands`, `narrations`, and `events`, and does not mutate room, exit, or actor-location state through the Game Master path.

### Verified By

- `npm run test` passed with focused Game Master request/output/provider tests.
- `npm run lint` passed.
- `npm run build` passed and included `/` plus dynamic `/api/director/turn`.
- `npm run convex:once` passed.
- Runtime `curl http://localhost:3000` under `npm run dev` returned the narrative UI HTML.
- Runtime POST to `/api/director/turn` with local Ollama `llama3.1:8b` returned a persisted Game Master narration.
- `CONVEX_AGENT_MODE=anonymous npx convex run world:getSnapshot` showed player input, Game Master narration, and event feed entries ordered from persisted rows.

### Verification Gaps

- No unresolved implementation gap for this Story.
- Full browser click automation is not yet installed; verification used route-level HTTP checks, Convex snapshot reads, and build/lint/type checks.

## Story LC-001-S2: Provider-Agnostic Backend Game Master Boundary

As a developer, I want Lorecraft to call LLMs through backend application logic and a provider adapter, so that the UI can change later and local model playtesting does not lock the app to one provider.

### Requirement R1: Next Route Handler Game Master Workflow

The system SHALL keep Game Master orchestration and provider calls out of React components and place the first POC orchestration boundary in a Next.js Route Handler.

#### Scenario R1-S1: UI submits intent

- WHEN the player submits a narrative turn
- THEN the client calls the Game Master Route Handler with the input and selected world
- AND React does not import provider SDKs, provider request types, secrets, or durable game rules

#### Scenario R1-S2: Backend coordinates the turn

- WHEN the Route Handler receives player input
- THEN it uses backend application/domain modules to prepare context, invoke the provider adapter, parse and validate structured output, and coordinate persistence through Convex functions
- AND Convex remains the only persistence path for commands, narrations, facts, state diffs, events, and Game Master debug records

#### Scenario R1-S3: Orchestration can move later

- WHEN the POC outgrows the Next.js Route Handler boundary
- THEN the reusable application/domain modules can move behind Convex actions or another backend service
- AND React-facing behavior does not need to own Game Master rules

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
- AND a Game Master turn returns a setup-oriented failure without mutating persisted state

### Requirement R3: Stateless Provider Requests With Bounded Context

The system SHALL avoid provider-managed chat sessions while still sending enough bounded context for coherent responses.

#### Scenario R3-S1: Game Master request is built

- WHEN the backend builds a Game Master request
- THEN it includes the current player message, current structured scene/NPC state, and a small recent feed window
- AND it does not send secrets, raw database dumps, or unrelated debug state

#### Scenario R3-S2: Multiple narrative turns

- WHEN the player sends multiple turns
- THEN each provider request is independently constructed from current persisted state and recent feed context
- AND the system does not depend on a provider conversation ID, assistant thread, or hidden remote memory

### Implemented By

- `src/app/api/director/turn/route.ts` is the synchronous Next.js Route Handler orchestration boundary.
- `src/lib/director/prompt.ts` builds stateless bounded Game Master requests from current scene/NPC/feed context.
- `src/lib/director/provider.ts` reads `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` and calls OpenAI-compatible chat completions through `fetch`.
- `src/lib/director/output.ts` parses plain prose for current story generation and retains strict JSON NPC-update parsing/validation for structured extraction.
- `convex/world.ts` remains the only persistence path for commands, narrations, facts, state diffs, events, and Game Master call records.

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

#### Scenario R1-S1: Chapel NPCs are seeded

- WHEN the Stormbound Chapel world is seeded
- THEN Mira and Brother Alden exist as NPC actors with stable `key`, `name`, and `description`
- AND each seeded NPC has baseline facts for `mood`, `status`, and `memory`
- AND NPC-profile facts may add stable `background`, `persona`, `voice`, and `knowledge` context without changing the bounded mutation allowlist

#### Scenario R1-S2: Seeded memory has useful baseline text

- WHEN a seeded NPC's baseline `memory` fact is created
- THEN it contains a short baseline such as "Mira has not yet formed meaningful memories of Taylor."
- AND it does not start as an empty string

### Requirement R2: Game Master Story Output

The system SHALL allow the Game Master to return player-facing narration without embedding creative prose inside structured JSON.

#### Scenario R2-S1: Valid Game Master output

- WHEN the provider returns non-empty story prose
- THEN the backend normalizes it into a non-empty `narration` string
- AND `npcUpdates` is empty for the current read-only story generation step

#### Scenario R2-S2: Empty output

- WHEN the provider returns empty or unusable prose
- THEN the turn fails cleanly
- AND the system does not persist fake narration or NPC state changes from the malformed output

### Requirement R3: Bounded NPC Updates

The system SHALL accept only bounded updates for NPCs currently in the scene.

#### Scenario R3-S1: Mira is affected by the turn

- WHEN the Game Master returns an update for `actorKey: "mira"` with a reason and valid changes
- THEN the backend maps the key to the current-scene NPC actor
- AND it persists accepted `mood`, `status`, and `memory` changes as facts

#### Scenario R3-S2: NPC is not affected

- WHEN Mira is not meaningfully affected by the player's turn
- THEN the Game Master returns no update for Mira
- AND existing facts remain unchanged

#### Scenario R3-S3: Offscreen or unknown NPC update

- WHEN the Game Master returns an update for an actor key that is unknown or not in the current scene
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
- THEN the Game Master should narrate the immediate result in the visible feed
- AND it should not immediately rewrite Mira's `status` fact unless the condition remains stable and important after the moment has resolved

#### Scenario R4-S3: Durable interaction memory

- WHEN the player interaction meaningfully changes what Mira should remember later
- THEN the Game Master may rewrite Mira's `memory` as a compact rolling summary capped at 500 characters
- AND the rewrite may preserve important older information, add new important information, and drop stale or low-importance details

### Requirement R5: Hidden State, Visible Behavior

The system SHALL use NPC facts as hidden Game Master guidance rather than player-visible metadata.

#### Scenario R5-S1: Narration uses mood naturally

- WHEN Mira's `mood` is included in Game Master context
- THEN the narration may describe observable behavior influenced by that mood
- AND it does not mechanically expose hidden fields such as "Mira's mood is wary"

#### Scenario R5-S2: Debug mode shows hidden state

- WHEN the debug panel is visible
- THEN it shows Mira's hidden facts plainly for developer/playtest inspection

### Implemented By

- `convex/schema.ts` adds actor keys and the `directorCalls` table while continuing to store NPC state in `facts`.
- `convex/world.ts` seeds Taylor and Mira with stable actor keys and initializes Mira's `mood`, `status`, and `memory` facts.
- `src/lib/director/output.ts` retains structured NPC-update parsing/validation for extractor-style mutation, ignores unknown/offscreen NPC updates, partially accepts valid fields, and caps `memory` at 500 characters.
- `src/lib/director/prompt.ts` sends current-scene NPC facts as hidden Game Master guidance.
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

## Story LC-001-S4: Debuggable Game Master Calls And Reset

As a developer-playtester, I want to inspect Game Master calls and reset the spike world, so that early LLM behavior can be tuned without losing evidence or hand-editing every playtest cleanup.

### Requirement R1: Game Master Call Audit

The system SHALL persist a debug record for each Game Master call.

#### Scenario R1-S1: Successful Game Master call

- WHEN a Game Master call succeeds
- THEN the system stores provider/model metadata, compact request summary, raw response, parsed response, success status, accepted updates, and ignored updates
- AND the debug panel can display those details

#### Scenario R1-S2: Provider or validation failure

- WHEN a provider error, invalid JSON response, or validation failure occurs
- THEN the system stores the raw response or error where available
- AND the debug panel can display enough information to diagnose the failed turn after reload

### Requirement R2: Local Debug Log

The system SHALL optionally write local-only structured debug logs for Game Master troubleshooting.

#### Scenario R2-S1: Local debug logging enabled

- WHEN `LORECRAFT_DEBUG_LOG=1` is set during local development
- THEN the backend appends newline-delimited JSON records under a gitignored local log path
- AND each recorded Game Master turn attempt writes one `director.turn.unit` record with timestamp, event name, route stage, turn ID, command ID, player input, provider host, model, request summary, outcome, errors, parsed output when available, accepted/ignored updates, response length metadata, and timing data without API keys or full environment dumps
- AND pre-turn failures may still write `director.turn.rejected` records because no concrete turn exists yet

#### Scenario R2-S2: Raw LLM logging gated

- WHEN `LORECRAFT_DEBUG_LOG_RAW_LLM=1` is not set
- THEN local log records do not include full raw LLM response text
- AND raw response content can still be inspected from the persisted `directorCalls` debug table when appropriate
- AND raw provider request text is also gated separately behind `LORECRAFT_DEBUG_LOG_RAW_REQUEST=1`

### Requirement R3: Accepted And Ignored Update Visibility

The system SHALL persist accepted NPC fact changes and make ignored update reasons inspectable.

#### Scenario R3-S1: Valid and invalid fields mixed

- WHEN a Game Master update contains both valid and invalid fields
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
- `convex/world.ts` persists Game Master call audit records, accepted NPC fact diffs, generic world events, and rough reset behavior.
- `src/lib/director/debug-log.ts` writes opt-in gitignored JSONL debug records for local troubleshooting and gates raw LLM text behind `LORECRAFT_DEBUG_LOG_RAW_LLM` and raw provider request text behind `LORECRAFT_DEBUG_LOG_RAW_REQUEST`.
- `src/app/api/director/turn/route.ts` records pre-turn rejection logs and one local `director.turn.unit` log entry for each recorded provider-error, invalid-output, or successful Game Master turn when `LORECRAFT_DEBUG_LOG=1` is enabled.
- `src/app/world-client.tsx` renders hidden facts, events, narrations, state diffs, and Game Master calls in the debug panel and exposes rough reset.
- `.gitignore`, `package.json`, and `README.md` document and support the local-only debug log path.

### Verified By

- `npm run test` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run convex:once` passed.
- Runtime Ollama turn persisted a successful `directorCalls` record with raw output, parsed output, accepted updates, and no ignored updates.
- `CONVEX_AGENT_MODE=anonymous npx convex run world:resetPlaytestWorld` returned `deletedCommands: 2`, `deletedGame MasterCalls: 1`, `deletedEvents: 2`, `deletedNarrations: 3`, `deletedStateDiffs: 1`, and `restoredFacts: 3`.
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

#### Scenario R1-S1: Game Master narration is primary prose

- WHEN the feed contains Game Master narration
- THEN the narration appears as the dominant story text in the main stream
- AND it is not styled as a chat bubble competing with player input

#### Scenario R1-S2: Player input reads as an authored action

- WHEN the feed contains player input
- THEN the player input is visually distinct from Game Master narration
- AND it reads as an action or authored turn within the story flow rather than as a support-chat message

#### Scenario R1-S3: World events do not interrupt the story

- WHEN world events appear in the feed
- THEN they are visually quieter than narration and player input
- AND the debug panel remains the place for full event/state inspection

### Requirement R2: Bottom-Anchored Continuation

The system SHALL keep the latest story turn and continuation input easy to reach as the session grows.

#### Scenario R2-S1: New turn appears near the continuation point

- WHEN a player submits a turn and the Game Master response is persisted
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

#### Scenario R3-S2: Game Master response pending

- WHEN the player submits a turn and waits for the Game Master
- THEN the UI shows pending state near the continuation input
- AND duplicate submission remains disabled for that turn

#### Scenario R3-S3: Game Master response fails

- WHEN the Game Master turn fails
- THEN the error is shown near the continuation input
- AND the existing story stream remains readable and unchanged

### Implemented By

- `src/app/world-client.tsx` renders persisted feed rows as a prose-first story stream, with Game Master narration as normalized app-font prose, player turns as authored action text, and world events as quiet inline notices.
- `src/app/world-client.tsx` keeps the play surface in a constrained first-viewport layout where the story stream scrolls independently and the continuation input stays visible across desktop and narrow viewports.
- `src/app/world-client.tsx` scrolls the story pane to the bottom when feed length, pending state, or error state changes, while preserving the existing unified narrative input and Enter-to-send behavior.

### Verified By

- `npm run lint` passed.
- `npm run build` passed.
- Browser verification at `http://localhost:3000` showed the document body no longer scrolls at desktop height, the story pane uses independent overflow, the debug panel uses independent overflow, and the story pane settles at exact bottom with a long persisted feed.
- Browser verification at `390x844` showed the continuation form remains in the first viewport, the story pane uses independent overflow, and the story pane settles at exact bottom with a long persisted feed.
- Browser verification after manual typography feedback showed narration uses the app sans font at a reduced scale, without serif or italic styling, while desktop and narrow viewport bottom anchoring remains intact.
- Browser verification with a page-local `fetch` stub showed Enter submits the narrative textarea, the textarea clears while pending, duplicate submission is rejected while the turn is in progress, and pending feedback appears as text without a submit button.
- Browser verification with a page-local error `fetch` stub showed Game Master errors appear near the continuation input and the existing story remains readable.

### Verification Gaps

- Live empty-feed browser verification was not run because it would require clearing the current local playtest feed with rough reset. The empty-feed branch is implemented in `src/app/world-client.tsx` and remains a focused manual check before acceptance.

## Story LC-001-S6: Scoped Narrative Turns

As a developer-playtester, I want each narrative exchange to be stored as a scoped turn, so that story history, debug records, and future rollback boundaries have one durable unit of progression.

### Requirement R1: Turn Lifecycle

The system SHALL create a durable turn for each persisted narrative player intent.

#### Scenario R1-S1: Successful narrative turn

- WHEN the player submits valid narrative input for a seeded world
- THEN the backend creates a turn with a world-scoped sequence number
- AND the turn links the player input, Game Master call, narration, accepted state diffs, and events caused by that input
- AND the turn ends with a succeeded status after persistence completes

#### Scenario R1-S2: Provider or output failure after turn creation

- WHEN a turn is created and the provider call fails or returns invalid output
- THEN the turn remains persisted with a failed status
- AND the related command and Game Master call remain linked to the turn for debug inspection
- AND no fake narration or unaccepted state change is stored

#### Scenario R1-S3: Request rejected before persistence

- WHEN a request is malformed, missing required configuration, or references an invalid world before game persistence starts
- THEN no turn is created
- AND the route returns the existing structured setup or validation error

### Requirement R2: Turn-Scoped Feed And Debug Records

The system SHALL expose turn scope in persisted history without making the player-facing story stream more complicated.

#### Scenario R2-S1: Feed entries carry turn scope

- WHEN the UI loads a persisted story feed
- THEN entries caused by a player input include the same `turnId`
- AND the visible story stream remains ordered by persisted creation time or turn sequence

#### Scenario R2-S2: Debug panel can inspect turn grouping

- WHEN a playtester opens the debug panel
- THEN recent turns show sequence, status, player input, related narration/event/diff counts, and related Game Master call status
- AND failed turns can be distinguished from successful turns after reload

#### Scenario R2-S3: Seed rows remain outside player turns

- WHEN the world is seeded
- THEN seed narration and seed events may remain unscoped
- AND narrative turns still begin with the first persisted player intent

### Requirement R3: Reset And Future Rollback Boundary

The system SHALL keep turn persistence compatible with rough reset now and snapshot/rollback later.

#### Scenario R3-S1: Rough reset clears turn history

- WHEN the existing rough reset is invoked
- THEN persisted turns and turn-linked history for the playtest world are cleared with commands, narrations, events, state diffs, and Game Master calls
- AND seeded world graph rows and baseline facts are restored as they are today

#### Scenario R3-S2: State diffs remain tied to one turn

- WHEN accepted mutations are recorded
- THEN each state diff belongs to the turn that accepted those mutations
- AND the diff remains an audit record rather than a rollback implementation by itself

#### Scenario R3-S3: Snapshot rollback remains deferred

- WHEN the data model is documented
- THEN it states that future rollback should attach snapshots to turn boundaries
- AND this change does not add snapshot capture, reverse-diff logic, branching, or restore behavior

### Implemented By

- `convex/schema.ts` defines `turns` plus optional `turnId` links on commands, narrations, events, state diffs, and Game Master calls.
- `convex/world.ts` creates pending turns with world-scoped sequence numbers, completes turns as succeeded or failed, links turn-scoped rows, exposes recent turn summaries in `getSnapshot`, includes `turnId` on derived feed entries, and clears turns during rough reset.
- `src/app/api/director/turn/route.ts` passes `turnId` through successful, provider-error, and invalid-output Game Master completion paths while leaving pre-persistence request/config/world-load failures unpersisted.
- `src/lib/director/debug-log.ts` includes optional `turnId` in local JSONL debug records.
- `src/app/world-client.tsx` shows recent turn sequence/status/count summaries and raw turn summaries in the debug panel, and renders a subtle story-stream turn-number gutter for feed entries linked to a turn.
- `docs/data-model.md` and `docs/persistence-system.md` document scoped turns and defer snapshot rollback.

### Verified By

- `npm run test` passed, including turn-scoped feed metadata being omitted from the Game Master prompt and local debug log records retaining `turnId`.
- `npm run lint` passed.
- `npm run build` passed.
- `npx convex codegen` passed, including schema/function validation and generated TypeScript bindings.
- `curl -I --max-time 5 http://localhost:3000` returned `HTTP/1.1 200 OK` from the existing dev server.
- `/th-review` passed as the local PR gate with no blocking or required findings.
- `npm run lint` and `npm run build` passed after the story-stream turn-number UI follow-up.

### Verification Gaps

- `npm run convex:once` could not run during implementation because an existing local Convex backend was already running on port 3210; `npx convex codegen` was used for Convex validation instead.
- Runtime playtest verification of failed turns in the browser remains pending.

## Story LC-001-S7: Active Game Master Guidance And Context Assembly

As a playtester, I want the Game Master to actively advance the current scene and let present NPCs respond meaningfully, so that Lorecraft feels like a story with persistent structure instead of a passive state logger.

### Requirement R1: Prompt Context Components

The system SHALL assemble Game Master prompts from explicit components with clear source ownership.

#### Scenario R1-S1: Prompt separates instructions from state and history

- WHEN the backend builds a Game Master request
- THEN the request distinguishes Game Master instructions, scene state, visible facts, hidden NPC knowledge, recent feed, current player input, and required scene beat
- AND the recent feed remains bounded and does not include internal turn or command IDs

#### Scenario R1-S2: Editable and derived components have clear ownership

- WHEN prompt components are documented or inspected in tests
- THEN Game Master instructions, author/tone guidance, and model settings are treated as editable configuration
- AND scene state, visible facts, hidden NPC knowledge, recent feed, and required scene beat are derived from Convex state, player input, and engine logic

### Requirement R2: Read-Only Knowledge Context

The system SHALL include relevant read-only knowledge facts in Game Master context without expanding LLM mutation authority.

#### Scenario R2-S1: Seeded NPC knowledge reaches the Game Master

- WHEN Mira has a seeded read-only `knowledge` fact
- AND the player asks Mira what she knows about the storm
- THEN the Game Master request includes that knowledge as hidden context
- AND the model can use it to write player-facing narration or dialogue

#### Scenario R2-S2: Read-only facts are not mutable output fields

- WHEN the Game Master returns `npcUpdates`
- THEN validation still accepts only the bounded mutable NPC fields currently allowed by the MVP
- AND read-only facts such as knowledge, secrets, occupation, or relationships are ignored if returned as attempted updates

### Requirement R3: Required Scene Beat

The system SHALL derive a lightweight scene-beat instruction from player input and current scene context.

#### Scenario R3-S1: Direct NPC question expects response

- WHEN the player directly asks Mira a question
- THEN the Game Master request includes a required scene beat indicating Mira is directly addressed and a meaningful response is expected
- AND the response may be an answer, refusal, deflection, warning, lie, counter-question, or visibly intentional silence

#### Scenario R3-S2: Non-dialogue action does not force speech

- WHEN the player performs a non-dialogue action such as jumping, smiling, or inspecting an object
- THEN the required scene beat does not force an NPC line of dialogue
- AND the Game Master may still narrate relevant observable reactions when they make sense

### Requirement R4: Active NPC Narrative Behavior

The system SHALL guide the Game Master to write active scene progression rather than passive acknowledgement.

#### Scenario R4-S1: NPC response advances the story

- WHEN the player directly engages a present NPC
- THEN the Game Master narration includes a concrete response or choice from that NPC
- AND it avoids merely repeating that the NPC is watchful, thoughtful, hesitant, or unchanged unless that silence is intentionally meaningful in the scene

#### Scenario R4-S2: Dialogue is allowed in narration

- WHEN the Game Master writes player-facing narration for an NPC response
- THEN it may include quoted or clearly attributed NPC speech inside the `narration` field
- AND no separate dialogue schema is required for this change

### Requirement R5: Conservative Persistence Boundary

The system SHALL keep transient story beats out of durable NPC facts unless they should matter after recent context falls away.

#### Scenario R5-S1: Ephemeral reactions stay in narration

- WHEN Mira glances, flinches, smiles, pauses, or briefly reacts to a player action
- THEN the Game Master can narrate the beat without returning an `npcUpdates` entry
- AND existing NPC facts remain unchanged

#### Scenario R5-S2: Durable changes remain bounded

- WHEN an interaction meaningfully changes Mira's current attitude, ongoing circumstance, or rolling memory
- THEN the Game Master may propose updates only for `mood`, `status`, or `memory`
- AND the backend validates, accepts, ignores, and records updates through the existing persistence boundary

### Requirement R6: Dev-Configurable Generation Settings

The system SHALL let developers tune supported provider generation settings without code edits.

#### Scenario R6-S1: Optional settings configured

- WHEN optional LLM generation environment variables are configured
- THEN the provider adapter includes supported settings in the OpenAI-compatible request body
- AND unset settings fall back to safe defaults

#### Scenario R6-S2: Settings are visible in debug summaries

- WHEN a Game Master call is persisted or locally logged
- THEN debug metadata includes a compact summary of the effective generation settings
- AND secrets, API keys, and full environment dumps remain excluded

### Requirement R7: Debug Prompt Guidance

The system SHALL let developer-playtesters adjust text-only Game Master guidance from the debug panel.

#### Scenario R7-S1: Prompt guidance sections affect the next turn

- WHEN a developer-playtester edits the style, NPC behavior, or persistence guidance fields
- AND submits a narrative turn
- THEN those text sections are included in the Game Master prompt context for that turn
- AND they do not change the required JSON output shape or backend validation authority

#### Scenario R7-S2: Prompt guidance is debug-visible

- WHEN a Game Master call is persisted
- THEN the request summary records which prompt guidance sections were included
- AND the debug panel can show those section keys with the latest Game Master summary

### Requirement R8: Debug-Gated Raw Request Persistence

The system SHALL optionally persist the exact Game Master provider request for local troubleshooting.

#### Scenario R8-S1: Raw request stored only when explicitly enabled

- WHEN local raw request debug storage is enabled
- AND a Game Master call is attempted
- THEN the persisted Game Master call includes the exact provider messages sent to the OpenAI-compatible adapter
- AND the raw request can be inspected in the existing debug JSON

#### Scenario R8-S2: Raw request omitted by default

- WHEN local raw request debug storage is not enabled
- AND a Game Master call is persisted
- THEN the Game Master call stores compact request metadata but omits the full raw request messages
- AND hidden world facts, prompt guidance, and player text are not duplicated into raw request storage by default

### Requirement R9: Turn-Centered Local Logs

The system SHALL make local Game Master logs inspectable by turn rather than by scattered post-turn route events.

#### Scenario R9-S1: Completed turn attempts write one unit record

- WHEN a player input has been recorded as a turn
- AND the Game Master attempt succeeds, fails at the provider, or returns invalid output
- THEN the local debug log writes one `director.turn.unit` record for that turn
- AND the record includes turn ID, command ID, player input, provider/model, request summary, status, error when present, parsed output when present, accepted/ignored updates, response length metadata, and timings

#### Scenario R9-S2: Raw turn artifacts remain gated

- WHEN the local turn-unit log records a provider request or response
- THEN the exact raw provider request is omitted unless `LORECRAFT_DEBUG_LOG_RAW_REQUEST=1` is set
- AND the exact raw LLM response is omitted unless `LORECRAFT_DEBUG_LOG_RAW_LLM=1` is set
- AND pre-turn validation/configuration failures may still write `director.turn.rejected` records because no concrete turn exists yet

### Implemented By

- `src/lib/director/prompt.ts` builds explicit Game Master prompt components, derives required scene beats including `trivial_player_action`, separates mutable NPC facts from read-only hidden NPC knowledge, and records compact request-summary metadata.
- `src/lib/director/provider.ts` parses `LLM_TEMPERATURE`, `LLM_MAX_TOKENS`, and `LLM_TOP_P`, applies safe defaults, and sends supported OpenAI-compatible generation settings.
- `src/app/api/director/turn/route.ts` passes effective generation settings and validated debug prompt guidance into Game Master request construction so persisted `directorCalls.requestSummary` and local turn-unit debug logs can inspect them, and persists exact request messages only when raw request debug storage is enabled.
- `src/lib/director/debug-log.ts` emits one local `director.turn.unit` record per recorded turn attempt and gates full raw request/response text behind explicit local debug flags.
- `src/lib/director/output.ts` continues to validate `npcUpdates` through the bounded `mood`, `status`, and `memory` allowlist, ignores read-only knowledge facts as attempted mutations, and suppresses accepted NPC updates when the required scene beat disallows durable changes.
- `src/app/world-client.tsx` renders debug prompt guidance text sections and includes them with the next narrative turn.
- `src/lib/director/raw-request.ts` gates raw provider request persistence behind `LORECRAFT_DEBUG_STORE_RAW_REQUEST=1`.
- `src/lib/director/director.test.ts` covers prompt component structure, prompt guidance inclusion, hidden knowledge inclusion, scene-beat derivation, read-only fact rejection, provider generation settings, raw request storage gating, and local turn-unit debug log shape.
- `scripts/director-playtest.mjs` runs the repeatable local Game Master playtest against a running dev server.

### Verified By

- `npm run test` passed, including prompt component structure, debug prompt guidance inclusion, hidden read-only knowledge inclusion, direct-question scene-beat derivation, trivial-action scene-beat derivation, read-only fact rejection, trivial-action update suppression, generation setting request bodies, and raw request storage gating.
- `npm run ci:required` passed after the initial implementation.
- `npx convex codegen` passed after adding richer seeded read-only storm knowledge.
- Local route playtest with Ollama `llama3.1:8b` against `http://localhost:3100` produced Mira dialogue for "I ask Mira what she knows about the storm."
- Local route playtest with Ollama `llama3.1:8b` against `http://localhost:3100` produced no accepted durable updates for "I jump."
- Local Convex snapshot showed `directorCalls.requestSummary` includes `promptComponentKeys`, `readOnlyKnowledgeKeys`, `requiredSceneBeat`, and `generationSettings`.
- Final `npm run ci:required` passed after documentation and prompt refinements.
- `npm run playtest:director` passed against local Convex/Next/Ollama after the script caught and the implementation fixed accepted Mira mood churn for "I jump."

### Verification Gaps

- Broader provider-specific behavior for LM Studio, OpenRouter, Vercel AI Gateway, or direct hosted providers remains future playtest coverage.

## Story LC-001-S8: Transcript Game Master Mode

As a developer-playtester, I want a story-only Game Master mode that saves the transcript but does not mutate canonical world state, so that I can isolate story quality from persistence mechanics before adding mutation pressure back in.

### Requirement R1: Game Master Mode Configuration

The system SHALL support explicit Game Master modes selected by application server startup configuration.

#### Scenario R1-S1: Persistent mode remains default

- WHEN the application server starts without a transcript Game Master flag
- AND the player submits a narrative turn
- THEN the route uses the existing persistent mode
- AND the current persistent narration, NPC update validation boundary, state diff, and event behavior remains available

#### Scenario R1-S2: Transcript startup flag enabled

- WHEN the application server starts with `LORECRAFT_DIRECTOR_MODE=transcript`
- AND the player submits a narrative turn
- THEN the backend Game Master boundary resolves the mode as transcript
- AND React does not own the mode's persistence rules

#### Scenario R1-S3: Invalid startup mode rejected before persistence

- WHEN the application server is configured with an unknown Game Master mode value
- AND the player submits a narrative turn
- THEN the route returns a structured setup or validation error
- AND it does not create a turn, record player input, or call the provider

### Requirement R2: Plain-Prose Story Contract

The system SHALL use a plain-prose output contract for transcript Game Master calls.

#### Scenario R2-S1: Transcript prompt asks for prose

- WHEN the backend builds a transcript Game Master request
- THEN the system prompt asks for player-facing story prose rather than strict JSON
- AND it does not ask the model to return `npcUpdates`, state diffs, events, or machine-readable mutation proposals

#### Scenario R2-S2: Non-empty prose succeeds

- WHEN the provider returns non-empty plain text in transcript mode
- THEN the backend treats the trimmed text as the Game Master narration
- AND the turn can succeed without JSON parsing

#### Scenario R2-S3: Empty prose fails cleanly

- WHEN the provider returns an empty response in transcript mode
- THEN the turn is marked failed
- AND no fake narration or state change is stored

#### Scenario R2-S4: Transcript context excludes runtime world state

- WHEN the application runs in transcript mode
- AND the player submits a narrative turn
- THEN the backend builds the plain-prose Game Master request from the canonical opening seed, bounded transcript, prompt guidance, and current player input
- AND it does not include current room state, present actor rows, visible exits, object state, mutable NPC facts, hidden NPC knowledge, or scene-beat classification

### Requirement R3: Transcript And Debug Persistence Without World Mutation

The system SHALL persist inspectable transcript/debug records for transcript turns while leaving canonical world state unchanged.

#### Scenario R3-S1: Transcript turn resumes after reload

- WHEN a transcript turn succeeds and the app reloads
- THEN the feed shows the player's input and the Game Master narration
- AND the turn/debug records remain inspectable after reload

#### Scenario R3-S2: Game Master debug identifies mode and output contract

- WHEN a transcript Game Master call is persisted or locally logged
- THEN the debug metadata includes `directorMode: "transcript"` and `outputContract: "plain_prose"`
- AND accepted and ignored update lists are empty

#### Scenario R3-S3: Raw artifacts remain gated

- WHEN transcript mode records local logs or persisted Game Master calls
- THEN exact raw provider request and response text follows the existing raw debug flag behavior
- AND API keys, secrets, and full environment dumps remain excluded

### Requirement R4: Canonical State Mutation Disabled

The system SHALL prevent transcript Game Master responses from changing canonical world state.

#### Scenario R4-S1: NPC facts do not change

- WHEN a transcript turn succeeds
- THEN current NPC facts such as Mira's `mood`, `status`, and `memory` remain unchanged
- AND no `npcUpdates` from the model are parsed, accepted, or ignored

#### Scenario R4-S2: No LLM state diffs or world events

- WHEN a transcript turn succeeds
- THEN no LLM-authored state diffs are recorded
- AND no LLM-authored world event such as "Mira's state changed after the exchange" is recorded

#### Scenario R4-S3: Runtime world state is not prompt context

- WHEN a transcript request is built
- THEN canonical runtime state such as current room, visible facts, hidden NPC knowledge, and actor locations is not included as read-only context
- AND story continuity comes from the seed plus transcript instead

### Requirement R5: Mode Comparison Remains Testable

The system SHALL make persistent and transcript behavior easy to compare during local playtesting.

#### Scenario R5-S1: Same input can be tested in either mode

- WHEN the same seeded world and player input are used after starting the application server in persistent mode and transcript mode
- THEN both modes can produce a player-facing narration
- AND only persistent mode may produce validated world/NPC mutations

#### Scenario R5-S2: Smoke playtest can prove no-mutation behavior

- WHEN a local transcript smoke playtest sends a direct Mira question
- THEN the response includes non-empty narration
- AND Convex snapshot/debug evidence shows the command, turn, narration, and Game Master call without new NPC fact changes, state diffs, or LLM world events

#### Scenario R5-S3: Fresh demo world per seed

- WHEN the demo world is seeded during the current MVP
- THEN prior Stormbound Chapel demo worlds and dependent rows are deleted
- AND the new world uses the current server boot's demo slug
- AND playtesting starts from the initial seed instead of resuming older world state

### Implemented By

- `src/lib/director/mode.ts` reads `LORECRAFT_DIRECTOR_MODE`, defaults to persistent mode, and rejects unknown values before turn persistence.
- `src/lib/director/prompt.ts` builds separate persistent and transcript plain-prose Game Master requests; transcript requests use seed plus transcript rather than live world state.
- `src/lib/director/provider.ts` omits OpenAI-compatible `response_format` when the effective generation settings request plain text.
- `src/lib/director/output.ts` parses transcript plain prose as narration with no NPC updates.
- `src/app/api/director/turn/route.ts` branches backend Game Master orchestration by startup mode, loads transcript context for transcript mode, and sends transcript completions through a no-mutation path.
- `convex/world.ts` seeds fresh boot-scoped demo worlds, stores successful transcript narrations and Game Master calls, and skips NPC fact writes, LLM events, and state diffs.
- `src/app/world-client.tsx` shows the latest Game Master mode and output contract in the debug summary.
- `scripts/director-transcript-playtest.mjs` verifies the local transcript no-mutation smoke path.

### Verified By

- `npm run test` passed, including mode defaulting/validation, transcript prose prompt shape, plain-prose output parsing, and provider request body behavior.
- Focused Game Master tests cover transcript prompt shape, seed/transcript-only context, mode aliasing, plain-prose parsing, and persistent-mode scene-beat behavior.
- `npm run typecheck` passed after adding the Game Master mode and output-contract type split.
- `npm run ci:required` passed after implementation and documentation updates.
- `npx convex codegen` passed after adding the no-mutation completion argument.
- `LORECRAFT_DIRECTOR_MODE=transcript npm run dev:debug` plus `npm run playtest:director:transcript` passed against local Convex/Next/Ollama, producing non-empty prose while preserving baseline Mira facts and creating no LLM state diffs or LLM world events.
- After final review found and fixed contradictory nested prompt guidance, `npm run test`, `npm run typecheck`, `npm run ci:required`, and `npm run playtest:director:transcript` passed again.
- `npm run dev:debug` plus `npm run playtest:director` passed in default persistent mode before the later plain-prose split; current persistent story generation now shares the plain-prose contract while structured JSON parsing remains available for future extraction.
- After changing transcript mode to seed-plus-transcript context, `npm run ci:required` and `npm run playtest:director:transcript` passed; latest log inspection confirmed the raw prompt includes `worldSeed` and `transcript` while omitting `sceneState`, `visibleFacts`, `hiddenNpcKnowledge`, and `requiredSceneBeat`.
- Fresh demo seeding verified through `npx convex codegen`, `npm run ci:required`, `npm run playtest:director:transcript`, and latest log inspection showing a new transcript turn with seed/transcript prompt components and zero accepted/ignored updates.

### Verification Gaps

- Taylor manual browser confirmation remains pending.

## Story LC-001-S9: Read-Only NPC Context

As a developer-playtester, I want NPCs to exist as readable authored objects in Game Master context, so that NPC-focused narration is grounded in world state before Lorecraft reintroduces intelligent state mutation.

### Requirement R1: NPC Profiles In Game Master Context

The system SHALL include current-scene NPC profiles in persistent Game Master requests as readable context.

#### Scenario R1-S1: NPC description grounds a look action

- WHEN the player submits input like `I look at Mira`
- THEN the persistent Game Master request includes Mira's stable NPC profile
- AND the Game Master can base the response on Mira's authored description and readable attributes instead of inventing her from transcript history alone

#### Scenario R1-S2: NPC context is structured separately from transcript

- WHEN the backend builds persistent Game Master context
- THEN NPC profile data is represented as structured context owned by Convex state and debug overrides
- AND recent feed transcript remains separate supporting history

### Requirement R2: Read-Only NPC Mutation Boundary

The system SHALL prevent Game Master output from mutating NPC state in this change.

#### Scenario R2-S1: Game Master returns an NPC update

- WHEN the Game Master response includes a proposed NPC update
- THEN the backend does not persist the NPC update
- AND no NPC fact state diff or LLM-authored NPC state event is recorded for that update

#### Scenario R2-S2: Existing NPC values remain unchanged after narration

- WHEN a successful persistent Game Master turn narrates an NPC-focused interaction
- THEN persisted actor rows and actor-scoped facts remain unchanged unless a non-Game Master manual/debug path changes them

### Requirement R3: Debug NPC Inspection And Overrides

The system SHALL provide a debug-panel `NPCs` tab for inspecting NPC values and applying temporary test overrides.

#### Scenario R3-S1: Debug panel shows NPC fields

- WHEN a world is seeded and the debug panel is open
- THEN the `NPCs` tab lists current NPCs with their key, name, description, and readable attributes

#### Scenario R3-S2: Debug override affects Game Master context

- WHEN Taylor overrides an NPC value in the debug `NPCs` tab
- THEN the next persistent Game Master request uses the overridden value as read-only context
- AND the debug UI makes the override visible as a temporary override

#### Scenario R3-S3: Debug override is non-durable

- WHEN the application server restarts
- THEN prior NPC debug overrides are gone
- AND Convex canonical actor rows and facts still contain their seeded or persisted values

### Implemented By

- `src/lib/director/npc-profiles.ts` derives read-only NPC profiles from current-scene actors and actor facts, and merges server-local debug overrides into prompt context.
- `src/lib/director/npc-debug-overrides.ts` stores temporary NPC debug overrides in process memory keyed by world and NPC key.
- `convex/world.ts` seeds Mira with a stable visible description plus `background`, `persona`, `voice`, `mood`, `status`, `memory`, and private `knowledge` facts.
- `src/lib/director/prompt.ts` renders `npcProfiles` into canonical `npcCards`, includes `conversationFocus`, `lastAction`, and `sceneDirective` as persistent-mode prompt components; records `npcProfileKeys`, `npcOverrideKeys`, and `npcMutationMode: "read_only"` in request summaries; and keeps read-only NPC cards/profiles higher priority than recent feed prose.
- `src/app/api/director/turn/route.ts` applies server-local NPC debug overrides to persistent Game Master context and leaves transcript mode unchanged.
- `src/app/api/debug/npc-overrides/route.ts` exposes local debug-only GET, POST, and DELETE endpoints for temporary NPC overrides.
- `src/app/world-client.tsx` adds a debug `NPCs` tab for inspecting current NPC fields and applying/clearing temporary overrides.
- `src/lib/director/director.test.ts` covers persistent NPC profile prompt context, prompt priority/scene directive context, direct-NPC question targeting, debug override store/route plumbing, route-saved override injection into the next Game Master request, transcript exclusion, and the no-mutation boundary.

### Verified By

- `npm run test -- src/lib/director/director.test.ts` passed, including persistent NPC profile prompt context, prompt priority/scene directive context, direct-NPC question targeting, debug override store/route plumbing, route-saved override injection into the next Game Master request, transcript-mode exclusion, and read-only NPC update suppression.
- `npm run test -- src/lib/director/director.test.ts` passed after refining the seeded NPC profile fields, including hidden `knowledge` context, scene directive `mustUse`, and read-only update rejection.
- `npm run test -- src/lib/director/director.test.ts` passed after rendering NPC profiles as NPC Cards, including derived Garth follow-up targeting from recent addressed NPC context.
- `npm run typecheck` passed after adding NPC profile and debug override types.
- `npm run lint` passed after fixing the debug override fetch effect.
- `npm run ci:required` passed, covering lint, full Vitest suite, typecheck, and Next build.

### Verification Gaps

- Taylor manual browser confirmation remains pending.
- Local LLM playtest of `Look at Mira` with raw request inspection remains pending.
