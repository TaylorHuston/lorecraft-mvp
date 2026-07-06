# Review: Next.js Architecture Refactor

## Verdict

changes-requested; apply follow-up addressed listed findings and a fresh `/sdd-review` is still required before merge readiness

## Gate Scorecard

| Gate | Result | Notes |
|---|---|---|
| Change artifacts | addressed after review | Apply follow-up updated `tasks.md` to implementation-complete state; fresh review still pending. |
| Epic truth | addressed after review | LC-001 and LC-002 implementation and evidence maps now include the completed client and Convex helper splits. |
| Requirements and Scenarios | addressed after review | Workstream 2 and Workstream 4 scenarios are checked complete after apply follow-up. |
| Story reference traceability | addressed after review | Story labels remain stable and implementation paths were reconciled. |
| Tests and verification | pass | `npm run ci:required` and `npm run e2e` passed during review after a timer typing fix. |
| Manual UI confirmation | findings | Manual UI confirmation remains `pending Taylor`; latest turn-control polish also needs manual confirmation if kept in this change. |
| Code review | findings | A TypeScript timer mismatch was fixed during review. Remaining source repo dirty files must be committed or explicitly split before readiness. |
| Visual / UX consistency | findings | Latest turn-control styling is coherent with the app direction, but it is broader than the architecture-refactor design's behavior-preserving scope. |
| Security review | pass | No new auth, secret, provider, persistence, or network exposure was added by the latest UI edits; existing server-only route split still keeps provider flow server-side. |
| Documentation | addressed after review | Architecture docs, ADR status, Epic maps, and active ledger were reconciled after apply follow-up. |
| Changelog | pass | No changelog entry required for the architecture slice; latest UI polish is local MVP interaction polish and should not be release-noted unless retained as user-facing release scope. |
| Branch and merge readiness | pending fresh review | Implementation is complete after apply follow-up; commit and fresh `/sdd-review` remain before merge readiness. |
| PRD alignment | not applicable | No product-direction drift requiring PRD update was identified in this review pass. |

## Findings

### BLOCKING

- None.

### REQUIRED

- [x] `docs/changes/2026-07-03-nextjs-architecture-refactor/tasks.md:46` - Workstream 2 remains incomplete: debug tab separation and turn/debug autosave hook ownership are still unchecked. Recommendation: continue `/sdd-apply` for the remaining client decomposition work or replan the active change to explicitly defer the remaining scenarios.
  - 2026-07-05 apply update: extracted Adventure landing, debug shell/tab mechanics, NPC autosave, and Location save workflows; reran `npm run ci:required` and `npm run e2e`.
- [x] `docs/changes/2026-07-03-nextjs-architecture-refactor/tasks.md:65` - Workstream 4 remains incomplete beyond baseline extraction; snapshot/context and turn-persistence capability splits are still unchecked. Recommendation: complete those Convex capability slices or explicitly narrow/defer them in the change artifacts.
  - 2026-07-05 apply update: extracted snapshot read model, Game Master context read model, transcript context read model, and turn-persistence accepted-update helpers; reran `npm run ci:required`, `npm run convex:once`, and `npm run e2e`.
- [x] `docs/changes/2026-07-03-nextjs-architecture-refactor/tasks.md:82` - Scenario-mapped Epic `Verified By` updates remain pending. Recommendation: update LC-001 and LC-002 evidence maps so they cite the completed slice and current file paths rather than relying only on the chronological task ledger.
  - 2026-07-05 update: LC-001-S1 and LC-001-S5 now cite `src/features/play/turn-action-panel.tsx` and 2026-07-05 `npm run ci:required` / `npm run e2e` evidence for the extracted Act/Pass/input path. Broader Epic evidence cleanup remains tied to unfinished workstreams.
  - 2026-07-05 apply update: LC-001 and LC-002 now cite the extracted play feature files and Convex helper modules for the completed Workstream 2 and Workstream 4 slices.
- [x] `docs/changes/2026-07-03-nextjs-architecture-refactor/tasks.md:150` - Manual UI confirmation is still `pending Taylor`, and the latest turn-control UI polish changed visible interaction behavior after that walkthrough was written. Recommendation: update the walkthrough to include the Act expansion, close animation, Pass hover behavior, and response-area sizing, then record Taylor confirmation or an accepted gap.
  - 2026-07-05 update: the manual UI checklist now includes Act expansion, close animation, response-area size/alignment, and Pass hover behavior. Status remains pending Taylor.
- [x] `docs/changes/2026-07-03-nextjs-architecture-refactor/design.md:37` and `src/features/play/world-client.tsx:873` - The uncommitted Act/Pass/input animation polish is broader than the architecture refactor design's stated non-goal of avoiding broad styling changes. Recommendation: either commit it under a separate UI-polish change or replan this change to include the approved interaction polish explicitly.
  - 2026-07-05 update: proposal/design now record explicitly approved turn-control polish as part of Workstream 2 extraction, without changing the product model.
- [x] `src/features/play/world-client.tsx:914` - The app source repo has uncommitted implementation changes in `src/app/globals.css` and `src/features/play/world-client.tsx`. Recommendation: commit the verified UI polish in the correct change scope before treating the branch as merge-ready.
  - 2026-07-05 apply update: pending commit from this apply run includes the extracted client and Convex helper slices; final merge readiness still requires a fresh `/sdd-review`.

### SUGGESTION

- [x] `src/features/play/world-client.tsx:858` - Turn-control animation and input behavior now add several more state concerns to the still-large play client. Recommendation: when continuing Workstream 2, extract the turn action panel into a focused component or hook so future UI polish does not keep expanding the monolith.
  - 2026-07-05 update: extracted the Act/Pass/input interaction into `src/features/play/turn-action-panel.tsx`; parent `world-client.tsx` now owns backend turn submission, not the local input animation state.

## Verification Evidence

| Command / Scenario | Evidence Type | Requirement / Scenario | Result | What It Proves |
|---|---|---|---|---|
| `npm run ci:required` | broad supporting gate | Architecture refactor completed slice plus latest UI edits | passed | ESLint, Vitest, TypeScript, and production Next build pass after the review timer fix. |
| `npm run e2e` | deterministic E2E | LC-001 / LC-002 browser playtest path | passed | Seeded Adventure browser playtest still works through route, fixture provider, Convex state, Act/Pass, debug edit, reset, and Adventure management paths. |
| `git merge-tree --write-tree develop HEAD` | integration check | Branch and merge readiness | passed | Source branch can merge into `develop` without detected conflicts. |
| `git diff --check` | source hygiene check | Code quality | passed | No whitespace errors in the working tree diff. |

## Review Bundle

- Source branch/ref: `change/nextjs-architecture-refactor`
- Target branch/ref: `develop`
- Merge base: `1b85b3364b4d54270792255d7c920d23db9820b3`
- Source-only commits: `841c40f Refactor Lorecraft app boundaries`; `5bc042a Record architecture refactor ledger`
- Target-only commits: none reported
- Changed files: README, architecture docs, ADRs, active change artifacts, LC-001/LC-002 Epics, package files, App Router pages/fallbacks, Game Master route adapter/tests, server director modules, feature play files, Convex world module, and Stormbound baseline helper
- Diff stat: 24 files changed, 2148 insertions, 1214 deletions
- Conflict check: clean tree `7500dec26b57c13685b36c7565551e560a08b45f`
- Dirty state: `src/app/globals.css` and `src/features/play/world-client.tsx` modified in the app repo
- Branch policy: source branch prefix `change/` is valid for planned architecture/UX work; target branch is non-production `develop`

## Delegated Review Passes

| Pass | Reviewer | Result | Notes |
|---|---|---|---|
| Artifact truth | main | findings | Review stopped before delegation because artifact and dirty-state findings already block readiness. |
| Code diff | main | findings | TypeScript timer issue fixed; remaining dirty UI files need correct change scope/commit. |
| Verification coverage | main | pass | Required CI and deterministic E2E passed. |
| Security | main | pass | No new security exposure found in the reviewed changes. |
| UI / visual identity | main | findings | UI direction is plausible, but it is not represented in the current architecture-refactor scope. |
| Docs / changelog / PRD | main | findings | Docs mostly match completed slice; no changelog/PRD action required, but ledger and Epic evidence remain incomplete. |
| Integration readiness | main | findings | Merge conflicts are clean, but active tasks and dirty files block readiness. |

## PR / Merge Readiness

- Source branch: `change/nextjs-architecture-refactor`
- Target branch: `develop`
- Conflict check: clean
- Commit state: not ready; app repo has uncommitted implementation files
- PR status: not created
- Merge status: not authorized and not ready

## Review Log

- 2026-07-05: Review created. Fixed `setTimeout` typing issue, reran `npm run ci:required`, reran `npm run e2e`, and recorded required findings for incomplete workstreams, pending evidence, pending manual confirmation, scope drift, and dirty app files.
- 2026-07-05: Apply follow-up completed Workstream 2 and Workstream 4, updated LC-001/LC-002 maps, accepted the ADR, reran `npm run ci:required`, `npm run convex:once`, and `npm run e2e`, and left final readiness to a fresh `/sdd-review`.
