# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog 1.1.0.

## [Unreleased]

### Added

- Debug prompt guidance text sections for Director style, NPC behavior, and persistence guidance on each playtest turn.
- Debug-gated raw Director request storage for inspecting exact provider messages during local troubleshooting.
- Scoped narrative turns as the durable grouping layer for persisted player input, Director output, events, state diffs, debug records, and future rollback boundaries.
- Narrative Director MVP with a provider-agnostic OpenAI-compatible backend route, persisted story feed, Director call debug records, Mira NPC memory facts, and rough playtest reset.

### Changed

- Improved Director prompt context so direct NPC questions can produce meaningful NPC responses while read-only NPC knowledge remains outside the mutable state allowlist.
- Changed local Director debug logs to write one inspectable `director.turn.unit` record per recorded turn attempt.
- Changed the Lorecraft play surface from chat-like feed cards to a prose-first story stream with independent story/debug scrolling and bottom anchoring.
- Replaced the player-facing command parser surface with one narrative input and a split debug layout.

### Deprecated

### Removed

### Fixed

### Security
