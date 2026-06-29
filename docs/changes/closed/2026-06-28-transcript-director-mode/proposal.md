# Proposal: Transcript Director Mode

## Why

Lorecraft's current Director loop tests several ideas at once: story generation, bounded prompt context, strict JSON output, NPC update proposals, validation, durable fact mutation, state diffs, events, and turn debug records. Recent playtesting makes it hard to tell whether weak or passive story behavior comes from the model/prompt itself or from asking the same call to also produce persistence-ready state changes.

This change creates a comparison mode that removes runtime world-state pressure while keeping the useful local playtest shell. The goal is to answer one narrow question: can the Director write a better interactive story beat when it only has to continue the transcript from an opening seed?

## What Changes

Add a server-startup-flag controlled transcript Director mode for developer playtesting.

In transcript mode:

- Provider calls use a plain-prose Director contract instead of strict JSON.
- Player input, turns, narrations, Director debug records, and local logs still persist for resume and troubleshooting.
- Canonical world/NPC state does not mutate from the Director response.
- No accepted NPC updates, state diffs, or LLM-authored world events are produced.
- The prompt uses the canonical opening seed plus the transcript only; it does not include current room state, present actor rows, visible exits, object state, mutable NPC facts, hidden NPC knowledge, or scene-beat classification.
- The Stormbound Chapel demo world is fresh boot-scoped seed data; seeding deletes prior demo worlds instead of resuming durable world state.

The existing persistent Director mode remains the default and keeps the current strict JSON plus validated NPC-update path.

For this change, mode selection is not an in-app UI control. The application server starts in persistent mode by default. Developers can start it in transcript mode with a local startup flag such as `LORECRAFT_DIRECTOR_MODE=transcript`.

## Epic Actions

### New Epic Directories

- None proposed.

### Existing Epic Directory Updates

- Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.

## Epic Story Changes

- Added: `LC-001-S8: Transcript Director Mode`.
- Modified: Existing LC-001 stories may receive small cross-references where they describe the Director contract, debug records, or persistence strategy.
- Removed: none.

## Change Folder

- Active location: `docs/changes/2026-06-28-transcript-director-mode/`
- Closed location: `docs/changes/closed/2026-06-28-transcript-director-mode/`

## Impact

- Product: Adds an explicit comparison path for story quality without runtime world-state context or mutation.
- Code: Adds a Director mode boundary through request validation, prompt construction, output parsing, route orchestration, Convex completion behavior, and debug summaries.
- Tests: Requires focused unit and route/workflow tests proving prose output succeeds, transcript/debug persistence remains, and facts/events/diffs do not change in transcript mode.
- Docs: Updates the LC-001 Epic, persistence/data-model docs, README/debug guidance, and changelog.

## Changelog Impact

- Required: yes.
- Category: Added.
- Public summary: Add a transcript Director mode for comparing story-only prose generation against the persistent world-mutation path.

## Questions And Readiness

### Blocking Questions

- None.

### Implementation-Discovery Questions

- None.

### Deferred Scope

- In-app or player-facing mode selection.
- Lore cards, keyword-triggered context injection, SillyTavern-style World Info, AI Dungeon-style Story Cards, embeddings, and retrieval.
- Broader persistence reintroduction after the core chat experience works in transcript mode.

## Apply Readiness

- Status: ready.
- Reason: The mode-selection, smoke-test, and context-injection questions have been resolved. Implementation can start from the server-startup flag path and persistent mode remains the default.
