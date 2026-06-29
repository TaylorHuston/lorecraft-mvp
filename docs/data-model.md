# Data Model

This is the canonical human-readable data model for the current Lorecraft MVP. It should match `convex/schema.ts` and the persistence behavior in `convex/world.ts`.

The model is intentionally small. It supports one editable playtest world, a resumable narrative feed, bounded Director calls, and a tiny mutable NPC state surface.

## World

Table: `worlds`

A world is the top-level container for the current playtest state.

For the current MVP, the Stormbound Chapel world is boot-scoped demo data. Reseeding creates a fresh demo world and deletes prior demo worlds plus their dependent rows. Durable world identity and campaign/world-instance persistence are deferred.

| Field | Meaning |
|---|---|
| `slug` | Human-readable identifier for the seeded demo world. The MVP uses a `stormbound-chapel-*` boot-scoped slug. |
| `name` | Display name shown to the player/debug UI. |
| `description` | Stable baseline description of the world. Used as Director context. |
| `currentPlayerActorId` | The actor currently controlled by the player. Optional so seed/repair flows can create the world before wiring the player. |

Strategy:

- The MVP has one active boot-scoped demo world at a time.
- Later, canonical worlds will likely become templates and active play will happen in copied story instances.

## Room

Table: `rooms`

A room is a location in the world graph.

| Field | Meaning |
|---|---|
| `worldId` | Owning world. |
| `key` | Stable room key used by code and seed data, such as `chapel`. |
| `name` | Player/debug display name. |
| `description` | Stable baseline room description. |

Strategy:

- Rooms provide scene context for the Director.
- Narrative movement does not currently mutate room or actor-location state.
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

- Exits are context, not an active movement system yet.
- Future movement can use this graph, but the current Director path only narrates movement attempts.

## Actor

Table: `actors`

An actor is a player or NPC in the world.

| Field | Meaning |
|---|---|
| `worldId` | Owning world. |
| `roomId` | Current room. This is stable during the current narrative-only MVP flow. |
| `key` | Optional stable actor key, such as `taylor` or `mira`. Used for facts and Director updates. |
| `name` | Display name. |
| `role` | `player` or `npc`. |
| `description` | Stable baseline identity and presentation. |

Strategy:

- Keep `description` stable for now.
- Put mutable state in actor-scoped facts.
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

- Use objects for things the Director can reference.
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
| `key` | Fact name, such as `mood`, `status`, `memory`, `open`, or `knows_about_storm`. |
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
| `mood` | Current affect or attitude. | May change when the interaction meaningfully shifts the NPC's near-term behavior. |
| `status` | Durable current circumstance. | Should not change for one-frame physical beats unless they create an ongoing condition. |
| `memory` | Rolling summary of meaningful direct player interaction. | Keep compact; current MVP caps accepted memory text at 500 characters. |

### Current Read-only NPC Knowledge Keys

| Key | Meaning | Update strategy |
|---|---|---|
| `knows_about_storm` | Seeded hidden context about what Mira knows and why she may not say it plainly. | Read-only Director context; ignored if returned as an attempted `npcUpdates` field. |

Strategy:

- Current-scene actor facts outside `mood`, `status`, and `memory` are included in Director requests as hidden read-only knowledge.
- Read-only facts can shape narration and dialogue, but they are not automatically player-visible.
- The Director still cannot mutate read-only facts. Only backend-validated `mood`, `status`, and `memory` updates are accepted in the MVP.

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
- Use `turnId` as the durable grouping boundary for narrations, events, state diffs, and Director calls.
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
- Failed provider/output attempts remain as failed turns with linked command and Director call records.
- Malformed request bodies, missing LLM configuration, invalid world ids, and missing world state are rejected before a turn exists.
- Future rollback should attach snapshots to turn boundaries, but snapshots and restore behavior are deferred.

## Narration

Table: `narrations`

A narration is player-facing prose from the engine or Director.

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
- In transcript Director mode, LLM narrations still persist even though canonical world mutations are disabled.

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
| `moveActor` | Move an actor to a room. Present in schema, not used by narrative Director turns yet. |
| `setFact` | Set a durable fact value. |
| `appendEvent` | Record an event. |

Strategy:

- State diffs are the audit trail for accepted state changes.
- Diffs are not rollback by themselves; future rollback should use snapshots attached to turn boundaries.
- Add operation types only when the backend can validate and apply them consistently.

## Director Call

Table: `directorCalls`

A Director call records provider interaction and validation results.

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
| `acceptedUpdates` | NPC updates accepted by validation. |
| `ignoredUpdates` | NPC updates or fields rejected by validation. |
| `error` | Optional error message. |

Strategy:

- Director calls are diagnostics, not canonical game state.
- They explain provider failures, invalid JSON, accepted updates, and ignored updates.
- Do not use this table as the source of truth for what the world remembers.
- Current request summaries include compact prompt/debug metadata such as `directorMode`, `outputContract`, prompt component keys, read-only knowledge keys, required scene beat, and effective generation settings.
- In transcript mode, `acceptedUpdates` and `ignoredUpdates` are empty and `parsedResponse` is normalized to a narration with no `npcUpdates`.
- `rawRequest` is omitted by default and only stored when local raw request debug storage is explicitly enabled. It can contain hidden NPC knowledge, prompt guidance, and player text, so it is diagnostic evidence rather than canonical game state.

## Director Prompt Context

There is no separate prompt table. Director prompt context is derived per turn from current Convex state plus local engine logic.

| Component | Source | Meaning |
|---|---|---|
| `directorInstructions` | Editable backend configuration | Story-first behavior, output shape, dialogue allowance, and persistence boundaries. |
| `authorToneGuidance` | Editable backend configuration | Current prose style and interaction guidance. |
| `promptGuidance` | Debug UI request input | Per-turn text guidance for style, NPC behavior, and persistence strategy during playtesting. |
| `sceneState` | Derived from world and room rows | Current world, room, and baseline scene descriptions. |
| `visibleFacts` | Derived from current scene rows and mutable actor facts | Exits, objects, actors, descriptions, and mutable NPC state facts. |
| `hiddenNpcKnowledge` | Derived from current-scene actor facts outside mutable keys | Read-only NPC knowledge available to the Director but not automatically visible to the player. |
| `recentFeed` | Derived from commands, narrations, and events | Bounded recent story context without internal turn or command IDs. |
| `playerInput` | Current request body | The player's narrative intent for this turn. |
| `requiredSceneBeat` | Derived by backend logic | Lightweight guidance such as "Mira was directly asked a question; a meaningful response is expected." |

Strategy:

- Prompt context is diagnostic/request state, not canonical world state.
- Prompt guidance text is an experimental playtest control. It should guide narration, not override schema, validation, hidden knowledge boundaries, or durable-state rules.
- Generation settings are developer configuration and are summarized in Director call debug metadata.
- Persistent mode uses `outputContract: "json_npc_updates"` and requests strict JSON. Transcript mode uses `outputContract: "plain_prose"` and requests plain story prose from the opening seed plus transcript only.
- Required scene beats should stay narrow until playtesting proves broader automation is needed. They currently belong to the persistent mode path, not transcript mode.
- Trivial physical actions such as `I jump.` derive a `trivial_player_action` scene beat that disallows durable NPC updates for that turn; passing reactions stay in narration/debug instead.

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
| `TimelineEntry` | When derived feed reconstruction plus scoped turns is not enough for replay, branching, streaming, or multiplayer ordering. |
| `TurnSnapshot` | When rollback needs a concrete world-state restore point at a turn boundary. |
| `StoryInstance` | When players need independent mutable copies of canonical world templates. |

Do not add these until the current model hits a concrete playtest or implementation failure.
