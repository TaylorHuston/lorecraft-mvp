# Design: Lightweight Location Objects

## Context

Lorecraft already has `rooms`, `exits`, actor `roomId`, `worldObjects`, room-scoped facts, and a `moveActor` state-diff operation in the schema. Until now, narrative movement was intentionally not active because the MVP was focused on prose quality, scoped turns, NPC Cards, and NPC mutation.

NPCs have proved the pattern that works: the creative Game Master writes plain prose, then a separate structured extractor proposes bounded mutations that Convex validates before they become truth. Location should follow the same pattern, but with tighter movement constraints so the model cannot dynamically rewrite the world.

The product vocabulary should call these places `locations`, even if the backing schema currently uses `rooms`. A future `Dungeon` can be a specialized exploration structure with linked rooms, path constraints, locks, hazards, and stricter navigation. This change should not implement that future mode.

## Goals / Non-Goals

**Goals:**

- Add Location Cards as canonical, card-like context for persistent Game Master prompts.
- Let the Game Master know the current location and existing movement destinations without requiring MUD-style navigation.
- Allow validated movement of the player and present NPCs to existing locations when the player clearly attempts travel.
- Add a debug `Locations` tab for inspecting, editing, and creating canonical demo-world locations.
- Standardize rough debug editing so NPC and Location tabs both edit canonical Convex demo-world state and both reset cleanly.
- Expand the seed world with a tavern and tavern NPCs to test multi-location NPC presence.
- Keep location edits fully resettable through the demo world reset/fresh seed path.
- Preserve transcript mode as a seed-plus-transcript comparison mode without live location state.

**Non-Goals:**

- Dungeon mode.
- Required room-by-room movement commands.
- Path or exit enforcement.
- Dynamic LLM-created locations or NPCs.
- Dynamic object creation.
- Location schedules, encounter tables, hazards, locks, combat, stats, inventory, or dungeon rules.
- A polished World Builder or authenticated admin UI.
- Public multi-user editing, ownership, or role-based admin permissions.
- Moving offscreen actors or applying far-reaching consequences.

## Epic Changes

### Update Epic: LC-001 Provider-Agnostic Chat Experience

- Target Epic: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Change Type: added and modified scope

#### Story Changes

- Added: `LC-001-S12: Lightweight Location Cards And Movement`
- Modified: `LC-001-S1` to supersede the old no-room-mutation scenario with bounded existing-location movement.
- Modified: `LC-001-S2` to include location context and movement validation in the provider-neutral backend boundary.
- Modified: `LC-001-S7` to include Location Cards in active Game Master context.
- Modified: `LC-001-S9` to make the debug `NPCs` tab use canonical Convex edits instead of temporary server-local overrides, matching the new `Locations` tab semantics.
- Modified: `LC-001-S10` to broaden post-narration extraction from NPC-only mutation to state extraction that can also propose actor movement.
- Removed: none.

#### Story LC-001-S12: Lightweight Location Cards And Movement

As a developer-playtester, I want canonical locations to ground narration and support bounded actor movement, so that the story can move through known places without becoming a command-driven MUD.

##### R1: Location Cards In Game Master Context

The system SHALL include canonical location context in persistent Game Master requests.

###### Scenario R1-S1: Current location grounds narration

- WHEN the player submits narrative input in persistent mode
- THEN the Game Master request includes the current Location Card with key, name, description, visible objects, present actors, and relevant location facts
- AND the Game Master treats the Location Card as canonical scene truth rather than loose suggestion.

###### Scenario R1-S2: Existing locations are eligible destinations

- WHEN the backend builds persistent Game Master context
- THEN it includes a compact list of existing locations that can be valid movement destinations
- AND movement eligibility does not require connected exits in this change.

###### Scenario R1-S3: Transcript mode excludes live location cards

- WHEN the application runs in transcript mode
- THEN the Game Master request continues to use the opening seed plus transcript only
- AND it does not include live Location Cards, actor locations, location edits, or movement extraction.

##### R2: Bounded Actor Location Mutation

The system SHALL mutate actor locations only through validated post-narration extraction.

###### Scenario R2-S1: Clear player travel moves the player

- WHEN the player clearly attempts travel to an existing location
- AND the Game Master narration resolves the player as reaching or entering that location
- THEN the extractor may propose moving the player actor to that location
- AND Convex persists the move only after validating the actor and destination location.

###### Scenario R2-S2: Present NPC follows or leaves

- WHEN the player clearly attempts travel
- AND the narration explicitly says a current-scene NPC follows, accompanies, leaves with, or travels to the same existing location
- THEN the extractor may propose moving that NPC
- AND Convex persists the move only if the NPC was present in the scene at turn start and the target location exists.

###### Scenario R2-S3: Game Master cannot relocate actors autonomously

- WHEN the narration independently relocates the scene without a clear player travel action
- THEN the extractor returns no actor movement
- AND actor `roomId` values remain unchanged.

###### Scenario R2-S4: Unknown target location is unresolved

- WHEN the player attempts to travel to a destination that is not an existing canonical location
- THEN the Game Master handles the attempt in-story as unclear, unavailable, blocked, or needing more context
- AND no new location is created
- AND no actor location mutation is accepted.

###### Scenario R2-S5: Path links are not enforced

- WHEN the player clearly travels to any existing location
- THEN the backend may accept the move even if no exit links the current location to the target
- AND future path/link constraints remain deferred.

##### R3: Debug Location Editing

The system SHALL provide a debug `Locations` tab for inspecting and editing canonical demo-world locations.

###### Scenario R3-S1: Debug tab shows location state

- WHEN a world is seeded and the debug panel is open
- THEN the `Locations` tab lists existing locations with key, name, description, visible objects or exits when available, and current actors in each location.

###### Scenario R3-S2: Debug edit updates canonical location fields

- WHEN Taylor edits a location's name or description in the debug `Locations` tab
- THEN the change is persisted to Convex as canonical demo-world state
- AND the next persistent Game Master request uses the edited Location Card.

###### Scenario R3-S3: Debug create adds a canonical location

- WHEN Taylor creates a new location in the debug `Locations` tab
- THEN the system creates a canonical location with a stable key, name, and description
- AND that location can become a valid movement target for future turns.

###### Scenario R3-S4: Location keys remain stable after creation

- WHEN an existing location is displayed in the debug `Locations` tab
- THEN its key is treated as stable identity and is not edited in place
- AND display fields can still be edited.

##### R4: Reset And Debug Evidence

The system SHALL make location state, edits, and movement decisions inspectable and resettable.

###### Scenario R4-S1: Reset world restores seeded locations

- WHEN the demo world is reset through the world reset/fresh seed path
- THEN edited seeded locations are restored to seed values
- AND debug-created locations are removed
- AND actor locations return to the seeded setup.

###### Scenario R4-S2: Accepted movement is turn-scoped

- WHEN actor movement is accepted for a turn
- THEN the system records a turn-scoped state diff with `moveActor` operations
- AND debug records identify the moved actors, target location keys, and extractor reason.

###### Scenario R4-S3: Rejected movement is inspectable

- WHEN an actor movement proposal is rejected because the actor is invalid, offscreen, or the target location is unknown
- THEN no actor `roomId` changes
- AND debug evidence records why the proposal was ignored.

##### Implemented By

- `convex/world.ts` exposes Location Card and Known Locations context, debug-gated location edit/create actions, bounded actor movement persistence, and reset restoration for seeded locations.
- `src/lib/director/prompt.ts` adds persistent-mode Location Card and Known Locations prompt sections plus actor movement extraction instructions.
- `src/lib/director/output.ts` parses and validates actor movement proposals before Convex can persist them.
- `src/app/world-client.tsx` adds the debug Locations tab and displays accepted actor movement evidence.
- `scripts/llm-fixture-server.mjs` and `tests/e2e/lorecraft-playtest.spec.ts` cover deterministic accepted and rejected movement paths.

##### Verified By

- `npx convex codegen`
- `npm run test -- src/lib/director/director.test.ts`
- `npm run e2e`
- `npm run ci:required`

##### Verification Gaps

- Taylor manual browser confirmation remains pending.

#### Story LC-001-S9 Refinement: Canonical NPC Debug Parity

This change also refines the already-existing `LC-001-S9` debug NPC workflow so that NPC editing follows the same canonical, resettable model as Location editing.

##### Updated Requirement R3: Debug NPC Inspection And Editing

The system SHALL provide a debug-panel `NPCs` tab for inspecting, editing, creating, and resetting canonical demo-world NPC values.

###### Scenario R3-S1: Debug panel shows NPC fields

- WHEN a world is seeded and the debug panel is open
- THEN the `NPCs` tab lists current NPCs with their key, name, description, location, and readable attributes.

###### Scenario R3-S2: Debug edit affects Game Master context

- WHEN Taylor edits an NPC value in the debug `NPCs` tab
- THEN the saved canonical Convex actor row or actor fact is used by the next persistent Game Master request
- AND the debug UI makes save/reset status visible.

###### Scenario R3-S3: Debug edits are resettable

- WHEN Taylor uses Reset Session or Reset World
- THEN seeded NPC values and seeded actor locations are restored
- AND debug-created NPCs are removed from the demo world.

###### Scenario R3-S4: Debug create adds a current-location NPC

- WHEN Taylor creates an NPC from the debug `NPCs` tab
- THEN the system creates a canonical NPC actor in the player's current location with a stable key, name, description, and editable profile facts
- AND that NPC can appear in the next persistent Game Master request when present in the current scene.

## Epic File Rules

- Stories live inside the Epic `epic.md` file.
- Do not create `docs/stories/` or individual Story files.
- Preserve the Epic directory as the future home for supporting artifacts such as mockups, screenshots, research, or design notes.
- Epics and Stories are durable but revisable; Stories may be renamed, reordered, split, merged, or moved between Epics as the product matures.
- Keep Story IDs stable even when Story titles change or Stories move between Epics.
- Keep Story IDs unique across active Epics in the app. `LC-001-S12` was selected after scanning active Epic files and finding `LC-001-S1` through `LC-001-S11` already in use.
- Restart Requirement IDs inside each Story: `R1`, `R2`, `R3`, `R4`.
- Scope Scenario IDs to their Requirement: `R1-S1`, `R1-S2`, `R2-S1`.

## Technical Approach

Use the existing `rooms` table as the canonical storage for lightweight locations. Keep the product-facing language as `location` and avoid renaming schema in this change. A `Location Card` should be a derived prompt/UI object built from room key/name/description, room-scoped facts, visible objects, visible exits, and present actors. Persistent mode should include the current Location Card and a compact `Known Locations` list of all existing locations that can be movement targets.

Extend the current post-narration extractor instead of adding a third provider call. The structured extraction output can grow from NPC-only updates to a state extraction shape such as:

```json
{
  "npcUpdates": [],
  "actorMoves": [
    {
      "actorKey": "taylor",
      "toLocationKey": "vestry",
      "reason": "Taylor clearly entered the vestry in the resolved narration."
    }
  ]
}
```

The backend should validate every proposed actor move. Accepted moves must require an actor key belonging to the player or a current-scene NPC, an existing destination location key, clear travel eligibility for the turn, and narration confirmation. Accepted moves patch actor `roomId` values and write turn-scoped `stateDiffs` with `moveActor` operations. Ignored moves should be recorded in debug evidence without changing actor state.

Clear travel eligibility should be derived before extraction from the player input and current known locations. Unknown destination attempts should influence story guidance: the Game Master may say the destination is not clear, not reachable from current context, or needs more information, but the backend must not create a new location or accept a move. The system should not require exits or links for this change; any existing location is an eligible target once the player clearly attempts travel.

Add a debug `Locations` tab to the existing debug drawer. Location edits should persist to Convex because actor movement needs real location IDs, matching the debug `NPCs` tab's canonical demo-world editing model. This is still local/dev tooling, not a polished World Builder. Existing location keys should remain stable after creation; name and description are editable. New debug-created locations should require a stable key, name, and description, and should be fully removable by resetting the demo world to its seed.

Convert the existing NPC debug override path into canonical Convex debug writes. Debug NPC edits should save actor name/description and actor facts directly. Debug NPC creation should place a new NPC in the player's current location so it can be tested immediately. Reset Session and fresh seed should restore seeded NPCs and remove debug-created NPCs. Clearing a debug-edited NPC fact should remove or clear that canonical value rather than silently preserving the old one.

Seed an additional tavern location with tavern NPCs so the test world has more than one populated scene. This remains authored seed content, not dynamic model-created content.

Keep transcript mode unchanged. It should continue to omit live location state and should not run location movement extraction.

## Alternatives Considered

- Add a `locations` table and migrate away from `rooms`:
  - Why not: current schema already has rooms, exits, actor `roomId`, objects, and movement diffs. Renaming storage now adds churn without changing product behavior.
- Add a `dungeons` table now:
  - Why not: dungeon rules are a future specialization. This change only needs story-first locations and bounded movement.
- Require exits for movement:
  - Why not: link/path enforcement pushes the MVP toward MUD traversal. The user explicitly wants any existing location for now.
- Allow the LLM to create new locations dynamically:
  - Why not: dynamic creation of locations and NPCs is deferred. Current movement should fail closed against canonical existing locations.
- Store debug location edits as server-local overrides:
  - Why not: movement needs durable target IDs. Canonical Convex rows keep the debug editing loop aligned with movement validation.
- Keep NPC debug edits as server-local overrides:
  - Why not: NPC and Location debug editing should use one consistent model. Canonical debug NPC edits are easier to inspect in prompt context, reset behavior, and deterministic tests than a parallel override store.

## Why This Approach

This approach follows the lesson from NPC mutation: keep prose and state mutation separate. It gives the Game Master better grounding, gives Taylor a rough location-editing loop, and allows the story to move through known places without introducing dungeon mechanics, map traversal, or dynamic world generation before playtesting proves the need.

## Implementation Constraints

- Do not add dungeon schema, dungeon UI, or path enforcement.
- Do not require typed movement commands or slash commands.
- Do not dynamically create locations or NPCs from Game Master output.
- Do not expose debug editing as a production-ready public admin API.
- Do not move offscreen actors.
- Do not accept actor movement unless the player input clearly attempts travel and the narration confirms the move.
- Do not allow movement to unknown/nonexistent locations.
- Do not run location movement extraction in transcript mode.
- Keep debug location editing resettable through the demo world reset/fresh seed path.
- Keep debug NPC editing resettable through the same demo world reset/fresh seed path.
- Keep player-facing UI prose-first; location state is debug-visible for now.

## Verification Strategy

- Add unit tests for Location Card construction and persistent prompt inclusion.
- Add unit tests for known-location destination context and unknown-target guidance.
- Add parser/validation tests for accepted player movement, accepted present-NPC movement, rejected unknown destination, rejected unknown actor, rejected offscreen NPC, and no movement when player input is not a clear travel action.
- Add Convex/domain tests or integration-style tests proving accepted moves patch actor `roomId` and write turn-scoped `moveActor` diffs.
- Add tests or browser coverage for the debug `Locations` tab editing and creating canonical locations.
- Add tests or browser coverage for canonical debug NPC edit/create/reset behavior when practical.
- Verify reset/fresh seed restores seeded locations and NPCs, removes debug-created locations/NPCs, and resets actor locations.
- Run `npm run ci:required`.
- Run `npm run e2e` if the deterministic flow is updated to cover location debug or movement.
- Run a local `npm run dev:debug` playtest and inspect raw turn logs for one accepted move and one unknown-location attempt.

## Decisions

- Product language is `Location`; backing storage remains `rooms` for now.
- This change includes Location Cards and validated actor movement.
- Movement can affect the player and present NPCs.
- Movement targets must be existing canonical locations.
- Unknown destinations are handled in-story as unresolved or blocked.
- Movement requires clear player travel action; the Game Master cannot relocate actors autonomously.
- Current movement does not require exits or linked paths.
- The debug `Locations` tab edits canonical Convex state, not server-local overrides.
- The debug `NPCs` tab edits canonical Convex state, not server-local overrides.
- Existing location keys are stable after creation.
- Location state is debug-visible only for now; a player-facing status widget is deferred.
- Dungeon mode is deferred future scope.

## Risks / Trade-Offs

- Expanding the extractor from NPC updates to actor movement increases validation complexity. The mitigation is a narrow allowlist and focused tests.
- Any-existing-location movement may feel too permissive once the world grows. That is intentional for this phase and can later be replaced by link/path constraints.
- Canonical debug editing is rough and local-first; without auth or a polished builder it should remain debug tooling.
- Canonical debug NPC and Location writes are intentionally local/dev-oriented. Before a remote shared deployment, they need auth, ownership, or a hardened local-only gate.
- Reset semantics must be clear so playtest edits do not become mistaken for durable authored world content.
- Prompt context may grow as locations increase. For the MVP, all existing locations are acceptable; retrieval/filtering can come later.
