# Review: Provider-Agnostic Narrative Director MVP

## Verdict

changes-requested

## Gate Scorecard

| Gate | Result | Notes |
|---|---|---|
| Change artifacts | remediated | Proposal/design/tasks agree after `/th-apply`; `tasks.md` now records the persistence/data-model documentation work. |
| Epic truth | remediated | Epic exists and now uses stable Story IDs plus local Requirement and Scenario IDs. |
| Requirements and Scenarios | pass | In-scope behavior is implemented or explicitly deferred; malformed-input recovery path has been added. |
| ID traceability | remediated | Story IDs, local `R#` Requirement IDs, and local `R#-S#` Scenario IDs were added. |
| Tests and verification | remediated | `npm run test`, `npm run lint`, `npm run build`, `git diff --check`, runtime malformed-ID check, and `npm run convex:once` passed after remediation. |
| Code review | remediated | `/api/director/turn` now catches malformed Convex world IDs and returns structured `400` JSON. |
| Security review | remediated | Malformed public route input now has a clean failure path; no secrets committed and raw local LLM log text remains gated. `npm audit --omit=dev` reports an inherited moderate Next/PostCSS advisory not introduced by this change. |
| Documentation | remediated | README, persistence strategy, data model docs, Epic, design, and tasks now acknowledge the added docs and trace IDs. |
| Changelog | pass | `CHANGELOG.md` has a public-safe Unreleased entry for the narrative Director MVP. |
| Branch and merge readiness | pending commit | Source branch is correct and target is `main`; `/th-apply` verification passed and the complete change set is ready to commit. |
| PRD alignment | pass | Change remains aligned with Lorecraft's state-first persistent-world memory spike direction. |

## Findings

### BLOCKING

- None.

### REQUIRED

- [x] `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md:11` - The Epic uses narrative Story/Requirement/Scenario headings without stable Story IDs, local `R#` Requirement IDs, or local `R#-S#` Scenario IDs. This fails the current TH review ID traceability gate and makes future implementation, verification, and review references less stable. Recommendation: assign stable Story IDs to each Story and local Requirement/Scenario IDs under each Story, then update `tasks.md` and verification references to use those IDs. Addressed during `/th-apply` by adding `LC-001-S#`, `R#`, and `R#-S#` IDs to the Epic and change design/tasks.
- [x] `src/app/api/director/turn/route.ts:246` - `worldId` is only checked as a non-empty string before being cast to `Id<"worlds">`. A malformed value such as `"not-a-convex-id"` causes the route to return an unhandled `500 Internal Server Error` instead of the structured `TurnResponse` error shape. This is a public input-handling and recovery-path gap. Recommendation: validate or safely catch invalid Convex ID/query errors and return a structured `400` or `404` without calling the LLM. Addressed during `/th-apply` with context-load error normalization and a runtime `400` check.
- [x] `docs/changes/2026-06-27-provider-agnostic-chat-mvp/tasks.md:97` - The task/manual feedback ledger does not record the later persistence strategy and canonical data-model documentation now added as `docs/persistence-system.md` and `docs/data-model.md`. This makes the change artifacts drift from repo reality. Recommendation: add a manual feedback or documentation slice plus verification evidence for those docs before closeout. Addressed during `/th-apply` by adding the persistence documentation slice and verification ledger entries.
- [x] `git status --short` - The source branch has related modified and untracked files, including code, docs, `src/lib/director/debug-log.ts`, `docs/persistence-system.md`, and `docs/data-model.md`. The branch cannot be PR/merge ready until these are committed or intentionally excluded. Recommendation: after review findings are addressed, stage and commit the complete change set on `feature/provider-agnostic-chat-mvp`. Addressed during `/th-apply`; final commit is the last remediation step.

### SUGGESTION

- [ ] `package.json:19` - `npm audit --omit=dev --audit-level=moderate` reports a moderate advisory in Next's transitive PostCSS dependency. This appears inherited from the selected Next version rather than introduced by this change, and `npm audit fix --force` recommends an invalid downgrade, so it should not block this local MVP review. Recommendation: track and upgrade Next/PostCSS when a compatible stable fix is available.

## Verification Evidence

- `npm run test`: passed, 1 test file and 10 tests.
- `npm run lint`: passed.
- `npm run build`: passed; Next built `/` and dynamic `/api/director/turn`.
- `git diff --check`: passed.
- `curl -X POST /api/director/turn` with `worldId: "not-a-convex-id"`: returned `500 Internal Server Error`, confirming the malformed-ID finding.
- `npm run convex:once`: blocked because the local Convex backend was already running on port `3210`.
- `CONVEX_AGENT_MODE=anonymous npx convex run world:getDefaultWorld`: returned the active seeded world ID, proving the local Convex backend was reachable.
- `logs/director-debug.jsonl`: contains opt-in local Director debug records with route stage, provider/model, request summary, accepted/ignored counts, response length, and timings.
- `npm audit --audit-level=moderate --omit=dev`: reported a moderate inherited Next/PostCSS advisory.

## Remediation Evidence

- `npm run test`: passed, 1 test file and 12 tests.
- Artifact ID scan: passed; Epic and change design no longer contain un-IDed Story, Requirement, or Scenario headings.
- `npm run lint`: passed.
- `npm run build`: passed; Next built `/` and dynamic `/api/director/turn`.
- `git diff --check`: passed.
- `curl -X POST /api/director/turn` with `worldId: "not-a-convex-id"`: returned `400 Bad Request` with structured JSON: `{"ok":false,"error":"The selected world id is invalid. Seed or reload the world and try again."}`.
- `npm run convex:once`: passed after stopping the live dev backend that held port `3210`.

## PR / Merge Readiness

- Source branch: `feature/provider-agnostic-chat-mvp`
- Target branch: `main`
- Conflict check: no committed source/target conflict found; target is an ancestor of the source commit, but dirty/untracked changes must be committed before final PR/merge readiness.
- Commit state: remediation verified; local commit pending as the final `/th-apply` step.
- PR status: not created; not authorized by this review invocation.
- Merge status: not performed; not authorized by this review invocation.

## Review Log

- 2026-06-27: Review created with `changes-requested` verdict.
- 2026-06-27: `/th-apply` remediation addressed required findings; rerun `/th-review` for a fresh official gate verdict after commit.
