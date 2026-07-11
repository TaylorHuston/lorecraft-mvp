# Tasks: Player And Room Info Panels

## Resume Here

- Current state: `/sdd-review` is ready at exact source `de087ac976aaad92e96d0048da425cbf4fcf3b6a`
- Last completed action: fresh artifact, code/security, UI, verification, and merge-readiness passes completed cleanly
- Next action: confirm or accept the pending manual UI walkthrough, then authorize merge-and-close into `develop`
- Active branch/ref: `change/player-card`
- Expected dirty files: none after the all-clear review record commit
- Known blockers: none

## Specialist Checkpoint

| Date | Slice | Touched Surface / Risk | Specialist Guidance Selected | Loaded / Delegated? | Consequence |
|---|---|---|---|---|---|
| 2026-07-08 | Discovery and branch setup | SDD artifacts / branch policy / app repo boundaries | `sdd-apply`; project `AGENTS.md`; `03-spaces/developer-guide.md` | loaded | Confirmed planning docs may exist on `develop`, but code/runtime changes require `change/player-card`. |
| 2026-07-08 | `LC-002/S1/R3`; `LC-001-S15` planning for backend/UI split | Convex runtime state / Next App Router UI / player-facing left rail | Convex AI guidelines; `convex`; `next-best-practices`; Next.js 16.2.9 docs; `ui-ux-pro-max`; shared visual style guide | loaded; read-only discovery delegated to subagents | Use existing actor/facts contract with validated Convex functions, keep Next pages thin/client components scoped, and make the Player Card persistent, collapsible, accessible, and visually aligned with the narrative workbench. |
| 2026-07-08 | Implementation review before commit | Convex state mutation / prompt context / browser user paths | Convex AI guidelines; Next.js/UI guidance; delegated discovery notes | loaded | Added deterministic unit coverage where possible and browser coverage in the E2E spec; left full E2E execution blocked by intentionally running dev server. |
| 2026-07-08 | `LC-001-S16` Room Info Panel | player-facing Next.js UI / current-location snapshot projection / responsive side rails | `ui-ux-pro-max`; `next-best-practices`; Next.js 16.2.9 docs; Convex AI guidelines; shared visual style guide | loaded; implementation kept local because write set is small and tightly coupled | Derive Room Info from existing snapshot state, keep it read-only and player-facing, avoid schema changes, preserve story centering, and verify with focused tests plus browser coverage. |

## Task Checklist

### 1. Planning Quality

- [x] 1.1 Summarize the proposed scope boundary and confirm unresolved decisions.
- [x] 1.2 Challenge each proposed Story for user-path fit, Epic ownership, and unnecessary UI-task fragmentation.
- [x] 1.3 Refine Requirements and Scenarios into observable behavior, including creation, cancel, blank fields, persistence, prompt context, collapse, and agency preservation.
- [x] 1.4 Record assumptions, open questions, candidate Stories, and deferred scope instead of silently promoting uncertain behavior into accepted Requirements.
- [x] 1.5 Confirm the planned `Verified By` sections can become scenario-mapped evidence indexes.

### 2. Epic Artifacts

- [x] 2.1 Update `docs/epics/lc-002-world-adventure-model/epic.md`.
- [x] 2.2 Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.
- [x] 2.3 Confirm `LC-002/S1` and `LC-001-S15` have current Story/Requirement/Scenario IDs, Implemented By, Verified By, and Verification Gaps.
- [x] 2.4 Reconcile `LC-001-S7` wording if Player Card context changes active Game Master context assembly.

### 3. Architecture Decisions

- [x] 3.1 Confirm `design.md` compares viable technical options and selects existing actor plus actor facts.
- [x] 3.2 No ADR is required because this applies existing Actor/Facts and Adventure-owned runtime decisions.
- [x] 3.3 Confirm ADR status remains not applicable during review.

### 4. Implementation

- [x] 4.1 Implement `LC-002/S1` Player Identity On Creation.
  - [x] Story: `LC-002/S1` - Start Adventure From World Version
    - [x] Requirement R3: Player Identity On Creation
      - [x] Scenario R3-S1: Player name creates Adventure
      - [x] Scenario R3-S2: Name prompt is canceled
      - [x] Scenario R3-S3: Optional profile fields start blank
- [x] 4.2 Implement `LC-001-S15` Player Card.
  - [x] Story: `LC-001-S15` - Player Card
    - [x] Requirement R1: Persistent Player Card Surface
      - [x] Scenario R1-S1: Expanded Player Card shows filled profile fields
      - [x] Scenario R1-S2: Player Card collapses
      - [x] Scenario R1-S3: No debug dependency
    - [x] Requirement R2: Player Profile Editing
      - [x] Scenario R2-S1: Optional field is saved
      - [x] Scenario R2-S2: Optional field is cleared
    - [x] Requirement R3: Game Master Uses Player Card Without Owning Agency
      - [x] Scenario R3-S1: Filled Player Card enters prompt context
      - [x] Scenario R3-S2: Player agency is preserved
- [x] 4.3 Update `docs/data-model.md` with Player Card field semantics.
- [x] 4.4 Update `docs/persistence-system.md` with the Player Card prompt/state boundary.
- [x] 4.5 Update README current features and `CHANGELOG.md` when implementation is accepted.
- [x] 4.6 Update Story-level Implemented By maps with current code locations.
- [x] 4.7 Implement `LC-001-S16` Room Info Panel.
  - [x] Story: `LC-001-S16` - Room Info Panel
    - [x] Requirement R1: Persistent Room Info Surface
      - [x] Scenario R1-S1: Room Info shows current location
      - [x] Scenario R1-S2: Room Info updates after location changes
      - [x] Scenario R1-S3: Story remains centered
    - [x] Requirement R2: Present NPC List
      - [x] Scenario R2-S1: Present NPCs are listed
      - [x] Scenario R2-S2: No NPCs present
      - [x] Scenario R2-S3: NPC list follows canonical actor locations
    - [x] Requirement R3: Read-Only Player-Facing Context
      - [x] Scenario R3-S1: No editing controls in Room Info
      - [x] Scenario R3-S2: No new movement semantics
  - [x] Reuse existing Adventure snapshot/current Location Card state rather than adding schema.
  - [x] Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` with `LC-001-S16`.
  - [x] Update Story-level Implemented By maps with current code locations.

### 5. Verification

- [x] 5.1 Add or update focused tests for Adventure creation player name validation and copied player actor/profile fields.
- [x] 5.2 Add or update focused tests for Player Card snapshot/context shape and profile field save/clear behavior.
- [x] 5.3 Add or update focused prompt tests for Player Card inclusion and player-agency instruction preservation.
- [x] 5.4 Add deterministic E2E or browser coverage for name prompt, cancel path, Player Card expand/collapse, profile edit persistence, and reload.
- [x] 5.5 Run `npm run ci:required`.
- [x] 5.6 Run `npm run convex:once` when Convex generated function shape changes. Not required for `LC-001-S16`; no Convex functions or generated API shape changed.
- [x] 5.7 Update Story-level Verified By maps with scenario-mapped evidence.
- [x] 5.8 Perform manual UI confirmation or record pending Taylor status.
- [x] 5.9 Add deterministic coverage for Room Info deriving room name, description, and present NPCs from canonical snapshot state.
- [x] 5.10 Add or update browser/E2E coverage for the right-side Room Info panel on an Adventure route.
- [x] 5.11 Update `LC-001-S16` Verified By maps with scenario-mapped evidence.

### 6. Review And Closeout

- [x] 6.1 Update root `CHANGELOG.md` under `Unreleased / Added` when implemented.
- [x] 6.2 Run `/sdd-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, changelog, ADR consistency, and branch readiness.
- [x] 6.3 Record review outcome as a `review.md` path, clean review entry, or explicit user-approved review waiver.
- [x] 6.4 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [x] 6.5 Record manual UI confirmation status as `pending Taylor`, `Taylor confirmed`, or `accepted gap`.
- [x] 6.6 Confirm proposal/design/tasks/review artifacts do not still claim completed work is not implemented, not verified, pending, or accepted under obsolete manual status vocabulary.
- [x] 6.7 Confirm closeout state has no contradictory Resume Here, checklist, review, manual confirmation, changelog, ADR, PR/merge, deferred-gap, or folder-location claims.
- [ ] 6.8 Create a PR or merge only after `/sdd-review` is ready and the app branch policy plus user authorization allow it.
- [ ] 6.9 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-07-08 | Planning | main; `sdd-propose`; project AGENTS; shared visual style guide; UI/UX guidance | `proposal.md`, `design.md`, `tasks.md` | Proposed Player Card scope and Epic updates. | `5e9074a` |
| 2026-07-08 | Player Card implementation | main; Convex/Next/UI guidance; delegated discovery | `convex/world.ts`, `src/features/play/*`, `src/lib/world/*`, `src/lib/director/*`, E2E spec | Implemented named Adventure creation, Player Card profile editing, prompt context, reset preservation, and deterministic tests. | `5e9074a` |
| 2026-07-08 | Documentation and Epic traceability | main | README, CHANGELOG, data model, persistence doc, LC-001, LC-002 | Updated user-facing docs and scenario-mapped Epic evidence for Player Card behavior. | `5e9074a` |
| 2026-07-08 | Room Info replan | main; `sdd-propose`; shared visual style guide | `proposal.md`, `design.md`, `tasks.md` | Added `LC-001-S16` planning for a right-side Room Info panel derived from current location snapshot state. | `7918983` |
| 2026-07-08 | `LC-001-S16` Room Info implementation | main; UI/Next/Convex guidance | `src/features/play/room-info-card.tsx`, `src/features/play/world-client.tsx`, E2E spec, LC-001, README, data/persistence/testing docs, CHANGELOG | Implemented read-only Room Info panel from current snapshot state and added unit plus browser coverage. | `7918983` |
| 2026-07-08 | Apply-side self-check | delegated test engineer; main remediation | `src/features/play/room-info-card.tsx`, LC-001 Epic evidence | Removed debug-like visible room key, reconciled stale Epic verification gap, and reran required CI. | `7918983` |
| 2026-07-08 | Review remediation | main; delegated artifact/code/UI review | `src/features/play/world-client.tsx`, `src/features/play/player-card.tsx`, `src/lib/world/*`, `convex-snapshot-read-model.test.ts`, planning/docs/Epics | Reconciled always-editable Player Card field wording, added missing LC-002 blank-field scenario, loaded Player Card facts outside bounded general fact lists, disabled turn controls while Player Card saves are pending, and fixed narrow stacked layout. | `efa9269` |
| 2026-07-10 | Fresh review remediation | main; delegated artifact/code/security/UI review | Player Card save queue and tests; design, Epic, tasks, and review artifacts | Serialized overlapping Player Card autosaves, added missing LC-001-S15/R1-S3 Epic truth, corrected remaining blank-field wording, and refreshed verification/lifecycle state. | `76db46b` |
| 2026-07-10 | Final review remediation | main; delegated artifact/security/UI review | Player Card collapse semantics; LC-001-S16 evidence; tasks and review records | Kept the `aria-controls` target mounted while collapsed, reconciled Room Info E2E truth, and recorded immutable review coverage of `76db46b`. | `87eddcb` |

## Verification Ledger

Record proof as it happens. Keep chronological command output here; summarize only durable scenario-mapped evidence into Epic `Verified By`. Do not blur deterministic E2E, live-provider playtests, manual UI confirmation, broad gates, and debug/log inspection into one evidence bucket.

| Date | Check | Evidence Type | What It Proves | Result |
|---|---|---|---|---|
| 2026-07-08 | Artifact self-check | planning review | Proposal/design/tasks exist and define scoped Epic actions, selected approach, verification plan, changelog impact, and manual confirmation plan. | Passed |
| 2026-07-08 | `npm run lint` | deterministic local gate | ESLint passes for the new Player Card component, app changes, and tests. | Passed |
| 2026-07-08 | `npm run test` | deterministic local gate | 87 Vitest tests pass, including Director prompt and snapshot Player Card coverage. | Passed |
| 2026-07-08 | `npm run typecheck` | deterministic local gate | TypeScript accepts the updated Convex/UI/Director contracts. | Passed |
| 2026-07-08 | `npm run convex:once` | Convex validation | Could not run because the local dev Convex backend is intentionally running on port `3210`; dev server was left running per standing user preference. | Blocked |
| 2026-07-08 | `npm run e2e` | deterministic browser gate | Not run because Playwright starts its own Convex backend on `3210` with `reuseExistingServer: false`, which conflicts with the intentionally running dev server. E2E spec coverage was updated. | Blocked |
| 2026-07-08 | `npm run ci:required` | required local CI gate | Lint, unit tests, typecheck, and production build pass with Player Card changes. | Passed |
| 2026-07-08 | `npm run test -- src/features/play/room-info-card.test.ts` | focused automated test | Proves `LC-001-S16/R2` NPC list derivation excludes the player and returns empty when no NPC actors are present. | Passed |
| 2026-07-08 | `npm run ci:required` | required local CI gate | Lint, 89 Vitest tests, typecheck, and production build pass with Room Info changes. | Passed |
| 2026-07-08 | `lsof -nP -iTCP:3210 -sTCP:LISTEN`; `lsof -nP -iTCP:3000 -sTCP:LISTEN`; `curl http://localhost:3000/` | runtime / blocked E2E evidence | Confirms the standing dev loop is still running on Next `3000` and Convex `3210`, the app returns HTTP 200, and deterministic E2E would conflict with the active Convex port. | E2E blocked; dev server healthy |
| 2026-07-08 | delegated apply-side self-check | fresh-context review | Found visible room key in the player-facing panel and stale Epic gap wording; both were remediated before commit. | Addressed |
| 2026-07-08 | `npm run ci:required` | required local CI gate | Re-ran after self-check fixes; lint, 89 Vitest tests, typecheck, and production build pass. | Passed |
| 2026-07-08 | `/sdd-review` live browser check at 1440x900 and 390x844 | deterministic local browser inspection | Found no horizontal overflow; found narrow viewport story-stream squeeze caused by stacked side rails. Remediated by giving the story workspace its own viewport-height block on sub-`lg` layouts. | Finding addressed |
| 2026-07-08 | `/sdd-review` delegated artifact/code/UI reviews | fresh-context review | Found stale blank-field artifact wording, missing LC-002 blank-field scenario, bounded Player Card fact loading, Player Card autosave/turn race, collapsed rail width behavior, and blocked E2E evidence. | Findings addressed or recorded as accepted gap |
| 2026-07-10 | `npm run e2e` | deterministic browser gate | The fixed E2E port became available; Playwright verified the complete seeded Adventure flow, including Player Card, Room Info, profile persistence, and reload behavior. The normal debug loop was restored afterward. | Passed, 2 tests |
| 2026-07-10 | `npm run ci:required` | required local CI gate | Lint, 93 Vitest tests, typecheck, and production build passed after second-pass remediation. | Passed |
| 2026-07-10 | `npm run test -- src/features/play/player-card-save-queue.test.ts` | focused automated test | Proves overlapping Player Card saves are serialized, intermediate drafts collapse to the latest value, failed final writes remain pending, and retry persists the retained draft. | Passed, 3 tests |
| 2026-07-10 | `npm run e2e` after second-pass remediation | deterministic browser gate | Revalidated both complete browser flows and proved an immediate return to Adventures flushes the latest Player Card edits before navigation. | Passed, 2 tests |
| 2026-07-10 | `npm run ci:required`; `npm run e2e` after final review remediation | required and browser gates | Revalidated lint, 93 tests, typecheck, production build, both browser flows, and the mounted-but-hidden Player Card collapse region. | Passed |
| 2026-07-10 | `/sdd-review` at `de087ac976aaad92e96d0048da425cbf4fcf3b6a` | fresh integration gate | Artifact, Epic, Scenario, code/security, UI, documentation, changelog, and merge-readiness passes found no unresolved findings. | Ready |

## Manual Feedback

Record the user's manual testing feedback after implementation starts.

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| 2026-07-08 | Player Card should feel more like a floating video-game panel instead of a fixed sidebar. | requirement refinement | Updated Player Card surface styling with inset spacing, rounded elevated panel, softer ring, shadow, and contained controls. | addressed |
| 2026-07-08 | Player fields should always be visible and editable like NPC fields. | requirement refinement | Removed Player Card read/edit mode switch; expanded card now shows all profile text areas directly with autosave status. | addressed |

## Planning Updates

Record `/sdd-propose --replan` updates when implementation or feedback discovers planning-level requirements.

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|---|
| 2026-07-08 | The Player Card side-rail work also needs a matching right-side room info floating box with room name, description, and NPC list. | in-scope refinement | Updated `proposal.md`, `design.md`, and `tasks.md` to add `LC-001-S16: Room Info Panel`; scoped it as read-only UI derived from existing current-location snapshot state. | `/sdd-apply` starting at `LC-001-S16: Room Info Panel` |

## Manual UI Confirmation

- Status: pending Taylor
- App URL / route: `http://localhost:3000/` and an Adventure route such as `/adventures/<id>`
- Required setup or test data: seeded Worlds with at least one newly created Adventure using a custom player name
- Steps for the user:
  - Create a new Adventure from a World container.
  - Enter a custom player name.
  - Open the Adventure and inspect the left Player Card.
  - Expand/collapse the Player Card.
  - Fill in physical description, backstory, and status.
  - Reload the Adventure.
  - Optionally open the debug drawer and submit a turn to inspect prompt/log context.
  - Inspect the right Room Info panel for the current room name, description, and present NPC list.
  - Move to another existing location through a clear player action and confirm the Room Info panel updates after the accepted move.
- Expected result:
  - The Player Card feels like part of the player-facing story surface, not debug UI.
  - The story stream remains readable with the Player Card expanded and collapsed.
  - Filled player profile fields persist across reload and appear in Game Master context.
  - Blank or cleared fields do not show stale or misleading content.
  - The Room Info panel feels like player-facing scene context, not debug UI or a movement map.
  - Room Info derives NPC presence from canonical location state and does not show stale NPCs after movement/reset.
- Feedback that would change artifacts:
  - Left rail feels too intrusive.
  - Inline editing feels too form-like.
  - Player profile context causes the Game Master to over-author player thoughts, feelings, dialogue, or goals.
  - Right-side Room Info makes the story stream feel cramped or visually unbalanced.
  - Room Info needs exits, objects, or collapse behavior earlier than planned.

## Blockers / Open Questions

- None identified.

## Closeout

- Epic files updated: yes, LC-001 and LC-002
- Story labels/references and Requirement/Scenario IDs current: yes after second-pass remediation
- Implemented By maps current: yes
- Scenario-mapped Verified By maps current: yes, including deterministic E2E
- Superseded earlier Epic truth reconciled: yes
- ADR status: not applicable
- Changelog current: yes, `Unreleased / Added`
- `/sdd-review` verdict: ready at `de087ac976aaad92e96d0048da425cbf4fcf3b6a`
- Review record: `docs/changes/2026-07-08-player-card/review.md`
- `review.md` findings resolved: safe findings resolved; production auth remains accepted prototype scope
- Planning updates resolved: yes
- Manual UI confirmation status: pending Taylor
- PR / merge state: not authorized; not merged
- Reviewed source commit: `de087ac976aaad92e96d0048da425cbf4fcf3b6a`
- Safe review remediation commit: `87eddcbfef2471c186afcd4e9b7d9f01bf620824`
- Implementation commits: `5e9074a` through `87eddcb`
- Deferred scope accepted: production auth/ownership, RPG systems, avatar, and cross-Adventure identity
- Change moved to `docs/changes/closed/`: no
