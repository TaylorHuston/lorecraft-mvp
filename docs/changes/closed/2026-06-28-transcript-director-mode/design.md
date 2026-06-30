# Design: Transcript Director Mode

## Context

Lorecraft currently sends each player turn through one persistent Director path. The route records a turn and command, builds a bounded request from Convex scene state and recent feed, asks the provider for strict JSON, parses `narration` plus optional `npcUpdates`, validates bounded NPC fact changes, persists a Director call, stores narration, applies accepted updates, and records state diffs/events for accepted mutations.

That path is right for the state-first product thesis, but it makes early story-quality diagnosis noisy. If the Director responds passively, hallucinates intent, or avoids NPC dialogue, the cause could be prompt quality, local model capability, JSON/schema pressure, persistence guidance, or update validation constraints.

Transcript mode is a playtest comparison path. It is not actually "nothing is saved." It means the transcript and debug evidence still persist, while canonical world/NPC state remains read-only for that turn.

## Goals / Non-Goals

**Goals:**

- Add a server-startup-flag controlled transcript Director mode for developer playtesting.
- Use a plain-prose provider output contract in transcript mode.
- Build transcript-mode prose requests from only the canonical opening seed, the bounded transcript, prompt guidance, and the current player input.
- Keep turns, commands, narrations, Director calls, and local logs inspectable by turn.
- Prevent transcript Director responses from mutating facts, state diffs, events, actor locations, rooms, exits, objects, or NPC memory.
- Preserve the current persistent JSON/state-update path as the default.
- Make mode, output contract, and mutation behavior visible in debug summaries/logs.

**Non-Goals:**

- Remove or weaken the existing persistent Director mode.
- Add SillyTavern-style lorebooks, keyword-triggered lore cards, embeddings, retrieval, or Story Card management.
- Add rollback, branching timelines, story instances, campaign copies, movement mutation, object mutation, inventory, combat, rules, or RNG.
- Add an in-app mode selector.
- Add a polished player settings surface.
- Store provider conversation IDs or depend on hidden remote LLM memory.
- Fine-tune a model or change the supported provider adapter family.
- Include current room state, present actor rows, visible exits, object state, mutable NPC facts, hidden NPC knowledge, or scene-beat classification in transcript-mode prompts.

## Epic Changes

### Update Epic: Provider-Agnostic Chat Experience

- Target Epic: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Change Type: added scope

#### Story Changes

- Added: `LC-001-S8: Transcript Director Mode`
- Modified: Small cross-references may be added to LC-001-S2, LC-001-S3, LC-001-S4, LC-001-S7, or persistence docs if needed to distinguish persistent mode from transcript mode.
- Removed: none.

#### Story LC-001-S8: Transcript Director Mode

As a developer-playtester, I want a story-only Director mode that saves the transcript but does not mutate canonical world state, so that I can isolate story quality from persistence mechanics before adding mutation pressure back in.

##### R1: Director Mode Configuration

The system SHALL support explicit Director modes selected by application server startup configuration.

###### Scenario R1-S1: Persistent mode remains default

- WHEN the application server starts without a transcript Director flag
- AND the player submits a narrative turn
- THEN the route uses the existing persistent mode
- AND the current strict JSON, NPC update validation, narration persistence, state diff, and event behavior remains available

###### Scenario R1-S2: Transcript startup flag enabled

- WHEN the application server starts with a local flag such as `LORECRAFT_DIRECTOR_MODE=transcript`
- AND the player submits a narrative turn
- THEN the backend Director boundary resolves the mode as transcript
- AND React does not own the mode's persistence rules

###### Scenario R1-S3: Invalid startup mode rejected before persistence

- WHEN the application server is configured with an unknown Director mode value
- AND the player submits a narrative turn
- THEN the route returns a structured setup or validation error
- AND it does not create a turn, record player input, or call the provider

##### R2: Plain-Prose Story Contract

The system SHALL use a plain-prose output contract for transcript Director calls.

###### Scenario R2-S1: Transcript prompt asks for prose

- WHEN the backend builds a transcript Director request
- THEN the system prompt asks for player-facing story prose rather than strict JSON
- AND it does not ask the model to return `npcUpdates`, state diffs, events, or machine-readable mutation proposals

###### Scenario R2-S2: Non-empty prose succeeds

- WHEN the provider returns non-empty plain text in transcript mode
- THEN the backend treats the trimmed text as the Director narration
- AND the turn can succeed without JSON parsing

###### Scenario R2-S3: Empty prose fails cleanly

- WHEN the provider returns an empty response in transcript mode
- THEN the turn is marked failed
- AND no fake narration or state change is stored

###### Scenario R2-S4: Transcript context excludes runtime world state

- WHEN the application runs in transcript mode
- AND the player submits a narrative turn
- THEN the backend builds the plain-prose Director request from the canonical opening seed, bounded transcript, prompt guidance, and current player input
- AND it does not include current room state, present actor rows, visible exits, object state, mutable NPC facts, hidden NPC knowledge, or scene-beat classification

##### R3: Transcript And Debug Persistence Without World Mutation

The system SHALL persist inspectable transcript/debug records for transcript turns while leaving canonical world state unchanged.

###### Scenario R3-S1: Transcript turn resumes after reload

- WHEN a transcript turn succeeds and the app reloads
- THEN the feed shows the player's input and the Director narration
- AND the turn/debug records remain inspectable after reload

###### Scenario R3-S2: Director debug identifies mode and output contract

- WHEN a transcript Director call is persisted or locally logged
- THEN the debug metadata includes `directorMode: "transcript"` and a plain-prose output contract indicator
- AND accepted and ignored update lists are empty

###### Scenario R3-S3: Raw artifacts remain gated

- WHEN transcript mode records local logs or persisted Director calls
- THEN exact raw provider request and response text follows the existing raw debug flag behavior
- AND API keys, secrets, and full environment dumps remain excluded

##### R4: Canonical State Mutation Disabled

The system SHALL prevent transcript Director responses from changing canonical world state.

###### Scenario R4-S1: NPC facts do not change

- WHEN a transcript turn succeeds
- THEN current NPC facts such as Mira's `mood`, `status`, and `memory` remain unchanged
- AND no `npcUpdates` from the model are parsed, accepted, or ignored

###### Scenario R4-S2: No LLM state diffs or world events

- WHEN a transcript turn succeeds
- THEN no LLM-authored state diffs are recorded
- AND no LLM-authored world event such as "Mira's state changed after the exchange" is recorded

###### Scenario R4-S3: Runtime world state is not prompt context

- WHEN a transcript request is built
- THEN canonical runtime state such as current room, visible facts, hidden NPC knowledge, and actor locations is not included as read-only context
- AND story continuity comes from the seed plus transcript instead

##### R5: Mode Comparison Remains Testable

The system SHALL make persistent and transcript behavior easy to compare during local playtesting.

###### Scenario R5-S1: Same input can be tested in either mode

- WHEN the same seeded world and player input are used after starting the application server in persistent mode and transcript mode
- THEN both modes can produce a player-facing narration
- AND only persistent mode may produce validated world/NPC mutations

###### Scenario R5-S2: Smoke playtest can prove no-mutation behavior

- WHEN a local transcript smoke playtest sends a direct Mira question
- THEN the response includes non-empty narration
- AND Convex snapshot/debug evidence shows the command, turn, narration, and Director call without new NPC fact changes, state diffs, or LLM world events

###### Scenario R5-S3: Fresh demo world per seed

- WHEN the demo world is seeded during the current MVP
- THEN prior Stormbound Chapel demo worlds and dependent rows are deleted
- AND the new world uses the current server boot's demo slug
- AND playtesting starts from the initial seed instead of resuming older world state

##### Implemented By

- `src/lib/director/mode.ts` reads `LORECRAFT_DIRECTOR_MODE`, defaults to persistent mode, and rejects unknown values before turn persistence.
- `src/lib/director/prompt.ts` builds separate persistent JSON and transcript plain-prose Director requests; transcript requests use seed plus transcript rather than live world state.
- `src/lib/director/provider.ts` omits OpenAI-compatible `response_format` when the effective generation settings request plain text.
- `src/lib/director/output.ts` parses transcript plain prose as narration with no NPC updates.
- `src/app/api/director/turn/route.ts` branches backend Director orchestration by startup mode, loads transcript context for transcript mode, and sends transcript completions through a no-mutation path.
- `convex/world.ts` seeds fresh boot-scoped demo worlds, stores successful transcript narrations and Director calls, and skips NPC fact writes, LLM events, and state diffs.
- `src/app/world-client.tsx` shows the latest Director mode and output contract in the debug summary.
- `scripts/director-transcript-playtest.mjs` verifies the local transcript no-mutation smoke path.

##### Verified By

- `npm run test` passed, including mode defaulting/validation, transcript prose prompt shape, plain-prose output parsing, and provider request body behavior.
- Focused Director tests cover transcript prompt shape, seed/transcript-only context, mode aliasing, plain-prose parsing, and persistent-mode scene-beat behavior.
- `npm run typecheck` passed after adding the Director mode and output-contract type split.
- `npm run ci:required` passed after implementation and documentation updates.
- `npx convex codegen` passed after adding the no-mutation completion argument.
- `LORECRAFT_DIRECTOR_MODE=transcript npm run dev:debug` plus `npm run playtest:director:transcript` passed against local Convex/Next/Ollama, producing non-empty prose while preserving baseline Mira facts and creating no LLM state diffs or LLM world events.
- After final review found and fixed contradictory nested prompt guidance, `npm run test`, `npm run typecheck`, `npm run ci:required`, and `npm run playtest:director:transcript` passed again.
- `npm run dev:debug` plus `npm run playtest:director` passed in default persistent mode, proving the existing strict JSON smoke path still works.
- After changing transcript mode to seed-plus-transcript context, `npm run ci:required` and `npm run playtest:director:transcript` passed; latest log inspection confirmed the raw prompt includes `worldSeed` and `transcript` while omitting `sceneState`, `visibleFacts`, `hiddenNpcKnowledge`, and `requiredSceneBeat`.
- Fresh demo seeding verified through `npx convex codegen`, `npm run ci:required`, `npm run playtest:director:transcript`, and latest log inspection showing a new transcript turn with seed/transcript prompt components and zero accepted/ignored updates.

##### Verification Gaps

- Taylor manual browser confirmation remains pending.

## Epic File Rules

- Stories live inside the Epic `epic.md` file.
- Do not create `docs/stories/` or individual Story files.
- Preserve the Epic directory as the future home for supporting artifacts such as mockups, screenshots, research, or design notes.
- Epics and Stories are durable but revisable; Stories may be renamed, reordered, split, merged, or moved between Epics as the product matures.
- Keep Story IDs stable even when Story titles change or Stories move between Epics.
- Keep Story IDs unique across active Epics in the app. `LC-001-S8` was selected after scanning active Epic files and finding LC-001-S1 through LC-001-S7 already in use.
- Restart Requirement IDs inside each Story: `R1`, `R2`, `R3`.
- Scope Scenario IDs to their Requirement: `R1-S1`, `R1-S2`, `R2-S1`.
- Do not use generic Scenarios such as "WHEN this Story's workflow is exercised"; name the real trigger, state, failure mode, or observable condition.

## Technical Approach

Add an explicit Director mode value resolved from application server startup configuration, likely shaped as `LORECRAFT_DIRECTOR_MODE=persistent | transcript`, with `persistent` as the default when the variable is omitted. Validate this value before any Convex write or provider call on a turn. The client does not send or own the mode for this change.

Keep the Next Route Handler as the synchronous orchestration boundary. Branch the Director application flow by mode before prompt construction:

- Persistent mode continues to call the existing JSON prompt builder, strict JSON parser, NPC update validator, scene-beat persistence boundary, and Convex completion path.
- Transcript mode loads transcript context, calls a separate plain-prose prompt builder, sends the canonical opening seed plus bounded transcript plus current input, trims the provider response into narration, and completes the turn with narration plus empty accepted/ignored updates.

Do not add a new table for this change. Existing `turns`, `commands`, `narrations`, and `directorCalls` can represent transcript turns. Existing `directorCalls.requestSummary` and `parsedResponse` are flexible enough to include mode and output-contract metadata. If a small type expansion is useful, prefer extending Director TypeScript types over changing Convex schema. If schema changes become necessary during implementation, keep them additive and document them.

Convex completion behavior should avoid applying mutation side effects for transcript mode. The implementation can either add a dedicated no-mutation completion mutation or add an explicit mode/no-mutation parameter to the existing completion mutation. The important contract is that transcript success stores narration and debug evidence but skips NPC fact writes, LLM event inserts, and state diff inserts.

The debug panel should expose the effective mode and make the latest call's mode/output contract visible, but it should not select the mode. Mode changes require restarting the application server with a different local flag.

Local turn logs should keep the Director turn inspectable as one concrete unit. Transcript logs should make the mode and prompt component keys clear enough to confirm the request used seed/transcript context rather than live world state.

Update `docs/persistence-system.md` and `docs/data-model.md` to define transcript mode precisely: transcript/debug persistence remains, canonical world-state mutation is disabled.

## Alternatives Considered

- Option: Keep only the current persistent JSON path and tune prompts.
  - Why not: Prompt tuning alone does not isolate whether JSON/schema and mutation instructions are degrading story quality.
- Option: Make transcript mode fully ephemeral with no saved turns or debug records.
  - Why not: The current diagnosis loop depends on replayable transcript/debug evidence, and resume behavior remains useful even when canonical state does not mutate.
- Option: Keep JSON in transcript mode as `{ "narration": "..." }`.
  - Why not: Minimal JSON would reuse parser shape, but it would not cleanly test whether plain prose produces better local-model story behavior.
- Option: Select transcript mode through the debug panel.
  - Why not: For the first experiment, a startup flag is simpler and avoids introducing per-turn or per-client mode switching semantics before the backend behavior is proven.
- Option: Add lore cards, World Info, keyword triggers, or retrieval at the same time.
  - Why not: Those are a context-injection style used by adjacent apps, but Lorecraft should first prove the core chat loop and then add its real persistence back in rather than copying a context-injection-first architecture.
- Option: Add a new timeline/feed table first.
  - Why not: Existing scoped turns and derived feed are enough for this experiment.

## Why This Approach

This is the smallest useful diagnostic split. It preserves the state-first product direction while giving the team a baseline close to a normal "AI DM continues the story" chat. If transcript mode writes noticeably better prose, the next work can reintroduce persistence one layer at a time. If it is still passive, the problem is more likely prompt/model quality than the persistence machinery.

## Implementation Constraints

- Backend/application logic owns mode behavior; React only displays the effective mode.
- Persistent mode remains the default to avoid silently changing the current MVP proof.
- Provider requests remain stateless and rebuilt from local context; no provider conversation/session memory is introduced.
- Transcript mode may read canonical seed data to construct the opening premise, but must not use canonical runtime scene state as prompt truth after play begins.
- Raw prompt/response logging remains debug-gated exactly as it is today.
- Do not add a mode-selection UI in this change.

## Verification Strategy

- Add unit tests for Director mode validation and defaulting.
- Add prompt tests proving transcript mode asks for plain prose and does not request JSON, `npcUpdates`, state diffs, or events.
- Add output tests proving non-empty prose succeeds and empty prose fails.
- Add prompt tests proving transcript mode uses seed/transcript context and omits runtime scene state, actor facts, hidden NPC knowledge, and scene-beat guidance.
- Add route/workflow tests or focused integration tests proving transcript success persists command/turn/narration/director-call records with empty accepted/ignored updates.
- Add Convex-level or local playtest verification proving transcript turns do not change NPC facts, create LLM state diffs, or create LLM world events.
- Keep the existing `npm run playtest:director` focused on persistent mode.
- Add a separate transcript smoke command or check.
- Run `npm run ci:required`, `npx convex codegen` if Convex types/schema are touched, and local dev-debug playtests in both server modes.

## Decisions

- Use plain prose output for the first transcript mode.
- Keep deterministic scene beats in the persistent path; transcript mode relies on the transcript and model inference rather than a separate classifier.
- Preserve transcript and debug persistence in transcript mode.
- Disable canonical world mutation in transcript mode.
- Select transcript mode through an application server startup flag, not an in-app UI selector.
- Keep persistent mode as the default.
- Keep the existing Director smoke playtest focused on persistent mode and add a separate transcript smoke check.
- Defer lore cards/keyword-triggered context injection; after the core chat works, the preferred direction is to add Lorecraft's real persistence back in.

## Risks / Trade-Offs

- Plain prose introduces a second output contract, which increases Director code paths.
- Transcript mode can produce story continuity that is not canonical truth, so UI/debug labels need to make the boundary clear.
- If playtesters prefer transcript prose, reintroducing state mutation may require a more staged Director architecture.
- Startup-flag mode selection is simple but coarse; switching modes requires restarting the application server.

## Implementation-Discovery Questions

- None.
