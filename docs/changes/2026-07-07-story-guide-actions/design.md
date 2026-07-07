# Design: Story And Guide Actions

## Context

Lorecraft's current play loop distinguishes three categories of player activity:

- `Act` and `Pass` are resolving turn triggers. They call the Game Master, create turn records, can produce narration, and may run bounded post-narration extraction.
- Slash utilities such as `/help` and `/look` are pre-turn utility actions. They remain visible on reload but do not create turns, affect turn numbering, run extraction, or enter future Game Master story history.
- Debug edits mutate canonical state directly for local playtesting, but they are not player-facing story actions.

The missing category is player-authored story control. Sometimes the player wants to add a bit of canonical scene prose before the next resolving action. Sometimes the player wants to steer the Game Master privately without turning that steering text into fiction.

This change adds `Story` and `Guide` while preserving the core persistence rule: accepted story history and canonical cards guide the Game Master, but durable state changes still require a resolving Game Master narration and backend validation.

## Goals / Non-Goals

**Goals:**

- Add `Story` as a player-authored canonical story insert.
- Add `Guide` as hidden current-turn steering for the Game Master.
- Keep Story inserts visible, reloadable, and included in future story-visible history.
- Keep Story inserts out of turn numbering, command rows, immediate state extraction, and immediate state diffs.
- Ensure the next Act, Pass, or Guide prompt tells the Game Master that Story inserts are accepted scene content.
- Keep Guide text hidden from the player-facing transcript and excluded from future story-visible history.
- Persist enough debug evidence for Guide turns to troubleshoot what was sent to the Game Master.
- Preserve existing slash utility semantics.

**Non-Goals:**

- Retry/regenerate.
- Rollback, branching, turn supersession, or reversible diffs.
- Immediate state mutation from Story inserts.
- A generalized action-plugin architecture.
- A full AI Dungeon clone of every action mode.
- Combat, stats, inventory, rules, dice, quests, or MUD command expansion.
- Public production auth/rate-limit hardening beyond the existing local prototype guardrails.

## Planning Interview / Story Refinement

- Scope boundary reviewed:
  - This belongs in LC-001 because it changes the player-facing Game Master loop and prompt/context boundaries.
  - It does not require a new Epic because the existing provider-agnostic chat experience owns Act, Pass, story context, and slash utilities.
- User decisions:
  - Story should set scene before the next Act or Pass.
  - State changes should happen later, during a resolving Game Master turn, rather than immediately on Story insertion.
  - The Game Master should know when recent story includes player-authored canonical narration.
  - Guide should be hidden from the transcript and shape Game Master generation.
  - Story and Guide are both in scope for this change.
- Assumptions:
  - The first UI can be simple: action buttons in the existing decision surface, each opening the same compact text surface with different submit semantics.
  - Existing local-first security posture remains acceptable for these local playtest-only routes/mutations.
- Deferred scope:
  - Retry waits for snapshot/rollback or supersession.
  - General action framework waits until more action types prove necessary.
  - Story-insert extraction waits until playtesting shows immediate player-authored state mutation is needed.
  - Relationship, memory-array, timeline, and adjudication objects remain deferred.
- Story boundaries challenged:
  - A UI-only Story would be too narrow because the real product behavior is visibility, turn consumption, persistence, and future prompt inclusion.
  - A new Epic would overstate the scope; Story and Guide extend LC-001's existing action/context model.
  - Story and Guide should be one capability Story because they define the player-authored context boundary together.
- Requirements refined:
  - Story is story-visible but non-turn-ending.
  - Guide is turn-ending but not story-visible as player prose.
  - Future Game Master context must distinguish Game Master narration, player Story inserts, hidden Guide text, commands, utility output, and events.
- Scenario gaps considered:
  - Empty text validation, reload, reset/delete cleanup, prompt inclusion, prompt exclusion, failed Guide provider call, and no immediate state mutation from Story.
- Open questions that block implementation:
  - None. Exact UI feel can be resolved during `/sdd-apply` manual feedback.

## Implementation Refinement

Manual playtesting of Story/Guide turns exposed a related NPC extraction issue inside the existing resolving-turn path: the extractor could overread completed narration and persist stronger facts than the story established, such as upgrading an item slipping into a dropped item or a momentary freeze into durable status.

This stays in scope because Guide turns intentionally use the same bounded extraction path as Act and Pass. The implementation therefore tightens `LC-001-S10` rather than adding a new Story: extraction instructions and backend validation now require direct completed-narration support for durable NPC `mood`, `status`, and `memory` updates, and ignored overreaching proposals remain debug-visible.

## Epic Changes

### Update Epic: LC-001 Provider-Agnostic Chat Experience

- Target Epic: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Change Type: added and modified scope

#### Story Changes

- Added:
  - `LC-001-S14: Pre-Turn Story And Guide Actions`
- Modified:
  - `LC-001-S1: Narrative Play Feed And Unified Input`
  - `LC-001-S6: Scoped Narrative Turns`
  - `LC-001-S7: Active Game Master Guidance And Context Assembly`
  - `LC-001-S13: Pre-Turn Slash Command Utilities`
- Removed:
  - None.

#### Supersedes / Reconciles

- Earlier Story, Requirement, Scenario, or boundary wording this change supersedes:
  - `LC-001-S1/R4` currently describes only Act and Pass as decision controls. It should allow Story and Guide without implying slash-command-first or MUD-style UI.
  - `LC-001-S6/R1` currently says each persisted narrative player intent creates a turn. It should be narrowed so turns are resolving story beats; player Story inserts are persisted narrative prose but not turns.
  - `LC-001-S7/R10` currently says recent story history comes from successful narrations. It should include player-authored Story inserts while continuing to exclude commands, events, utility output, and hidden Guide text.
  - `LC-001-S13/R3` should remain true for utility output and explicitly not apply to Story inserts.
- `Verified By` or `Verification Gaps` entries that must be rewritten or reclassified:
  - Add scenario-mapped evidence for Story visibility/history and Guide prompt/turn behavior.
  - Reclassify broad Act/Pass E2E evidence as supporting, not proof of Story/Guide behavior.
- Closed or active change artifacts likely to need lifecycle/status cleanup:
  - None.
- Manual confirmation status updates expected:
  - Pending Taylor for play feel and visual distinction between Act, Pass, Story, Guide, and utility output.

### Story LC-001-S14: Pre-Turn Story And Guide Actions

As a playtester, I want Story and Guide actions during the decision phase, so that I can add canonical scene setup or privately steer the Game Master without forcing every interaction through Act or Pass.

#### Requirement R1: Story Inserts

The system SHALL let the player add canonical story-visible narration without ending the current turn.

##### Scenario R1-S1: Player records Story setup

- WHEN an Adventure is open
- AND the player chooses Story and submits non-empty text
- THEN the backend records a player-authored Story insert for that Adventure
- AND no turn is created
- AND the turn number does not increment

##### Scenario R1-S2: Story insert is visible and resumable

- WHEN a Story insert is recorded
- AND the player reloads the Adventure
- THEN the story stream shows the Story insert in chronological order
- AND the Story insert is visually distinct from Game Master narration without reading like a utility/debug message

##### Scenario R1-S3: Story insert is future story context

- WHEN the player later uses Act, Pass, or Guide
- THEN the Game Master prompt includes recent player-authored Story inserts in story-visible history
- AND labels or prompt instructions make clear that those inserts are accepted canonical scene content

#### Requirement R2: Story Inserts Do Not Mutate State Immediately

The system SHALL treat Story inserts as canonical prose setup, not as immediate state mutations.

##### Scenario R2-S1: Story insert does not run extraction

- WHEN a Story insert is recorded
- THEN the backend does not call the Game Master provider
- AND it does not run post-narration extraction
- AND it does not record state diffs, actor movement, NPC fact changes, or LLM-authored events from the Story insert alone

##### Scenario R2-S2: Later resolving turns can react to Story setup

- WHEN recent Story inserts set up a situation
- AND the player later uses Act, Pass, or Guide
- THEN the Game Master resolves the current turn in light of the Story setup
- AND any durable state changes still require completed Game Master narration plus existing backend validation

#### Requirement R3: Guide Turns

The system SHALL let the player submit hidden current-turn guidance that produces Game Master narration.

##### Scenario R3-S1: Guide creates a resolving turn

- WHEN an Adventure is open
- AND the player chooses Guide and submits non-empty guidance
- THEN the backend creates a turn with a Guide trigger
- AND the turn calls the Game Master
- AND the turn can succeed or fail through the same terminal turn lifecycle as Act and Pass

##### Scenario R3-S2: Guide text is hidden from the story stream

- WHEN a Guide turn resolves
- THEN the player-facing story stream shows the Game Master narration
- AND it does not show the raw Guide text as a player story entry, utility entry, event, or command
- AND debug surfaces can still inspect that the turn was Guide-triggered

##### Scenario R3-S3: Guide text is current-turn context only

- WHEN the backend builds the Game Master request for a Guide turn
- THEN the request includes the Guide text as hidden current-turn direction
- AND prompt instructions say to follow it as steering, not as already-canonical player action or dialogue
- AND future Game Master story history excludes the raw Guide text after the turn completes

##### Scenario R3-S4: Failed Guide remains debuggable

- WHEN a Guide turn is created and the provider fails or returns invalid output
- THEN the turn remains persisted with failed status
- AND related Game Master call/debug evidence remains linked to the Guide turn
- AND no fake narration or unaccepted state change is stored

#### Requirement R4: Context Category Boundaries

The system SHALL keep each player-facing activity in the correct persistence and prompt category.

##### Scenario R4-S1: Future prompt context includes only story-visible history

- WHEN a future Game Master story-generation request is built
- THEN recent Game Master narration and player Story inserts may appear in story-visible history
- AND prior Act commands, Pass triggers, Guide text, slash utility output, debug records, and event records are excluded from normal story-visible history

##### Scenario R4-S2: Reset and delete clean up Story and Guide records

- WHEN Reset Session or Delete Adventure is invoked
- THEN Story inserts and Guide turns for that Adventure are removed or restored consistently with the rest of Adventure runtime history
- AND source WorldVersions remain unchanged

##### Scenario R4-S3: Transcript mode remains separate

- WHEN transcript mode is enabled
- THEN Story and Guide either remain unsupported with a clear error or receive explicit transcript-mode handling
- AND the implementation does not accidentally mix persistent-mode canonical cards/state mutation into transcript-mode context

#### Implemented By

- `convex/schema.ts` widens narration source and turn trigger contracts and adds `hiddenGuidance` to Guide turns.
- `convex/world.ts` records validated Story inserts and commandless Guide turns, and relies on existing Adventure cleanup paths for reset/delete.
- `src/lib/world/convex-snapshot-read-model.ts` reconstructs Story feed entries, story-visible history, and transcript history from player-source narrations.
- `src/server/director/turn-request.ts` and `src/server/director/turn-route.ts` validate and orchestrate Guide turns while rejecting Guide in transcript mode.
- `src/lib/director/prompt.ts`, `src/lib/director/types.ts`, and `src/lib/director/debug-log.ts` distinguish Story history and hidden Guide steering in request summaries, prompts, extraction prompts, and local debug typing.
- `src/features/play/turn-action-panel.tsx` and `src/features/play/world-client.tsx` render and submit Story/Guide controls while keeping Story visible and Guide hidden from the player-facing stream.
- Focused tests and E2E coverage were added under the existing test locations.

#### Verified By

- Focused automated tests:
  - `src/lib/world/convex-snapshot-read-model.test.ts` covers Story feed/history and transcript-history classification.
  - `src/lib/director/director.test.ts` covers Story prompt labeling, Guide current-turn steering, and extraction omission of raw Guide text.
  - `src/app/api/director/turn/route.test.ts` covers Guide request validation, successful commandless Guide turn orchestration, and transcript-mode Guide rejection.
  - `src/features/play/debug-formatters.test.ts` covers Guide turn summary formatting.
- Deterministic E2E:
  - `npm run e2e` records a Story insert, uses Guide, confirms raw Guide text stays hidden from the story stream, verifies debug evidence, reloads, and deletes the disposable Adventure.
- Broad supporting gates:
  - `npm run ci:required`
  - `npm run convex:once`
- Manual UI confirmation:
  - Pending Taylor for subjective Story/Guide placement, visual treatment, and play feel.

#### Verification Gaps

- Live-provider quality for Guide steering remains empirical; deterministic tests should prove category boundaries, not subjective prose quality.
- Taylor manual UI confirmation remains pending.

## Epic File Rules

- Stories live inside the Epic `epic.md` file.
- Do not create `docs/stories/` or individual Story files.
- Preserve the Epic directory as the future home for supporting artifacts such as mockups, screenshots, research, or design notes.
- Use Epic-local IDs that match existing LC-001 convention.

## Technical Options

### Option 1: Store Story As Player-Source Narration, Store Guide As A Commandless Turn

- Summary: Widen existing `narrations` source/feed handling so Story inserts are narration-like rows with a player-authored source, and widen `turns.trigger` to support `guide` with hidden guidance stored on the turn or linked debug metadata.
- User impact: Story feels like canonical prose; Guide feels like private steering; visible stream remains story-first.
- Implementation complexity: moderate. Reuses the existing feed/history/turn model with targeted widening.
- Reversibility: good. Story rows can later migrate to a `storyInserts` or `timelineEntries` table if needed.
- Client surfaces: web UI now; future mobile can call the same typed capability.
- API / contract shape: Story uses a small persistence mutation or route; Guide extends the turn route contract with trigger `guide` and guidance text.
- Frontend/backend boundary: UI selects action mode; backend owns validation, persistence, prompt category, and turn lifecycle.
- Data / schema impact: widen `narrations.source` and feed kind handling; widen `turns.trigger`; optionally add a capped hidden guidance field to turns.
- Auth / security impact: same local prototype route/mutation guardrails as current Act/Pass/utility paths.
- Testability: high. Focused tests can assert row creation, prompt contents, and absence of turn/extraction side effects.
- Operational risk: low for local MVP if text caps and debug redaction follow existing patterns.
- Fit with project conventions: strongest fit with existing data model and story-visible history policy.

### Option 2: Add A General `actionEntries` Or `timelineEntries` Table

- Summary: Introduce a new generalized action/timeline abstraction that records every visible and hidden player-side activity with visibility and prompt-inclusion flags.
- User impact: no immediate advantage beyond supporting Story/Guide.
- Implementation complexity: high. Requires broader feed reconstruction and likely migration of commands, utility messages, narrations, or derived feed logic.
- Reversibility: lower. It would become a new architecture layer before the current model has failed.
- Client surfaces: could help future multiplayer/branching/streaming, but those are not current needs.
- API / contract shape: larger new backend contract.
- Frontend/backend boundary: potentially cleaner long term but over-broad now.
- Data / schema impact: significant.
- Auth / security impact: more surfaces to secure later.
- Testability: good but broader than necessary.
- Operational risk: medium because it could destabilize existing feed/turn behavior.
- Fit with project conventions: premature; `TimelineEntry` is explicitly deferred in the data model.

### Option 3: Reuse Commands And Utility Messages

- Summary: Store Story as a visible command or utility message and Guide as a hidden command/utility variant.
- User impact: confusing boundaries. Story might read like a player command or utility output instead of canonical prose.
- Implementation complexity: low initially, but likely creates prompt-history exceptions and UI special cases.
- Reversibility: poor because semantics would be wrong from the start.
- Client surfaces: leaks implementation categories into product behavior.
- API / contract shape: unclear.
- Frontend/backend boundary: risks putting visibility decisions in UI filtering.
- Data / schema impact: small but semantically misleading.
- Auth / security impact: unchanged.
- Testability: moderate.
- Operational risk: medium because future Game Master context could accidentally include or exclude the wrong thing.
- Fit with project conventions: weak; commands are turn-ending player input and utilities are explicitly non-story-visible.

## Selected Approach

Use Option 1.

Story inserts should be stored as narration-like Adventure runtime rows with a distinct player-authored source and feed kind. They are visible in the story stream, survive reload, reset/delete with Adventure runtime history, and enter `loadStoryVisibleHistory` with a label that tells the Game Master they are accepted canonical scene content.

Guide should extend the turn path as a commandless resolving trigger. The turn route accepts trigger `guide` with hidden guidance text, creates a pending Guide turn, builds a Game Master prompt where the hidden guidance is the current-turn directive, and stores only the resulting narration in the player-facing story stream. Guide text should remain excluded from future story-visible history, but debug surfaces and local logs should show enough metadata to diagnose Guide turns.

State extraction should not run for Story inserts. State extraction may run after successful Guide narration through the same bounded path as Act and Pass, but the hidden Guide text must not be treated as already-canonical player prose.

## Client And API Boundary

- Current clients:
  - Next.js web UI at `/adventures/<id>`.
- Plausible future clients:
  - Mobile app.
  - Admin/debug tools.
  - Automated playtest scripts.
- Reusable product capabilities:
  - Record player-authored Story insert.
  - Submit resolving Guide turn.
  - Build story-visible history with correct category labels.
  - Reset/delete Adventure runtime rows.
- API or typed contract:
  - Story should use a deliberate backend/Convex capability with input validation, text caps, Adventure ownership, and reset/delete behavior.
  - Guide should extend the existing turn route/body contract with a typed `guide` trigger and hidden guidance text.
- OpenAPI plan, if HTTP-facing:
  - Not required for this local MVP slice; if Story is exposed through an HTTP route, document request/response shape in code tests and docs.
- Backend platform exposed directly to clients?:
  - The existing app already uses Convex client calls for some local mutations. If Story uses a direct Convex mutation, keep validation and text caps server-side in Convex, not only in React.
- Client-specific presentation or local state:
  - Button layout, input expansion animation, and visual styling.
- Rationale:
  - The durable behavior is category/persistence/prompt handling. UI should only select the action mode and display the result.

## Alternatives Considered

- Generic timeline/action table:
  - Why not: likely useful later for replay, branching, streaming, or multiplayer ordering, but too broad for this slice.
- Reuse commands/utility messages:
  - Why not: conflicts with existing command and utility semantics and increases risk of future prompt confusion.
- Story immediately calls extraction:
  - Why not: violates the user's desired flow. Story sets the scene; the next resolving turn handles consequences.
- Guide as debug prompt guidance only:
  - Why not: debug prompt guidance is developer-tunable global-ish instruction, while Guide is a player action for one resolving beat.

## Why This Approach

This approach adds the smallest new capability that matches the product feel. It keeps Story close to narration because the player is authoring canonical prose. It keeps Guide close to turns because it asks the Game Master to produce a new story beat. It avoids introducing a generalized timeline architecture before the existing derived feed model breaks.

## ADRs

- Required: no
- ADR path: not applicable
- Decision summary: The change extends existing LC-001 turn/context boundaries rather than creating a new cross-cutting architecture decision.
- Reconsider when:
  - A third or fourth non-turn/non-utility action requires more visibility/prompt inclusion states.
  - Multiplayer, streaming, branching, or rollback needs a first-class timeline/action table.
  - Story inserts need immediate state extraction or edit/delete behavior.

## Implementation Constraints

- Preserve exact existing Act, Pass, `/help`, and `/look` behavior unless a test proves an unavoidable overlap.
- Keep Story text capped and validated server-side.
- Keep Guide text capped and validated server-side.
- Do not include raw Guide text in player-facing story entries.
- Do not include raw Guide text in future story-visible history after its turn resolves.
- Label player-authored Story inserts in the Game Master prompt so the model treats them as accepted scene content rather than as player commands.
- Keep local debug logs and raw request storage gated according to existing debug flags.
- Do not expand transcript mode accidentally; either reject Story/Guide there clearly or implement explicit transcript behavior.
- Keep React presentation separate from durable category rules.

## Verification Strategy

- Focused automated tests:
  - Story insert persistence, reload snapshot inclusion, no turn creation, no extraction, and story-visible history inclusion.
  - Guide request validation, prompt construction, commandless turn persistence, success/failure lifecycle, and future prompt exclusion.
  - Reset/delete cleanup of Story inserts and Guide turns.
- Broad supporting gates:
  - `npm run ci:required`
  - `npm run convex:once`
- Deterministic E2E:
  - Add Story, reload, use Pass or Act, confirm turn numbering and feed/context behavior.
  - Use Guide, confirm hidden guide text does not appear and resulting narration does.
- Live-provider or external-service playtests:
  - Optional local playtest to assess whether Guide actually improves steering quality with the current model.
- Manual UI confirmation:
  - Taylor confirms Story and Guide are understandable, not too dashboard-like, and preserve the story-first feel.
- Debug/log inspection:
  - Confirm Guide turns are inspectable enough in debug panel/local logs without leaking raw Guide text into the player transcript.

## Decisions

- Story is canonical story-visible prose, but not a turn.
- Guide is a hidden, commandless, resolving turn trigger.
- Story inserts do not call the provider or extractor.
- Guide uses the existing Game Master story-generation and post-narration extraction lifecycle.
- No ADR is required for this slice.

## Risks / Trade-Offs

- Storing Story as narration-like data is pragmatic but may need migration if future editing, authorship, or timeline needs grow.
- Guide text is intentionally hidden from the story, which is good for player-facing flow but means debug surfaces must be good enough for troubleshooting.
- Player-authored Story inserts could smuggle in fiction that contradicts canonical cards. The prompt must make canonical cards higher priority when there is conflict, and state mutation still waits for validated extraction.
- Adding more buttons can make the decision surface feel more complex. Manual UI confirmation should focus on whether Story/Guide are useful enough to justify the extra surface area.
