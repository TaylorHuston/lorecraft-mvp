# Design: Scoped Turns

## Context

Lorecraft currently persists player input in `commands`, Director prose in `narrations`, concise happenings in `events`, accepted mutations in `stateDiffs`, and provider/debug details in `directorCalls`. These rows are tied together by optional `commandId`, and the visible feed is derived from commands, narrations, and events.

That model proved the first persistence loop, but `commandId` is doing two jobs: storing the player's text and standing in for the larger turn. The next persistence step should promote the turn boundary into a first-class object while keeping the current single-world MVP simple.

## Goals / Non-Goals

**Goals:**

- Add explicit scoped turns for the existing narrative Director workflow.
- Preserve the current story stream behavior while making turn grouping available to backend queries and debug UI.
- Persist failed provider/output attempts that happen after a turn is created.
- Keep future snapshot/rollback attachment points clear without implementing rollback.
- Update canonical persistence and data-model docs.

**Non-Goals:**

- No rollback UI.
- No restore-to-turn mutation.
- No snapshot table or full world-state snapshot capture yet.
- No branching timeline.
- No story instance/campaign copy model.
- No multiplayer turn arbitration.
- No new command parser or room movement semantics.

## Epic Changes

### Update Epic: Provider-Agnostic Chat Experience

- Target Epic: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Change Type: added scope

#### Story Changes

- Added: `LC-001-S6: Scoped Narrative Turns`
- Modified: none proposed beyond cross-references in existing Implemented By / Verified By maps if implementation changes current files.
- Removed: none.

#### Story LC-001-S6: Scoped Narrative Turns

As a developer-playtester, I want each narrative exchange to be stored as a scoped turn, so that story history, debug records, and future rollback boundaries have one durable unit of progression.

##### R1: Turn Lifecycle

The system SHALL create a durable turn for each persisted narrative player intent.

###### Scenario R1-S1: Successful narrative turn

- WHEN the player submits valid narrative input for a seeded world
- THEN the backend creates a turn with a world-scoped sequence number
- AND the turn links the player input, Director call, narration, accepted state diffs, and events caused by that input
- AND the turn ends with a succeeded status after persistence completes

###### Scenario R1-S2: Provider or output failure after turn creation

- WHEN a turn is created and the provider call fails or returns invalid output
- THEN the turn remains persisted with a failed status
- AND the related command and Director call remain linked to the turn for debug inspection
- AND no fake narration or unaccepted state change is stored

###### Scenario R1-S3: Request rejected before persistence

- WHEN a request is malformed, missing required configuration, or references an invalid world before game persistence starts
- THEN no turn is created
- AND the route returns the existing structured setup or validation error

##### R2: Turn-Scoped Feed And Debug Records

The system SHALL expose turn scope in persisted history without making the player-facing story stream more complicated.

###### Scenario R2-S1: Feed entries carry turn scope

- WHEN the UI loads a persisted story feed
- THEN entries caused by a player input include the same `turnId`
- AND the visible story stream remains ordered by persisted creation time or turn sequence

###### Scenario R2-S2: Debug panel can inspect turn grouping

- WHEN a playtester opens the debug panel
- THEN recent turns show sequence, status, player input, related narration/event/diff counts, and related Director call status
- AND failed turns can be distinguished from successful turns after reload

###### Scenario R2-S3: Seed rows remain outside player turns

- WHEN the world is seeded
- THEN seed narration and seed events may remain unscoped
- AND narrative turns still begin with the first persisted player intent

##### R3: Reset And Future Rollback Boundary

The system SHALL keep turn persistence compatible with rough reset now and snapshot/rollback later.

###### Scenario R3-S1: Rough reset clears turn history

- WHEN the existing rough reset is invoked
- THEN persisted turns and turn-linked history for the playtest world are cleared with commands, narrations, events, state diffs, and Director calls
- AND seeded world graph rows and baseline facts are restored as they are today

###### Scenario R3-S2: State diffs remain tied to one turn

- WHEN accepted mutations are recorded
- THEN each state diff belongs to the turn that accepted those mutations
- AND the diff remains an audit record rather than a rollback implementation by itself

###### Scenario R3-S3: Snapshot rollback remains deferred

- WHEN the data model is documented
- THEN it states that future rollback should attach snapshots to turn boundaries
- AND this change does not add snapshot capture, reverse-diff logic, branching, or restore behavior

##### Implemented By

- `convex/schema.ts` adds `turns` and optional `turnId` fields on commands, narrations, events, state diffs, and Director calls.
- `convex/world.ts` creates pending turns with world-scoped sequence numbers, completes turns as succeeded or failed, includes `turnId` in feed entries, exposes recent turn summaries from `getSnapshot`, and clears turns during rough reset.
- `src/app/api/director/turn/route.ts` carries `turnId` through successful, provider-error, and invalid-output completion paths while pre-persistence failures remain unpersisted.
- `src/lib/director/debug-log.ts` includes optional `turnId` in local debug records.
- `src/app/world-client.tsx` shows recent turn summaries in the debug panel without changing the story stream into turn cards.
- `docs/data-model.md` and `docs/persistence-system.md` document turn scope and deferred snapshot rollback.

##### Verified By

- `npm run test` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npx convex codegen` passed.
- `curl -I --max-time 5 http://localhost:3000` returned `HTTP/1.1 200 OK` from the existing dev server.

##### Verification Gaps

- `npm run convex:once` was blocked by an already-running local Convex backend on port 3210; `npx convex codegen` was used for schema/function validation.
- Manual browser playtest of successful and failed turn summaries remains pending.

## Epic File Rules

- Stories live inside the Epic `epic.md` file.
- Do not create `docs/stories/` or individual Story files.
- Preserve the Epic directory as the future home for supporting artifacts such as mockups, screenshots, research, or design notes.
- Epics and Stories are durable but revisable; Stories may be renamed, reordered, split, merged, or moved between Epics as the product matures.
- Treat Story moves as explicit Epic changes that name the source Epic, destination Epic, preserved or changed Story ID, and affected Requirements/Scenarios.
- Keep Story IDs stable even when Story titles change or Stories move between Epics.
- Restart Requirement IDs inside each Story: `R1`, `R2`, `R3`.
- Scope Scenario IDs to their Requirement: `R1-S1`, `R1-S2`, `R2-S1`.
- Do not use generic Scenarios such as "WHEN this Story's workflow is exercised"; name the real trigger, state, failure mode, or observable condition.

## Technical Approach

Add a `turns` table in `convex/schema.ts` with `worldId`, `sequenceNumber`, `actorId`, optional `commandId`, `status`, optional `error`, and optional lifecycle timestamps such as `completedAt`. Index by `worldId` and by `worldId` plus `sequenceNumber` so snapshots, feeds, and debug views can find ordered turns later.

Add optional `turnId` fields to turn-scoped tables: `commands`, `narrations`, `events`, `stateDiffs`, and `directorCalls`. Seed rows can keep `turnId` absent. New player-driven rows should receive `turnId`.

Adjust the Director route / Convex mutation boundary so the turn is created at the same point player input becomes persisted game history. Pre-persistence request failures should not create turns. Once a turn exists, provider failures and invalid output should complete the turn as failed and keep the linked command/director call for inspection.

Keep `commandId` during this change rather than removing it. It remains useful as a direct player-input link and avoids an unnecessary migration/refactor. The conceptual grouping moves to `turnId`; `commandId` becomes a child-row reference rather than the turn boundary.

Expose recent turn summaries from `getSnapshot` for debug inspection. Keep the story stream derived from commands, narrations, and events, but include `turnId` on feed entries when present. The main visible presentation should not become a rigid "turn card" UI in this change.

Update `docs/data-model.md` with a new `Turn` object and update `docs/persistence-system.md` so narrative turn flow, reset behavior, and future rollback strategy describe turn boundaries explicitly.

## Alternatives Considered

- Keep using `commandId` as the turn boundary:
  - Why not: it hides lifecycle status and makes failed turns, future snapshots, replay, and rollback awkward because the command only represents player text.
- Add a generic timeline table instead of `turns`:
  - Why not: timeline may become useful for branching/multiplayer later, but it is broader than the current single-player Director exchange problem.
- Implement rollback now through reverse state diffs:
  - Why not: current diffs do not capture enough before-state to invert safely, and reverse operations become complex as soon as operation types grow.
- Implement rollback now through snapshots:
  - Why not: snapshots are likely the right future rollback primitive, but the MVP does not yet need restore behavior. Turn boundaries are the useful enabling step.

## Why This Approach

Scoped turns are the smallest durable abstraction that matches how Lorecraft already works: the player submits one intent, the Director responds, and the backend accepts or rejects bounded changes. This gives us better ordering and diagnostics now while preserving a clean place for snapshots later.

The approach keeps the current model incremental. It does not require a new timeline engine, separate story-instance system, rollback UI, or migration away from existing command/narration/event tables.

## Implementation Constraints

- Keep Convex queries bounded and index-backed.
- Keep React components presentation-oriented; turn lifecycle rules belong in backend/application logic and Convex mutations.
- Preserve current player-facing story stream behavior unless debug visibility requires minor additions.
- Do not log secrets or raw provider state beyond the existing debug policies.
- Avoid irreversible migration complexity while the repo remains a proof-of-concept; reset can clear current playtest history if needed.

## Verification Strategy

- Unit or integration tests should prove successful turns create one turn and link command, narration, events, diffs, and Director call rows.
- Tests should prove provider/output failures after turn creation persist a failed turn without fake narration or accepted state changes.
- Tests should prove malformed pre-persistence requests do not create turns.
- Tests should prove `getSnapshot` or the debug query exposes recent turns with sequence/status and feed entries include `turnId` when present.
- Reset verification should prove `resetPlaytestWorld` clears turns alongside existing transcript/debug rows.
- Build/lint/Convex checks should prove schema and generated API changes are valid.

## Decisions

- A turn is created only after the request is valid enough to become persisted game history.
- Provider/output failures after turn creation are failed turns, not invisible request errors.
- Rollback is deferred, but future rollback should prefer snapshot restore at turn boundaries over reverse-diff inversion.
- `commandId` remains in the model for now; `turnId` becomes the canonical grouping field.

## Risks / Trade-Offs

- Adding `turnId` alongside `commandId` creates temporary duplication. The tradeoff is acceptable because it avoids a broad refactor while the turn model proves itself.
- World-scoped sequence numbers are enough for the current single-world MVP but may need story-instance scoping later.
- If concurrent submissions become possible, sequence assignment and pending-turn handling will need stricter server-side enforcement. The current MVP already biases against duplicate submissions and single-player local playtesting.
