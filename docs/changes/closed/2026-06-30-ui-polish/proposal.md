# Proposal: UI Polish

## Why

The Lorecraft MVP playtest surface is functionally useful, but the interface is still evolving quickly. This interactive change tracks small UI refinements that improve the narrative workbench without changing the game loop, persistence model, provider boundary, or debug data contract.

## Interactive Scope Boundary

- In scope:
  - Small layout, density, visual hierarchy, copy, and control polish on the existing Lorecraft playtest UI.
  - Debug panel polish that does not change persisted behavior or canonical data semantics.
  - Focused UI defects found during manual playtesting.
- Out of scope:
  - New gameplay systems, movement/location simulation, combat, inventory, rules, or dice mechanics.
  - Data model, Convex schema, provider adapter, prompt architecture, and NPC mutation semantics.
  - Large redesigns that need broader product scoping.
- Stop and promote to /sdd-propose if:
  - Feedback becomes a new capability instead of polish.
  - The requested change needs durable state, backend API changes, schema changes, auth/security decisions, or cross-Epic coordination.

## Epic / Story Impact

- Known affected Epics:
  - `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Known affected Stories:
  - `LC-001-S1` may be affected when the narrative feed or unified input presentation changes.
  - `LC-001-S3` may be affected when NPC debug/context presentation changes.
- Unknown until implementation:
  - Whether any specific polish item requires Scenario wording or Verified By updates.

## Changelog Impact

Likely no public changelog entry for pure internal MVP UI polish unless a visible playtest behavior materially changes.

## Open Questions

- The specific UI polish items will be captured one at a time in `tasks.md`.
