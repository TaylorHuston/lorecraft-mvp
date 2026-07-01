# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog 1.1.0.

## [Unreleased]

### Added

- Lightweight Location Cards, debug location editing, and bounded actor movement to existing canonical locations.
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
