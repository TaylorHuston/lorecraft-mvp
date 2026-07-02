---
id: LC-002
status: draft
created: 2026-07-01
modified: 2026-07-02
last_verified: 2026-07-02
stories:
  - S1
  - S2
  - S3
  - S4
---

# LC-002 World / Adventure Model

## Product Context

- Related ADRs: `docs/adrs/2026-07-01-world-adventure-frozen-copies.md`
- Related docs: `docs/data-model.md`, `docs/persistence-system.md`, `docs/architecture.md`

Lorecraft needs a clear boundary between authored World material and mutable play state. A World is reusable source material; an Adventure is a durable playable copy created from a specific WorldVersion.

## Outcome

Playtesters can start and resume a Stormbound Chapel Adventure that mutates independently from authored World material, while reset restores the Adventure to the WorldVersion it was created from.

## Current Scope

- Seed the Stormbound Chapel World and immutable WorldVersion.
- Create, resume, or delete local Adventures from the startup World container screen, then play each Adventure at `/adventures/<id>`.
- Scope mutable runtime rows, debug state, Game Master turns, feed reconstruction, NPC edits, location edits, actor movement, state diffs, and reset to the Adventure.
- Keep source World and WorldVersion visible as debug/source context.

## Deferred Scope

- User accounts, ownership, sharing, publishing, permissions, and production migration tooling.
- Polished World Builder, World patching into existing Adventures, snapshots, rollback, branching, and save slots.
- Multiplayer/shared live worlds.
- Combat, inventory, stats, quests, dice, and dungeon navigation.

## Candidate Stories

| Candidate | Status | Story Shape | Acceptance Signals |
|---|---|---|---|

## Story Index

| Story | Status | Capability | Last Verified | Notes |
|---|---|---|---|---|
| S1 | implemented | Start Adventure From World Version | 2026-07-02 | Startup screen can continue existing Adventures or create a new copy from the current WorldVersion. |
| S2 | implemented | Adventure-Scoped Runtime State | 2026-07-01 | Runtime reads/writes and debug state use `adventureId`. |
| S3 | implemented | World Version Edits Do Not Mutate Existing Adventures | 2026-07-01 | Live Convex isolation smoke proved v1 Adventure stayed unchanged after v2 source creation. |
| S4 | implemented | Reset Adventure To Source Version | 2026-07-01 | Live Convex reset smoke proved reset restores selected Adventure from its original source version. |

## Stories

### Story S1: Start Adventure From World Version

Status: implemented
Created: 2026-07-01
Modified: 2026-07-01
Last verified: 2026-07-02

As a playtester, I want Lorecraft to start a playable Adventure from a World version, so that the story has its own mutable copy of the authored setup.

#### Requirements And Scenarios

##### Requirement R1: Adventure Creation

The system SHALL create an Adventure from a selected WorldVersion by copying baseline playable state into Adventure-owned runtime state.

###### Scenario R1-S1: Default demo Adventure is created

- WHEN the local demo world is seeded or repaired
- THEN the system creates an authored Stormbound Chapel WorldVersion
- AND the system creates or resumes local Adventures from that version
- AND the startup screen shows Stormbound Chapel as the World container at `/`
- AND the player can continue an existing Adventure from that container or create a new one
- AND opening an Adventure navigates to `/adventures/<id>`
- AND the player can delete a local Adventure from that container without deleting the source WorldVersion

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

#### Implemented By

| Path | Role | Recheck Trigger |
|---|---|---|
| `convex/schema.ts` | Defines `worldVersions`, `adventures`, source-version metadata, and Adventure-owned runtime row fields/indexes. | Recheck when WorldVersion/Adventure shape changes. |
| `convex/world.ts` | Builds the Stormbound Chapel baseline, lists local Adventures, creates new Adventures from the current WorldVersion, deletes selected Adventures and their runtime rows, and copies locations, exits, actors, objects, facts, opening events, and opening narration into Adventure rows. | Recheck when seed/copy/repair/reset/delete behavior changes. |
| `src/app/page.tsx` | Hosts the World container route at `/`. | Recheck when startup routing changes. |
| `src/app/adventures/[adventureId]/page.tsx` | Hosts direct Adventure URLs at `/adventures/<id>`. | Recheck when Adventure routing changes. |
| `src/app/world-client.tsx` | Shows the startup World container screen, lists Adventures inside Stormbound Chapel, navigates to Adventure URLs, creates and deletes local Adventures, and loads the selected Adventure snapshot. | Recheck when startup or Adventure selection changes. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1, R1-S2, R2-S1 | `npm run convex:once`; `LORECRAFT_ENABLE_DEBUG_ROUTES=1 npx convex run world:seedDemoWorld`; `npx convex run world:getSnapshot '{\"adventureId\":\"kn7dej4650m780jyn93w55qhfn89rnxc\"}'` | Convex schema compiles, seed creates a default Adventure, snapshot exposes Adventure/source WorldVersion identity, and playable rows are copied into Adventure-owned state. | Passing |
| R1-S1, R1-S2, R2-S1 | `npm run test`; `npm run typecheck` | Type and unit coverage compile against the new Adventure context contract. | Passing |
| R1-S1, R1-S2, R2-S1 | Browser smoke and E2E against `http://localhost:3000`: startup screen showed Stormbound Chapel as the World container, listed existing Adventures by turns and last played date, New Adventure created `Stormbound Chapel Adventure 2`, the story stream opened at `/adventures/<id>` with source-version opening narration, reload preserved that Adventure URL, Back returned to the World container, and a temporary Adventure could be deleted from the list. | The player-facing startup flow supports continue/create/delete and opens a copied playable Adventure at a direct URL. | Passing |

#### Verification Gaps

- Optional live-provider smoke remains deferred; deterministic route, reset, and runtime coverage is passing.

### Story S2: Adventure-Scoped Runtime State

Status: implemented
Created: 2026-07-01
Modified: 2026-07-02
Last verified: 2026-07-02

As a playtester, I want story turns and state changes to belong to my Adventure, so that play can resume from the story I actually changed.

#### Requirements And Scenarios

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

#### Implemented By

| Path | Role | Recheck Trigger |
|---|---|---|
| `convex/world.ts` | Reads/writes commands, turns, narrations, events, facts, state diffs, Game Master calls, actor moves, NPC edits, location edits, and feed reconstruction by Adventure. | Recheck when persistence, debug editing, movement, reset, or feed behavior changes. |
| `src/app/api/director/turn/route.ts` | Accepts `adventureId`, loads Adventure context, records turn artifacts against the Adventure, and passes Adventure/source-version metadata into logs. | Recheck when Game Master route input or turn orchestration changes. |
| `src/app/world-client.tsx` | Sends `adventureId` for turns and debug mutations, shows Adventure/source WorldVersion in debug state, and reloads snapshot/feed from selected Adventure state. | Recheck when UI state identity changes. |
| `src/lib/director/types.ts`, `src/lib/director/prompt.ts`, `src/lib/director/debug-log.ts`, `src/lib/director/turn-errors.ts` | Carry Adventure/source-version identity through prompts, summaries, logs, and user-facing load errors. | Recheck when prompt/log/error contracts change. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1, R1-S2, R2-S1 | `npm run test -- src/app/api/director/turn/route.test.ts src/lib/director/director.test.ts`; `npm run test` | Route/unit contracts use `adventureId`, Adventure load errors are structured, and prompt/debug summaries include Adventure/source-version metadata. | Passing |
| R1-S1, R1-S2, R2-S1 | `npm run typecheck`; `npm run convex:once` | TypeScript and Convex generated schema/functions accept Adventure-scoped runtime contracts. | Passing |
| R1-S1, R1-S2, R2-S1 | `npm run e2e`; `npm run ci:required` | Browser playtest and required CI pass with Adventure-scoped story turns, debug state, reload behavior, and reset/delete flows. | Passing |

#### Verification Gaps

- Optional live-provider smoke remains deferred; deterministic browser E2E and required CI are passing.

### Story S3: World Version Edits Do Not Mutate Existing Adventures

Status: implemented
Created: 2026-07-01
Modified: 2026-07-02
Last verified: 2026-07-02

As a creator or playtester, I want World updates to affect future Adventures only, so that ongoing stories do not unexpectedly change.

#### Requirements And Scenarios

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

#### Implemented By

| Path | Role | Recheck Trigger |
|---|---|---|
| `convex/world.ts` | Creates immutable WorldVersion baselines, advances the World current version for future Adventures, and creates new Adventures from the current WorldVersion without patching existing Adventures. | Recheck when World authoring/versioning or Adventure creation changes. |
| `convex/schema.ts` | Stores Adventure `worldVersionId` separately from the World current version. | Recheck when schema ownership changes. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1, R1-S2, R2-S1 | Live Convex smoke: seeded default Adventure from v1, ran `world:createDemoWorldVersion` with a changed chapel description to create v2, then ran `world:createAdventureFromCurrentWorldVersion` for an isolation-check Adventure. Snapshots showed the original Adventure remained on v1 with the original chapel description while the new Adventure used v2 with the changed description. | Existing Adventures remain tied to their original WorldVersion and are not implicitly patched when World source advances. | Passing |

#### Verification Gaps

- Deterministic automated coverage for source-version isolation should be added before this model grows beyond the local MVP smoke path.

### Story S4: Reset Adventure To Source Version

Status: implemented
Created: 2026-07-01
Modified: 2026-07-01
Last verified: 2026-07-01

As a playtester, I want to reset the current Adventure to its starting WorldVersion, so that I can replay from a known baseline without changing the authored World.

#### Requirements And Scenarios

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

#### Implemented By

| Path | Role | Recheck Trigger |
|---|---|---|
| `convex/world.ts` | Deletes selected Adventure runtime rows and recopies the Adventure's original source WorldVersion baseline. | Recheck when reset semantics, seeded baseline shape, or Adventure ownership changes. |
| `src/app/world-client.tsx` | Wires Reset Session to the selected Adventure. | Recheck when reset UI wording or selected identity changes. |

#### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| R1-S1, R1-S2 | Live Convex smoke: reset the v2 isolation-check Adventure with `world:resetPlaytestWorld`, then reloaded its snapshot. It stayed tied to WorldVersion v2 and restored v2 baseline rows without affecting the original v1 Adventure. | Reset restores the selected Adventure from its original source WorldVersion and does not upgrade from or mutate other Adventures. | Passing |
| R1-S1, R1-S2 | `npm run e2e`; `npm run ci:required` | Browser playtest and required CI pass with selected-Adventure reset restoring source-version baseline state. | Passing |

#### Verification Gaps

- Optional live-provider smoke remains deferred; deterministic browser E2E and required CI are passing.

## Cross-Story Concerns

- `worldId` may remain as source metadata or compatibility scaffolding during the MVP migration, but runtime reads and writes for implemented paths must use `adventureId`.
- Reset is intentionally destructive for the selected Adventure and local playtest state.
- WorldVersion patching into existing Adventures is explicitly deferred.

## Open Decisions

- None blocking.

## Completion Criteria

This Epic is healthy when:

- Embedded Stories cover the current scope.
- Requirements and Scenarios describe implemented behavior or intentional gaps.
- `Implemented By` points to the important starting files.
- `Verified By` maps concrete evidence to Requirements/Scenarios.
- `Verification Gaps` are real, current, and explicit.
- Related changes, docs, indexes, reviews, and changelog entries do not contradict this Epic.
