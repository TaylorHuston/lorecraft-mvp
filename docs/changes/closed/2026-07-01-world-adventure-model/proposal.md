# Proposal: World / Adventure Model

## Why

Lorecraft currently uses one resettable `worlds` row as both authored source material and mutable playtest state. That worked for the first persistent-world spike, but it blurs two different responsibilities:

- a World as reusable authored material
- an Adventure as one playable, resumable instance of that World

The accepted ADR [2026-07-01: World Templates Create Frozen Adventure Copies](../../adrs/2026-07-01-world-adventure-frozen-copies.md) establishes the product rule: World updates must not unexpectedly change an existing player's story. This change proposes the first implementation slice of that model.

## What Changes

Introduce a durable World / WorldVersion / Adventure model:

- Worlds become authored templates.
- WorldVersions represent immutable authored baselines.
- Adventures become mutable playable copies created from a specific WorldVersion.
- Runtime state, turns, narrations, events, state diffs, Game Master calls, actors, locations, objects, and facts become Adventure-scoped instead of treating `worldId` as the play-state identity.
- Reset Session / Adventure reset restores the Adventure to its source WorldVersion, not the latest World.

The MVP should still open into the seeded Stormbound Chapel playtest without adding account management, public sharing, a polished World Builder, or multiple-player flows.

## Epic Actions

### New Epic Directories

- Create `docs/epics/lc-002-world-adventure-model/epic.md`.

### Existing Epic Directory Updates

- Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` only to reconcile deferred-scope wording that currently says campaign/world-instance persistence is deferred.

## Epic Story Changes

- Add new Epic `LC-002 World / Adventure Model` with Epic-scoped Stories:
  - `LC-002/S1`: Start Adventure From World Version.
  - `LC-002/S2`: Adventure-Scoped Runtime State.
  - `LC-002/S3`: World Version Edits Do Not Mutate Existing Adventures.
  - `LC-002/S4`: Reset Adventure To Source Version.
- Reconcile `LC-001` deferred-scope notes so they point to `LC-002` once implemented.

## Change Folder

- Active location: `docs/changes/2026-07-01-world-adventure-model/`
- Closed location: `docs/changes/closed/2026-07-01-world-adventure-model/`

## Impact

- Product: Adds the concept of a playable Adventure instance without forcing a polished management UI.
- Code: Requires Convex schema changes, seed/reset changes, Game Master context changes, debug route updates, and UI route/state updates where `worldId` currently identifies mutable play state.
- Tests: Requires focused unit/integration tests for copy/reset/isolation behavior plus deterministic E2E for the default seeded Adventure path.
- Docs: Requires data model, persistence system, README, testing docs, and Epic truth updates.
- ADRs: Uses accepted ADR `docs/adrs/2026-07-01-world-adventure-frozen-copies.md`; no new ADR is required unless implementation discovers a different migration or versioning strategy.

## Changelog Impact

- Required: yes
- Category: Added / Changed
- Public summary: Add Adventure instances created from frozen World versions, so playable stories can mutate independently from authored World templates.

## Open Questions

- None blocking for proposal. The implementation may discover naming or migration details, but the product and architecture boundary are already set by the accepted ADR.
