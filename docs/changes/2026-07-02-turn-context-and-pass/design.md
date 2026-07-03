# Design: Turn Context And Pass

## Context

Lorecraft currently stores player commands, Game Master narrations, events, state diffs, turns, and Game Master calls as separate Adventure-scoped objects. The player-facing feed is reconstructed from commands, narrations, and events. Persistent Game Master prompts currently receive a bounded recent feed assembled from those same record types, while canonical state arrives separately through Location Cards, NPC Cards, known locations, facts, and actor location.

That creates a useful debug trail, but it also makes future prompt context more chat-like than story-like. Prior raw player commands and event summaries can become part of the next prompt even when the accepted story record is the Game Master's narration. The new framing is:

- A turn is a resolved story beat.
- The Game Master asks "What do you do?" implicitly by opening the next decision point.
- The player may click `Act` to open the text input, or click `Pass` to yield the beat.
- The Game Master resolves the beat into narration and any validated consequences.
- Future story context should continue from accepted narration blocks plus canonical state.

## Goals / Non-Goals

**Goals:**

- Add `Pass` as a dedicated player-facing control.
- Add `Act` as the player-facing way to open the narrative input.
- Treat Pass as a turn trigger, not player prose.
- Keep Pass out of the visible story stream as a player entry.
- Let Pass turns produce Game Master narration and bounded validated consequences.
- Change future Game Master story context to use canonical state plus recent successful narration blocks plus the current committed action or pass directive.
- Apply the same story-visible history policy to the post-narration extractor.
- Keep commands, events, state diffs, Game Master calls, and local logs inspectable in debug surfaces.

**Non-Goals:**

- Retry/regenerate.
- Snapshots, rollback, reversible diffs, branching, or turn supersession.
- Multiplayer pass ordering.
- Moving events out of the player-facing stream.
- Replacing the existing route/Convex orchestration boundary.
- Adding slash commands, action mode tabs, dice, combat, inventory, or broader rules.

## Planning Interview / Story Refinement

- Scope boundary reviewed: turn framing, future GM context policy, and Pass behavior are in scope; Retry and rollback are deferred.
- User decisions:
  - Use a button for Pass.
  - Label the button `Pass`, not Continue.
  - Label the action button `Act`; clicking it expands into the text input and hides sibling turn buttons while typing.
  - Do not show Pass as a visible player story entry.
  - Leave events visible to the player/debug UI for now, but exclude them from future GM prompt context.
  - Switch the extractor to the same filtered story-visible history.
  - Allow Pass to cause validated state changes if the narration clearly changes durable state.
  - Do not create a command record for Pass in the target model.
  - Update LC-001 instead of creating a new Epic.
- Assumptions:
  - The current MVP can keep one synchronous resolution path for both Act and Pass triggers.
  - Existing turns can be widened to represent commandless Pass beats without changing the public route shape more than necessary.
  - Existing debug surfaces can display Pass through turn metadata rather than story feed text.
- Deferred scope:
  - Retry requires snapshots, reversible diffs, or supersession.
  - Events may later move to debug-only UI.
  - Future turn interactions such as drafts, inspections, meta questions, and action preparation are not implemented in this slice.
- Story boundaries challenged:
  - A new Epic would overstate the scope; this is part of the existing LC-001 Game Master loop.
  - A separate UI Story solely for a Pass button would fragment behavior; Pass affects feed, turn lifecycle, and context assembly together.
  - Story-visible history belongs in the Game Master context Story, not as a generic feed redesign.
- Requirements refined:
  - Turn triggers must be explicit enough to distinguish `act` from `pass`.
  - Pass must not create fake player prose.
  - Prompt context must distinguish story-visible history from debug/audit history.
- Scenario gaps considered:
  - Pass with no existing narration should still produce a coherent opening continuation from canonical seed state.
  - Pass failures should be debuggable like action-turn failures.
  - Prior events and commands should remain visible where currently visible but absent from future prompt context.
- Open questions that block implementation:
  - None. Implementation may choose the smallest schema/API widening that preserves the target model.

## Epic Changes

### Update Epic: LC-001 Provider-Agnostic Chat Experience

- Target Epic: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Change Type: modified scope

#### Story Changes

- Added:
  - No new Story labels proposed.
- Modified:
  - `LC-001-S1` Narrative Play Feed And Unified Input
  - `LC-001-S6` Scoped Narrative Turns
  - `LC-001-S7` Active Game Master Guidance And Context Assembly
- Removed:
  - No Story scope removed. Some current wording that says future feed/context is reconstructed from commands, narrations, and events will be narrowed to distinguish player-facing feed from GM story context.

#### Supersedes / Reconciles

- Earlier Story, Requirement, Scenario, or boundary wording this change supersedes:
  - `LC-001-S1/R2` currently treats commands, narrations, and events as the visible feed. That can remain true for player display, but must not imply all three are future GM story context.
  - `LC-001-S6/R1` currently says turns exist for each persisted narrative player intent. It must be widened so Pass can create a turn without player prose.
  - `LC-001-S7/R1` currently refers to recent feed as a prompt component. It must become story-visible history.
- `Verified By` or `Verification Gaps` entries that must be rewritten or reclassified:
  - LC-001 evidence that uses "recent feed" should distinguish story-generation context from player-facing/debug feed.
  - LC-001 evidence for turn lifecycle should include Pass with no command.
- Closed or active change artifacts likely to need lifecycle/status cleanup:
  - None required beyond this change's own artifacts.
- Manual confirmation status updates expected:
  - Pending Taylor after implementation because Pass is browser-visible.

#### Story LC-001-S1: Narrative Play Feed And Unified Input

As a playtester, I want a simple decision surface with Act and Pass, so that I can either open the narrative input or let the Game Master continue without turning the interface into a command parser.

##### Requirement R4: Pass Control

The system SHALL provide dedicated Act and Pass controls at the decision point.

###### Scenario R4-S0: Player opens the action input

- WHEN an Adventure is open
- THEN the system shows `What do you do?` above the `Act` and `Pass` controls
- WHEN the player clicks `Act`
- THEN the system replaces the controls with the narrative input
- AND the player can submit a normal action

###### Scenario R4-S1: Player passes the turn

- WHEN an Adventure is open
- AND the player clicks `Pass`
- THEN the system starts a turn with a Pass trigger
- AND the player is not required to type anything into the narrative input

###### Scenario R4-S2: Pass is not story prose

- WHEN a Pass turn resolves
- THEN the main story stream shows the Game Master narration
- AND it does not show a player-side `Pass` message as story content
- AND turn/debug metadata still makes the Pass trigger inspectable

##### Implemented By

| Path | Role | Recheck Trigger |
|---|---|---|
| `src/app/world-client.tsx` | renders the Act/Pass decision surface, expands Act into narrative input, submits Pass without narrative input, keeps Pass out of player-side story prose, and exposes trigger metadata in debug summaries. | Recheck when this Story changes or the listed path changes. |
| `src/app/api/director/turn/route.ts` | accepts `act` and `pass` trigger requests and routes Pass through the commandless turn path. | Recheck when this Story changes or the listed path changes. |
| `convex/world.ts` | stores Pass as a turn trigger without creating a command row. | Recheck when this Story changes or the listed path changes. |

##### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| LC-001-S1/R4-S0 through R4-S2 | `npm run e2e` and `src/app/api/director/turn/route.test.ts` | prove the browser opens action input through Act, clicking Pass starts a commandless turn, returns Game Master narration, and does not render/store player-side Pass prose. | Passed |

##### Verification Gaps

- Manual UI confirmation remains pending Taylor.

#### Story LC-001-S6: Scoped Narrative Turns

As a developer-playtester, I want each resolved story beat to be stored as a scoped turn with an explicit trigger, so that action turns, Pass turns, debug records, and future rollback boundaries have one durable unit of progression.

##### Requirement R4: Turn Triggers

The system SHALL distinguish how a turn was triggered.

###### Scenario R4-S1: Action turn uses committed player input

- WHEN the player submits narrative text
- THEN the system records an action turn
- AND the turn links to the command record for that committed input
- AND the Game Master resolves that input first

###### Scenario R4-S2: Pass turn has no command

- WHEN the player clicks Pass
- THEN the system records a Pass turn
- AND the turn does not create a command record in the target model
- AND the turn can still link Game Master calls, narration, accepted state diffs, events, and failure state

###### Scenario R4-S3: Pass failure is debuggable

- WHEN a Pass turn is created and the provider fails or returns invalid output
- THEN the turn remains persisted with failed status
- AND related Game Master call/debug evidence remains linked to the Pass turn
- AND no fake narration or unaccepted state change is stored

##### Requirement R5: Retry Remains Deferred

The system SHALL NOT implement Retry until the app has a safe snapshot, reversible-diff, or supersession mechanism.

###### Scenario R5-S1: Retry is not exposed as a player control

- WHEN this change is implemented
- THEN the player does not see a Retry/regenerate control
- AND docs record Retry as deferred because it can otherwise desynchronize narration and canonical state

##### Implemented By

| Path | Role | Recheck Trigger |
|---|---|---|
| `convex/schema.ts` | defines optional `turns.trigger` for `act` and `pass` turns. | Recheck when this Story changes or the listed path changes. |
| `convex/world.ts` | creates action and Pass turns, validates pending turn completion/extraction by trigger and command shape, and keeps Retry/snapshot behavior out of scope. | Recheck when this Story changes or the listed path changes. |
| `src/app/api/director/turn/route.ts` | records action turns with command input, Pass turns without commands, and failed Pass attempts with linked debug evidence. | Recheck when this Story changes or the listed path changes. |
| `src/app/world-client.tsx` | exposes Pass but no Retry/regenerate control. | Recheck when this Story changes or the listed path changes. |

##### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| LC-001-S6/R4-S1 | `src/app/api/director/turn/route.test.ts` and `npm run e2e` | prove action turns still create commands and resolve current input. | Passed |
| LC-001-S6/R4-S2 | `src/app/api/director/turn/route.test.ts`, `npm run e2e`, and source inspection of `convex/world.ts` | prove Pass turns complete without command ids and the target model creates no command row for Pass. | Passed |
| LC-001-S6/R4-S3 | `src/app/api/director/turn/route.test.ts` | proves provider-failed Pass turns are completed as failed without fake narration/state. | Passed |
| LC-001-S6/R5-S1 | Source inspection of `src/app/world-client.tsx`, `docs/data-model.md`, and `docs/persistence-system.md` | proves Retry remains deferred and no Retry control is exposed. | Passed |

##### Verification Gaps

- Browser-level failed-Pass display is covered indirectly through the existing failed-turn flow, not by a dedicated failed-Pass E2E.

#### Story LC-001-S7: Active Game Master Guidance And Context Assembly

As a playtester, I want the Game Master to continue from accepted story prose and canonical state, so that future narration feels like a story instead of a confused chat transcript.

##### Requirement R10: Story-Visible History

The system SHALL build future Game Master story context from story-visible history rather than raw feed history.

###### Scenario R10-S1: Prior commands are excluded from future story context

- WHEN the backend builds a Game Master story-generation request after prior successful turns
- THEN prior player commands are not included in the recent story/history section
- AND the current committed action, if present, is included separately as the current turn input

###### Scenario R10-S2: Prior events are excluded from future story context

- WHEN the backend builds a Game Master story-generation request
- THEN prior event records are not included in the recent story/history section
- AND event records remain available to existing player/debug surfaces for now

###### Scenario R10-S3: Prior successful narrations are included

- WHEN the backend builds a Game Master story-generation request
- THEN recent successful Game Master narrations are included as story-visible history
- AND canonical Location Cards, NPC Cards, facts, actor locations, objects, and known locations remain available as current truth

##### Requirement R11: Pass Prompt Context

The system SHALL give the Game Master an explicit Pass directive when the player passes.

###### Scenario R11-S1: Pass continues the scene

- WHEN the player clicks Pass
- THEN the Game Master request includes canonical state and recent successful narrations
- AND the current turn directive tells the Game Master to continue the scene without a new player action

###### Scenario R11-S2: Pass can produce bounded consequences

- WHEN a Pass narration clearly changes durable state that the MVP currently allows
- THEN the extractor may propose bounded NPC updates or actor moves
- AND Convex validates those proposals with the same rules used for action turns

##### Requirement R12: Extractor Uses The Same History Policy

The system SHALL use the same story-visible history policy for state extraction that it uses for story generation.

###### Scenario R12-S1: Extractor excludes prior commands and events

- WHEN the post-narration extractor request is built
- THEN prior player commands and events are not included as recent story context
- AND current committed action and current Game Master narration remain available to the extractor

###### Scenario R12-S2: Extractor remains grounded in canonical state

- WHEN the extractor evaluates a possible state change
- THEN it uses canonical current state plus recent successful narrations
- AND accepted mutations still require backend validation before they become canonical

##### Implemented By

| Path | Role | Recheck Trigger |
|---|---|---|
| `convex/world.ts` | returns `storyVisibleHistory` from seed/successful narrations while preserving the broader debug/feed surface. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/prompt.ts` | builds story and extraction prompts from canonical state plus story-visible narration history, with a Pass directive instead of player prose for Pass turns. | Recheck when this Story changes or the listed path changes. |
| `src/lib/director/types.ts` | defines `TurnTrigger`, Pass scene beat metadata, and request-summary fields. | Recheck when this Story changes or the listed path changes. |
| `scripts/llm-fixture-server.mjs` | provides deterministic fixture behavior for Pass and updated prompt structure. | Recheck when this Story changes or the listed path changes. |

##### Verified By

| Requirement / Scenario | Evidence | Proves | Status |
|---|---|---|---|
| LC-001-S7/R10-S1 through R10-S3 | `src/lib/director/director.test.ts` | prove persistent story prompts include successful narration history while excluding prior commands and events from Recent Story. | Passed |
| LC-001-S7/R11-S1 | `src/lib/director/director.test.ts` | proves Pass prompts include a continue directive without fake player prose. | Passed |
| LC-001-S7/R11-S2 | `src/app/api/director/turn/route.test.ts` and `npm run e2e` | prove Pass resolves through the same route/extractor pipeline and can produce narration without player prose. | Passed |
| LC-001-S7/R12-S1 and R12-S2 | `src/lib/director/director.test.ts` | prove extraction requests use the same filtered narration-history policy while retaining canonical cards/state and current narration. | Passed |

##### Verification Gaps

- Deterministic Pass-specific accepted mutation coverage remains future work; current tests prove the shared route/extractor path for Pass and existing bounded mutation validation separately.

## Epic File Rules

- Stories live inside the Epic `epic.md` file.
- This change modifies existing LC-001 Stories rather than creating a new Epic or new Story directory.
- Preserve existing legacy Story IDs because LC-001 already uses app-wide Story labels.
- Restart new Requirement IDs only where extending each existing Story. The proposed IDs intentionally continue the visible numbering in each Story to avoid conflicting with existing Requirements.

## Technical Options

### Option 1: Filter Existing Feed At Prompt Assembly

- Summary: Keep existing feed loading mostly intact but filter prompt components to include only narration entries for future story history.
- User impact: Immediate reduction in prompt noise and no feed UI redesign.
- Implementation complexity: Low to medium.
- Reversibility: High.
- Client surfaces: Pass button in web UI; no mobile client yet.
- API / contract shape: Route accepts a turn trigger or a separate Pass endpoint/action; Convex turn metadata may need widening.
- Frontend/backend boundary: UI triggers Pass; backend owns turn creation, prompt context, persistence, and validation.
- Data / schema impact: Likely add turn trigger field and allow commandless turns.
- Auth / security impact: Same local-only route guardrails as existing turns.
- Testability: Strong focused prompt tests and route/Convex tests.
- Operational risk: Low.
- Fit with project conventions: Good; preserves existing route/Convex orchestration.

### Option 2: Add A New StoryHistory Projection

- Summary: Create a separate query/projection for story-visible history and use it for story generation, extraction, and later summarization.
- User impact: Same as Option 1.
- Implementation complexity: Medium.
- Reversibility: Medium.
- Client surfaces: Same Pass button.
- API / contract shape: Cleaner domain concept but more new code.
- Frontend/backend boundary: Backend owns projection; UI unaffected except Pass.
- Data / schema impact: May not need schema changes beyond turn trigger, unless materializing story-visible rows.
- Auth / security impact: Same as existing.
- Testability: Good; projection can be tested directly.
- Operational risk: Low to medium.
- Fit with project conventions: Good if projection stays in Convex/domain helpers.

### Option 3: Store Story-Visible Flags On Feed Records

- Summary: Add a visibility field to commands/narrations/events and filter by that.
- User impact: Enables future nuanced visibility.
- Implementation complexity: Medium to high for this slice.
- Reversibility: Medium.
- Client surfaces: No immediate player benefit beyond Pass.
- API / contract shape: More explicit but risks premature generalization.
- Frontend/backend boundary: Backend owns visibility; UI could later consume it.
- Data / schema impact: Adds visibility fields or a new table for multiple row types.
- Auth / security impact: Same as existing.
- Testability: Good but broader than needed.
- Operational risk: Medium due migration/backfill questions.
- Fit with project conventions: Potentially good later, too much for the immediate MVP question.

## Selected Approach

Use Option 1 with a small amount of Option 2 naming discipline: create a clear internal concept of story-visible history, but derive it from existing narration rows rather than adding a new materialized projection or visibility system.

Implementation should:

- Add a Pass button to the play UI.
- Send Pass as an explicit turn trigger to the backend.
- Widen the backend turn flow so a turn can be triggered by `act` with input or `pass` without input.
- Store the trigger on the turn or equivalent debug-visible metadata.
- Keep command records only for committed player action text.
- Build story-generation prompt history from recent successful narration rows, not merged commands/narrations/events.
- Build extractor prompt history from the same narration-only story-visible history plus current input when present and current narration.
- Keep existing player-facing feed reconstruction unless implementation naturally needs a small filter for Pass's absent command.
- Preserve existing event/debug/state-diff records and debug panels.

## Client And API Boundary

- Current clients: Web UI only.
- Plausible future clients: mobile app, CLI/test automation, admin/debug tools.
- Reusable product capabilities:
  - Start an action turn.
  - Start a Pass turn.
  - Build story-visible history for Game Master context.
  - Inspect turn artifacts by trigger/status.
- API or typed contract:
  - The current `/api/director/turn` route can accept a trigger field, or a small sibling route can call the same backend orchestration. Prefer one reusable backend orchestration path.
- OpenAPI plan, if HTTP-facing:
  - No OpenAPI document yet for this local MVP route. Keep TypeScript route/request tests as the contract for now.
- Backend platform exposed directly to clients?:
  - The UI already uses Convex for snapshots/debug mutations and the Next route for Game Master turns. Keep Pass consistent with this boundary.
- Client-specific presentation or local state:
  - Button placement, disabled state, and pending feedback are UI concerns.
- Rationale:
  - Pass and context assembly are durable backend behavior; the web button is just the first client surface.

## Alternatives Considered

- Typed `pass` / `continue` in the input:
  - Why not: it pushes toward command parsing and makes Pass look like story prose.
- Empty submit means Pass:
  - Why not: too easy to trigger accidentally and ambiguous with validation.
- Fake command record with input `Pass`:
  - Why not: it pollutes player-command history and risks leaking Pass into future story context. It may be acceptable only as a temporary implementation bridge if commandless turns are unexpectedly expensive.
- Implement Retry in the same change:
  - Why not: Retry mutates or supersedes an existing turn and can desynchronize narration from canonical state unless snapshots, reversible diffs, or supersession exist.
- Remove events from the player-facing stream now:
  - Why not: useful but separate feed/UI cleanup; current scope is GM context and Pass.

## Why This Approach

This approach directly addresses the prompt-confusion risk while preserving Lorecraft's state-first thesis. The GM continues from polished accepted prose and canonical state, while commands/events/state diffs remain inspectable as audit/debug artifacts. Pass adds a useful game-like turn trigger without introducing command parsing or rollback complexity.

## ADRs

- Required: no
- ADR path: not applicable
- Decision summary: The change is important, but still local to LC-001's existing turn/context model. Retry/snapshot/rollback will likely require an ADR later.
- Reconsider when:
  - Retry/regenerate is implemented.
  - Story-visible history becomes materialized or summarized.
  - Multiplayer turn ordering is introduced.
  - Events become a first-class async story mechanism.

## Implementation Constraints

- Do not include prior commands/events in future story-generation or extraction recent-history prompt sections.
- Do not remove commands/events from persistence or existing debug inspection.
- Do not expose Retry.
- Do not treat Pass as player fiction.
- Preserve existing action-turn behavior for normal submitted input.
- Keep provider requests stateless and locally inspectable.
- Keep local route guardrails and debug raw request gating intact.

## Verification Strategy

- Focused automated tests:
  - Prompt construction excludes prior commands/events and includes recent narrations.
  - Extractor prompt construction uses the same story-visible history policy.
  - Pass route/backend behavior creates a commandless turn and records narration/debug artifacts.
  - Pass failure path persists a failed turn without fake narration/state.
- Broad supporting gates:
  - `npm run ci:required`.
  - Convex codegen/compile check through the project-approved Convex command.
- Deterministic E2E:
  - Browser can click Pass.
  - Story stream receives a GM narration.
  - No player Pass entry appears in the story stream.
  - Debug panel shows a Pass turn.
- Live-provider or external-service playtests:
  - Optional after deterministic checks pass; useful to evaluate whether narration-only context reduces confusion.
- Manual UI confirmation:
  - Pending Taylor after implementation because Pass is visible and story feel is subjective.
- Debug/log inspection:
  - Confirm raw request or persisted debug summary shows story-visible history rather than merged commands/events.

## Decisions

- Use `Pass` as the player-facing label.
- Implement Pass as a button.
- Do not display Pass as story text.
- Exclude prior commands/events from future Game Master context.
- Switch extractor to the same filtered history policy.
- Allow Pass to produce bounded state consequences.
- Target no command record for Pass.
- Update LC-001 rather than creating a new Epic.

## Risks / Trade-Offs

- Narration quality matters more: if the GM fails to incorporate a player action into narration, future prompt context may not include the raw command. Canonical state should capture anything that matters long-term.
- Existing tests and docs may assume `recentFeed` means commands/narrations/events; those need careful reconciliation.
- Commandless turns may reveal hidden assumptions in current Convex functions or UI debug rendering.
- Pass could make the GM over-advance the scene if prompt guidance is too broad; fixture tests and manual playtests should validate tone and pacing.
