# Proposal: Lightweight Location Objects

## Why

Lorecraft now has readable NPC Cards and bounded NPC mutation, but location is still weaker than NPC context. Rooms already exist in Convex, but the product language and debug workflow do not yet treat places as authored, inspectable, editable story objects.

This creates story drift in playtests: the Game Master can lose track of where the scene is, move actors too freely, or treat a requested destination as if it exists when it is not canonical. The next slice should make locations explicit without turning Lorecraft into a MUD or dungeon crawler.

## What Changes

Persistent mode will gain lightweight Location Cards backed by canonical Convex room state. The Game Master will receive the current Location Card plus a compact list of existing locations that can be valid movement targets.

After narration succeeds, the existing post-narration extraction pattern will be expanded to include validated actor location moves. The extractor may move the player and current-scene NPCs only when the player clearly attempts travel, the narration resolves that travel, and the destination is an existing canonical location. Unknown destinations are handled in story as unresolved or blocked, not dynamically created.

The debug panel will gain a `Locations` tab similar to the `NPCs` tab. It will show existing locations, current actor locations, and enough context to inspect movement. It will also allow rough canonical editing/creation of locations for the current demo world, with reset behavior that can restore the seeded world.

## Epic Actions

### New Epic Directories

- None proposed.

### Existing Epic Directory Updates

- Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.

## Epic Story Changes

- Added: `LC-001-S12: Lightweight Location Cards And Movement`
- Modified: `LC-001-S1` to replace the current "narrative movement does not mutate rooms" MVP boundary with the new bounded rule: clear travel can move actors to existing canonical locations after backend validation.
- Modified: `LC-001-S2`, `LC-001-S7`, and `LC-001-S10` as needed to describe location context, prompt guidance, request summaries, and the expanded state extraction boundary.
- Removed: none.

## Change Folder

- Active location: `docs/changes/2026-06-30-lightweight-location-objects/`
- Closed location: `docs/changes/closed/2026-06-30-lightweight-location-objects/`

## Impact

- Product: Adds canonical, inspectable locations while preserving the story-first interface.
- Code: Extends current persistent-mode context, post-narration extraction, Convex movement validation, debug UI, and reset behavior.
- Tests: Requires focused tests for Location Card prompt context, actor movement validation, unknown-target rejection, debug location editing, reset behavior, and E2E or playtest coverage.
- Docs: Updates Epic truth, `docs/data-model.md`, `docs/persistence-system.md`, README/debug documentation, and `CHANGELOG.md`.

## Changelog Impact

- Required: yes
- Category: Added
- Public summary: Add lightweight Location Cards, debug location editing, and bounded actor movement to existing canonical locations.

## Open Questions

- None blocking after planning discussion.
- Future scope: a `Dungeon` concept may later specialize linked/structured exploration, but this change should not add dungeon schema or path enforcement.
