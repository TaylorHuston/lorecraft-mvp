# Tasks: UI Polish

## Resume Here

- Closed on 2026-06-30 after local merge to `develop`.
- Current scope was small polish on the Lorecraft MVP playtest UI only.

## Interactive Log

| Time | Request / Feedback | Classification | Files / Artifacts | Verification |
|---|---|---|---|---|
| 2026-06-30 | Start an interactive SDD session named `ui polish`. | artifact drift | Created this change folder. | Context loaded from app guidance, shared visual guide, Lorecraft visual identity, package scripts, git status, and LC-001 Epic. |
| 2026-06-30 | Read the shared style guides and Lorecraft visual identity before making UI tweaks. | verification gap | `03-spaces/shared/visual-style-guide.md`, `03-spaces/spaces-docs/lorecraft/visual-identity.md` | Re-read both docs and searched `03-spaces` for related style/identity docs. |
| 2026-06-30 | Take a first crack at tweaking the UI to follow the shared style guide and Lorecraft visual identity. | cosmetic | `src/app/world-client.tsx`, `src/app/globals.css` | `npm run lint`, `npm run typecheck`, `curl -I http://localhost:3000`, and Playwright render checks passed. |
| 2026-06-30 | Make the debug panel collapsible. | small in-scope behavior | `src/app/world-client.tsx` | `npm run lint`, `npm run typecheck`, and Playwright collapse/reopen check passed. |
| 2026-06-30 | Add a fixed top bar with `Lorecraft - <world name>` on the left and a gear icon toggle for the debug panel on the right. | small in-scope behavior | `src/app/world-client.tsx` | `npm run lint`, `npm run typecheck`, and Playwright gear toggle check passed. |
| 2026-06-30 | Remove the old large `Stormbound Chapel` header area now that the fixed top bar carries world identity. | cosmetic | `src/app/world-client.tsx` | `npm run lint`, `npm run typecheck`, and Playwright render check passed. |
| 2026-06-30 | Give major divs, sections, panels, and repeated UI records canonical DOM IDs so they are easier to reference in chat. | small in-scope behavior | `src/app/world-client.tsx` | `npm run lint`, `npm run typecheck`, and Playwright DOM ID smoke check passed. |
| 2026-06-30 | Remove borders and padding from `story-panel` so the story area feels like it is floating. | cosmetic | `src/app/world-client.tsx` | `npm run lint`, `npm run typecheck`, and Playwright class/render check passed. |
| 2026-06-30 | Make the debug panel slide out from the right and remove the centered margin/max-width from `app-workbench`. | small in-scope behavior | `src/app/world-client.tsx` | `npm run lint`, `npm run typecheck`, and Playwright slide-out check passed. |
| 2026-06-30 | Make the input area the same width as the story stream, change the prompt to `What do you do next?`, and restyle it as a rounded floating input box with lighter background instead of border emphasis. | cosmetic | `src/app/world-client.tsx` | `npm run lint`, `npm run typecheck`, and Playwright width/style check passed. |
| 2026-06-30 | Simplify the narrative input toward the AI Dungeon reference: no resize handle, one solid color, and more minimal chrome. | cosmetic | `src/app/world-client.tsx` | `npm run lint`, `npm run typecheck`, and Playwright input style check passed. |
| 2026-06-30 | Reduce the input height, make it slightly rounder, and show `What do you do next?` as a visible first line above the response line. | cosmetic | `src/app/world-client.tsx` | `npm run lint`, `npm run typecheck`, and Playwright input prompt-line check passed. |
| 2026-06-30 | Replace the `Game Master thinking` status text by swapping the whole input box for a placeholder loading animation while a response is generated. | cosmetic | `src/app/world-client.tsx` | `npm run lint`, `npm run typecheck`, and Playwright pending-state check passed. |
| 2026-06-30 | Remove the `Game Master response persisted.` success confirmation after completed turns. | cosmetic | `src/app/world-client.tsx` | `npm run lint`, `npm run typecheck`, and copy search passed. |
| 2026-06-30 | Read the latest Game Master logs and confirm whether the backend side looks healthy after UI testing. | verification gap | `logs/director-debug.jsonl` | Last eight records were all `success` / HTTP 200; no ignored updates or validation errors. |
| 2026-06-30 | Rename debug reset actions from `Fresh seed` / `Rough reset` to `Reset World` / `Reset Session`. | cosmetic | `src/app/world-client.tsx` | `npm run lint`, `npm run typecheck`, and copy search passed. |
| 2026-06-30 | Make the fixed top bar span the full browser width instead of using the centered app max-width. | cosmetic | `src/app/world-client.tsx` | `npm run lint`, `npm run typecheck`, and Playwright geometry check passed. |
| 2026-06-30 | Widen `story-stream-inner` closer to 800px, increase story text size by about 1px, and justify narrative prose. | cosmetic | `src/app/world-client.tsx` | `npm run lint`, `npm run typecheck`, and Playwright typography check passed. |
| 2026-06-30 | Add right-side padding to the story stream to visually compensate for the left turn-number gutter. | cosmetic | `src/app/world-client.tsx` | `npm run lint`, `npm run typecheck`, and Playwright geometry check passed. |

## Checklist

- [x] Select Lorecraft app and create `change/ui-polish`.
- [x] Load app guidance, developer guide, visual identity, package scripts, git status, and relevant Epic context.
- [x] Create lightweight proposal/design/tasks artifacts.
- [x] Record each UI polish request before or immediately after implementation.
- [x] Implement first focused UI polish request.
- [x] Implement debug panel collapse behavior.
- [x] Implement fixed top bar and gear debug toggle.
- [x] Remove duplicate in-page world header.
- [x] Add canonical DOM IDs to UI structure.
- [x] Remove story panel container chrome.
- [x] Convert debug panel to right-side slide-out overlay and uncenter `app-workbench`.
- [x] Align and restyle the narrative input.
- [x] Simplify narrative input chrome.
- [x] Tighten narrative input height and visible prompt line.
- [x] Replace pending input status with loading placeholder surface.
- [x] Remove completed-turn success confirmation.
- [x] Rename reset action labels.
- [x] Make top bar full browser width.
- [x] Tune story text measure and typography.
- [x] Balance story stream against turn-number gutter.
- [x] Run focused verification.
- [x] Confirm Epic truth remains current for presentation-only UI polish.
- [x] Prepare for `/sdd-review` if code or user-visible behavior changes.

## Implementation Ledger

- Created `docs/changes/2026-06-30-ui-polish/` as the working-session ledger.
- First UI polish pass:
  - Shifted play accents from cyan to warm amber.
  - Used muted emerald/green for durable state and world-event cues.
  - Tightened the top header so the play surface feels like a workbench instead of a landing page.
  - Narrowed the debug inspector and made its typography/buttons denser and more subordinate.
  - Made the story pane read more like a narrative document with softer borders and more comfortable prose measure.
  - Replaced hardcoded Arial globals with a Geist/system UI stack.
- Debug panel collapse request:
  - Add client-local collapse state for the right debug inspector.
  - Keep the player-facing narrative surface visible and give it more room when debug is collapsed.
  - Do not persist collapse state or change backend/debug data behavior.
- Implemented debug panel collapse:
  - Added a client-local `isDebugPanelCollapsed` state.
  - Initial implementation used an in-panel `Collapse` control and compact `DBG` rail.
  - This was superseded by the fixed top-bar gear toggle and right-side slide-out panel.
- Fixed top bar request:
  - Add persistent app chrome above the workbench.
  - Show `Lorecraft - <world name>` on the left.
  - Use a gear icon button on the right as the debug panel toggle.
  - Keep the toggle client-local and do not change debug data behavior.
- Implemented fixed top bar:
  - Added a fixed 48px top bar above the workbench.
  - Displays `Lorecraft - <world name>` from the loaded snapshot, falling back to loading/no-world text.
  - Added an accessible gear icon button that toggles the debug panel.
  - Removed the in-panel collapse/rail control so the gear is the single debug visibility affordance.
  - Adjusted the app shell heights so the fixed bar does not cover the story stream or input.
- Duplicate header removal request:
  - Remove the old large in-page `Lorecraft MVP` / `Stormbound Chapel` / description header.
  - Keep the fixed top bar as the world identity surface.
  - Leave story feed and input behavior unchanged.
- Implemented duplicate header removal:
  - Removed the large in-page header block from the main play surface.
  - Let the story stream begin directly below the fixed app bar.
- Canonical DOM ID request:
  - Add stable IDs to the app shell, top bar, story panel, input panel, debug panel, tabs, prompt controls, NPC cards, debug lists, and debug JSON blocks.
  - Use deterministic sanitized IDs for repeated/dynamic elements.
  - Do not change visible UI or backend behavior.
- Implemented canonical DOM IDs:
  - Added IDs for app shell landmarks including `lorecraft-app`, `app-top-bar`, `app-workbench`, `story-panel`, `story-stream`, `story-feed`, `narrative-input-form`, `debug-panel`, and `debug-panel-content`.
  - Added IDs for key controls including `debug-panel-toggle`, `seed-world-button`, `fresh-seed-button`, `rough-reset-button`, and prompt/debug tab buttons.
  - Added sanitized deterministic IDs for repeated story entries, NPC cards, NPC override fields, debug lists, and debug JSON blocks.
- Story panel floating request:
  - Remove outer padding from `story-panel`.
  - Remove story stream border chrome.
  - Preserve readable inner story measure and the existing input surface for now.
- Implemented story panel floating treatment:
  - Removed padding from `story-panel`.
  - Removed the border/background frame from `story-stream`.
  - Moved responsive gutters to `story-stream` and `narrative-input-form` so content remains readable without making the panel itself visible.
- Debug slide-out request:
  - Remove the centered `mx-auto max-w-7xl` constraint from `app-workbench`.
  - Keep the story workbench full-width.
  - Make `debug-panel` a fixed right-side overlay that slides in and out from the right using the existing gear toggle.
  - Do not change debug data behavior.
- Implemented debug slide-out overlay:
  - `app-workbench` no longer uses `mx-auto` or `max-w-7xl`.
  - `debug-panel` is now a fixed right-side overlay below the top bar.
  - Gear toggle switches the panel between `translate-x-0` and `translate-x-full`.
  - Hidden panel uses `pointer-events-none` and `aria-hidden=true`.
- Narrative input restyle request:
  - Match the input form width to the story stream measure.
  - Change the visible input prompt to `What do you do next?`.
  - Use a rounded floating background treatment rather than a border-led panel.
- Implemented narrative input restyle:
  - Set `narrative-input-form` to the same `max-w-[46rem]` measure as `story-stream-inner`.
  - Centered the form with responsive width gutters.
  - Changed the label text to `What do you do next?`.
  - Removed form and textarea borders in favor of lighter rounded background surfaces.
- Narrative input simplification request:
  - Remove the textarea resize handle.
  - Use one solid background color for the input surface instead of nested surface colors.
  - Keep the control more minimal and closer to the AI Dungeon reference.
- Implemented narrative input simplification:
  - Made the visible prompt a placeholder: `What do you do next?`.
  - Kept the accessible label as screen-reader-only text.
  - Changed the textarea to transparent and non-resizable.
  - Removed the nested textarea background and border so the form reads as one solid rounded surface.
- Narrative input prompt-line request:
  - Reduce the overall input height.
  - Make the floating input slightly rounder.
  - Show `What do you do next?` as visible text on the first line, with the player response typed on the following line.
- Implemented narrative input prompt-line change:
  - Reduced form vertical padding and textarea height.
  - Increased form radius to `rounded-2xl`.
  - Made `What do you do next?` a visible label inside the floating input surface.
  - Changed the textarea placeholder to `Type your response...`.
- Pending input loading request:
  - Remove the separate `Game Master thinking...` text below the input.
  - While a turn is submitting, replace the whole input surface with a minimal loading placeholder animation.
  - Preserve the existing turn submission behavior and input restoration on error.
- Implemented pending input loading surface:
  - Added `TurnPendingPlaceholder`.
  - When `isSubmitting` is true, the editable label/textarea are replaced by a status surface with pulsing amber dots and `The story is turning...`.
  - Removed the old separate `Game Master thinking...` text.
- Completed-turn confirmation removal request:
  - Stop showing `Game Master response persisted.` after a successful turn.
  - Keep error display and input restoration behavior unchanged.
- Reset action label request:
  - Rename `Fresh seed` to `Reset World`.
  - Rename `Rough reset` to `Reset Session`.
  - Do not change reset behavior in this UI polish tweak.
- Implemented reset action label rename:
  - Debug panel seed action now reads `Reset World`.
  - Debug panel playtest reset action now reads `Reset Session`, with `Resetting` retained while in progress.
- Top bar full-width request:
  - Remove the centered/max-width treatment from `app-top-bar-inner`.
  - Keep the existing fixed top bar behavior and gear toggle.
- Implemented top bar full-width tweak:
  - Replaced `mx-auto max-w-7xl` on `app-top-bar-inner` with `w-full`.
  - Left the fixed outer top bar, title, and gear toggle behavior unchanged.
- Story typography request:
  - Change `story-stream-inner` from 46rem to about 800px.
  - Keep the input aligned to the same measure.
  - Increase story text size by about 1px.
  - Make narrative prose justify to the full text measure.
- Implemented story typography tweak:
  - Changed story and input max width from `46rem` to `50rem`.
  - Increased Game Master narration text from `1.02rem` to `1.08rem`.
  - Increased player input text from `0.95rem` to `1rem`.
  - Added justified text alignment to Game Master narration prose.
- Story stream balance request:
  - Add right-side visual padding to offset the left turn-number gutter.
  - Keep the prose content width near 800px while making the column feel centered.
- Implemented story stream balance:
  - Changed `story-stream-inner` to `max-w-[53rem]`.
  - Added `sm:pr-12`, matching the desktop turn-number gutter plus gap.
  - Left `story-feed` content and `narrative-input-form` at 800px.
- Implemented completed-turn confirmation removal:
  - Removed the success-path `setNotice("Game Master response persisted.")` call.
  - Left reset, seed, NPC override clear, and error messages unchanged.

## Verification Ledger

- Context verification:
  - `git status --short --branch` showed Lorecraft on `develop...origin/develop [ahead 3]` with pre-existing dirty `docs/ci-cd.md`.
  - `git switch -c change/ui-polish` created the implementation branch.
  - Read `AGENTS.md`, `README.md`, package scripts, shared visual guide, Lorecraft visual identity, and LC-001 Epic.
  - Re-read `03-spaces/shared/visual-style-guide.md` and `03-spaces/spaces-docs/lorecraft/visual-identity.md` after Taylor specifically called out the new style guidance.
- First UI polish verification:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - `curl -I http://localhost:3000` returned `HTTP/1.1 200 OK`.
  - Playwright render smoke checks loaded desktop `1440x1000` and mobile-width `390x844` views with the expected heading and UI content.
- Debug collapse verification:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - Initial Playwright verification clicked `Collapse`, verified prompt content disappeared and `DBG` appeared, clicked `DBG`, and verified prompt content returned.
  - This behavior was later superseded by the top-bar gear toggle checks.
- Top bar gear verification:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - Playwright verified the top bar included `Lorecraft` and `Stormbound Chapel`.
  - Playwright clicked the gear button to hide the debug panel, verified debug content disappeared, clicked the gear again, and verified debug content returned.
- Duplicate header removal verification:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - Playwright verified there is no in-page `h1`, the old descriptive header copy is absent, and the top bar still includes `Lorecraft` and `Stormbound Chapel`.
- Canonical DOM ID verification:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - Playwright verified required IDs exist for the app shell, story surface, input form, debug panel, tabs, and prompt guidance panel.
  - Playwright found 109 rendered IDs and no duplicate IDs in the current page.
- Story panel floating verification:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - Playwright verified `story-panel` exists with no padding classes and `story-stream` exists with no border classes.
- Debug slide-out verification:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - Playwright verified `app-workbench` no longer includes the centered/max-width wrapper classes.
  - Playwright clicked the gear and verified `debug-panel` moves fully offscreen with `translate-x-full`, then returns with `translate-x-0`.
- Narrative input restyle verification:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - Playwright verified the label text is `What do you do next?`.
  - Playwright verified `narrative-input-form` and `story-stream-inner` both render at 736px in the desktop smoke viewport.
  - Playwright verified the form and textarea have `0px` border width and use background color instead.
- Narrative input simplification verification:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - Playwright verified the placeholder is `What do you do next?`.
  - Playwright verified textarea `resize` computes to `none`.
  - Playwright verified form and textarea border widths are `0px`, the form has a solid background, and the textarea background is transparent.
- Narrative input prompt-line verification:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - Playwright verified visible label text is `What do you do next?`.
  - Playwright verified textarea placeholder is `Type your response...`, form height is 106px, textarea height is 48px, border radius is 16px, and resize remains `none`.
- Pending input loading verification:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - Playwright held `/api/director/turn` open, submitted a turn, verified `turn-pending-placeholder` appeared, and verified `director-input` was absent while pending.
- Completed-turn confirmation removal verification:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - `rg "Game Master response persisted"` no longer finds the copy in app source.
- Latest log verification:
  - Parsed the last eight `logs/director-debug.jsonl` records.
  - Story generation and NPC extraction records all had `status: success` and `httpStatus: 200`.
  - No ignored updates, invalid-output records, or provider errors appeared in the sampled records.
  - One older story generation record was visibly truncated at `She scram`, but subsequent shorter-output turns completed cleanly.
- Reset action label verification:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - Copy search confirms `Reset World` and `Reset Session` are present in app source and old debug labels are gone.
- Top bar full-width verification:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - Playwright verified `app-top-bar-inner` rendered from x=0 to x=1440 in a 1440px viewport and no longer includes `mx-auto` or `max-w-7xl`.
- Story typography verification:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - Playwright verified `story-stream-inner` and `narrative-input-form` both render at 800px in the desktop smoke viewport.
  - Playwright verified Game Master narration computes to `17.28px` and `text-align: justify`; player text computes to `16px`.
- Story stream balance verification:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - Playwright verified `story-stream-inner` renders at 848px with 48px right padding, while `story-feed` and `narrative-input-form` remain 800px wide.

## Manual UI Confirmation

- App URL / route: `http://localhost:3000/`
- Required setup or test data: existing local dev server should remain running via `npm run dev:debug`; seed/reset demo world if the UI shows the seed screen.
- Steps for Taylor:
  - Inspect the story stream, input, and debug panel at `http://localhost:3000/`.
  - Confirm whether the story-first reading surface, restrained amber/green accents, compact debug panel, and denser controls match the intended direction.
  - Click the gear icon in the fixed top bar, confirm the debug panel slides out from the right, then click the gear again to reopen it.
  - Confirm the fixed top bar spans the full browser width and remains visible while reading.
  - Confirm the floating `What do you do next?` input feels aligned to the story stream and disappears into a loading placeholder while a turn is pending.
  - After implementation, inspect the affected route or panel at normal and zoomed-out browser sizes.
- Expected result:
  - UI changes should improve readability, density, or interaction clarity without changing gameplay behavior unless explicitly accepted.
  - The app should feel less like a generic chat and more like a narrative workbench: amber player/story focus, green committed-state cues, compact debug panel, and calmer story reading surface.
- Feedback that would change artifacts:
  - Any request that introduces new gameplay behavior, persistent state, schema/API changes, or a broader redesign.

## Artifact Updates

- Created `proposal.md`, `design.md`, and `tasks.md`.

## Open Questions

- No blocking open questions for this UI polish pass.

## Closeout

- Review record: `review.md`.
- Manual UI confirmation status: Taylor accepted close/merge by requesting closeout.
- Changelog status: not needed; this is internal MVP playtest UI polish without a release-facing behavior change.
- PR / merge state: merged locally into `develop` on 2026-06-30 via merge commit `Merge change/ui-polish`; no remote PR was created.
- Deferred gaps accepted: none.
- Folder state: closed under `docs/changes/closed/2026-06-30-ui-polish/`.
