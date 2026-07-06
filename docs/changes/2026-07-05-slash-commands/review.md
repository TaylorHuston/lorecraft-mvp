# Review: Slash Commands And Tutorial World

## Verdict

changes-requested

This fresh review found additional UI verification, artifact, and documentation drift after the prior remediation commit and applied safe in-scope fixes. Rerun `/sdd-review` for a fresh-context ready verdict before merge/closeout.

## Gate Scorecard

| Gate | Result | Notes |
|---|---|---|
| Change artifacts | pass after fix | Updated stale review/tasks lifecycle state after `388fbcb`. |
| Epic truth | pass after fix | LC-001-S13 is under Stories; LC-002 describes seeded Worlds including Tutorial; verification metadata updated to 2026-07-06. |
| Requirements and Scenarios | pass | LC-001-S13 and LC-002/S5 Requirements map to implementation and verification. |
| Story reference traceability | pass | Story labels remain stable and indexed. |
| Tests and verification | pass after fix | Focused route/parser/autocomplete tests, deterministic E2E, and required CI passed after adding utility reload-persistence coverage. |
| Manual UI confirmation | pass with pending status | `tasks.md` records a current walkthrough and `pending Taylor` status. |
| Code review | pass after fix | Empty first-run landing path restored; reseed destructive scope narrowed; generated output lint fragility fixed. |
| Visual / UX consistency | pass after fix with suggestion | Fixed startup Adventure buttons so fixed-header scroll alignment does not intercept clicks; autocomplete works, but ARIA could be tightened later with a fuller combobox pattern. |
| Security review | pass after fix | Offscreen `/look` location leak fixed; `/look` prompt input now excludes non-observable NPC facts; global reseed no longer deletes Tutorial. |
| Documentation | pass after fix | README, data/persistence/architecture docs, and affected Epics are current after reseed-lifetime wording, metadata, and duplicate README wording fixes. |
| Changelog | pass | Public `Unreleased` entries cover slash utilities, autocomplete, Tutorial, and multi-World startup. |
| Branch and merge readiness | blocked pending fresh rerun | A safe artifact/doc fix was applied; rerun review before merge. |
| PRD alignment | not applicable | No separate PRD update required for this scoped prototype change. |

## Findings

### BLOCKING

- [x] `src/lib/director/look-prompt.ts` - `/look <target>` accepted any `knownLocations` entry, which included all Adventure rooms from `loadDirectorContextReadModel`, allowing inspection of offscreen locations by guessed name. Fixed by limiting inspectable location candidates to the current room and visible exits, with a route regression test for an offscreen known room.
- [x] `convex/world.ts` - `seedDemoWorld` deleted both Stormbound Chapel and Tutorial Worlds, so debug Reset World could delete Tutorial Adventures as a side effect. Fixed by scoping reseed deletion to Stormbound Chapel and only ensuring Tutorial exists.
- [x] `src/features/play/adventure-landing.tsx` - fresh empty Convex state had no actionable first-run path because the landing page showed an empty message but no seed action. Fixed by adding a `Seed Demo World` empty-state button wired to `seedDemoWorld`; E2E helper now covers the empty-state button path when present.
- [x] `docs/epics/lc-002-world-adventure-model/epic.md` - Epic-level Outcome/Current Scope and S1 evidence still described Stormbound Chapel as the only World container. Fixed to describe seeded Worlds and selected WorldVersion creation.
- [x] `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` - LC-001-S13 was placed after `## Cross-Story Concerns`, outside the Stories section. Fixed by moving Cross-Story Concerns after LC-001-S13.
- [x] `src/lib/director/look-prompt.ts` - `/look` provider requests included all current-scene NPC facts except `knowledge`, which could expose non-observable profile facts such as background, persona, voice, mood, or memory through a player-facing inspection result. Fixed by making `/look` actor facts allowlist-based and sending only observable current `status` alongside the actor description; added a raw provider request regression test.
- [x] `docs/changes/2026-07-05-slash-commands/tasks.md` and `docs/changes/2026-07-05-slash-commands/review.md` - Lifecycle state still described the pre-`d425b76` remediation state, including an already-committed safe fix set as pending. Fixed by updating this review record and tasks resume/closeout state to the current safe doc-fix state.
- [x] `docs/changes/2026-07-05-slash-commands/tasks.md` and `docs/changes/2026-07-05-slash-commands/review.md` - Lifecycle state still described the pre-`388fbcb` remediation state, including an already-committed safe fix set as pending. Fixed by updating this review record and tasks resume/closeout state to the current safe doc-fix state.
- [x] `src/features/play/adventure-landing.tsx` and `src/features/play/world-client.tsx` - Deterministic E2E reproduced a fixed-top-bar interception when Playwright scrolled startup `New Adventure` buttons to the viewport top. Fixed by giving startup Adventure action buttons a scroll margin below the fixed header and making the top-bar backdrop non-intercepting while keeping top-bar controls clickable.

### REQUIRED

- [x] `docs/persistence-system.md` - Demo World Lifetime incorrectly said reseeding deletes both Stormbound Chapel and Tutorial Worlds. Fixed to state that `seedDemoWorld` replaces Stormbound Chapel and its runtime rows while ensuring Tutorial exists without deleting existing Tutorial Adventures.
- [x] `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` and `docs/epics/lc-002-world-adventure-model/epic.md` - Epic frontmatter and affected Story metadata still had stale verification dates from before the 2026-07-06 review remediation. Fixed LC-001, LC-001-S13, LC-002, and S5 metadata to 2026-07-06.
- [x] `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` - LC-001-S13 embedded Story metadata still said Modified and Last verified 2026-07-05 even though its index and review record said 2026-07-06. Fixed the embedded Story metadata.
- [x] `docs/data-model.md` - World reseed wording incorrectly said reseeding creates fresh Stormbound Chapel and Tutorial Worlds and an empty Tutorial container. Fixed to match implementation: Stormbound Chapel is replaced while Tutorial is ensured without deleting existing Tutorial Adventures.
- [x] `docs/deployment.md` and `docs/architecture.md` - Prototype route-hardening docs named `/api/director/turn` but not the new provider-backed `/api/director/utility` route. Fixed to name both routes as local-first surfaces that need real auth, ownership checks, rate limiting, and production hardening before shared deployment.
- [x] `tests/e2e/lorecraft-playtest.spec.ts` - Utility reload persistence was claimed but not deterministically asserted. Fixed by asserting `/look`, `/help`, and unknown-target utility entries after page reload.

### SUGGESTION

- [ ] `src/features/play/turn-action-panel.tsx` - Autocomplete keyboard behavior is functional, but the ARIA pattern could be tightened later with a fuller combobox/listbox primitive or accessibility check.
- [x] `README.md` - The "What This Is Not Yet" section had duplicate World Builder wording. Fixed by removing the redundant bullet.

## Verification Evidence

| Command / Scenario | Evidence Type | Requirement / Scenario | Result | What It Proves |
|---|---|---|---|---|
| `npm run test -- src/app/api/director/utility/route.test.ts src/lib/director/slash-command.test.ts src/lib/director/slash-command-autocomplete.test.ts` | focused automated test | LC-001-S13/R1, R2, R4 | Passed, 14 tests | `/look` rejects offscreen known locations, supports visible targets, excludes non-observable NPC facts from provider prompts, and autocomplete suggestions preserve manual submission. |
| `npm run e2e` | deterministic E2E | LC-001-S13, LC-002/S5, first-run seed helper | Passed, 1 browser test | Browser path covers slash utility/autocomplete flow, Tutorial creation, and first-run seed button when the landing page is empty. |
| `npm run ci:required` | broad supporting gate | full local required gate | Passed, 68 tests | Lint, unit tests, typecheck, and production build pass after review fixes. |
| `npm run ci:required` | broad supporting gate | full local required gate | Passed, 68 tests | Lint, unit tests, typecheck, and production build passed at `388fbcb` before artifact-only doc fixes. |
| `npm run e2e` | deterministic E2E | LC-001-S13, LC-002/S5, first-run seed helper | Passed, 1 browser test | Browser playtest passed at `388fbcb` before artifact-only doc fixes. |
| `npm run e2e` | deterministic E2E | LC-001-S13, LC-002/S5, first-run seed helper | Passed, 1 browser test | Browser playtest passed after fixed-header click remediation and utility reload-persistence assertions. |
| `npm run ci:required` | broad supporting gate | full local required gate | Passed, 68 tests | Lint, unit tests, typecheck, and production build pass after the fourth safe review fix set. |

## Review Bundle

- Source branch/ref: `change/slash-commands-tutorial`
- Target branch/ref: `develop`
- Merge base: `89704db727aa9570e773222b727d324d91ed3fff`
- Source-only commits before this artifact/doc fix: `76ba05b`, `a82eb30`, `6e03962`, `3cc24e3`, `743490f`, `d425b76`, `388fbcb`
- Target-only commits: none reported by `git log HEAD..develop`
- Changed files: see `git diff --name-status develop...HEAD`
- Diff stat: 30 files changed before this artifact/doc fix
- Conflict check: `git merge-tree --write-tree develop HEAD` returned a tree hash before this artifact/doc fix
- Dirty state: app repo was clean before review; artifact/doc fixes were isolated for a local remediation commit
- Branch policy: source `change/slash-commands-tutorial` to target `develop` matches app policy for routine product changes

## Delegated Review Passes

| Pass | Reviewer | Result | Notes |
|---|---|---|---|
| Artifact truth | `019f3694-c9e9-75c0-954b-0d0cd72ae54f` | changes-requested | Found stale lifecycle state, data-model reseed wording drift, LC-001-S13 embedded metadata drift, and duplicate README wording. |
| Security | `019f368a-760b-7233-8299-3f9858eb22da` | pass | Confirmed offscreen location, Tutorial reseed, `/look` privacy, utility prompt-exclusion, local route guard, and lint ignore fixes. |
| Frontend / UI | `019f368a-9621-7a13-9aee-e2de0479bcb9` | pass | Confirmed pre-turn utility behavior, utility feed rendering, autocomplete keyboard usability, E2E flow, and browser smoke at 390x844 and 1280x900. |

## PR / Merge Readiness

- Source branch: `change/slash-commands-tutorial`
- Target branch: `develop`
- Conflict check: clean before this artifact/doc fix; rerun on fresh review
- Commit state: artifact/doc fixes isolated for a local remediation commit
- PR status: not requested
- Merge status: blocked pending fresh `/sdd-review`

## Review Log

- 2026-07-06: Review created; blocking findings were fixed in the safe review pass. Rerun `/sdd-review` for a clean ready verdict.
- 2026-07-06: Fresh review rerun found and fixed a `/look` NPC fact privacy issue and an ESLint generated-output ignore fragility. Focused tests, E2E, and `ci:required` passed after fixes. Rerun `/sdd-review` for a clean ready verdict.
- 2026-07-06: Fresh review rerun found and fixed artifact/doc drift after `d425b76`: lifecycle state, reseed lifetime docs, and Epic verification metadata. Rerun `/sdd-review` for a clean ready verdict.
- 2026-07-06: Fresh review rerun found and fixed UI verification, artifact, and doc drift after `388fbcb`: fixed-header click interception, missing utility reload-persistence E2E coverage, lifecycle state, LC-001-S13 embedded Story metadata, data-model reseed wording, route-hardening docs, and duplicate README wording. Rerun `/sdd-review` for a clean ready verdict.
