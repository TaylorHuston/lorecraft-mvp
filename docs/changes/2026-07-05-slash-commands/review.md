# Review: Slash Commands And Tutorial World

## Verdict

changes-requested

This fresh review found one additional blocking issue and applied a safe in-scope fix. Rerun `/sdd-review` for a fresh-context ready verdict before merge/closeout.

## Gate Scorecard

| Gate | Result | Notes |
|---|---|---|
| Change artifacts | pass after fix | Prior stale Epic wording was reconciled; this pass updated the stale review/tasks lifecycle state. |
| Epic truth | pass after fix | LC-001-S13 is under Stories; LC-002 describes seeded Worlds including Tutorial. |
| Requirements and Scenarios | pass | LC-001-S13 and LC-002/S5 Requirements map to implementation and verification. |
| Story reference traceability | pass | Story labels remain stable and indexed. |
| Tests and verification | pass | Focused route/parser/autocomplete tests, deterministic E2E, and required CI passed after fixes. |
| Manual UI confirmation | pass with pending status | `tasks.md` records a current walkthrough and `pending Taylor` status. |
| Code review | pass after fix | Empty first-run landing path restored; reseed destructive scope narrowed; generated output lint fragility fixed. |
| Visual / UX consistency | pass with suggestion | Autocomplete works; ARIA could be tightened later with a fuller combobox pattern. |
| Security review | pass after fix | Offscreen `/look` location leak fixed; `/look` prompt input now excludes non-observable NPC facts; global reseed no longer deletes Tutorial. |
| Documentation | pass after fix | README, data/persistence/architecture docs, and affected Epics are current. |
| Changelog | pass | Public `Unreleased` entries cover slash utilities, autocomplete, Tutorial, and multi-World startup. |
| Branch and merge readiness | blocked pending fresh rerun | A fresh safe review fix was applied; rerun review before merge. |
| PRD alignment | not applicable | No separate PRD update required for this scoped prototype change. |

## Findings

### BLOCKING

- [x] `src/lib/director/look-prompt.ts` - `/look <target>` accepted any `knownLocations` entry, which included all Adventure rooms from `loadDirectorContextReadModel`, allowing inspection of offscreen locations by guessed name. Fixed by limiting inspectable location candidates to the current room and visible exits, with a route regression test for an offscreen known room.
- [x] `convex/world.ts` - `seedDemoWorld` deleted both Stormbound Chapel and Tutorial Worlds, so debug Reset World could delete Tutorial Adventures as a side effect. Fixed by scoping reseed deletion to Stormbound Chapel and only ensuring Tutorial exists.
- [x] `src/features/play/adventure-landing.tsx` - fresh empty Convex state had no actionable first-run path because the landing page showed an empty message but no seed action. Fixed by adding a `Seed Demo World` empty-state button wired to `seedDemoWorld`; E2E helper now covers the empty-state button path when present.
- [x] `docs/epics/lc-002-world-adventure-model/epic.md` - Epic-level Outcome/Current Scope and S1 evidence still described Stormbound Chapel as the only World container. Fixed to describe seeded Worlds and selected WorldVersion creation.
- [x] `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` - LC-001-S13 was placed after `## Cross-Story Concerns`, outside the Stories section. Fixed by moving Cross-Story Concerns after LC-001-S13.
- [x] `src/lib/director/look-prompt.ts` - `/look` provider requests included all current-scene NPC facts except `knowledge`, which could expose non-observable profile facts such as background, persona, voice, mood, or memory through a player-facing inspection result. Fixed by making `/look` actor facts allowlist-based and sending only observable current `status` alongside the actor description; added a raw provider request regression test.

### REQUIRED

- None remaining after safe fixes in this pass.

### SUGGESTION

- [ ] `src/features/play/turn-action-panel.tsx` - Autocomplete keyboard behavior is functional, but the ARIA pattern could be tightened later with a fuller combobox/listbox primitive or accessibility check.

## Verification Evidence

| Command / Scenario | Evidence Type | Requirement / Scenario | Result | What It Proves |
|---|---|---|---|---|
| `npm run test -- src/app/api/director/utility/route.test.ts src/lib/director/slash-command.test.ts src/lib/director/slash-command-autocomplete.test.ts` | focused automated test | LC-001-S13/R1, R2, R4 | Passed, 14 tests | `/look` rejects offscreen known locations, supports visible targets, excludes non-observable NPC facts from provider prompts, and autocomplete suggestions preserve manual submission. |
| `npm run e2e` | deterministic E2E | LC-001-S13, LC-002/S5, first-run seed helper | Passed, 1 browser test | Browser path covers slash utility/autocomplete flow, Tutorial creation, and first-run seed button when the landing page is empty. |
| `npm run ci:required` | broad supporting gate | full local required gate | Passed, 68 tests | Lint, unit tests, typecheck, and production build pass after review fixes. |

## Review Bundle

- Source branch/ref: `change/slash-commands-tutorial`
- Target branch/ref: `develop`
- Merge base: `89704db727aa9570e773222b727d324d91ed3fff`
- Source-only commits before this fresh review fix: `76ba05b`, `a82eb30`, `6e03962`, `3cc24e3`, `743490f`
- Target-only commits: none reported by `git log HEAD..develop`
- Changed files: see `git diff --name-status develop...HEAD`
- Diff stat: 29 files changed before this fresh review fix
- Conflict check: `git merge-tree --write-tree develop HEAD` returned a tree hash before this fresh review fix
- Dirty state: app repo was clean before review; fresh review fixes were isolated for a local remediation commit
- Branch policy: source `change/slash-commands-tutorial` to target `develop` matches app policy for routine product changes

## Delegated Review Passes

| Pass | Reviewer | Result | Notes |
|---|---|---|---|
| Artifact truth | `019f3680-389b-72e3-a788-0c390dd0b62a` | changes-requested | Confirmed prior Epic fixes; found stale tasks/review wording from the earlier safe-fix pass. |
| Frontend / UI | `019f3680-78aa-7fa0-825b-49352d1e7466` | pass with suggestion | Confirmed slash utility UI and Tutorial flow; suggested future autocomplete ARIA hardening. |
| Security | `019f3680-58a5-7ac1-a159-068b940e16c3` | changes-requested | Found non-observable NPC facts in `/look` provider prompts; confirmed offscreen location and utility prompt-exclusion fixes. |

## PR / Merge Readiness

- Source branch: `change/slash-commands-tutorial`
- Target branch: `develop`
- Conflict check: clean before this fresh review fix; rerun on fresh review
- Commit state: fresh review fixes isolated for a local remediation commit
- PR status: not requested
- Merge status: blocked pending fresh `/sdd-review`

## Review Log

- 2026-07-06: Review created; blocking findings were fixed in the safe review pass. Rerun `/sdd-review` for a clean ready verdict.
- 2026-07-06: Fresh review rerun found and fixed a `/look` NPC fact privacy issue and an ESLint generated-output ignore fragility. Focused tests, E2E, and `ci:required` passed after fixes. Rerun `/sdd-review` for a clean ready verdict.
