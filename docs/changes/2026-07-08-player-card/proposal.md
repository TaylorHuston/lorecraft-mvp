# Proposal: Player And Room Info Panels

## Why

Lorecraft now treats NPCs and Locations as structured cards that the Game Master can read as canonical context. The player character is still thinner: new Adventures copy a generic seeded player actor, and the play surface does not persistently show who the player is, where they are, or what character context the Game Master should respect.

The next slice should make the player a first-class Adventure-owned character card without adding RPG systems prematurely. While we are shaping the side rails, the play surface should also expose a matching right-side Room Info panel so the current location is visible without opening debug.

## What Changes

- Creating a new Adventure asks for the player's name before the Adventure is created.
- The created Adventure stores that name on the Adventure-owned player actor.
- Player profile fields for physical description, backstory, and current status are available but blank by default.
- The play view adds a persistent collapsible left-side Player Card rather than placing this information in the debug panel.
- The play view adds a matching read-only right-side Room Info panel with the current room/location name, description, and present NPCs.
- The Game Master receives the Player Card as protagonist context while preserving player agency: it may use the card for perception, continuity, and plausible knowledge, but must not choose new player thoughts, feelings, speech, goals, or actions.

## Epic Actions

### New Epic Directories

- None proposed.

### Existing Epic Directory Updates

- Update `docs/epics/lc-002-world-adventure-model/epic.md`.
- Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.

## Epic Story Changes

- Modify `LC-002/S1: Start Adventure From World Version` so Adventure creation can require a player name and copy blank optional player profile fields into the Adventure baseline.
- Add `LC-001-S15: Player Card` to `LC-001 Core Game Master Play Loop` for the persistent player-facing character surface and Game Master context boundary.
- Add `LC-001-S16: Room Info Panel` to `LC-001 Core Game Master Play Loop` for the persistent player-facing current-location surface.
- Update `LC-001-S7: Active Game Master Guidance And Context Assembly` only if implementation needs to clarify that Player Card context joins NPC and Location Card context in prompts.

## Scope Decisions

- Confirmed:
  - The player should be represented as an existing `actors` row with `role = "player"`, not a new table for this slice.
  - The left Player Card is player-facing, persistent, and collapsible.
  - The right Room Info panel is player-facing, persistent, read-only, and derived from existing current-location state.
  - New Adventure creation asks for player name.
  - Optional player fields start blank and may be filled in by the user.
  - Inventory, equipment, health, stats, combat, class systems, and rules are deferred.
- Deferred:
  - Avatar/image upload.
  - Player inventory, equipment, health, stats, class, ancestry, and TTRPG rules.
  - Automatic Game Master mutation of player profile facts beyond existing actor movement.
  - Production auth, ownership, multi-user character profiles, and cross-Adventure player identity.
- Assumptions:
  - Optional player fields can be edited from the Player Card itself for this MVP slice.
  - Blank optional fields should remain editable in the expanded Player Card but should not be sent as filled prompt context.
  - Existing debug panels can continue to expose raw player facts indirectly through hidden state until a dedicated debug view is needed.
  - The Room Info panel should not add movement controls, location editing, object inspection, or debug-only metadata in this slice.
  - The destructive local-only Reset World/bootstrap path may recreate its fixed default playtest Adventure without the normal player-name prompt; player-created Adventures always use the named creation flow.
- User decisions that shaped the Story/Requirement split:
  - The player model should be similar to NPC storage.
  - The Player Card should be a persistent left-side element, not a debug tab.
  - The game should ask for the player's name when a new Adventure starts.
  - Other player profile fields should be blank by default, with the user able to fill them in if desired.
  - The right side of the screen should have a matching room info floating box with room name, description, and NPC list.

## Change Folder

- Active location: `docs/changes/2026-07-08-player-card/`
- Closed location: `docs/changes/closed/2026-07-08-player-card/`

## Impact

- Product: Adds persistent protagonist and current-room context surfaces, making each Adventure feel more like a grounded story scene.
- Code: Requires updates to Adventure creation, baseline copy, snapshot/context read models, prompt construction, and play UI layout. The Room Info panel should reuse existing location snapshot state rather than adding schema.
- Tests: Requires focused tests for Adventure creation/player facts, prompt context, and deterministic E2E or browser coverage for the name prompt, collapsible Player Card, and Room Info panel content.
- Docs: Update `docs/data-model.md`, `docs/persistence-system.md`, README feature list if implemented, and the affected Epics.
- ADRs: Not required. This follows the existing Actor/Facts model and does not introduce a new durable architecture decision.

## Changelog Impact

- Required: yes
- Category: Added
- Public summary: Add player naming at Adventure creation plus persistent Player Card and Room Info panels for character and scene context.

## Open Questions

- None blocking. During implementation, if inline editing in the Player Card proves too busy, the fallback is a compact edit mode within the same left rail rather than moving the feature into debug. If the Room Info panel feels too busy, reduce it to name, one description block, and a compact present-NPC list before adding more fields.
