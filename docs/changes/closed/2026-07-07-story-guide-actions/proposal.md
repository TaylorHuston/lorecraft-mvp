# Proposal: Story And Guide Actions

## Why

Lorecraft now has a stronger turn model: `Act` resolves player intent, `Pass` lets the Game Master continue the scene, and slash utilities let the player inspect without advancing the turn. The next gap is authorial control during the decision phase.

Playtesting needs two more controls:

- `Story`: let the player add a canonical story beat before the next resolving turn.
- `Guide`: let the player privately steer the next Game Master narration without adding that steering text to the transcript.

This keeps the app closer to AI Dungeon's useful action modes while preserving Lorecraft's state-first rule: visible story can set up context, but durable state changes should still happen only after a Game Master resolution and backend validation.

## What Changes

- Add a player-facing `Story` action that records player-authored canonical narration.
- Add a player-facing `Guide` action that creates a hidden, turn-ending Game Master directive.
- Keep `Story` inserts visible, reloadable, and included in future story-visible Game Master context.
- Keep `Story` inserts out of turn numbering, command rows, immediate state extraction, and immediate state diffs.
- Keep `Guide` text hidden from the player-facing transcript and excluded from future Game Master story context.
- Let the Game Master's resulting `Guide` narration become normal story-visible narration and, if appropriate, pass through the existing bounded extraction path.

## Epic Actions

### New Epic Directories

- None proposed.

### Existing Epic Directory Updates

- Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.

## Epic Story Changes

- Added:
  - `LC-001-S14: Pre-Turn Story And Guide Actions`
- Modified:
  - `LC-001-S1: Narrative Play Feed And Unified Input` - decision surface expands from Act/Pass plus slash utilities to include Story and Guide controls.
  - `LC-001-S6: Scoped Narrative Turns` - turns remain resolved story beats; Story inserts are explicitly not turns, while Guide is a commandless resolving turn trigger.
  - `LC-001-S7: Active Game Master Guidance And Context Assembly` - story-visible history includes player-authored Story inserts, and current-turn context can include hidden Guide text.
  - `LC-001-S13: Pre-Turn Slash Command Utilities` - clarify that slash utilities remain non-story-visible, unlike Story inserts.
- Removed:
  - None.

## Scope Decisions

- Confirmed:
  - Story inserts are canonical, player-authored narration blocks.
  - Story inserts set up the scene before a later `Act`, `Pass`, or `Guide`.
  - Story inserts do not immediately call the Game Master.
  - Story inserts do not immediately run state extraction or mutate canonical NPC/location state.
  - The next resolving Game Master turn should know that prior player-authored Story inserts are accepted scene content.
  - Guide text is hidden steering for the next Game Master narration, not player-visible story prose.
  - Guide creates a resolving turn because it calls the Game Master and produces narration.
  - This change includes both Story and Guide.
- Deferred:
  - Retry/regenerate.
  - Snapshot rollback, branch/supersession, or undo.
  - Dice, combat, inventory, stats, quest systems, or a broader command/action taxonomy.
  - Dynamic state mutation directly from Story inserts.
  - A polished action-mode UI beyond the smallest playtestable Story/Guide controls.
- Assumptions:
  - Story and Guide should live in the same decision phase as Act, Pass, and slash utilities.
  - Existing local route guardrails and prototype auth posture remain acceptable for this local MVP slice.
- User decisions that shaped the Story/Requirement split:
  - Story should set a little more scene before the next Act or Pass.
  - State changes from Story setup should happen during a later resolving Game Master turn, not at Story insertion time.
  - The Game Master should be told that player Story inserts are canonical story content it must respect.
  - Guide should be hidden from the transcript while still relying on Game Master story generation.
  - Story and Guide are both in scope for this change.

## Change Folder

- Active location: `docs/changes/2026-07-07-story-guide-actions/`
- Closed location: `docs/changes/closed/2026-07-07-story-guide-actions/`

## Impact

- Product: adds two authorial decision actions that make the story loop more flexible without broadening into a MUD or rules engine.
- Code: likely touches Convex schema/mutations, snapshot/feed read model, Game Master prompt context, turn route parsing/orchestration, play UI, debug display, and tests.
- Tests: requires focused unit/route tests for Story/Guide boundaries and deterministic E2E coverage for visible behavior.
- Docs: update LC-001, `docs/data-model.md`, `docs/persistence-system.md`, README feature summary, and testing docs if E2E coverage expands.
- ADRs: not required for this change; it extends existing turn/context decisions rather than choosing a new durable architecture family.

## Changelog Impact

- Required: yes
- Category: Added
- Public summary: Add Story and Guide decision actions for canonical player-authored setup and hidden Game Master steering.

## Open Questions

- None blocking.
- Non-blocking: exact visual placement, labels, and animation for Story/Guide controls should be refined during implementation and manual UI feedback.
