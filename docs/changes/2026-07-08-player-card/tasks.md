# Tasks: Player Card

## Resume Here

- Current state: implementation committed; ready for `/sdd-review`
- Last completed action: committed player name creation, Player Card UI/profile persistence, prompt context, docs, and Epic traceability
- Next action: run `/sdd-review`
- Active branch/ref: `change/player-card`
- Expected dirty files: implementation, docs, tests, and `docs/changes/2026-07-08-player-card/`
- Known blockers: full E2E and `convex:once` conflict with the intentionally running local dev Convex backend on port `3210`

## Specialist Checkpoint

| Date | Slice | Touched Surface / Risk | Specialist Guidance Selected | Loaded / Delegated? | Consequence |
|---|---|---|---|---|---|
| 2026-07-08 | Discovery and branch setup | SDD artifacts / branch policy / app repo boundaries | `sdd-apply`; project `AGENTS.md`; `03-spaces/developer-guide.md` | loaded | Confirmed planning docs may exist on `develop`, but code/runtime changes require `change/player-card`. |
| 2026-07-08 | `LC-002/S1/R3`; `LC-001-S15` planning for backend/UI split | Convex runtime state / Next App Router UI / player-facing left rail | Convex AI guidelines; `convex`; `next-best-practices`; Next.js 16.2.9 docs; `ui-ux-pro-max`; shared visual style guide | loaded; read-only discovery delegated to subagents | Use existing actor/facts contract with validated Convex functions, keep Next pages thin/client components scoped, and make the Player Card persistent, collapsible, accessible, and visually aligned with the narrative workbench. |
| 2026-07-08 | Implementation review before commit | Convex state mutation / prompt context / browser user paths | Convex AI guidelines; Next.js/UI guidance; delegated discovery notes | loaded | Added deterministic unit coverage where possible and browser coverage in the E2E spec; left full E2E execution blocked by intentionally running dev server. |

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

### 5. Verification

- [x] 5.1 Add or update focused tests for Adventure creation player name validation and copied player actor/profile fields.
- [x] 5.2 Add or update focused tests for Player Card snapshot/context shape and profile field save/clear behavior.
- [x] 5.3 Add or update focused prompt tests for Player Card inclusion and player-agency instruction preservation.
- [x] 5.4 Add deterministic E2E or browser coverage for name prompt, cancel path, Player Card expand/collapse, profile edit persistence, and reload.
- [x] 5.5 Run `npm run ci:required`.
- [ ] 5.6 Run `npm run convex:once` when Convex generated function shape changes.
- [x] 5.7 Update Story-level Verified By maps with scenario-mapped evidence.
- [x] 5.8 Perform manual UI confirmation or record pending Taylor status.

### 6. Review And Closeout

- [ ] 6.1 Update root `CHANGELOG.md` under `Unreleased / Added` when implemented.
- [ ] 6.2 Run `/sdd-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, changelog, ADR consistency, and branch readiness.
- [ ] 6.3 Record review outcome as a `review.md` path, clean review entry, or explicit user-approved review waiver.
- [ ] 6.4 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [ ] 6.5 Record manual UI confirmation status as `pending Taylor`, `Taylor confirmed`, or `accepted gap`.
- [ ] 6.6 Confirm proposal/design/tasks/review artifacts do not still claim completed work is not implemented, not verified, pending, or accepted under obsolete manual status vocabulary.
- [ ] 6.7 Confirm closeout state has no contradictory Resume Here, checklist, review, manual confirmation, changelog, ADR, PR/merge, deferred-gap, or folder-location claims.
- [ ] 6.8 Create a PR or merge only after `/sdd-review` is ready and the app branch policy plus user authorization allow it.
- [ ] 6.9 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-07-08 | Planning | main; `sdd-propose`; project AGENTS; shared visual style guide; UI/UX guidance | `proposal.md`, `design.md`, `tasks.md` | Proposed Player Card scope and Epic updates. | `5e9074a` |
| 2026-07-08 | Player Card implementation | main; Convex/Next/UI guidance; delegated discovery | `convex/world.ts`, `src/features/play/*`, `src/lib/world/*`, `src/lib/director/*`, E2E spec | Implemented named Adventure creation, Player Card profile editing, prompt context, reset preservation, and deterministic tests. | `5e9074a` |
| 2026-07-08 | Documentation and Epic traceability | main | README, CHANGELOG, data model, persistence doc, LC-001, LC-002 | Updated user-facing docs and scenario-mapped Epic evidence for Player Card behavior. | `5e9074a` |

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

## Manual Feedback

Record the user's manual testing feedback after implementation starts.

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| 2026-07-08 | Player Card should feel more like a floating video-game panel instead of a fixed sidebar. | requirement refinement | Updated Player Card surface styling with inset spacing, rounded elevated panel, softer ring, shadow, and contained controls. | addressed |

## Planning Updates

Record `/sdd-propose --replan` updates when implementation or feedback discovers planning-level requirements.

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|---|
| YYYY-MM-DD | TBD | in-scope refinement / scope expansion / product drift / Epic ownership change / technical constraint / follow-up change | proposal.md / design.md / tasks.md | `/sdd-apply` TBD |

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
- Expected result:
  - The Player Card feels like part of the player-facing story surface, not debug UI.
  - The story stream remains readable with the Player Card expanded and collapsed.
  - Filled player profile fields persist across reload and appear in Game Master context.
  - Blank or cleared fields do not show stale or misleading content.
- Feedback that would change artifacts:
  - Left rail feels too intrusive.
  - Inline editing feels too form-like.
  - Player profile context causes the Game Master to over-author player thoughts, feelings, dialogue, or goals.

## Blockers / Open Questions

- None identified.

## Closeout

- Epic files updated:
- Story labels/references and Requirement/Scenario IDs current:
- Implemented By maps current:
- Scenario-mapped Verified By maps current:
- Superseded earlier Epic truth reconciled:
- ADR status:
- Changelog current:
- `/sdd-review` verdict:
- Review record:
- `review.md` findings resolved:
- Planning updates resolved:
- Manual UI confirmation status:
- PR / merge state:
- Deferred scope accepted:
- Change moved to `docs/changes/closed/`:
