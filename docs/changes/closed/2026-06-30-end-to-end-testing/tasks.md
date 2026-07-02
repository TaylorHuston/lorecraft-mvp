# Tasks: End To End Testing

## Resume Here

- Current state: closed after local merge to `develop`
- Last completed action: merged `change/end-to-end-testing` into `develop` and closed this change folder
- Next action: no action required for this change; use `/sdd-release` later for promotion to `main`
- Active branch/ref: `develop`
- Branch note: implementation branch `change/end-to-end-testing` was locally merged into `develop`
- Expected dirty files: none in the app repo after review remediation is committed
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
- [x] 2.7 Address review-found default-world loading race so the seed-empty state is not rendered while Convex is still loading the default world.
- [x] 2.8 Address delegated review findings for local-only E2E guardrails, Convex reuse prevention, port validation, and accepted extraction assertions.
- [x] 2.9 Address fresh delegated review finding so `LORECRAFT_E2E_BASE_URL` cannot point at a different loopback app than the configured E2E app port.

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

- [x] 5.1 Run `sdd-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, changelog, and branch readiness.
- [x] 5.2 Record review outcome as a `review.md` path, a clean review recorded in this ledger, or an explicit Taylor-approved review waiver.
- [x] 5.3 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [x] 5.4 Record manual UI confirmation status as `not applicable`, `pending Taylor`, `Taylor confirmed`, or `accepted gap`.
- [x] 5.5 Confirm closeout state has no contradictory Resume Here, checklist, review, manual confirmation, changelog, PR/merge, deferred-gap, or folder-location claims.
- [x] 5.6 Create a PR or merge only after `sdd-review` is ready and the app branch policy plus Taylor authorization allow it.
- [x] 5.7 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-06-30 | Proposal | main with `sdd-propose` | `docs/changes/2026-06-30-end-to-end-testing/` | Proposed `LC-001-S11` and deterministic Playwright E2E strategy | committed |
| 2026-06-30 | Discovery / branch preflight | main with `sdd-apply` | change artifacts, branch policy, git status | Selected active change, confirmed no blocking questions, created compliant `change/end-to-end-testing` branch; pre-existing `docs/ci-cd.md` frontmatter edit preserved | committed |
| 2026-06-30 | Delegation check | main with `sdd-apply` | tool policy | Skipped default subagent delegation because the available multi-agent tool requires explicit user delegation; kept implementation local | committed |
| 2026-06-30 | LC-001-S11 implementation | main with Playwright and local Next docs; Convex guidelines checked because E2E drives Convex state | `playwright.config.ts`, `scripts/llm-fixture-server.mjs`, `scripts/e2e-next-server.mjs`, `tests/e2e/lorecraft-playtest.spec.ts`, `vitest.config.ts`, package files | Added deterministic fixture-backed browser E2E for seed/reset, Enter submission, pending state, persisted reload, debug drawer, Game Master evidence, and reset reuse | committed |
| 2026-06-30 | Documentation and Epic reconciliation | main | LC-001 Epic, README, `docs/ci-cd.md`, CHANGELOG, change artifacts | Documented E2E scripts, optional CI placement, deterministic fixture behavior, and current verification evidence | committed |
| 2026-06-30 | Review remediation | main with `sdd-review` | `src/app/world-client.tsx`, LC-001 Epic, change review artifacts | Fixed default-world loading race exposed by review E2E rerun; seed-empty state no longer appears while Convex is still loading the default world | review-fix commit |
| 2026-07-01 | Delegated review remediation | main with delegated `sdd-review` passes | `playwright.config.ts`, `tests/e2e/lorecraft-playtest.spec.ts`, README, LC-001 Epic, change artifacts | Added loopback-only E2E base URL guard, E2E port validation, no-reuse Convex startup, accepted NPC extraction assertion, and stale artifact cleanup | review-fix commit |
| 2026-07-01 | Fresh delegated review remediation | main with delegated `sdd-review` passes | `playwright.config.ts`, README, change artifacts, `docs/ci-cd.md` metadata | Tightened `LORECRAFT_E2E_BASE_URL` to the configured E2E app origin/port, documented the constraint, and resolved app-repo dirty state for integration readiness | review-fix commit |
| 2026-07-01 | Merge and closeout | main with Taylor authorization | `develop`, change folder | Merged `change/end-to-end-testing` into `develop` and closed the active change folder | merge `09c73fd` |

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
| 2026-06-30 | Review rerun: `npm run ci:required` | Safe review fix preserves lint, Vitest, typecheck, and production build | passed |
| 2026-06-30 | Review rerun: `npm run e2e` | Safe review fix resolves seed-button race and preserves deterministic browser E2E path | passed |
| 2026-06-30 | Review rerun: test server cleanup check | E2E fixture, Convex, and Next test ports were not left listening after successful rerun | passed |
| 2026-06-30 | Review rerun: `git merge-tree --write-tree develop change/end-to-end-testing` | Updated source branch can merge cleanly into `develop` without performing the merge | passed |
| 2026-06-30 | Review rerun: `npm audit --omit=dev` | Production dependency audit after dependency addition | failed: existing Next/PostCSS moderate advisory; `npm audit fix --force` would install incompatible Next 9.3.3, so no automated fix applied |
| 2026-07-01 | Delegated review: artifact truth | Proposal/design/tasks/Epic/review consistency | changes requested: stale implemented/verified design text, stale LC-001-S1 browser gap, stale manual-status checklist, and stale review verdict were found |
| 2026-07-01 | Delegated review: code/security | E2E harness safety, local mutation boundaries, dependency/security review | changes requested: remote base URL mutation risk, Convex reuse risk, and port env validation suggestion were found |
| 2026-07-01 | Delegated review: verification/docs/integration | R1-R4 coverage, docs/changelog accuracy, merge readiness | changes requested: missing R3-S2 accepted extraction assertion and stale lifecycle state were found |
| 2026-07-01 | Delegated review rerun: `npm run ci:required` | Safe delegated review fixes preserve lint, Vitest, typecheck, and production build | passed |
| 2026-07-01 | Delegated review rerun: `npm run e2e` | Safe delegated review fixes preserve deterministic browser E2E with accepted extraction assertion | passed |
| 2026-07-01 | Delegated review rerun: test server cleanup check | E2E fixture, Convex, and Next test ports were not left listening after successful rerun | passed |
| 2026-07-01 | Delegated review rerun: `LORECRAFT_E2E_BASE_URL=https://example.com npx playwright test --list` | E2E config refuses non-loopback targets before starting destructive browser flows | passed: failed closed with expected loopback error |
| 2026-07-01 | Delegated review rerun: `npm audit --omit=dev` | Production dependency audit after dependency addition | failed: existing Next/PostCSS moderate advisory; `npm audit fix --force` would install incompatible Next 9.3.3, so no automated fix applied |
| 2026-07-01 | Fresh delegated review: artifact truth | Proposal/design/tasks/Epic/review consistency, ID traceability, lifecycle state | passed |
| 2026-07-01 | Fresh delegated review: code/security | E2E harness safety, local mutation boundaries, dependency/security review | passed |
| 2026-07-01 | Fresh delegated review: verification/docs/integration | R1-R4 coverage, docs/changelog accuracy, merge readiness | changes requested: `LORECRAFT_E2E_BASE_URL` could still point at a different loopback app than the E2E stack |
| 2026-07-01 | Fresh review rerun: `npm run ci:required` | Required local gate after fresh review remediation | passed |
| 2026-07-01 | Fresh review rerun: `npm run e2e` | Deterministic browser E2E after base-URL isolation fix | passed |
| 2026-07-01 | Fresh review rerun: `LORECRAFT_E2E_BASE_URL=https://example.com npx playwright test --list` | E2E config refuses non-loopback targets | passed: failed closed with expected loopback error |
| 2026-07-01 | Fresh review rerun: `LORECRAFT_E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test --list` | E2E config refuses a different loopback app port than the configured E2E app port | passed: failed closed with expected E2E app port error |
| 2026-07-01 | Fresh review rerun: `lsof -nP -iTCP:3101 -iTCP:3102 -iTCP:3210 -sTCP:LISTEN` | E2E fixture, Convex, and Next test ports were not left listening after successful rerun | passed |
| 2026-07-01 | Fresh review rerun: `git merge-tree --write-tree develop change/end-to-end-testing` | Source branch can merge cleanly into `develop` without performing the merge | passed |
| 2026-07-01 | Fresh review rerun: `npm audit --omit=dev` | Production dependency audit after dependency addition | failed: existing Next/PostCSS moderate advisory; `npm audit fix --force` would install incompatible Next 9.3.3, so no automated fix applied |
| 2026-07-01 | Closeout pre-merge: `npm run ci:required` | Required gate immediately before local integration | passed |
| 2026-07-01 | Closeout merge: `git merge --no-ff change/end-to-end-testing` | Local integration into `develop` | passed: merge commit `09c73fd` |

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
- Reason: implementation is complete, deterministic E2E and required CI pass, delegated review is clean after safe remediation, and closeout is complete.

## Closeout

- Epic files updated: yes, `LC-001-S11` added to LC-001
- Story/Requirement/Scenario IDs current: yes
- Implemented By maps current: yes
- Verified By maps current: yes
- Changelog current: yes
- `sdd-review` verdict: ready
- Review record: `docs/changes/closed/2026-06-30-end-to-end-testing/review.md`
- `review.md` findings resolved: yes
- Planning updates resolved: yes
- Manual UI confirmation status: pending Taylor
- PR / merge state: locally merged into `develop` with merge commit `09c73fd`; no remote PR requested
- Deferred scope accepted: visual regression, cross-browser matrix, required real-model/provider E2E, hosted branch-protection E2E, load/concurrency/rollback/mobile testing remain deferred
- Change moved to `docs/changes/closed/`: yes
