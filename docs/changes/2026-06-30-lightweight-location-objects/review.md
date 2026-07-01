# Review: Lightweight Location Objects

## Verdict

changes-requested

The current working tree addresses most of the previous review findings, and `npm run ci:required` passes. The change is not ready to merge because the reviewed implementation is still mostly uncommitted, the post-remediation E2E rerun is blocked by the already-running local Convex process on `:3210`, and the accepted canonical NPC debug parity scope needs deterministic E2E coverage.

2026-07-01 apply update: the required remediation has since been implemented in the working tree. `npm run e2e`, `npm run ci:required`, and `git diff --check` now pass after adding deterministic NPC debug parity coverage, location save flushing, and E2E raw request storage. This review remains a historical `changes-requested` record; run a fresh `/sdd-review` after committing to produce the current gate verdict.

## Gate Scorecard

| Gate | Result | Notes |
|---|---|---|
| Change artifacts | findings | Current artifacts now own Location Cards, movement, canonical NPC debug parity, tavern seed NPCs, and local-only debug posture. Lifecycle state still needed this review update. |
| Epic truth | pass | `LC-001-S12` owns Location Cards/movement and `LC-001-S9` owns canonical NPC debug edit/create/reset semantics. |
| Requirements and Scenarios | findings | Requirements are concrete and traceable; accepted `LC-001-S9 R3` scenarios need deterministic proof. |
| ID traceability | pass | No duplicate active Story IDs found in `docs/epics/**/epic.md`. |
| Tests and verification | remediated after review | `npm run e2e`, `npm run ci:required`, and `git diff --check` pass after post-review remediation. |
| Manual UI confirmation | pass for review | Walkthrough exists and status is pending user; this blocks closeout only if human acceptance is required. |
| Code review | remediated after review | Location edit submit/reset race coverage was addressed with active location-save flushing before submit, seed, and reset. |
| Visual / UX consistency | pass | Debug panel remains aligned with the current utilitarian dark workbench guidance; no obvious visual regression found in code review. |
| Security review | pass for local prototype, findings for remote/shared | Local-only guardrails are improved. Remote/shared deployment still needs auth/rate limits/server-held debug/reset paths before it is safe. |
| Documentation | pass | README, deployment/testing/data/persistence docs now describe local-only debug posture and reset semantics. |
| Changelog | pass | `CHANGELOG.md` covers Location Cards, movement, canonical debug NPC parity, and seeded tavern NPCs. |
| Branch and merge readiness | blocked | Working tree has broad uncommitted app/code/test/docs changes, so source branch is not a stable integration source. |
| PRD alignment | pass | The change stays within the story-first, not-MUD direction and explicitly defers Dungeon/path enforcement. |

## Findings

### BLOCKING

- [ ] Working tree is not a stable review source. `git status --short --branch` shows substantial uncommitted app, test, docs, and review changes on top of source commit `5d24eef Add lightweight location objects`, including `convex/world.ts`, `src/app/world-client.tsx`, `src/app/api/director/turn/route.ts`, director modules, E2E tests, Epic/change artifacts, deleted NPC override files, and untracked docs. Recommendation: commit the intended implementation/artifact state or split/defer unwanted changes, then rerun `/sdd-review`.
  - 2026-07-01 apply update: pending commit at the time of this note.

### REQUIRED

- [x] `tests/e2e/lorecraft-playtest.spec.ts:50` - E2E covers Locations and movement, but it does not exercise accepted `LC-001-S9 R3` canonical NPC edit/create/reset behavior. The current Epic requires the `NPCs` tab to show fields, save values into Game Master context, reset seeded NPCs, and create current-location NPCs. Recommendation: add deterministic browser coverage for opening the NPC tab, editing at least one seeded NPC field, clearing a fact, creating a debug NPC, and confirming Reset Session removes debug-created NPCs/restores seeded values.
  - 2026-07-01 apply update: remediated. E2E now edits Mira, clears knowledge, creates a debug NPC in the Chapel, verifies raw request context, and confirms Reset Session removes debug-created NPCs/restores seeded values.
- [x] `tasks.md:131` - Post-remediation `npm run e2e` is still blocked because `convex-lo` PID `6852` is listening on `:3210`, and this change touches browser, Next route, Convex state, provider adapter, and persistence-loop behavior. Recommendation: rerun `npm run e2e` when the E2E Convex port is free, or have Taylor explicitly accept the blocked E2E gap before integration.
  - 2026-07-01 apply update: remediated. The stale E2E/dev processes were stopped and `npm run e2e` passed.
- [x] `src/app/world-client.tsx:196` and `src/app/world-client.tsx:430` - Player submit flushes queued NPC saves, but location edits still save asynchronously on blur and are not flushed before turn submit or reset. Existing E2E waits for "Location saved.", so it does not prove immediate submit/reset after a location edit avoids stale context or stale writes. Recommendation: either add equivalent location save flushing/race handling or record immediate location-edit submit/reset as an accepted manual-only gap.
  - 2026-07-01 apply update: remediated. Active location saves are tracked and flushed before submit, seed, and reset.
- [x] `docs/changes/2026-06-30-lightweight-location-objects/tasks.md:90` - Manual UI status is recorded as pending user, but closeout checklist item 5.4 remains unchecked. Recommendation: mark 5.4 complete because the status is recorded, while leaving manual confirmation itself pending.
  - 2026-07-01 apply update: remediated.
- [x] `src/app/api/director/turn/route.ts:538` and `convex/world.ts:2041` - Remote/shared deployment remains unsafe without real auth/rate limiting/server-held controls. The route rejects non-local requests by default, but `LORECRAFT_ALLOW_REMOTE_DIRECTOR=1` reopens anonymous provider spend unless paired with a stronger access boundary; Convex seed/reset/debug APIs are also public if exposed through a shared deployment. Recommendation: keep this as a documented local-prototype limitation for now, and require auth/ownership/rate limiting/internal server routes before any remote/shared deployment.
  - 2026-07-01 apply update: accepted as a documented local-prototype limitation; remote/shared hardening remains deferred scope.

### SUGGESTION

- [x] `docs/changes/2026-06-30-lightweight-location-objects/tasks.md:10` - Tasks currently call E2E/manual confirmation "Known blockers" while Closeout also lists them as deferred scope. Recommendation: before merge, choose one posture for each: blocker, accepted gap, or pending non-blocking follow-up.
  - 2026-07-01 apply update: remediated. E2E is passed, manual UI confirmation is pending user, and live-provider/remote hardening items are deferred scope.

## Verification Evidence

- `git merge-tree --write-tree develop HEAD`: passed with tree `5c54a57a9ee699a86ede576d96f46fbcbade92dc`.
- `git diff --check`: passed.
- `npm run ci:required`: passed on the current working tree.
- `lsof -nP -iTCP:3210 -sTCP:LISTEN`: confirmed `convex-lo` PID `6852` is listening on `:3210`.
- `npm run e2e`: not rerun after remediation because the configured E2E Convex port is already occupied and the dev server was intentionally left running.
- 2026-07-01 apply update: `npm run e2e` passed after freeing the E2E ports.
- 2026-07-01 apply update: `npm run ci:required` passed after final remediation.
- 2026-07-01 apply update: `git diff --check` passed after final remediation.

## Review Bundle

- Source branch/ref: `change/lightweight-location-objects`
- Target branch/ref: `develop`
- Merge base: `25047a2baae2eb6431bb8b4c1b30c126b59a5695`
- Source-only commits: `5d24eef Add lightweight location objects`
- Target-only commits: none observed
- Changed files: source branch has the initial Location implementation; working tree adds remediation across Convex, Director route, UI, tests, docs, and deleted NPC override files.
- Diff stat: source branch `19 files changed, 2224 insertions(+), 109 deletions(-)`; working tree `20 files changed, 1439 insertions(+), 1121 deletions(-)` plus untracked docs.
- Conflict check: clean committed merge tree.
- Dirty state: app repo dirty with intended implementation/remediation files and untracked docs/review artifacts.
- Branch policy: source `change/*` to target `develop` matches app policy, but merge readiness is blocked by uncommitted implementation state.

## Delegated Review Passes

| Pass | Reviewer | Result | Notes |
|---|---|---|---|
| Artifact truth | Dirac `019f1cf6-9e49-7e12-bc06-3877343f7d69` | findings | Scope ownership is now mostly correct; dirty source, stale review state, and checklist inconsistency block readiness. |
| Code diff | main thread | findings | Current remediation resolves old NPC fact/reset/label issues; location save race coverage remains weak. |
| Verification coverage | Harvey `019f1cf7-1517-7292-96aa-dcb48aa28efa` | changes requested | E2E rerun blocked; NPC debug parity lacks deterministic coverage. |
| Security | Newton `019f1cf6-c645-7650-b758-b52d4a286a38` | pass local / findings remote | Local prototype posture improved; remote/shared deployment still needs real auth/rate limiting/server-held debug and reset paths. |
| UI / visual identity | Harvey `019f1cf7-1517-7292-96aa-dcb48aa28efa` | pass | No obvious visual regression in code review; no screenshot pass was run. |
| Docs / changelog / PRD | Dirac `019f1cf6-9e49-7e12-bc06-3877343f7d69` | pass with lifecycle findings | Docs/changelog now own expanded scope; lifecycle artifacts needed current review result. |
| Integration readiness | main thread | blocked | Dirty app repo and blocked E2E prevent ready verdict. |

## PR / Merge Readiness

- Source branch: `change/lightweight-location-objects`
- Target branch: `develop`
- Conflict check: clean for committed `HEAD`
- Commit state: blocked by broad uncommitted implementation/remediation changes
- PR status: not created
- Merge status: not ready

## Review Log

- 2026-07-01: Fresh `/sdd-review` after remediation completed with delegated artifact, verification/UI, and security passes. Verdict remains changes requested.
- 2026-07-01: `/sdd-apply` remediated the current review findings in the working tree. A fresh `/sdd-review` is required after commit for the current verdict.
