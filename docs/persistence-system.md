# Persistence System

Lorecraft is built around one product idea: the world should remember because the world has state, not because an LLM transcript happens to include the right sentence.

The Game Master is allowed to narrate and interpret player intent. Convex remains the canonical source of truth. Persistent-mode provider calls are rebuilt from canonical state plus bounded story-visible narration history, so Lorecraft does not depend on hidden provider sessions, assistant threads, or remote memory.

For the canonical object and field reference, see [`data-model.md`](data-model.md).

## What Persistence Means Here

Persistence is not just "save the chat."

The chat transcript is useful history, but it is not enough to make a world coherent. If Mira is angry, if a lantern is broken, if the shutters are open, or if an NPC remembers that Taylor made a promise, those things need to be stored as explicit state that the engine can query later.

In the MVP, that state is intentionally small:

- WorldVersions describe the authored baseline.
- Adventures contain the mutable playable copy of that baseline.
- Facts represent current durable truth.
- The Player Card represents Adventure-owned protagonist context.
- The Room Info panel represents the player's current room/location context.
- Commands, narrations, Story inserts, events, and utility messages reconstruct the visible play feed.
- Turns group each resolved story beat with the Game Master work it caused.
- State diffs record accepted mutations.
- Game Master calls and local logs explain what happened during LLM/provider interactions.

## Core Strategy

### The Database Is The Adventure Runtime

Convex stores the current Adventure runtime. If the selected Adventure says the shutters are closed, the Game Master should treat them as closed. If the Game Master implies otherwise, that implication is just prose unless the backend accepts and stores a state change.

### The LLM Reads, The Backend Decides

Game Master output is untrusted model output. The story-generation step returns player-facing prose, and the backend wraps that prose into the existing turn result shape with no state updates from the prose itself.

Persistent mode gives the Game Master current Location Cards, known locations, and current-scene NPC Cards as canonical read context. The model can write story prose from that context, but prose is not accepted as state by itself.

The Player Card is also canonical read context. It carries the Adventure player's name, current location, optional physical description, optional backstory, and optional current status. The Game Master can use those details to ground perception and continuity, but it must not use them to decide new player intent, speech, thoughts, feelings, or goals.

The Room Info panel is a player-facing projection of the current Location Card. It shows the current room name, room description, and NPCs whose canonical actor location matches the player's current room. Selecting an NPC reads a typed, subject-complete profile directly from canonical Adventure state rather than the bounded debug fact feed. It is not a movement map, location editor, or transcript inference surface.

Structured state mutation returns through a separate extractor step rather than being mixed into the creative writing response. The extractor reads the current action or Pass trigger, completed narration, current Location Card, Known Locations, NPC Cards, and the same story-visible narration history as story generation, then may propose bounded `npcUpdates` and `actorMoves` for backend validation.

The Game Master may not directly mutate rooms, exits, inventory, combat state, HP, object state, or arbitrary world facts. NPC facts and actor locations can change only through the bounded extractor and Convex validation. The extractor is also bounded by completed narration support: it cannot turn a transient beat or weaker phrase into a stronger durable fact just because that fact would be dramatic.

### Recent Context Is Not Durable Truth

Recent story-visible narration helps the Game Master write coherent prose. It should not be the only place important state exists.

The practical rule:

- If it only matters for the next sentence, leave it in narration.
- If it should matter after the recent feed falls away, persist it as state.
- If it changes state, record a state diff.

### History And Current State Are Separate

The transcript says what happened. Facts say what is true now. State diffs say what mutations the backend accepted.

This separation is the main defense against AI Dungeon-style drift. A model can forget or embellish prose; the engine should still be able to reconstruct the current scene from canonical state.

## Product Direction

Lorecraft should feel like a TTRPG-style Game Master, not a lightweight MUD and not a fully random chat storyteller.

The desired long-term shape is:

- AI Dungeon-style story flow.
- Structured, updateable Story Cards that the Game Master treats as canonical context.
- Selective hidden adjudication when the fiction contains meaningful uncertainty.
- Durable memory for facts that should survive context-window loss.

The Game Master should own prose, pacing, dialogue, NPC portrayal, and local interpretation. The backend should own durable truth, context assembly, validation, and any hidden adjudication results that must be inspectable or replayable.

Do not turn the player-facing interface into commands, movement grids, combat turns, HP tracking, or a rules-heavy simulator unless a future playtest proves that specific structure is necessary. If a later TTRPG layer is added, it should work like a GM tool: call for a check only when an attempted action is risky, opposed, uncertain, and consequential.

Early adjudication should be deliberately small:

- Broad check category, such as social, physical, perception, or knowledge.
- Simple difficulty, such as easy, medium, or hard.
- A hidden random result.
- A visible story consequence.
- Debug evidence of what was rolled and why.

Do not add character stats, inventory, combat rounds, relationship scores, spell slots, or NPC schedules preemptively. Start from Story Cards and prompt quality; add adjudication only when pure narration creates repeated arbitrary or consequence-free outcomes.

## How Story, Guide, And Narrative Turns Work

Story, Guide, Act, Pass, and slash utilities are deliberately different categories.

- `Story` records player-authored canonical prose as a visible Story insert. It does not call the provider, create a turn, run extraction, or mutate state by itself.
- `Guide` creates a resolving turn from hidden current-turn steering. The raw Guide text is not shown in the story stream and is not future story-visible history.
- `Act` creates a resolving turn with player prose and a command row.
- `Pass` creates a resolving turn without player prose or a command row.
- Slash utilities such as `/help` and `/look` remain pre-turn helper output.

Story inserts let the player set a little more scene before the next resolving turn. The next Act, Pass, or Guide prompt includes recent Story inserts as accepted scene content, but durable state changes still wait for a later Game Master narration plus extractor validation.

Current synchronous flow:

1. The player either submits narrative input, clicks Pass, or submits hidden Guide steering.
2. The route validates the request and LLM configuration.
3. The route loads bounded Game Master context from Convex.
4. Convex creates a pending turn with the next Adventure-scoped sequence number and a trigger of `act`, `pass`, or `guide`.
5. For action turns, Convex records the player input command and links it to the turn. Pass and Guide turns do not create command rows or fake player prose.
6. The backend builds a stateless provider request from compact prompt sections: AI instructions, world, Player Card, current Location Card, Known Locations, NPC Cards, bounded story-visible narration history, current input, Pass directive, or hidden Guide directive, and output guidance.
7. The provider returns player-facing story prose.
8. The backend parses the prose into a normalized turn result with `narration` and an empty `npcUpdates` array.
9. Convex records the Game Master call for debugging and links it to the turn. By default this stores a compact request summary and raw provider response; exact provider request messages are stored only when local raw request debug storage is explicitly enabled.
10. On success, Convex stores the narration and marks the turn `succeeded`.
11. Persistent mode runs a separate JSON state extraction request after successful narration.
12. The backend validates proposed NPC updates and actor moves. Accepted NPC updates can change `mood`, `status`, and `memory`; accepted actor moves can move the player or current-scene NPCs to existing locations. Momentary or overreaching NPC fact proposals are ignored and retained as debug evidence. For Guide turns, extraction sees the Guide trigger and completed narration but not the raw Guide text as canonical player prose.
13. Convex records accepted mutations as canonical facts or actor `roomId` changes plus turn-scoped state diffs. Ignored proposals remain debug evidence.
14. On provider or output failure after the turn exists, Convex keeps the turn and Game Master call, keeps the command for action turns, marks the turn `failed`, and does not store fake narration or state changes.
15. The UI updates from Convex state.

The important bit is that the provider does not own continuity. The next turn starts from Convex again.

Exact raw request storage is diagnostic evidence only. It can include hidden NPC knowledge, prompt guidance, and player text, so it is omitted by default and should not be treated as canonical game state.

Request failures that happen before game history is persisted do not create turns. Examples include malformed request bodies, missing `LLM_BASE_URL`/`LLM_API_KEY`/`LLM_MODEL`, invalid Adventure ids, and missing required Adventure state.

## Pre-Turn Utility Commands

Slash commands are utility actions inside the player's decision phase. They are not narrative turns.

Current commands:

- `/help` returns deterministic engine help text.
- `/look` asks for an observational description of the current scene.
- `/look <target>` asks for an observational description of a visible/current-context actor, object, or location.

Utility command results are persisted as `utilityMessages` so reload/resume keeps them visible in the feed. They do not create rows in `turns`, `commands`, `narrations`, `events`, or `stateDiffs`, and they do not run post-narration state extraction.

The prompt boundary is explicit: future Game Master turns use canonical Adventure state plus `loadStoryVisibleHistory`, which reads successful narrations and seed narration. Utility output is excluded from that history. If a player learns something from `/look` and then acts on it, the later Act is what the Game Master evaluates as story input.

## Story Inserts And Guide Turns

Story inserts are narration-like rows with `source = "player"`. They are visible in the story stream, survive reload, and enter `loadStoryVisibleHistory` with a label that tells the Game Master they are accepted canonical scene content.

Story inserts are not state mutation. If the player authors "the lantern shatters" as Story setup, the next resolving turn can narrate consequences from that setup, but durable facts or actor movement still need the normal post-narration extraction and validation path.

Guide turns are commandless turns with `trigger = "guide"` and capped `hiddenGuidance`. The story-generation request includes the hidden Guide as current-turn steering. The resulting Game Master narration is normal story-visible narration. Raw Guide text remains debug evidence and is excluded from player-facing feed text, future story-visible history, and extraction as canonical player prose.

## Game Master Modes

Lorecraft currently has two Game Master modes. The application server selects the mode at startup with `LORECRAFT_DIRECTOR_MODE`.

### Persistent mode

Persistent mode is the default. It uses a plain-prose Game Master contract for the creative story step. The backend stores the returned prose as narration, then runs a separate bounded state extraction step.

Use this mode to test Lorecraft's state-first thesis: the transcript and debug records move forward, canonical NPC profile data can mutate only through accepted extractor updates, and actor locations can move only to existing known locations after validation.

This keeps story writing and persistence decisions separate. A future smaller extractor model or rule layer can replace or supplement the current extraction pass without changing the player-facing prose contract.

## Demo World Lifetime

For this MVP experiment, the seeded demo Worlds are not durable product data. The seed mutation creates a fresh deterministic Stormbound Chapel World with an immutable WorldVersion and a default Stormbound Chapel Adventure, deletes the prior deterministic Stormbound Chapel World and its Adventures, WorldVersions, and runtime rows, and ensures the Tutorial World exists without deleting existing Tutorial Adventures. Use Reset World when a Stormbound Chapel playtest needs to return to the initial authored setup.

Reset Session is narrower: it deletes the selected Adventure's mutable runtime rows and recopies that Adventure's original source WorldVersion. If the World has a newer current WorldVersion, Reset Session does not upgrade the Adventure to it.

Reset Session preserves the current Adventure's player name and Player Card optional profile fields while resetting the rest of the runtime copy back to the source WorldVersion. This keeps the player-created character identity from disappearing during ordinary playtest resets.

Delete Adventure is narrower than Reset World and broader than Reset Session: it removes one local Adventure and its mutable runtime rows, while leaving the source WorldVersion available for future Adventures.

This keeps playtesting focused on the initial seed, transcript behavior, prompt shape, and Game Master loop. The MVP has a lightweight local World container screen at `/` that lists seeded Worlds such as Stormbound Chapel and Tutorial, with Adventures inside each container for continue/create/delete. Each Adventure opens at `/adventures/<id>`. Polished World management, source patching, branching, and long-lived save files are deferred until the core story loop is worth preserving.

### Transcript mode

Transcript mode is enabled with:

```bash
LORECRAFT_DIRECTOR_MODE=transcript
```

The name means "no canonical world mutation from the Game Master response." It does not mean "nothing is saved."

Transcript turns still save:

- the scoped turn
- the player input command
- the Game Master narration
- the Game Master call debug record
- local debug logs when enabled

Transcript turns do not save or consume as live prompt truth:

- accepted NPC fact updates
- ignored NPC update validation records
- LLM-authored world events
- LLM-authored state diffs
- room, exit, object, actor-location, inventory, combat, or rule changes
- current room state, current actor presence, exits, object state, readable NPC profiles/facts, or hidden NPC knowledge

The provider request uses a canonical opening seed plus the actual player/Game Master transcript. It asks for plain prose rather than strict JSON. The transcript is the source of runtime story continuity: if the transcript says the player traveled away from the chapel, the next turn continues from that transcript rather than snapping back to the canonical `chapel` room. This creates a comparison baseline: if prose improves when runtime world-state pressure is removed, persistence can be reintroduced one layer at a time.

## NPC State Strategy

The current MVP keeps NPC state deliberately small. The seeded demo NPCs, currently Mira, Brother Alden, Rowan, and Lena, have stable actor descriptions plus readable actor facts. Those fields ground narration and NPC behavior. The Game Master does not mutate them directly in prose; a separate extractor may propose bounded `mood`, `status`, and `memory` updates after narration, and Convex validates those proposals before they become canonical. The validation boundary is intentionally conservative: if the proposed fact would not still matter several turns later, or if it says more than the completed narration actually established, it should stay in narration instead of becoming state.

### `description`

The stable visible baseline of who the actor is. It should describe physical presentation and immediately legible identity or role.

Example:

```text
A local woman in practical rain-dark clothes, with damp dark hair and watchful eyes.
```

Do not use `description` as live state, biography, personality, or memory. If Mira becomes injured, armed, suspicious, indebted, or known to the player in a new way, that belongs in facts or future relationship/appearance structures.

### `background`

A short summary of the NPC's life and social context before direct player interaction.

Example:

```text
Mira grew up around Stormbound Chapel and learned its routines from older caretakers.
```

`background` should answer "where did this person come from?" without becoming a novel. It is not the place for current mood, current location, recent player conversations, or private secrets the player should not automatically learn.

### `persona`

The NPC's temperament and decision style.

Example:

```text
Cautious, observant, and slow to trust.
```

`persona` helps the Game Master decide how Mira reacts. It should describe stable behavioral tendencies, not one-turn emotion. Use `mood` for current affect.

### `voice`

The NPC's dialogue style and verbal habits.

Example:

```text
Plain-spoken and restrained, with short practical warnings.
```

`voice` helps the Game Master write NPC dialogue consistently. It should not contain facts the player is meant to discover or the literal lines the NPC must say.

### `mood`

The NPC's current affect or attitude.

Good examples:

- `watchful`
- `concerned`
- `angry at Taylor`
- `relieved but guarded`

`mood` should shape near-term behavior, but it should not become biography, physical incapacity, or a full relationship summary. In the current MVP it may be updated only by the post-narration extractor when the completed story clearly creates a durable affective change.

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

Those can stay in narration or recent feed unless they create an ongoing condition. In the current MVP, stored `status` may be updated only by the post-narration extractor when the completed story clearly creates a durable circumstance. The backend rejects extractor proposals that intensify narration into stronger facts without direct textual support.

### `memory`

A compact rolling summary of meaningful direct interactions with the player.

Example:

```text
Mira remembers Taylor asking about the storm, promising to check the shutters, and speaking gently after she warned him away from the graveyard.
```

`memory` is not an audit log. It should not absorb occupation, spouse, faction, visible condition, every recent action, or stable biography. The extractor may update it as a compact rolling summary of meaningful direct player interaction, merging older details as newer interactions become more important.

### `knowledge`

Private or semi-private facts the NPC knows. These facts can guide what the NPC hides, implies, refuses to explain, or chooses to reveal through narration.

Example:

```text
knowledge = "Mira knows the storm began after the chapel bell rang at midnight, but she is afraid to say that plainly."
```

Read-only does not normally mean player-visible. The Game Master should not mechanically reveal private knowledge without an in-scene reason, and these facts remain non-mutable through Game Master output: if the model returns `knowledge`, `secret`, `occupation`, or relationship fields inside `npcUpdates`, the backend ignores them. The internal MVP deliberately shows `knowledge` in the Room Info NPC inspector for complete playtest visibility; a future public product needs an explicit visibility policy.

### Debug NPC edits

The debug panel includes an `NPCs` tab for rough playtest editing. These edits can replace an NPC name, description, or profile fact value in the next persistent-mode Game Master prompt.

Debug NPC edits are canonical Convex Adventure state, not a polished World Builder contract. They exist so playtesting can answer questions like "does a stronger Mira description change the response?" without direct DB editing. Updates are patch-based: omitted actor fields and facts remain unchanged, while clearing one editable fact removes only that canonical fact. Per-NPC saves are serialized, and reset waits for an active save while discarding queued stale edits. Reset Session restores seeded NPCs from the selected Adventure's source WorldVersion and removes debug-created NPCs; Reset World reseeds the full demo source and default Adventure.

Debug-created NPCs and locations are capped per Adventure so ordinary debug use stays resettable within the current bounded deletion limits.

## Prompt Context Strategy

Persistent Game Master requests are still stateless, but the prompt is no longer one flat payload. The request separates:

- Game Master instructions and tone guidance, which are editable configuration.
- Scene state and visible facts, which come from Convex Adventure runtime data.
- Read-only NPC cards, which are rendered from current-scene actor descriptions and actor facts.
- NPC profiles, which are the typed intermediate shape used to build those cards.
- Conversation focus, which is a non-durable hint derived from the current target or recent player-addressed NPC for ambiguous follow-up dialogue.
- Hidden NPC knowledge, which comes from current-scene `knowledge` facts.
- Recent Story, which is bounded story-visible history from successful narrations plus seed narration. Prior player commands and event records are intentionally excluded from normal persistent-mode future story context.
- Recent Story also includes player-authored Story inserts as accepted scene content.
- Current Input, which is either the current narrative action text, an explicit Pass directive, or hidden Guide steering.
- Required scene beat, which is deterministic guidance derived from player input and present actors in persistent mode, or a Pass beat when the player yields the turn.
- Last action, which frames the current player input as intent the Game Master must resolve rather than prose to copy, or frames Pass as a request to continue without inventing player action.
- Scene directive, which is near-output guidance for prompt priority, target NPC, conflict handling, response requirements, and NPC attribute questions.

Persistent prompt priority is explicit: current turn, last action, and scene directive outrank the rest of the context; NPC cards, NPC profiles, and visible facts are canonical current scene truth; Recent Story is lower-priority history that may include stale model prose. If Recent Story conflicts with NPC cards, profiles, or visible facts, the Game Master should follow the canonical card/profile/fact context.

The first required scene-beat rules are deliberately narrow: direct questions to a present NPC should produce a meaningful NPC response or choice, while trivial physical actions such as `I jump.` should not force speech. Quoted questions to the sole present NPC are treated as direct NPC questions. Game Master-authored fact churn is constrained to the extractor and currently limited to `mood`, `status`, and `memory`.

Transcript Game Master requests are simpler. They separate only editable Game Master/tone guidance, the canonical opening seed, the bounded transcript, and the current player input or Pass directive. They intentionally omit current scene state, visible facts, hidden NPC knowledge, and persistent-mode required scene beats.

## Feed Strategy

The visible play feed is reconstructed from persisted rows:

- Player input from `commands`.
- Game Master prose from `narrations`.
- Player-authored Story inserts from `narrations.source = "player"`.
- Concise happenings from `events`.
- Pre-turn slash command output from `utilityMessages`.

Events are currently shown in the feed because they help us inspect whether the world is changing. If they become noisy, we can filter them later without changing what the canonical state is.

Utility messages are shown because they are useful player-visible inspection results. They are visually distinct, do not have turn numbers, and are not part of future Game Master story context.

Story inserts are shown as canonical story prose with a distinct label. They are not turn-numbered, but they are part of future Game Master story context.

Feed entries include `turnId` when they were caused by a narrative turn, but the player-facing stream should still read as a story rather than as rigid turn cards. Turn grouping belongs in backend/debug surfaces until the story UI needs it.

## Debug Strategy

Debug records are intentionally separate from story state.

`directorCalls` stores provider/model metadata, request summaries, raw or parsed output, accepted updates, ignored updates, and errors. Local JSONL logging can also be enabled for troubleshooting route stages and timing.

In persistent mode, a successful turn can now create two provider/debug records:

- `story_generation`: the player-facing plain-prose Game Master response.
- `npc_state_extraction`: the post-narration JSON extraction pass that may propose bounded NPC `mood`, `status`, and `memory` changes plus actor moves to existing locations.

The extractor is allowed to fail closed. If story narration succeeds but extraction fails or returns invalid JSON, the story turn remains succeeded, no fake state is written, and the extractor failure is inspectable through local logs and `directorCalls`.

These records are evidence. They help explain why a turn behaved a certain way. They should not become the source of truth for the Adventure. Accepted extractor updates become canonical only after Convex validates and writes actor-scoped facts or actor `roomId` changes plus turn-scoped state diffs.

The debug panel also exposes recent turn summaries: sequence number, trigger, status, player input when one exists, related narration/event/diff counts, and Game Master call status. This is the first place to inspect whether a failed provider/output attempt was persisted correctly.

## Reset Strategy

The primary MVP reset-world path is fresh seeding. The seed mutation deletes the prior deterministic Stormbound Chapel demo World, its WorldVersions, Adventures, and dependent runtime rows, then recreates the WorldVersion plus default Adventure from the current seed.

The debug panel also has a session reset tool for the currently selected Adventure. That clears scoped turns, playtest history, and debug records, restores seeded NPC baseline descriptions/facts, restores actor locations, restores seeded location text, and removes debug-created NPCs and locations by recopying the Adventure's original source WorldVersion. It is a convenience tool for repeating the same playtest without changing the authored source World or upgrading the Adventure to a newer WorldVersion.

Full hidden-state/debug snapshot sections are local/debug-oriented. In production mode they are omitted unless the app has an explicit debug/auth design; the current local prototype enables them through `LORECRAFT_ENABLE_DEBUG_ROUTES=1` in a non-production process.

Long term, reset is not the product model. The product model is independent Adventures created from WorldVersions; polished Adventure management, source patching, branching, and rollback are deferred until the core persistence loop proves itself.

## Rollback Strategy

Rollback is deferred, but turn boundaries are the intended attachment point.

The likely future implementation is snapshot-based: capture or derive a restorable Adventure-state snapshot at a completed turn boundary, then restore the Adventure to that snapshot. Current state diffs are useful audit records, but they are not sufficient rollback machinery because they do not capture all before-state and would become hard to invert safely as operations grow.

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
