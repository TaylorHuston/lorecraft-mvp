# Proposal: Provider-Agnostic Narrative Director MVP

## Why

Lorecraft currently proves that a small Convex-backed world can be seeded, navigated, and mutated through deterministic command handling. The next proof should move closer to the intended player experience: one narrative input where the player writes what they do, say, inspect, or ask, and the world responds through an AI Director.

The important MVP question is no longer just "can the app call an LLM?" It is: can Lorecraft persist a resumable narrative transcript and a small amount of structured NPC state while keeping the LLM provider replaceable and the database authoritative?

## What Changes

- Replace the command-first player experience with a narrative-first chat/story feed.
- Keep one unified input box. Slash commands and precise MUD-style commands are deferred until a real need appears.
- Route player input through a Next.js Route Handler for this POC, backed by reusable TypeScript application/domain modules, so React remains a replaceable client.
- Keep Convex as canonical persistence for commands, narrations, events, facts, state diffs, and Director debug records.
- Add a provider-neutral Director boundary targeting an OpenAI-compatible chat completions endpoint through `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL`.
- Document Ollama as the first local runtime example while keeping LM Studio/OpenRouter/Vercel AI Gateway-compatible endpoints configurable through the same env vars.
- Keep provider sessions stateless, but include current structured world/NPC state plus a small recent feed window in each Director request.
- Require structured Director output with a player-facing `narration` and optional current-scene `npcUpdates`.
- Persist the resumable feed from existing `commands`, `narrations`, and `events`, ordered by creation time and grouped by command when useful.
- Persist accepted NPC state updates as `facts` on existing `actors`, not a dedicated NPC table.
- Add a small `directorCalls` debug table for provider/model metadata, compact request summary, raw response, parsed response, status, accepted updates, ignored updates, and errors.
- Seed Mira with baseline `mood`, `status`, and `memory` facts.
- Add an in-place rough reset path for repeated playtesting while documenting that independent story/play-session instances come later.

## Epic Actions

### New Epic Directories

- Create `docs/epics/lc-001-provider-agnostic-chat-experience/` with `epic.md` after this proposal is accepted.

### Existing Epic Directory Updates

- None proposed. No Epic directories exist in this repo yet.

## Epic Story Changes

- Add Story: Narrative play feed and unified input.
- Add Story: Provider-agnostic backend Director boundary.
- Add Story: Persistent current-scene NPC state.
- Add Story: Debuggable Director calls and reset.

## Change Folder

- Active location: `docs/changes/2026-06-27-provider-agnostic-chat-mvp/`
- Closed location: `docs/changes/closed/2026-06-27-provider-agnostic-chat-mvp/`

## Impact

- Product: Moves the MVP toward "AI Director in a persistent scene" rather than a command parser with LLM fallback.
- Code: Expected to touch the player client, Next.js Route Handler, Convex schema/functions, backend application/domain modules, the seed/reset flow, and provider adapter code.
- Tests: Needs focused checks for structured Director parsing, NPC update validation, persisted feed reconstruction, no room/state mutation beyond accepted NPC facts, and provider error handling.
- Docs: Proposes the first Epic for the implementation repo; does not alter private vault product docs.

## Blocking Questions

- None. Implementation-blocking scope decisions have been resolved.

## Deferred / Non-Blocking Questions

- Which Ollama model should be the first recommended local model after basic wiring works?
- Which deterministic debug affordances, if any, are worth reintroducing after the narrative-first loop is working?
- When the POC grows beyond local playtesting, should Director orchestration move from a Next.js Route Handler to Convex actions or another backend service?
