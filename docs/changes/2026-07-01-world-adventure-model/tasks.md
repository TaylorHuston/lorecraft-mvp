# Tasks: World / Adventure Model

## Resume Here

- Current state: implementation complete; deterministic gates and E2E passed; commit pending
- Last completed action: `npm run lint`, `npm run ci:required`, and `npm run e2e` passed after correcting the reset E2E expectation for restored WorldVersion opening narration
- Next action: final drift check, commit, then hand off to `sdd-review`
- Active branch/ref: `change/world-adventure-model`
- Expected dirty files: `convex/schema.ts`, `convex/world.ts`, `src/app/api/director/turn/route.ts`, `src/app/api/director/turn/route.test.ts`, `src/app/world-client.tsx`, `scripts/*playtest*.mjs`, `tests/e2e/lorecraft-playtest.spec.ts`, `docs/epics/lc-002-world-adventure-model/epic.md`, this change folder, docs/changelog files
- Known blockers: none identified

## Task Checklist

### 1. Epic Artifacts

- [x] 1.1 Create `docs/epics/lc-002-world-adventure-model/epic.md`.
- [x] 1.2 Add Stories `LC-002/S1` through `LC-002/S4` from `design.md`.
- [x] 1.3 Confirm each Story has stable Epic-scoped labels, local Requirement IDs, local Scenario IDs, Implemented By, Verified By, and Verification Gaps.
- [x] 1.4 Reconcile LC-001 deferred-scope wording so it points to LC-002 once implementation lands.
- [x] 1.5 Confirm no old LC-001 evidence incorrectly claims `worldId` remains the runtime identity after this change.

### 2. Architecture Decisions

- [x] 2.1 Confirm `design.md` compares viable technical options and selects WorldVersion plus Adventure-owned runtime rows.
- [x] 2.2 Link and review ADR `docs/adrs/2026-07-01-world-adventure-frozen-copies.md`.
- [x] 2.3 Confirm ADR status remains accurate: accepted.
- [x] 2.4 Create a new ADR only if implementation changes the accepted copy/versioning strategy.

### 3. Implementation

- [x] 3.1 Implement Requirements through BDD/TDD phases.
  - [x] Story: LC-002/S1 - Start Adventure From World Version
    - [x] Requirement R1: Adventure Creation
      - [x] Scenario R1-S1: Default demo Adventure is created
      - [x] Scenario R1-S2: Adventure records source identity
    - [x] Requirement R2: Baseline Copy
      - [x] Scenario R2-S1: Copied baseline is playable
  - [x] Story: LC-002/S2 - Adventure-Scoped Runtime State
    - [x] Requirement R1: Runtime Rows Are Adventure-Scoped
      - [x] Scenario R1-S1: Narrative turn writes Adventure state
      - [x] Scenario R1-S2: Feed reloads from Adventure state
    - [x] Requirement R2: Debug Surfaces Use Adventure Identity
      - [x] Scenario R2-S1: Debug state follows selected Adventure
  - [x] Story: LC-002/S3 - World Version Edits Do Not Mutate Existing Adventures
    - [x] Requirement R1: World Versions Are Immutable Sources
      - [x] Scenario R1-S1: New WorldVersion leaves existing Adventure unchanged
      - [x] Scenario R1-S2: Future Adventure uses current WorldVersion
    - [x] Requirement R2: No Implicit Migration
      - [x] Scenario R2-S1: Source update is not applied automatically
  - [x] Story: LC-002/S4 - Reset Adventure To Source Version
    - [x] Requirement R1: Adventure Reset
      - [x] Scenario R1-S1: Reset restores original version
      - [x] Scenario R1-S2: Reset is destructive only to the selected Adventure
- [x] 3.2 Add enabling schema/seed phases only when backed by focused tests.
- [x] 3.3 Update Story-level Implemented By maps with current code locations.
- [x] 3.4 Update README, `docs/data-model.md`, `docs/persistence-system.md`, and `docs/architecture.md`.

### 4. Verification

- [x] 4.1 Add focused automated tests for copy, Adventure-scoped writes, WorldVersion isolation, and Adventure reset.
- [x] 4.2 Update Story-level Verified By maps with scenario-mapped evidence, not chronological command logs.
- [x] 4.3 Update deterministic E2E to cover the default Adventure path and reset semantics.
- [x] 4.4 Run `npm run ci:required`.
- [x] 4.5 Run `npm run e2e` when browser/Convex/persistence behavior is updated.
- [ ] 4.6 Run optional live-provider smoke only after deterministic checks pass and only if useful for playtest confidence.
- [x] 4.7 Inspect debug/log evidence for Adventure identity and source WorldVersion context.

### 5. Review And Closeout

- [x] 5.1 Update root `CHANGELOG.md` under `Unreleased`.
- [ ] 5.2 Run `sdd-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, changelog, ADR consistency, and branch readiness.
- [ ] 5.3 Record review outcome as a `review.md` path, a clean review recorded in this ledger, or an explicit user-approved review waiver.
- [ ] 5.4 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [ ] 5.5 Record manual UI confirmation status as `not applicable`, `pending Taylor`, `Taylor confirmed`, or `accepted gap`.
- [ ] 5.6 Confirm proposal/design/tasks/review artifacts do not still claim completed work is not implemented, not verified, pending, or accepted under obsolete manual status vocabulary.
- [ ] 5.7 Confirm closeout state has no contradictory Resume Here, checklist, review, manual confirmation, changelog, ADR, PR/merge, deferred-gap, or folder-location claims.
- [ ] 5.8 Create a PR or merge only after `sdd-review` is ready and the app branch policy plus user authorization allow it.
- [ ] 5.9 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-07-01 | Planning | main | `docs/changes/2026-07-01-world-adventure-model/` | Proposal, design, and task ledger drafted. | c8add34 |
| 2026-07-01 | Discovery | main + Kepler explorer; `convex-migration-helper`, Convex generated guidelines, Next route-handler docs | branch policy, Convex schema/functions, Next route, UI, scripts, E2E, Epic template | Selected `change/world-adventure-model`; decided to widen schema for local MVP compatibility while moving implemented runtime reads/writes to `adventureId`; delegated read-only identity-surface audit. | c8add34 |
| 2026-07-01 | Epic artifact and schema enabling | main | `docs/epics/lc-002-world-adventure-model/epic.md`, `convex/schema.ts` | Created LC-002 draft Epic and added `worldVersions`, `adventures`, plus optional `adventureId` fields/indexes on runtime tables. | c8add34 |
| 2026-07-01 | Adventure seed/copy/reset runtime | main | `convex/world.ts`, `convex/schema.ts` | Added Stormbound Chapel baseline WorldVersion creation, default Adventure creation, Adventure-owned runtime copy, WorldVersion isolation helpers, and selected-Adventure reset to source version. | c8add34 |
| 2026-07-01 | Adventure-scoped Game Master flow | main | `src/app/api/director/turn/route.ts`, `src/lib/director/*`, `src/app/world-client.tsx` | Route, prompt/log/error contracts, debug UI, reset/debug edits, scripts, and snapshots now use `adventureId` and expose source WorldVersion context. | c8add34 |
| 2026-07-01 | Documentation reconciliation | main | README, CHANGELOG, `docs/architecture.md`, `docs/data-model.md`, `docs/persistence-system.md`, `docs/testing.md`, LC-001 Epic, LC-002 Epic | Codified World source, immutable WorldVersion, mutable Adventure runtime, reset semantics, debug identity, and scenario-mapped Epic evidence. | c8add34 |

## Verification Ledger

Record proof as it happens. Keep chronological command output here; summarize only durable scenario-mapped evidence into Epic `Verified By`. Do not blur deterministic E2E, live-provider playtests, manual UI confirmation, broad gates, and debug/log inspection into one evidence bucket.

| Date | Check | Evidence Type | What It Proves | Result |
|---|---|---|---|---|
| 2026-07-01 | Artifact reread during `/sdd-propose` | planning verification | Proposal/design/tasks exist and name Epic actions, ADR link, changelog impact, and implementation scope. | passed |
| 2026-07-01 | `npm run typecheck` | deterministic automated gate | TypeScript accepts Adventure context, prompt, route, UI, and test contracts. | passed |
| 2026-07-01 | `npm run convex:once` | deterministic Convex gate | Convex schema/functions compile with `worldVersions`, `adventures`, and Adventure-scoped indexes. | passed |
| 2026-07-01 | `npm run test -- src/app/api/director/turn/route.test.ts src/lib/director/director.test.ts` | focused automated tests | Route preflight, malformed Adventure ids, prompt/debug contracts, and director behavior work with Adventure identity. | passed |
| 2026-07-01 | `npm run test` | deterministic automated gate | Full unit test suite passes after Adventure contract changes. | passed |
| 2026-07-01 | Live Convex seed/snapshot smoke | live local Convex smoke | `seedDemoWorld` created default Adventure `kn7dej4650m780jyn93w55qhfn89rnxc`; `getSnapshot` exposed Adventure/source WorldVersion v1 and copied baseline rows. | passed |
| 2026-07-01 | Live Convex WorldVersion isolation smoke | live local Convex smoke | Created source WorldVersion v2 with changed chapel description and a new Adventure from it; original v1 Adventure snapshot remained unchanged while the new Adventure used v2. | passed |
| 2026-07-01 | Live Convex Adventure reset smoke | live local Convex smoke | `resetPlaytestWorld` restored the selected v2 Adventure from its own source WorldVersion and did not upgrade or mutate the original v1 Adventure. A transient parallel `fetch failed` was rerun serially and passed. | passed |
| 2026-07-01 | `npm run lint` | deterministic automated gate | ESLint passes with no errors after removing dead legacy reset helpers. | passed |
| 2026-07-01 | `npm run ci:required` | deterministic required gate | Lint, full unit tests, typecheck, and production build pass. | passed |
| 2026-07-01 | First `npm run e2e` after Adventure reset | deterministic browser E2E | Revealed stale E2E expectation that Reset Session should empty the story feed. New model restores source WorldVersion opening narration instead. | failed as expected after model change |
| 2026-07-01 | `npm run e2e` after assertion update | deterministic browser E2E | Browser seeds default Adventure, submits turns, verifies debug Adventure/source-version evidence, edits NPC/location state, travels, rejects unknown travel, resets selected Adventure, and verifies source-version opening/location/NPC restoration. | passed |

## Manual Feedback

Record the user's manual testing feedback after implementation starts.

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| 2026-07-01 | Frozen copies; World updates should not break an existing story. | accepted architecture constraint | Captured in accepted ADR and this proposal. | incorporated |

## Planning Updates

Record `/sdd-propose --replan` updates when implementation or feedback discovers planning-level requirements.

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|---|
| YYYY-MM-DD | TBD | in-scope refinement / scope expansion / product drift / Epic ownership change / technical constraint / follow-up change | proposal.md / design.md / tasks.md | `/sdd-apply` TBD |

## Manual UI Confirmation

- Status: pending Taylor
- App URL / route: `http://localhost:3000`
- Required setup or test data: seeded Stormbound Chapel WorldVersion and default Adventure
- Steps for the user: open the app, confirm it lands in a playable Adventure without a management screen, submit at least one turn, inspect debug Adventure/source version identity, reset the Adventure
- Expected result: the story loop works as before, but reset/debug wording and state identity make clear that play happens inside an Adventure copied from a WorldVersion
- Feedback that would change artifacts: need for an Adventure picker, visible World/Adventure labels, different reset wording, or stronger migration/preservation requirements

## Blockers / Open Questions

- None identified.

## Closeout

- Epic files updated: LC-002 created and LC-001 deferred-scope/runtime-identity wording reconciled.
- Story labels/references and Requirement/Scenario IDs current: yes.
- Implemented By maps current: yes, in LC-002.
- Scenario-mapped Verified By maps current: yes, in LC-002.
- Superseded earlier Epic truth reconciled: LC-001 no longer treats independent story/play-session instances as purely future scope.
- ADR status: accepted; implementation follows `docs/adrs/2026-07-01-world-adventure-frozen-copies.md`.
- Changelog current: yes, `Unreleased` notes Adventure instances and Adventure-scoped runtime/reset behavior.
- `sdd-review` verdict: pending.
- Review record: pending `/sdd-review`.
- `review.md` findings resolved: not applicable until review runs.
- Planning updates resolved: none.
- Manual UI confirmation status: pending Taylor.
- PR / merge state: implementation committed on `change/world-adventure-model`; no PR/merge yet.
- Deferred scope accepted: Adventure picker, World Builder, World patching, snapshots, rollback, branching, auth/ownership, multiplayer, and rules-heavy RPG systems.
- Change moved to `docs/changes/closed/`: no; pending review and closeout authorization.
