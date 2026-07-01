# Tasks: End To End Testing

## Resume Here

- Current state: implemented; ready for `/sdd-review`
- Last completed action: deterministic E2E and required CI passed; implementation committed
- Next action: run `/sdd-review`
- Active branch/ref: `change/end-to-end-testing`
- Branch note: branch policy compliant for planned test/config/runtime implementation; target branch is `develop`
- Expected dirty files: pre-existing `docs/ci-cd.md` frontmatter edit preserved in the working tree
- Known blockers: none

## Task Checklist

### 1. Epic Artifacts

- [x] 1.1 Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` with Story `LC-001-S11`.
- [x] 1.2 Confirm `LC-001-S11` has app-unique stable Story ID, local Requirement IDs, local Scenario IDs, Implemented By, Verified By, and Verification Gaps.
- [x] 1.3 Refresh existing Story verification maps when Playwright evidence closes current browser/runtime gaps.

### 2. Implementation

- [x] 2.1 Create implementation branch `change/end-to-end-testing` from `develop`.
- [x] 2.2 Add Playwright configuration and npm scripts.
  - [x] Story: `LC-001-S11` - End To End Playtest Verification
    - [x] Requirement R4: CI And Script Boundaries
      - [x] Scenario R4-S1: Required CI remains cheap
      - [x] Scenario R4-S2: Deterministic E2E has a dedicated script
      - [x] Scenario R4-S3: Live-provider playtests remain optional
- [x] 2.3 Add deterministic OpenAI-compatible fixture provider support.
  - [x] Story: `LC-001-S11` - End To End Playtest Verification
    - [x] Requirement R3: Deterministic Provider Fixture
      - [x] Scenario R3-S1: Fixture provider returns story prose
      - [x] Scenario R3-S2: Fixture provider returns extraction output
      - [x] Scenario R3-S3: Fixture requests remain inspectable
- [x] 2.4 Add browser E2E for the seeded-world story loop.
  - [x] Story: `LC-001-S11` - End To End Playtest Verification
    - [x] Requirement R1: Browser Playtest Flow
      - [x] Scenario R1-S1: Seeded world can start the playtest
      - [x] Scenario R1-S2: Player submits a narrative turn
      - [x] Scenario R1-S3: Reload preserves the turn
- [x] 2.5 Add browser E2E for debug drawer, turn evidence, and reset behavior.
  - [x] Story: `LC-001-S11` - End To End Playtest Verification
    - [x] Requirement R2: Debug And Reset Verification
      - [x] Scenario R2-S1: Debug drawer toggles without breaking play
      - [x] Scenario R2-S2: Debug turn evidence is visible
      - [x] Scenario R2-S3: Reset returns to a clean playtest state
- [x] 2.6 Update Story-level Implemented By maps with current code locations.

### 3. Verification

- [x] 3.1 Run `npm run ci:required`.
- [x] 3.2 Run the new deterministic Playwright E2E script.
- [x] 3.3 If implementation adds fixture-backed route/script checks outside Playwright, run those focused checks.
- [x] 3.4 Optionally run live-provider `npm run playtest:director` or `npm run playtest:director:transcript` only when local model diagnostics are needed.
- [x] 3.5 Update Story-level Verified By maps with concrete evidence.

### 4. Documentation

- [x] 4.1 Update `README.md` with Playwright setup and E2E commands.
- [x] 4.2 Update `docs/ci-cd.md` to place deterministic E2E in the optional/release-gateable check layer.
- [x] 4.3 Update `CHANGELOG.md` under `Unreleased` / `Added`.

### 5. Review And Closeout

- [ ] 5.1 Run `sdd-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, changelog, and branch readiness.
- [ ] 5.2 Record review outcome as a `review.md` path, a clean review recorded in this ledger, or an explicit Taylor-approved review waiver.
- [ ] 5.3 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [ ] 5.4 Record manual UI confirmation status as `not applicable`, `pending Taylor`, `Taylor confirmed`, or `accepted gap`.
- [ ] 5.5 Confirm closeout state has no contradictory Resume Here, checklist, review, manual confirmation, changelog, PR/merge, deferred-gap, or folder-location claims.
- [ ] 5.6 Create a PR or merge only after `sdd-review` is ready and the app branch policy plus Taylor authorization allow it.
- [ ] 5.7 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-06-30 | Proposal | main with `sdd-propose` | `docs/changes/2026-06-30-end-to-end-testing/` | Proposed `LC-001-S11` and deterministic Playwright E2E strategy | committed |
| 2026-06-30 | Discovery / branch preflight | main with `sdd-apply` | change artifacts, branch policy, git status | Selected active change, confirmed no blocking questions, created compliant `change/end-to-end-testing` branch; pre-existing `docs/ci-cd.md` frontmatter edit preserved | committed |
| 2026-06-30 | Delegation check | main with `sdd-apply` | tool policy | Skipped default subagent delegation because the available multi-agent tool requires explicit user delegation; kept implementation local | committed |
| 2026-06-30 | LC-001-S11 implementation | main with Playwright and local Next docs; Convex guidelines checked because E2E drives Convex state | `playwright.config.ts`, `scripts/llm-fixture-server.mjs`, `scripts/e2e-next-server.mjs`, `tests/e2e/lorecraft-playtest.spec.ts`, `vitest.config.ts`, package files | Added deterministic fixture-backed browser E2E for seed/reset, Enter submission, pending state, persisted reload, debug drawer, Game Master evidence, and reset reuse | committed |
| 2026-06-30 | Documentation and Epic reconciliation | main | LC-001 Epic, README, `docs/ci-cd.md`, CHANGELOG, change artifacts | Documented E2E scripts, optional CI placement, deterministic fixture behavior, and current verification evidence | committed |

## Verification Ledger

Record proof as it happens.

| Date | Check | What It Proves | Result |
|---|---|---|---|
| 2026-06-30 | Artifact self-check | Proposal/design/tasks exist and identify apply-ready `LC-001-S11` scope | passed |
| 2026-06-30 | `npm run typecheck` | Playwright config/specs and test harness typecheck with the app | passed |
| 2026-06-30 | `npm run lint` | Playwright config/specs and scripts satisfy lint rules | passed |
| 2026-06-30 | `npm run e2e:install` | Local Chromium browser is installed for Playwright | passed |
| 2026-06-30 | `npm run e2e` | Deterministic browser E2E covers `LC-001-S11` R1-R4 through browser, Next route, Convex state, and fixture provider adapter | passed |
| 2026-06-30 | `npm run ci:required` | Required local gate: lint, Vitest unit tests, typecheck, and production build | passed |
| 2026-06-30 | Test server cleanup check | E2E fixture, Convex, and Next test ports were not left listening after successful run | passed |
| 2026-06-30 | `npm audit --omit=dev` | Production dependency audit | failed: existing Next/PostCSS moderate advisory; `npm audit fix --force` would install incompatible Next 9.3.3, so no automated fix applied |

## Manual Feedback

Record Taylor's manual testing feedback after implementation starts.

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| YYYY-MM-DD | TBD | defect / verification gap / artifact drift / requirement refinement / scope expansion / product drift | TBD | open |

## Planning Updates

Record `/sdd-propose --replan` updates when implementation or feedback discovers planning-level requirements.

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|---|
| YYYY-MM-DD | TBD | in-scope refinement / scope expansion / product drift / Epic ownership change / technical constraint / follow-up change | proposal.md / design.md / tasks.md | `/sdd-apply` TBD |

## Manual UI Confirmation

- Status: pending Taylor
- App URL / route: `http://localhost:3000`
- Required setup or test data: local app seeded through the E2E flow; deterministic fixture provider for automated checks
- Steps for Taylor: after implementation, run the documented E2E command or observe Codex running it; optionally spot-check the app manually after the test completes
- Expected result: `npm run e2e` passes; a browser-driven test can seed/reset, submit a narrative turn, see the persisted response, inspect debug evidence, reload, and continue
- Feedback that would change artifacts: wanting hosted E2E in required CI immediately, wanting real-model E2E as a release gate, or wanting visual snapshot coverage in this same change

## Questions And Readiness

### Blocking Questions

- None.

### Implementation-Discovery Questions

- Best E2E server orchestration:
  - Resolved path: Playwright `webServer` starts fixture, Convex, and a production-style Next app stack separately on test ports. The initial `convex dev --start "next dev"` path was rejected because Next 16 blocks a second dev server for the same repo while Taylor's normal dev server is running.
  - Evidence: `npm run e2e` passed and post-run port checks showed no lingering test servers.
  - Replan trigger: hosted CI or repeated local runs show this split stack is still too slow or flaky.
- Minimal stable selector strategy:
  - Default path: use canonical IDs and accessible names, adding only small missing hooks where needed.
  - Evidence needed: tests avoid brittle CSS path selectors.
  - Replan trigger: the current UI lacks stable hooks for critical controls.

### Deferred Scope

- Visual regression screenshot baselines.
- Cross-browser matrix beyond the first Chromium smoke path.
- Required real-model/provider E2E.
- Hosted branch-protection E2E.
- Load, concurrency, rollback, or mobile-native testing.

### Apply Readiness

- Status: ready
- Reason: implementation is complete, deterministic E2E and required CI pass, and remaining work is local PR-style review plus Taylor manual confirmation.

## Closeout

- Epic files updated: yes, `LC-001-S11` added to LC-001
- Story/Requirement/Scenario IDs current: yes
- Implemented By maps current: yes
- Verified By maps current: yes
- Changelog current: yes
- `sdd-review` verdict: pending
- Review record: pending
- `review.md` findings resolved:
- Planning updates resolved:
- Manual UI confirmation status:
- PR / merge state:
- Deferred scope accepted:
- Change moved to `docs/changes/closed/`:
