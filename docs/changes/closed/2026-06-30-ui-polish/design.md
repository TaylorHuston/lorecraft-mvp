# Design: UI Polish

## Current Understanding

Lorecraft should feel like a serious narrative workbench: story-first in the center, inspectable state and debug controls on the side, and compact enough for long play sessions. UI polish in this change should follow the shared visual guide and Lorecraft visual identity note: dark-mode native, restrained, readable, compact, and clearly separated between player-facing story and debug-only state.

## Technical Approach

- Keep changes local to existing UI surfaces unless a defect requires a small supporting helper.
- Prefer CSS/layout and component-level refinements over new abstractions.
- Preserve the current Game Master turn flow, debug logging, Convex persistence, and provider calls.
- Use manual browser verification for visual changes; add tests only when a deterministic behavior change is introduced.
- Keep the dev server running with `npm run dev:debug` expectations and avoid switching to Turbopack.

## Affected Epic Truth

| Epic | Story | Requirement / Scenario | Impact | Needed Update |
|---|---|---|---|---|
| LC-001 | LC-001-S1 | R1/R2/R3 narrative feed, unified input, pending state | Possible presentation-only updates | Update only if behavior or verification evidence changes |
| LC-001 | LC-001-S3 | Hidden state/debug NPC surfaces | Possible presentation-only updates | Update only if debug visibility or NPC context handling changes |

## Alternatives / Deferred

- A full visual redesign is deferred until the core loop stabilizes.
- New app-shell navigation or separate world-builder views are out of scope.
- UI test automation is deferred unless a requested tweak creates deterministic interaction behavior that warrants coverage.

## Open Questions

- No blocking design questions for this UI polish pass; individual feedback items are tracked in `tasks.md`.
