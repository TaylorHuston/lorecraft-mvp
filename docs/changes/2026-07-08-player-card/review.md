# Review: Player And Room Info Panels

## Verdict

changes-requested

The fresh review found additional safe artifact and overlapping-autosave deficiencies. They were remediated in this pass; rerun `/sdd-review` for a clean verdict before merge-and-close.

## Gate Scorecard

| Gate | Result | Notes |
|---|---|---|
| Change artifacts | remediated | Reconciled stale implementation/verification wording and always-editable Player Card field semantics. |
| Epic truth | remediated | Added missing LC-002 optional blank profile scenario and corrected E2E evidence language. |
| Requirements and Scenarios | remediated | Preserved implemented behavior: blank fields remain editable in the Player Card and are omitted from prompt context until filled. |
| Story reference traceability | pass | LC-001-S15, LC-001-S16, and LC-002/S1 remain the owning Stories. |
| Tests and verification | pass | `npm run ci:required` and deterministic `npm run e2e` pass; the normal debug loop was restored afterward. |
| Manual UI confirmation | pending Taylor | Manual walkthrough remains recorded in `tasks.md`. |
| Code review | remediated | Fixed bounded Player Card fact loading and Player Card save/turn submission race. |
| Visual / UX consistency | remediated | Fixed collapsed Player Card width behavior and narrow stacked layout story-stream squeeze. |
| Security review | accepted prototype gap plus remediation | Production auth/ownership remains deferred by scope; bounded profile fact loading was fixed. |
| Documentation | remediated | Updated data model, design, proposal, tasks, and Epics. |
| Changelog | pass | User-facing Player Card and Room Info changes are already under `Unreleased / Added`. |
| Branch and merge readiness | pending fresh review | Conflict check was clean against `develop`; rerun after this review-fix commit. |
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
- [x] LC-001-S15 omitted `R1-S3: No debug dependency`, and `design.md` retained stale filled-only field wording. Remediated in the durable Epic and design artifact.
- [x] Player Card autosaves could overlap: an older request could report `saved` and re-enable turns while a newer draft was still pending, and writes could resolve out of order. Remediated with a latest-draft serial save queue and focused tests.
- [x] Debounced Player Card edits could be discarded on return/reset, and failed saves could become falsely clean. Remediated by flushing before navigation/reset, retaining failed drafts for retry, and keeping turn controls blocked until the latest draft saves.
- [x] Player Card/Room Info metadata text missed the project contrast gate, the Player Card `aside` was unnamed, and every save state used success coloring. Remediated with stronger text tokens, an accessible landmark name, and semantic save-state colors.
- [x] Player-name validation rejected names containing only non-ASCII letters. Remediated with Unicode letter/number validation.
- [x] Reset World/bootstrap intentionally creates its fixed local playtest Adventure without the normal name prompt, but the exception was undocumented. Reconciled as a destructive local-only bootstrap exception; player-created Adventures continue to require a name.
- [x] `tasks.md` and this review still described pre-`efa9269` dirty state, blocked E2E, and pending ledger references. Remediated with current lifecycle and verification evidence.

### SUGGESTION

- [x] Add explicit keyboard focus treatment to the Player Card collapse control. Remediated with `focus-visible` ring styling.

## Verification Evidence

| Command / Scenario | Evidence Type | Requirement / Scenario | Result | What It Proves |
|---|---|---|---|---|
| `npm run test -- src/lib/world/convex-snapshot-read-model.test.ts src/features/play/room-info-card.test.ts src/lib/director/director.test.ts` | focused automated test | LC-001-S15, LC-001-S16 | Passed, 52 tests | Player Card profile fields survive bounded general fact lists; Room Info helper and prompt tests remain green. |
| `npm run ci:required` | broad supporting gate | full change | Passed, 93 tests | Lint, unit tests, typecheck, and production build pass after second-pass review remediation. |
| `npm run e2e` | deterministic browser gate | LC-001-S15, LC-001-S16, LC-002/S1 | Passed, 2 tests | Named Adventure creation, Player Card editing/collapse/reload, Room Info, and the broader seeded play loop work against isolated local services. |
| `npm run test -- src/features/play/player-card-save-queue.test.ts` | focused automated test | LC-001-S15/R2 | Passed, 3 tests | Overlapping autosaves serialize to the latest draft, failed final writes remain pending, and retry persists the retained draft. |
| Immediate edit then Return to Adventures in `npm run e2e` | deterministic browser gate | LC-001-S15/R2-S1 | Passed | Navigation flushes the latest debounced Player Card draft and reopening the Adventure shows the saved profile. |
| Playwright measurement against running `http://localhost:3000/` | deterministic browser inspection | LC-001-S15/R1, LC-001-S16/R1 | Passed | Desktop collapse shrinks Player Card to 64px, story expands to about 953px, Room Info remains visible, and no horizontal overflow appears; narrow view gives story stream usable height. |

## Review Bundle

- Source branch/ref: `change/player-card`
- Target branch/ref: `develop`
- Merge base: `6e8b06ddac95ca28cc9b3e589c85b58fb645807e`
- Source-only commits before this review-fix commit: `5e9074a`, `8f4786f`, `f46ccb5`, `cebf8f5`, `9f6a684`, `9ea8161`, `fa5a6e0`, `7918983`, `53e69ad`, `efa9269`
- Target-only commits: none
- Changed files: see `git diff --name-status develop...HEAD`
- Diff stat before second-pass remediation: 25 files, 2343 insertions, 211 deletions
- Conflict check: `git merge-tree --write-tree develop HEAD` returned tree `244f3ed35a8bbecdfa98419f0639c34a8bbbe563`
- Dirty state: app repo contains only intended second-pass review remediation before its review-fix commit; unrelated vault dirty state is ignored
- Branch policy: implementation branch `change/player-card` targeting `develop`; no merge/close authorized by this review invocation

## Delegated Review Passes

| Pass | Reviewer | Result | Notes |
|---|---|---|---|
| Artifact truth | subagent | findings remediated | Found stale design text, blank-field contradiction, missing LC-002 scenario, and E2E evidence overstatement. |
| Code / security | subagent | one accepted gap, one remediated finding | Authz is deferred prototype scope; bounded profile fact loading was fixed. |
| UI / visual identity | subagent plus main browser check | findings remediated | Fixed pending autosave race, collapsed width behavior, focus treatment, and narrow story height. |
| Integration readiness | main | pending fresh review | Required CI and deterministic E2E are green; safe second-pass fixes require one fresh review. |

## PR / Merge Readiness

- Source branch: `change/player-card`
- Target branch: `develop`
- Conflict check: clean before second-pass remediation; rerun on fresh review
- Commit state: second-pass remediation will be included in a scoped local review-fix commit
- PR status: none
- Merge status: not authorized in this review invocation

## Review Log

- 2026-07-08: Review created during safe remediation pass.
- 2026-07-10: Fresh review ran required CI and E2E, restored the dev loop, and remediated stale traceability plus overlapping Player Card autosaves.
