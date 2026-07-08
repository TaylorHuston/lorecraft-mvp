# Review: Player And Room Info Panels

## Verdict

changes-requested

Safe review remediation was applied and committed in this pass. Rerun `/sdd-review` for a fresh clean verdict before merge-and-close.

## Gate Scorecard

| Gate | Result | Notes |
|---|---|---|
| Change artifacts | remediated | Reconciled stale implementation/verification wording and always-editable Player Card field semantics. |
| Epic truth | remediated | Added missing LC-002 optional blank profile scenario and corrected E2E evidence language. |
| Requirements and Scenarios | remediated | Preserved implemented behavior: blank fields remain editable in the Player Card and are omitted from prompt context until filled. |
| Story reference traceability | pass | LC-001-S15, LC-001-S16, and LC-002/S1 remain the owning Stories. |
| Tests and verification | pass with accepted gap | `npm run ci:required` passes; `npm run e2e` remains blocked by the intentionally running dev Convex server on port `3210`. |
| Manual UI confirmation | pending Taylor | Manual walkthrough remains recorded in `tasks.md`. |
| Code review | remediated | Fixed bounded Player Card fact loading and Player Card save/turn submission race. |
| Visual / UX consistency | remediated | Fixed collapsed Player Card width behavior and narrow stacked layout story-stream squeeze. |
| Security review | accepted prototype gap plus remediation | Production auth/ownership remains deferred by scope; bounded profile fact loading was fixed. |
| Documentation | remediated | Updated data model, design, proposal, tasks, and Epics. |
| Changelog | pass | User-facing Player Card and Room Info changes are already under `Unreleased / Added`. |
| Branch and merge readiness | pending fresh review | Conflict check was clean before remediation; rerun after this commit. |
| PRD alignment | not applicable | No PRD update required for this scoped MVP slice. |

## Findings

### BLOCKING

- [x] `convex/world.ts` public player-profile surfaces are unauthenticated. This is a real production BOLA/IDOR risk, but production auth, ownership, and multi-user player profiles are explicitly deferred in the change scope. Accepted for the local MVP prototype; must be revisited before shared/remote deployment.

### REQUIRED

- [x] `docs/changes/2026-07-08-player-card/design.md` and affected Epics contained stale "Not implemented yet" / "Not verified yet" planning text after implementation. Remediated.
- [x] `docs/data-model.md` and LC-001-S15 contradicted implemented Player Card behavior by saying blank optional fields are omitted from normal display. Remediated to distinguish editable UI fields from prompt-context omission.
- [x] `docs/epics/lc-002-world-adventure-model/epic.md` lacked the optional blank profile field scenario and overstated E2E execution evidence. Remediated.
- [x] `src/lib/world/convex-snapshot-read-model.ts` and `src/lib/world/convex-director-context.ts` derived Player Card facts from bounded general fact lists. Remediated with separate player-subject fact queries and regression coverage.
- [x] `src/features/play/player-card.tsx` and `src/features/play/world-client.tsx` allowed turn submission while Player Card autosaves were pending. Remediated by surfacing pending save state and disabling turn controls until saves settle.
- [x] `src/features/play/player-card.tsx` and `src/features/play/world-client.tsx` did not reliably reclaim Player Card rail width after collapse. Remediated with controlled collapse state and responsive grid columns.
- [x] Narrow viewport live inspection showed the stacked side rails squeezed the story stream to an unusable height. Remediated by giving the story workspace its own viewport-height block below `lg`.

### SUGGESTION

- [x] Add explicit keyboard focus treatment to the Player Card collapse control. Remediated with `focus-visible` ring styling.

## Verification Evidence

| Command / Scenario | Evidence Type | Requirement / Scenario | Result | What It Proves |
|---|---|---|---|---|
| `npm run test -- src/lib/world/convex-snapshot-read-model.test.ts src/features/play/room-info-card.test.ts src/lib/director/director.test.ts` | focused automated test | LC-001-S15, LC-001-S16 | Passed, 52 tests | Player Card profile fields survive bounded general fact lists; Room Info helper and prompt tests remain green. |
| `npm run ci:required` | broad supporting gate | full change | Passed, 90 tests | Lint, unit tests, typecheck, and production build pass after review remediation. |
| Playwright measurement against running `http://localhost:3000/` | deterministic browser inspection | LC-001-S15/R1, LC-001-S16/R1 | Passed | Desktop collapse shrinks Player Card to 64px, story expands to about 953px, Room Info remains visible, and no horizontal overflow appears; narrow view gives story stream usable height. |

## Review Bundle

- Source branch/ref: `change/player-card`
- Target branch/ref: `develop`
- Merge base: `6e8b06ddac95ca28cc9b3e589c85b58fb645807e`
- Source-only commits: `5e9074a`, `8f4786f`, `f46ccb5`, `cebf8f5`, `9f6a684`, `9ea8161`, `fa5a6e0`, `7918983`, `53e69ad`
- Target-only commits: none
- Changed files: see `git diff --name-status develop...HEAD`
- Diff stat before remediation: 24 files, 2054 insertions, 205 deletions
- Conflict check: `git merge-tree --write-tree develop HEAD` returned tree `8baf8fdbea1e1a64d2d94fb07a4b1a7f80fa21d1`
- Dirty state: app repo had review remediation files before this review-fix commit; unrelated vault dirty state was ignored
- Branch policy: implementation branch `change/player-card` targeting `develop`; no merge/close authorized by this review invocation

## Delegated Review Passes

| Pass | Reviewer | Result | Notes |
|---|---|---|---|
| Artifact truth | subagent | findings remediated | Found stale design text, blank-field contradiction, missing LC-002 scenario, and E2E evidence overstatement. |
| Code / security | subagent | one accepted gap, one remediated finding | Authz is deferred prototype scope; bounded profile fact loading was fixed. |
| UI / visual identity | subagent plus main browser check | findings remediated | Fixed pending autosave race, collapsed width behavior, focus treatment, and narrow story height. |
| Integration readiness | main | pending fresh review | Required CI is green; E2E remains an accepted local operational gap while dev server stays running. |

## PR / Merge Readiness

- Source branch: `change/player-card`
- Target branch: `develop`
- Conflict check: clean before remediation; rerun on fresh review
- Commit state: review remediation is included in the local review-fix commit from this pass
- PR status: none
- Merge status: not authorized in this review invocation

## Review Log

- 2026-07-08: Review created during safe remediation pass.
