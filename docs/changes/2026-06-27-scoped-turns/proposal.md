# Proposal: Scoped Turns

## Why

The current Director loop already treats each player input as the practical anchor for narration, events, state diffs, and Director debug records. That anchor is implicit through `commandId`, which works for the first spike but makes longer sessions harder to inspect, group, resume, and eventually roll back.

Lorecraft needs an explicit turn concept before the persistence model grows further. A turn should represent one persisted player intent and the backend work caused by that intent: player input, Director call, narration, accepted mutations, events, and success or failure status.

## What Changes

Introduce scoped turns as a durable backend grouping layer for the existing narrative Director workflow.

The change should:

- Add an explicit `turns` table for persisted narrative turns.
- Give each turn a world-scoped sequence number and lifecycle status.
- Link commands, narrations, events, state diffs, and Director calls to the turn that produced them.
- Keep the visible story stream behavior substantially the same while making turn grouping available to the feed/debug model.
- Update persistence documentation so `commandId` is no longer treated as the conceptual turn boundary.
- Design the data shape so future snapshot/rollback can attach to turn boundaries without implementing rollback now.

## Epic Actions

### New Epic Directories

- None proposed.

### Existing Epic Directory Updates

- Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.

## Epic Story Changes

- Add `LC-001-S6: Scoped Narrative Turns` to `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.
- Keep existing Stories intact.
- Do not add rollback, branching, story instances, multiplayer ordering, or replay as implemented product scope in this change.

## Change Folder

- Active location: `docs/changes/2026-06-27-scoped-turns/`
- Closed location: `docs/changes/closed/2026-06-27-scoped-turns/`

## Impact

- Product: makes long playtest sessions easier to reason about and establishes the basic unit of story progression.
- Code: adds turn persistence and updates existing Director mutations/queries to write and expose turn scope.
- Tests: requires focused backend tests around turn lifecycle, feed grouping, failed turns, and reset cleanup.
- Docs: updates `docs/data-model.md`, `docs/persistence-system.md`, the existing Epic, and likely README wording if the debug model changes materially.

## Changelog Impact

- Required: yes
- Category: Added
- Public summary: Added explicit scoped narrative turns as the durable grouping layer for persisted player input, Director output, events, state diffs, and debug records.

## Open Questions

- Should the debug panel expose turn status and sequence immediately, or should this remain backend-only until a debug need appears? The proposal assumes at least minimal debug visibility because it is the quickest way to verify the model.
- Should failed provider/output attempts appear in the player-facing story stream? The proposal assumes no: they are persisted as failed turns for audit/debug, while the player-facing error remains near the input.
