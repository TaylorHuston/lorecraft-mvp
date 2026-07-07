# Proposal: Slash Commands And Tutorial World

## Why

Lorecraft's current turn model gives the player a decision phase with `Act` and `Pass`. That is enough for story advancement, but playtesting now needs lightweight things the player can do before ending the turn: inspect the scene, inspect a visible thing, or ask for available controls.

The first slice should introduce slash commands without turning Lorecraft into a MUD command parser. `/look` and `/help` are utility actions inside the player's decision phase. They should be visible to the player and resumable in the feed, but they should not advance the story, increment the turn number, run state extraction, or become future Game Master narration context.

This is also the right moment to add a second seeded World named `Tutorial`. Stormbound Chapel is useful for testing the fiction, but it is not designed to teach a new player what to do. Tutorial should be a deliberately authored onboarding World that starts with one room and one NPC, then leads into a second room with multiple NPCs. Future tutorial rooms can introduce object manipulation and other systems when those systems exist.

## What Changes

- Add slash-command recognition to the existing Act-expanded input surface.
- Add `/look` with an optional target:
  - `/look` describes what the player can currently see in the current scene.
  - `/look Mira` or `/look map` asks the LLM to describe the visible/current-context target from canonical state plus recent narration.
- Add `/help` as deterministic engine output listing supported slash commands.
- Add client-side autocomplete for supported slash commands and visible `/look` targets.
- Render slash-command output as a reusable utility/inspection feed entry style, visually quieter than normal Game Master narration.
- Persist utility results so reload/resume keeps them visible, while excluding them from future Game Master story-visible history.
- Add a seeded Tutorial World and default Adventure path that can appear beside Stormbound Chapel on the startup screen.
- Give Tutorial at least:
  - a starter location with one guide NPC;
  - a second location with multiple NPCs for testing who is present, who responds, and what `/look` can inspect;
  - authored opening narration that nudges the player toward `/help`, `/look`, Act, and Pass without turning the story feed into documentation.

## Epic Actions

### New Epic Directories

- None proposed.

### Existing Epic Directory Updates

- Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.
- Update `docs/epics/lc-002-world-adventure-model/epic.md`.

## Epic Story Changes

- Add `LC-001-S13: Pre-Turn Slash Command Utilities`.
- Add `LC-002/S5: Tutorial World Seed`.
- Keep existing Act and Pass Stories intact. Slash commands are not turns and should not modify the accepted meaning of `LC-001-S6` scoped narrative turns.
- Reconcile LC-001 guidance that warns against premature slash commands by narrowing this change to pre-turn utility actions, not a broad command list, movement parser, combat command set, or MUD mode.

## Scope Decisions

- Confirmed:
  - `/look` does not consume or advance a turn.
  - Slash commands are things a player may do before they `Act` and end their turn.
  - `/look` accepts an optional target; no target means look around the current scene.
  - Slash-command autocomplete should help with supported commands and visible `/look` targets, but backend command parsing remains authoritative.
  - Slash-command output appears in the story stream as a distinct utility/inspection block.
  - Slash commands are typed into the same Act-expanded input box; a leading `/` routes to command execution instead of closing the turn.
  - Add a second seeded World named `Tutorial`.
  - Tutorial should be intentionally structured as onboarding: first one room with one NPC, then a room with multiple NPCs, with later item-manipulation tutorial rooms deferred until item manipulation exists.
- Deferred:
  - `/retry`, rollback, inventory, stats, movement commands, command aliases beyond autocomplete suggestions, and command history.
  - Letting slash commands mutate canonical state.
  - Polished command palette UI or mobile-specific command surfaces.
  - Tutorial content for object manipulation, combat, inventory, dice, quests, or builder workflows.
- Assumptions:
  - `/help` should be deterministic local engine output, not an LLM call.
  - `/look` should use the same provider-agnostic OpenAI-compatible adapter as Game Master calls.
  - Utility outputs should be Adventure-scoped and reset/delete with the Adventure.
  - The startup screen should show multiple seeded World containers once Tutorial exists, using the same Adventure create/continue/delete pattern as Stormbound Chapel.
- User decisions that shaped the Story/Requirement split:
  - The player should be able to perform multiple pre-turn utility actions before choosing a turn-ending Act or Pass.
  - The Game Master should not read utility command output as future story narration.
  - Tutorial should be authored specifically to teach app usage rather than simply being another playtest fiction seed.

## Change Folder

- Active location: not applicable; change is closed.
- Closed location: `docs/changes/closed/2026-07-05-slash-commands/`

## Impact

- Product: Adds the first reusable pre-turn utility command pattern and a dedicated onboarding World.
- Code: Adds command parsing, a utility route, utility feed persistence, `/look` prompt construction, player-facing rendering, multi-World seed/list support, and Tutorial baseline content.
- Tests: Requires focused parser/prompt/history tests and deterministic E2E coverage for `/help`, `/look`, turn numbering, reload behavior, Tutorial listing, and Tutorial Adventure creation.
- Docs: Update data model, persistence-system, architecture, README feature list, LC-001 Epic truth, and LC-002 Epic truth.
- ADRs: Not required. This applies the existing turn-boundary and backend-authority decisions rather than creating a new durable architecture rule.

## Changelog Impact

- Required: yes
- Category: Added
- Public summary: Adds `/look` and `/help` pre-turn utility commands plus a Tutorial World for learning the app.

## Open Questions

- None blocking. Future implementation may refine the exact label and styling for utility feed entries during manual UI feedback.
