# Proposal: Active Director Guidance

## Why

The current MVP proves that Lorecraft can persist player inputs, Director narrations, NPC fact updates, debug records, and scoped turns. Playtesting now shows a different problem: the Director is too passive. When the player directly asks Mira about the storm, the response describes Mira looking thoughtful or hesitant instead of letting her speak, refuse, deflect, ask a follow-up, reveal a clue, or otherwise advance the scene.

The current prompt is also schema-first. It explains strict JSON and allowed NPC updates, but it does not clearly define the Director's storytelling job. It filters actor facts down to mutable NPC state, so seeded read-only knowledge such as `knows_about_storm` can exist in Convex without reaching the LLM. Provider generation settings are hard-coded, which makes local model playtesting harder to tune.

The current debug record persists the raw provider response but not the exact request messages sent to the provider. That makes prompt-context failures harder to diagnose: the debug panel can show compact summaries, but not whether the model actually received the expected guidance, recent feed, scene beat, or hidden knowledge.

This change should make the Director actively write a story while preserving the state-first model: Convex remains canonical truth, the LLM narrates and proposes bounded changes, and durable state updates remain conservative.

## What Changes

- Split the Director prompt into explicit context components: Director instructions, scene state, visible facts, hidden NPC knowledge, recent feed, player input, and engine-derived required scene beat.
- Add a lightweight scene-beat derivation step so direct NPC address, especially questions, tells the Director that a meaningful NPC response is expected.
- Include read-only NPC/world knowledge facts in Director context without expanding the LLM's mutation authority beyond the current mutable NPC fields.
- Strengthen Director instructions so NPCs can speak, deflect, refuse, warn, ask back, or visibly choose silence instead of merely being described as passive.
- Add dev/config-level LLM generation settings for local playtesting, such as response length and sampling controls, without adding a polished player-facing settings UI.
- Add debug-panel text guidance sections for style, NPC behavior, and persistence prompt tuning, inspired by AI Dungeon-style prompt guidance rather than model-parameter sliders.
- Add debug-gated raw Director request persistence so local playtesting can inspect the exact provider messages alongside the raw provider response.
- Add focused tests and playtest fixtures that prove asking Mira about the storm produces a meaningful scene beat and that ephemeral reactions do not force durable fact churn.

## Epic Actions

### New Epic Directories

- None proposed.

### Existing Epic Directory Updates

- Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.

## Epic Story Changes

- Add Story `LC-001-S7: Active Director Guidance And Context Assembly` to the existing Provider-Agnostic Chat Experience Epic.
- Preserve existing Stories `LC-001-S1` through `LC-001-S6`.
- Update existing `Implemented By`, `Verified By`, and `Verification Gaps` maps only as needed after implementation.

## Change Folder

- Active location: `docs/changes/2026-06-27-active-director-guidance/`
- Closed location: `docs/changes/closed/2026-06-27-active-director-guidance/`

## Impact

- Product: The play surface should feel more like an unfolding story, with direct NPC interactions producing meaningful narrative responses instead of passive description.
- Code: Expected changes are mainly in Director prompt/context construction, provider configuration, tests, debug payload shape, and optional raw request persistence.
- Tests: Focused Director tests should cover context components, read-only knowledge inclusion, required scene-beat derivation, prompt instructions, configurable provider options, and debug-gated raw request storage.
- Docs: Update Epic, `docs/persistence-system.md`, `docs/data-model.md`, README if new environment variables are added, and this change ledger during implementation.

## Changelog Impact

- Required: yes.
- Category: Changed.
- Public summary: Improved Director guidance and context assembly so NPCs can respond more actively while preserving bounded persistent-state updates.

## Decisions Resolved During Apply

- Implement only the OpenAI-compatible generation subset needed for local playtesting: `LLM_TEMPERATURE`, `LLM_MAX_TOKENS`, and `LLM_TOP_P`.
- Store compact required scene-beat metadata in `directorCalls.requestSummary` and local debug records through the existing request-summary path.
- Include current-scene NPC facts outside `mood`, `status`, and `memory` as read-only hidden knowledge context for the MVP.
- Add text-only prompt guidance controls in the debug panel; leave model-parameter sliders and a polished settings UI deferred.
- Store exact Director provider request messages only when explicitly enabled with a local debug flag such as `LORECRAFT_DEBUG_STORE_RAW_REQUEST=1`.

## Deferred Scope

- No TTRPG-inspired RNG implementation in this change. RNG research can inform a later design, but this change should first fix the deterministic prompt/context contract.
- No fine-tuned model work.
- No polished player-facing model settings UI.
- No world-builder UI for editing prompt components.
- No model-parameter slider UI in this change.
- No always-on raw prompt storage; raw request persistence is local/debug-gated because it can include hidden world facts and player text.
- No slash commands, combat, inventory, relationship graph, story instances, rollback, or autonomous offscreen NPC behavior.
