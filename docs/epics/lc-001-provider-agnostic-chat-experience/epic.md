---
id: LC-001
status: draft
created: 2026-07-01
modified: 2026-07-01
last_verified:
stories:
  - LC-001-S1
  - LC-001-S2
  - LC-001-S3
  - LC-001-S4
  - LC-001-S5
  - LC-001-S6
  - LC-001-S7
  - LC-001-S8
  - LC-001-S12
  - LC-001-S9
  - LC-001-S10
  - LC-001-S11
---

# LC-001 Provider-Agnostic Chat Experience

## Product Context


## Outcome

Lorecraft needs a first playable AI Game Master loop where the player can interact narratively with a persistent scene, resume the visible transcript, and watch at least one NPC carry structured memory across turns, while the product remains free to change LLM providers and while Convex remains the source of truth.

## Current Scope


## Deferred Scope

This Epic keeps the MVP to one editable persistent world. The later target model is independent story/play-session instances generated from a world or template, so each story can mutate separately from canonical authored world data.

## Candidate Stories

| Candidate | Status | Story Shape | Acceptance Signals |
|---|---|---|---|

## Story Index

| Story | Status | Capability | Last Verified | Notes |
|---|---|---|---|---|
| LC-001-S1 |  | Narrative Play Feed And Unified Input |  |  |
| LC-001-S2 |  | Provider-Agnostic Backend Game Master Boundary |  |  |
| LC-001-S3 |  | Persistent Current-Scene NPC State |  |  |
| LC-001-S4 |  | Debuggable Game Master Calls And Reset |  |  |
| LC-001-S5 |  | Story Stream Reading Experience |  |  |
| LC-001-S6 |  | Scoped Narrative Turns |  |  |
| LC-001-S7 |  | Active Game Master Guidance And Context Assembly |  |  |
| LC-001-S8 |  | Transcript Game Master Mode |  |  |
| LC-001-S12 |  | Lightweight Location Cards And Movement |  |  |
| LC-001-S9 |  | Read-Only NPC Context |  |  |
| LC-001-S10 |  | Extracted NPC State Mutation |  |  |
| LC-001-S11 |  | End To End Playtest Verification |  |  |

## Stories

### Story LC-001-S1: Narrative Play Feed And Unified Input

As a playtester, I want one narrative input and a resumable story feed, so that the MVP feels like interacting with a living scene instead of operating a command parser.

#### Requirements And Scenarios

##### Requirement R1: Unified Narrative Input

The system SHALL let the player submit narrative text through one input box.

###### Scenario R1-S1: Player submits narrative intent

- WHEN a seeded world exists
- AND the player submits text such as "I ask Mira what she knows about the storm"
- THEN the backend treats the text as narrative Game Master input
- AND the UI does not require the player to choose between command mode and chat mode

###### Scenario R1-S2: Clear narrative movement can mutate actor location

- WHEN the player submits text such as "I leave the chapel and walk toward the graveyard"
- AND the Game Master narration resolves the player as reaching an existing canonical location
- THEN the post-narration state extractor may propose actor movement
- AND Convex accepts the movement only after validating the actor, current scene, destination, and turn boundary

##### Requirement R2: Resumable Feed

The system SHALL reconstruct the player-facing feed from persisted commands, narrations, and events.

###### Scenario R2-S1: Feed survives reload

- WHEN the player submits narrative turns and reloads the app
- THEN the feed shows prior player inputs, Game Master narrations, and world events
- AND entries are ordered by creation time and grouped by command when useful

###### Scenario R2-S2: Feed distinguishes entry types

- WHEN the feed displays persisted entries
- THEN player input, Game Master narration, and world events are lightly distinguished
- AND all events are shown in the MVP feed until event noise creates a filtering need

##### Requirement R3: Pending And Failed Turns

The system SHALL make synchronous Game Master turn progress and failure visible to the playtester.

###### Scenario R3-S1: Request pending

- WHEN the player submits a narrative turn
- THEN the input prevents duplicate submission for that turn
- AND the interface shows that the Game Master response is pending

###### Scenario R3-S2: Missing world state

- WHEN no world is seeded or the selected world cannot be loaded
- THEN the system does not call the LLM
- AND the player sees an actionable message to seed or reload the world

#### Implemented By

- `src/app/world-client.tsx` renders the narrative-only split layout, one unified textarea, pending/error states, persisted feed entries, and debug panel.
- `src/app/api/director/turn/route.ts` receives narrative input from the client and routes it through the backend Game Master workflow.
- `convex/world.ts` records player inputs, reconstructs the feed from `commands`, `narrations`, and `events`, and accepts actor-location movement only through bounded post-narration extraction validation.

#### Verified By

- R1-S1 and R1-S2: `npm run e2e` proves the browser accepts one narrative input, submits it through the Game Master route, and does not require a separate command/chat mode choice.
- R2-S1 and R2-S2: `npm run e2e` proves persisted player input, Game Master narration, turn evidence, and reset behavior survive reload and remain distinguishable in the story/debug surfaces.
- R2-S1 and R2-S2: `CONVEX_AGENT_MODE=anonymous npx convex run world:getSnapshot` showed persisted player input, Game Master narration, and event feed entries ordered from durable rows.
- R3-S1: `npm run e2e` and browser verification prove pending state disables duplicate submission for the in-flight turn while keeping progress visible.
- R3-S2: Seed/no-world browser flow in `npm run e2e` proves the app exposes a seed action before attempting play when no usable playtest state exists.
- Supporting gates: `npm run ci:required`, `npm run convex:once`, runtime HTML smoke, and runtime local-Ollama POST passed for the broader app surface.

#### Verification Gaps

- No unresolved implementation gap for this Story.
- No unresolved browser automation gap for the current MVP play-feed path.


#### Story Notes

- None.
### Story LC-001-S2: Provider-Agnostic Backend Game Master Boundary

As a developer, I want Lorecraft to call LLMs through backend application logic and a provider adapter, so that the UI can change later and local model playtesting does not lock the app to one provider.

#### Requirements And Scenarios

##### Requirement R1: Next Route Handler Game Master Workflow

The system SHALL keep Game Master orchestration and provider calls out of React components and place the first POC orchestration boundary in a Next.js Route Handler.

###### Scenario R1-S1: UI submits intent

- WHEN the player submits a narrative turn
- THEN the client calls the Game Master Route Handler with the input and selected world
- AND React does not import provider SDKs, provider request types, secrets, or durable game rules

###### Scenario R1-S2: Backend coordinates the turn

- WHEN the Route Handler receives player input
- THEN it uses backend application/domain modules to prepare context, invoke the provider adapter, parse and validate structured output, and coordinate persistence through Convex functions
- AND Convex remains the only persistence path for commands, narrations, facts, state diffs, events, and Game Master debug records

###### Scenario R1-S3: Orchestration can move later

- WHEN the POC outgrows the Next.js Route Handler boundary
- THEN the reusable application/domain modules can move behind Convex actions or another backend service
- AND React-facing behavior does not need to own Game Master rules

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
- AND a Game Master turn returns a setup-oriented failure without mutating persisted state

##### Requirement R3: Stateless Provider Requests With Bounded Context

The system SHALL avoid provider-managed chat sessions while still sending enough bounded context for coherent responses.

###### Scenario R3-S1: Game Master request is built

- WHEN the backend builds a Game Master request
- THEN it includes the current player message, current structured scene/NPC state, and a small recent feed window
- AND it does not send secrets, raw database dumps, or unrelated debug state

###### Scenario R3-S2: Multiple narrative turns

- WHEN the player sends multiple turns
- THEN each provider request is independently constructed from current persisted state and recent feed context
- AND the system does not depend on a provider conversation ID, assistant thread, or hidden remote memory

#### Implemented By

- `src/app/api/director/turn/route.ts` is the synchronous Next.js Route Handler orchestration boundary.
- `src/lib/director/prompt.ts` builds stateless bounded Game Master requests from current scene/NPC/feed context.
- `src/lib/director/provider.ts` reads `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` and calls OpenAI-compatible chat completions through `fetch`.
- `src/lib/director/output.ts` parses plain prose for current story generation and retains strict JSON NPC-update parsing/validation for structured extraction.
- `convex/world.ts` remains the only persistence path for commands, narrations, facts, state diffs, events, and Game Master call records.

#### Verified By

- R1-S1 and R1-S2: `npm run e2e` exercises the browser-to-route turn submission path through the real backend route and fixture OpenAI-compatible provider without React importing provider SDKs or secrets.
- R1-S2 and R3-S1/R3-S2: `npm run test -- src/lib/director/director.test.ts src/app/api/director/turn/route.test.ts` covers bounded request construction, missing config handling, OpenAI-compatible response extraction, and no-mutation setup failure behavior.
- R1-S4: `src/app/api/director/turn/route.test.ts` proves malformed `worldId` returns a structured `400` before LLM config is required and without recording player input.
- R2-S1 and R2-S2: Runtime POST to `/api/director/turn` with `LLM_BASE_URL=http://localhost:11434/v1`, `LLM_API_KEY=ollama`, and `LLM_MODEL=llama3.1:8b` succeeded, proving the provider adapter contract against local Ollama.
- R3-S1 and R3-S2: Game Master request construction tests prove each provider request is built from current persisted state and recent bounded feed context rather than provider-managed remote session state.
- Supporting gates: `npm run ci:required` and `npm run convex:once` passed for the broader app surface.

#### Verification Gaps

- No unresolved implementation gap for this Story.
- Provider coverage is OpenAI-compatible by contract and tested with Ollama/local fetch stubs; provider-specific quirks for LM Studio, OpenRouter, and Vercel AI Gateway remain future playtest coverage.


#### Story Notes

- None.
### Story LC-001-S3: Persistent Current-Scene NPC State

As a playtester, I want an NPC in the scene to remember meaningful interaction state, so that Lorecraft can prove structured persistence without modeling the full world yet.

#### Requirements And Scenarios

##### Requirement R1: Seed NPC State

The system SHALL seed current-scene NPCs with stable identity and a small mutable fact surface.

###### Scenario R1-S1: Chapel NPCs are seeded

- WHEN the Stormbound Chapel world is seeded
- THEN Mira and Brother Alden exist as NPC actors with stable `key`, `name`, and `description`
- AND each seeded NPC has baseline facts for `mood`, `status`, and `memory`
- AND NPC-profile facts may add stable `background`, `persona`, `voice`, and `knowledge` context without changing the bounded mutation allowlist

###### Scenario R1-S2: Seeded memory has useful baseline text

- WHEN a seeded NPC's baseline `memory` fact is created
- THEN it contains a short baseline such as "Mira has not yet formed meaningful memories of Taylor."
- AND it does not start as an empty string

##### Requirement R2: Game Master Story Output

The system SHALL allow the Game Master to return player-facing narration without embedding creative prose inside structured JSON.

###### Scenario R2-S1: Valid Game Master output

- WHEN the provider returns non-empty story prose
- THEN the backend normalizes it into a non-empty `narration` string
- AND `npcUpdates` is empty for the current read-only story generation step

###### Scenario R2-S2: Empty output

- WHEN the provider returns empty or unusable prose
- THEN the turn fails cleanly
- AND the system does not persist fake narration or NPC state changes from the malformed output

##### Requirement R3: Bounded NPC Updates

The system SHALL accept only bounded updates for NPCs currently in the scene.

###### Scenario R3-S1: Mira is affected by the turn

- WHEN the post-narration extractor returns an update for `actorKey: "mira"` with a reason and valid changes
- THEN the backend maps the key to the current-scene NPC actor
- AND it persists accepted `mood`, `status`, and `memory` changes as facts

###### Scenario R3-S2: NPC is not affected

- WHEN Mira is not meaningfully affected by the player's turn
- THEN the post-narration extractor returns no update for Mira
- AND existing facts remain unchanged

###### Scenario R3-S3: Offscreen or unknown NPC update

- WHEN the post-narration extractor returns an update for an actor key that is unknown or not in the current scene
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
- THEN the Game Master should narrate the immediate result in the visible feed
- AND it should not immediately rewrite Mira's `status` fact unless the condition remains stable and important after the moment has resolved

###### Scenario R4-S3: Durable interaction memory

- WHEN the player interaction meaningfully changes what Mira should remember later
- THEN the post-narration extractor may propose a rewrite to Mira's `memory` as a compact rolling summary capped at 500 characters
- AND the rewrite may preserve important older information, add new important information, and drop stale or low-importance details

##### Requirement R5: Hidden State, Visible Behavior

The system SHALL use NPC facts as hidden Game Master guidance rather than player-visible metadata.

###### Scenario R5-S1: Narration uses mood naturally

- WHEN Mira's `mood` is included in Game Master context
- THEN the narration may describe observable behavior influenced by that mood
- AND it does not mechanically expose hidden fields such as "Mira's mood is wary"

###### Scenario R5-S2: Debug mode shows hidden state

- WHEN the debug panel is visible
- THEN it shows Mira's hidden facts plainly for developer/playtest inspection

#### Implemented By

- `convex/schema.ts` adds actor keys and the `directorCalls` table while continuing to store NPC state in `facts`.
- `convex/world.ts` seeds Taylor and Mira with stable actor keys and initializes Mira's `mood`, `status`, and `memory` facts.
- `src/lib/director/output.ts` retains structured NPC-update parsing/validation for extractor-style mutation, ignores unknown/offscreen NPC updates, partially accepts valid fields, and caps `memory` at 500 characters.
- `src/lib/director/prompt.ts` sends current-scene NPC facts as hidden Game Master guidance.
- `src/app/world-client.tsx` shows hidden NPC facts only in the debug panel.

#### Verified By

- R1-S1 and R1-S2: Seeded-world E2E/debug assertions and Convex snapshot checks prove Mira and Brother Alden exist with stable actor keys plus baseline `mood`, `status`, and `memory` facts.
- R2-S1 and R2-S2: `npm run test -- src/lib/director/director.test.ts src/app/api/director/turn/route.test.ts` proves non-empty plain-prose story output succeeds and empty/unusable output fails without fake narration or NPC state changes.
- R3-S1 through R3-S3: Focused director tests prove bounded NPC update validation, partial valid-field acceptance, unknown/offscreen actor rejection, and ignored update evidence.
- R4-S1 through R4-S3: Focused director tests prove ephemeral/no-update cases can leave facts unchanged, `memory` remains capped at 500 characters, and accepted durable updates persist through the extractor path.
- R5-S1 and R5-S2: Prompt/debug tests and E2E debug-panel assertions prove hidden facts are supplied as Game Master guidance and shown plainly only in debug surfaces.
- Supporting gates: `npm run ci:required`, `npm run convex:once`, and runtime local-Ollama playtests passed for the broader app surface.

#### Verification Gaps

- No unresolved implementation gap for this Story.
- Prompt tuning for unnecessary NPC fact churn remains an empirical playtesting concern, but validation bounds and tests are in place.


#### Story Notes

- None.
### Story LC-001-S4: Debuggable Game Master Calls And Reset

As a developer-playtester, I want to inspect Game Master calls and reset the spike world, so that early LLM behavior can be tuned without losing evidence or hand-editing every playtest cleanup.

#### Requirements And Scenarios

##### Requirement R1: Game Master Call Audit

The system SHALL persist a debug record for each Game Master call.

###### Scenario R1-S1: Successful Game Master call

- WHEN a Game Master call succeeds
- THEN the system stores provider/model metadata, compact request summary, raw response, parsed response, success status, accepted updates, and ignored updates
- AND the debug panel can display those details

###### Scenario R1-S2: Provider or validation failure

- WHEN a provider error, invalid JSON response, or validation failure occurs
- THEN the system stores the raw response or error where available
- AND the debug panel can display enough information to diagnose the failed turn after reload

##### Requirement R2: Local Debug Log

The system SHALL optionally write local-only structured debug logs for Game Master troubleshooting.

###### Scenario R2-S1: Local debug logging enabled

- WHEN `LORECRAFT_DEBUG_LOG=1` is set during local development
- THEN the backend appends newline-delimited JSON records under a gitignored local log path
- AND each recorded Game Master turn attempt writes one `director.turn.unit` record with timestamp, event name, route stage, turn ID, command ID, player input, provider host, model, request summary, outcome, errors, parsed output when available, accepted/ignored updates, response length metadata, and timing data without API keys or full environment dumps
- AND pre-turn failures may still write `director.turn.rejected` records because no concrete turn exists yet

###### Scenario R2-S2: Raw LLM logging gated

- WHEN `LORECRAFT_DEBUG_LOG_RAW_LLM=1` is not set
- THEN local log records do not include full raw LLM response text
- AND raw response content can still be inspected from the persisted `directorCalls` debug table when appropriate
- AND raw provider request text is also gated separately behind `LORECRAFT_DEBUG_LOG_RAW_REQUEST=1`

##### Requirement R3: Accepted And Ignored Update Visibility

The system SHALL persist accepted NPC fact changes and make ignored update reasons inspectable.

###### Scenario R3-S1: Valid and invalid fields mixed

- WHEN a Game Master update contains both valid and invalid fields
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

#### Implemented By

- `convex/schema.ts` defines `directorCalls` for provider/model metadata, compact request summaries, raw/parsed responses, status, accepted updates, ignored updates, and errors.
- `convex/world.ts` persists Game Master call audit records, accepted NPC fact diffs, generic world events, and rough reset behavior.
- `src/lib/director/debug-log.ts` writes opt-in gitignored JSONL debug records for local troubleshooting and gates raw LLM text behind `LORECRAFT_DEBUG_LOG_RAW_LLM` and raw provider request text behind `LORECRAFT_DEBUG_LOG_RAW_REQUEST`.
- `src/app/api/director/turn/route.ts` records pre-turn rejection logs and one local `director.turn.unit` log entry for each recorded provider-error, invalid-output, or successful Game Master turn when `LORECRAFT_DEBUG_LOG=1` is enabled.
- `src/app/world-client.tsx` renders hidden facts, events, narrations, state diffs, and Game Master calls in the debug panel and exposes rough reset.
- `.gitignore`, `package.json`, and `README.md` document and support the local-only debug log path.

#### Verified By

- R1-S1 and R3-S1/R3-S2: `npm run test -- src/lib/director/director.test.ts src/app/api/director/turn/route.test.ts` covers successful and failed Game Master/debug call persistence, accepted/ignored update metadata, and extractor debug records.
- R1-S2: `src/app/api/director/turn/route.test.ts` proves provider errors and invalid extractor output are recorded as debug-visible extractor failures without faking state; `npm run e2e` proves failed-turn debug evidence remains visible after browser reload.
- R2-S1 and R2-S2: Local debug log unit tests prove JSONL writes are opt-in, raw LLM response text is omitted unless explicitly enabled, and raw request text is gated separately.
- R4-S1 and R4-S2: `npm run e2e` exercises Reset Session through the browser and proves the story surface returns to the empty seeded state while canonical debug state is restored.
- Supporting gates: `npm run ci:required` passed for lint, unit tests, typecheck, and production build.

#### Verification Gaps

- No unresolved implementation gap for this Story.
- Rough reset intentionally remains a temporary single-world playtest tool until story/play-session instances exist.


#### Story Notes

- None.
### Story LC-001-S5: Story Stream Reading Experience

As a playtester, I want the play surface to read like an unfolding story and stay anchored near the newest turn, so that long sessions feel like interactive fiction instead of a chat log I have to manage.

#### Requirements And Scenarios

##### Requirement R1: Story-First Feed Presentation

The system SHALL present the main feed as a prose-oriented story stream instead of a chat-bubble transcript.

###### Scenario R1-S1: Game Master narration is primary prose

- WHEN the feed contains Game Master narration
- THEN the narration appears as the dominant story text in the main stream
- AND it is not styled as a chat bubble competing with player input

###### Scenario R1-S2: Player input reads as an authored action

- WHEN the feed contains player input
- THEN the player input is visually distinct from Game Master narration
- AND it reads as an action or authored turn within the story flow rather than as a support-chat message

###### Scenario R1-S3: World events do not interrupt the story

- WHEN world events appear in the feed
- THEN they are visually quieter than narration and player input
- AND the debug panel remains the place for full event/state inspection

##### Requirement R2: Bottom-Anchored Continuation

The system SHALL keep the latest story turn and continuation input easy to reach as the session grows.

###### Scenario R2-S1: New turn appears near the continuation point

- WHEN a player submits a turn and the Game Master response is persisted
- THEN the story stream settles near the newest feed content
- AND the player does not need to manually scroll down to find the continuation point

###### Scenario R2-S2: Reload resumes near latest content

- WHEN a playtester reloads a world with an existing long feed
- THEN the story surface opens near the latest story content
- AND the input remains available for continuing the session

###### Scenario R2-S3: Debug sidebar is taller than the story column

- WHEN the debug sidebar contains more content than the visible story stream
- THEN the story input is not stranded at the viewport bottom away from the feed
- AND the main story stream remains independently usable from the debug panel

##### Requirement R3: Empty, Pending, And Error States Fit The Story Surface

The system SHALL keep empty, pending, and error states understandable without reverting the main experience to a chat-debug layout.

###### Scenario R3-S1: Empty story

- WHEN the seeded world has no feed entries
- THEN the main surface presents an empty story state that invites narrative input
- AND it does not show placeholder chat bubbles

###### Scenario R3-S2: Game Master response pending

- WHEN the player submits a turn and waits for the Game Master
- THEN the UI shows pending state near the continuation input
- AND duplicate submission remains disabled for that turn

###### Scenario R3-S3: Game Master response fails

- WHEN the Game Master turn fails
- THEN the error is shown near the continuation input
- AND the existing story stream remains readable and unchanged

#### Implemented By

- `src/app/world-client.tsx` renders persisted feed rows as a prose-first story stream, with Game Master narration as normalized app-font prose, player turns as authored action text, and world events as quiet inline notices.
- `src/app/world-client.tsx` keeps the play surface in a constrained first-viewport layout where the story stream scrolls independently and the continuation input stays visible across desktop and narrow viewports.
- `src/app/world-client.tsx` scrolls the story pane to the bottom when feed length, pending state, or error state changes, while preserving the existing unified narrative input and Enter-to-send behavior.

#### Verified By

- R1-S1 through R1-S3: Browser verification and `npm run e2e` prove Game Master narration renders as primary prose, player input renders as authored action text, and world/debug events remain visually quieter than story text.
- R2-S1 through R2-S3: Browser verification plus `npm run e2e` prove the story pane uses independent overflow, settles near the newest content, stays usable when the debug drawer is taller, and remains near the bottom after deterministic long-feed interactions.
- R3-S1: `npm run e2e` proves Reset Session returns the story stream to the empty story state.
- R3-S2: Browser verification with a page-local `fetch` stub proves Enter submits the textarea, the textarea clears while pending, duplicate submission is rejected during the in-flight turn, and pending feedback appears without a submit button.
- R3-S3: Browser verification with a page-local error `fetch` stub and `npm run e2e` provider-failure coverage prove errors appear near the continuation input while the existing story remains readable.
- Supporting gates: `npm run ci:required` passed for lint, unit tests, typecheck, and production build.

#### Verification Gaps

- No unresolved implementation gap for this Story.
- Taylor manual browser confirmation of the final polished visual design remains useful but is not blocking deterministic E2E coverage.


#### Story Notes

- None.
### Story LC-001-S6: Scoped Narrative Turns

As a developer-playtester, I want each narrative exchange to be stored as a scoped turn, so that story history, debug records, and future rollback boundaries have one durable unit of progression.

#### Requirements And Scenarios

##### Requirement R1: Turn Lifecycle

The system SHALL create a durable turn for each persisted narrative player intent.

###### Scenario R1-S1: Successful narrative turn

- WHEN the player submits valid narrative input for a seeded world
- THEN the backend creates a turn with a world-scoped sequence number
- AND the turn links the player input, Game Master call, narration, accepted state diffs, and events caused by that input
- AND the turn ends with a succeeded status after persistence completes

###### Scenario R1-S2: Provider or output failure after turn creation

- WHEN a turn is created and the provider call fails or returns invalid output
- THEN the turn remains persisted with a failed status
- AND the related command and Game Master call remain linked to the turn for debug inspection
- AND no fake narration or unaccepted state change is stored

###### Scenario R1-S3: Request rejected before persistence

- WHEN a request is malformed, missing required configuration, or references an invalid world before game persistence starts
- THEN no turn is created
- AND the route returns the existing structured setup or validation error

##### Requirement R2: Turn-Scoped Feed And Debug Records

The system SHALL expose turn scope in persisted history without making the player-facing story stream more complicated.

###### Scenario R2-S1: Feed entries carry turn scope

- WHEN the UI loads a persisted story feed
- THEN entries caused by a player input include the same `turnId`
- AND the visible story stream remains ordered by persisted creation time or turn sequence

###### Scenario R2-S2: Debug panel can inspect turn grouping

- WHEN a playtester opens the debug panel
- THEN recent turns show sequence, status, player input, related narration/event/diff counts, and related Game Master call status
- AND failed turns can be distinguished from successful turns after reload

###### Scenario R2-S3: Seed rows remain outside player turns

- WHEN the world is seeded
- THEN seed narration and seed events may remain unscoped
- AND narrative turns still begin with the first persisted player intent

##### Requirement R3: Reset And Future Rollback Boundary

The system SHALL keep turn persistence compatible with rough reset now and snapshot/rollback later.

###### Scenario R3-S1: Rough reset clears turn history

- WHEN the existing rough reset is invoked
- THEN persisted turns and turn-linked history for the playtest world are cleared with commands, narrations, events, state diffs, and Game Master calls
- AND seeded world graph rows and baseline facts are restored as they are today

###### Scenario R3-S2: State diffs remain tied to one turn

- WHEN accepted mutations are recorded
- THEN each state diff belongs to the turn that accepted those mutations
- AND the diff remains an audit record rather than a rollback implementation by itself

###### Scenario R3-S3: Snapshot rollback remains deferred

- WHEN the data model is documented
- THEN it states that future rollback should attach snapshots to turn boundaries
- AND this change does not add snapshot capture, reverse-diff logic, branching, or restore behavior

#### Implemented By

- `convex/schema.ts` defines `turns` plus optional `turnId` links on commands, narrations, events, state diffs, and Game Master calls.
- `convex/world.ts` creates pending turns with world-scoped sequence numbers, completes turns as succeeded or failed, links turn-scoped rows, exposes recent turn summaries in `getSnapshot`, includes `turnId` on derived feed entries, and clears turns during rough reset.
- `src/app/api/director/turn/route.ts` passes `turnId` through successful, provider-error, and invalid-output Game Master completion paths while leaving pre-persistence request/config/world-load failures unpersisted.
- `src/lib/director/debug-log.ts` includes optional `turnId` in local JSONL debug records.
- `src/app/world-client.tsx` shows recent turn sequence/status/count summaries and raw turn summaries in the debug panel, and renders a subtle story-stream turn-number gutter for feed entries linked to a turn.
- `docs/data-model.md` and `docs/persistence-system.md` document scoped turns and defer snapshot rollback.

#### Verified By

- R1-S1: `npm run e2e` proves a successful narrative turn creates visible turn-number evidence and persists player input plus Game Master narration.
- R1-S2: `src/app/api/director/turn/route.test.ts` and `npm run e2e` prove provider-failed turns remain persisted as failed/debuggable without fake narration or accepted state changes.
- R1-S3: Route tests prove pre-persistence malformed or missing-configuration failures do not record player input.
- R2-S1 and R2-S2: `npm run e2e` proves reload preserves turn-scoped feed/debug evidence, including failed-turn status after reload.
- R2-S3: Seed/reset flows leave seed rows outside player turns while narrative turns begin with the first persisted player intent.
- R3-S1 through R3-S3: `npm run e2e`, focused director tests, `docs/data-model.md`, and `docs/persistence-system.md` prove rough reset clears turn history, accepted diffs remain turn-scoped audit records, and snapshot rollback remains deferred.
- Supporting gates: `npm run ci:required`, `npx convex codegen`, and the prior local PR gate passed for the broader app surface.

#### Verification Gaps

- The historical Convex one-shot gate could not run during implementation because an existing local Convex backend was already running on port 3210; `npx convex codegen` was used for Convex validation instead.
- No unresolved failed-turn browser gap remains for the deterministic fixture path; live-provider failed-turn behavior remains an empirical runtime concern.


#### Story Notes

- None.
### Story LC-001-S7: Active Game Master Guidance And Context Assembly

As a playtester, I want the Game Master to actively advance the current scene and let present NPCs respond meaningfully, so that Lorecraft feels like a story with persistent structure instead of a passive state logger.

#### Requirements And Scenarios

##### Requirement R1: Prompt Context Components

The system SHALL assemble Game Master prompts from explicit components with clear source ownership.

###### Scenario R1-S1: Prompt separates instructions from state and history

- WHEN the backend builds a Game Master request
- THEN the request distinguishes Game Master instructions, scene state, visible facts, hidden NPC knowledge, recent feed, current player input, and required scene beat
- AND the recent feed remains bounded and does not include internal turn or command IDs

###### Scenario R1-S2: Editable and derived components have clear ownership

- WHEN prompt components are documented or inspected in tests
- THEN Game Master instructions, author/tone guidance, and model settings are treated as editable configuration
- AND scene state, visible facts, hidden NPC knowledge, recent feed, and required scene beat are derived from Convex state, player input, and engine logic

##### Requirement R2: Read-Only Knowledge Context

The system SHALL include relevant read-only knowledge facts in Game Master context without expanding LLM mutation authority.

###### Scenario R2-S1: Seeded NPC knowledge reaches the Game Master

- WHEN Mira has a seeded read-only `knowledge` fact
- AND the player asks Mira what she knows about the storm
- THEN the Game Master request includes that knowledge as hidden context
- AND the model can use it to write player-facing narration or dialogue

###### Scenario R2-S2: Read-only facts are not mutable output fields

- WHEN the post-narration extractor proposes NPC updates
- THEN validation still accepts only the bounded mutable NPC fields currently allowed by the MVP
- AND read-only facts such as knowledge, secrets, occupation, or relationships are ignored if returned as attempted updates

##### Requirement R3: Required Scene Beat

The system SHALL derive a lightweight scene-beat instruction from player input and current scene context.

###### Scenario R3-S1: Direct NPC question expects response

- WHEN the player directly asks Mira a question
- THEN the Game Master request includes a required scene beat indicating Mira is directly addressed and a meaningful response is expected
- AND the response may be an answer, refusal, deflection, warning, lie, counter-question, or visibly intentional silence

###### Scenario R3-S2: Non-dialogue action does not force speech

- WHEN the player performs a non-dialogue action such as jumping, smiling, or inspecting an object
- THEN the required scene beat does not force an NPC line of dialogue
- AND the Game Master may still narrate relevant observable reactions when they make sense

##### Requirement R4: Active NPC Narrative Behavior

The system SHALL guide the Game Master to write active scene progression rather than passive acknowledgement.

###### Scenario R4-S1: NPC response advances the story

- WHEN the player directly engages a present NPC
- THEN the Game Master narration includes a concrete response or choice from that NPC
- AND it avoids merely repeating that the NPC is watchful, thoughtful, hesitant, or unchanged unless that silence is intentionally meaningful in the scene

###### Scenario R4-S2: Dialogue is allowed in narration

- WHEN the Game Master writes player-facing narration for an NPC response
- THEN it may include quoted or clearly attributed NPC speech inside the `narration` field
- AND no separate dialogue schema is required for this change

##### Requirement R5: Conservative Persistence Boundary

The system SHALL keep transient story beats out of durable NPC facts unless they should matter after recent context falls away.

###### Scenario R5-S1: Ephemeral reactions stay in narration

- WHEN Mira glances, flinches, smiles, pauses, or briefly reacts to a player action
- THEN the Game Master can narrate the beat as plain prose without requiring any post-narration extractor update
- AND existing NPC facts remain unchanged

###### Scenario R5-S2: Durable changes remain bounded

- WHEN an interaction meaningfully changes Mira's current attitude, ongoing circumstance, or rolling memory
- THEN the post-narration extractor may propose updates only for `mood`, `status`, or `memory`
- AND the backend validates, accepts, ignores, and records updates through the existing persistence boundary

##### Requirement R6: Dev-Configurable Generation Settings

The system SHALL let developers tune supported provider generation settings without code edits.

###### Scenario R6-S1: Optional settings configured

- WHEN optional LLM generation environment variables are configured
- THEN the provider adapter includes supported settings in the OpenAI-compatible request body
- AND unset settings fall back to safe defaults

###### Scenario R6-S2: Settings are visible in debug summaries

- WHEN a Game Master call is persisted or locally logged
- THEN debug metadata includes a compact summary of the effective generation settings
- AND secrets, API keys, and full environment dumps remain excluded

##### Requirement R7: Debug Prompt Guidance

The system SHALL let developer-playtesters adjust text-only Game Master guidance from the debug panel.

###### Scenario R7-S1: Prompt guidance sections affect the next turn

- WHEN a developer-playtester edits the style, NPC behavior, or persistence guidance fields
- AND submits a narrative turn
- THEN those text sections are included in the Game Master prompt context for that turn
- AND they do not change the required JSON output shape or backend validation authority

###### Scenario R7-S2: Prompt guidance is debug-visible

- WHEN a Game Master call is persisted
- THEN the request summary records which prompt guidance sections were included
- AND the debug panel can show those section keys with the latest Game Master summary

##### Requirement R8: Debug-Gated Raw Request Persistence

The system SHALL optionally persist the exact Game Master provider request for local troubleshooting.

###### Scenario R8-S1: Raw request stored only when explicitly enabled

- WHEN local raw request debug storage is enabled
- AND a Game Master call is attempted
- THEN the persisted Game Master call includes the exact provider messages sent to the OpenAI-compatible adapter
- AND the raw request can be inspected in the existing debug JSON

###### Scenario R8-S2: Raw request omitted by default

- WHEN local raw request debug storage is not enabled
- AND a Game Master call is persisted
- THEN the Game Master call stores compact request metadata but omits the full raw request messages
- AND hidden world facts, prompt guidance, and player text are not duplicated into raw request storage by default

##### Requirement R9: Turn-Centered Local Logs

The system SHALL make local Game Master logs inspectable by turn rather than by scattered post-turn route events.

###### Scenario R9-S1: Completed turn attempts write one unit record

- WHEN a player input has been recorded as a turn
- AND the Game Master attempt succeeds, fails at the provider, or returns invalid output
- THEN the local debug log writes one `director.turn.unit` record for that turn
- AND the record includes turn ID, command ID, player input, provider/model, request summary, status, error when present, parsed output when present, accepted/ignored updates, response length metadata, and timings

###### Scenario R9-S2: Raw turn artifacts remain gated

- WHEN the local turn-unit log records a provider request or response
- THEN the exact raw provider request is omitted unless `LORECRAFT_DEBUG_LOG_RAW_REQUEST=1` is set
- AND the exact raw LLM response is omitted unless `LORECRAFT_DEBUG_LOG_RAW_LLM=1` is set
- AND pre-turn validation/configuration failures may still write `director.turn.rejected` records because no concrete turn exists yet

#### Implemented By

- `src/lib/director/prompt.ts` builds explicit Game Master prompt components, derives required scene beats including `trivial_player_action`, separates mutable NPC facts from read-only hidden NPC knowledge, and records compact request-summary metadata.
- `src/lib/director/provider.ts` parses `LLM_TEMPERATURE`, `LLM_MAX_TOKENS`, and `LLM_TOP_P`, applies safe defaults, and sends supported OpenAI-compatible generation settings.
- `src/app/api/director/turn/route.ts` passes effective generation settings and validated debug prompt guidance into Game Master request construction so persisted `directorCalls.requestSummary` and local turn-unit debug logs can inspect them, and persists exact request messages only when raw request debug storage is enabled.
- `src/lib/director/debug-log.ts` emits one local `director.turn.unit` record per recorded turn attempt and gates full raw request/response text behind explicit local debug flags.
- `src/lib/director/output.ts` continues to validate `npcUpdates` through the bounded `mood`, `status`, and `memory` allowlist, ignores read-only knowledge facts as attempted mutations, and suppresses accepted NPC updates when the required scene beat disallows durable changes.
- `src/app/world-client.tsx` renders debug prompt guidance text sections and includes them with the next narrative turn.
- `src/lib/director/raw-request.ts` gates raw provider request persistence behind `LORECRAFT_DEBUG_STORE_RAW_REQUEST=1`.
- `src/lib/director/director.test.ts` covers prompt component structure, prompt guidance inclusion, hidden knowledge inclusion, scene-beat derivation, read-only fact rejection, provider generation settings, raw request storage gating, and local turn-unit debug log shape.
- `scripts/director-playtest.mjs` runs the repeatable local Game Master playtest against a running dev server.

#### Verified By

- R1-S1 and R1-S2: Focused director tests prove prompt component separation, editable prompt guidance inclusion, derived scene state/feed ownership, and no internal turn/command IDs in the recent feed prompt surface.
- R2-S1 and R2-S2: Focused director tests prove hidden read-only NPC knowledge reaches the prompt and read-only fields are rejected if proposed as mutations by the extractor.
- R3-S1 and R3-S2: Focused director tests prove direct-question and trivial-action scene-beat derivation.
- R4-S1 and R4-S2: Local route playtest with Ollama `llama3.1:8b` produced Mira dialogue for a direct storm question, and focused prompt tests permit attributed dialogue in player-facing narration.
- R5-S1 and R5-S2: `npm run playtest:director` and focused tests prove trivial actions can avoid accepted durable NPC churn while meaningful updates remain bounded to `mood`, `status`, and `memory`.
- R6-S1 and R6-S2: Focused provider tests prove generation setting request bodies and compact generation-setting summaries.
- R7-S1 and R7-S2: Focused director tests prove prompt guidance sections affect the next turn and are summarized in debug metadata.
- R8-S1 and R8-S2: Focused raw-request tests prove exact request persistence is gated and omitted by default.
- R9-S1 and R9-S2: Local debug-log tests prove one turn-unit record per recorded turn attempt and gated raw request/response artifacts.
- Supporting gates: `npm run ci:required`, `npx convex codegen`, local Convex snapshot inspection, and local route playtests passed for the broader app surface.

#### Verification Gaps

- Broader provider-specific behavior for LM Studio, OpenRouter, Vercel AI Gateway, or direct hosted providers remains future playtest coverage.


#### Story Notes

- None.
### Story LC-001-S8: Transcript Game Master Mode

As a developer-playtester, I want a story-only Game Master mode that saves the transcript but does not mutate canonical world state, so that I can isolate story quality from persistence mechanics before adding mutation pressure back in.

#### Requirements And Scenarios

##### Requirement R1: Game Master Mode Configuration

The system SHALL support explicit Game Master modes selected by application server startup configuration.

###### Scenario R1-S1: Persistent mode remains default

- WHEN the application server starts without a transcript Game Master flag
- AND the player submits a narrative turn
- THEN the route uses the existing persistent mode
- AND the current persistent narration, NPC update validation boundary, state diff, and event behavior remains available

###### Scenario R1-S2: Transcript startup flag enabled

- WHEN the application server starts with `LORECRAFT_DIRECTOR_MODE=transcript`
- AND the player submits a narrative turn
- THEN the backend Game Master boundary resolves the mode as transcript
- AND React does not own the mode's persistence rules

###### Scenario R1-S3: Invalid startup mode rejected before persistence

- WHEN the application server is configured with an unknown Game Master mode value
- AND the player submits a narrative turn
- THEN the route returns a structured setup or validation error
- AND it does not create a turn, record player input, or call the provider

##### Requirement R2: Plain-Prose Story Contract

The system SHALL use a plain-prose output contract for transcript Game Master calls.

###### Scenario R2-S1: Transcript prompt asks for prose

- WHEN the backend builds a transcript Game Master request
- THEN the system prompt asks for player-facing story prose rather than strict JSON
- AND it does not ask the model to return `npcUpdates`, state diffs, events, or machine-readable mutation proposals

###### Scenario R2-S2: Non-empty prose succeeds

- WHEN the provider returns non-empty plain text in transcript mode
- THEN the backend treats the trimmed text as the Game Master narration
- AND the turn can succeed without JSON parsing

###### Scenario R2-S3: Empty prose fails cleanly

- WHEN the provider returns an empty response in transcript mode
- THEN the turn is marked failed
- AND no fake narration or state change is stored

###### Scenario R2-S4: Transcript context excludes runtime world state

- WHEN the application runs in transcript mode
- AND the player submits a narrative turn
- THEN the backend builds the plain-prose Game Master request from the canonical opening seed, bounded transcript, prompt guidance, and current player input
- AND it does not include current room state, present actor rows, visible exits, object state, mutable NPC facts, hidden NPC knowledge, or scene-beat classification

##### Requirement R3: Transcript And Debug Persistence Without World Mutation

The system SHALL persist inspectable transcript/debug records for transcript turns while leaving canonical world state unchanged.

###### Scenario R3-S1: Transcript turn resumes after reload

- WHEN a transcript turn succeeds and the app reloads
- THEN the feed shows the player's input and the Game Master narration
- AND the turn/debug records remain inspectable after reload

###### Scenario R3-S2: Game Master debug identifies mode and output contract

- WHEN a transcript Game Master call is persisted or locally logged
- THEN the debug metadata includes `directorMode: "transcript"` and `outputContract: "plain_prose"`
- AND accepted and ignored update lists are empty

###### Scenario R3-S3: Raw artifacts remain gated

- WHEN transcript mode records local logs or persisted Game Master calls
- THEN exact raw provider request and response text follows the existing raw debug flag behavior
- AND API keys, secrets, and full environment dumps remain excluded

##### Requirement R4: Canonical State Mutation Disabled

The system SHALL prevent transcript Game Master responses from changing canonical world state.

###### Scenario R4-S1: NPC facts do not change

- WHEN a transcript turn succeeds
- THEN current NPC facts such as Mira's `mood`, `status`, and `memory` remain unchanged
- AND no `npcUpdates` from the model are parsed, accepted, or ignored

###### Scenario R4-S2: No LLM state diffs or world events

- WHEN a transcript turn succeeds
- THEN no LLM-authored state diffs are recorded
- AND no LLM-authored world event such as "Mira's state changed after the exchange" is recorded

###### Scenario R4-S3: Runtime world state is not prompt context

- WHEN a transcript request is built
- THEN canonical runtime state such as current room, visible facts, hidden NPC knowledge, and actor locations is not included as read-only context
- AND story continuity comes from the seed plus transcript instead

##### Requirement R5: Mode Comparison Remains Testable

The system SHALL make persistent and transcript behavior easy to compare during local playtesting.

###### Scenario R5-S1: Same input can be tested in either mode

- WHEN the same seeded world and player input are used after starting the application server in persistent mode and transcript mode
- THEN both modes can produce a player-facing narration
- AND only persistent mode may produce validated world/NPC mutations

###### Scenario R5-S2: Smoke playtest can prove no-mutation behavior

- WHEN a local transcript smoke playtest sends a direct Mira question
- THEN the response includes non-empty narration
- AND Convex snapshot/debug evidence shows the command, turn, narration, and Game Master call without new NPC fact changes, state diffs, or LLM world events

###### Scenario R5-S3: Fresh demo world per seed

- WHEN the demo world is seeded during the current MVP
- THEN the prior deterministic Stormbound Chapel demo world and dependent rows are deleted
- AND the new world uses the stable demo slug `stormbound-chapel-default`
- AND playtesting starts from the initial seed instead of resuming older world state

#### Implemented By

- `src/lib/director/mode.ts` reads `LORECRAFT_DIRECTOR_MODE`, defaults to persistent mode, and rejects unknown values before turn persistence.
- `src/lib/director/prompt.ts` builds separate persistent and transcript plain-prose Game Master requests; transcript requests use seed plus transcript rather than live world state.
- `src/lib/director/provider.ts` omits OpenAI-compatible `response_format` when the effective generation settings request plain text.
- `src/lib/director/output.ts` parses transcript plain prose as narration with no NPC updates.
- `src/app/api/director/turn/route.ts` branches backend Game Master orchestration by startup mode, loads transcript context for transcript mode, and sends transcript completions through a no-mutation path.
- `convex/world.ts` seeds a fresh deterministic demo world, stores successful transcript narrations and Game Master calls, and skips NPC fact writes, LLM events, and state diffs.
- `src/app/world-client.tsx` shows the latest Game Master mode and output contract in the debug summary.
- `scripts/director-transcript-playtest.mjs` verifies the local transcript no-mutation smoke path.

#### Verified By

- R1-S1 through R1-S3: Focused mode tests prove persistent mode remains default, transcript startup mode is selected by `LORECRAFT_DIRECTOR_MODE=transcript`, and invalid mode values are rejected before persistence.
- R2-S1 through R2-S4: Focused director/provider tests prove transcript prompt shape, plain-prose parsing, empty prose failure, and seed/transcript-only context that excludes live world state.
- R3-S1 through R3-S3: `npm run playtest:director:transcript` proves transcript turns persist commands, narrations, and debug records with `directorMode: "transcript"`, `outputContract: "plain_prose"`, empty accepted/ignored updates, and gated raw artifacts.
- R4-S1 through R4-S3: Transcript smoke playtests and log inspection prove successful transcript turns preserve baseline NPC facts and create no LLM state diffs, LLM events, or live-world prompt context.
- R5-S1 through R5-S3: Transcript and default persistent smoke playtests prove both modes can produce narration, only persistent mode may mutate canonical state, and demo seeding starts from the stable fresh seed.
- Supporting gates: `npm run ci:required`, `npm run typecheck`, and `npx convex codegen` passed after transcript-mode implementation and review remediation.

#### Verification Gaps

- Taylor manual browser confirmation remains pending.
- Transcript-mode browser reload/debug display is covered by persisted turn/debug architecture and focused route/unit tests, but a dedicated Playwright transcript-mode suite remains deferred until transcript mode becomes a regular browser testing target.


#### Story Notes

- None.
### Story LC-001-S12: Lightweight Location Cards And Movement

As a developer-playtester, I want canonical locations to ground narration and support bounded actor movement, so that the story can move through known places without becoming a command-driven MUD.

#### Requirements And Scenarios

##### Requirement R1: Location Cards In Game Master Context

The system SHALL include canonical location context in persistent Game Master requests.

###### Scenario R1-S1: Current location grounds narration

- WHEN the player submits narrative input in persistent mode
- THEN the Game Master request includes the current Location Card with key, name, description, visible objects, present actors, and relevant location facts
- AND the Game Master treats the Location Card as canonical scene truth rather than loose suggestion

###### Scenario R1-S2: Existing locations are eligible destinations

- WHEN the backend builds persistent Game Master context
- THEN it includes a compact list of existing locations that can be valid movement destinations
- AND movement eligibility does not require connected exits in this change

###### Scenario R1-S3: Transcript mode excludes live location cards

- WHEN the application runs in transcript mode
- THEN the Game Master request continues to use the opening seed plus transcript only
- AND it does not include live Location Cards, actor locations, location edits, or movement extraction

##### Requirement R2: Bounded Actor Location Mutation

The system SHALL mutate actor locations only through validated post-narration extraction.

###### Scenario R2-S1: Clear player travel moves the player

- WHEN the player clearly attempts travel to an existing location
- AND the Game Master narration resolves the player as reaching or entering that location
- THEN the extractor may propose moving the player actor to that location
- AND Convex persists the move only after validating the actor and destination location

###### Scenario R2-S2: Present NPC follows or leaves

- WHEN the player clearly attempts travel
- AND the narration explicitly says a current-scene NPC follows, accompanies, leaves with, or travels to the same existing location
- THEN the extractor may propose moving that NPC
- AND Convex persists the move only if the NPC was present in the scene at turn start and the target location exists

###### Scenario R2-S3: Game Master cannot relocate actors autonomously

- WHEN the narration independently relocates the scene without a clear player travel action
- THEN backend validation rejects or ignores any actor movement not grounded in clear player travel and narration-confirmed arrival
- AND actor `roomId` values remain unchanged

###### Scenario R2-S4: Unknown target location is unresolved

- WHEN the player attempts to travel to a destination that is not an existing canonical location
- THEN the Game Master handles the attempt in-story as unclear, unavailable, blocked, or needing more context
- AND no new location is created
- AND no actor location mutation is accepted

###### Scenario R2-S5: Path links are not enforced

- WHEN the player clearly travels to any existing location
- THEN the backend may accept the move even if no exit links the current location to the target
- AND future path/link constraints remain deferred

##### Requirement R3: Debug Location Editing

The system SHALL provide a debug `Locations` tab for inspecting and editing canonical demo-world locations.

###### Scenario R3-S1: Debug tab shows location state

- WHEN a world is seeded and the debug panel is open
- THEN the `Locations` tab lists existing locations with key, name, description, visible objects or exits when available, and current actors in each location

###### Scenario R3-S2: Debug edit updates canonical location fields

- WHEN Taylor edits a location's name or description in the debug `Locations` tab
- THEN the change is persisted to Convex as canonical demo-world state
- AND the next persistent Game Master request uses the edited Location Card

###### Scenario R3-S3: Debug create adds a canonical location

- WHEN Taylor creates a new location in the debug `Locations` tab
- THEN the system creates a canonical location with a stable key, name, and description
- AND that location can become a valid movement target for future turns

###### Scenario R3-S4: Location keys remain stable after creation

- WHEN an existing location is displayed in the debug `Locations` tab
- THEN its key is treated as stable identity and is not edited in place
- AND display fields can still be edited

##### Requirement R4: Reset And Debug Evidence

The system SHALL make location state, edits, and movement decisions inspectable and resettable.

###### Scenario R4-S1: Reset restores seeded locations

- WHEN the demo world is reset through fresh seed or Reset Session
- THEN edited seeded locations are restored to seed values
- AND debug-created locations are removed
- AND actor locations return to the seeded setup

###### Scenario R4-S2: Accepted movement is turn-scoped

- WHEN actor movement is accepted for a turn
- THEN the system records a turn-scoped state diff with `moveActor` operations
- AND debug records identify the moved actors, target location keys, and extractor reason

###### Scenario R4-S3: Rejected movement is inspectable

- WHEN an actor movement proposal is rejected because the actor is invalid, offscreen, or the target location is unknown
- THEN no actor `roomId` changes
- AND debug evidence records why the proposal was ignored

#### Implemented By

- `convex/world.ts` exposes Location Card data through persistent Game Master context, debug snapshot location summaries, debug-gated location edit/create actions backed by internal mutations, validated actor movement persistence, session location/actor reset, and turn-scoped `moveActor` state diffs.
- `src/lib/director/prompt.ts` renders current Location Card and Known Locations prompt sections in persistent mode while keeping transcript mode seed-plus-transcript only.
- `src/lib/director/output.ts` parses state extraction output with `npcUpdates` and `actorMoves`, validates movement against current-scene actors, existing known locations, clear travel input, narration-confirmed arrival, and explicit NPC movement narration.
- `src/app/api/director/turn/route.ts` records validated actor moves through the post-narration extractor path and skips movement extraction in transcript mode.
- `src/app/world-client.tsx` adds the debug `Locations` tab with canonical location inspection, edit, create, and actor/object/exit summaries.
- `scripts/llm-fixture-server.mjs` and `tests/e2e/lorecraft-playtest.spec.ts` cover deterministic fixture-backed movement in browser E2E.

#### Verified By

- R1-S1 through R1-S3: Focused director tests prove Location Card prompt context, known-location context, and transcript-mode exclusion of live location cards.
- R2-S1 through R2-S5: Focused director tests prove state extraction parsing, accepted player/NPC movement, rejected unknown/offscreen/autonomous movement, and path-link non-enforcement for existing locations.
- R3-S1 through R3-S4: `npm run e2e` proves the debug `Locations` tab lists, edits, creates, and preserves stable keys for canonical locations.
- R4-S1 through R4-S3: `npm run e2e` proves Reset Session restores seeded locations/actor positions, accepted movement creates turn-scoped debug evidence, and rejected unknown-location movement remains inspectable.
- Supporting gates: `npm run ci:required` and `npx convex codegen` passed after location context, debug-gated writes, movement persistence, and review remediation.

#### Verification Gaps

- Taylor manual browser confirmation remains pending.
- Live-provider movement judgment remains empirical; deterministic parser, validation, and E2E checks prove accepted and rejected movement contracts.


#### Story Notes

- None.
### Story LC-001-S9: Read-Only NPC Context

As a developer-playtester, I want NPCs to exist as readable authored objects in Game Master context, so that NPC-focused narration is grounded in world state before Lorecraft reintroduces intelligent state mutation.

#### Requirements And Scenarios

##### Requirement R1: NPC Profiles In Game Master Context

The system SHALL include current-scene NPC profiles in persistent Game Master requests as readable context.

###### Scenario R1-S1: NPC description grounds a look action

- WHEN the player submits input like `I look at Mira`
- THEN the persistent Game Master request includes Mira's stable NPC profile
- AND the Game Master can base the response on Mira's authored description and readable attributes instead of inventing her from transcript history alone

###### Scenario R1-S2: NPC context is structured separately from transcript

- WHEN the backend builds persistent Game Master context
- THEN NPC profile data is represented as structured context owned by Convex canonical actor rows and actor facts
- AND recent feed transcript remains separate supporting history

##### Requirement R2: Read-Only Story-Generation Mutation Boundary

The system SHALL keep the player-facing Game Master story-generation response read-only with respect to NPC state. Later extractor Stories may propose bounded mutations through a separate validated pass.

###### Scenario R2-S1: Story generation returns NPC update-like text

- WHEN the player-facing story-generation response includes prose that resembles an NPC update
- THEN the backend does not parse that prose as a durable NPC mutation
- AND any durable NPC fact change must come from a separate validated extractor pass

###### Scenario R2-S2: Existing NPC values remain unchanged after narration

- WHEN a successful persistent Game Master turn narrates an NPC-focused interaction
- THEN persisted actor rows and actor-scoped facts remain unchanged unless a non-story-generation path changes them, such as debug editing or a later bounded extractor pass

##### Requirement R3: Debug NPC Inspection And Editing

The system SHALL provide a debug-panel `NPCs` tab for inspecting, editing, creating, and resetting canonical demo-world NPC values.

###### Scenario R3-S1: Debug panel shows NPC fields

- WHEN a world is seeded and the debug panel is open
- THEN the `NPCs` tab lists current NPCs with their key, name, description, current location, and readable attributes

###### Scenario R3-S2: Debug edit affects Game Master context

- WHEN Taylor edits an NPC value in the debug `NPCs` tab
- THEN the next persistent Game Master request uses the saved canonical value as read-only context
- AND the debug UI makes save/reset status visible
- AND clearing an editable NPC fact removes that manual canonical value instead of preserving stale prompt context

###### Scenario R3-S3: Debug edits are resettable

- WHEN Taylor uses Reset Session or Reset World
- THEN seeded NPC values are restored
- AND debug-created NPCs are removed from the demo world

###### Scenario R3-S4: Debug create adds a current-location NPC

- WHEN Taylor creates an NPC from the debug `NPCs` tab
- THEN the system creates a canonical NPC actor in the player's current location with a stable key, name, description, and editable profile facts
- AND that NPC can appear in the next persistent Game Master request when present in the current scene

#### Implemented By

- `src/lib/director/npc-profiles.ts` derives read-only NPC profiles from current-scene actors and actor facts.
- `convex/world.ts` seeds Mira, Brother Alden, Rowan, and Lena with stable visible descriptions plus `background`, `persona`, `voice`, `mood`, `status`, `memory`, and private `knowledge` facts; it also exposes debug-gated canonical NPC create/update/reset actions, clears blank debug fact values, and caps debug-created NPC/location counts.
- `src/lib/director/prompt.ts` renders `npcProfiles` into canonical `npcCards`, includes `conversationFocus`, `lastAction`, and `sceneDirective` as persistent-mode prompt components; records `npcProfileKeys` and `npcMutationMode: "bounded_updates"` in request summaries; and keeps read-only NPC cards/profiles higher priority than recent feed prose.
- `src/app/api/director/turn/route.ts` reads canonical Convex NPC context for persistent Game Master turns and leaves transcript mode unchanged.
- `src/app/world-client.tsx` adds a debug `NPCs` tab for inspecting, autosaving, creating, and resetting canonical demo-world NPCs; flushes queued NPC autosaves before player turn submission; and cancels queued NPC autosaves before seed/reset.
- `src/lib/director/director.test.ts` covers persistent NPC profile prompt context, prompt priority/scene directive context, direct-NPC question targeting, canonical debug-created NPC context, transcript exclusion, and the bounded mutation boundary.

#### Verified By

- R1-S1 and R1-S2: Focused director tests prove current-scene NPC profiles are rendered as NPC Cards, prioritized over recent-feed prose, and kept separate from transcript history.
- R2-S1 and R2-S2: Focused director tests prove story-generation output remains read-only for NPC state while any durable mutation must come from a non-story-generation path.
- R3-S1 through R3-S4: `npm run e2e` proves the debug `NPCs` tab shows seeded NPCs, saves Mira description edits, clears editable knowledge, creates a current-location NPC, and restores/removes debug-created NPC state on Reset Session.
- R3-S2 and R3-S4: Focused director tests prove canonical debug-created NPC context and direct/recent addressed NPC targeting reach the next persistent Game Master request.
- Supporting gates: `npm run ci:required`, `npm run typecheck`, `npm run lint`, and `npx convex codegen` passed after NPC profile/debug write remediation.

#### Verification Gaps

- Taylor manual browser confirmation remains pending.
- Live-provider NPC-card adherence remains empirical; deterministic prompt, route, and E2E checks prove the context and validation boundary.

#### Superseded Boundary Note

`LC-001-S9` established read-only NPC Cards as the first safe context step. `LC-001-S10` keeps story-generation output read-only and reintroduces validated NPC mutation through a separate post-narration extractor.


#### Story Notes

- None.
### Story LC-001-S10: Extracted NPC State Mutation

As a developer-playtester, I want meaningful NPC characteristics to mutate through a separate validated extraction pass, so that the world can remember story consequences without making the creative Game Master response carry persistence decisions.

#### Requirements And Scenarios

##### Requirement R1: Post-Narration Extraction Pass

The system SHALL run NPC state extraction separately from player-facing story generation in persistent mode.

###### Scenario R1-S1: Successful story turn triggers extraction

- WHEN a persistent-mode Game Master turn returns valid non-empty narration
- THEN the backend stores the narration as player-facing story prose
- AND it builds a separate structured NPC-state extraction request from the current player input, the stored narration, current-scene NPC Cards, and bounded recent story

###### Scenario R1-S2: Story generation remains plain prose

- WHEN the backend builds the main persistent-mode story request
- THEN the output contract remains player-facing plain prose
- AND the story prompt does not ask the model to return `npcUpdates`, state diffs, or machine-readable mutation proposals

###### Scenario R1-S3: Transcript mode does not extract NPC state

- WHEN the application runs in transcript mode
- AND a story turn succeeds
- THEN no NPC-state extractor runs
- AND no accepted NPC fact changes, LLM state diffs, or LLM-authored state events are recorded

##### Requirement R2: Bounded NPC Characteristic Updates

The system SHALL accept only validated current-scene NPC updates for `mood`, `status`, and `memory`.

###### Scenario R2-S1: Meaningful attitude change

- WHEN the extractor proposes a non-empty `mood` update for a current-scene NPC with a human-readable reason
- THEN the backend validates the actor and field
- AND persists the accepted `mood` fact with source `llm`

###### Scenario R2-S2: Durable current circumstance

- WHEN the story establishes an ongoing NPC circumstance that should remain true after the immediate beat
- AND the extractor proposes a `status` update for that current-scene NPC
- THEN the backend persists the accepted `status` fact
- AND records the update in the turn-scoped state diff

###### Scenario R2-S3: Rolling player-interaction memory

- WHEN the interaction meaningfully changes what an NPC should remember about the player later
- AND the extractor proposes a `memory` rewrite
- THEN the backend persists the accepted `memory` fact
- AND the value remains capped at 500 characters through validation

###### Scenario R2-S4: Ephemeral beat produces no update

- WHEN the narration contains only a short-term gesture, stumble, glance, flinch, hesitation, or other one-frame reaction
- THEN the extractor may return no NPC update
- AND existing NPC facts remain unchanged

###### Scenario R2-S5: Read-only NPC card fields are rejected

- WHEN the extractor proposes changes to `description`, `background`, `persona`, `voice`, `knowledge`, relationships, locations, or any other non-allowlisted field
- THEN the backend ignores those fields
- AND records why they were ignored in debug-visible evidence

###### Scenario R2-S6: Unknown or offscreen NPC is rejected

- WHEN the extractor proposes an update for an unknown NPC or an NPC not currently in the scene
- THEN the backend ignores that update
- AND no fact, state diff, or state event is written for that update

##### Requirement R3: Turn-Scoped Persistence And Debug Evidence

The system SHALL persist accepted NPC updates as canonical state and make all extractor decisions inspectable by turn.

###### Scenario R3-S1: Accepted extraction update persists canonical state

- WHEN one or more NPC fact changes are accepted for a turn
- THEN Convex updates the actor-scoped facts
- AND writes a `stateDiffs` row tied to the same turn and command

###### Scenario R3-S2: Accepted update summary is specific enough to inspect

- WHEN an accepted update creates debug-visible event or state-diff evidence
- THEN the evidence identifies the affected NPC and changed field keys
- AND it does not expose hidden private knowledge as player-facing metadata

###### Scenario R3-S3: Extractor failure does not fake state

- WHEN story narration succeeds but the extraction provider call fails or returns invalid output
- THEN the story turn remains succeeded
- AND no fake NPC update, state diff, or LLM-authored state event is recorded
- AND debug records show the extractor failure

###### Scenario R3-S4: No-update extraction remains inspectable

- WHEN the extractor returns no updates
- THEN no facts change
- AND debug records show that extraction ran and produced no accepted updates

##### Requirement R4: Provider-Neutral Extractor Contract

The system SHALL use the existing provider-neutral backend boundary for NPC state extraction.

###### Scenario R4-S1: Extractor uses configured OpenAI-compatible provider

- WHEN `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` are configured
- THEN the extractor uses the same provider adapter path as story generation
- AND the UI does not depend on provider-specific SDKs or model APIs

###### Scenario R4-S2: Extractor request is identifiable

- WHEN a Game Master call or local log records the extraction request
- THEN the request summary identifies it as NPC-state extraction
- AND includes compact metadata such as output contract, actor keys, allowed update keys, model, and provider without logging secrets

#### Implemented By

- `src/lib/director/prompt.ts` keeps persistent story generation plain-prose and adds `buildNpcStateExtractionRequest` for a second JSON-only extractor request using final narration, current input, current-scene NPC Cards, recent story, and the `mood` / `status` / `memory` allowlist.
- `src/lib/director/output.ts` adds `parseNpcStateExtractionOutput` while reusing existing NPC update validation, actor allowlisting, field allowlisting, memory caps, and scene-beat persistence boundaries.
- `src/app/api/director/turn/route.ts` runs extraction only after successful persistent narration, records story and extraction calls with `requestSummary.callRole`, skips extraction in transcript mode, and treats extractor failure as a debug-visible persistence miss rather than a failed story turn.
- `convex/world.ts` adds `recordNpcStateExtraction` and shared accepted-update persistence for actor facts, turn-scoped state diffs, LLM events, and `directorCalls` debug records.
- `scripts/director-playtest.mjs` verifies persistent mode now records both story-generation and NPC-state-extraction calls for each tested turn.

#### Verified By

- R1-S1 through R1-S3: Focused director tests prove persistent story generation remains plain prose, successful narration triggers a separate extraction request, and transcript mode skips NPC-state extraction.
- R2-S1 through R2-S6: Focused director tests prove `mood`, `status`, and `memory` acceptance, 500-character memory cap, ephemeral no-update behavior, read-only field rejection, and unknown/offscreen actor rejection.
- R3-S1 and R3-S2: Persistent playtest and Convex snapshot inspection prove accepted extractor updates persist actor facts and turn-scoped state diff/event evidence without exposing hidden knowledge as player-facing metadata.
- R3-S3 and R3-S4: `src/app/api/director/turn/route.test.ts` proves extractor provider failure, invalid extractor output, and no-update extraction remain debug-visible while preserving successful story narration and not faking state.
- R4-S1 and R4-S2: Focused route/provider tests prove the extractor uses the existing OpenAI-compatible provider path and records compact extraction request metadata without secrets.
- Supporting gates: `npm run ci:required`, `npm run typecheck`, and `npx convex codegen` passed after extractor implementation and documentation updates.

#### Verification Gaps

- Taylor confirmed manual browser playtesting for the original NPC state mutation workflow during closeout; this remediation adds deterministic route/E2E coverage without reopening that manual gate.
- Live-provider extraction quality remains empirical; deterministic tests cover parser, validation, no-update, invalid-output, and provider-error contracts.


#### Story Notes

- None.
### Story LC-001-S11: End To End Playtest Verification

As a developer-playtester, I want deterministic browser E2E coverage of the Lorecraft playtest loop, so that UI, backend route, Convex state, and provider-shaped Game Master behavior can be verified together.

#### Requirements And Scenarios

##### Requirement R1: Browser Playtest Flow

The system SHALL provide a Playwright E2E suite that verifies the core seeded-world playtest loop in a browser.

###### Scenario R1-S1: Seeded world can start the playtest

- WHEN the E2E suite opens the app with no usable playtest state
- THEN it can seed or reset the Stormbound Chapel demo world through the visible app workflow
- AND the story surface becomes ready for narrative input

###### Scenario R1-S2: Player submits a narrative turn

- WHEN the E2E suite enters player text into `What do you do next?`
- AND submits with Enter
- THEN the input clears promptly
- AND duplicate submission is prevented while the turn is pending
- AND a Game Master response appears in the story stream

###### Scenario R1-S3: Reload preserves the turn

- WHEN a successful E2E turn has been persisted
- AND the page reloads
- THEN the player input, Game Master narration, and turn number remain visible or inspectable from persisted state

##### Requirement R2: Debug And Reset Verification

The system SHALL verify the debug/test controls that make local playtesting diagnosable.

###### Scenario R2-S1: Debug drawer toggles without breaking play

- WHEN the E2E suite toggles the top-bar debug gear
- THEN the debug drawer opens and closes without trapping focus in hidden controls
- AND the story stream remains usable for narrative input

###### Scenario R2-S2: Debug turn evidence is visible

- WHEN a successful E2E turn completes
- THEN the debug surface exposes current turn/Game Master evidence for that turn
- AND the evidence identifies the deterministic fixture model or provider without exposing secrets

###### Scenario R2-S3: Reset returns to a clean playtest state

- WHEN the E2E suite invokes the appropriate reset control
- THEN persisted playtest history is cleared or reseeded according to the control's documented meaning
- AND the app returns to a state where another deterministic turn can be submitted

##### Requirement R3: Deterministic Provider Fixture

The system SHALL allow E2E tests to drive the real backend provider adapter without depending on a real model.

###### Scenario R3-S1: Fixture provider returns story prose

- WHEN Playwright runs deterministic E2E
- THEN the app uses an OpenAI-compatible local fixture endpoint via `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL`
- AND the story-generation call returns stable non-empty prose

###### Scenario R3-S2: Fixture provider returns extraction output

- WHEN persistent mode runs the post-narration NPC-state extractor during E2E
- THEN the fixture can return stable JSON for the extractor call
- AND E2E can verify either no durable update or one expected bounded update without relying on model judgment

###### Scenario R3-S3: Fixture requests remain inspectable

- WHEN local debug logging is enabled for E2E
- THEN logged or persisted Game Master call metadata identifies fixture-backed story/extraction calls
- AND secrets, API keys, and full environment dumps remain excluded

##### Requirement R4: CI And Script Boundaries

The system SHALL expose clear scripts for cheap required checks, deterministic E2E, and optional live-provider playtests.

###### Scenario R4-S1: Required CI remains cheap

- WHEN `npm run ci:required` runs
- THEN it continues to execute lint, unit tests, typecheck, and build
- AND it does not require a browser, Convex dev server, or LLM provider unless a later accepted CI policy change says otherwise

###### Scenario R4-S2: Deterministic E2E has a dedicated script

- WHEN a developer runs the new E2E script
- THEN it starts or targets the required app/test-provider services
- AND runs the Playwright smoke suite with deterministic provider behavior

###### Scenario R4-S3: Live-provider playtests remain optional

- WHEN a developer wants to evaluate local model behavior
- THEN existing or updated playtest scripts can still call the configured live model
- AND failures are treated as model/runtime diagnostics rather than deterministic E2E failures

#### Implemented By

- `playwright.config.ts` configures a single Chromium E2E project, app base URL, fixture LLM service, and local Convex/Next dev server startup.
- `scripts/llm-fixture-server.mjs` provides the deterministic OpenAI-compatible chat completions fixture for story-generation and NPC-state extraction calls.
- `scripts/e2e-next-server.mjs` builds and runs the Next app on the E2E test port with signal handling for clean Playwright shutdown.
- `tests/e2e/lorecraft-playtest.spec.ts` drives the browser through seeding/reset, narrative input, pending state, persisted reload state, debug drawer toggling, turn evidence, and reset reuse.
- `src/app/world-client.tsx` distinguishes default-world query loading from the no-world seed state so the seed control is stable for browser users and E2E.
- `vitest.config.ts` keeps Playwright specs out of the Vitest unit-test suite.
- `package.json` exposes `npm run e2e`, `npm run e2e:install`, fixture, Convex, and Next startup scripts while leaving `npm run ci:required` unchanged.

#### Verified By

- R1-S1 through R1-S3: `npm run e2e` passes with browser assertions for seed/reset, Enter submission, prompt clearing, duplicate-submit prevention while pending, story response display, persisted reload state, and turn-number evidence.
- R2-S1 through R2-S3: `npm run e2e` passes with debug drawer toggling, persisted Game Master call evidence, failed-turn debug evidence after reload, and reset reuse.
- R3-S1 through R3-S3: `scripts/llm-fixture-server.mjs` and `npm run e2e` prove the real backend provider adapter can use a deterministic OpenAI-compatible fixture for story generation, extraction output, and inspectable debug metadata without secrets.
- R4-S1 through R4-S3: `npm run ci:required` remains the cheap required gate, `npm run e2e` remains the deterministic browser suite, and live-provider playtest scripts remain outside deterministic CI.
- Supporting setup: `npm run e2e:install` installed the local Chromium browser for Playwright.

#### Verification Gaps

- Taylor manual browser confirmation remains pending for subjective visual/gameplay feel; deterministic browser coverage is in place for the current playtest loop.


#### Story Notes

- None.
## Cross-Story Concerns


## Open Decisions


## Completion Criteria

This Epic is healthy when:

- Embedded Stories cover the current scope.
- Requirements and Scenarios describe implemented behavior or intentional gaps.
- `Implemented By` points to the important starting files.
- `Verified By` maps concrete evidence to Requirements/Scenarios.
- `Verification Gaps` are real, current, and explicit.
- Related changes, docs, indexes, reviews, and changelog entries do not contradict this Epic.

## Notes

Story IDs are stable within this Epic and are more important than document order. `LC-001-S12` appears before `LC-001-S9` through `LC-001-S11` because location work was added as a topical insertion after those earlier Stories; future reconciliation should preserve IDs unless an explicit Story move is approved.
