# Tasks: Next.js Architecture Refactor

## Resume Here

- Current state: applying
- Last completed action: first behavior-preserving architecture slice implemented and verified: thin App Router pages/route adapter, route loading/error fallbacks, feature-level play client relocation, server-only Game Master request/orchestration modules, pure debug formatter extraction, and Stormbound baseline extraction outside Convex generated API.
- Next action: continue Workstream 2 by extracting client hooks/components for turn submission, Adventure selection, NPC autosave, Location editing, and debug tabs; then continue Workstream 4 beyond baseline extraction.
- Active branch/ref: `change/nextjs-architecture-refactor`
- Expected dirty files: implementation/docs from first slice until committed; next slice should continue on `change/nextjs-architecture-refactor`.
- Known blockers: none identified

## Task Checklist

### 1. Planning Quality

- [x] 1.1 Summarize the proposed scope boundary and confirm any unresolved decisions.
- [x] 1.2 Challenge each proposed Story for user-path fit, Epic ownership, and unnecessary UI-task fragmentation.
- [x] 1.3 Refine Requirements and Scenarios into observable behavior, including route, UI, backend orchestration, Convex, failure, and verification boundaries.
- [x] 1.4 Record assumptions, open questions, candidate Stories, and deferred scope instead of silently promoting uncertain behavior into accepted Requirements.
- [x] 1.5 Confirm the planned `Verified By` sections can become scenario-mapped evidence indexes.

### 2. Epic Artifacts

- [x] 2.1 Do not create a technical architecture Epic for this refactor.
- [x] 2.2 Update LC-001 `Implemented By` maps after implementation moves current code paths.
- [x] 2.3 Update LC-002 `Implemented By` maps after implementation moves current code paths.
- [x] 2.4 Confirm existing LC-001 and LC-002 Story labels, Requirement IDs, and Scenario IDs remain stable.
- [ ] 2.5 Reconcile stale implementation-path truth in existing Epics without changing unrelated product Requirements.

### 3. Architecture Decisions

- [x] 3.1 Confirm `design.md` compares viable technical options.
- [x] 3.2 Create proposed ADR for layered Next.js application boundaries.
- [ ] 3.3 During implementation/review, update ADR status from `Proposed` to `Accepted` only if the implementation and review validate it.

### 4. Implementation

- [x] 4.1 Create implementation branch `change/nextjs-architecture-refactor` from `develop`.
- [x] 4.2 Implement Workstream 1: App Router route composition.
  - [x] Requirement R1: Thin Route Files
    - [x] Scenario R1-S1: Home route composes the World container.
    - [x] Scenario R1-S2: Adventure route composes the Adventure play surface.
  - [x] Requirement R2: Route Segment Resilience
    - [x] Scenario R2-S1: Route-level loading state.
    - [x] Scenario R2-S2: Route-level error recovery.
- [ ] 4.3 Implement Workstream 2: Client UI decomposition and state ownership.
  - [ ] Requirement R1: Feature-Level UI Boundaries
    - [x] Scenario R1-S1: Story stream can change without debug formatter changes.
    - [ ] Scenario R1-S2: Debug tab can change without player story layout changes.
  - [ ] Requirement R2: Client Hooks Own Interactive Workflows
    - [ ] Scenario R2-S1: Turn submission workflow is isolated.
    - [ ] Scenario R2-S2: Debug autosave workflow is isolated.
  - [x] Requirement R3: UI Components Do Not Own Backend Rules
    - [x] Scenario R3-S1: Client component imports stay client-safe.
- [x] 4.4 Implement Workstream 3: Game Master Route Handler and server orchestration boundary.
  - [x] Requirement R1: Thin Route Handler
    - [x] Scenario R1-S1: Route handler validates HTTP concerns.
    - [x] Scenario R1-S2: Route handler remains server-only.
  - [x] Requirement R2: Typed Turn Orchestration
    - [x] Scenario R2-S1: Action turn behavior is preserved.
    - [x] Scenario R2-S2: Pass turn behavior is preserved.
    - [x] Scenario R2-S3: Failure behavior is preserved.
  - [x] Requirement R3: Route Contract Stays Stable
    - [x] Scenario R3-S1: Existing E2E client keeps working.
- [ ] 4.5 Implement Workstream 4: Convex world capability modules.
  - [x] Requirement R1: Public Convex Contracts Remain Stable
    - [x] Scenario R1-S1: Existing client functions remain available.
  - [ ] Requirement R2: Convex Internals Are Capability-Focused
    - [x] Scenario R2-S1: Baseline and seed behavior is isolated.
    - [ ] Scenario R2-S2: Snapshot and Game Master context assembly are isolated.
    - [ ] Scenario R2-S3: Turn persistence is isolated.
  - [x] Requirement R3: Pure Helpers Are Testable Outside Convex Runtime
    - [x] Scenario R3-S1: Seed baseline builder lives outside Convex generated API and compiles through Convex.
- [ ] 4.6 Implement Workstream 5: Behavior-preserving verification and traceability.
  - [x] Requirement R1: Existing Product Behavior Is Preserved for completed slices.
  - [ ] Requirement R2: Documentation Maps Match New Code.
- [x] 4.7 Update Story-level Implemented By maps with current code locations.

### 5. Verification

- [x] 5.1 Add or update focused verification for each implemented Requirement and Scenario.
- [ ] 5.2 Update Story-level Verified By maps with scenario-mapped evidence, not chronological command logs.
- [ ] 5.3 Label evidence types where useful: focused automated test, broad supporting gate, deterministic E2E, manual UI confirmation, or debug/log inspection.
- [x] 5.4 Run `npm run ci:required`.
- [x] 5.5 Run `npm run convex:once` if Convex modules or generated API shape are touched.
- [x] 5.6 Run `npm run e2e`.
- [ ] 5.7 Inspect debug logs only if route orchestration movement risks losing Game Master turn evidence.
- [x] 5.8 Verify ADR assumptions or record the remaining decision risk.

### 6. Review And Closeout

- [x] 6.1 Record changelog impact as not required because this is behavior-preserving internal architecture work.
- [ ] 6.2 Run `sdd-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, changelog, ADR consistency, and branch readiness.
- [ ] 6.3 Record review outcome as `review.md`.
- [ ] 6.4 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [ ] 6.5 Record manual UI confirmation status as `not applicable`, `pending Taylor`, `Taylor confirmed`, or `accepted gap`.
- [ ] 6.6 Confirm proposal/design/tasks/review artifacts do not still claim completed work is not implemented, not verified, pending, or accepted under obsolete manual status vocabulary.
- [ ] 6.7 Confirm closeout state has no contradictory Resume Here, checklist, review, manual confirmation, changelog, ADR, PR/merge, deferred-gap, or folder-location claims.
- [ ] 6.8 Create a PR or merge only after `sdd-review` is ready and the app branch policy plus user authorization allow it.
- [ ] 6.9 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-07-03 | Planning | main | proposal/design/tasks/ADR | Proposed full-stack architecture refactor across App Router, client UI, Game Master route, and Convex boundaries without creating a technical Epic. | pending |
| 2026-07-04 | Discovery | main + delegated read-only discovery | app guidance, change artifacts, Next guidance, Convex guidance, current monolith inventory | Selected active change, created `change/nextjs-architecture-refactor`, confirmed no blocking product questions, and scoped first implementation slice to route/client boundary extraction. | uncommitted |
| 2026-07-04 | Route, server, baseline, and formatter extraction | main + frontend/backend discovery agents | `src/app/`, `src/features/play/`, `src/server/director/`, `src/lib/world/`, `convex/world.ts`, docs/Epics | Preserved behavior while moving route composition and Game Master orchestration behind clearer Next/server boundaries; extracted pure debug formatters and Stormbound baseline helper; kept Convex generated public API unchanged. | `841c40f` |

## Specialist Checkpoint

| Date | Slice | Touched Surface / Risk | Specialist Guidance Selected | Loaded / Delegated? | Consequence |
|---|---|---|---|---|---|
| 2026-07-04 | Discovery and Workstreams 1-4 | Next.js App Router, React Client Components, Route Handler, Convex functions, E2E verification | `next-best-practices`, Convex generated AI guidelines, `sdd-apply` specialist routing, delegated frontend/backend discovery | loaded / delegated | Keep pages and route handlers thin, avoid async Client Components or non-serializable Server-to-Client props, keep `/api/director/turn` stable, preserve Convex public contracts, and split implementation into behavior-preserving phases. |
| 2026-07-04 | First implementation slice | Next route files, server-only modules, Convex helper import, browser feature code, package dependency | `next-best-practices`, Convex generated AI guidelines, frontend/backend discovery agents | loaded / delegated | Added `server-only`, mocked it in Vitest, moved pure Convex baseline helper outside `convex/` after generated API drift was detected, and kept UI workflow logic intact while extracting only browser-safe helpers. |

## Verification Ledger

Record proof as it happens. Keep chronological command output here; summarize only durable scenario-mapped evidence into Epic `Verified By`. Do not blur deterministic E2E, live-provider playtests, manual UI confirmation, broad gates, and debug/log inspection into one evidence bucket.

| Date | Check | Evidence Type | What It Proves | Result |
|---|---|---|---|---|
| 2026-07-03 | Artifact self-review | planning review | Proposal, design, tasks, and ADR exist and map the selected full-stack scope. | passed |
| 2026-07-04 | `/sdd-apply` Discovery | implementation planning review | Change artifacts, app guidance, branch policy, current repo state, Next guidance, Convex guidance, and active Epic targets were inspected before code edits. | passed |
| 2026-07-04 | `npm run test -- src/features/play/debug-formatters.test.ts src/app/api/director/turn/route.test.ts src/lib/director/director.test.ts` | focused automated test | Debug formatter extraction, Game Master route behavior, prompt/provider/output behavior, action/pass/failure paths. | passed |
| 2026-07-04 | `npm run ci:required` | broad supporting gate | Lint, all Vitest tests, TypeScript, and production Next build pass after route/server/client/Convex helper movement. | passed |
| 2026-07-04 | `npm run convex:once` | Convex compile/codegen check | Convex functions compile with `convex/world.ts` importing `src/lib/world/stormbound-baseline.ts`; generated API shape no longer includes helper module drift. | passed |
| 2026-07-04 | `npm run e2e` | deterministic E2E | Browser, route, fixture provider, Convex state, Act/Pass, debug editing, reset, and Adventure management still work after the refactor slice. | passed |

## Manual Feedback

Record the user's manual testing feedback after implementation starts.

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| 2026-07-03 | User confirmed scope should include everything, not only UI. | scope decision | Design includes UI, route, server/application, and Convex boundaries. | resolved |

## Planning Updates

Record `/sdd-propose --replan` updates when implementation or feedback discovers planning-level requirements.

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|---|
| 2026-07-03 | Initial proposal. | in-scope planning | proposal.md / design.md / tasks.md created. | `/sdd-apply` from Resume Here |

## Manual UI Confirmation

- Status: pending Taylor because this slice adds route-level loading and error fallback UI, even though deterministic E2E passed.
- App URL / route: `/` and `/adventures/<id>`
- Required setup or test data: seeded Stormbound Chapel demo World with at least one Adventure.
- Steps for the user:
  - Open `/`.
  - Create or continue an Adventure.
  - Submit an Act turn.
  - Submit a Pass turn.
  - Open debug panel and verify Prompt, NPC, Location, and State tabs remain usable.
  - Reset or delete an Adventure only if intentionally testing destructive local flows.
- Expected result:
  - Behavior matches the pre-refactor app.
  - Story stream, turn controls, debug edits, Game Master responses, and Adventure management still work.
- Feedback that would change artifacts:
  - Any visible behavior regression or route fallback mismatch should be recorded as a defect or requirement refinement before closeout.

## Blockers / Open Questions

- None identified.

## Closeout

- Epic files updated: partial; LC-001 and LC-002 implementation paths updated for completed slice
- Story labels/references and Requirement/Scenario IDs current: pending
- Implemented By maps current: partial for completed slice; deeper component/hook split still pending
- Scenario-mapped Verified By maps current: existing evidence remains valid; completed slice evidence recorded in this task ledger
- Superseded earlier Epic truth reconciled: pending
- ADR status: Proposed
- Changelog current: not required
- `sdd-review` verdict: pending
- Review record: pending
- `review.md` findings resolved: pending
- Planning updates resolved: pending
- Manual UI confirmation status: pending Taylor
- PR / merge state: not started
- Deferred scope accepted: remaining tasks stay active, not deferred
- Change moved to `docs/changes/closed/`: no
