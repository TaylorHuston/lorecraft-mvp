# Design: Slash Commands And Tutorial World

## Context

The current Lorecraft loop separates player decision controls from story turns. `Act` creates a turn with player input and Game Master narration. `Pass` creates a turn without player prose. Future Game Master prompts read canonical Adventure state plus recent successful narration history; previous player commands, debug records, and events are intentionally not the normal story-visible prompt history.

Slash commands fit best as pre-turn utility actions inside the player's decision phase. They should be useful to the player without redefining turns as every possible interaction.

The current startup screen is centered on one seeded World, Stormbound Chapel. Adding Tutorial makes the home screen a real list of seeded World containers and gives the slash-command work a first-use environment designed for onboarding rather than pure fiction testing.

## Goals / Non-Goals

**Goals:**

- Support `/help`, `/look`, and `/look <target>` from the same Act-expanded input.
- Offer lightweight client-side autocomplete for supported slash commands and visible `/look` targets.
- Persist slash-command results as Adventure-scoped utility feed entries.
- Keep slash-command results out of turn numbering, turn state extraction, and future Game Master narration context.
- Establish a reusable display and backend pattern for future pre-turn utility commands.
- Seed a second World named `Tutorial` with its own WorldVersion and default Adventure path.
- Let the startup screen show multiple seeded Worlds, each containing its own Adventures.
- Author Tutorial as a progressive onboarding scenario: one room with one NPC, then one room with multiple NPCs.

**Non-Goals:**

- No MUD-style movement parser, inventory commands, stats, combat, quest commands, or broad command palette.
- No state mutation from slash commands.
- No target disambiguation UI beyond an MVP text target.
- No rollback/retry implementation.
- No item manipulation tutorial until item/object manipulation exists.
- No polished curriculum UI, checklist, badges, or forced tutorial gates.
- No cross-World Adventure migration or sharing.

## Planning Interview / Story Refinement

- Scope boundary reviewed: this is a small LC-001 extension to the player-facing story loop, not a new command-parser Epic.
- User decisions:
  - `/look` does not consume a turn.
  - `/look` is one of many possible pre-turn things the player may eventually do.
  - `/look` supports no target for current-scene inspection and a target for specific visible/contextual inspection.
  - Slash-command output should use a reusable distinct feed pattern.
  - Slash commands are typed into the same input surface as Act; leading `/` changes execution behavior.
  - Add a Tutorial seed World for guided onboarding.
  - Tutorial should start with one NPC, then move into a multi-NPC scene; future object-manipulation tutorial content is deferred.
- Assumptions:
  - `/help` should not call the LLM.
  - `/look` should call the provider only after validating the selected Adventure and command shape.
  - Utility command output should reset with the Adventure because it is runtime play evidence.
  - The home screen should list multiple World containers using the existing World/Adventure mental model.
  - Tutorial content can use existing locations, actors, facts, exits, opening narration, and Adventure copy mechanics.
- Deferred scope:
  - More commands, aliases beyond displayed suggestions, command history, command palette UI, command mutation, and target disambiguation.
  - Accepted during manual feedback:
    - Client-side autocomplete for `/help`, `/look`, and visible `/look` targets.
  - Tutorial stages for item manipulation, combat, inventory, dice, quests, or builder workflows.
- Story boundaries challenged:
  - This is not a UI-only Story because the main value depends on persistence and future prompt exclusion.
  - Slash-command behavior remains LC-001 because it changes the chat/story experience and provider boundary.
  - Tutorial seed behavior belongs in LC-002 because it changes authored World seeds, World listing, and Adventure creation from multiple World sources.
- Requirements refined:
  - Turn exclusion and prompt exclusion are first-class Requirements, not implementation details.
- Scenario gaps considered:
  - Unknown command, empty command, missing target match, provider failure, reload, turn count stability, multiple World containers, and Tutorial Adventure creation.
- Open questions that block implementation:
  - None.

## Epic Changes

### Update Epic: LC-001 Provider-Agnostic Chat Experience

- Target Epic: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Change Type: added scope

#### Story Changes

- Added: `LC-001-S13: Pre-Turn Slash Command Utilities`
- Modified: none expected, except Story index/frontmatter updates.
- Removed: none.

#### Supersedes / Reconciles

- Earlier Story, Requirement, Scenario, or boundary wording this change supersedes:
  - Reconciles the earlier "avoid slash commands" MVP warning by limiting this change to pre-turn utility commands that do not create MUD-style gameplay.
- `Verified By` or `Verification Gaps` entries that must be rewritten or reclassified:
  - Add new scenario-mapped evidence for `LC-001-S13`; do not fold this into Act/Pass evidence.
- Closed or active change artifacts likely to need lifecycle/status cleanup:
  - None.
- Manual confirmation status updates expected:
  - Pending Taylor for visual treatment and play feel.

#### Story LC-001-S13: Pre-Turn Slash Command Utilities

As a playtester, I want lightweight slash commands during my decision phase, so that I can inspect the current fiction or get command help without ending my turn.

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
- THEN the Game Master prompt includes canonical state and recent successful narrations
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

##### Implemented By

- `convex/schema.ts` adds Adventure-scoped `utilityMessages`.
- `convex/world.ts` records utility messages, includes them in Adventure snapshots, and removes them during Adventure/World cleanup.
- `src/lib/director/slash-command.ts` parses `/help`, `/look`, targeted `/look`, empty slash input, and unsupported commands.
- `src/lib/director/look-prompt.ts` builds read-only scene/target inspection requests from current Director context.
- `src/server/director/utility-request.ts` and `src/server/director/utility-route.ts` handle utility command requests without entering the turn lifecycle.
- `src/app/api/director/utility/route.ts` exposes the utility route.
- `src/lib/world/convex-snapshot-read-model.ts` loads utility messages into the visible feed while keeping story-visible history narration-only.
- `src/features/play/world-client.tsx` and `src/features/play/turn-action-panel.tsx` route leading-slash input through utility handling and render distinct utility feed entries.
- `src/lib/director/slash-command-autocomplete.ts` derives command and visible-target suggestions for the client input.

##### Verified By

- `npm run test -- src/lib/director/slash-command.test.ts src/app/api/director/utility/route.test.ts`
- `npm run test`
- `npm run typecheck`
- `npm run convex:once`
- `npm run e2e`
- `npm run ci:required`
- `npm run test -- src/lib/director/slash-command-autocomplete.test.ts`

##### Verification Gaps

- Taylor manual browser confirmation remains pending for utility visual treatment and play feel.

### Update Epic: LC-002 World / Adventure Model

- Target Epic: `docs/epics/lc-002-world-adventure-model/epic.md`
- Change Type: added scope

#### Story Changes

- Added: `S5: Tutorial World Seed`
- Modified: `S1` may need wording updates because the startup screen will list seeded World containers, not only Stormbound Chapel.
- Removed: none.

#### Supersedes / Reconciles

- Earlier Story, Requirement, Scenario, or boundary wording this change supersedes:
  - Reconciles LC-002 wording that treats Stormbound Chapel as the only startup World container.
- `Verified By` or `Verification Gaps` entries that must be rewritten or reclassified:
  - Add new evidence for multi-World listing and Tutorial Adventure creation rather than rewriting existing Stormbound isolation evidence.
- Closed or active change artifacts likely to need lifecycle/status cleanup:
  - None.
- Manual confirmation status updates expected:
  - Pending Taylor for whether Tutorial feels like useful onboarding rather than in-app documentation.

#### Story S5: Tutorial World Seed

As a new playtester, I want a Tutorial World that teaches the basic interaction loop, so that I can learn Act, Pass, `/help`, `/look`, and NPC presence before entering a normal story world.

##### Requirement R1: Seeded Tutorial World

The system SHALL seed a second authored World named `Tutorial` with an immutable WorldVersion and playable Adventure copy support.

###### Scenario R1-S1: Tutorial appears as a World container

- WHEN the local demo seed runs
- THEN the startup screen includes a `Tutorial` World container in addition to `Stormbound Chapel`
- AND Tutorial has its own Adventure list and create/continue behavior

###### Scenario R1-S2: Tutorial Adventure copies its own source version

- WHEN the player creates a Tutorial Adventure
- THEN the Adventure stores the Tutorial `worldId` and `worldVersionId`
- AND its runtime locations, NPCs, facts, exits, objects, and opening narration are copied from Tutorial source content
- AND Stormbound Chapel Adventures are not modified

##### Requirement R2: Progressive Tutorial Content

The system SHALL author Tutorial content around the existing app mechanics without adding new gameplay systems.

###### Scenario R2-S1: Starter room with one NPC

- WHEN a Tutorial Adventure opens
- THEN the player starts in a tutorial location with one guide NPC
- AND the opening narration nudges the player to try `/help`, `/look`, Act, and Pass through fiction-friendly language

###### Scenario R2-S2: Multi-NPC room

- WHEN the player moves from the starter location to the next Tutorial location
- THEN the destination contains multiple NPCs
- AND the scene supports testing which NPCs are present, who responds, and what `/look <target>` can inspect

###### Scenario R2-S3: Unsupported future systems are not introduced

- WHEN Tutorial content references future lessons
- THEN it does not require item manipulation, combat, inventory, dice, quests, or builder UI to complete the current Tutorial flow

##### Implemented By

- `src/lib/world/stormbound-baseline.ts` defines the Tutorial seed World, locations, NPCs, objects, exits, and opening narration.
- `convex/world.ts` seeds Tutorial alongside Stormbound Chapel and can create Adventures from a selected seeded World.
- `src/features/play/adventure-landing.tsx` renders World containers with nested Adventure lists and per-World creation.
- `src/features/play/world-client.tsx` creates Adventures for the selected World container.
- `tests/e2e/lorecraft-playtest.spec.ts` covers Tutorial listing and Adventure creation.

##### Verified By

- `npm run test`
- `npm run typecheck`
- `npm run convex:once`
- `npm run e2e`
- `npm run ci:required`

##### Verification Gaps

- Taylor manual browser confirmation remains pending for whether Tutorial feels useful as onboarding rather than in-app documentation.

## Technical Options

### Option 1: Reuse Narrations Or Events For Slash Output; Keep One Seed World

- Summary: Store `/look` and `/help` results as existing narrations or events, and leave Tutorial for a later change.
- User impact: Fast to surface in the feed.
- Implementation complexity: Low.
- Reversibility: Moderate; later cleanup would need migration or display filtering.
- Client surfaces: Reuses existing feed display.
- API / contract shape: Minimal route changes.
- Frontend/backend boundary: Weak, because feed kinds would not represent the product distinction.
- Data / schema impact: No schema change.
- Auth / security impact: Same local route guard needs as Game Master routes.
- Testability: Prompt exclusion would need careful filtering based on source/text conventions.
- Operational risk: High risk of accidentally leaking utility text into future story prompts or treating it as story advancement.
- Fit with project conventions: Poor fit with the turn model's explicit story-visible boundary and misses the onboarding use case.

### Option 2: Add Adventure-Scoped Utility Messages And Tutorial Seed World

- Summary: Add a small `utilityMessages` table and feed kind for pre-turn command input/output, plus a Tutorial seed World shown by the same World/Adventure UI.
- User impact: Results are visible, resumable, and visually distinct; new players have an intentional onboarding World.
- Implementation complexity: Moderate and broader than slash commands alone.
- Reversibility: Good; table can evolve or be folded later if the concept proves wrong.
- Client surfaces: Web story stream renders `utility` feed entries; home screen lists multiple World containers.
- API / contract shape: Add a typed backend utility route that accepts `adventureId` and raw slash input.
- Frontend/backend boundary: Strong; backend owns parsing, target validation, provider calls, persistence, and prompt exclusion.
- Data / schema impact: One bounded Adventure-scoped table plus read-model/feed updates; seed/list functions generalize from one deterministic World to multiple seeded Worlds.
- Auth / security impact: Must use the same local-only route guard posture as `/api/director/turn`.
- Testability: High; parser, prompt building, persistence, Tutorial baseline copy, multi-World listing, and E2E can be tested deterministically.
- Operational risk: Low if raw requests stay debug-gated and utility results are not included in story-visible history.
- Fit with project conventions: Best fit with explicit state and prompt-boundary design.

### Option 3: Client-Only Slash Commands And Static Tutorial Copy

- Summary: Let the client show `/help`, maybe call `/look` without storing results, and add Tutorial mostly as UI copy rather than a real seeded World.
- User impact: Simple during one browser session, but reload loses results.
- Implementation complexity: Low for `/help`, awkward for `/look`.
- Reversibility: Easy.
- Client surfaces: Web-only.
- API / contract shape: Weak or inconsistent.
- Frontend/backend boundary: Poor for `/look`, because target validation and canonical context belong server-side.
- Data / schema impact: None.
- Auth / security impact: Avoids writes but still needs provider call protection for `/look`.
- Testability: Moderate for UI, poor for durable behavior.
- Operational risk: Results cannot be inspected after reload and future mobile clients would duplicate logic.
- Fit with project conventions: Poor fit with resumable Adventure state and the World/Adventure model.

## Selected Approach

Use Option 2: add Adventure-scoped utility messages, a server-owned slash-command execution path, and a real seeded Tutorial World.

The web client keeps one input surface. When submitted text starts with `/`, the client calls a new utility endpoint instead of `/api/director/turn`. The utility route validates the local request, parses the command, loads current Adventure context from Convex, and either returns deterministic engine output (`/help`, unknown command, unknown `/look` target) or builds a provider-agnostic `/look` request.

Utility results persist to Convex as feed entries with enough metadata to distinguish command name, optional target, input, output text, source, status, and optional Game Master/provider debug call. They are not turns, commands, narrations, events, or state diffs. The story-visible history helper continues to read successful narrations only, so utility output cannot become normal future Game Master context.

The seed layer should stop assuming Stormbound Chapel is the only World container. It should seed or repair Stormbound Chapel and Tutorial as separate authored Worlds with separate WorldVersions. The startup screen should list seeded Worlds, each with its own Adventures, turn counts, last played dates, creation action, and deletion action for Adventures. Tutorial should use existing baseline primitives: locations, exits, actors, facts, objects, and opening narration.

## Client And API Boundary

- Current clients: Next.js web UI.
- Plausible future clients: mobile app, debug/admin tooling, automated playtest harnesses.
- Reusable product capabilities:
  - Parse and validate slash-command input.
  - Execute pre-turn utility commands for an Adventure.
  - Persist and read utility feed entries.
  - Build `/look` provider requests from canonical context.
  - List seeded Worlds and create Adventures from the selected World's current WorldVersion.
- API or typed contract:
  - Proposed HTTP route: `POST /api/director/utility` or equivalent server-owned command route.
  - Request: `{ adventureId, input, promptGuidance? }`.
  - Response: `{ ok: true, message }` or `{ ok: false, error }`.
- OpenAPI plan, if HTTP-facing:
  - No formal OpenAPI document yet; keep TypeScript request/response types beside the route as the current contract.
- Backend platform exposed directly to clients?:
  - The client may keep using Convex queries for feed/snapshot read state, but command execution should go through the backend route so provider calls and target validation stay server-owned.
- Client-specific presentation or local state:
  - Input open/close behavior, pending state, utility entry styling, inline error display, and visual grouping of World containers.
- Rationale:
  - This preserves the frontend/backend split while keeping the MVP simple.

## Alternatives Considered

- Reuse existing narrations/events and defer Tutorial:
  - Rejected because it blurs prompt-history boundaries and makes utility output too easy to treat as story prose.
- Client-only commands and static Tutorial copy:
  - Rejected because `/look` needs canonical Adventure context and provider access, utility results should survive reload, and Tutorial should be a real World/Adventure seed.

## Why This Approach

This approach adds the smallest durable concept that matches the product behavior: a player-visible utility result that is not a turn. It keeps Lorecraft story-first, avoids broad parser scope, gives future commands a place to live without corrupting narration history, and adds an onboarding World without inventing new gameplay systems.

## ADRs

- Required: no
- ADR path: not applicable
- Decision summary: Slash commands use existing backend-authority and turn-boundary rules; no new cross-cutting architecture rule is needed.
- Reconsider when: slash commands begin mutating canonical state, become a public API surface, or require command permissions/ownership.

## Implementation Constraints

- Do not create turns, commands, narrations, events, state diffs, or state extraction for slash-command utility actions.
- Do not include utility output in `loadStoryVisibleHistory` or transcript-mode narrative continuity unless a future change explicitly defines that behavior.
- Keep `/look` responses player-facing and observational. They should not reveal hidden NPC knowledge unless the player could plausibly observe it.
- Gate provider raw request/response logging with the same debug posture as Game Master turns.
- Keep unsupported commands recoverable and help-oriented.
- Keep Tutorial source content authored in seed/baseline helpers, not in ad hoc UI copy.
- Keep Tutorial resettable and isolated from Stormbound Chapel.
- Do not add item manipulation mechanics just to make the future item tutorial room work.

## Verification Strategy

- Focused automated tests:
  - Slash parser and command dispatch.
  - `/look` target resolution against current location actors, visible objects, current location, and known locations as appropriate.
  - Feed reconstruction includes utility entries while story-visible narration history excludes them.
  - Route tests prove `/help` and unsupported commands do not need provider config and `/look` handles missing config without creating a turn.
  - Seed/list tests prove Tutorial and Stormbound Chapel both create isolated WorldVersion-backed Adventures.
- Broad supporting gates:
  - `npm run ci:required`.
- Deterministic E2E:
  - Use fixture provider to run `/help`, `/look`, later Act, reload, debug/feed assertions, Tutorial Adventure creation, and basic Tutorial navigation.
- Live-provider or external-service playtests:
  - Optional local Ollama/Studio playtest for `/look` prose quality.
- Manual UI confirmation:
  - Taylor confirms the utility feed styling and input behavior feel distinct from story advancement.
- Debug/log inspection:
  - Confirm utility provider calls include model/provider metadata and no `turnId`.

## Decisions

- Slash commands are same-input, leading-slash actions.
- `/look` is pre-turn, optional-target, and read-only.
- `/help` is deterministic engine output.
- Utility outputs are persisted and player-visible but not story-visible prompt history.
- Tutorial is a real seeded World, not a modal, overlay, or static help screen.
- Tutorial teaches only currently implemented mechanics.

## Risks / Trade-Offs

- Adding a new feed kind and table is more structure than reusing narrations, but it protects the central turn/story boundary.
- Adding Tutorial in the same change widens scope, but it creates a focused place to test slash-command onboarding and avoids polishing help text in the main fiction world.
- `/look` prose quality may vary by model; deterministic tests should validate routing and grounding shape, not creative writing quality.
- Target matching can become complex. MVP matching should stay simple and bounded to current context.
