# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog 1.1.0.

## [Unreleased]

### Added

- Adventure instances created from frozen WorldVersions, with the default Stormbound Chapel playtest now running inside a mutable Adventure copy.
- Startup World container screen for Stormbound Chapel, with local Adventures listed by turn count and last played date and opened at `/adventures/<id>`.
- Home-screen deletion for local Adventures without changing the source WorldVersion.
- Player name prompt when creating a new Adventure.
- Persistent collapsible Player Card with editable physical description, backstory, status, and current location context.
- Persistent read-only Room Info panel showing the current room description and present NPCs beside the story.
- Player-facing Pass turns that let the Game Master continue the current scene without adding player prose.
- Player-facing Story inserts that add canonical scene prose before the next resolving turn without incrementing turn count.
- Player-facing Guide turns that privately steer the next Game Master narration while keeping raw Guide text out of the story stream.
- Pre-turn `/help` and `/look` utility commands that remain visible on reload without advancing the turn count.
- Slash-command autocomplete for `/help`, `/look`, and visible `/look` targets.
- Tutorial World for learning the basic play loop with a one-NPC starter room and a multi-NPC follow-up room.

### Changed

- Runtime story state, debug edits, Game Master turns, state diffs, and reset behavior now target the selected Adventure instead of using the authored World as mutable play state.
- Game Master prompts now continue from canonical Adventure state plus recent successful narration, while prior player commands and world events remain visible/debuggable but are not treated as normal future story context.
- Recent Game Master context now includes player-authored Story inserts while continuing to exclude slash utility output and raw Guide text.
- NPC state extraction is more conservative about momentary reactions, so transient beats are less likely to become durable NPC facts.
- The startup screen now supports multiple seeded World containers instead of assuming Stormbound Chapel is the only World.
- Game Master prompts now include filled Player Card fields as canonical protagonist context while preserving player agency.

### Fixed

- Debug NPC reset and debug-created NPC/Location limits now use the selected Adventure's source WorldVersion baseline, so Tutorial seeded entities are no longer treated as Stormbound debug-created rows.

## [0.2.0] - 2026-07-01

Second MVP release focused on turning the initial chat spike into a more inspectable persistent-world playtest loop, with deterministic browser coverage, bounded state extraction, and lightweight location state.

### Added

- Lightweight Location Cards, debug location editing, and bounded actor movement to existing canonical locations.
- Canonical debug NPC editing parity with Location editing, including debug-created NPCs, seeded tavern NPCs, and resettable NPC debug state.
- Deterministic Playwright E2E coverage for the Lorecraft playtest loop using a local OpenAI-compatible fixture provider.
- Post-narration NPC state extraction for persistent mode, with bounded validated updates for NPC `mood`, `status`, and `memory`.
- Game Master call roles in debug metadata so story generation and NPC-state extraction can be inspected separately for the same turn.

## [0.1.0] - 2026-06-30

Initial Lorecraft MVP release: a local-first Next.js and Convex prototype for testing a narrative Game Master, persistent story feed, scoped turns, debug visibility, transcript mode, and read-only NPC context.

### Added

- Next.js 16, React 19, Tailwind CSS 4, and Convex scaffold for the Lorecraft MVP prototype.
- Provider-agnostic OpenAI-compatible Game Master route for local Ollama, LM Studio, OpenRouter, Vercel AI Gateway, or direct-provider playtesting.
- Narrative-only player surface with one unified input and a prose-first story stream anchored around the latest turn.
- Stormbound Chapel demo world with a seeded chapel scene, Mira, Brother Alden, rough reset, and fresh boot-scoped seed workflow.
- Persistent story feed with player inputs, Game Master narrations, world events, state diffs, debug records, and scoped narrative turns as the future rollback boundary.
- Read-only NPC profile context rendered as canonical NPC Cards, including description, background, persona, voice, mood, status, memory, and private knowledge.
- Debug panel tabs for prompt guidance, NPC inspection and temporary server-local overrides, hidden state, turns, Game Master calls, and state diffs.
- Debug-gated local JSONL logs, raw provider request logging, raw LLM response logging, and persisted raw request storage for inspectable Game Master turns.
- Transcript Game Master mode for story-only prose generation from the opening seed plus transcript, without consuming or mutating canonical runtime world state.
- Compact sectioned Game Master prompts that split creative story generation from future structured state extraction.
- Local smoke playtest scripts and same-prompt model benchmarking for comparing available local storytelling models.
- Project documentation for persistence strategy, canonical data model, CI/CD policy, and the long-term TTRPG-style Game Master direction.
