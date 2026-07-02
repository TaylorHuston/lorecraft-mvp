# Design: World / Adventure Model

## Context

Lorecraft's current MVP has one seeded Stormbound Chapel `worlds` row that acts as authored baseline, current runtime state, and reset target. Runtime tables are keyed by `worldId`, including locations, actors, objects, facts, turns, narrations, events, state diffs, and Game Master calls.

That model is intentionally temporary. The accepted ADR [World Templates Create Frozen Adventure Copies](../../adrs/2026-07-01-world-adventure-frozen-copies.md) decides that Worlds are authored source material and Adventures are frozen playable copies from a specific World version. This change proposes the first implementation slice of that decision.

## Goals / Non-Goals

**Goals:**

- Introduce World, WorldVersion, and Adventure as distinct product/data concepts.
- Keep the Stormbound Chapel playtest simple: seed a WorldVersion, list local Adventures, continue an existing Adventure, or create a new Adventure copy.
- Scope mutable runtime state to Adventure identity.
- Prove existing Adventures do not change when their source World gets a new version.
- Preserve the current Game Master story loop, debug panel, NPC Cards, Location Cards, state extraction, movement validation, turns, and deterministic E2E path under the new identity model.
- Keep reset semantics clear: reset Adventure restores from its original WorldVersion.

**Non-Goals:**

- User accounts, auth, ownership, sharing, publishing, or permissions.
- A polished public World Builder.
- Dynamic World patching into existing Adventures.
- Branching adventures, save slots, manual snapshots, or rollback.
- Multiplayer or shared live worlds.
- New gameplay systems such as combat, inventory, quests, stats, dice, or dungeon navigation.

## Epic Changes

### Create Epic: LC-002 World / Adventure Model

- Proposed directory: `docs/epics/lc-002-world-adventure-model/`
- Proposed file: `docs/epics/lc-002-world-adventure-model/epic.md`
- Supporting artifacts may later live beside `epic.md` in the same Epic directory.

#### Epic

Lorecraft separates authored World material from playable Adventure instances so each story can mutate, reset, and resume without being changed by later World edits.

#### Story S1: Start Adventure From World Version

As a playtester, I want Lorecraft to start a playable Adventure from a World version, so that the story has its own mutable copy of the authored setup.

##### Requirement R1: Adventure Creation

The system SHALL create an Adventure from a selected WorldVersion by copying baseline playable state into Adventure-owned runtime state.

###### Scenario R1-S1: Default demo Adventure is created

- WHEN the local demo world is seeded or repaired
- THEN the system creates an authored Stormbound Chapel WorldVersion
- AND the system creates or resumes local Adventures from that version
- AND the player can continue an existing Adventure or create a new one from the startup screen

###### Scenario R1-S2: Adventure records source identity

- WHEN an Adventure is created
- THEN it stores the source `worldId` and `worldVersionId`
- AND debug state can show which WorldVersion the Adventure came from

##### Requirement R2: Baseline Copy

The system SHALL copy the WorldVersion baseline locations, actors, objects, facts, exits, and initial narration into Adventure-owned rows.

###### Scenario R2-S1: Copied baseline is playable

- WHEN an Adventure is opened
- THEN the Game Master context includes Adventure-owned locations, NPCs, facts, objects, and recent story
- AND no runtime prompt context is read from mutable World template rows

##### Implemented By

See `docs/epics/lc-002-world-adventure-model/epic.md` Story S1.

##### Verified By

See `docs/epics/lc-002-world-adventure-model/epic.md` Story S1.

##### Verification Gaps

- Full implementation and verification maps are maintained in the LC-002 Epic.

#### Story S2: Adventure-Scoped Runtime State

As a playtester, I want story turns and state changes to belong to my Adventure, so that play can resume from the story I actually changed.

##### Requirement R1: Runtime Rows Are Adventure-Scoped

The system SHALL scope mutable play state to `adventureId`.

###### Scenario R1-S1: Narrative turn writes Adventure state

- WHEN the player submits a narrative turn in an Adventure
- THEN the command, turn, narration, Game Master call, accepted state diffs, actor movement, and NPC fact changes are associated with that Adventure
- AND equivalent World template records are not mutated

###### Scenario R1-S2: Feed reloads from Adventure state

- WHEN the browser reloads the current Adventure
- THEN the story feed is reconstructed from Adventure-scoped commands, narrations, and events
- AND the current scene is reconstructed from Adventure-scoped canonical state

##### Requirement R2: Debug Surfaces Use Adventure Identity

The system SHALL present debug state for the selected Adventure, not for the authored World template.

###### Scenario R2-S1: Debug state follows selected Adventure

- WHEN the debug panel shows NPCs, locations, hidden facts, turns, Game Master calls, and state diffs
- THEN those records describe the current Adventure's runtime state
- AND source WorldVersion identity remains visible as context rather than mutable runtime truth

##### Implemented By

See `docs/epics/lc-002-world-adventure-model/epic.md` Story S2.

##### Verified By

See `docs/epics/lc-002-world-adventure-model/epic.md` Story S2.

##### Verification Gaps

- Full implementation and verification maps are maintained in the LC-002 Epic.

#### Story S3: World Version Edits Do Not Mutate Existing Adventures

As a creator or playtester, I want World updates to affect future Adventures only, so that ongoing stories do not unexpectedly change.

##### Requirement R1: World Versions Are Immutable Sources

The system SHALL treat a WorldVersion as an immutable authored baseline after Adventures have been created from it.

###### Scenario R1-S1: New WorldVersion leaves existing Adventure unchanged

- WHEN a World receives a new version after an Adventure already exists
- THEN the existing Adventure remains tied to its original source WorldVersion
- AND its copied actors, locations, objects, facts, turns, narrations, events, and state diffs remain unchanged

###### Scenario R1-S2: Future Adventure uses current WorldVersion

- WHEN a new Adventure is created after the World current version changes
- THEN the new Adventure copies from the current WorldVersion
- AND older Adventures continue using their original copied state

##### Requirement R2: No Implicit Migration

The system SHALL NOT apply WorldVersion changes to existing Adventures unless a future explicit migration feature is implemented.

###### Scenario R2-S1: Source update is not applied automatically

- WHEN authored World content changes after an Adventure exists
- THEN the Adventure is not patched, merged, or reconciled automatically
- AND no Adventure runtime rows are changed as a side effect of editing the World source

##### Implemented By

See `docs/epics/lc-002-world-adventure-model/epic.md` Story S3.

##### Verified By

See `docs/epics/lc-002-world-adventure-model/epic.md` Story S3.

##### Verification Gaps

- Full implementation and verification maps are maintained in the LC-002 Epic.

#### Story S4: Reset Adventure To Source Version

As a playtester, I want to reset the current Adventure to its starting WorldVersion, so that I can replay from a known baseline without changing the authored World.

##### Requirement R1: Adventure Reset

The system SHALL reset an Adventure by replacing its mutable runtime state with a fresh copy of its source WorldVersion.

###### Scenario R1-S1: Reset restores original version

- WHEN an Adventure has mutated through player turns, NPC fact updates, actor movement, debug edits, or created debug objects
- AND the player resets the Adventure
- THEN runtime state returns to the Adventure's source WorldVersion baseline
- AND the reset does not use a newer WorldVersion unless a future explicit upgrade flow is implemented

###### Scenario R1-S2: Reset is destructive only to the selected Adventure

- WHEN an Adventure is reset
- THEN other Adventures and WorldVersion source rows remain unchanged
- AND debug evidence makes the reset scope clear enough for local playtesting

##### Implemented By

See `docs/epics/lc-002-world-adventure-model/epic.md` Story S4.

##### Verified By

See `docs/epics/lc-002-world-adventure-model/epic.md` Story S4.

##### Verification Gaps

- Full implementation and verification maps are maintained in the LC-002 Epic.

### Update Epic: LC-001 Provider-Agnostic Chat Experience

- Target Epic: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Change Type: modified scope

#### Story Changes

- Added: none.
- Modified: deferred-scope wording should point to `LC-002` once the World / Adventure model is implemented.
- Removed: none.

#### Supersedes / Reconciles

- Earlier Story, Requirement, Scenario, or boundary wording this change supersedes: LC-001 deferred-scope wording that says campaign/world-instance persistence is deferred.
- `Verified By` or `Verification Gaps` entries that must be rewritten or reclassified: none expected unless existing LC-001 evidence assumes `worldId` remains the runtime identity.
- Closed or active change artifacts likely to need lifecycle/status cleanup: none identified.
- Manual confirmation status updates expected: not applicable for LC-001 unless implementation changes the visible default playtest startup path.

## Epic File Rules

- Stories live inside the Epic `epic.md` file.
- Do not create `docs/stories/` or individual Story files.
- New Epic `LC-002` should use Epic-scoped labels `S1`, `S2`, `S3`, and `S4`.
- Requirement IDs restart inside each Story.
- Scenario IDs are scoped to their Requirement.

## Technical Options

### Option 1: Rename Current `worlds` Runtime Model In Place

- Summary: Keep the existing tables mostly intact and reinterpret current `worldId` as an Adventure-like identity.
- User impact: Smallest visible disruption.
- Implementation complexity: Lower upfront, but high semantic debt.
- Reversibility: Poor; the data model remains ambiguous.
- Client surfaces: Minimal changes now.
- API / contract shape: Existing `worldId` request shape mostly remains.
- Frontend/backend boundary: Existing boundaries stay, but naming lies about authority.
- Data / schema impact: Smaller migration but still needs future cleanup.
- Auth / security impact: No new auth model.
- Testability: Harder to prove World edits do not affect Adventures because World and Adventure remain overloaded.
- Operational risk: High future drift risk.
- Fit with project conventions: Weak fit with the accepted ADR.

### Option 2: Add `adventures` But Keep Runtime Tables Keyed By `worldId`

- Summary: Introduce Adventure metadata while still using `worldId` on runtime tables.
- User impact: Lets the UI say Adventure without a full migration.
- Implementation complexity: Medium.
- Reversibility: Medium, but creates a halfway model.
- Client surfaces: Route/API may carry both `worldId` and `adventureId`.
- API / contract shape: Ambiguous unless carefully wrapped.
- Frontend/backend boundary: Better product language, weak persistence boundary.
- Data / schema impact: Adds metadata without moving state ownership.
- Auth / security impact: No new auth model.
- Testability: Can test metadata, but cannot cleanly prove runtime isolation.
- Operational risk: Medium; easy for future code to accidentally read/write by `worldId`.
- Fit with project conventions: Partial fit, but contradicts the ADR's follow-up that runtime tables should move to `adventureId`.

### Option 3: Introduce WorldVersion And Adventure-Owned Runtime Rows

- Summary: Add `worldVersions` and `adventures`, copy baseline state into Adventure-owned runtime rows, and migrate runtime tables to `adventureId`.
- User impact: Clearer reset/resume behavior and foundation for future World Builder flows.
- Implementation complexity: Highest of the immediate options.
- Reversibility: Reasonable during MVP because local seeded data is disposable.
- Client surfaces: Current browser can list Adventures, create a new Adventure, and open the selected Adventure; future clients can target Adventure APIs.
- API / contract shape: Route and Convex contracts should identify the selected Adventure for play and optionally source World/Version for debug context.
- Frontend/backend boundary: Strong; backend owns copy/reset/isolation while UI presents the current story.
- Data / schema impact: Meaningful schema migration from `worldId` runtime ownership to `adventureId`.
- Auth / security impact: No production auth yet, but this creates the later ownership boundary.
- Testability: Strong; copy, isolation, reset, and prompt scoping are deterministic.
- Operational risk: Manageable because the app is still an MVP with local resettable seed state.
- Fit with project conventions: Best fit with the accepted ADR and state-first persistence strategy.

## Selected Approach

Use Option 3: introduce explicit `WorldVersion` and `Adventure` concepts and move mutable runtime ownership to `adventureId`.

Implementation should keep the player-facing MVP simple. On local seed/repair, the app should create the Stormbound Chapel World, create an initial immutable WorldVersion, and create or resume Adventures from that version. The current play UI should start on a lightweight Adventure screen where a playtester can continue an existing Adventure or create a new one.

Convex should own copy and reset behavior. The route, prompt builder, debug panel, and E2E path should request and render current Adventure context. Source World and WorldVersion should appear as debug context, not runtime truth. Existing provider and extraction behavior should remain unchanged except that it reads and writes Adventure-scoped state.

## Client And API Boundary

- Current clients: Next.js browser playtest UI and local E2E fixture client.
- Plausible future clients: mobile app, CLI/admin tooling, World Builder UI, automated playtest scripts, and future hosted web UI.
- Reusable product capabilities: create Adventure from WorldVersion, get current Adventure context, record turn, apply bounded state extraction, reset Adventure, inspect debug state.
- API or typed contract: Convex functions remain the product backend contract for now; Next route orchestration should receive `adventureId` or resolve the default Adventure before recording a turn.
- OpenAPI plan, if HTTP-facing: not required for this slice because Convex functions and the Next Game Master route are the existing typed contract. Reconsider if a public REST boundary appears.
- Backend platform exposed directly to clients?: The browser already uses Convex for app state. That remains acceptable for MVP, but privileged seed/reset/debug writes must stay gated to local/dev context.
- Client-specific presentation or local state: UI can decide how to display the selected Adventure and debug source version, but it must not implement copy/reset/isolation rules.
- Rationale: Adventure isolation is durable product behavior and belongs behind backend functions, not React component state.

## Alternatives Considered

- Option: keep one mutable World.
  - Why not: It is the current limitation and contradicts the accepted ADR.
- Option: add Adventure metadata but leave runtime rows keyed by `worldId`.
  - Why not: It creates confusing half-truth and leaves the main isolation bug possible.
- Option: model Adventures as deltas over WorldVersion rows.
  - Why not: The ADR rejected this because it is harder to reason about and overcomplicates MVP reset/prompt behavior.

## Why This Approach

This approach matches the accepted ADR and makes the key product invariant testable: existing Adventures remain stable even when authored World material changes. It costs more schema work now, but it avoids building more features on top of an overloaded `worldId` runtime identity.

## ADRs

- Required: yes, already created and accepted
- ADR path: `docs/adrs/2026-07-01-world-adventure-frozen-copies.md`
- Decision summary: Worlds are authored source material; Adventures are frozen playable copies from a specific WorldVersion; World updates affect future Adventures only; reset uses the Adventure's original source WorldVersion.
- Reconsider when: copied Adventure state becomes too large, explicit World patching into existing Adventures becomes necessary, multiplayer/shared live worlds change the product model, or production storage cost makes full copies impractical.

## Implementation Constraints

- Keep implementation on a change branch before code/schema edits.
- Preserve the current local-first playtest path; do not require a multi-step management UI before the player can test the story loop.
- Keep debug routes local/dev-gated.
- Do not introduce auth or production sharing semantics in this change.
- Keep provider behavior OpenAI-compatible and backend-owned.
- Do not add rollback snapshots; only design reset-to-source-version.
- Be explicit about destructive reset scope.
- Prefer deterministic migration/seed behavior over trying to preserve every local disposable playtest row.

## Verification Strategy

- Focused automated tests:
  - Copying WorldVersion baseline into Adventure runtime rows.
  - Recording a turn writes Adventure-scoped commands, narrations, Game Master calls, state diffs, actor moves, and NPC fact updates.
  - Creating a newer WorldVersion leaves an existing Adventure unchanged.
  - Resetting an Adventure restores its original source WorldVersion.
- Broad supporting gates:
  - `npm run ci:required`.
  - `npm run convex:once`.
- Deterministic E2E:
  - Default browser path seeds/opens an Adventure, submits narrative input, reloads the feed, inspects debug evidence, edits NPC/location state, resets the Adventure, and confirms source-version baseline restored.
- Live-provider or external-service playtests:
  - Optional local Ollama/LM Studio/OpenRouter playtest after deterministic checks pass.
- Manual UI confirmation:
  - Pending Taylor for any changed startup/reset/debug wording or visible Adventure identity.
- Debug/log inspection:
  - Confirm Game Master call request summaries and local logs include Adventure identity and source WorldVersion context without treating raw prompt data as canonical state.

## Decisions

- Use a new `LC-002` Epic rather than stretching `LC-001`.
- Implement WorldVersion now instead of postponing it behind an ambiguous Adventure-only metadata layer.
- Keep the first player-facing path as a lightweight Adventure selection screen, not a polished save-slot system.
- Treat this as a user-facing changelog entry because reset/resume semantics and debug state identity will change.

## Risks / Trade-Offs

- Schema churn touches many current `worldId` paths.
- Copying baseline state duplicates rows, which is acceptable for MVP but may need reconsideration at scale.
- Local seed/reset behavior may be easier to rebuild than migrate perfectly; this is acceptable only while the app remains a local MVP.
- Existing E2E may need broad fixture updates because many selectors and debug rows currently assume World identity.
