# Review: Slash Commands And Tutorial World

## Verdict

changes-requested

This review found blocking issues and applied safe in-scope fixes. Rerun `/sdd-review` for a fresh-context ready verdict before merge/closeout.

## Gate Scorecard

| Gate | Result | Notes |
|---|---|---|
| Change artifacts | pass after fix | LC-001 Story placement and LC-002 top-level scope were reconciled. |
| Epic truth | pass after fix | LC-001-S13 is under Stories; LC-002 no longer describes the Epic as Stormbound-only. |
| Requirements and Scenarios | pass | LC-001-S13 and LC-002/S5 Requirements map to implementation and verification. |
| Story reference traceability | pass | Story labels remain stable and indexed. |
| Tests and verification | pass | Focused route/autocomplete tests, deterministic E2E, and required CI passed after fixes. |
| Manual UI confirmation | pass with pending status | `tasks.md` records a current walkthrough and `pending Taylor` status. |
| Code review | pass after fix | Empty first-run landing path restored; reseed destructive scope narrowed. |
| Visual / UX consistency | pass with suggestion | Autocomplete works; ARIA could be tightened later with a fuller combobox pattern. |
| Security review | pass after fix | Offscreen `/look` location leak fixed; global reseed no longer deletes Tutorial. |
| Documentation | pass after fix | README, data/persistence/architecture docs, and affected Epics are current. |
| Changelog | pass | Public `Unreleased` entries cover slash utilities, autocomplete, Tutorial, and multi-World startup. |
| Branch and merge readiness | blocked pending fresh rerun | Safe review fixes were applied; rerun review before merge. |
| PRD alignment | not applicable | No separate PRD update required for this scoped prototype change. |

## Findings

### BLOCKING

- [x] `src/lib/director/look-prompt.ts` - `/look <target>` accepted any `knownLocations` entry, which included all Adventure rooms from `loadDirectorContextReadModel`, allowing inspection of offscreen locations by guessed name. Fixed by limiting inspectable location candidates to the current room and visible exits, with a route regression test for an offscreen known room.
- [x] `convex/world.ts` - `seedDemoWorld` deleted both Stormbound Chapel and Tutorial Worlds, so debug Reset World could delete Tutorial Adventures as a side effect. Fixed by scoping reseed deletion to Stormbound Chapel and only ensuring Tutorial exists.
- [x] `src/features/play/adventure-landing.tsx` - fresh empty Convex state had no actionable first-run path because the landing page showed an empty message but no seed action. Fixed by adding a `Seed Demo World` empty-state button wired to `seedDemoWorld`; E2E helper now covers the empty-state button path when present.
- [x] `docs/epics/lc-002-world-adventure-model/epic.md` - Epic-level Outcome/Current Scope and S1 evidence still described Stormbound Chapel as the only World container. Fixed to describe seeded Worlds and selected WorldVersion creation.
- [x] `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` - LC-001-S13 was placed after `## Cross-Story Concerns`, outside the Stories section. Fixed by moving Cross-Story Concerns after LC-001-S13.

### REQUIRED

- None remaining after safe fixes in this pass.

### SUGGESTION

- [ ] `src/features/play/turn-action-panel.tsx` - Autocomplete keyboard behavior is functional, but the ARIA pattern could be tightened later with a fuller combobox/listbox primitive or accessibility check.

## Verification Evidence

| Command / Scenario | Evidence Type | Requirement / Scenario | Result | What It Proves |
|---|---|---|---|---|
| `npm run test -- src/app/api/director/utility/route.test.ts src/lib/director/slash-command-autocomplete.test.ts` | focused automated test | LC-001-S13/R2, R4 | Passed, 11 tests | `/look` rejects offscreen known locations, supports visible targets, and autocomplete suggestions preserve manual submission. |
| `npm run typecheck` | broad supporting gate | implementation shape | Passed | TypeScript accepts route, resolver, landing, and client UI fixes. |
| `npm run e2e` | deterministic E2E | LC-001-S13, LC-002/S5, first-run seed helper | Passed, 1 browser test | Browser path covers slash utility/autocomplete flow, Tutorial creation, and first-run seed button when the landing page is empty. |
| `npm run ci:required` | broad supporting gate | full local required gate | Passed, 67 tests | Lint, unit tests, typecheck, and production build pass after review fixes. |

## Review Bundle

- Source branch/ref: `change/slash-commands-tutorial`
- Target branch/ref: `develop`
- Merge base: `89704db727aa9570e773222b727d324d91ed3fff`
- Source-only commits before review fixes: `76ba05b`, `a82eb30`, `6e03962`, `3cc24e3`
- Target-only commits: none reported by `git log HEAD..develop`
- Changed files: see `git diff --name-status develop...HEAD`
- Diff stat: 28 files changed before review fixes
- Conflict check: `git merge-tree --write-tree develop HEAD` returned a tree hash before review fixes
- Dirty state: app repo was clean before review; review fixes were prepared for a local remediation commit
- Branch policy: source `change/slash-commands-tutorial` to target `develop` matches app policy for routine product changes

## Delegated Review Passes

| Pass | Reviewer | Result | Notes |
|---|---|---|---|
| Artifact truth | `019f3670-d850-7090-8f24-9ea3977fd475` | changes-requested | Found LC-002 Stormbound-only stale wording and LC-001-S13 placement outside Stories. |
| Code / UI | `019f3670-f648-7552-a4c0-6059c404e1df` | changes-requested | Found empty first-run landing regression; suggested future ARIA tightening. |
| Security | `019f3671-1e9b-7143-ab3e-0eb58e23bbe5` | changes-requested | Found offscreen `/look` location leak and broad Tutorial deletion during reseed. |

## PR / Merge Readiness

- Source branch: `change/slash-commands-tutorial`
- Target branch: `develop`
- Conflict check: clean before review fixes; rerun on fresh review
- Commit state: review fixes prepared for a local remediation commit
- PR status: not requested
- Merge status: blocked pending fresh `/sdd-review`

## Review Log

- 2026-07-06: Review created; blocking findings were fixed in the safe review pass. Rerun `/sdd-review` for a clean ready verdict.
