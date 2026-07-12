# Review: UI Improvements

## Verdict

changes-requested

## Gate Scorecard

| Gate | Result | Notes |
|---|---|---|
| Change artifacts | Findings | Proposal scope was not replanned after new user paths, canonical writes, and a broad interaction redesign entered the change. |
| Epic truth | Findings | Several scenarios were updated, but privacy, evidence, and implementation-map wording remain contradictory. |
| Requirements and Scenarios | Findings | New behavior is partly mapped; the design truth map and verification evidence are incomplete. |
| Story reference traceability | Pass | No duplicate Story headings were found within active Epics. |
| Tests and verification | Findings | Required CI passes; modified deterministic E2E has not executed. |
| Manual UI confirmation | Blocked | Status remains `pending user`, and the walkthrough is stale relative to the final command, Help, debug, and NPC-profile UI. |
| Code review | Findings | Canonical fact deletion, autosave ordering, textarea sizing, creation-state, and desktop tab-semantics issues remain. |
| Visual / UX consistency | Findings | The work follows the requested MUD-like direction, but the visual-identity deviation and final mobile/modal behavior are not reconciled or confirmed. |
| Security review | Findings | Player-facing Room Info exposes private NPC `knowledge` in debug mode. |
| Documentation | Findings | Data-model and persistence docs contradict the player-facing all-facts profile; NPC creation copy is stale. |
| Release communication | Findings | Meaningful user-facing changes are not reconciled into `CHANGELOG.md`. |
| Branch and merge readiness | Blocked | Source and target point to the same commit; the complete implementation is uncommitted with unrelated dirty documentation mixed into the repo. |
| PRD alignment | Findings | The implementation intentionally moved toward a MUD-style workbench, but the change did not record the deviation from the current product/visual guidance. |

## Findings

### BLOCKING

- [ ] `docs/changes/2026-07-11-ui-improvements/proposal.md:7` - The proposal limits the change to cosmetic/narrow interaction work and explicitly requires promotion when new user paths, durable behavior, or data changes appear. The implementation now includes Help, NPC drill-down, canonical NPC relocation, collection creation workflows, and revised action semantics. Recommendation: replan the active change with `/sdd-propose --replan`, updating scope, non-goals, risks, affected Stories, and the intentional visual-direction deviation.
- [ ] `src/features/play/world-client.tsx:676` - Room Info passes every actor fact into a player-facing NPC profile, including private `knowledge`; `tests/e2e/lorecraft-playtest.spec.ts:81` codifies that exposure. In normal non-debug mode the same profile receives no facts because `getSnapshot` returns facts only when debug snapshots are enabled. Recommendation: decide the player-visible NPC-field contract, implement a dedicated player-safe projection that works outside debug mode, exclude private fields unless the product boundary is deliberately changed, and reconcile Epic/data/persistence docs and tests.
- [ ] `src/features/play/world-client.tsx:1212` - The NPC editor constructs a complete seven-field write payload from a debug snapshot bounded to the newest 80 facts. A location-only edit can therefore send empty strings for older facts outside that slice, and `convex/world.ts:2227` deletes them. Recommendation: load subject-scoped complete NPC facts for editing or change the mutation contract to explicit field patches; add a deterministic test beyond the 80-row boundary.

### REQUIRED

- [ ] `src/features/play/use-npc-debug-autosave.ts:200` - Multiple saves for one NPC can run concurrently, and reset does not await an active save. An older write can commit after a newer write or after reset, restoring stale name, facts, or location. Recommendation: serialize saves per actor and await/cancel the actor's active chain before reset; test both orderings.
- [ ] `src/features/play/turn-action-panel.tsx:166` - The persistent textarea grows to unrestricted `scrollHeight`, but successful submission clears only React state and leaves the inline height in place. A long action can leave a large blank command surface. Recommendation: cap growth, reset height after successful submission, and cover long-input behavior at desktop and narrow widths.
- [ ] `src/features/play/world-client.tsx:1202` - Add NPC remains enabled with missing required fields and while creation is in flight; errors render behind the modal in the general turn status region, and rapid clicks can issue duplicate creates. Recommendation: add local required-field validation, modal-visible feedback, and a disabled/pending state with deterministic invalid/double-submit coverage.
- [ ] `src/features/play/world-client.tsx:586` - Player, Story, and Room keep `tabpanel` roles at desktop while the owning tablist is hidden and all three panes are visible. Recommendation: scope tab semantics to the narrow layout or render viewport-appropriate wrappers so desktop assistive technology receives section semantics.
- [ ] `docs/changes/2026-07-11-ui-improvements/tasks.md:3` - Resume state, request statuses, privacy wording, review state, branch state, manual walkthrough, and release communication are stale or contradictory. The Epic also overstates live keyboard evidence for behavior covered only by unexecuted E2E assertions. Recommendation: reconcile the full ledger and Epic evidence after implementation decisions are resolved.
- [ ] `tests/e2e/lorecraft-playtest.spec.ts:54` - The modified deterministic browser suite has not executed because the always-on dev server owns Convex port `3210`; manual UI status is also `pending user`. Recommendation: run E2E with the test port free, then complete the updated manual walkthrough before integration.

### SUGGESTION

- [ ] `src/features/play/world-client.tsx:1173` - NPC creation still says new NPCs begin in the player's current location even though the form now requires an explicit location. Recommendation: describe the selected-location behavior.
- [ ] `src/app/globals.css:3` - The app is dark-only but does not declare `color-scheme: dark`. Recommendation: add it so native controls consistently use dark browser styling.

## Verification Evidence

| Command / Scenario | Evidence Type | Requirement / Scenario | Result | What It Proves |
|---|---|---|---|---|
| `npm run ci:required` | broad supporting gate | Changed application surface | Pass | Lint, 93 Vitest tests, typecheck, and production build pass. |
| `npx playwright test --list` | test discovery | Modified browser suite | Pass | Two Chromium scenarios parse and are discoverable. |
| `npm run e2e` | deterministic E2E | LC-001 changed UI scenarios | Blocked | Port `3210` is occupied by the preserved debug server; no changed browser assertion executed. |
| `git diff --check` | source hygiene | Working-tree diff | Pass | No whitespace errors. |
| Duplicate Story heading scan | traceability | Active Epics | Pass | No duplicate Story labels were found within an Epic. |
| Manual UI walkthrough | manual UI confirmation | Responsive panes, modals, command surface, NPC profiles | Pending user | Final user-visible acceptance is not recorded. |

## Review Bundle

- Source branch/ref: `change/ui-improvements`
- Reviewed source commit: `643c958171c068d1eab89aa4af1d5c32ecff2ff2` plus uncommitted working tree
- Target branch/ref: `develop` at `643c958171c068d1eab89aa4af1d5c32ecff2ff2`
- Merge base: `643c958171c068d1eab89aa4af1d5c32ecff2ff2`
- Source-only commits: none
- Target-only commits: none
- Changed files: 20 tracked modified files plus active change artifacts and two new UI components before this review record
- Diff stat: 1,150 insertions, 573 deletions across tracked files before this review record
- Conflict check: `git merge-tree --write-tree develop HEAD` returned tree `77b7b4555d3b84673a07a02abb927ddc915e69f4`; source and target commits are identical, so this does not cover the uncommitted implementation
- Dirty state: complete implementation is uncommitted; historical path-migration documentation edits are mixed into the same repo working tree
- Branch policy: `change/*` to `develop` after review; current branch name is valid, but commit and verification state are not integration-ready

## Delegated Review Passes

| Pass | Reviewer | Result | Notes |
|---|---|---|---|
| Artifact truth | Raman | Findings | Scope drift, stale lifecycle state, incomplete traceability/evidence, pending manual confirmation. |
| Code diff / UI | Sartre | Findings | Hidden knowledge exposure, textarea sizing, creation state, desktop tab semantics. |
| Backend / data integrity | Curie | Findings | Bounded-fact deletion and per-actor autosave/reset ordering. |
| Security | Gauss | Findings | Confirmed player-facing hidden-knowledge disclosure; no dependency, secret, or credential changes. |
| Docs / release / PRD | Main reviewer | Findings | Supporting docs and changelog are stale; visual/product deviation was not replanned. |
| Integration readiness | Main reviewer | Blocked | No immutable source diff exists because all implementation work is uncommitted. |

## PR / Merge Readiness

- Source branch: `change/ui-improvements`
- Reviewed source commit: `643c958171c068d1eab89aa4af1d5c32ecff2ff2` plus non-immutable working tree
- Target branch: `develop`
- Conflict check: commit refs merge cleanly but do not include the working tree
- Commit state: blocked; implementation uncommitted
- PR status: not requested
- Merge status: not authorized and not ready

## Suggested Manual UI Testing

- Route/setup: run `npm run dev:debug`, open an existing Stormbound Chapel Adventure at `/adventures/<id>`.
- Desktop: verify Player, Story, and Room scroll independently; collapse both side panes; confirm Story geometry stays fixed; enter and submit a long action; confirm the empty textarea returns to its intended height.
- Command surface: submit the same short text separately with Act, Story, and Guide; use Pass with draft text present; confirm each path preserves its documented semantics.
- Room/NPC: open each present NPC, inspect only the approved player-visible fields, return to Room, then move an NPC in debug and confirm both locations update correctly without losing facts.
- Modal/mobile: verify Help and Debug at approximately `375x812`, including Close, Escape, backdrop, focus return, internal scrolling, and no horizontal overflow.
- Expected result: no hidden knowledge appears in player UI; no canonical facts are lost; controls remain reachable and correctly labelled; layout stays contained at desktop and mobile sizes.

## Review Log

- 2026-07-11: Deep review created against `643c958` plus the uncommitted working tree; verdict `changes-requested`.
