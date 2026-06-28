# Persistence System

Lorecraft is built around one product idea: the world should remember because the world has state, not because an LLM transcript happens to include the right sentence.

The Director is allowed to narrate, interpret player intent, and propose small changes. Convex remains the canonical source of truth. Every provider call is rebuilt from persisted state plus a bounded recent feed, so Lorecraft does not depend on hidden provider sessions, assistant threads, or remote memory.

For the canonical object and field reference, see [`data-model.md`](data-model.md).

## What Persistence Means Here

Persistence is not just "save the chat."

The chat transcript is useful history, but it is not enough to make a world coherent. If Mira is angry, if a lantern is broken, if the shutters are open, or if an NPC remembers that Taylor made a promise, those things need to be stored as explicit state that the engine can query later.

In the MVP, that state is intentionally small:

- Seeded world objects describe the baseline world.
- Facts represent current durable truth.
- Commands, narrations, and events reconstruct the visible play feed.
- Turns group each persisted player intent with the Director work it caused.
- State diffs record accepted mutations.
- Director calls and local logs explain what happened during LLM/provider interactions.

## Core Strategy

### The Database Is The World

Convex stores the current world. If the database says the shutters are closed, the Director should treat them as closed. If the Director implies otherwise, that implication is just prose unless the backend accepts and stores a state change.

### The LLM Proposes, The Backend Decides

Director output is untrusted structured input. The backend parses it, validates it, accepts only allowed changes, ignores the rest, and records the decision.

For the current MVP, the Director may only update current-scene NPC facts for:

- `mood`
- `status`
- `memory`

It may not directly mutate rooms, exits, actor locations, inventory, combat state, HP, object state, or arbitrary world facts.

### Recent Context Is Not Durable Truth

Recent feed context helps the Director write coherent prose. It should not be the only place important state exists.

The practical rule:

- If it only matters for the next sentence, leave it in narration.
- If it should matter after the recent feed falls away, persist it as state.
- If it changes state, record a state diff.

### History And Current State Are Separate

The transcript says what happened. Facts say what is true now. State diffs say what mutations the backend accepted.

This separation is the main defense against AI Dungeon-style drift. A model can forget or embellish prose; the engine should still be able to reconstruct the current scene from canonical state.

## How A Narrative Turn Works

Current synchronous flow:

1. The player submits narrative input.
2. The route validates the request and LLM configuration.
3. The route loads bounded Director context from Convex.
4. Convex creates a pending turn with the next world-scoped sequence number.
5. Convex records the player input command and links it to the turn.
6. The backend builds a stateless provider request from current state plus recent feed.
7. The provider returns strict JSON with `narration` and optional `npcUpdates`.
8. The backend parses and validates the output.
9. Convex records the Director call for debugging and links it to the turn.
10. On success, Convex stores the narration and marks the turn `succeeded`.
11. Convex applies accepted NPC fact changes.
12. Convex stores turn-linked events and state diffs for accepted changes.
13. On provider or output failure after the turn exists, Convex keeps the command and Director call, marks the turn `failed`, and does not store fake narration or state changes.
14. The UI updates from Convex state.

The important bit is that the provider does not own continuity. The next turn starts from Convex again.

Request failures that happen before game history is persisted do not create turns. Examples include malformed request bodies, missing `LLM_BASE_URL`/`LLM_API_KEY`/`LLM_MODEL`, invalid world ids, and missing required world state.

## NPC State Strategy

The current MVP keeps NPC state deliberately small. Mira has a stable actor description plus three mutable actor facts.

### `description`

The stable baseline of who the actor is. It can include physical presentation, role, and overall vibe.

Example:

```text
A careful local who watches the storm and notices when the chapel changes.
```

Do not use `description` as live state. If Mira becomes injured, angry, married, armed, suspicious, or indebted, that belongs in facts or future relationship/appearance structures.

### `mood`

The NPC's current affect or attitude.

Good examples:

- `watchful`
- `concerned`
- `angry at Taylor`
- `relieved but guarded`

`mood` should shape near-term behavior, but it should not become biography or a full relationship summary.

### `status`

The NPC's durable current circumstance.

Good examples:

- `waiting near the chapel aisle`
- `injured and seated on the altar steps`
- `locked in the vestry`
- `refusing to leave until the storm breaks`

Avoid storing momentary beats as status:

- `flinched`
- `stumbled`
- `looked at Taylor`
- `was pushed`

Those can stay in narration or recent feed unless they create an ongoing condition.

### `memory`

A compact rolling summary of meaningful direct interactions with the player.

Example:

```text
Mira remembers Taylor asking about the storm, promising to check the shutters, and speaking gently after she warned him away from the graveyard.
```

`memory` is not an audit log. It should not absorb occupation, spouse, faction, visible condition, every recent action, or stable biography. Older details can be merged, compressed, or dropped as newer interactions become more important.

## Feed Strategy

The visible play feed is reconstructed from persisted rows:

- Player input from `commands`.
- Director prose from `narrations`.
- Concise happenings from `events`.

Events are currently shown in the feed because they help us inspect whether the world is changing. If they become noisy, we can filter them later without changing what the canonical state is.

Feed entries include `turnId` when they were caused by a narrative turn, but the player-facing stream should still read as a story rather than as rigid turn cards. Turn grouping belongs in backend/debug surfaces until the story UI needs it.

## Debug Strategy

Debug records are intentionally separate from story state.

`directorCalls` stores provider/model metadata, request summaries, raw or parsed output, accepted updates, ignored updates, and errors. Local JSONL logging can also be enabled for troubleshooting route stages and timing.

These records are evidence. They help explain why a turn behaved a certain way. They should not become the source of truth for the world.

The debug panel also exposes recent turn summaries: sequence number, status, player input, related narration/event/diff counts, and Director call status. This is the first place to inspect whether a failed provider/output attempt was persisted correctly.

## Reset Strategy

The MVP has one editable world and a rough reset. Reset clears scoped turns, playtest history, and debug records, then restores Mira's baseline `mood`, `status`, and `memory`.

It does not delete the seeded world graph.

Long term, reset is not the product model. The likely product model is independent story/play-session instances created from world templates, but that is intentionally deferred until the single-world persistence loop proves itself.

## Rollback Strategy

Rollback is deferred, but turn boundaries are the intended attachment point.

The likely future implementation is snapshot-based: capture or derive a restorable world-state snapshot at a completed turn boundary, then restore the world to that snapshot. Current state diffs are useful audit records, but they are not sufficient rollback machinery because they do not capture all before-state and would become hard to invert safely as operations grow.

This MVP does not add snapshot tables, reverse-diff logic, branching timelines, restore mutations, or rollback UI.

## When To Add More Structure

Flexible facts are the starting point. Dedicated tables should be added only when a concrete problem appears.

Likely future promotions:

- `relationships` when spouse, parent, rival, ally, faction, debt, fear, or loyalty need graph queries.
- `npcMemories` when one rolling `memory` fact cannot support long-running play.
- `actorAppearance` when physical continuity, portrait generation, outfits, scars, or visibility rules need structure.
- `npcBehaviorProfiles` when NPCs need autonomous goals, schedules, or behavior packages.
- `timeline` when scoped turns plus derived feed reconstruction are not enough for replay, branching, streaming, or multiplayer ordering.
- `turnSnapshots` when rollback needs a concrete world-state restore point at a turn boundary.
- `storyInstances` when play sessions need independent mutable copies of canonical worlds.

The bias should stay simple: add structure when flexible facts fail, not when a cleaner architecture can be imagined.

## Maintenance Rule

Update this document when the persistence strategy changes. Update [`data-model.md`](data-model.md) when the object model, fields, or field meanings change.
