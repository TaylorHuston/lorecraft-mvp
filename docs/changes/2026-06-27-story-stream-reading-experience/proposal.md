# Proposal: Story Stream Reading Experience

## Why

The MVP currently proves the Director loop, persistence, and debug visibility, but the player-facing surface still reads visually like chat messages in a box. That weakens the intended Lorecraft feel: a story that the player participates in, with persistent state behind it.

The next UX proof should make the main feed feel closer to AI Dungeon-style interactive fiction: prose-first, readable, chronologically anchored, and easy to continue without manually chasing the bottom of a growing transcript.

## What Changes

- Restyle the player-facing feed as a story stream rather than alternating chat bubbles.
- Render Director narration as primary prose.
- Render player input as inline or lightly separated player action text that supports the story rhythm without dominating the page.
- Keep world/debug events available, but reduce their player-facing visual weight so they do not interrupt story reading.
- Anchor the reading experience to the latest feed entry as the session grows.
- Keep the narrative input adjacent to the bottom of the story stream so continuing the story does not require manual scrolling.
- Preserve the split layout with the debug panel separate from the player-facing story surface.
- Do not change persistence tables, Director output shape, NPC state semantics, provider behavior, or gameplay rules.

## Epic Actions

### New Epic Directories

- None proposed.

### Existing Epic Directory Updates

- Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.

## Epic Story Changes

- Add Story `LC-001-S5: Story Stream Reading Experience` to the existing Provider-Agnostic Chat Experience Epic.
- Keep existing Stories `LC-001-S1` through `LC-001-S4` intact.

## Change Folder

- Active location: `docs/changes/2026-06-27-story-stream-reading-experience/`
- Closed location: `docs/changes/closed/2026-06-27-story-stream-reading-experience/`

## Impact

- Product: Makes the MVP feel more like participatory fiction instead of a developer chat transcript.
- Code: Expected to touch `src/app/world-client.tsx` and possibly small UI/view-model helpers if separating feed presentation from raw feed rows is useful.
- Tests: Needs focused UI/browser verification for feed anchoring, input placement, empty state, long-session behavior, and debug-panel separation. Existing backend tests should not need changes unless a view-model helper is extracted and unit tested.
- Docs: Requires Epic update and likely a public-safe changelog entry under `Changed` once implemented.

## Changelog Impact

- Required: yes
- Category: Changed
- Public summary: Changed the Lorecraft play surface from a chat-like feed toward a story-style reading stream with bottom anchoring.

## Open Questions

- Exact AI Dungeon-inspired visual treatment can be refined during implementation, but the proposal assumes prose-first story presentation rather than chat bubbles.
- Whether world events should remain visible in the main story stream or move behind debug-only presentation may become clearer after one playtest pass.
