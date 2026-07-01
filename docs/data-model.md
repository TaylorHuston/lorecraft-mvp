---
modified: 2026-06-30
---
# Data Model

This is the canonical human-readable data model for the current Lorecraft MVP. It should match `convex/schema.ts` and the persistence behavior in `convex/world.ts`.

The model is intentionally small. It supports one editable playtest world, a resumable narrative feed, bounded Game Master calls, and a tiny readable NPC state surface.

## World

Table: `worlds`

A world is the top-level container for the current playtest state.

For the current MVP, the Stormbound Chapel world is resettable demo data. Reseeding creates a fresh demo world and deletes the previous deterministic demo world plus its dependent rows. Durable world identity and campaign/world-instance persistence are deferred.

| Field | Meaning |
|---|---|
| `slug` | Human-readable identifier for the seeded demo world. The MVP uses the deterministic slug `stormbound-chapel-default`. |
| `name` | Display name shown to the player/debug UI. |
| `description` | Stable baseline description of the world. Used as Game Master context. |
| `currentPlayerActorId` | The actor currently controlled by the player. Optional so seed/repair flows can create the world before wiring the player. |

Strategy:

- The MVP has one active deterministic demo world at a time.
- Later, canonical worlds will likely become templates and active play will happen in copied story instances.

## Room / Location

Table: `rooms`

A room is the current storage model for a lightweight Location Card. Product-facing language should generally call these `locations`; the backing table remains `rooms` for now to avoid churn.

| Field | Meaning |
|---|---|
| `worldId` | Owning world. |
| `key` | Stable location key used by code and seed data, such as `chapel`. |
| `name` | Player/debug display name. |
| `description` | Stable baseline location description. |

Strategy:

- Location Cards provide canonical scene context for the Game Master.
- Persistent Game Master requests include the current Location Card plus a compact list of known locations that can be movement targets.
- Clear narrative travel to an existing location can mutate actor `roomId` only through the post-narration extractor and Convex validation.
- Movement does not require linked exits yet; any existing location is eligible for this MVP slice.
- Unknown destinations are handled in narration/debug evidence and do not create canonical locations.
- A future `Dungeon` concept may add linked rooms, path constraints, locks, hazards, and stricter navigation, but that is not part of the current model.
- Dynamic room state should be stored as facts, not by rewriting `description`.

## Exit

Table: `exits`

An exit connects two rooms.

| Field | Meaning |
|---|---|
| `worldId` | Owning world. |
| `fromRoomId` | Room where the exit starts. |
| `toRoomId` | Room where the exit leads. |
| `label` | Direction or short affordance, such as `north` or `west`. |
| `visible` | Whether this exit is visible in the current world state. |

Strategy:

- Exits are visible context, not enforced movement constraints yet.
- Future movement can use this graph, but the current accepted movement path allows travel to any existing location after validation.

## Actor

Table: `actors`

An actor is a player or NPC in the world.

| Field | Meaning |
|---|---|
| `worldId` | Owning world. |
| `roomId` | Current location/room. This can change only through validated actor movement or explicit reset/debug tooling. |
| `key` | Optional stable actor key, such as `taylor` or `mira`. Used for facts and Game Master updates. |
| `name` | Display name. |
| `role` | `player` or `npc`. |
| `description` | Stable baseline identity and presentation. |

Strategy:

- Keep `description` stable for now.
- Put mutable state in actor-scoped facts.
- Actor location is canonical state, not transcript inference. The Game Master can propose actor moves only through the extractor, and Convex validates current-scene actor presence plus destination existence before patching `roomId`.
- Do not add an `npcs` table until NPC-specific behavior outgrows generic actors plus facts.

## World Object

Table: `worldObjects`

A world object is a visible thing in a room.

| Field | Meaning |
|---|---|
| `worldId` | Owning world. |
| `roomId` | Room containing the object. |
| `key` | Stable object key, such as `lantern`. |
| `name` | Player/debug display name. |
| `description` | Stable baseline object description. |
| `visible` | Whether the object is visible in the scene. |

Strategy:

- Use objects for things the Game Master can reference.
- Use facts for mutable object state, such as whether the lantern is broken or the shutters are open.
- Do not let generated prose silently create canonical objects yet.

## Fact

Table: `facts`

A fact is a flexible piece of durable state attached to a world, room, actor, object, or exit.

| Field | Meaning |
|---|---|
| `worldId` | Owning world. |
| `subjectType` | What kind of thing the fact is attached to: `world`, `room`, `actor`, `object`, or `exit`. |
| `subjectId` | Stable subject identifier. Actor facts currently use strings like `actor:mira`; object facts may use `object:<id>`. |
| `key` | Fact name, such as `background`, `persona`, `voice`, `mood`, `status`, `memory`, `knowledge`, or `open`. |
| `value` | Fact value. Can be string, number, boolean, or null. |
| `source` | Where the value came from: `seed`, `player`, `engine`, `llm`, or `manual`. |

Strategy:

- Facts are the MVP's main current-truth layer.
- Use facts before adding specialized tables.
- Keep keys consistent enough that code and prompts can filter them.
- Facts do not yet model visibility, confidence, or detailed provenance.

### Current NPC Fact Keys

| Key | Meaning | Update strategy |
|---|---|---|
| `background` | Short pre-player biography and social context. | Readable Game Master context. Should not become a full lore article. |
| `persona` | Temperament and decision style. | Readable Game Master context. Guides behavior without describing momentary emotion. |
| `voice` | Dialogue style and verbal habits. | Readable Game Master context. Guides how the NPC speaks. |
| `mood` | Current affect or attitude. | May be mutated only by the post-narration extractor after backend validation. |
| `status` | Durable current circumstance. | Readable Game Master context. Should not describe one-frame physical beats. |
| `memory` | Rolling summary of meaningful direct player interaction. | May be mutated only by the post-narration extractor after backend validation. |
| `knowledge` | Private or semi-private facts the NPC knows. | Hidden read-only Game Master context; ignored if returned as an attempted `npcUpdates` field. |

Strategy:

- Current-scene NPC actor fields and actor facts are included in persistent Game Master requests as read-only NPC profile context.
- Actor `description` is stable visible identity: physical presentation and immediately legible role. Put biography in `background`, behavior in `persona`, dialogue style in `voice`, current circumstance in `status`, and direct player history in `memory`.
- `knowledge` can shape narration and dialogue, but it is not automatically player-visible.
- Game Master-authored NPC mutation is allowed only through the post-narration extractor for `mood`, `status`, and `memory`.
- Game Master-authored actor movement is allowed only through the post-narration extractor for current-scene actors moving to existing locations.
- Debug NPC overrides are process-local server state, not Convex rows. They can temporarily override profile values in prompt context, but they disappear when the application server restarts.

Useful future fact keys:

- `occupation`
- `relationship.spouse`
- `relationship.parent`
- `allegiance`
- `secret`
- `appearance.scar`

These remain facts until graph queries, visibility rules, or creator UI pressure justify richer tables.

## Command

Table: `commands`

A command records player input. The name is historical; current MVP inputs are narrative text, not parsed commands.

| Field | Meaning |
|---|---|
| `worldId` | Owning world. |
| `turnId` | Optional scoped turn that owns this player input. Seed/legacy rows may omit it. |
| `actorId` | Actor who submitted the input. |
| `input` | Original trimmed player text. |
| `normalizedInput` | Lowercase normalized text for simple matching/debugging. |

Strategy:

- Record input before calling the provider.
- Use `turnId` as the durable grouping boundary for narrations, events, state diffs, and Game Master calls.
- Keep `commandId` on child rows as a direct link back to the player text.
- Do not treat player input as interpreted truth until the backend records accepted state.

## Turn

Table: `turns`

A turn is one persisted narrative exchange: one player intent plus the backend work caused by that intent.

| Field | Meaning |
|---|---|
| `worldId` | Owning world. |
| `sequenceNumber` | World-scoped ordering number assigned when the player input becomes persisted history. |
| `actorId` | Actor who initiated the turn. |
| `commandId` | Optional player input row for the turn. It is patched after the command is created. |
| `status` | Lifecycle state: `pending`, `succeeded`, or `failed`. |
| `error` | Optional failure message when provider or output handling fails after the turn exists. |
| `completedAt` | Optional timestamp set when the turn reaches a terminal state. |

Strategy:

- Turns are the canonical grouping layer for narrative play.
- A turn is created only after the request is valid enough to become persisted game history.
- Failed provider/output attempts remain as failed turns with linked command and Game Master call records.
- Malformed request bodies, missing LLM configuration, invalid world ids, and missing world state are rejected before a turn exists.
- Future rollback should attach snapshots to turn boundaries, but snapshots and restore behavior are deferred.

## Narration

Table: `narrations`

A narration is player-facing prose from the engine or Game Master.

| Field | Meaning |
|---|---|
| `worldId` | Owning world. |
| `turnId` | Optional scoped turn that caused this narration. Seed/legacy rows may omit it. |
| `commandId` | Optional player input that caused this narration. |
| `text` | Player-facing prose. |
| `source` | `seed`, `engine`, or `llm`. |

Strategy:

- Narration is part of the visible feed.
- Narration can contain transient beats without making them durable state.
- If a narrated change must matter later, persist a fact and state diff too.
- In transcript Game Master mode, LLM narrations still persist even though canonical world mutations are disabled.

## Event

Table: `events`

An event is a concise statement that something happened.

| Field | Meaning |
|---|---|
| `worldId` | Owning world. |
| `turnId` | Optional scoped turn that caused this event. Seed/legacy rows may omit it. |
| `commandId` | Optional player input associated with the event. |
| `text` | Concise event text. |
| `source` | `seed`, `player`, `engine`, `llm`, or `manual`. |

Strategy:

- Events are visible in the MVP feed for inspection.
- Events are not a replacement for queryable state.
- Event text should become more specific over time so playtesters can see what changed.

## State Diff

Table: `stateDiffs`

A state diff records accepted mutations for a turn.

| Field | Meaning |
|---|---|
| `worldId` | Owning world. |
| `turnId` | Optional scoped turn that accepted this diff. Seed/legacy rows may omit it. |
| `commandId` | Optional player input associated with the diff. |
| `source` | `player`, `engine`, `llm`, or `manual`. |
| `operations` | List of accepted mutation operations. |

Current operation types:

| Operation | Meaning |
|---|---|
| `moveActor` | Move an actor to a room/location after bounded extractor validation. |
| `setFact` | Set a durable fact value. |
| `appendEvent` | Record an event. |

Strategy:

- State diffs are the audit trail for accepted state changes.
- Diffs are not rollback by themselves; future rollback should use snapshots attached to turn boundaries.
- Add operation types only when the backend can validate and apply them consistently.

## Game Master Call

Table: `directorCalls`

A Game Master call records provider interaction and validation results.

| Field | Meaning |
|---|---|
| `worldId` | Owning world. |
| `turnId` | Optional scoped turn that owns this provider/debug record. Seed/legacy rows may omit it. |
| `commandId` | Optional player input associated with the call. |
| `provider` | Provider host/name derived from configuration. |
| `model` | Configured model string. |
| `requestSummary` | Compact summary of the request shape, not a full prompt dump. |
| `rawRequest` | Optional exact provider messages sent to the LLM. |
| `rawResponse` | Optional raw provider text. Useful for debugging invalid outputs. |
| `parsedResponse` | Optional parsed structured output. |
| `status` | `success`, `provider_error`, or `invalid_output`. |
| `acceptedUpdates` | NPC updates and actor movement proposals accepted by validation. |
| `ignoredUpdates` | NPC updates, actor moves, or fields rejected by validation. |
| `error` | Optional error message. |

Strategy:

- Game Master calls are diagnostics, not canonical game state.
- They explain provider failures, invalid JSON, accepted updates, and ignored updates.
- A persistent turn can have two Game Master calls: `story_generation` for the plain-prose narration and `npc_state_extraction` for bounded NPC fact extraction plus actor movement extraction.
- Do not use this table as the source of truth for what the world remembers.
- Current request summaries include compact prompt/debug metadata such as `directorMode`, `callRole`, `outputContract`, prompt component keys, read-only knowledge keys, required scene beat, and effective generation settings.
- Story-generation calls use `outputContract: "plain_prose"` and do not carry accepted NPC updates.
- NPC-state extraction calls use `outputContract: "json_npc_updates"` and may carry accepted or ignored updates for `mood`, `status`, and `memory`, plus accepted or ignored actor moves to existing locations.
- `rawRequest` is omitted by default and only stored when local raw request debug storage is explicitly enabled. It can contain hidden NPC knowledge, prompt guidance, and player text, so it is diagnostic evidence rather than canonical game state.

## Game Master Prompt Context

There is no separate prompt table. Game Master prompt context is derived per turn from current Convex state plus local engine logic.

| Component | Source | Meaning |
|---|---|---|
| `promptGuidance` | Debug UI request input | Per-turn text guidance for style, NPC behavior, and persistence strategy during playtesting. |
| `aiInstructions` | Editable backend configuration plus per-turn guidance | Story-first behavior, dialogue allowance, post-narration persistence boundary, and current playtest guidance. |
| `world` | Derived from world, room, exit, object, and player rows | Current world, room, baseline scene description, visible exits, visible objects, and player identity. |
| `locationCard` | Derived from the current room/location, room facts, visible objects, exits, and present actors | Canonical current-location card for persistent Game Master context. |
| `knownLocations` | Derived from existing room rows | Compact list of valid movement destinations for the current world. |
| `npcCards` | Rendered from current-scene NPC profiles and temporary debug overrides | Card-like story memory the Game Master should treat as canonical NPC context. |
| `recentStory` | Derived from commands, narrations, and events | Bounded recent story context without internal turn or command IDs. |
| `currentInput` | Current request body | The player's narrative intent for this turn. |
| `gameMasterNarration` | Completed story-generation call | Extractor-only input containing the player-facing narration to inspect for durable NPC changes. |
| `output` | Backend output contract | Story generation asks for player-facing prose only; state extraction asks for JSON `npcUpdates` and `actorMoves`. |

Strategy:

- Prompt context is diagnostic/request state, not canonical world state.
- Prompt guidance text is an experimental playtest control. It should guide narration, not override schema, validation, hidden knowledge boundaries, or durable-state rules.
- Generation settings are developer configuration and are summarized in Game Master call debug metadata.
- Persistent story generation now uses `outputContract: "plain_prose"` and requests player-facing narration only. The backend wraps that prose as a parsed response with an empty `npcUpdates` array.
- Structured mutation lives in a separate extractor step so story prose and state-diff JSON can use different prompts, settings, or models.
- Persistent prompt priority is explicit: `currentInput` comes first; `locationCard`, `knownLocations`, `npcCards`, and `world` are canonical current scene truth; `recentStory` is lower-priority continuity and may contain stale prose.
- If `recentStory` conflicts with `locationCard`, `knownLocations`, `npcCards`, or `world`, the Game Master should follow the canonical card/world context.
- Required scene beats should stay narrow until playtesting proves broader automation is needed. They currently belong to the persistent mode path, not transcript mode.
- Trivial physical actions such as `I jump.` derive a `trivial_player_action` scene beat that avoids forcing NPC speech; passing reactions stay in narration/debug instead.

## Derived Feed Entry

There is no `feedEntries` table. Feed entries are derived by combining commands, narrations, and events.

| Field | Meaning |
|---|---|
| `id` | Stable derived ID with a prefix, such as `command:<id>`, `narration:<id>`, or `event:<id>`. |
| `kind` | `player`, `director`, or `event`. |
| `text` | Text to display. |
| `source` | Source label from the underlying row. |
| `createdAt` | Creation time from the underlying row. |
| `turnId` | Optional scoped turn that caused the entry. |
| `commandId` | Optional direct player-input link. |

Strategy:

- Keep feed derived until editing, branching, streaming, or multiplayer ordering requires a timeline table.
- Use stable derived IDs as React keys.

## Local Debug Log

File: `logs/director-debug.jsonl`

The local debug log is not a Convex table. It is opt-in diagnostic output for local troubleshooting.

| Field type | Meaning |
|---|---|
| Route stage | Where the request was accepted, rejected, or failed. |
| Provider/model | Which local or remote model endpoint was used. |
| Request summary | Compact context summary. |
| Outcome/error | Success, validation failure, provider failure, or route error. |
| Counts/timings | Accepted update count, ignored update count, response metadata, and timing data. |
| IDs | World, turn, and command ids when the route has persisted them. |

Strategy:

- Enable with `LORECRAFT_DEBUG_LOG=1`.
- Raw LLM text is omitted unless `LORECRAFT_DEBUG_LOG_RAW_LLM=1`.
- Logs are gitignored and never canonical state.

## Deferred Objects

These are likely future objects, but they are not part of the current canonical model:

| Object | When it becomes useful |
|---|---|
| `Relationship` | When spouse, parent, rival, ally, faction, debt, fear, or loyalty need graph traversal or consequence propagation. |
| `NpcMemory` | When one rolling `memory` fact cannot support long-running play. |
| `ActorAppearance` | When physical continuity, portraits, injuries, outfits, or hidden/visible traits need structure. |
| `NpcBehaviorProfile` | When NPCs need autonomous goals, schedules, instincts, or behavior packages. |
| `AdjudicationCheck` | When hidden TTRPG-style uncertainty needs structured check category, difficulty, stakes, result, and debug evidence. |
| `AdjudicationOutcome` | When roll outcomes need durable replay, rollback, audit, or later explanation beyond narration text. |
| `TimelineEntry` | When derived feed reconstruction plus scoped turns is not enough for replay, branching, streaming, or multiplayer ordering. |
| `TurnSnapshot` | When rollback needs a concrete world-state restore point at a turn boundary. |
| `StoryInstance` | When players need independent mutable copies of canonical world templates. |

Do not add these until the current model hits a concrete playtest or implementation failure.
