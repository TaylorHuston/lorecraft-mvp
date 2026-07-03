# Proposal: Turn Context And Pass

## Why

Lorecraft's current turn model works as a persistence envelope, but playtesting and design discussion exposed two related issues:

- Future Game Master prompts read a merged recent feed of player commands, Game Master narrations, and events. That makes the prompt more chat-like and gives the model more chances to treat raw player wording or system/debug text as story continuity.
- The player currently has no first-class way to yield their turn and let the Game Master continue the scene, equivalent to AI Dungeon's Continue but with a more game-like "Pass" framing.

The product direction is clearer if a turn means a resolved story beat: the player may act, or may pass, and the Game Master resolves the beat into accepted narration plus any validated consequences. Future Game Master calls should continue from accepted narration blocks and canonical state, not from every raw message or debug artifact.

## What Changes

Introduce an explicit turn-context policy and Pass trigger:

- Future Game Master story context is rebuilt from canonical Adventure state, recent successful narration blocks, and the current committed player action when one exists.
- Prior player commands remain persisted as history/debug records, but they are not included in normal future Game Master story context.
- Prior events remain persisted and visible/debuggable for now, but they are not included in normal future Game Master story context.
- The post-narration extractor uses the same filtered story-visible history policy as story generation.
- Add a player-facing `Pass` button near the input. Pass creates a turn that advances the story without creating a player command or visible player story entry.
- Pass turns may still run narration, extraction, bounded validation, state diffs, and debug records.
- Retry is explicitly deferred until turn snapshots, reversible diffs, or supersession semantics exist.

## Epic Actions

### New Epic Directories

- None proposed.

### Existing Epic Directory Updates

- Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.

## Epic Story Changes

- Modified: `LC-001-S1` Narrative Play Feed And Unified Input
  - Add Pass as a dedicated player control.
  - Clarify that Pass does not create a visible player story entry.
- Modified: `LC-001-S6` Scoped Narrative Turns
  - Reframe turns as resolved story beats with a trigger.
  - Add support for `act` and `pass` turn triggers.
  - Clarify that Pass turns do not have a command record in the target model.
- Modified: `LC-001-S7` Active Game Master Guidance And Context Assembly
  - Replace merged recent feed prompt context with story-visible history: recent successful narrations plus canonical state plus current action/pass directive.
  - Apply the same story-visible history policy to the extractor.
  - Reclassify commands and events as persisted/debuggable artifacts, not default future GM prose context.

## Scope Decisions

- Confirmed:
  - The player-facing control should be labeled `Pass`.
  - Pass is a button, not a typed command and not a slash command.
  - Pass is not shown as a player story entry.
  - Events remain persisted and player/debug-visible for now, but are removed from future Game Master prompt context.
  - The extractor switches to the same filtered story-visible history policy.
  - Pass can produce bounded state consequences if the resulting narration clearly changes durable state.
  - Pass should not create a command record in the target model.
  - This belongs in existing LC-001 rather than a new Epic.
- Deferred:
  - Retry / regenerate.
  - Turn snapshots, reversible state diffs, rollback, branching, and supersession.
  - Moving events fully out of the player-facing story stream into debug-only UI.
  - Multiplayer turn ordering and pass semantics.
- Assumptions:
  - The current synchronous route remains the orchestration boundary for this change.
  - If implementation friction makes commandless Pass turns expensive, the design should prefer a minimal schema/flow update over storing fake player prose.
  - Seed narrations can remain part of story-visible history when they are successful/accepted narration records.
- User decisions that shaped the Story/Requirement split:
  - Use `Pass` for the player-facing label because it feels more game-like and will make sense in future multiplayer.
  - Do not display Pass as story prose.
  - Switch both story generation and extraction to the filtered history policy.

## Change Folder

- Active location: `docs/changes/2026-07-02-turn-context-and-pass/`
- Closed location: `docs/changes/closed/2026-07-02-turn-context-and-pass/`

## Impact

- Product: Better story continuation semantics, less prompt confusion from raw commands/events, and a first explicit non-action turn trigger.
- Code: Likely touches Convex turn/command creation, context loaders, prompt assembly, extraction prompt assembly, route handling, UI, and tests.
- Tests: Focused tests for prompt context filtering and pass route/Convex behavior; E2E for Pass button and story output.
- Docs: Update README, `docs/data-model.md`, `docs/persistence-system.md`, LC-001 Epic, and possibly debug/testing docs.
- ADRs: Not required for this slice. Consider an ADR when implementing snapshots/retry/rollback because that will set a durable rollback architecture.

## Changelog Impact

- Required: yes
- Category: Added / Changed
- Public summary: Add Pass turns and change Game Master context so future story generation continues from canonical state plus recent narration blocks instead of raw chat-like feed history.

## Open Questions

- None blocking for proposal. Implementation may discover whether commandless Pass requires a schema change or only route/Convex function changes.
