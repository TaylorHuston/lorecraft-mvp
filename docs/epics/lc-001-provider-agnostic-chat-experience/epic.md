---
id: LC-001
status: implemented
created: 2026-07-01
modified: 2026-07-08
last_verified: 2026-07-08
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
  - LC-001-S13
  - LC-001-S14
  - LC-001-S15
  - LC-001-S16
---

# LC-001 Core Game Master Play Loop

## Product Context

Lorecraft's first product bet is that an AI Game Master can feel better than a generic chat window when it is grounded in typed canonical state, a readable story stream, and clear player action categories. This Epic owns that playable loop: the player-facing story feed, Game Master request boundary, prompt context categories, Player/NPC/Location Card context, bounded state extraction, pre-turn utilities, Story/Guide actions, local debugging, and deterministic verification for those behaviors.

LC-002 owns the World/Adventure container model. LC-001 should treat the selected Adventure as the active runtime context and should not redefine WorldVersion copy, reset, or isolation semantics except where the play loop consumes them.

## Outcome

Lorecraft needs a first playable AI Game Master loop where the player can interact narratively with a persistent scene, resume the visible transcript, and watch at least one NPC carry structured memory across turns, while the product remains free to change LLM providers and while Convex remains the source of truth.

## Current Scope

- Player-facing Act, Pass, Story, Guide, `/help`, and `/look` interactions for a local Adventure.
- Provider-agnostic Game Master request handling through the current OpenAI-compatible adapter boundary.
- Prompt context assembly from story-visible history plus canonical Player/NPC/Location Card state.
- Plain-prose Game Master narration followed by separate bounded extraction for durable NPC facts and actor movement.
- Local debug surfaces, local structured logs, raw prompt/output inspection, reset controls, and deterministic E2E coverage needed to keep the loop inspectable.

## Deferred Scope

This Epic originally kept the MVP to one editable persistent world. LC-002 now implements the first slice of the later target model: Adventures are copied from frozen WorldVersions, so mutable play state is separate from authored World source data. Accounts, sharing, branching, rollback, broad command parsing, combat, inventory, rules-heavy RPG systems, polished World Builder workflows, and World patching into existing Adventures remain deferred.

## Candidate Stories

| Candidate | Status | Story Shape | Acceptance Signals |
|---|---|---|---|

## Story Index

| Story | Status | Capability | Last Verified | Notes |
|---|---|---|---|---|
| LC-001-S1 | implemented | Narrative Play Feed And Unified Input | 2026-07-05 | Revalidated by architecture-refactor CI, Convex compile, and E2E gates. |
| LC-001-S2 | implemented | Provider-Agnostic Backend Game Master Boundary | 2026-07-05 | Revalidated by thin route/server boundary review plus CI and E2E gates. |
| LC-001-S3 | implemented | Persistent Current-Scene NPC State | 2026-07-05 | Revalidated by NPC context/edit/reset E2E coverage and CI gates. |
| LC-001-S4 | implemented | Debuggable Game Master Calls And Reset | 2026-07-05 | Revalidated by debug/reset E2E coverage and review. |
| LC-001-S5 | implemented | Story Stream Reading Experience | 2026-07-05 | Revalidated by story stream and turn-control E2E coverage. |
| LC-001-S6 | implemented | Scoped Narrative Turns | 2026-07-07 | Revalidated by Story/Guide route tests and E2E coverage. |
| LC-001-S7 | implemented | Active Game Master Guidance And Context Assembly | 2026-07-07 | Owns prompt/context assembly; debug logging and raw request inspection are supporting observability concerns. |
| LC-001-S8 | implemented | Transcript Game Master Mode | 2026-07-05 | Revalidated by unchanged focused tests and CI gates. |
| LC-001-S12 | implemented | Lightweight Location Cards And Movement | 2026-07-05 | Revalidated by extracted location helpers, CI, Convex compile, and E2E gates. |
| LC-001-S9 | implemented | Read-Only NPC Context | 2026-07-05 | Revalidated by extracted NPC/debug helpers, CI, Convex compile, and E2E gates. |
| LC-001-S10 | implemented | Extracted NPC State Mutation | 2026-07-05 | Revalidated by turn-persistence helper extraction, CI, Convex compile, and E2E gates. |
| LC-001-S11 | implemented | End To End Playtest Verification | 2026-07-05 | Supporting verification story for the play loop; move to broader verification ownership if E2E becomes app-wide infrastructure. |
| LC-001-S13 | implemented | Pre-Turn Slash Command Utilities | 2026-07-07 | Revalidated against Story/Guide context boundaries. |
| LC-001-S14 | implemented | Pre-Turn Story And Guide Actions | 2026-07-07 | Adds canonical player-authored Story inserts and hidden Guide turns. |
| LC-001-S15 | implemented | Player Card | 2026-07-08 | Adds persistent player-facing protagonist context and prompt grounding. |
| LC-001-S16 | implemented | Room Info Panel | 2026-07-08 | Adds persistent player-facing current-room context from canonical location and actor state. |

## Stories

### Story LC-001-S1: Narrative Play Feed And Unified Input

Status: implemented
Created: 2026-07-01
Modified: 2026-07-06
Last verified: 2026-07-06

As a playtester, I want a simple Act/Pass decision surface and a resumable story feed, so that the MVP feels like interacting with a living scene instead of operating a command parser.

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

###### Scenario R3-S2: Missing Adventure state

- WHEN no Adventure is seeded or the selected Adventure cannot be loaded
- THEN the system does not call the LLM
- AND the player sees an actionable message to seed or reload the Adventure

##### Requirement R4: Decision Controls

The system SHALL provide dedicated decision controls at the decision point.

###### Scenario R4-S0: Player opens the action input

- WHEN an Adventure is open
- THEN the system shows `What do you do?` above the current player decision controls
- WHEN the player clicks `Act`
- THEN the system replaces the controls with the narrative input
- AND the player can submit a normal action

###### Scenario R4-S1: Player passes the turn

- WHEN an Adventure is open
- AND the player clicks `Pass`
- THEN the system starts a turn with a Pass trigger
- AND the player is not required to type anything into the narrative input

###### Scenario R4-S2: Pass is not story prose

- WHEN a Pass turn resolves
- THEN the main story stream shows the Game Master narration
- AND it does not show a player-side `Pass` message as story content
- AND turn/debug metadata still makes the Pass trigger inspectable

#### Implemented By

| Path | Role | Recheck Trigger |
|---|---|---|
| `src/features/play/world-client.tsx` | renders the narrative-only split layout, owns the parent turn submission operation, and shows persisted feed entries. | Recheck when this Story changes or the listed path changes. |
| `src/features/play/turn-action-panel.tsx` | renders the `What do you do?` decision surface, Act/Pass controls, Act-expanded textarea, close animation, pending placeholder, notice/error status, Enter-to-submit behavior, and Pass trigger. | Recheck when this Story changes or the listed path changes. |
| `src/features/play/debug-panel-shell.tsx` | hosts the debug drawer shell and tab selection separately from the player story layout. | Recheck when debug drawer structure changes. |
| `src/app/api/director/turn/route.ts` | receives narrative input or Pass triggers from the client and routes them through the backend Game Master workflow. | Recheck when this Story changes or the listed path changes. |
| `convex/world.ts`, `src/lib/world/convex-snapshot-read-model.ts`, `src/lib/world/convex-turn-persistence.ts` | record player inputs for action turns, create commandless Pass turns, reconstruct the feed from `commands`, `narrations`, and `events`, and accept actor-location movement only through bounded post-narration extraction validation. | Recheck when this Story changes or the listed paths change. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1 and R1-S2 | `npm run e2e` | proves the browser accepts one narrative input, submits it through the Game Master route, and does not require a separate command/chat mode choice. | Recorded |
| R2-S1 and R2-S2 | `npm run e2e` | proves persisted player input, Game Master narration, turn evidence, and reset behavior survive reload and remain distinguishable in the story/debug surfaces. | Recorded |
| R2-S1 and R2-S2 | `CONVEX_AGENT_MODE=anonymous npx convex run world:getSnapshot` showed persisted player input, Game Master narration, and event feed entries ordered from durable rows. | As described in the evidence cell. | Recorded |
| R3-S1 | `npm run e2e` and browser verification | prove pending state disables duplicate submission for the in-flight turn while keeping progress visible. | Recorded |
| R3-S2 | Seed/no-world browser flow in `npm run e2e` | proves the app exposes a seed action before attempting play when no usable playtest state exists. | Recorded |
| R4-S0 through R4-S2 | `npm run e2e` and `src/app/api/director/turn/route.test.ts` | prove Act opens the narrative input, Pass starts a turn without typed input, produces Game Master narration, and does not create a player-side Pass story entry. | Recorded |
| R4-S0 through R4-S2 | `npm run ci:required` and `npm run e2e` on 2026-07-05 after `src/features/play/turn-action-panel.tsx` extraction | prove the extracted turn panel still opens Act input, submits Act with Enter, supports Pass, exposes pending/error state, and preserves the browser playtest path. | Recorded |
| R4-S0 through R4-S2 | `npm run ci:required`, `npm run convex:once`, and `npm run e2e` on 2026-07-05 after client and Convex helper extraction | prove the split play client, debug shell, autosave hooks, snapshot helpers, context helpers, and turn-persistence helpers preserve the deterministic browser playtest path. | Passing |
| Supporting gate | `npm run ci:required`, `npm run convex:once`, runtime HTML smoke, and runtime local-Ollama POST passed for the broader app surface. | As described in the evidence cell. | Passing |

#### Verification Gaps

- No unresolved implementation gap for this Story.
- No unresolved browser automation gap for the current MVP play-feed path.


#### Story Notes

- None.
### Story LC-001-S2: Provider-Agnostic Backend Game Master Boundary

Status: implemented
Created: 2026-07-01
Modified: 2026-07-08
Last verified: 2026-07-08

As a developer, I want Lorecraft to call LLMs through backend application logic and a provider adapter, so that the UI can change later and local model playtesting does not lock the app to one provider.

#### Requirements And Scenarios

##### Requirement R1: Next Route Handler Game Master Workflow

The system SHALL keep Game Master orchestration and provider calls out of React components and place the first POC orchestration boundary in a Next.js Route Handler.

###### Scenario R1-S1: UI submits intent

- WHEN the player submits a narrative turn
- THEN the client calls the Game Master Route Handler with the input and selected Adventure
- AND React does not import provider SDKs, provider request types, secrets, or durable game rules

###### Scenario R1-S2: Backend coordinates the turn

- WHEN the Route Handler receives player input
- THEN it uses backend application/domain modules to prepare context, invoke the provider adapter, parse and validate structured output, and coordinate persistence through Convex functions
- AND Convex remains the only persistence path for commands, narrations, facts, state diffs, events, and Game Master debug records

###### Scenario R1-S3: Orchestration can move later

- WHEN the POC outgrows the Next.js Route Handler boundary
- THEN the reusable application/domain modules can move behind Convex actions or another backend service
- AND React-facing behavior does not need to own Game Master rules

###### Scenario R1-S4: Malformed Adventure id

- WHEN the Route Handler receives a malformed `adventureId`
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
- THEN it includes the current player message or Pass directive, current structured scene/NPC state, and a bounded recent story-visible narration window
- AND it does not send secrets, raw database dumps, or unrelated debug state

###### Scenario R3-S2: Multiple narrative turns

- WHEN the player sends multiple turns
- THEN each provider request is independently constructed from current persisted state and recent story-visible narration context
- AND the system does not depend on a provider conversation ID, assistant thread, or hidden remote memory

#### Implemented By

| Path | Role | Recheck Trigger |
|---|---|---|
| `src/app/api/director/turn/route.ts` | is the synchronous Next.js Route Handler orchestration boundary. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/prompt.ts` | builds stateless bounded Game Master requests from current scene/NPC context and story-visible narration history. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/provider.ts` | reads `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` and calls OpenAI-compatible chat completions through `fetch`. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/output.ts` | parses plain prose for current story generation and retains strict JSON NPC-update parsing/validation for structured extraction. | Recheck when this Story changes or the listed path changes. |
| `convex/world.ts` | remains the only persistence path for commands, narrations, facts, state diffs, events, and Game Master call records. | Recheck when this Story changes or the listed path changes. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1 and R1-S2 | `npm run e2e` exercises the browser-to-route turn submission path through the real backend route and fixture OpenAI-compatible provider without React importing provider SDKs or secrets. | As described in the evidence cell. | Recorded |
| R1-S2 and R3-S1/R3-S2 | `npm run test -- src/lib/director/director.test.ts src/app/api/director/turn/route.test.ts` covers bounded request construction, missing config handling, OpenAI-compatible response extraction, and no-mutation setup failure behavior. | As described in the evidence cell. | Recorded |
| R1-S3 | 2026-07-05 architecture review of `src/app/api/director/turn/route.ts`, `src/server/director/turn-route.ts`, `src/lib/director/*`, and `src/lib/world/convex-*` after `npm run ci:required`, `npm run convex:once`, and `npm run e2e` passed. | proves the Route Handler is a thin adapter and reusable server/world helper modules own the movable orchestration logic instead of React. | Passing |
| R1-S4 | `src/app/api/director/turn/route.test.ts` | proves malformed `adventureId` returns a structured `400` before LLM config is required and without recording player input. | Recorded |
| R2-S1 and R2-S2 | Runtime POST to `/api/director/turn` with `LLM_BASE_URL=http://localhost:11434/v1`, `LLM_API_KEY=ollama`, and `LLM_MODEL=llama3.1:8b` succeeded, proving the provider adapter contract against local Ollama. | As described in the evidence cell. | Passing |
| R2-S3 | `src/app/api/director/turn/route.test.ts` and 2026-07-05 `npm run ci:required` cover missing configuration as a structured setup failure before a provider call. | proves deterministic app surfaces and setup-oriented failure handling remain available when provider configuration is absent. | Passing |
| R3-S1 and R3-S2 | Game Master request construction tests | prove each provider request is built from current persisted state and recent bounded narration context rather than provider-managed remote session state. | Recorded |
| Supporting gate | `npm run ci:required`, `npm run convex:once`, and `npm run e2e` passed on 2026-07-05 for the broader app surface after the architecture refactor. | As described in the evidence cell. | Passing |

#### Verification Gaps

- No unresolved implementation gap for this Story.
- Provider coverage is OpenAI-compatible by contract and tested with Ollama/local fetch stubs; provider-specific quirks for LM Studio, OpenRouter, and Vercel AI Gateway remain future playtest coverage.


#### Story Notes

- None.
### Story LC-001-S3: Persistent Current-Scene NPC State

Status: implemented
Created: 2026-07-01
Modified: 2026-07-05
Last verified: 2026-07-05

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

| Path | Role | Recheck Trigger |
|---|---|---|
| `convex/schema.ts` | adds actor keys and the `directorCalls` table while continuing to store NPC state in `facts`. | Recheck when this Story changes or the listed path changes. |
| `convex/world.ts` | seeds Taylor and Mira with stable actor keys and initializes Mira's `mood`, `status`, and `memory` facts. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/output.ts` | retains structured NPC-update parsing/validation for extractor-style mutation, ignores unknown/offscreen NPC updates, partially accepts valid fields, and caps `memory` at 500 characters. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/prompt.ts` | sends current-scene NPC facts as hidden Game Master guidance. | Recheck when this Story changes or the listed path changes. |
| `src/features/play/world-client.tsx` | shows hidden NPC facts only in the debug panel. | Recheck when this Story changes or the listed path changes. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1 and R1-S2 | Seeded-world E2E/debug assertions and Convex snapshot checks | prove Mira and Brother Alden exist with stable actor keys plus baseline `mood`, `status`, and `memory` facts. | Recorded |
| R2-S1 and R2-S2 | `npm run test -- src/lib/director/director.test.ts src/app/api/director/turn/route.test.ts` | proves non-empty plain-prose story output succeeds and empty/unusable output fails without fake narration or NPC state changes. | Recorded |
| R3-S1 through R3-S3 | Focused director tests | prove bounded NPC update validation, partial valid-field acceptance, unknown/offscreen actor rejection, and ignored update evidence. | Recorded |
| R4-S1 through R4-S3 | Focused director tests | prove ephemeral/no-update cases can leave facts unchanged, `memory` remains capped at 500 characters, and accepted durable updates persist through the extractor path. | Recorded |
| R5-S1 and R5-S2 | Prompt/debug tests and E2E debug-panel assertions | prove hidden facts are supplied as Game Master guidance and shown plainly only in debug surfaces. | Recorded |
| Supporting gate | `npm run ci:required`, `npm run convex:once`, and runtime local-Ollama playtests passed for the broader app surface. | As described in the evidence cell. | Passing |

#### Verification Gaps

- No unresolved implementation gap for this Story.
- Prompt tuning for unnecessary NPC fact churn remains an empirical playtesting concern, but validation bounds and tests are in place.


#### Story Notes

- None.
### Story LC-001-S4: Debuggable Game Master Calls And Reset

Status: implemented
Created: 2026-07-01
Modified: 2026-07-05
Last verified: 2026-07-05

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

| Path | Role | Recheck Trigger |
|---|---|---|
| `convex/schema.ts` | defines `directorCalls` for provider/model metadata, compact request summaries, raw/parsed responses, status, accepted updates, ignored updates, and errors. | Recheck when this Story changes or the listed path changes. |
| `convex/world.ts` | persists Game Master call audit records, accepted NPC fact diffs, generic world events, and rough reset behavior. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/debug-log.ts` | writes opt-in gitignored JSONL debug records for local troubleshooting and gates raw LLM text behind `LORECRAFT_DEBUG_LOG_RAW_LLM` and raw provider request text behind `LORECRAFT_DEBUG_LOG_RAW_REQUEST`. | Recheck when this Story changes or the listed path changes. |
| `src/app/api/director/turn/route.ts` | records pre-turn rejection logs and one local `director.turn.unit` log entry for each recorded provider-error, invalid-output, or successful Game Master turn when `LORECRAFT_DEBUG_LOG=1` is enabled. | Recheck when this Story changes or the listed path changes. |
| `src/features/play/world-client.tsx` | renders hidden facts, events, narrations, state diffs, and Game Master calls in the debug panel and exposes rough reset. | Recheck when this Story changes or the listed path changes. |
| `.gitignore`, `package.json`, `README.md` | document and support the local-only debug log path. | Recheck when this Story changes or the listed path changes. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1 and R3-S1/R3-S2 | `npm run test -- src/lib/director/director.test.ts src/app/api/director/turn/route.test.ts` covers successful and failed Game Master/debug call persistence, accepted/ignored update metadata, and extractor debug records. | As described in the evidence cell. | Recorded |
| R1-S2 | `src/app/api/director/turn/route.test.ts` | proves provider errors and invalid extractor output are recorded as debug-visible extractor failures without faking state; `npm run e2e` proves failed-turn debug evidence remains visible after browser reload. | Recorded |
| R2-S1 and R2-S2 | Local debug log unit tests | prove JSONL writes are opt-in, raw LLM response text is omitted unless explicitly enabled, and raw request text is gated separately. | Recorded |
| R4-S1 and R4-S2 | `npm run e2e` exercises Reset Session through the browser and | proves the story surface returns to the empty seeded state while canonical debug state is restored. | Recorded |
| Supporting gate | `npm run ci:required` passed for lint, unit tests, typecheck, and production build. | As described in the evidence cell. | Passing |

#### Verification Gaps

- No unresolved implementation gap for this Story.
- Rough reset intentionally remains a temporary single-world playtest tool until story/play-session instances exist.


#### Story Notes

- None.
### Story LC-001-S5: Story Stream Reading Experience

Status: implemented
Created: 2026-07-01
Modified: 2026-07-05
Last verified: 2026-07-05

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

| Path | Role | Recheck Trigger |
|---|---|---|
| `src/features/play/world-client.tsx` | renders persisted feed rows as a prose-first story stream, with Game Master narration as normalized app-font prose, player turns as authored action text, and world events as quiet inline notices. | Recheck when this Story changes or the listed path changes. |
| `src/features/play/world-client.tsx` | keeps the play surface in a constrained first-viewport layout where the story stream scrolls independently and the continuation input stays visible across desktop and narrow viewports. | Recheck when this Story changes or the listed path changes. |
| `src/features/play/world-client.tsx` | scrolls the story pane to the bottom when feed length, pending state, or error state changes. | Recheck when this Story changes or the listed path changes. |
| `src/features/play/turn-action-panel.tsx` | keeps the continuation input, pending state, error state, Act expansion, Pass control, and Enter-to-send behavior near the story stream. | Recheck when this Story changes or the listed path changes. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1 through R1-S3 | Browser verification and `npm run e2e` | prove Game Master narration renders as primary prose, player input renders as authored action text, and world/debug events remain visually quieter than story text. | Recorded |
| R2-S1 through R2-S3 | Browser verification plus `npm run e2e` | prove the story pane uses independent overflow, settles near the newest content, stays usable when the debug drawer is taller, and remains near the bottom after deterministic long-feed interactions. | Recorded |
| R3-S1 | `npm run e2e` | proves Reset Session returns the story stream to the empty story state. | Recorded |
| R3-S2 | Browser verification with a page-local `fetch` stub | proves Enter submits the textarea, the textarea clears while pending, duplicate submission is rejected during the in-flight turn, and pending feedback appears without a submit button. | Recorded |
| R3-S3 | Browser verification with a page-local error `fetch` stub and `npm run e2e` provider-failure coverage | prove errors appear near the continuation input while the existing story remains readable. | Recorded |
| Supporting gate | `npm run ci:required` passed for lint, unit tests, typecheck, and production build. | As described in the evidence cell. | Passing |

#### Verification Gaps

- No unresolved implementation gap for this Story.
- Taylor manual browser confirmation of the final polished visual design remains useful but is not blocking deterministic E2E coverage.


#### Story Notes

- None.
### Story LC-001-S6: Scoped Narrative Turns

Status: implemented
Created: 2026-07-01
Modified: 2026-07-05
Last verified: 2026-07-05

As a developer-playtester, I want each resolved story beat to be stored as a scoped turn with an explicit trigger, so that action turns, Pass turns, debug records, and future rollback boundaries have one durable unit of progression.

#### Requirements And Scenarios

##### Requirement R1: Turn Lifecycle

The system SHALL create a durable turn for each resolving story beat.

###### Scenario R1-S1: Successful narrative turn

- WHEN the player submits valid narrative input for a seeded Adventure
- THEN the backend creates a turn with an Adventure-scoped sequence number
- AND the turn links the player input, Game Master call, narration, accepted state diffs, and events caused by that input
- AND the turn ends with a succeeded status after persistence completes

###### Scenario R1-S2: Provider or output failure after turn creation

- WHEN a turn is created and the provider call fails or returns invalid output
- THEN the turn remains persisted with a failed status
- AND the related command and Game Master call remain linked to the turn for debug inspection
- AND no fake narration or unaccepted state change is stored

###### Scenario R1-S3: Request rejected before persistence

- WHEN a request is malformed, missing required configuration, or references an invalid Adventure before game persistence starts
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

###### Scenario R2-S3: Seed rows remain outside triggered turns

- WHEN the demo Adventure is seeded
- THEN seed narration and seed events may remain unscoped
- AND triggered turns begin with the first player action or Pass

##### Requirement R3: Reset And Future Rollback Boundary

The system SHALL keep turn persistence compatible with rough reset now and snapshot/rollback later.

###### Scenario R3-S1: Rough reset clears turn history

- WHEN Reset Session is invoked
- THEN persisted turns and turn-linked history for the selected Adventure are cleared with commands, narrations, events, state diffs, and Game Master calls
- AND the Adventure's source WorldVersion baseline is restored

###### Scenario R3-S2: State diffs remain tied to one turn

- WHEN accepted mutations are recorded
- THEN each state diff belongs to the turn that accepted those mutations
- AND the diff remains an audit record rather than a rollback implementation by itself

###### Scenario R3-S3: Snapshot rollback remains deferred

- WHEN the data model is documented
- THEN it states that future rollback should attach snapshots to turn boundaries
- AND this change does not add snapshot capture, reverse-diff logic, branching, or restore behavior

##### Requirement R4: Turn Triggers

The system SHALL distinguish how a turn was triggered.

###### Scenario R4-S1: Action turn uses committed player input

- WHEN the player submits narrative text
- THEN the system records an action turn
- AND the turn links to the command record for that committed input
- AND the Game Master resolves that input first

###### Scenario R4-S2: Pass turn has no command

- WHEN the player clicks Pass
- THEN the system records a Pass turn
- AND the turn does not create a command record in the target model
- AND the turn can still link Game Master calls, narration, accepted state diffs, events, and failure state

###### Scenario R4-S3: Pass failure is debuggable

- WHEN a Pass turn is created and the provider fails or returns invalid output
- THEN the turn remains persisted with failed status
- AND related Game Master call/debug evidence remains linked to the Pass turn
- AND no fake narration or unaccepted state change is stored

###### Scenario R4-S4: Story insert is not a turn

- WHEN the player records Story setup during the decision phase
- THEN no turn is created
- AND the next resolving turn keeps the sequence number it would have had without the Story insert

###### Scenario R4-S5: Guide turn has no command

- WHEN the player submits Guide text
- THEN the system records a Guide turn
- AND the turn does not create a command record or player-visible Guide prose
- AND the turn can still link Game Master calls, narration, accepted state diffs, events, and failure state

##### Requirement R5: Retry Remains Deferred

The system SHALL NOT implement Retry until the app has a safe snapshot, reversible-diff, or supersession mechanism.

###### Scenario R5-S1: Retry is not exposed as a player control

- WHEN this change is implemented
- THEN the player does not see a Retry/regenerate control
- AND docs record Retry as deferred because it can otherwise desynchronize narration and canonical state

#### Implemented By

| Path | Role | Recheck Trigger |
|---|---|---|
| `convex/schema.ts` | defines `turns.trigger` plus optional `turnId` links on commands, narrations, events, state diffs, and Game Master calls. | Recheck when this Story changes or the listed path changes. |
| `convex/world.ts` | creates pending action and Pass turns with Adventure-scoped sequence numbers, completes turns as succeeded or failed, links turn-scoped rows, exposes recent turn summaries in `getSnapshot`, includes `turnId` on derived feed entries, and clears turns during Adventure reset. | Recheck when this Story changes or the listed path changes. |
| `src/app/api/director/turn/route.ts` | passes `turnId`, optional `commandId`, and trigger metadata through successful, provider-error, and invalid-output Game Master completion paths while leaving pre-persistence request/config/Adventure-load failures unpersisted. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/debug-log.ts` | includes optional `turnId`, optional `commandId`, and trigger metadata in local JSONL debug records. | Recheck when this Story changes or the listed path changes. |
| `src/features/play/world-client.tsx` | shows recent turn sequence/status/count summaries and raw turn summaries in the debug panel, and renders a subtle story-stream turn-number gutter for feed entries linked to a turn. | Recheck when this Story changes or the listed path changes. |
| `docs/data-model.md`, `docs/persistence-system.md` | document scoped turns and defer snapshot rollback. | Recheck when this Story changes or the listed path changes. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1 | `npm run e2e` | proves a successful narrative turn creates visible turn-number evidence and persists player input plus Game Master narration. | Recorded |
| R1-S2 | `src/app/api/director/turn/route.test.ts` and `npm run e2e` | prove provider-failed turns remain persisted as failed/debuggable without fake narration or accepted state changes. | Recorded |
| R1-S3 | Route tests | prove pre-persistence malformed or missing-configuration failures do not record player input. | Recorded |
| R2-S1 and R2-S2 | `npm run e2e` | proves reload preserves turn-scoped feed/debug evidence, including failed-turn status after reload. | Recorded |
| R2-S3 | Seed/reset flows leave seed rows outside triggered turns while action or Pass turns begin player-triggered progression. | As described in the evidence cell. | Recorded |
| R3-S1 through R3-S3 | `npm run e2e`, focused director tests, `docs/data-model.md`, and `docs/persistence-system.md` | prove rough reset clears turn history, accepted diffs remain turn-scoped audit records, and snapshot rollback remains deferred. | Recorded |
| R4-S1 | `src/app/api/director/turn/route.test.ts` and `npm run e2e` | prove action turns still create commands and resolve current input. | Recorded |
| R4-S2 and R4-S3 | `src/app/api/director/turn/route.test.ts` and `npm run e2e` | prove Pass turns complete or fail without command rows while remaining debug-visible. | Recorded |
| R4-S4 and R4-S5 | `src/app/api/director/turn/route.test.ts`, `src/lib/world/convex-snapshot-read-model.test.ts`, and `npm run e2e` on 2026-07-07 | prove Story inserts do not create turns, Guide turns create commandless turn records, and Guide turn status remains debug-visible. | Passing |
| R5-S1 | Source inspection of `src/features/play/world-client.tsx`, `docs/data-model.md`, and `docs/persistence-system.md` | proves Retry remains deferred and no Retry control is exposed. | Recorded |
| Supporting gate | `npm run ci:required`, `npx convex codegen`, and the prior local PR gate passed for the broader app surface. | As described in the evidence cell. | Passing |

#### Verification Gaps

- The historical Convex one-shot gate could not run during implementation because an existing local Convex backend was already running on port 3210; `npx convex codegen` was used for Convex validation instead.
- No unresolved failed-turn browser gap remains for the deterministic fixture path; live-provider failed-turn behavior remains an empirical runtime concern.


#### Story Notes

- None.
### Story LC-001-S7: Active Game Master Guidance And Context Assembly

Status: implemented
Created: 2026-07-01
Modified: 2026-07-07
Last verified: 2026-07-07

As a playtester, I want the Game Master to actively advance the current scene and let present NPCs respond meaningfully, so that Lorecraft feels like a story with persistent structure instead of a passive state logger.

#### Requirements And Scenarios

##### Requirement R1: Prompt Context Components

The system SHALL assemble Game Master prompts from explicit components with clear source ownership.

###### Scenario R1-S1: Prompt separates instructions from state and history

- WHEN the backend builds a Game Master request
- THEN the request distinguishes Game Master instructions, Player Card context, scene state, visible facts, hidden NPC knowledge, Recent Story, current input or Pass directive, and required scene beat
- AND Recent Story remains bounded and does not include prior player commands, events, internal turn IDs, or command IDs in normal persistent-mode story context

###### Scenario R1-S2: Editable and derived components have clear ownership

- WHEN prompt components are documented or inspected in tests
- THEN Game Master instructions, author/tone guidance, and model settings are treated as editable configuration
- AND Player Card context, scene state, visible facts, hidden NPC knowledge, Recent Story, current input, and required scene beat are derived from Convex state, player input, and engine logic

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

##### Requirement R10: Story-Visible History

The system SHALL build future Game Master story context from story-visible history rather than raw feed history.

###### Scenario R10-S1: Prior commands are excluded from future story context

- WHEN the backend builds a Game Master story-generation request after prior successful turns
- THEN prior player commands are not included in the recent story/history section
- AND the current committed action, if present, is included separately as the current turn input

###### Scenario R10-S2: Prior events are excluded from future story context

- WHEN the backend builds a Game Master story-generation request
- THEN prior event records are not included in the recent story/history section
- AND event records remain available to existing player/debug surfaces for now

###### Scenario R10-S3: Prior successful narrations and Story inserts are included

- WHEN the backend builds a Game Master story-generation request
- THEN recent successful Game Master narrations and player-authored Story inserts are included as story-visible history
- AND canonical Location Cards, NPC Cards, facts, actor locations, objects, and known locations remain available as current truth

##### Requirement R11: Pass Prompt Context

The system SHALL give the Game Master an explicit Pass directive when the player passes.

###### Scenario R11-S1: Pass continues the scene

- WHEN the player clicks Pass
- THEN the Game Master request includes canonical state and recent successful narrations
- AND the current turn directive tells the Game Master to continue the scene without a new player action

###### Scenario R11-S2: Pass can produce bounded consequences

- WHEN a Pass narration clearly changes durable state that the MVP currently allows
- THEN the extractor may propose bounded NPC updates or actor moves
- AND Convex validates those proposals with the same rules used for action turns

##### Requirement R12: Extractor Uses The Same History Policy

The system SHALL use the same story-visible history policy for state extraction that it uses for story generation.

###### Scenario R12-S1: Extractor excludes prior commands and events

- WHEN the post-narration extractor request is built
- THEN prior player commands and events are not included as recent story context
- AND current committed action and current Game Master narration remain available to the extractor

###### Scenario R12-S2: Extractor remains grounded in canonical state

- WHEN the extractor evaluates a possible state change
- THEN it uses canonical current state plus recent successful narrations
- AND accepted mutations still require backend validation before they become canonical

#### Implemented By

| Path | Role | Recheck Trigger |
|---|---|---|
| `src/lib/director/prompt.ts` | builds explicit Game Master prompt components, includes Player Card protagonist context, derives required scene beats including `trivial_player_action` and `pass`, separates mutable NPC facts from read-only hidden NPC knowledge, uses story-visible narration history for story/extraction prompts, and records compact request-summary metadata. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/provider.ts` | parses `LLM_TEMPERATURE`, `LLM_MAX_TOKENS`, and `LLM_TOP_P`, applies safe defaults, and sends supported OpenAI-compatible generation settings. | Recheck when this Story changes or the listed path changes. |
| `src/app/api/director/turn/route.ts` | passes effective generation settings, trigger metadata, and validated debug prompt guidance into Game Master request construction so persisted `directorCalls.requestSummary` and local turn-unit debug logs can inspect them, and persists exact request messages only when raw request debug storage is enabled. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/debug-log.ts` | emits one local `director.turn.unit` record per recorded turn attempt and gates full raw request/response text behind explicit local debug flags. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/output.ts` | continues to validate `npcUpdates` through the bounded `mood`, `status`, and `memory` allowlist, ignores read-only knowledge facts as attempted mutations, and suppresses accepted NPC updates when the required scene beat disallows durable changes. | Recheck when this Story changes or the listed path changes. |
| `src/features/play/world-client.tsx` | renders debug prompt guidance text sections and includes them with the next narrative turn. | Recheck when this Story changes or the listed path changes. |
| `src/lib/world/convex-director-context.ts` | exposes the Adventure player actor, Player Card profile facts, and current player location to Game Master context assembly. | Recheck when Player Card or Director context shape changes. |
| `src/lib/director/raw-request.ts` | gates raw provider request persistence behind `LORECRAFT_DEBUG_STORE_RAW_REQUEST=1`. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/director.test.ts` | covers prompt component structure, prompt guidance inclusion, hidden knowledge inclusion, scene-beat derivation, read-only fact rejection, provider generation settings, raw request storage gating, and local turn-unit debug log shape. | Recheck when this Story changes or the listed path changes. |
| `scripts/director-playtest.mjs` | runs the repeatable local Game Master playtest against a running dev server. | Recheck when this Story changes or the listed path changes. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1 and R1-S2 | Focused director tests | prove prompt component separation, editable prompt guidance inclusion, derived scene state/story-history ownership, and no prior command/event rows in the persistent Recent Story prompt surface. | Recorded |
| R1-S1 and R1-S2 | `src/lib/director/director.test.ts`, `src/lib/world/convex-snapshot-read-model.test.ts`, `npm run test`, and `npm run typecheck` on 2026-07-08 | prove Player Card context is a distinct prompt component derived from canonical Adventure player state while preserving the existing prompt contract. | Passing |
| R2-S1 and R2-S2 | Focused director tests | prove hidden read-only NPC knowledge reaches the prompt and read-only fields are rejected if proposed as mutations by the extractor. | Recorded |
| R3-S1 and R3-S2 | Focused director tests | prove direct-question and trivial-action scene-beat derivation. | Recorded |
| R4-S1 and R4-S2 | Local route playtest with Ollama `llama3.1:8b` produced Mira dialogue for a direct storm question, and focused prompt tests permit attributed dialogue in player-facing narration. | As described in the evidence cell. | Recorded |
| R5-S1 and R5-S2 | `npm run playtest:director` and focused tests | prove trivial actions can avoid accepted durable NPC churn while meaningful updates remain bounded to `mood`, `status`, and `memory`. | Recorded |
| R6-S1 and R6-S2 | Focused provider tests | prove generation setting request bodies and compact generation-setting summaries. | Recorded |
| R7-S1 and R7-S2 | Focused director tests | prove prompt guidance sections affect the next turn and are summarized in debug metadata. | Recorded |
| R8-S1 and R8-S2 | Focused raw-request tests | prove exact request persistence is gated and omitted by default. | Recorded |
| R9-S1 and R9-S2 | Local debug-log tests | prove one turn-unit record per recorded turn attempt and gated raw request/response artifacts. | Recorded |
| R10-S1 through R10-S3 | `src/lib/director/director.test.ts` and `src/lib/world/convex-snapshot-read-model.test.ts` | prove persistent story-generation prompts include successful narration history and player-authored Story inserts while excluding prior commands, utility output, raw Guide text, and events from Recent Story. | Passing |
| R11-S1 and R11-S2 | `src/lib/director/director.test.ts`, `src/app/api/director/turn/route.test.ts`, and `npm run e2e` | prove Pass prompts include a continue directive, Pass turns resolve through the same route/extractor path, and no player Pass prose is stored. | Recorded |
| R12-S1 and R12-S2 | `src/lib/director/director.test.ts` | proves extraction requests use the same filtered narration-history policy while retaining canonical cards/state and current narration. | Recorded |
| Supporting gate | `npm run ci:required`, `npx convex codegen`, local Convex snapshot inspection, and local route playtests passed for the broader app surface. | As described in the evidence cell. | Passing |

#### Verification Gaps

- Broader provider-specific behavior for LM Studio, OpenRouter, Vercel AI Gateway, or direct hosted providers remains future playtest coverage.
- Deterministic Pass-specific accepted mutation coverage remains future work; current tests prove the shared route/extractor path for Pass and existing bounded mutation validation separately.


#### Story Notes

- None.
### Story LC-001-S8: Transcript Game Master Mode

Status: implemented
Created: 2026-07-01
Modified: 2026-07-05
Last verified: 2026-07-05

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

| Path | Role | Recheck Trigger |
|---|---|---|
| `src/lib/director/mode.ts` | reads `LORECRAFT_DIRECTOR_MODE`, defaults to persistent mode, and rejects unknown values before turn persistence. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/prompt.ts` | builds separate persistent and transcript plain-prose Game Master requests; transcript requests use seed plus transcript rather than live world state. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/provider.ts` | omits OpenAI-compatible `response_format` when the effective generation settings request plain text. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/output.ts` | parses transcript plain prose as narration with no NPC updates. | Recheck when this Story changes or the listed path changes. |
| `src/app/api/director/turn/route.ts` | branches backend Game Master orchestration by startup mode, loads transcript context for transcript mode, and sends transcript completions through a no-mutation path. | Recheck when this Story changes or the listed path changes. |
| `convex/world.ts` | seeds a fresh deterministic demo world, stores successful transcript narrations and Game Master calls, and skips NPC fact writes, LLM events, and state diffs. | Recheck when this Story changes or the listed path changes. |
| `src/features/play/world-client.tsx` | shows the latest Game Master mode and output contract in the debug summary. | Recheck when this Story changes or the listed path changes. |
| `scripts/director-transcript-playtest.mjs` | verifies the local transcript no-mutation smoke path. | Recheck when this Story changes or the listed path changes. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1 through R1-S3 | Focused mode tests | prove persistent mode remains default, transcript startup mode is selected by `LORECRAFT_DIRECTOR_MODE=transcript`, and invalid mode values are rejected before persistence. | Recorded |
| R2-S1 through R2-S4 | Focused director/provider tests | prove transcript prompt shape, plain-prose parsing, empty prose failure, and seed/transcript-only context that excludes live world state. | Recorded |
| R3-S1 through R3-S3 | `npm run playtest:director:transcript` | proves transcript turns persist commands, narrations, and debug records with `directorMode: "transcript"`, `outputContract: "plain_prose"`, empty accepted/ignored updates, and gated raw artifacts. | Recorded |
| R4-S1 through R4-S3 | Transcript smoke playtests and log inspection | prove successful transcript turns preserve baseline NPC facts and create no LLM state diffs, LLM events, or live-world prompt context. | Recorded |
| R5-S1 through R5-S3 | Transcript and default persistent smoke playtests | prove both modes can produce narration, only persistent mode may mutate canonical state, and demo seeding starts from the stable fresh seed. | Recorded |
| Supporting gate | `npm run ci:required`, `npm run typecheck`, and `npx convex codegen` passed after transcript-mode implementation and review remediation. | As described in the evidence cell. | Passing |

#### Verification Gaps

- Taylor manual browser confirmation is an accepted nonblocking gap; deterministic transcript-mode checks remain the acceptance evidence for this Story.
- Transcript-mode browser reload/debug display is covered by persisted turn/debug architecture and focused route/unit tests, but a dedicated Playwright transcript-mode suite remains deferred until transcript mode becomes a regular browser testing target.


#### Story Notes

- None.
### Story LC-001-S12: Lightweight Location Cards And Movement

Status: implemented
Created: 2026-07-01
Modified: 2026-07-05
Last verified: 2026-07-05

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

| Path | Role | Recheck Trigger |
|---|---|---|
| `convex/world.ts`, `src/lib/world/convex-director-context.ts`, `src/lib/world/convex-snapshot-read-model.ts`, `src/lib/world/convex-turn-persistence.ts` | expose Location Card data through persistent Game Master context, debug snapshot location summaries, debug-gated location edit/create actions backed by internal mutations, validated actor movement persistence, session location/actor reset, and turn-scoped `moveActor` state diffs. | Recheck when this Story changes or the listed paths change. |
| `src/lib/director/prompt.ts` | renders current Location Card and Known Locations prompt sections in persistent mode while keeping transcript mode seed-plus-transcript only. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/output.ts` | parses state extraction output with `npcUpdates` and `actorMoves`, validates movement against current-scene actors, existing known locations, clear travel input, narration-confirmed arrival, and explicit NPC movement narration. | Recheck when this Story changes or the listed path changes. |
| `src/app/api/director/turn/route.ts` | records validated actor moves through the post-narration extractor path and skips movement extraction in transcript mode. | Recheck when this Story changes or the listed path changes. |
| `src/features/play/world-client.tsx`, `src/features/play/debug-panel-shell.tsx`, `src/features/play/use-location-debug-saves.ts` | add the debug `Locations` tab with canonical location inspection, edit/create save workflow, flush-before-turn behavior, and actor/object/exit summaries. | Recheck when this Story changes or the listed paths change. |
| `scripts/llm-fixture-server.mjs`, `tests/e2e/lorecraft-playtest.spec.ts` | cover deterministic fixture-backed movement in browser E2E. | Recheck when this Story changes or the listed path changes. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1 through R1-S3 | Focused director tests | prove Location Card prompt context, known-location context, and transcript-mode exclusion of live location cards. | Recorded |
| R2-S1 through R2-S5 | Focused director tests | prove state extraction parsing, accepted player/NPC movement, rejected unknown/offscreen/autonomous movement, and path-link non-enforcement for existing locations. | Recorded |
| R3-S1 through R3-S4 | `npm run e2e` | proves the debug `Locations` tab lists, edits, creates, and preserves stable keys for canonical locations. | Recorded |
| R4-S1 through R4-S3 | `npm run e2e` | proves Reset Session restores seeded locations/actor positions, accepted movement creates turn-scoped debug evidence, and rejected unknown-location movement remains inspectable. | Recorded |
| Supporting gate | `npm run ci:required` and `npx convex codegen` passed after location context, debug-gated writes, movement persistence, and review remediation. | As described in the evidence cell. | Passing |
| Supporting gate | `npm run ci:required`, `npm run convex:once`, and `npm run e2e` on 2026-07-05 after Workstream 2 and 4 extraction | prove the extracted Location debug save hook, snapshot read model, director context model, and turn persistence helpers preserve location editing, movement evidence, reset, and browser debug flows. | Passing |

#### Verification Gaps

- Taylor manual browser confirmation is an accepted nonblocking gap; deterministic location/movement checks remain the acceptance evidence for this Story.
- Live-provider movement judgment remains empirical; deterministic parser, validation, and E2E checks prove accepted and rejected movement contracts.


#### Story Notes

- None.
### Story LC-001-S9: Read-Only NPC Context

Status: implemented
Created: 2026-07-01
Modified: 2026-07-05
Last verified: 2026-07-05

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

| Path | Role | Recheck Trigger |
|---|---|---|
| `src/lib/director/npc-profiles.ts` | derives read-only NPC profiles from current-scene actors and actor facts. | Recheck when this Story changes or the listed path changes. |
| `convex/world.ts`, `src/lib/world/convex-director-context.ts`, `src/lib/world/convex-snapshot-read-model.ts` | seed Mira, Brother Alden, Rowan, and Lena with stable visible descriptions plus `background`, `persona`, `voice`, `mood`, `status`, `memory`, and private `knowledge` facts; expose NPC context and debug snapshot data; and keep debug-gated canonical NPC write actions registered through Convex. | Recheck when this Story changes or the listed paths change. |
| `src/lib/director/prompt.ts` | renders `npcProfiles` into canonical `npcCards`, includes `conversationFocus`, `lastAction`, and `sceneDirective` as persistent-mode prompt components; records `npcProfileKeys` and `npcMutationMode: "bounded_updates"` in request summaries; and keeps read-only NPC cards/profiles higher priority than recent feed prose. | Recheck when this Story changes or the listed path changes. |
| `src/app/api/director/turn/route.ts` | reads canonical Convex NPC context for persistent Game Master turns and leaves transcript mode unchanged. | Recheck when this Story changes or the listed path changes. |
| `src/features/play/world-client.tsx`, `src/features/play/debug-panel-shell.tsx`, `src/features/play/use-npc-debug-autosave.ts` | add a debug `NPCs` tab for inspecting, autosaving, creating, and resetting canonical demo-world NPCs; flush queued NPC autosaves before player turn submission; and cancel queued NPC autosaves before seed/reset. | Recheck when this Story changes or the listed paths change. |
| `src/lib/director/director.test.ts` | covers persistent NPC profile prompt context, prompt priority/scene directive context, direct-NPC question targeting, canonical debug-created NPC context, transcript exclusion, and the bounded mutation boundary. | Recheck when this Story changes or the listed path changes. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1 and R1-S2 | Focused director tests | prove current-scene NPC profiles are rendered as NPC Cards, prioritized over recent-feed prose, and kept separate from transcript history. | Recorded |
| R2-S1 and R2-S2 | Focused director tests | prove story-generation output remains read-only for NPC state while any durable mutation must come from a non-story-generation path. | Recorded |
| R3-S1 through R3-S4 | `npm run e2e` | proves the debug `NPCs` tab shows seeded NPCs, saves Mira description edits, clears editable knowledge, creates a current-location NPC, and restores/removes debug-created NPC state on Reset Session. | Recorded |
| R3-S2 and R3-S4 | Focused director tests | prove canonical debug-created NPC context and direct/recent addressed NPC targeting reach the next persistent Game Master request. | Recorded |
| Supporting gate | `npm run ci:required`, `npm run typecheck`, `npm run lint`, and `npx convex codegen` passed after NPC profile/debug write remediation. | As described in the evidence cell. | Passing |
| Supporting gate | `npm run ci:required`, `npm run convex:once`, and `npm run e2e` on 2026-07-05 after Workstream 2 and 4 extraction | prove the extracted NPC autosave hook, debug shell, snapshot read model, director context model, and turn persistence helpers preserve NPC debug editing, reset, turn submission flushing, and deterministic browser flows. | Passing |

#### Verification Gaps

- Taylor manual browser confirmation is an accepted nonblocking gap; deterministic NPC context/debug checks remain the acceptance evidence for this Story.
- Live-provider NPC-card adherence remains empirical; deterministic prompt, route, and E2E checks prove the context and validation boundary.

#### Superseded Boundary Note

`LC-001-S9` established read-only NPC Cards as the first safe context step. `LC-001-S10` keeps story-generation output read-only and reintroduces validated NPC mutation through a separate post-narration extractor.


#### Story Notes

- None.
### Story LC-001-S10: Extracted NPC State Mutation

Status: implemented
Created: 2026-07-01
Modified: 2026-07-07
Last verified: 2026-07-07

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

###### Scenario R2-S4a: Narration support boundary

- WHEN the extractor proposes a stronger durable fact than the completed narration directly supports
- THEN the backend ignores that proposed fact
- AND the ignored update remains visible in extractor debug evidence
- AND the system does not convert transient beats such as gasping, stumbling, freezing, or an item slipping into durable `mood` or `status` facts by default

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

| Path | Role | Recheck Trigger |
|---|---|---|
| `src/lib/director/prompt.ts` | keeps persistent story generation plain-prose and adds `buildNpcStateExtractionRequest` for a second JSON-only extractor request using final narration, current input, current-scene NPC Cards, recent story, and the `mood` / `status` / `memory` allowlist. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/output.ts` | adds `parseNpcStateExtractionOutput` while reusing existing NPC update validation, actor allowlisting, field allowlisting, memory caps, scene-beat persistence boundaries, and narration-support boundaries that reject momentary or intensified facts. | Recheck when this Story changes or the listed path changes. |
| `src/app/api/director/turn/route.ts` | runs extraction only after successful persistent narration, records story and extraction calls with `requestSummary.callRole`, skips extraction in transcript mode, and treats extractor failure as a debug-visible persistence miss rather than a failed story turn. | Recheck when this Story changes or the listed path changes. |
| `convex/world.ts`, `src/lib/world/convex-turn-persistence.ts` | add `recordNpcStateExtraction` and shared accepted-update persistence for actor facts, turn-scoped state diffs, LLM events, and `directorCalls` debug records. | Recheck when this Story changes or the listed paths change. |
| `scripts/director-playtest.mjs` | verifies persistent mode now records both story-generation and NPC-state-extraction calls for each tested turn. | Recheck when this Story changes or the listed path changes. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1 through R1-S3 | Focused director tests | prove persistent story generation remains plain prose, successful narration triggers a separate extraction request, and transcript mode skips NPC-state extraction. | Recorded |
| R2-S1 through R2-S6 | Focused director tests | prove `mood`, `status`, and `memory` acceptance, 500-character memory cap, ephemeral no-update behavior, narration-support rejection for momentary/intensified facts, read-only field rejection, and unknown/offscreen actor rejection. | Recorded |
| R3-S1 and R3-S2 | Persistent playtest and Convex snapshot inspection | prove accepted extractor updates persist actor facts and turn-scoped state diff/event evidence without exposing hidden knowledge as player-facing metadata. | Recorded |
| R3-S3 and R3-S4 | `src/app/api/director/turn/route.test.ts` | proves extractor provider failure, invalid extractor output, no-update extraction, and ignored overreaching extractor proposals remain debug-visible while preserving successful story narration and not faking state. | Recorded |
| R4-S1 and R4-S2 | Focused route/provider tests | prove the extractor uses the existing OpenAI-compatible provider path and records compact extraction request metadata without secrets. | Recorded |
| Supporting gate | `npm run ci:required`, `npm run typecheck`, and `npx convex codegen` passed after extractor implementation and documentation updates. | As described in the evidence cell. | Passing |

#### Verification Gaps

- Taylor confirmed manual browser playtesting for the original NPC state mutation workflow during closeout; this remediation adds deterministic route/E2E coverage without reopening that manual gate.
- Live-provider extraction quality remains empirical; deterministic tests cover parser, validation, no-update, invalid-output, and provider-error contracts.


#### Story Notes

- None.
### Story LC-001-S11: End To End Playtest Verification

Status: implemented
Created: 2026-07-01
Modified: 2026-07-05
Last verified: 2026-07-05

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

| Path | Role | Recheck Trigger |
|---|---|---|
| `playwright.config.ts` | configures a single Chromium E2E project, app base URL, fixture LLM service, and local Convex/Next dev server startup. | Recheck when this Story changes or the listed path changes. |
| `scripts/llm-fixture-server.mjs` | provides the deterministic OpenAI-compatible chat completions fixture for story-generation and NPC-state extraction calls. | Recheck when this Story changes or the listed path changes. |
| `scripts/e2e-next-server.mjs` | builds and runs the Next app on the E2E test port with signal handling for clean Playwright shutdown. | Recheck when this Story changes or the listed path changes. |
| `tests/e2e/lorecraft-playtest.spec.ts` | drives the browser through seeding/reset, narrative input, pending state, persisted reload state, debug drawer toggling, turn evidence, and reset reuse. | Recheck when this Story changes or the listed path changes. |
| `src/features/play/world-client.tsx` | distinguishes default-world query loading from the no-world seed state so the seed control is stable for browser users and E2E. | Recheck when this Story changes or the listed path changes. |
| `vitest.config.ts` | keeps Playwright specs out of the Vitest unit-test suite. | Recheck when this Story changes or the listed path changes. |
| `package.json` | exposes `npm run e2e`, `npm run e2e:install`, fixture, Convex, and Next startup scripts while leaving `npm run ci:required` unchanged. | Recheck when this Story changes or the listed path changes. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1 through R1-S3 | `npm run e2e` passes with browser assertions for seed/reset, Enter submission, prompt clearing, duplicate-submit prevention while pending, story response display, persisted reload state, and turn-number evidence. | As described in the evidence cell. | Passing |
| R2-S1 through R2-S3 | `npm run e2e` passes with debug drawer toggling, persisted Game Master call evidence, failed-turn debug evidence after reload, and reset reuse. | As described in the evidence cell. | Passing |
| R3-S1 through R3-S3 | `scripts/llm-fixture-server.mjs` and `npm run e2e` | prove the real backend provider adapter can use a deterministic OpenAI-compatible fixture for story generation, extraction output, and inspectable debug metadata without secrets. | Recorded |
| R4-S1 through R4-S3 | `npm run ci:required` remains the cheap required gate, `npm run e2e` remains the deterministic browser suite, and live-provider playtest scripts remain outside deterministic CI. | As described in the evidence cell. | Recorded |
| Supporting gate | `npm run e2e:install` installed the local Chromium browser for Playwright. | As described in the evidence cell. | Passing |

#### Verification Gaps

- Taylor manual browser confirmation is an accepted nonblocking gap for subjective visual/gameplay feel; deterministic browser coverage is in place for the current playtest loop.


#### Story Notes

- None.
### Story LC-001-S13: Pre-Turn Slash Command Utilities

Status: implemented
Created: 2026-07-05
Modified: 2026-07-07
Last verified: 2026-07-07

As a playtester, I want lightweight slash commands during my decision phase, so that I can inspect the current fiction or get command help without ending my turn.

#### Requirements And Scenarios

##### Requirement R1: Slash Command Input

The system SHALL detect supported slash commands entered in the normal Act-expanded input and execute them as utility actions instead of narrative Acts.

###### Scenario R1-S1: Help command

- WHEN the player opens Act input and submits `/help`
- THEN the system shows a utility result listing `/help` and `/look`
- AND no turn is created
- AND the turn number does not increment

###### Scenario R1-S2: Unsupported command

- WHEN the player submits an unsupported slash command such as `/dance`
- THEN the system shows a utility error or help-oriented response
- AND no turn is created
- AND the input remains recoverable enough for the player to continue

##### Requirement R2: Look Command

The system SHALL support `/look` with an optional target and generate a player-facing inspection result from current Adventure context.

###### Scenario R2-S1: Look around current scene

- WHEN the player submits `/look`
- THEN the backend builds a provider request from the current Location Card, present NPC Cards, visible objects, exits, and recent successful narration
- AND the result describes what the player can currently observe
- AND no canonical state is mutated

###### Scenario R2-S2: Look at visible target

- WHEN the player submits `/look Mira` and Mira is present or otherwise in current context
- THEN the inspection result is grounded in Mira's canonical actor description and relevant current facts
- AND recent narration may color the description without overriding canonical card truth

###### Scenario R2-S3: Look at unknown target

- WHEN the player submits `/look moonblade` and no visible/current-context target matches
- THEN the system returns a clear utility result that the target is not something the player can currently inspect
- AND no provider call is required for that negative result

##### Requirement R3: Utility Feed Persistence And Prompt Exclusion

The system SHALL persist slash-command results as Adventure-scoped utility feed entries that are visible on reload but excluded from future Game Master story prompts.

###### Scenario R3-S1: Utility result survives reload

- WHEN the player runs `/look`
- AND reloads the Adventure
- THEN the story stream still shows the utility result in its distinct visual style
- AND the result is ordered with nearby feed entries by creation time

###### Scenario R3-S2: Utility result is not story-visible history

- WHEN the player later performs an Act or Pass turn
- THEN the Game Master prompt includes canonical state, recent successful narrations, and any player-authored Story inserts
- AND it does not include previous `/look` or `/help` output as normal narrative history

###### Scenario R3-S3: Utility result does not affect turn lifecycle

- WHEN the player runs one or more slash commands before acting
- THEN the next Act or Pass turn receives the same next sequence number it would have received without those commands
- AND no state extraction runs for the utility commands

##### Requirement R4: Slash Command Autocomplete

The system SHALL offer lightweight autocomplete inside the Act-expanded input for supported slash commands and visible `/look` targets without making autocomplete authoritative.

###### Scenario R4-S1: Command suggestions

- WHEN the player types `/`
- THEN the input shows suggestions for `/help` and `/look`
- AND the player can accept a suggestion without submitting a turn

###### Scenario R4-S2: Look target suggestions

- WHEN the player types `/look `
- THEN the input suggests current visible inspection targets such as present NPCs and visible objects
- AND selecting a target fills the input with `/look <target>`

###### Scenario R4-S3: Autocomplete remains optional

- WHEN the player ignores autocomplete and submits a valid slash command manually
- THEN the command still uses the backend slash-command route
- AND backend parsing and target validation remain authoritative

#### Implemented By

| Path | Role | Recheck Trigger |
|---|---|---|
| `convex/schema.ts` | Defines Adventure-scoped `utilityMessages` for pre-turn slash command output. | Recheck when utility feed persistence changes. |
| `convex/world.ts` | Records utility messages, exposes them in snapshots, and deletes them with Adventure reset/delete. | Recheck when utility persistence, reset, delete, or snapshot contracts change. |
| `src/lib/world/convex-snapshot-read-model.ts` | Adds utility messages to the visible feed while keeping `loadStoryVisibleHistory` narration-only. | Recheck when feed reconstruction or Game Master history changes. |
| `src/lib/director/slash-command.ts` | Parses supported and unsupported slash commands and provides deterministic help output. | Recheck when slash command syntax or supported commands change. |
| `src/lib/director/look-prompt.ts` | Resolves `/look` targets and builds provider requests from current Adventure context. | Recheck when `/look` grounding or prompt context changes. |
| `src/lib/director/slash-command-autocomplete.ts` | Derives browser autocomplete suggestions for supported commands and visible `/look` targets without replacing backend validation. | Recheck when command autocomplete behavior changes. |
| `src/server/director/utility-request.ts`, `src/server/director/utility-route.ts`, `src/app/api/director/utility/route.ts` | Own server-side utility request validation, local route guard, provider call, and persistence orchestration. | Recheck when utility route behavior changes. |
| `src/features/play/turn-action-panel.tsx`, `src/features/play/world-client.tsx` | Dispatch same-input leading-slash commands, keep the decision phase open after utility success, render utility feed entries distinctly, and present slash-command autocomplete suggestions. | Recheck when player input or story feed rendering changes. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1 and R1-S2 | `npm run test -- src/lib/director/slash-command.test.ts src/app/api/director/utility/route.test.ts` | Supported and unsupported slash command input routes to utility behavior without turn creation or LLM config for `/help`. | Passing |
| R2-S1 through R2-S3 | `src/app/api/director/utility/route.test.ts` | `/look` calls the provider for visible targets, uses canonical Adventure context, and returns deterministic no-provider output for unknown targets. | Passing |
| R3-S1 through R3-S3 | `npm run e2e` | Browser path proves `/help` and `/look` utility entries render in the feed, do not close the decision phase, and leave the first real Act as Turn #1. | Passing |
| R3-S1 through R3-S3 | `src/lib/world/convex-snapshot-read-model.test.ts` and `npm run e2e` on 2026-07-07 | prove utility output remains outside story-visible Game Master history while Story inserts use a separate story-visible category. | Passing |
| R4-S1 through R4-S3 | `npm run test -- src/lib/director/slash-command-autocomplete.test.ts` and `npm run e2e` | Autocomplete suggests `/help`, `/look`, and visible `/look` targets while preserving manual backend slash-command submission. | Passing |
| Supporting gate | `npm run ci:required` | Lint, unit tests, typecheck, and production build pass with the utility route and feed changes. | Passing |

#### Verification Gaps

- Taylor manual browser confirmation is an accepted nonblocking gap for subjective utility styling and play feel; deterministic route and E2E behavior are passing.

#### Story Notes

- This Story reconciles the earlier MVP bias away from command parsing by limiting slash commands to pre-turn, read-only utility actions.

### Story LC-001-S14: Pre-Turn Story And Guide Actions

Status: implemented
Created: 2026-07-07
Modified: 2026-07-07
Last verified: 2026-07-07

As a playtester, I want Story and Guide actions during the decision phase, so that I can add canonical scene setup or privately steer the Game Master without forcing every interaction through Act or Pass.

#### Requirements And Scenarios

##### Requirement R1: Story Inserts

The system SHALL let the player add canonical story-visible narration without ending the current turn.

###### Scenario R1-S1: Player records Story setup

- WHEN an Adventure is open
- AND the player chooses Story and submits non-empty text
- THEN the backend records a player-authored Story insert for that Adventure
- AND no turn is created
- AND the turn number does not increment

###### Scenario R1-S2: Story insert is visible and resumable

- WHEN a Story insert is recorded
- AND the player reloads the Adventure
- THEN the story stream shows the Story insert in chronological order
- AND the Story insert is visually distinct from Game Master narration without reading like a utility/debug message

###### Scenario R1-S3: Story insert is future story context

- WHEN the player later uses Act, Pass, or Guide
- THEN the Game Master prompt includes recent player-authored Story inserts in story-visible history
- AND labels or prompt instructions make clear that those inserts are accepted canonical scene content

##### Requirement R2: Story Inserts Do Not Mutate State Immediately

The system SHALL treat Story inserts as canonical prose setup, not as immediate state mutations.

###### Scenario R2-S1: Story insert does not run extraction

- WHEN a Story insert is recorded
- THEN the backend does not call the Game Master provider
- AND it does not run post-narration extraction
- AND it does not record state diffs, actor movement, NPC fact changes, or LLM-authored events from the Story insert alone

###### Scenario R2-S2: Later resolving turns can react to Story setup

- WHEN recent Story inserts set up a situation
- AND the player later uses Act, Pass, or Guide
- THEN the Game Master resolves the current turn in light of the Story setup
- AND any durable state changes still require completed Game Master narration plus existing backend validation

##### Requirement R3: Guide Turns

The system SHALL let the player submit hidden current-turn guidance that produces Game Master narration.

###### Scenario R3-S1: Guide creates a resolving turn

- WHEN an Adventure is open
- AND the player chooses Guide and submits non-empty guidance
- THEN the backend creates a turn with a Guide trigger
- AND the turn calls the Game Master
- AND the turn can succeed or fail through the same terminal turn lifecycle as Act and Pass

###### Scenario R3-S2: Guide text is hidden from the story stream

- WHEN a Guide turn resolves
- THEN the player-facing story stream shows the Game Master narration
- AND it does not show the raw Guide text as a player story entry, utility entry, event, or command
- AND debug surfaces can still inspect that the turn was Guide-triggered

###### Scenario R3-S3: Guide text is current-turn context only

- WHEN the backend builds the Game Master request for a Guide turn
- THEN the request includes the Guide text as hidden current-turn direction
- AND prompt instructions say to follow it as steering, not as already-canonical player action or dialogue
- AND future Game Master story history excludes the raw Guide text after the turn completes

###### Scenario R3-S4: Failed Guide remains debuggable

- WHEN a Guide turn is created and the provider fails or returns invalid output
- THEN the turn remains persisted with failed status
- AND related Game Master call/debug evidence remains linked to the Guide turn
- AND no fake narration or unaccepted state change is stored

##### Requirement R4: Context Category Boundaries

The system SHALL keep each player-facing activity in the correct persistence and prompt category.

###### Scenario R4-S1: Future prompt context includes only story-visible history

- WHEN a future Game Master story-generation request is built
- THEN recent Game Master narration and player Story inserts may appear in story-visible history
- AND prior Act commands, Pass triggers, Guide text, slash utility output, debug records, and event records are excluded from normal story-visible history

###### Scenario R4-S2: Reset and delete clean up Story and Guide records

- WHEN Reset Session or Delete Adventure is invoked
- THEN Story inserts and Guide turns for that Adventure are removed or restored consistently with the rest of Adventure runtime history
- AND source WorldVersions remain unchanged

###### Scenario R4-S3: Transcript mode remains separate

- WHEN transcript mode is enabled
- THEN Story and Guide either remain unsupported with a clear error or receive explicit transcript-mode handling
- AND the implementation does not accidentally mix persistent-mode canonical cards/state mutation into transcript-mode context

#### Implemented By

| Path | Role | Recheck Trigger |
|---|---|---|
| `convex/schema.ts` | widens `turns.trigger`, adds `turns.hiddenGuidance`, and allows player-source narration rows for Story inserts. | Recheck when Story/Guide persistence changes. |
| `convex/world.ts` | validates and records Story inserts, records Guide turns as commandless resolving turns, exposes hidden guidance in debug turn summaries, and cleans Story/Guide runtime rows through existing Adventure reset/delete paths. | Recheck when Adventure runtime persistence changes. |
| `src/lib/world/convex-snapshot-read-model.ts` | renders player-source narrations as visible `story` feed entries and includes Story inserts in story-visible history while leaving raw Guide text out. | Recheck when feed reconstruction or prompt history changes. |
| `src/server/director/turn-request.ts`, `src/server/director/turn-route.ts`, `src/app/api/director/turn/route.ts` | validate Guide request bodies, reject Guide in transcript mode, create Guide turns, call the Game Master, persist success/failure, and omit raw Guide text from extraction as canonical player prose. | Recheck when turn route contracts change. |
| `src/lib/director/prompt.ts`, `src/lib/director/types.ts`, `src/lib/director/debug-log.ts` | distinguish Story history and Guide current-turn steering in prompt construction, request summaries, and local debug log typing. | Recheck when prompt categories or debug records change. |
| `src/features/play/turn-action-panel.tsx`, `src/features/play/world-client.tsx` | add Story and Guide decision controls, submit Story inserts and Guide turns, render Story entries distinctly, and keep Guide text out of the story stream. | Recheck when the play UI or story feed changes. |
| `docs/data-model.md`, `docs/persistence-system.md`, `docs/testing.md`, `README.md`, `CHANGELOG.md` | document the new player action categories, persistence boundaries, and deterministic verification path. | Recheck when public or canonical docs change. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1 through R1-S3 | `src/lib/world/convex-snapshot-read-model.test.ts`, `src/lib/director/director.test.ts`, and `npm run e2e` on 2026-07-07 | prove Story inserts are visible/reloadable, do not create turns, and enter future Game Master story context as canonical player-authored prose. | Passing |
| R2-S1 and R2-S2 | `convex/world.ts` source inspection, `src/lib/world/convex-snapshot-read-model.test.ts`, and `npm run e2e` on 2026-07-07 | prove Story inserts do not call the provider/extractor or create state diffs, while later Guide/Act/Pass requests can read the Story setup. | Passing |
| R3-S1 through R3-S4 | `src/app/api/director/turn/route.test.ts`, `src/lib/director/director.test.ts`, and `npm run e2e` on 2026-07-07 | prove Guide creates a resolving commandless turn, hides raw Guide text from the story stream, includes it only as current-turn steering for story generation, and keeps Guide evidence debuggable. | Passing |
| R4-S1 | `src/lib/world/convex-snapshot-read-model.test.ts`, `src/lib/director/director.test.ts`, and `npm run e2e` on 2026-07-07 | prove future story context includes Game Master narration and Story inserts while excluding commands, raw Guide text, slash utility output, debug records, and events. | Passing |
| R4-S2 | `npm run e2e` on 2026-07-07 and existing Adventure reset/delete coverage | prove disposable Story/Guide Adventures are deletable and Story/Guide runtime rows follow Adventure cleanup; Reset Session continues to clear runtime story history. | Passing |
| R4-S3 | `src/app/api/director/turn/route.test.ts` and `src/lib/world/convex-snapshot-read-model.test.ts` | prove transcript mode rejects Guide before creating a turn or calling the provider, while Story inserts remain explicit transcript narration rather than persistent-mode canonical card/state mutation. | Passing |
| Supporting gates | `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run convex:once`, `npm run ci:required`, and `npm run e2e` on 2026-07-07 | prove the broader app remains green with Story/Guide changes. | Passing |

#### Verification Gaps

- Live-provider Guide quality remains empirical; deterministic checks should prove category boundaries, not subjective prose quality.
- Taylor manual browser confirmation is an accepted nonblocking gap for subjective Story/Guide play feel and whether the extra controls feel too dashboard-like.

#### Story Notes

- Story inserts are currently local-prototype client-callable Convex mutations. Before shared or hosted use, this path needs the same ownership, auth, and permission hardening as other debug-oriented mutations.
- Guide text is not player-authored canon. It is hidden current-turn steering for the Game Master request and must stay out of future story-visible history unless a later Story explicitly changes that boundary.
- Actor movement from Guide or Pass should remain conservative. Movement acceptance belongs to location/movement validation in LC-001-S12, not to prompt guidance alone.

### Story LC-001-S15: Player Card

Status: implemented
Created: 2026-07-08
Modified: 2026-07-08
Last verified: 2026-07-08

As a playtester, I want a persistent Player Card visible during play, so that the Game Master has stable protagonist context without hiding my character details in debug state.

#### Requirements And Scenarios

##### Requirement R1: Persistent Player Card Surface

The system SHALL show a persistent player-facing Player Card while an Adventure is open.

###### Scenario R1-S1: Expanded Player Card shows filled profile fields

- WHEN an Adventure is open and the Player Card is expanded
- THEN it shows the player name, current location, and editable optional fields
- AND blank optional fields are visually editable without being treated as filled prompt context

###### Scenario R1-S2: Player Card collapses

- WHEN the player collapses the Player Card
- THEN the story stream remains readable
- AND a clear control remains available to expand the Player Card again

###### Scenario R1-S3: No debug dependency

- WHEN the debug panel is closed
- THEN the Player Card remains available as a player-facing surface

##### Requirement R2: Editable Adventure Profile

The system SHALL let the player fill in optional Player Card fields for the current Adventure.

###### Scenario R2-S1: Player edits profile fields

- WHEN the player edits physical description, backstory, or status in the Player Card
- THEN the values are saved to the selected Adventure
- AND reloading the Adventure shows the saved values

###### Scenario R2-S2: Player clears optional fields

- WHEN the player clears an optional Player Card field
- THEN the expanded Player Card shows the field as empty and editable
- AND future prompt context omits that blank field

##### Requirement R3: Game Master Uses Player Card Without Owning Agency

The system SHALL include filled Player Card context in Game Master requests while preserving player agency.

###### Scenario R3-S1: Filled Player Card enters prompt context

- WHEN the player submits Act, Pass, or Guide after filling Player Card fields
- THEN the request includes the player name, current location, physical description, backstory, and status as Player Card context
- AND blank optional fields are omitted

###### Scenario R3-S2: Player agency remains explicit

- WHEN the Game Master uses Player Card context
- THEN the prompt continues to prohibit inventing new player intent, actions, speech, thoughts, feelings, or goals

#### Implemented By

| Path | Role | Recheck Trigger |
|---|---|---|
| `convex/world.ts` | Accepts player name during Adventure creation, exposes Player Card fields in snapshots and Director context, saves/clears Player Card optional fields, and preserves Player Card identity across Reset Session. | Recheck when Adventure creation, reset, snapshot, or player profile storage changes. |
| `src/lib/world/convex-snapshot-read-model.ts`, `src/lib/world/convex-director-context.ts` | Derive player-facing and Game Master-facing Player Card read models from the Adventure player actor and actor facts. | Recheck when read-model or prompt-context shape changes. |
| `src/features/play/adventure-landing.tsx`, `src/features/play/world-client.tsx`, `src/features/play/player-card.tsx` | Prompt for player name, render the persistent collapsible Player Card, save optional profile fields, and keep the card outside the debug panel. | Recheck when the Adventure landing or play layout changes. |
| `src/lib/director/prompt.ts`, `src/lib/director/types.ts` | Add Player Card context to prompt components and preserve explicit player-agency guidance. | Recheck when prompt assembly or Director context changes. |
| `tests/e2e/lorecraft-playtest.spec.ts` | Covers name prompt, cancel path, Player Card display, edit persistence, collapse/expand, and reload. | Recheck when browser user paths change. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1 through R2-S2 | `npm run e2e` on 2026-07-10 | Browser coverage passes for name prompt, cancel, card display without debug dependency, editing, collapse/expand, and reload persistence. | Passing |
| R2-S1 and R2-S2 | `src/features/play/player-card-save-queue.test.ts` and immediate-navigation coverage in `npm run e2e` on 2026-07-10 | proves rapid edits serialize to the latest draft, failures remain pending for retry, and returning to Adventures flushes pending Player Card edits. | Passing |
| R1-S1 through R3-S1 | `src/lib/world/convex-snapshot-read-model.test.ts` | proves snapshot Player Card fields are available even when debug facts are hidden. | Passing |
| R3-S1 and R3-S2 | `src/lib/director/director.test.ts` | proves Player Card enters prompt context and agency guidance remains present. | Passing |
| Supporting gate | `npm run ci:required` on 2026-07-10 | proves lint, 93 unit tests, typecheck, and production build pass after review remediation. | Passing |

#### Verification Gaps

- Manual visual review is still useful for story width and Player Card collapse feel on narrow screens.

#### Story Notes

- The Player Card is Adventure-owned runtime context, not source World data.
- The Player Card is not a rules/stat sheet yet. Inventory, equipment, HP, stats, and TTRPG character mechanics remain deferred.
- Reset Session preserves the Player Card identity/profile while resetting the rest of the Adventure runtime copy to its source WorldVersion.

### Story LC-001-S16: Room Info Panel

Status: implemented
Created: 2026-07-08
Modified: 2026-07-08
Last verified: 2026-07-08

As a player, I want the current room's key details visible beside the story, so that I can stay oriented without opening debug or treating the transcript as the only source of scene truth.

#### Requirements And Scenarios

##### Requirement R1: Persistent Room Info Surface

The system SHALL show a persistent player-facing Room Info panel while an Adventure is open.

###### Scenario R1-S1: Room Info shows current location

- WHEN an Adventure is open
- THEN the right-side Room Info panel shows the current room/location name
- AND it shows the current room/location description
- AND it uses the same floating visual language as the Player Card

###### Scenario R1-S2: Room Info updates after location changes

- WHEN accepted actor movement changes the player's canonical current location
- THEN the Room Info panel updates to the new room/location name and description
- AND it does not continue to show stale room details from the prior location

###### Scenario R1-S3: Story remains centered

- WHEN the Player Card and Room Info panel are visible on a wide desktop viewport
- THEN the story stream remains centered in the main reading column
- AND the side panels do not create horizontal page scroll

##### Requirement R2: Present NPC List

The system SHALL show NPCs currently present in the player's room/location.

###### Scenario R2-S1: Present NPCs are listed

- WHEN NPC actors are in the same current room/location as the player
- THEN the Room Info panel lists those NPC names
- AND it excludes the player actor from the NPC list

###### Scenario R2-S2: No NPCs present

- WHEN no NPC actors are in the current room/location
- THEN the Room Info panel shows a compact empty state such as "No one else is here."

###### Scenario R2-S3: NPC list follows canonical actor locations

- WHEN accepted actor movement or reset changes which NPCs share the player's location
- THEN the Room Info panel updates from canonical actor location state
- AND it does not infer NPC presence from stale story text alone

##### Requirement R3: Read-Only Player-Facing Context

The system SHALL keep the Room Info panel as readable scene context rather than debug or editor tooling.

###### Scenario R3-S1: No editing controls in Room Info

- WHEN the player views the Room Info panel
- THEN it does not expose location edit controls, raw IDs, raw fact rows, movement debug controls, or reset controls
- AND location editing remains in the existing debug Locations tab

###### Scenario R3-S2: No new movement semantics

- WHEN the Room Info panel is added
- THEN it does not add click-to-travel, links, exits, maps, room graphs, or dungeon traversal behavior
- AND movement remains governed by the existing clear player-action and extractor validation rules

#### Implemented By

| Path | Role | Recheck Trigger |
|---|---|---|
| `src/features/play/room-info-card.tsx` | Renders the read-only Room Info panel from current room snapshot data and filters present NPC names from current-room actors. | Recheck when the room panel, current-scene actor display, or side-rail layout changes. |
| `src/features/play/world-client.tsx` | Places Room Info in the right rail of the Adventure play layout beside the centered story stream. | Recheck when the play layout or snapshot consumption changes. |
| `src/lib/world/convex-snapshot-read-model.ts` | Supplies current room/location data and current-room actors from canonical Adventure state. | Recheck when snapshot room or actor filtering changes. |
| `tests/e2e/lorecraft-playtest.spec.ts` | Covers Room Info visibility, current room details, NPC exclusion of the player, location update after accepted movement, empty NPC state, and reset back to Chapel. | Recheck when browser user paths change. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R2-S1 and R2-S2 | `src/features/play/room-info-card.test.ts` on 2026-07-08 | proves the Room Info NPC helper lists NPCs and excludes the player, including the no-NPC empty-list case. | Passing |
| R1-S1 through R3-S2 | `tests/e2e/lorecraft-playtest.spec.ts` updated on 2026-07-08 | browser coverage exists for Room Info display, canonical movement updates, empty NPC state, and reset behavior. | Added; not run in this apply pass |
| Supporting gate | `npm run ci:required` on 2026-07-08 | proves lint, 89 Vitest tests, typecheck, and production build pass with the Room Info component, play-layout import, browser spec updates, and documentation changes. | Passing |

#### Verification Gaps

- `npm run e2e` was updated but not executed during this apply pass because the local dev server is expected to keep using the Convex test port unless explicitly stopped.
- Manual visual review is still useful for whether the right rail balances the Player Card and keeps the story stream centered on the user's real viewport.

#### Story Notes

- Room Info is a player-facing projection of canonical current-location state, not a new location editor.
- Room Info deliberately does not expose exits, maps, traversal controls, object actions, raw IDs, or debug reset controls.
- `LC-001-S12` remains the owner of Location Cards and movement validation; this Story only surfaces the current room to the player.

## Cross-Story Concerns

- Slash commands are allowed only as pre-turn utility actions unless a later Story explicitly expands that boundary. They must not become hidden turns, story narrations, state diffs, movement commands, inventory commands, combat commands, or a broad MUD command parser by accident.
- Story inserts are the only player-authored pre-turn content that enters future story-visible history. Guide text and slash utility output must stay out of future normal story context unless a later Story explicitly changes that boundary.


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
