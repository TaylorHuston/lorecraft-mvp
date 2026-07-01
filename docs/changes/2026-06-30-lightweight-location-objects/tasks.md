# Tasks: Lightweight Location Objects

## Resume Here

- Current state: `/sdd-apply` remediation is implemented and verified in the working tree; `npm run e2e`, `npm run ci:required`, and `git diff --check` pass after adding NPC debug parity E2E coverage and location-save flushing.
- Last completed action: reran deterministic browser E2E and the required CI gate after enabling raw request storage for the E2E app server.
- Next action: commit the intended implementation/remediation state, record the final commit ref, then run a fresh `/sdd-review`.
- Active branch/ref: `change/lightweight-location-objects`
- Expected dirty files: `docs/changes/2026-06-30-lightweight-location-objects/`, `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`, `convex/world.ts`, `src/lib/director/*`, `src/app/api/director/turn/route.ts`, `src/app/world-client.tsx`, tests, docs, `package.json`, `CHANGELOG.md`
- Known blockers: broad uncommitted app/source changes prevent merge readiness until committed; Taylor manual UI confirmation remains pending

## Task Checklist

### 1. Epic Artifacts

- [x] 1.1 Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.
- [x] 1.2 Add Story `LC-001-S12: Lightweight Location Cards And Movement`.
- [x] 1.3 Reconcile older movement wording in `LC-001-S1`, `LC-001-S2`, `LC-001-S7`, and `LC-001-S10` so Epic truth does not still claim narrative movement never mutates actor rooms.
- [x] 1.4 Confirm each affected Story has app-unique stable Story IDs, local Requirement IDs, local Scenario IDs, Implemented By, Verified By, and Verification Gaps.

### 2. Implementation

- [x] 2.1 Implement Location Card context.
  - [x] Story: `LC-001-S12` - Lightweight Location Cards And Movement
    - [x] Requirement R1: Location Cards In Game Master Context
      - [x] Scenario R1-S1: Current location grounds narration
      - [x] Scenario R1-S2: Existing locations are eligible destinations
      - [x] Scenario R1-S3: Transcript mode excludes live location cards
- [x] 2.2 Implement bounded actor movement extraction and validation.
  - [x] Story: `LC-001-S12` - Lightweight Location Cards And Movement
    - [x] Requirement R2: Bounded Actor Location Mutation
      - [x] Scenario R2-S1: Clear player travel moves the player
      - [x] Scenario R2-S2: Present NPC follows or leaves
      - [x] Scenario R2-S3: Game Master cannot relocate actors autonomously
      - [x] Scenario R2-S4: Unknown target location is unresolved
      - [x] Scenario R2-S5: Path links are not enforced
- [x] 2.3 Implement debug location editing.
  - [x] Story: `LC-001-S12` - Lightweight Location Cards And Movement
    - [x] Requirement R3: Debug Location Editing
      - [x] Scenario R3-S1: Debug tab shows location state
      - [x] Scenario R3-S2: Debug edit updates canonical location fields
      - [x] Scenario R3-S3: Debug create adds a canonical location
      - [x] Scenario R3-S4: Location keys remain stable after creation
- [x] 2.4 Implement reset/debug evidence behavior.
  - [x] Story: `LC-001-S12` - Lightweight Location Cards And Movement
    - [x] Requirement R4: Reset And Debug Evidence
      - [x] Scenario R4-S1: Reset world restores seeded locations
      - [x] Scenario R4-S2: Accepted movement is turn-scoped
      - [x] Scenario R4-S3: Rejected movement is inspectable
- [x] 2.5 Update Story-level Implemented By maps with current code locations.
- [x] 2.6 Reconcile canonical debug NPC editing parity into artifacts and implementation.
  - [x] Story: `LC-001-S9` - Read-Only NPC Context
    - [x] Requirement R3: Debug NPC Inspection And Editing
      - [x] Scenario R3-S1: Debug panel shows NPC fields
      - [x] Scenario R3-S2: Debug edit affects Game Master context
      - [x] Scenario R3-S3: Debug edits are resettable
      - [x] Scenario R3-S4: Debug create adds a current-location NPC
- [x] 2.7 Address `/sdd-review` remediation findings.
  - [x] Local-only guardrails for debug writes and provider-spend route access
  - [x] NPC fact clearing removes or clears old canonical values
  - [x] Debug-created NPC/location row growth cannot make reset unrecoverable in ordinary debug use
  - [x] Pending NPC autosaves cannot reapply stale state after reset/seed
  - [x] Player submission does not race obvious pending NPC autosaves
  - [x] Debug state labels and disclosure controls match current behavior

### 3. Verification

- [x] 3.1 Add or update focused tests for Location Card prompt context and transcript exclusion.
- [x] 3.2 Add or update focused tests for actor movement parsing/validation and ignored movement proposals.
- [x] 3.3 Add or update deterministic browser coverage for debug location create/edit behavior and reset behavior.
- [x] 3.4 Run `npm run ci:required`.
- [x] 3.5 Run `npm run e2e` if deterministic browser coverage is updated for this flow.
- [ ] 3.6 Run local `npm run dev:debug` playtests for one accepted move and one unknown-location attempt, then inspect debug logs.
- [x] 3.7 Update Story-level Verified By maps with concrete evidence.
- [x] 3.8 Rerun focused and required verification after review remediation.

### 4. Documentation

- [x] 4.1 Update `docs/data-model.md` with Location Card semantics, room-backed location fields, actor movement validation, reset behavior, and deferred Dungeon scope.
- [x] 4.2 Update `docs/persistence-system.md` with the location persistence strategy and the clear-player-travel movement boundary.
- [x] 4.3 Update README/debug documentation if setup, debug tabs, reset semantics, or playtest examples change.
- [x] 4.4 Update root `CHANGELOG.md` under `Unreleased` because changelog impact is required.
- [x] 4.5 Update README/docs to describe local-only debug write posture and canonical NPC/Location debug parity after remediation.

### 5. Review And Closeout

- [x] 5.1 Run `sdd-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, changelog, and branch readiness.
- [x] 5.2 Record review outcome as a `review.md` path, a clean review recorded in this ledger, or an explicit user-approved review waiver.
- [x] 5.3 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [x] 5.4 Record manual UI confirmation status as `not applicable`, `pending user`, `user confirmed`, or `accepted gap`.
- [x] 5.5 Confirm closeout state has no contradictory Resume Here, checklist, review, manual confirmation, changelog, PR/merge, deferred-gap, or folder-location claims.
- [ ] 5.6 Create a PR or merge only after `sdd-review` is ready and the app branch policy plus user authorization allow it.
- [ ] 5.7 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-06-30 | Proposal | main | `docs/changes/2026-06-30-lightweight-location-objects/` | Drafted proposal/design/tasks for review. | uncommitted |
| 2026-06-30 | Discovery | main orchestrator; delegated explorer/test-engineer started; specialist routing: Convex guidelines, Next route/UI surfaces, SDD branch policy | change artifacts, Epic, `convex/world.ts`, `src/lib/director/*`, `src/app/world-client.tsx`, tests | Confirmed no schema rename is needed; implementation should reuse `rooms`, actor `roomId`, existing NPC card/extraction patterns, and `stateDiffs.moveActor`. | uncommitted |
| 2026-06-30 | `LC-001-S12 R1-R4` implementation | main orchestrator; subagent discovery/test strategy incorporated; Convex guidelines | `convex/world.ts`, `src/lib/director/*`, `src/app/api/director/turn/route.ts`, `src/app/world-client.tsx`, fixture, E2E, docs | Implemented Location Cards, Known Locations, bounded actor movement extraction/validation/persistence, debug Locations tab edit/create, actor-location reset, docs, and changelog. | uncommitted |
| 2026-06-30 | Delegated review remediation | main orchestrator; delegated artifact, test, and security reviewers | `convex/world.ts`, `package.json`, `src/lib/director/output.ts`, `src/lib/director/director.test.ts`, `tests/e2e/lorecraft-playtest.spec.ts`, docs | Addressed stale docs, production-exposed debug location writes, weak NPC movement confirmation, reset-location ambiguity, unknown-destination E2E gap, and fresh-seed/session reset E2E gap. | uncommitted |
| 2026-07-01 | Formal `/sdd-review` remediation start | main orchestrator; delegated backend and frontend remediation agents | `review.md`, proposal/design/tasks/changelog, backend/frontend remediation pending | Accepted canonical NPC debug parity and tavern seed content into the active change scope; started fixing public debug/write exposure, reset/save races, and stale debug UI evidence. | commit pending |
| 2026-07-01 | Formal `/sdd-review` remediation | main orchestrator; Pascal backend agent; Hubble frontend agent; Convex and Next route-handler guidance | `convex/world.ts`, `src/app/api/director/turn/route.ts`, `src/app/world-client.tsx`, `package.json`, docs, Epic, tests | Removed persistent debug env writes, added local-only debug/Director guardrails plus server-write token path, capped debug-created rows, made blank NPC facts clear canonical facts, fixed NPC autosave reset/submit races, renamed state evidence, added disclosure buttons/live regions, and reconciled artifacts. | commit pending |
| 2026-07-01 | Post-review deterministic remediation | main orchestrator | `src/app/world-client.tsx`, `playwright.config.ts`, `tests/e2e/lorecraft-playtest.spec.ts`, `convex/world.ts`, tasks/review/Epic docs | Added active location-save flushing before submit/seed/reset, deterministic NPC debug edit/create/reset E2E assertions, raw request storage in the E2E app server so prompt-context assertions are inspectable, and local Convex server-write fallback for the isolated E2E deployment. | commit pending |

## Verification Ledger

Record proof as it happens.

| Date | Check | What It Proves | Result |
|---|---|---|---|
| 2026-06-30 | Artifact self-review | Required proposal, design, and task surfaces exist for `LC-001-S12`, changelog impact is recorded, and closeout fields are present. | Passed |
| 2026-06-30 | `/sdd-apply` Discovery | Proposal/design/tasks agree on scope, target Epic path is valid, `LC-001-S12` is app-unique, branch policy is known, and the next implementation slice has enough technical detail. | Passed |
| 2026-06-30 | `npm run test -- src/lib/director/director.test.ts` | Location Card prompt context, transcript exclusion, state extraction parsing, accepted movement validation, ignored movement proposals, and silent NPC relocation rejection. | Passed |
| 2026-06-30 | `npx convex codegen` | Convex generated API and TypeScript are valid after adding debug-gated location write actions, internal mutations, reset-location restoration, and movement persistence functions. | Passed |
| 2026-06-30 | `npm run e2e` | Browser/Next/Convex/fixture path for seeding, debug Locations tab, location edit/create, accepted movement to Vestry, unknown bell-tower rejection, Reset Session restoration of seeded locations, and debug movement evidence. | Passed |
| 2026-06-30 | `npm run ci:required` | Lint, full Vitest suite, TypeScript, and production build for the implemented change. | Passed |
| 2026-06-30 | Delegated artifact review | Stale implementation/verification placeholders, read-only NPC wording, and reset ambiguity were identified before closeout. | Changes requested; remediated in docs |
| 2026-06-30 | Delegated test review | Deterministic E2E gaps for unknown destination rejection and reset restoration were identified before closeout. | Changes requested; remediated in E2E |
| 2026-06-30 | Delegated security/data-safety review | Public debug location writes, reset state integrity, and NPC movement validation were reviewed. | Changes requested; remediated in code/tests |
| 2026-07-01 | `/sdd-review` | Formal local integration gate for `change/lightweight-location-objects`. | Changes requested; see `docs/changes/2026-06-30-lightweight-location-objects/review.md` |
| 2026-07-01 | `npx convex codegen` | Convex generated API and TypeScript are valid after review remediation. | Passed |
| 2026-07-01 | `npm run test -- src/lib/director/director.test.ts` | Focused director prompt/parser/validation coverage still passes after backend and artifact remediation. | Passed, 40 tests |
| 2026-07-01 | `npm run lint` | ESLint passes after frontend/debug UI remediation. | Passed |
| 2026-07-01 | `npm run test` | Full Vitest suite passes after review remediation. | Passed, 40 tests |
| 2026-07-01 | `npm run typecheck` | TypeScript passes after route, Convex, and UI changes. | Passed |
| 2026-07-01 | `npm run build` | Next production build passes after route and UI changes. | Passed |
| 2026-07-01 | `npm run ci:required` | Required gate passes after review remediation. | Passed |
| 2026-07-01 | `npm run e2e` | Deterministic browser E2E rerun after remediation. | Blocked: `convex-lo` PID `6852` is already listening on `:3210` and Playwright does not reuse that server |
| 2026-07-01 | `/sdd-review` rerun | Fresh local integration review after remediation. | Changes requested; see `docs/changes/2026-06-30-lightweight-location-objects/review.md` |
| 2026-07-01 | `git diff --check` | Final whitespace check after post-review remediation. | Passed |
| 2026-07-01 | `npm run e2e` | Deterministic browser E2E covers seeded playtest, debug drawer accessibility, raw Game Master call evidence, canonical NPC edit/create/reset parity, debug location edit/create/reset, accepted movement, and rejected unknown-location travel. | Passed |
| 2026-07-01 | `npm run ci:required` | Final required gate after post-review remediation. | Passed: lint, 40 Vitest tests, typecheck, Next build |

## Manual Feedback

Record the user's manual testing feedback after implementation starts.

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| 2026-06-30 | Location should include mutation because NPC mutation proved the pattern; move player and NPCs; use existing locations only; show location state in debug; add editable/createable Locations tab; any existing location may be a target for now. | requirement refinement | Incorporated into proposal/design/tasks. | closed |
| 2026-07-01 | `/sdd-review` found canonical NPC debug edits, tavern seed NPCs, and removed override files were implemented but not fully owned by the location-change artifacts. | artifact drift / accepted scope expansion | Updated proposal/design/tasks/changelog/Epic to explicitly include canonical NPC debug parity with Locations and seeded tavern NPCs. | closed |

## Planning Updates

Record `/sdd-propose --replan` updates when implementation or feedback discovers planning-level requirements.

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|---|
| 2026-06-30 | Initial planning clarified location versus future dungeon scope. | in-scope refinement | Created initial proposal/design/tasks. | `/sdd-apply` from `LC-001-S12 R1` |

## Manual UI Confirmation

- Status: pending user
- App URL / route: local Lorecraft app root, typically `http://localhost:3000`
- Required setup or test data: seeded Stormbound Chapel demo world with at least Chapel, Vestry, and Graveyard; optional debug-created location
- Steps for the user:
  - Open the debug drawer and inspect the `Locations` tab.
  - Edit an existing location's name or description.
  - Create a new location.
  - Open the `NPCs` tab.
  - Edit an existing NPC's visible/profile fields and confirm the saved value appears in subsequent Game Master context.
  - Create a debug NPC and confirm it appears in the current location.
  - Submit a clear travel input to an existing location, such as `I go to the vestry.`
  - Submit a clear travel input to an unknown location, such as `I go to the bell tower.`
  - Use Reset Session and confirm seeded location state is restored.
- Expected result:
  - Location edits/creates affect Game Master context and valid movement targets.
  - NPC edits/creates affect Game Master context when the NPC is present.
  - Clear travel to an existing location can update actor locations.
  - Unknown destinations are handled in-story without canonical movement.
  - Reset restores seeded locations, seeded NPCs, actor positions, and removes debug-created rows.
- Feedback that would change artifacts:
  - Need for path/link enforcement.
  - Need for player-facing location status widget.
  - Need for dynamic location or NPC creation.
  - Need for dungeon-specific exploration rules.

## Blockers / Open Questions

- Taylor manual UI confirmation remains pending.
- Remote/shared deployment hardening remains deferred: auth, ownership, rate limiting, and server-owned debug/reset controls are required before this is safe beyond local prototype use.

## Closeout

- Epic files updated: yes
- Story/Requirement/Scenario IDs current: yes
- Implemented By maps current: yes
- Verified By maps current: yes
- Changelog current: yes
- `sdd-review` verdict: changes requested; remediation applied and pending fresh review
- Review record: `docs/changes/2026-06-30-lightweight-location-objects/review.md`
- `review.md` findings resolved: yes in working tree; fresh review still required after commit
- Planning updates resolved: no unresolved planning blockers
- Manual UI confirmation status: pending user
- PR / merge state: not started
- Deferred scope accepted: live provider-backed `npm run dev:debug` playtest, Dungeon mode, path/link constraints, dynamic location creation by LLM, player-facing location widget, polished World Builder, object/exit editing, full production auth/ownership/rate limiting
- Change moved to `docs/changes/closed/`: no
