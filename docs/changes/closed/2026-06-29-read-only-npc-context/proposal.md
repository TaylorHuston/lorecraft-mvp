# Proposal: Read-Only NPC Context

## Why

Lorecraft needs to reintroduce NPCs as explicit objects the Game Master can read without reintroducing the mutation pressure that made early persistent mode hard to evaluate.

The current transcript mode improved story quality by removing live canonical state from the prompt, but it also removed the important Lorecraft distinction between authored world truth and generated transcript continuity. For NPCs, that means a player action like `I look at Mira` should be grounded in Mira's authored description and current readable attributes, not invented from recent prose alone.

This change restores a narrow read path: NPC objects and attributes become visible Game Master context again, while intelligent NPC state mutation remains out of scope.

## What Changes

- Persistent Game Master context will include readable NPC profiles for NPCs in the current scene.
- NPC profiles will be treated as context the Game Master may use for narration, description, and dialogue.
- Game Master output will not be allowed to mutate NPC state as part of this change.
- The debug panel will add an `NPCs` tab for inspecting current NPC fields and applying temporary test overrides.
- Debug NPC overrides will be server-local and non-durable. They must not persist through an application server restart.

## Epic Actions

### New Epic Game Masteries

- None proposed.

### Existing Epic Game Mastery Updates

- Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.

## Epic Story Changes

- Added: `LC-001-S9: Read-Only NPC Context`.
- Modified: Existing LC-001 stories may receive small cross-references where they describe Game Master context, transcript/persistent mode boundaries, debug state visibility, or NPC mutation scope.
- Removed: none.

## Change Folder

- Active location: `docs/changes/2026-06-29-read-only-npc-context/`
- Closed location: `docs/changes/closed/2026-06-29-read-only-npc-context/`

## Impact

- Product: Makes NPCs feel authored and inspectable again without claiming the system can intelligently maintain NPC state yet.
- Code: Likely touches Convex snapshot/context queries, Game Master prompt context assembly, the Game Master completion path, and the debug UI.
- Tests: Requires focused tests proving NPC context reaches the Game Master, Game Master NPC mutation is disabled for this mode/scope, and debug overrides affect context only until server restart.
- Docs: Requires updates to LC-001, `docs/data-model.md`, `docs/persistence-system.md`, README/debug guidance, and `CHANGELOG.md`.

## Changelog Impact

- Required: yes.
- Category: Added.
- Public summary: Add read-only NPC Game Master context and debug-only NPC override controls for local playtesting.

## Questions And Readiness

### Blocking Questions

- None.

### Implementation-Discovery Questions

- Debug override storage mechanism: default to a server-local in-memory store owned by the Next.js server process, because the requirement is explicitly non-durable across server restart. During implementation, verify whether the current dev process model preserves enough process-local state for local testing. If Next.js dev reload behavior makes this unreliable even within a single running server, replan before introducing a more complex non-durable store.
- NPC context shape: default to reusing existing `actors` plus actor-scoped `facts` rather than creating a dedicated `npcs` table. During implementation, inspect whether the prompt/UI needs a clearer internal `NpcProfile` type. If actor-plus-facts causes confusing ownership or validation boundaries, replan before promoting NPCs to a new table.

### Deferred Scope

- Intelligent NPC state mutation from Game Master output.
- Durable debug/admin editing of NPC data.
- A polished World Builder NPC editor.
- NPC relationships, graph traversal, visibility permissions, secrets management, faction state, schedules, or offscreen simulation.
- Applying read-only NPC context to transcript mode. Transcript mode remains the seed-plus-transcript comparison baseline unless a later change explicitly alters that contract.

## Apply Readiness

- Status: ready.
- Reason: The requested scope is narrow and the remaining uncertainty can be handled as implementation discovery with conservative defaults.
