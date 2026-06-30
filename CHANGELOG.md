# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog 1.1.0.

## [Unreleased]

### Added

- Read-only NPC profile context for persistent Game Master turns, plus debug-panel NPC inspection and temporary server-local NPC overrides.
- Brother Alden, a second seeded chapel NPC, for multiple-NPC local playtesting.
- Transcript Game Master mode for story-only prose generation from an opening seed plus transcript, without mutating or consuming canonical runtime world state.
- Debug prompt guidance text sections for Game Master style, NPC behavior, and persistence guidance on each playtest turn.
- Debug-gated raw Game Master request storage for inspecting exact provider messages during local troubleshooting.
- Scoped narrative turns as the durable grouping layer for persisted player input, Game Master output, events, state diffs, debug records, and future rollback boundaries.
- Narrative Game Master MVP with a provider-agnostic OpenAI-compatible backend route, persisted story feed, Game Master call debug records, Mira NPC memory facts, and rough playtest reset.

### Changed

- Documented the long-term target as TTRPG-style Game Master play with selective hidden adjudication, not lightweight MUD simulation.
- Refined seeded NPC profile fields into stable description, background, persona, voice, mood, status, memory, and private knowledge.
- Rendered read-only NPC profiles as canonical NPC Cards in persistent Game Master prompts, with derived conversation focus for ambiguous follow-up dialogue.
- Trimmed Game Master provider prompts to compact sectioned prompts (`AI Instructions`, `World`, `NPC Cards`, `Recent Story`, `Current Input`) instead of sending the full internal debug component graph.
- Split creative story generation from future structured mutation extraction: persistent Game Master turns now request plain prose and the backend wraps narration with empty NPC updates.
- Improved persistent Game Master prompt priority so current turn directives and read-only NPC profiles outrank stale recent-feed prose, with tighter direct-NPC question targeting.
- Transcript mode now avoids live room, actor, NPC fact, object, exit, and hidden-knowledge prompt context so transcript continuity cannot conflict with canonical world state.
- Improved Game Master prompt context so direct NPC questions can produce meaningful NPC responses while read-only NPC knowledge remains outside the mutable state allowlist.
- Changed local Game Master debug logs to write one inspectable `director.turn.unit` record per recorded turn attempt.
- Changed `npm run dev:debug` to enable full local Game Master diagnostics, including raw provider requests, raw LLM responses, and persisted raw request storage.
- Changed the Lorecraft play surface from chat-like feed cards to a prose-first story stream with independent story/debug scrolling and bottom anchoring.
- Replaced the player-facing command parser surface with one narrative input and a split debug layout.
