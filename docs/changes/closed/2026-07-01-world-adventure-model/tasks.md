---
status: ready_to_close
---
# Tasks: World / Adventure Model

## Resume Here

- Current state: Closed and merged
- Last completed action: user authorized close and merge
- Next action: none; follow-up work should use a new SDD change
- Active branch/ref: `develop`
- Expected dirty files: none in app repo
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
- [x] 5.2 Run `sdd-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, changelog, ADR consistency, and branch readiness.
- [x] 5.3 Record review outcome as a `review.md` path, a clean review recorded in this ledger, or an explicit user-approved review waiver.
- [x] 5.4 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [x] 5.5 Record manual UI confirmation status as `not applicable`, `pending Taylor`, `Taylor confirmed`, or `accepted gap`.
- [x] 5.6 Confirm proposal/design/tasks/review artifacts do not still claim completed work is not implemented, not verified, pending, or accepted under obsolete manual status vocabulary.
- [x] 5.7 Confirm closeout state has no contradictory Resume Here, checklist, review, manual confirmation, changelog, ADR, PR/merge, deferred-gap, or folder-location claims.
- [x] 5.8 Create a PR or merge only after `sdd-review` is ready and the app branch policy plus user authorization allow it.
- [x] 5.9 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

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
| 2026-07-02 | Manual feedback: Adventure startup screen | main after Taylor feedback | `convex/world.ts`, `src/app/world-client.tsx`, E2E, LC-002 Epic, README, CHANGELOG, data/persistence docs | First app access now shows a lightweight World container screen for Stormbound Chapel, with Adventures listed inside by turn count and last played date; opening an Adventure remains required before the debug drawer/story input appears. | 747a1c8, efe2272 |
| 2026-07-02 | Manual feedback: Adventure URLs | main after Taylor feedback | `src/app/adventures/[adventureId]/page.tsx`, `src/app/world-client.tsx`, E2E, LC-002 Epic, README, CHANGELOG, data/persistence docs | Each Adventure now opens at `/adventures/<id>`; Continue, New Adventure, Reset World, reload, and direct URL loading preserve Adventure identity. | 3c433bd |
| 2026-07-02 | Manual feedback: collapsed debug panel | main after Taylor feedback | `src/app/world-client.tsx`, E2E | Entering an Adventure now starts with the debug panel collapsed; E2E opens it explicitly before debug assertions. | 7348518 |
| 2026-07-02 | Manual feedback: delete Adventure from home | main after Taylor feedback | `convex/world.ts`, `src/app/world-client.tsx`, E2E, README, CHANGELOG, data/persistence docs, LC-002 Epic | World container rows now expose a confirmed Delete action that removes one local Adventure and its runtime rows without deleting the source WorldVersion. | committed |

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
| 2026-07-02 | `npm run typecheck` | deterministic automated gate | TypeScript accepts the new Adventure list/create client and Convex function contracts. | passed |
| 2026-07-02 | `npm run lint` | deterministic automated gate | ESLint accepts the Adventure landing UI and Convex helpers. | passed |
| 2026-07-02 | `npm run test -- src/app/api/director/turn/route.test.ts src/lib/director/director.test.ts` | focused automated tests | Existing Game Master route/director contracts still pass after startup selection changed. | passed |
| 2026-07-02 | Browser smoke against running `npm run dev:debug` | manual/browser automation smoke | Startup screen listed existing Adventures; New Adventure created `Stormbound Chapel Adventure 2`; the story stream opened with source-version opening narration; Back returned to the Adventure list. | passed |
| 2026-07-02 | `npm run ci:required` | deterministic required gate | Lint, full unit tests, typecheck, and production build pass after the Adventure startup screen. | passed |
| 2026-07-02 | `npm run e2e` | deterministic browser E2E | Full deterministic playtest passes after updating reload behavior to continue from the Adventure landing screen. | passed |
| 2026-07-02 | Browser smoke after World-container refinement | manual/browser automation smoke | Restarted `npm run dev:debug`; landing shows `Stormbound Chapel` as the World container, lists Adventure rows with turn count and last played date, and has no Reset World action. | passed |
| 2026-07-02 | `npm run ci:required` after World-container refinement | deterministic required gate | Lint, full unit tests, typecheck, and production build pass after moving reset off the landing and guarding reset/submit races. | passed |
| 2026-07-02 | `npm run e2e` after World-container refinement | deterministic browser E2E | Full deterministic playtest passes with setup reset occurring through the open Adventure debug panel. | passed |
| 2026-07-02 | `npm run typecheck`; `npm run lint`; `npm run test -- src/app/api/director/turn/route.test.ts src/lib/director/director.test.ts` after Adventure URL refinement | deterministic automated gates | TypeScript, lint, and focused Game Master route/director tests pass after adding the Adventure route. | passed |
| 2026-07-02 | `npm run ci:required` after Adventure URL refinement | deterministic required gate | Lint, full unit tests, typecheck, and production build pass; Next build includes dynamic `/adventures/[adventureId]` route. | passed |
| 2026-07-02 | `npm run e2e` after Adventure URL refinement | deterministic browser E2E | Full deterministic playtest passes with Continue/Create/Reset setup navigating to `/adventures/<id>` and reload preserving the selected Adventure. | passed |
| 2026-07-02 | Browser smoke against restarted `npm run dev:debug` after Adventure URL refinement | manual/browser automation smoke | Clicking Continue from `/` navigated to `/adventures/kn70pv1ayan3rrzw8ms3hb493189sazj`; direct loading that URL reopened the Adventure story UI. | passed |
| 2026-07-02 | `npm run lint`; `npm run typecheck`; `npm run e2e`; `npm run ci:required` after collapsed-debug refinement | deterministic automated gates | Lint, typecheck, deterministic browser E2E, and required CI pass after changing the default debug-panel state. | passed |
| 2026-07-02 | Browser smoke against restarted `npm run dev:debug` after collapsed-debug refinement | manual/browser automation smoke | Continuing an Adventure opened `/adventures/kn79z2rznr7a0vyp1a9dwwmyps89r0eb` with `#debug-panel` `aria-hidden=true` and `inert=true`. | passed |
| 2026-07-02 | `npm run lint`; `npm run typecheck`; `npm run test -- src/app/api/director/turn/route.test.ts src/lib/director/director.test.ts` after Adventure deletion refinement | deterministic automated gates | Lint, TypeScript, and focused Game Master route/director tests pass after adding the delete mutation and landing UI. | passed |
| 2026-07-02 | `npm run e2e` after Adventure deletion refinement | deterministic browser E2E | Full deterministic playtest passes; the test creates a temporary Adventure, returns to the World container, confirms Delete, verifies the row disappears, and sees the deletion notice. | passed |
| 2026-07-02 | `npm run ci:required` after Adventure deletion refinement | deterministic required gate | Lint, full unit tests, typecheck, and production build pass after the delete flow. | passed |
| 2026-07-02 | Browser smoke against restarted `npm run dev:debug` after Adventure deletion refinement | manual/browser automation smoke | With one existing Adventure visible, created temporary Adventure `kn711ye5j9bg4bjnjhg689k56989ra5e`, deleted it from `/`, saw `Deleted Stormbound Chapel Adventure 2.`, and the list returned to one Adventure. | passed |
| 2026-07-02 | `sdd-review`; `npm run ci:required` | local integration gate | Source/target diff, SDD artifacts, Epic truth, docs/changelog, security posture, branch readiness, and required CI were reviewed; stale Epic verification wording was refreshed. | passed |

## Manual Feedback

Record the user's manual testing feedback after implementation starts.

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| 2026-07-01 | Frozen copies; World updates should not break an existing story. | accepted architecture constraint | Captured in accepted ADR and this proposal. | incorporated |
| 2026-07-02 | On first access, the app should show a page to continue previous Adventures or create a new one. | accepted UX requirement | Added lightweight Adventure landing screen; updated LC-002 and docs so Adventure selection is no longer deferred or contradicted by "no management screen" wording. | incorporated |
| 2026-07-02 | Stormbound Chapel should be the container; Adventures should be listed inside it with turn count and last played date. Reset World should not be on the home screen. | accepted UX refinement | Reworked the landing screen to a World container with Adventure rows and removed Reset World from the landing; reset remains in the open Adventure debug panel. | incorporated |
| 2026-07-02 | Each Adventure should have its own URL; `/adventures/<id>` works fine. | accepted UX/routing refinement | Added an App Router route for `/adventures/[adventureId]`, route-driven Adventure opening, and E2E/direct-load coverage. | incorporated |
| 2026-07-02 | The debug panel should be collapsed by default when entering an Adventure. | accepted UX refinement | Changed the initial debug-panel state to collapsed and updated E2E to explicitly open it before debug interactions. | incorporated |
| 2026-07-02 | Let me delete an Adventure from the home screen. | accepted UX refinement | Added a confirmed Delete action per Adventure row on the World container and a Convex mutation that removes only that Adventure's runtime rows. | incorporated |

## Planning Updates

Record `/sdd-propose --replan` updates when implementation or feedback discovers planning-level requirements.

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|---|
| YYYY-MM-DD | TBD | in-scope refinement / scope expansion / product drift / Epic ownership change / technical constraint / follow-up change | proposal.md / design.md / tasks.md | `/sdd-apply` TBD |

## Manual UI Confirmation

- Status: accepted gap
- App URL / route: `http://localhost:3000`
- Required setup or test data: seeded Stormbound Chapel WorldVersion and default Adventure
- Steps for the user: open the app, confirm it lands on the Stormbound Chapel World container with Adventure rows, continue an existing Adventure or create a new one, confirm the browser URL is `/adventures/<id>`, reload that URL, submit at least one turn, inspect debug Adventure/source version identity, reset from the open Adventure debug panel, return home and delete a disposable Adventure
- Expected result: the story loop works as before, but reset/debug wording and state identity make clear that play happens inside an Adventure copied from a WorldVersion
- Feedback that would change artifacts: stronger Adventure naming, visible World/Adventure labels, different reset wording, or stronger migration/preservation requirements

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
- `sdd-review` verdict: ready after minor artifact refresh.
- Review record: clean review recorded in this ledger; no `review.md` created.
- `review.md` findings resolved: not applicable; no unresolved findings.
- Planning updates resolved: none.
- Manual UI confirmation status: accepted gap.
- PR / merge state: user authorized local merge from `change/world-adventure-model` to `develop`.
- Deferred scope accepted: polished World Builder, World patching, snapshots, rollback, branching, auth/ownership, multiplayer, and rules-heavy RPG systems.
- Change moved to `docs/changes/closed/`: yes.
