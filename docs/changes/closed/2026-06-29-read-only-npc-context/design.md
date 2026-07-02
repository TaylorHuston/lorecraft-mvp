# Design: Read-Only NPC Context

## Context

Lorecraft currently has two useful but incomplete Game Master paths.

Persistent mode can load current scene state and previously allowed bounded NPC fact updates. That path proves state-first persistence, but it also creates pressure for the model to decide what changed and when. Transcript mode avoids that pressure by using the seed plus transcript only, but it also prevents authored NPC state from grounding interactions like looking at Mira.

This change adds back only the read side of NPCs: NPC objects and attributes are visible to the Game Master and debug UI, while Game Master-authored NPC mutations are disabled for this change.

For the current Mira seed, the readable NPC profile vocabulary is: stable visible `description`, pre-player `background`, behavioral `persona`, dialogue `voice`, current `mood`, durable visible `status`, direct player-interaction `memory`, and private `knowledge`.

Persistent prompts should render these profiles as NPC Cards: canonical story memory that the Game Master treats as world truth, not loose suggestions. Cards are prompt/context shape, not a new simulation layer. Do not add location, schedule, relationship score, or other game-engine fields until repeated playtest failures prove that structure is necessary.

Longer term, Lorecraft should feel like a TTRPG-style Game Master rather than pure improv or a lightweight MUD. Hidden adjudication, dice, and simple rules can exist later, but only as selective GM tools for risky, opposed, uncertain, consequential actions. This change should not add rules, stats, combat, movement commands, relationship scores, or schedules. The current slice stays focused on structured NPC Cards and prompt quality; future adjudication should be added only after repeated playtests show that pure narration is too arbitrary or consequence-free.

## Goals / Non-Goals

**Goals:**

- Make current-scene NPC objects readable Game Master context again.
- Ground NPC-focused narration in authored NPC descriptions and attributes.
- Prevent player-facing story-generation output from mutating NPC fields or facts in this historical read-only phase.
- Add a debug-panel `NPCs` tab where Taylor can inspect NPC values and apply temporary test overrides.
- Ensure debug overrides are non-durable and disappear on application server restart.

**Non-Goals:**

- Intelligent NPC state mutation.
- Persistent admin editing of NPCs.
- A Creator or World Builder UI.
- New combat, inventory, movement, schedule, relationship, or offscreen-simulation systems.
- Changing transcript mode's seed-plus-transcript comparison contract.

## Epic Changes

### Update Epic: LC-001 Provider-Agnostic Chat Experience

- Target Epic: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Change Type: added scope

#### Story Changes

- Added: `LC-001-S9: Read-Only NPC Context`
- Modified: Small cross-references may be added to LC-001-S2, LC-001-S3, LC-001-S4, LC-001-S7, or LC-001-S8 if needed to distinguish read-only NPC context from mutation behavior.
- Removed: none.

#### Story LC-001-S9: Read-Only NPC Context

As a developer-playtester, I want NPCs to exist as readable authored objects in Game Master context, so that NPC-focused narration is grounded in world state before Lorecraft reintroduces intelligent state mutation.

##### R1: NPC Profiles In Game Master Context

The system SHALL include current-scene NPC profiles in persistent Game Master requests as readable context.

###### Scenario R1-S1: NPC description grounds a look action

- WHEN the player submits input like `I look at Mira`
- THEN the persistent Game Master request includes Mira's stable NPC profile
- AND the Game Master can base the response on Mira's authored description and readable attributes instead of inventing her from transcript history alone.

###### Scenario R1-S2: NPC context is structured separately from transcript

- WHEN the backend builds persistent Game Master context
- THEN NPC profile data is represented as structured context owned by Convex state and debug overrides
- AND recent feed transcript remains separate supporting history.

##### R2: Read-Only Story-Generation Mutation Boundary

The system SHALL prevent the player-facing story-generation output from mutating NPC state in this historical read-only phase. Later extractor work may propose bounded mutations through a separate validated pass.

###### Scenario R2-S1: Story generation includes NPC update-like text

- WHEN the player-facing story-generation response includes prose that resembles an NPC update
- THEN the backend does not parse that prose as a durable NPC mutation
- AND any durable NPC fact change must come from a separate validated extractor pass.

###### Scenario R2-S2: Existing NPC values remain unchanged after narration

- WHEN a successful persistent Game Master turn narrates an NPC-focused interaction
- THEN persisted actor rows and actor-scoped facts remain unchanged unless a non-story-generation path changes them, such as debug editing or a later bounded extractor pass.

##### R3: Debug NPC Inspection And Overrides

The system SHALL provide a debug-panel `NPCs` tab for inspecting NPC values and applying temporary test overrides.

###### Scenario R3-S1: Debug panel shows NPC fields

- WHEN a world is seeded and the debug panel is open
- THEN the `NPCs` tab lists current NPCs with their key, name, description, and readable attributes.

###### Scenario R3-S2: Debug override affects Game Master context

- WHEN Taylor overrides an NPC value in the debug `NPCs` tab
- THEN the next persistent Game Master request uses the overridden value as read-only context
- AND the debug UI makes the override visible as a temporary override.

###### Scenario R3-S3: Debug override is non-durable

- WHEN the application server restarts
- THEN prior NPC debug overrides are gone
- AND Convex canonical actor rows and facts still contain their seeded or persisted values.

##### Implemented By

Closed implementation summary is maintained in this change's tasks.md and the LC-001 Epic.

##### Verified By

Closed verification evidence is maintained in this change's tasks.md and the LC-001 Epic.

##### Verification Gaps

- Historical placeholder reconciled at closeout; no current implementation-pending claim remains.

## Epic File Rules

- Stories live inside the Epic `epic.md` file.
- Do not create `docs/stories/` or individual Story files.
- Preserve the Epic directory as the future home for supporting artifacts such as mockups, screenshots, research, or design notes.
- Epics and Stories are durable but revisable; Stories may be renamed, reordered, split, merged, or moved between Epics as the product matures.
- Keep Story IDs stable even when Story titles change or Stories move between Epics.
- Keep Story IDs unique across active Epics in the app. `LC-001-S9` was selected after scanning active Epic files and finding `LC-001-S1` through `LC-001-S8` already in use.
- Restart Requirement IDs inside each Story: `R1`, `R2`, `R3`.
- Scope Scenario IDs to their Requirement: `R1-S1`, `R1-S2`, `R2-S1`.

## Technical Approach

Use the existing `actors` table plus actor-scoped `facts` as the canonical NPC data source. Do not add a dedicated `npcs` table for this slice.

Add an internal NPC profile shape for prompt/UI use. It should be derived from current-scene actors where `role === "npc"` and should include stable actor fields such as key, name, description, and selected readable facts. The important boundary is source ownership: canonical values come from Convex, while overrides come from a server-local debug override store and are merged only when building debug-facing snapshot/context data.

The Game Master prompt should receive NPC profiles as read-only context in persistent mode. The prompt should tell the Game Master to use these profiles for description and behavior, but the backend should treat any returned NPC update as non-persistent for this change. The simplest implementation path is to suppress accepted NPC updates in the route or completion layer when this read-only mode is active, while still preserving enough ignored-update metadata for debug inspection if that already fits the current call record shape.

Debug overrides should be a local-only server concern, not Convex state. A small Next.js API route or server module can own an in-memory map keyed by world ID and NPC key. The debug UI can read and write overrides through that boundary. Overrides should be merged into the NPC profile context sent to the Game Master and displayed in the debug `NPCs` tab. Because they live in process memory, a server restart clears them.

Transcript mode should remain unchanged unless implementation discovers shared prompt construction that needs explicit guarding. Transcript mode should continue to omit live actor/NPC context so it remains a comparison baseline.

## Alternatives Considered

- Add a dedicated `npcs` table:
  - Why not: existing `actors` already model player/NPC identity and room presence. A new table would add schema and migration surface before the MVP has proven that generic actors plus facts are insufficient.
- Store debug overrides in Convex with `source: "manual"`:
  - Why not: Taylor explicitly asked that overrides should not persist through server restart. Convex storage would be durable and would blur debug test data with canonical state.
- Re-enable bounded `mood`, `status`, and `memory` mutation:
  - Why not: intelligent state mutation is out of scope. This change is about grounding reads before reintroducing writes.
- Apply NPC profiles to transcript mode:
  - Why not: transcript mode was intentionally created to isolate story generation from canonical world state.

## Why This Approach

This approach preserves the useful Lorecraft principle that authored world data should shape the story, while avoiding the hardest unsolved part: deciding when an LLM-authored beat should become durable state. It also keeps the implementation small by reusing existing actor/fact data and giving Taylor a local debug override loop without pretending that those edits are a real World Builder.

## Implementation Constraints

- Do not persist debug overrides to Convex, local files, local storage, or any other durable store.
- Do not allow Game Master output to change NPC actor rows or actor facts as part of this change.
- Keep player-visible UI narrative-first; the NPC override surface belongs in the debug panel.
- Keep transcript mode's seed-plus-transcript prompt contract intact.
- Do not expose hidden/private NPC facts to the player-facing story UI as metadata.

## Verification Strategy

- Unit test prompt/context construction so persistent Game Master requests include structured NPC profile context for current-scene NPCs.
- Unit or integration test that returned NPC update data does not produce accepted NPC fact changes, state diffs, or LLM NPC events.
- Test or manually verify that debug NPC overrides affect the next Game Master request context.
- Manually verify that restarting the application server clears overrides while Convex actor/fact rows remain unchanged.
- Run `npm run ci:required`.
- Run a local Game Master playtest with a `Look at Mira` style input and inspect raw request/debug evidence.

## Decisions

- Use existing `actors` plus actor-scoped `facts` as NPC data for this change.
- Store debug NPC overrides in server-local memory only.
- Keep intelligent NPC state mutation out of scope.
- Keep transcript mode unchanged.
- Add this as `LC-001-S9` in the existing LC-001 Epic.

## Risks / Trade-Offs

- Next.js dev server hot reload may clear process-local overrides more often than a full server restart. That is acceptable for a debug-only MVP unless it prevents useful playtesting.
- Process-local overrides will not work across multiple server instances. That is acceptable because this is local debug tooling.
- Suppressing all Game Master NPC updates may reduce visibility into what the model would have changed. If useful, implementation can still record attempted updates as ignored debug evidence without applying them.
- Actor-plus-facts may become too loose for future NPC authoring. This change intentionally defers that promotion until real editor/query pressure exists.

## Implementation-Discovery Questions

- Debug override lifetime:
  - Default path: store overrides in a module-level in-memory map on the Next.js server.
  - Evidence needed: a local manual check showing overrides persist across multiple turns in one running server and disappear after restart.
  - Replan trigger: if Next.js dev behavior makes module-local override state unusable even within one running test session.
- NPC profile type:
  - Default path: derive a typed prompt/UI `NpcProfile` from `actors` and actor-scoped `facts`.
  - Evidence needed: implementation shows the prompt, debug UI, and tests can use this shape without confusing canonical data and overrides.
  - Replan trigger: if the actor/fact model cannot cleanly express the readable NPC fields Taylor needs for `Look at Mira`.
