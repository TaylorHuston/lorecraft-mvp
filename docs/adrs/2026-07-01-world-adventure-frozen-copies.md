# ADR: World Templates Create Frozen Adventure Copies

- Status: Accepted
- Date: 2026-07-01
- Related change: none yet
- Related Epics / Stories: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Supersedes: none
- Superseded by: none

## Context

Lorecraft began as a one-world persistent memory spike. In the current MVP, the `worlds` table acts as both the authored Stormbound Chapel baseline and the mutable playtest state. That was useful while proving the Game Master loop, NPC Cards, Location Cards, scoped turns, state diffs, and reset behavior.

The next product step needs a clearer boundary between authored world material and a player's live playable state. A World update must not unexpectedly alter or break an existing story that a player is already playing. Existing Adventures need to remain resumable even when the source World changes later.

This decision affects data ownership, reset semantics, World Builder scope, prompt context assembly, state diffs, future rollback, and how future reviews should reason about mutation authority.

## Decision

Lorecraft SHALL model a **World** as authored source material and an **Adventure** as a durable playable instance created from a specific World version.

When an Adventure starts, Lorecraft SHALL create a copy of the selected World version's baseline playable state. Runtime mutations SHALL apply to the Adventure copy only. World updates SHALL affect future Adventures only and MUST NOT mutate existing Adventures automatically.

Resetting an Adventure SHALL reset it to the World version it was created from, not to the current latest World version. Updating an existing Adventure to a newer World version MAY be added later, but it must be an explicit migration or upgrade action with reviewable behavior.

The intended long-term shape is:

```text
World
  currentVersionId

WorldVersion
  worldId
  immutable authored baseline content

Adventure
  worldId
  worldVersionId
  mutable copied runtime state
```

Current runtime tables that store mutable play state should eventually be keyed by `adventureId` rather than using `worldId` as both template and instance identity.

## Options Considered

### Option 1: Keep one mutable World

- Summary: Continue using `worlds` as both authored baseline and mutable play state.
- Pros: Smallest immediate schema change; matches the current MVP implementation.
- Cons: Blurs authoring and play state; makes World Builder semantics unclear; makes it easy for edits to the base World to affect in-progress stories; does not model multiple players or multiple playthroughs cleanly.

### Option 2: Copy WorldVersion into a frozen Adventure

- Summary: Treat a World as source material, create immutable World versions, and copy the selected version into an Adventure for play.
- Pros: Clear ownership of runtime state; existing stories remain stable; reset semantics are understandable; easier to inspect and debug; avoids accidental drift from World edits into live play.
- Cons: Duplicates rows; requires migration from current `worldId`-owned runtime tables; future World updates need explicit migration tooling if creators want to patch existing Adventures.

### Option 3: Store Adventures as deltas over a live World

- Summary: Keep baseline data in the World and store only Adventure-specific overrides/deltas.
- Pros: Less data duplication; base World fixes could theoretically flow into existing Adventures.
- Cons: Much harder to reason about; deletion, override, visibility, and conflict semantics get complex quickly; risks breaking existing stories when base content changes; makes prompt context assembly and reset behavior harder to verify.

### Option 4: Automatically update existing Adventures when the World changes

- Summary: Existing Adventures continue tracking the latest World version unless overridden.
- Pros: Creator fixes and improvements propagate automatically.
- Cons: Violates the product goal that player stories remain stable and resumable; a World update could contradict the Adventure transcript, facts, or state diffs.

## Consequences

- Positive: Player Adventures become stable save files that can be resumed without source World drift.
- Positive: World Builder work can focus on authored templates and versioning instead of live campaign truth.
- Positive: Reset behavior has a clear source: the Adventure's original World version.
- Positive: Future reviews can reject changes that mutate existing Adventures as a side effect of editing a World.
- Negative: The database will duplicate baseline locations, actors, objects, exits, and facts per Adventure.
- Negative: Schema and code will need a careful migration away from using `worldId` as the runtime identity.
- Negative: Patching existing Adventures from newer World versions becomes a separate future feature.
- Follow-up: A future SDD change should introduce the `Adventure` concept, decide whether to add `WorldVersion` immediately, and define the migration path from the current single-world demo model.

## Validation

Implementation should prove:

- Creating an Adventure from a World version copies baseline locations, actors, objects, exits, and facts into Adventure-owned runtime state.
- Editing a World or creating a newer World version does not alter an existing Adventure.
- Resetting an Adventure restores the Adventure to its source World version.
- Game Master prompt context, turns, narrations, events, state diffs, and debug calls are scoped to the Adventure runtime state.
- Deterministic tests cover at least one World edit after Adventure creation and show that the existing Adventure remains unchanged.
- Browser or E2E coverage verifies that starting and resuming an Adventure uses the Adventure copy, not the mutable World source.

## Reconsider When

- Copied Adventure state becomes too large or too expensive for realistic play volumes.
- Creators need a safe, explicit way to apply World fixes to existing Adventures.
- A future multiplayer or shared-world mode requires live World changes to affect multiple players by design.
- The product shifts from private/personal Adventures toward centrally managed live worlds.
