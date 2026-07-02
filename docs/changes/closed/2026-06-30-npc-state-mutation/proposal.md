# Proposal: NPC State Mutation

## Why

Lorecraft has proven two useful halves of the current loop separately. Persistent mode can ground story generation in canonical NPC Cards, and the current prose-first Game Master response produces better story output than the older JSON-with-narration contract. What is missing is the state-first payoff: when the story meaningfully changes an NPC, the world should remember that change after recent transcript context falls away.

Earlier playtests also showed why the first mutation attempt was too eager. The storyteller should not be asked to write good prose and decide durable state in the same JSON response. Brief gestures, hesitation, a stumble, or ordinary dialogue should usually stay in narration. Durable state should be updated only through a bounded backend-controlled extraction step.

## What Changes

Persistent mode will reintroduce NPC characteristic mutation as a separate post-narration extraction pass:

- The main Game Master call remains plain prose and writes the player-facing narration.
- After successful narration, the backend runs a structured NPC-state extractor using the player input, narration, current-scene NPC Cards, and bounded recent story.
- The extractor may propose updates only for current-scene NPC `mood`, `status`, and `memory`.
- The backend validates proposed updates, persists accepted facts, records state diffs, and records ignored updates for debug inspection.
- Transcript mode remains no-mutation.

## Epic Actions

### New Epic Directories

- None proposed.

### Existing Epic Directory Updates

- Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.

## Epic Story Changes

- Added: `LC-001-S10: Extracted NPC State Mutation`
- Modified: `LC-001-S3: Persistent Current-Scene NPC State` to reflect the post-narration extractor as the current mutation path instead of story-prose JSON.
- Modified: `LC-001-S7: Active Game Master Guidance And Context Assembly` to remove stale read-only persistence wording from persistent-mode prompt guidance where appropriate.
- Modified: `LC-001-S9: Read-Only NPC Context` to clarify that NPC Cards remain readable canonical context, while persistent-mode mutation is now allowed only through the separate extractor.
- Removed: none.

## Change Folder

- Active location: `docs/changes/2026-06-30-npc-state-mutation/`
- Closed location: `docs/changes/closed/2026-06-30-npc-state-mutation/`

## Impact

- Product: NPCs can again remember meaningful changes in persistent mode without turning Lorecraft into a command parser, simulation engine, or MUD.
- Code: The Game Master route, prompt/output modules, Convex persistence path, debug logs, tests, and docs will need updates.
- Tests: Focused deterministic tests should cover extractor prompt shape, validation, no-update cases, accepted updates, ignored fields, transcript no-mutation behavior, and debug evidence.
- Docs: `docs/data-model.md`, `docs/persistence-system.md`, README, and Epic truth should be updated to describe the extractor-based mutation model.

## Changelog Impact

- Required: yes
- Category: Added
- Public summary: Add persistent-mode NPC state extraction so current-scene NPC `mood`, `status`, and `memory` can be updated after story turns through a bounded validated backend path.

## Questions And Readiness

### Blocking Questions

- None.

### Implementation-Discovery Questions

- Extractor call recording:
  - Default path: record the story call and NPC extraction call as separate `directorCalls` rows tied to the same turn, distinguished through `requestSummary.callRole`.
  - Evidence needed: tests and debug output show both calls are inspectable by turn.
  - Replan trigger: if `directorCalls` cannot represent multi-call turns clearly without a schema-level `callRole` or a dedicated extraction-call table.
- Extractor failure semantics:
  - Default path: if narration succeeds but extraction fails or returns invalid JSON, keep the story turn succeeded, persist no NPC updates, and record the extraction failure in debug evidence.
  - Evidence needed: tests prove failed extraction does not erase narration, fake state, or mark the story turn failed.
  - Replan trigger: if playtesting shows failed extraction should block or visibly fail the whole turn.
- Local model JSON reliability:
  - Default path: use the existing OpenAI-compatible provider adapter with JSON output guidance and strict validation; malformed output produces no mutations.
  - Evidence needed: deterministic tests plus local logs from at least one playtest turn.
  - Replan trigger: if local models cannot reliably return extractor JSON even with bounded prompts, requiring separate model routing, retries, or a more deterministic extractor.

### Deferred Scope

- Mutating `description`, `background`, `persona`, `voice`, `knowledge`, relationships, locations, object state, room state, exits, inventory, combat, stats, schedules, or offscreen consequences.
- Dedicated `npcs`, `npcMemories`, `relationships`, `actorAppearance`, or `npcBehaviorProfiles` tables.
- Multi-model routing where a stronger creative model writes prose and a smaller/different model extracts state.
- Rollback snapshots, branching timelines, or state restore UI.
- Hidden TTRPG adjudication, dice, or rule checks.

## Apply Readiness

- Status: ready
- Reason: The only blocking scope question has been answered. This change should mutate only `mood`, `status`, and `memory` for current-scene NPCs, using a separate validated extractor after prose generation.
