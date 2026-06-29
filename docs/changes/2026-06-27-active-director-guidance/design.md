# Design: Active Director Guidance

## Context

Lorecraft currently builds one stateless provider request from Convex state and a bounded recent feed. The prompt tells the model to return strict JSON with `narration` and optional `npcUpdates`, and only `mood`, `status`, and `memory` may be mutated. That preserves the persistence boundary, but it does not give the Director a strong storytelling obligation.

The current seeded world includes facts beyond mutable NPC state, such as Mira knowing about the storm. Convex loads those actor facts for Director context, but `src/lib/director/prompt.ts` filters actor facts to the mutable `NPC_FACT_KEYS` before sending the payload. As a result, a seeded read-only fact can exist in the database while the Director has no access to it.

The current provider adapter also hard-codes generation options such as `temperature: 0.7`. That makes it harder to compare local models and tune the prose loop without code edits.

The current `directorCalls` record stores `rawResponse`, `parsedResponse`, and a compact `requestSummary`, but it does not store the exact provider request messages. During prompt-guidance playtesting, that means a developer can see what the model returned but not exactly what the model saw.

## Goals / Non-Goals

**Goals:**

- Make the Director's job story-first, not merely schema-first.
- Require a meaningful scene beat when the player directly addresses an NPC.
- Include read-only NPC/world knowledge in Director context while keeping mutation authority bounded.
- Keep durable NPC fact updates conservative and separate from transient narration.
- Add dev/config-level generation settings that help local model playtesting.
- Add debug-panel text guidance sections for style, NPC behavior, and persistence prompt tuning.
- Add debug-gated raw request persistence for exact provider messages during local troubleshooting.
- Add focused tests that catch passive responses, missing hidden knowledge context, and accidental fact churn.

**Non-Goals:**

- Implement RNG, reaction rolls, morale checks, oracle tables, or other TTRPG-inspired mechanics.
- Add a player-facing settings panel.
- Add a world-builder UI for editing prompt components.
- Fine-tune a model.
- Store raw provider request messages unconditionally.
- Expand the LLM's allowed mutation fields beyond current-scene NPC `mood`, `status`, and `memory`.
- Add combat, inventory, movement mutation, relationship graph traversal, story instances, rollback, or offscreen consequence propagation.

## Epic Changes

### Update Epic: Provider-Agnostic Chat Experience

- Target Epic: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Change Type: added scope

#### Story Changes

- Added: `LC-001-S7: Active Director Guidance And Context Assembly`
- Modified: Existing Story maps may be updated after implementation where they reference prompt construction, provider configuration, or persistence docs.
- Removed: none.

#### Story LC-001-S7: Active Director Guidance And Context Assembly

As a playtester, I want the Director to actively advance the current scene and let present NPCs respond meaningfully, so that Lorecraft feels like a story with persistent structure instead of a passive state logger.

##### R1: Prompt Context Components

The system SHALL assemble Director prompts from explicit components with clear source ownership.

###### Scenario R1-S1: Prompt separates instructions from state and history

- WHEN the backend builds a Director request
- THEN the request distinguishes Director instructions, scene state, visible facts, hidden NPC knowledge, recent feed, current player input, and required scene beat
- AND the recent feed remains bounded and does not include internal turn or command IDs

###### Scenario R1-S2: Editable and derived components have clear ownership

- WHEN prompt components are documented or inspected in tests
- THEN Director instructions, author/tone guidance, and model settings are treated as editable configuration
- AND scene state, visible facts, hidden NPC knowledge, recent feed, and required scene beat are derived from Convex state, player input, and engine logic

##### R2: Read-Only Knowledge Context

The system SHALL include relevant read-only knowledge facts in Director context without expanding LLM mutation authority.

###### Scenario R2-S1: Seeded NPC knowledge reaches the Director

- WHEN Mira has a seeded read-only fact such as `knows_about_storm`
- AND the player asks Mira what she knows about the storm
- THEN the Director request includes that knowledge as hidden context
- AND the model can use it to write player-facing narration or dialogue

###### Scenario R2-S2: Read-only facts are not mutable output fields

- WHEN the Director returns `npcUpdates`
- THEN validation still accepts only the bounded mutable NPC fields currently allowed by the MVP
- AND read-only facts such as knowledge, secrets, occupation, or relationships are ignored if returned as attempted updates

##### R3: Required Scene Beat

The system SHALL derive a lightweight scene-beat instruction from player input and current scene context.

###### Scenario R3-S1: Direct NPC question expects response

- WHEN the player directly asks Mira a question
- THEN the Director request includes a required scene beat indicating Mira is directly addressed and a meaningful response is expected
- AND the response may be an answer, refusal, deflection, warning, lie, counter-question, or visibly intentional silence

###### Scenario R3-S2: Non-dialogue action does not force speech

- WHEN the player performs a non-dialogue action such as jumping, smiling, or inspecting an object
- THEN the required scene beat does not force an NPC line of dialogue
- AND the Director may still narrate relevant observable reactions when they make sense

##### R4: Active NPC Narrative Behavior

The system SHALL guide the Director to write active scene progression rather than passive acknowledgement.

###### Scenario R4-S1: NPC response advances the story

- WHEN the player directly engages a present NPC
- THEN the Director narration includes a concrete response or choice from that NPC
- AND it avoids merely repeating that the NPC is watchful, thoughtful, hesitant, or unchanged unless that silence is intentionally meaningful in the scene

###### Scenario R4-S2: Dialogue is allowed in narration

- WHEN the Director writes player-facing narration for an NPC response
- THEN it may include quoted or clearly attributed NPC speech inside the `narration` field
- AND no separate dialogue schema is required for this change

##### R5: Conservative Persistence Boundary

The system SHALL keep transient story beats out of durable NPC facts unless they should matter after recent context falls away.

###### Scenario R5-S1: Ephemeral reactions stay in narration

- WHEN Mira glances, flinches, smiles, pauses, or briefly reacts to a player action
- THEN the Director can narrate the beat without returning an `npcUpdates` entry
- AND existing NPC facts remain unchanged

###### Scenario R5-S2: Durable changes remain bounded

- WHEN an interaction meaningfully changes Mira's current attitude, ongoing circumstance, or rolling memory
- THEN the Director may propose updates only for `mood`, `status`, or `memory`
- AND the backend validates, accepts, ignores, and records updates through the existing persistence boundary

##### R6: Dev-Configurable Generation Settings

The system SHALL let developers tune supported provider generation settings without code edits.

###### Scenario R6-S1: Optional settings configured

- WHEN optional LLM generation environment variables are configured
- THEN the provider adapter includes supported settings in the OpenAI-compatible request body
- AND unset settings fall back to safe defaults

###### Scenario R6-S2: Settings are visible in debug summaries

- WHEN a Director call is persisted or locally logged
- THEN debug metadata includes a compact summary of the effective generation settings
- AND secrets, API keys, and full environment dumps remain excluded

##### R7: Debug Prompt Guidance

The system SHALL let developer-playtesters adjust text-only Director guidance from the debug panel.

###### Scenario R7-S1: Prompt guidance sections affect the next turn

- WHEN a developer-playtester edits the style, NPC behavior, or persistence guidance fields
- AND submits a narrative turn
- THEN those text sections are included in the Director prompt context for that turn
- AND they do not change the required JSON output shape or backend validation authority

###### Scenario R7-S2: Prompt guidance is debug-visible

- WHEN a Director call is persisted
- THEN the request summary records which prompt guidance sections were included
- AND the debug panel can show those section keys with the latest Director summary

##### R8: Debug-Gated Raw Request Persistence

The system SHALL optionally persist the exact Director provider request for local troubleshooting.

###### Scenario R8-S1: Raw request stored only when explicitly enabled

- WHEN local raw request debug storage is enabled
- AND a Director call is attempted
- THEN the persisted Director call includes the exact provider messages sent to the OpenAI-compatible adapter
- AND the raw request can be inspected in the existing debug JSON

###### Scenario R8-S2: Raw request omitted by default

- WHEN local raw request debug storage is not enabled
- AND a Director call is persisted
- THEN the Director call stores compact request metadata but omits the full raw request messages
- AND hidden world facts, prompt guidance, and player text are not duplicated into raw request storage by default

##### Implemented By

- `src/lib/director/prompt.ts`
- `src/lib/director/provider.ts`
- `src/app/api/director/turn/route.ts`
- `src/lib/director/output.ts`
- `src/lib/director/director.test.ts`
- `convex/world.ts`
- `src/app/world-client.tsx`

##### Verified By

- `npm run test`
- `npm run ci:required`
- `npx convex codegen`
- Local route playtest with Ollama `llama3.1:8b`
- Local Convex snapshot inspection of `directorCalls.requestSummary`

##### Verification Gaps

- Broader provider-specific behavior for LM Studio, OpenRouter, Vercel AI Gateway, or direct hosted providers remains future playtest coverage.

## Epic File Rules

- Stories live inside the Epic `epic.md` file.
- Do not create `docs/stories/` or individual Story files.
- Preserve the Epic directory as the future home for supporting artifacts such as mockups, screenshots, research, or design notes.
- Keep Story IDs stable even if this Story is later renamed or moved.
- Restart Requirement IDs inside each Story: `R1`, `R2`, `R3`.
- Scope Scenario IDs to their Requirement: `R1-S1`, `R1-S2`, `R2-S1`.

## Technical Approach

Implement the change in the backend Director layer rather than the React UI. The likely shape is:

- Introduce small typed prompt-component builders in `src/lib/director/` so prompt assembly has named sections instead of one flat system prompt plus one JSON payload.
- Add a lightweight input/context classifier for the current scene beat. The first version can be deterministic and narrow: detect direct references to present NPC names/pronouns and question-like inputs well enough to set `directTarget`, `interactionKind`, and a human-readable `requiredSceneBeat`.
- Split actor facts into mutable state facts and read-only knowledge facts before prompt construction. Mutable update validation remains limited to `mood`, `status`, and `memory`.
- Include read-only knowledge facts in the prompt as hidden context. Start with a conservative allowlist or all current-scene actor facts outside `NPC_FACT_KEYS`; document the choice during implementation.
- Include optional debug prompt guidance text in prompt context for style, NPC behavior, and persistence strategy. Treat it as guidance only; it must not override schema, validation, or hidden-knowledge boundaries.
- Keep output shape unchanged: `{"narration":"...","npcUpdates":[]}`. Dialogue can live inside `narration` for this change.
- Extend provider configuration to read optional generation settings from environment variables. Implement only settings supported cleanly by the current OpenAI-compatible request body.
- Update `requestSummary`, local debug logs, or `directorCalls` metadata enough to diagnose prompt component and generation-setting behavior without logging secrets or full prompts by default.
- Add optional `rawRequest` or `requestMessages` persistence to `directorCalls` behind an explicit local debug flag. Store the exact `DirectorMessage[]` sent to the provider, not a reconstructed summary.
- Update docs that explain persistence and data-model boundaries if read-only knowledge context or generation settings change the canonical guidance.

## Alternatives Considered

- Prompt-only wording change:
  - Why not: It may improve tone, but it leaves hidden knowledge unavailable and gives tests less structure to verify.
- Add RNG reaction checks now:
  - Why not: The current failure happens before randomness is needed. Direct NPC questions should produce a meaningful authored response without rolling to decide whether the story functions.
- Add a dialogue-specific output schema:
  - Why not: It adds parsing/persistence surface before there is evidence that narration-with-dialogue is insufficient.
- Fine-tune a model:
  - Why not: The product does not yet have stable target behavior, fixtures, or enough examples to justify fine-tuning.
- Add a settings UI:
  - Why not: Dev-level config is enough for MVP playtesting and keeps UI scope focused on the story loop.
- Always store raw requests:
  - Why not: Raw requests can contain hidden NPC knowledge, debug prompt guidance, and player text. They are highly useful during local playtesting, but they should be opt-in diagnostics rather than default canonical state.

## Why This Approach

This approach fixes the most concrete failure with the least new machinery. The Director gets the knowledge and instructions it needs to write an active scene, while Convex remains the source of truth and the backend still validates all state changes. It also creates testable seams for future work: prompt components, required scene beats, read-only knowledge context, and generation settings can later support richer world-builder controls or RNG layers without being designed as UI features now.

## Implementation Constraints

- Keep backend/application logic out of React components.
- Do not expand LLM mutation authority beyond the current MVP bounded fields.
- Do not log secrets, API keys, full env dumps, or full prompts by default.
- Do not persist exact provider request messages unless the explicit local raw-request debug flag is enabled.
- Keep local model support provider-agnostic through the existing OpenAI-compatible adapter.
- Keep prompt and context fixtures deterministic enough for focused tests.
- Preserve existing rough reset and scoped-turn behavior.

## Verification Strategy

- Unit-test prompt construction for explicit components, bounded recent feed, hidden knowledge inclusion, and absence of turn/command IDs.
- Unit-test required scene-beat derivation for direct NPC questions and non-dialogue actions.
- Unit-test provider generation settings parsing and request-body inclusion with safe defaults.
- Unit-test raw request storage gating so exact provider messages are persisted only when enabled and omitted by default.
- Unit-test output validation to prove read-only facts are not accepted as mutable `npcUpdates`.
- Run `npm run test`, `npm run lint`, `npm run build`, and Convex validation/codegen appropriate to changed files.
- Manually playtest a seeded Mira scene with local Ollama: "I ask Mira what she knows about the storm" should produce a meaningful Mira response, while "I jump" should not create durable fact churn unless something actually changes.

## Decisions

- Keep RNG deferred for this change.
- Keep dialogue inside the existing `narration` field.
- Treat model settings as dev/config-level for now, not player-facing UI.
- Implement only OpenAI-compatible tuning variables for the first pass: `LLM_TEMPERATURE`, `LLM_MAX_TOKENS`, and `LLM_TOP_P`.
- Include all current-scene NPC facts outside `mood`, `status`, and `memory` as read-only hidden knowledge context.
- Persist compact required scene-beat and generation-setting metadata in `directorCalls.requestSummary` through the existing debug path.
- Add debug-panel text guidance sections for prompt tuning before adding model-parameter sliders or a polished settings UI.
- Add opt-in raw provider request persistence for local troubleshooting, likely via `LORECRAFT_DEBUG_STORE_RAW_REQUEST=1`.

## Risks / Trade-Offs

- Stronger prompt guidance can make the Director over-talkative if required scene beats are too broad.
- Including more hidden facts can reveal information too eagerly unless the prompt distinguishes "use as guidance" from "tell the player everything."
- Local small models may still underperform even with better guidance; tests should verify request shape and playtests should verify observed behavior.
- Additional generation knobs can create confusing local behavior if defaults are not documented and logged clearly.
- Raw request storage improves troubleshooting but can duplicate hidden knowledge and private player text; keep it opt-in, local/debug-oriented, and excluded from canonical game-state semantics.
