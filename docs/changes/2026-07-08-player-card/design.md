# Design: Player And Room Info Panels

## Context

Lorecraft already has Adventure-owned `actors` with `role = "player" | "npc"`. NPCs are treated as stable actor rows plus actor-scoped facts such as `background`, `persona`, `voice`, `mood`, `status`, `memory`, and `knowledge`. The player actor currently exists, but it is a generic seeded record and the UI only surfaces the player name lightly inside debug/scene metadata.

This change makes the player character a first-class readable card while preserving the current product direction: story-first play, structured state only where useful, and no premature TTRPG system. It also adds a matching right-side Room Info panel so the player can see the current room/location context without opening debug.

## Goals / Non-Goals

**Goals:**

- Ask for a player name before creating a new Adventure.
- Store the player as the existing Adventure-owned actor with `role = "player"`.
- Add a blank optional player actor description plus blank optional player facts for backstory and status.
- Show a persistent collapsible player-facing left rail with the Player Card.
- Show a persistent read-only right rail with current room/location name, description, and present NPCs.
- Include Player Card context in Game Master prompts without weakening player agency.
- Keep the layout consistent with the current narrative workbench and shared visual guide.

**Non-Goals:**

- Add inventory, equipment, health, stats, combat, class, ancestry, or rules.
- Add multi-user profiles, auth-owned player records, or cross-Adventure character reuse.
- Let the Game Master automatically rewrite player backstory or physical description.
- Build a polished character creator.
- Add a debug-only Player tab as the primary surface.
- Add movement controls, a map, room editing, room facts editing, object interaction, or a dungeon-room graph UI to the Room Info panel.

## Planning Interview / Story Refinement

- Scope boundary reviewed: this is a player-character identity and context slice, not a broader RPG character system.
- User decisions:
  - The player should have a model similar to NPCs.
  - The Player Card belongs as a persistent left-side element, not in debug.
  - A matching right-side Room Info floating box should show room name, description, and NPCs.
  - Creating a new Adventure should ask for the player's name.
  - Other fields should be blank initially and fillable by the user.
- Assumptions:
  - "Fill them in" means user-facing editing in the Player Card, with a compact edit mode or editable expanded fields.
  - The player actor can use the existing `facts` table for profile fields.
  - The left rail may collapse to protect story reading width.
- Deferred scope:
  - Rich character creation, avatars, inventory, equipment, health, stats, TTRPG rules, auth-owned profiles, and automatic player fact mutation.
- Story boundaries challenged:
  - Adventure creation behavior belongs in LC-002 because it changes how Adventures are created from WorldVersions.
  - The persistent Player Card and Game Master context belong in LC-001 because they affect the play loop, prompt context, and player-facing surface.
  - The Room Info panel belongs in LC-001 because it is a player-facing play-loop surface for current scene awareness; it reconciles with LC-001-S12 Location Cards rather than replacing that Story.
  - This should not become a debug panel story; the card is a player-facing identity surface.
- Requirements refined:
  - Keep player name required for new Adventure creation.
  - Keep optional fields blank by default, visible and editable in the expanded Player Card, and omitted from prompt context until filled.
  - Keep player agency language explicit in the prompt contract.
- Scenario gaps considered:
  - Canceling the name prompt should not create an Adventure.
  - Existing Adventures should continue to load with their current player actor.
  - Blank optional fields should not degrade the story surface.
  - Collapsed/expanded states should be keyboard-operable and responsive.
  - Room Info should update when canonical player location changes and should not imply that absent NPCs are present.
- Open questions that block implementation:
  - None.

## Epic Changes

### Update Epic: LC-002 World / Adventure Model

- Target Epic: `docs/epics/lc-002-world-adventure-model/epic.md`
- Change Type: modified scope

#### Story Changes

- Modified: `S1: Start Adventure From World Version`
  - Add player-name collection to Adventure creation.
  - Add optional blank player profile fields to copied Adventure state.
  - Preserve existing WorldVersion copy semantics.
- Added: none.
- Removed: none.

#### Proposed Requirement / Scenario Additions

##### Story S1: Start Adventure From World Version

As a playtester, I want Lorecraft to start a playable Adventure from a World version, so that the story has its own mutable copy of the authored setup.

###### Requirement R3: Player Identity On Creation

The system SHALL collect a player name before creating a new Adventure and store it on the Adventure-owned player actor.

###### Scenario R3-S1: Player name creates Adventure

- WHEN the playtester starts a new Adventure from a World container
- THEN the app asks for a non-empty player name before calling the Adventure creation mutation
- AND the created Adventure's player actor uses that name
- AND opening the Adventure shows that name in the Player Card and Game Master context

###### Scenario R3-S2: Name prompt is canceled

- WHEN the playtester cancels or dismisses the player-name prompt
- THEN no Adventure is created
- AND the World container list remains unchanged

###### Scenario R3-S3: Optional profile fields start blank

- WHEN an Adventure is created
- THEN the copied player profile has blank physical description, backstory, and status fields
- AND blank fields remain editable in the expanded Player Card without being treated as filled prompt context

##### Implemented By

Implemented in `convex/world.ts`, `src/features/play/adventure-landing.tsx`, and `src/features/play/player-card.tsx`.

##### Verified By

Verified by focused unit coverage and browser spec coverage recorded in `tasks.md` and `docs/epics/lc-002-world-adventure-model/epic.md`.

Planned evidence:

- Focused Convex/unit tests around Adventure creation input and copied player actor/profile fields.
- Deterministic E2E or browser test for creating an Adventure with a player name and canceling without creation.

##### Verification Gaps

- `npm run e2e` was not executed in the apply pass because the standing local Convex dev server was intentionally left running on port `3210`.

#### Supersedes / Reconciles

- Earlier `LC-002/S1/R1-S1` wording says the player can create a new Adventure from the container, but does not mention player identity. This change should refine that creation flow rather than add a parallel path.
- Existing `Verified By` for `LC-002/S1` should be extended after implementation to include player-name creation evidence.

### Update Epic: LC-001 Core Game Master Play Loop

- Target Epic: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Change Type: added scope

#### Story Changes

- Added: `LC-001-S15: Player Card`
- Added: `LC-001-S16: Room Info Panel`
- Modified: `LC-001-S7: Active Game Master Guidance And Context Assembly`, if implementation changes prompt context assembly language.
- Removed: none.

#### Story LC-001-S15: Player Card

As a player, I want my character's identity and durable profile visible beside the story, so that I can understand who I am playing and the Game Master can ground narration without taking over my agency.

##### Requirement R1: Persistent Player Card Surface

The system SHALL show a persistent player-facing Player Card while an Adventure is open.

###### Scenario R1-S1: Expanded Player Card shows filled profile fields

- WHEN an Adventure is open and the Player Card is expanded
- THEN it shows the player name and current location
- AND it shows physical description, backstory, and status only when those fields have values

###### Scenario R1-S2: Player Card collapses

- WHEN the player collapses the Player Card
- THEN the story stream keeps usable reading width
- AND a clear control remains available to expand the Player Card again

###### Scenario R1-S3: No debug dependency

- WHEN the debug panel is closed
- THEN the Player Card remains available as a player-facing surface

##### Requirement R2: Player Profile Editing

The system SHALL let the player fill in blank optional Player Card fields for the current Adventure.

###### Scenario R2-S1: Optional field is saved

- WHEN the player adds or edits physical description, backstory, or status in the Player Card
- THEN the value is saved to Adventure-owned player actor state or actor facts
- AND reloading the Adventure preserves the value

###### Scenario R2-S2: Optional field is cleared

- WHEN the player clears an optional profile field
- THEN the Player Card shows the empty editable field in expanded mode
- AND future Game Master context does not include stale cleared text

##### Requirement R3: Game Master Uses Player Card Without Owning Agency

The system SHALL include Player Card context in Game Master requests while preserving player agency.

###### Scenario R3-S1: Filled Player Card enters prompt context

- WHEN the Game Master request is built for an Adventure with filled player profile fields
- THEN the request includes the player name, physical description, backstory, status, and current location as Player Card context
- AND it labels that context separately from NPC Cards and Recent Story

###### Scenario R3-S2: Player agency is preserved

- WHEN the Game Master uses Player Card context
- THEN prompt instructions continue to forbid choosing new player actions, thoughts, feelings, or dialogue beyond submitted input
- AND player backstory/status guide perception and consequence without becoming forced player intent

##### Implemented By

Implemented in `convex/world.ts`, `src/lib/world/convex-snapshot-read-model.ts`, `src/lib/world/convex-director-context.ts`, `src/lib/director/prompt.ts`, `src/features/play/adventure-landing.tsx`, `src/features/play/world-client.tsx`, and `src/features/play/player-card.tsx`.

##### Verified By

Verified by focused unit coverage and browser spec coverage recorded in `tasks.md` and `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.

Planned evidence:

- Focused prompt tests proving Player Card context is included and agency instructions remain present.
- Focused read-model tests for player profile facts.
- Deterministic E2E or browser test for expanded/collapsed Player Card and profile persistence across reload.
- Manual UI confirmation for layout fit and readability with debug drawer open/closed.

##### Verification Gaps

- `npm run e2e` was not executed in the apply pass because the standing local Convex dev server was intentionally left running on port `3210`.

#### Supersedes / Reconciles

- `LC-001-S7` currently owns active Game Master guidance and context assembly for World, Location, NPC, and recent story context. This change should reconcile that Story's context wording if Player Card context is added there.
- `docs/data-model.md` currently describes Actor and NPC fact strategy in detail but does not define current Player Card fact keys. This change should add player-specific field semantics.
- `LC-001-S12` owns Location Cards and movement. `LC-001-S16` should reuse that current Location Card state for player-facing display without adding new location persistence or movement semantics.

#### Story LC-001-S16: Room Info Panel

As a player, I want the current room's key details visible beside the story, so that I can stay oriented without opening debug or treating the transcript as the only source of scene truth.

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

The system SHALL show the NPCs currently present in the player's room/location.

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

The system SHALL keep the Room Info panel as a readable scene-context surface rather than a debug or editor tool.

###### Scenario R3-S1: No editing controls in Room Info

- WHEN the player views the Room Info panel
- THEN it does not expose location edit controls, raw IDs, raw fact rows, movement debug controls, or reset controls
- AND location editing remains in the existing debug Locations tab

###### Scenario R3-S2: No new movement semantics

- WHEN the Room Info panel is added
- THEN it does not add click-to-travel, links, exits, maps, room graphs, or dungeon traversal behavior
- AND movement remains governed by the existing clear player-action and extractor validation rules

##### Implemented By

Implemented in `src/features/play/room-info-card.tsx` and `src/features/play/world-client.tsx`.

##### Verified By

Verified by focused component coverage, updated browser spec coverage, and required CI recorded in `tasks.md` and `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.

Planned evidence:

- Focused read-model or component tests proving current room details and present NPCs are derived from existing Adventure snapshot state.
- Deterministic E2E or browser coverage showing the Room Info panel on an Adventure route and verifying it updates after an accepted location change or reset.
- Manual UI confirmation that the right panel balances the Player Card without making the story stream feel cramped.

##### Verification Gaps

- `npm run e2e` was not executed in the apply pass because the standing local Convex dev server was intentionally left running on port `3210`.

## Epic File Rules

- Stories live inside the Epic `epic.md` file.
- Do not create `docs/stories/` or individual Story files.
- Preserve the Epic directory as the future home for supporting artifacts such as mockups, screenshots, research, or design notes.
- Preserve existing legacy LC-001 Story IDs because the Epic already uses them.
- Use LC-002's existing Epic-scoped `S#` labels for modifications in LC-002.
- Restart Requirement IDs inside each Story and scope Scenario IDs to their Requirement.

## Technical Options

### Option 1: Existing Actor Plus Actor Facts And Existing Location Snapshot

- Summary: Keep the player as the Adventure-owned `actors` row with `role = "player"`; store optional profile fields as actor facts; derive Room Info from the existing current room/location snapshot and `locationCard.presentActors`.
- User impact: Directly supports player identity without introducing a new character system.
- Implementation complexity: Low to moderate.
- Reversibility: High; facts can later migrate to structured player/profile tables if needed.
- Client surfaces: Adventure creation prompt, Player Card left rail, Room Info right rail, prompt context, debug hidden state.
- API / contract shape: Extend `createAdventure` args with `playerName`; add profile fields to snapshot/context read models; add a bounded update mutation for player profile facts; reuse existing snapshot room/location and present-actor fields for Room Info.
- Frontend/backend boundary: Convex remains canonical; UI edits call mutations rather than owning profile truth locally.
- Data / schema impact: No schema table required; likely no schema change unless storing a dedicated actor field is preferred. Room Info should require no schema changes.
- Auth / security impact: Prototype-local; future production still needs ownership/auth for profile edits.
- Testability: Strong; easy to test mutation/read model/prompt inclusion.
- Operational risk: Low.
- Fit with project conventions: Best fit; mirrors NPC Card and Fact strategy.

### Option 2: New `playerProfiles` Table

- Summary: Add a dedicated table for player name, description, backstory, status, and future character fields.
- User impact: Similar in the current UI.
- Implementation complexity: Higher.
- Reversibility: Moderate; introduces new ownership and migration surface.
- Client surfaces: Same as Option 1.
- API / contract shape: Requires new table, indexes, joins, lifecycle deletion/reset handling.
- Frontend/backend boundary: Clearer future profile boundary but heavier now.
- Data / schema impact: New schema and cleanup semantics.
- Auth / security impact: Still not production-ready without auth.
- Testability: Good but more code to cover.
- Operational risk: Moderate due to lifecycle/reset coupling.
- Fit with project conventions: Premature for the MVP because Actor/Facts already solve the need.

### Option 3: Client-Only Local Player Card

- Summary: Keep player name/profile in browser local state or local storage and inject it into prompts from the client.
- User impact: Fast to build but unreliable across devices and reset paths.
- Implementation complexity: Low initially.
- Reversibility: Moderate; would need migration to Convex later.
- Client surfaces: Browser only.
- API / contract shape: Weak; backend cannot treat player context as canonical.
- Frontend/backend boundary: Poor fit; puts game truth in the client.
- Data / schema impact: None.
- Auth / security impact: Avoids server writes but fails the state-first thesis.
- Testability: Weaker for backend prompt/context guarantees.
- Operational risk: Medium because prompt context can drift from canonical Adventure state.
- Fit with project conventions: Poor fit; conflicts with Convex as canonical world state.

## Selected Approach

Use Option 1: represent the Player Card with the existing Adventure-owned player `actor` plus actor-scoped facts.

Adventure creation should accept a required `playerName`, validate/trim it in the Convex mutation, and store it on the copied player actor. Physical description should use the existing actor `description` field because that is the established stable visible-presentation field for NPCs. Optional player facts should use stable keys:

- `backstory`
- `status`

The Player Card should be a persistent collapsible left rail in the play route. Expanded mode shows name, current location, and filled fields. It should provide a compact edit affordance for optional description/fact fields and save those values through Convex. Collapsed mode should keep the story readable and leave a clear expand control.

Prompt construction should add a distinct Player Card section. The section is read-only context for the Game Master and should coexist with the existing instruction not to choose new player actions, thoughts, feelings, or dialogue.

The Room Info panel should be a persistent right-side player-facing panel derived from the existing Adventure snapshot. It should read current room/location name and description from canonical location state and derive present NPCs from actors whose canonical location matches the player's current location. It should not duplicate the debug Locations tab, expose raw state, or add movement controls.

## Client And API Boundary

- Current clients: Next.js web playtest UI.
- Plausible future clients: mobile app, separate web world/player editor, CLI/dev tools.
- Reusable product capabilities:
  - Create Adventure with player name.
  - Read Adventure Player Card.
  - Update Adventure Player Card optional profile fields.
  - Read current Room Info from Adventure snapshot state.
  - Include Player Card in Game Master context.
- API or typed contract:
  - Convex mutation: create Adventure with `worldId` and `playerName`.
  - Convex mutation: update player profile fields for selected `adventureId`.
  - Convex query/read models: expose Player Card fields in snapshot and Game Master context.
  - Existing Convex query/read models: expose current room/location and present actors already used by Location Card context; extend only if the UI lacks the exact Room Info shape.
- OpenAPI plan, if HTTP-facing: Not applicable; this is Convex-backed app state.
- Backend platform exposed directly to clients?: Convex public mutations/queries remain the client-facing app state API for the local prototype.
- Client-specific presentation or local state:
  - Collapsed/expanded rail state can be browser-local UI state.
  - Unsaved edit drafts can be local UI state.
- Rationale: The backend owns durable profile truth so future clients can reuse it; the web client owns only presentation and editing state.

## Alternatives Considered

- New `playerProfiles` table:
  - Why not: heavier lifecycle/reset/auth surface before the product proves that player profiles need to outgrow actors plus facts.
- Client-only local profile:
  - Why not: conflicts with the state-first architecture and would make Game Master context less trustworthy.

## Why This Approach

It extends the current Actor/Facts model symmetrically without inventing a character subsystem. It gives the Game Master better protagonist context, gives the player a visible character anchor, and keeps future RPG fields possible without committing to inventory/stats/combat now.

## ADRs

- Required: no
- ADR path: not applicable
- Decision summary: Existing ADRs and docs already establish Convex canonical state, Adventure-owned runtime rows, and flexible actor facts. This change applies those rules to the player actor.
- Reconsider when:
  - Player profiles need reuse across Adventures.
  - Inventory/equipment/stats become first-class queryable systems.
  - Production auth requires user-owned profile records outside a single Adventure.

## Implementation Constraints

- Keep optional blank fields editable in the expanded Player Card while omitting them from filled prompt context.
- Do not move the Player Card into the debug panel.
- Do not move the Room Info panel into the debug panel.
- Do not let the Game Master mutate player profile facts in this slice.
- Do not let the Game Master infer or overwrite player intent from backstory/status.
- Do not add Room Info editing, movement controls, maps, exits-as-buttons, or dungeon traversal in this slice.
- Do not infer present NPCs from transcript text when canonical actor location says otherwise.
- Preserve existing Adventures; if they lack optional player facts, read them as blank.
- Keep mobile/responsive behavior usable by collapsing or stacking side rails rather than causing horizontal scroll.
- Use project-local visual style: dark-mode-native, narrative-first center pane, compact workbench layout, restrained motion, and no generic RPG chrome.

## Verification Strategy

- Focused automated tests:
  - Adventure creation requires/trims player name and stores it on the player actor.
  - Player profile field update/clear behavior persists and removes stale context.
  - Snapshot and Game Master context read models include Player Card fields.
  - Room Info panel derives current location and present NPCs from existing snapshot state.
  - Prompt tests prove Player Card context and player-agency instructions coexist.
- Broad supporting gates:
  - `npm run ci:required`.
  - `npm run convex:once` when Convex functions or generated API shape change.
- Deterministic E2E:
  - Create an Adventure with a custom player name.
  - Verify Player Card appears in the left rail, can collapse/expand, and persists profile edits across reload.
  - Verify Room Info appears in the right rail with current room name, description, and present NPCs.
  - Verify canceling the name prompt does not create an Adventure.
- Live-provider or external-service playtests:
  - Optional. A local model playtest may inspect raw prompt logs to confirm Player Card context affects narration without agency leakage.
- Manual UI confirmation:
  - Taylor confirms the left rail feels like a player-facing character surface, not debug UI.
  - Taylor confirms the right rail feels like scene context, not debug UI or a movement map.
  - Taylor confirms story width remains readable with the Player Card and Room Info panel visible.
- Debug/log inspection:
  - Inspect a raw request or persisted Game Master call in debug mode to confirm Player Card context appears only when relevant and blank optional fields are omitted.

## Decisions

- Use existing `actors` plus `facts` for the player model.
- Use existing current room/location snapshot state for the Room Info panel.
- Make player name required at new Adventure creation.
- Use a persistent collapsible left rail for the Player Card.
- Use a persistent read-only right rail for Room Info.
- Keep optional player fields blank by default and manually filled by the user.
- Keep inventory, equipment, health, stats, and rules deferred.

## Risks / Trade-Offs

- The side rails can compete with story reading width. Mitigation: keep the story column centered, make Player Card collapsible, and verify desktop/mobile layouts.
- The Room Info panel could accidentally become a MUD navigation surface. Mitigation: keep it read-only and defer links, maps, exits, and traversal controls.
- Inline editing can make a character card feel like a form. Mitigation: default to a reading surface with an explicit compact edit mode.
- Backstory/status could tempt the Game Master to over-author the player. Mitigation: keep agency instructions explicit and test prompt content.
- Actor facts may become too flexible if player profiles grow into full RPG sheets. Mitigation: reconsider a dedicated schema when inventory/stats/reusable characters become real requirements.
