# Tasks: Story Stream Reading Experience

## Resume Here

- Current state: implementation complete with one verification gap
- Last completed action: `th-review` passed after review artifact fixes were committed and gates were rerun
- Next action: PR, merge, or closeout only after Taylor explicitly authorizes the next lifecycle action
- Active branch/ref: `feature/story-stream-reading-experience`
- Expected dirty files: none after review artifact reconciliation is committed
- Known blockers: none

## Task Checklist

### 1. Epic Artifacts

- [x] 1.1 Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` with Story `LC-001-S5`.
- [x] 1.2 Confirm Story `LC-001-S5` has local Requirement IDs, local Scenario IDs, Implemented By, Verified By, and Verification Gaps.
- [x] 1.3 Keep existing Stories `LC-001-S1` through `LC-001-S4` intact unless implementation reveals direct artifact drift.

### 2. Implementation

- [x] 2.1 Implement Story `LC-001-S5: Story Stream Reading Experience`.
  - [x] Requirement R1: Story-First Feed Presentation
    - [x] Scenario R1-S1: Director narration is primary prose
    - [x] Scenario R1-S2: Player input reads as an authored action
    - [x] Scenario R1-S3: World events do not interrupt the story
  - [x] Requirement R2: Bottom-Anchored Continuation
    - [x] Scenario R2-S1: New turn appears near the continuation point
    - [x] Scenario R2-S2: Reload resumes near latest content
    - [x] Scenario R2-S3: Debug sidebar is taller than the story column
  - [x] Requirement R3: Empty, Pending, And Error States Fit The Story Surface
    - [x] Scenario R3-S1: Empty story
    - [x] Scenario R3-S2: Director response pending
    - [x] Scenario R3-S3: Director response fails
- [x] 2.2 Preserve existing narrative input behavior, including Enter-to-send and Shift+Enter multiline.
- [x] 2.3 Update Story-level Implemented By maps with current code locations.
- [x] 2.4 Update root `CHANGELOG.md` under `Changed`.

### 3. Verification

- [x] 3.1 Run `npm run lint`.
- [x] 3.2 Run `npm run build`.
- [ ] 3.3 Verify the story stream with an empty feed. Not run live because that would require rough reset/clearing the current local playtest feed; recorded as a Story verification gap.
- [x] 3.4 Verify the story stream with a long feed and taller debug sidebar.
- [x] 3.5 Verify feed bottom anchoring after reload and after a new Director turn.
- [x] 3.6 Verify pending and error states remain visible near the input.
- [x] 3.7 Update Story-level Verified By maps with concrete evidence.

### 4. Review And Closeout

- [ ] 4.1 Run `th-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, changelog, and branch readiness.
- [ ] 4.2 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [ ] 4.3 Create a PR or merge only after `th-review` is ready and the app branch policy plus Taylor authorization allow it.
- [ ] 4.4 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-06-27 | Proposal artifacts | main with `th-propose` | `docs/changes/2026-06-27-story-stream-reading-experience/` | Drafted proposed change artifacts | `a94702f` |
| 2026-06-27 | Discovery | main with `th-apply`; read project `AGENTS.md`, `developer-guide.md`, README, changelog, Epic, current UI, Next `use client` docs, and specialist routing | change artifacts, Epic, `src/app/world-client.tsx` | Scope is coherent and presentation-only; implementation branch created; no blocking questions | `a94702f` |
| 2026-06-27 | Specialist checkpoint | main; skipped subagent implementation because the first slice is a narrow single-component UI change plus artifact reconciliation | `src/app/world-client.tsx` | Use existing client boundary for event handlers and scroll refs; keep Convex/backend untouched | `a94702f` |
| 2026-06-27 | LC-001-S5 R1-R3 implementation | main; browser UI guidance via `agent-browser` fallback to `npx agent-browser` | `src/app/world-client.tsx`, Epic, changelog | Replaced chat cards with story stream, independent story/debug scrolling, direct bottom anchoring, and continuation-form states | `a94702f` |
| 2026-06-27 | Fresh-context review remediation | frontend subagent review, main verification | `src/app/world-client.tsx`, Epic, tasks | Fixed narrow viewport reload/continuation gap by constraining the play surface on all breakpoints while leaving debug below the first viewport on mobile | `a94702f` |
| 2026-06-27 | Manual feedback: font normalization | main | `src/app/world-client.tsx`, Epic, tasks | Reduced and normalized stream typography to app sans font, removed serif/italic presentation, and kept story hierarchy through spacing/color | `7adc9b5` |
| 2026-06-27 | Manual feedback: player label | main | `src/app/world-client.tsx`, tasks | Changed the story stream player label from `Taylor` to generic `Player` until username or character name exists | `4b98038` |
| 2026-06-27 | Manual feedback: optimistic input clear | main | `src/app/world-client.tsx`, tasks | Clear narrative input immediately on submit; restore the submitted text on failure only when no new draft has been typed | `750cf09` |
| 2026-06-27 | Manual feedback: remove submit button | main | `src/app/world-client.tsx`, tasks | Removed the Send/Director Thinking button, made the textarea full width, and kept pending feedback as a small status line | `7875264` |

## Verification Ledger

Record proof as it happens.

| Date | Check | What It Proves | Result |
|---|---|---|---|
| 2026-06-27 | Artifact reread | Proposal, design, and tasks exist and satisfy initial `th-propose` structure | Passed |
| 2026-06-27 | `npm run lint` | Story-stream UI compiles under ESLint rules | Passed |
| 2026-06-27 | `npm run build` | Next.js production build succeeds for `/` and `/api/director/turn` | Passed |
| 2026-06-27 | `npm run test` | Existing Director/domain tests remain green after UI-only change | Passed: 1 file, 12 tests |
| 2026-06-27 | Browser metrics at `http://localhost:3000` | Desktop body does not scroll, story pane scrolls independently to exact bottom, and taller debug panel scrolls independently | Passed |
| 2026-06-27 | Browser metrics at `390x844` | Narrow viewport keeps continuation form in first viewport while story pane scrolls independently to exact bottom | Passed |
| 2026-06-27 | Browser pending-state stub | Enter submits textarea, duplicate submit is disabled, and pending state appears near continuation input without real LLM/Convex mutation | Passed |
| 2026-06-27 | Browser error-state stub | Director error appears near continuation input and existing story remains readable without real LLM/Convex mutation | Passed |
| 2026-06-27 | Fresh-context frontend review | Independent review caught narrow viewport `R2-S2` gap; remediation verified by main agent | Passed after fix |
| 2026-06-27 | `npm run lint` after font feedback | Typography-only UI change remains lint-clean | Passed |
| 2026-06-27 | `npm run build` after font feedback | Next.js production build still succeeds after typography change | Passed |
| 2026-06-27 | Browser typography check at desktop | Narration uses normalized app sans font at reduced scale and story pane remains anchored to bottom | Passed |
| 2026-06-27 | Browser typography check at `390x844` | Narrow viewport still keeps continuation form visible and story pane anchored after typography reduction | Passed |
| 2026-06-27 | `npm run lint` after optimistic input clear | Submit-flow change remains lint-clean | Passed |
| 2026-06-27 | Browser pending-state stub after optimistic input clear | Textarea clears immediately while the Director request is unresolved and duplicate submission remains disabled | Passed |
| 2026-06-27 | Browser error-state stub after optimistic input clear | Failed Director request restores submitted text when no replacement draft has been typed | Passed |
| 2026-06-27 | `npm run lint` after removing submit button | Full-width textbox change remains lint-clean | Passed |
| 2026-06-27 | Browser pending-state stub after removing submit button | No player-facing submit button remains, Enter submits from the textarea, textarea clears, and pending feedback appears as text | Passed |

## Manual Feedback

Record Taylor's manual testing feedback after implementation starts.

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| 2026-06-27 | "Reduce and normalize the font" | requirement refinement | Reduced oversized story typography and normalized narration/player text to the app's sans font while preserving story-first hierarchy | resolved |
| 2026-06-27 | Change "TAYLOR" to "PLAYER" because the future label may be username or character name | requirement refinement | Changed the player-facing story stream label to `Player`; debug actor identity remains unchanged | resolved |
| 2026-06-27 | Message stays in the input box until the Director action resolves | defect | Changed submit flow to clear the textarea immediately after valid submit starts and preserve failure recovery behavior | resolved |
| 2026-06-27 | Remove the Send/Director Thinking button and make the input a full-width textbox | requirement refinement | Removed the explicit submit button, kept Enter-to-send, and moved pending feedback to a small status line under the textbox | resolved |

## Blockers / Open Questions

- None blocking.
- Non-blocking: exact visual treatment can be tuned during implementation as long as it remains story-first and not chat-bubble-first.
- Verification gap: live empty-feed state still needs a browser check after Taylor approves using rough reset or another non-destructive fixture path.

## Closeout

- Epic files updated: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Story/Requirement/Scenario IDs current: yes
- Implemented By maps current: yes
- Verified By maps current: yes, with empty-feed live check gap recorded
- Changelog current: yes
- `th-review` verdict: ready
- `review.md` findings resolved: yes
- PR / merge state: not created or merged
- Deferred scope accepted:
- Change moved to `docs/changes/closed/`:
