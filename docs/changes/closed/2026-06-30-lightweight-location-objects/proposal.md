# Proposal: Lightweight Location Objects

## Why

Lorecraft now has readable NPC Cards and bounded NPC mutation, but location is still weaker than NPC context. Rooms already exist in Convex, but the product language and debug workflow do not yet treat places as authored, inspectable, editable story objects.

This creates story drift in playtests: the Game Master can lose track of where the scene is, move actors too freely, or treat a requested destination as if it exists when it is not canonical. The next slice should make locations explicit without turning Lorecraft into a MUD or dungeon crawler.

## What Changes

Persistent mode will gain lightweight Location Cards backed by canonical Convex room state. The Game Master will receive the current Location Card plus a compact list of existing locations that can be valid movement targets.

After narration succeeds, the existing post-narration extraction pattern will be expanded to include validated actor location moves. The extractor may move the player and current-scene NPCs only when the player clearly attempts travel, the narration resolves that travel, and the destination is an existing canonical location. Unknown destinations are handled in story as unresolved or blocked, not dynamically created.

The debug panel will gain a `Locations` tab similar to the `NPCs` tab. It will show existing locations, current actor locations, and enough context to inspect movement. It will also allow rough canonical editing/creation of locations for the current demo world, with reset behavior that can restore the seeded world.

As part of making NPC and Location debugging consistent, the existing `NPCs` tab will use the same canonical Convex editing model instead of server-local overrides. Debug-created NPCs and locations remain rough local playtest tooling, not a polished World Builder. Reset Session and fresh seeding must restore the seeded demo world and remove debug-created rows.

The seed world will expand beyond the chapel with a tavern location and tavern NPCs so playtesting can validate actor presence, NPC context, and movement across multiple scenes.

## Epic Actions

### New Epic Directories

- None proposed.

### Existing Epic Directory Updates

- Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.

## Epic Story Changes

- Added: `LC-001-S12: Lightweight Location Cards And Movement`
- Modified: `LC-001-S1` to replace the current "narrative movement does not mutate rooms" MVP boundary with the new bounded rule: clear travel can move actors to existing canonical locations after backend validation.
- Modified: `LC-001-S2`, `LC-001-S7`, `LC-001-S9`, and `LC-001-S10` as needed to describe location context, canonical debug NPC editing, prompt guidance, request summaries, and the expanded state extraction boundary.
- Removed: none.

## Change Folder

- Active location: `docs/changes/2026-06-30-lightweight-location-objects/`
- Closed location: `docs/changes/closed/2026-06-30-lightweight-location-objects/`

## Impact

- Product: Adds canonical, inspectable locations and standardizes rough canonical debug editing for NPCs and Locations while preserving the story-first interface.
- Code: Extends current persistent-mode context, post-narration extraction, Convex movement validation, canonical debug UI writes, seed data, and reset behavior.
- Tests: Requires focused tests for Location Card prompt context, actor movement validation, unknown-target rejection, debug location/NPC editing, reset behavior, and E2E or playtest coverage.
- Docs: Updates Epic truth, `docs/data-model.md`, `docs/persistence-system.md`, README/debug documentation, and `CHANGELOG.md`.

## Changelog Impact

- Required: yes
- Category: Added
- Public summary: Add lightweight Location Cards, debug location editing, canonical debug NPC editing parity, seeded tavern NPCs, and bounded actor movement to existing canonical locations.

## Open Questions

- None blocking after planning discussion.
- Future scope: a `Dungeon` concept may later specialize linked/structured exploration, but this change should not add dungeon schema or path enforcement.
