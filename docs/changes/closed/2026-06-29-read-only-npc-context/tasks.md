# Tasks: Read-Only NPC Context

## Resume Here

- Current state: closed after local `/sdd-review` passed and Taylor authorized close-and-merge; implementation is being committed on `change/read-only-npc-context` for merge into `develop`
- Last completed action: `npm run playtest:director -- --timeout-ms 240000` passed against the running local app after updating stale smoke-test assertions
- Next action: merge committed `change/read-only-npc-context` into `develop`
- Active branch/ref: `change/read-only-npc-context`; target branch: `develop`
- Expected dirty files: app implementation/docs for LC-001-S9; unrelated vault-root dirty files are outside this app repo and must remain untouched
- Known blockers: none; manual UI confirmation remains pending Taylor as an accepted closeout gap for this local MVP iteration

## Task Checklist

### 1. Epic Artifacts

- [x] 1.1 Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` with Story `LC-001-S9`.
- [x] 1.2 Add or adjust cross-references in existing LC-001 Stories only where needed to distinguish read-only NPC context from mutation and transcript mode behavior.
- [x] 1.3 Confirm Story `LC-001-S9` has app-unique stable Story ID, local Requirement IDs, local Scenario IDs, Implemented By, Verified By, and Verification Gaps.

### 2. Implementation

- [x] 2.1 Implement Story LC-001-S9: Read-Only NPC Context.
  - [x] Requirement R1: NPC Profiles In Game Master Context.
    - [x] Scenario R1-S1: NPC description grounds a look action.
    - [x] Scenario R1-S2: NPC context is structured separately from transcript.
  - [x] Requirement R2: Read-Only NPC Mutation Boundary.
    - [x] Scenario R2-S1: Story generation includes NPC update-like text.
    - [x] Scenario R2-S2: Existing NPC values remain unchanged after narration.
  - [x] Requirement R3: Debug NPC Inspection And Overrides.
    - [x] Scenario R3-S1: Debug panel shows NPC fields.
    - [x] Scenario R3-S2: Debug override affects Game Master context.
    - [x] Scenario R3-S3: Debug override is non-durable.
- [x] 2.2 Add a typed NPC profile/context shape if implementation needs one.
- [x] 2.3 Add a server-local non-durable debug override mechanism.
- [x] 2.4 Add a debug-panel `NPCs` tab for inspection and temporary override controls.
- [x] 2.5 Update Story-level Implemented By maps with current code locations.

### 3. Verification

- [x] 3.1 Add focused tests for persistent Game Master request construction with readable NPC profile context.
- [x] 3.2 Add focused tests or integration coverage proving Game Master-returned NPC updates are not persisted for this change.
- [x] 3.3 Verify debug overrides affect Game Master context while remaining non-durable across application server restart.
- [x] 3.4 Run `npm run ci:required`.
- [x] 3.5 Run `npx convex codegen` if Convex schema/functions/types are changed. Not applicable; no Convex schema/generated API changes.
- [x] 3.6 Run a local Game Master playtest using a `Look at Mira` style input and inspect debug/raw request evidence.
- [x] 3.7 Update Story-level Verified By maps with concrete evidence.

### 4. Documentation

- [x] 4.1 Update `docs/data-model.md` with the read-only NPC profile strategy and debug override non-persistence boundary.
- [x] 4.2 Update `docs/persistence-system.md` to explain NPC read context versus NPC mutation.
- [x] 4.3 Update `README.md` with debug `NPCs` tab and override guidance if useful for playtesting.
- [x] 4.4 Update `CHANGELOG.md` under `Unreleased` / `Added`.

### 5. Review And Closeout

- [x] 5.1 Run `sdd-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, changelog, and branch readiness.
- [x] 5.2 Record review outcome as a `review.md` path, a clean review recorded in this ledger, or an explicit Taylor-approved review waiver.
- [x] 5.3 Address any `review.md` findings or explicitly defer accepted non-blocking risks. No `review.md` findings were created.
- [x] 5.4 Record manual UI confirmation status as `not applicable`, `pending Taylor`, `Taylor confirmed`, or `accepted gap`.
- [x] 5.5 Confirm closeout state has no contradictory Resume Here, checklist, review, manual confirmation, changelog, PR/merge, deferred-gap, or folder-location claims.
- [x] 5.6 Create a PR or merge only after `sdd-review` is ready and the app branch policy plus Taylor authorization allow it.
- [x] 5.7 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-06-29 | Proposal | main / sdd-propose | `docs/changes/2026-06-29-read-only-npc-context/` | Initial SDD artifacts drafted | uncommitted |
| 2026-06-29 | Discovery | main / sdd-apply | Change artifacts, branch policy, LC-001 Story IDs | Scope and Story ID uniqueness passed; planning artifacts on `develop` later confirmed allowed, with implementation branch still pending | uncommitted |
| 2026-06-29 | Branch preflight | main / sdd-apply | App git branch | Switched app repo to `change/read-only-npc-context` before code edits | uncommitted |
| 2026-06-29 | Epic truth | main / sdd-apply | `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` | Added Story `LC-001-S9` with Requirements, Scenarios, Implemented By, Verified By, and Verification Gaps | uncommitted |
| 2026-06-29 | R1 NPC profiles | main / sdd-apply | `src/lib/director/types.ts`, `src/lib/director/npc-profiles.ts`, `src/lib/director/prompt.ts` | Added structured read-only NPC profiles to persistent Game Master context while transcript mode stays transcript-only | uncommitted |
| 2026-06-29 | R2 mutation boundary | main / sdd-apply | `src/lib/director/prompt.ts`, `src/app/api/director/turn/route.ts`, `src/lib/director/director.test.ts` | Persistent prompt now requires empty `npcUpdates`; backend ignores Game Master NPC updates for this change | uncommitted |
| 2026-06-29 | R3 debug overrides | main / sdd-apply | `src/lib/director/npc-debug-overrides.ts`, `src/app/api/debug/npc-overrides/route.ts`, `src/app/world-client.tsx` | Added process-local NPC overrides and debug `NPCs` tab for inspection/testing | uncommitted |
| 2026-06-29 | Docs | main / sdd-apply | `README.md`, `CHANGELOG.md`, `docs/data-model.md`, `docs/persistence-system.md` | Documented read-only NPC context, debug override lifetime, and current no-mutation strategy | uncommitted |
| 2026-06-30 | Manual feedback remediation | main | `src/app/world-client.tsx`, `src/lib/director/director.test.ts`, `src/app/api/debug/npc-overrides/route.ts` | Made canonical NPC values visible in the debug panel and added deterministic tests for override store, route handlers, and route-saved override injection into Game Master prompt context | uncommitted |
| 2026-06-30 | Manual feedback refinement | main | `src/app/world-client.tsx` | Replaced explicit Apply flow with debounced autosave, visible save status, and an explicit Clear action for NPC debug overrides | uncommitted |
| 2026-06-30 | Manual feedback remediation | main | `src/lib/director/prompt.ts`, `src/lib/director/director.test.ts`, docs | Added persistent prompt priority, `lastAction`, `sceneDirective`, canonical NPC profile conflict policy, and quoted-question direct-NPC targeting | uncommitted |
| 2026-06-30 | Manual feedback refinement | main | `convex/world.ts`, `src/lib/director/prompt.ts`, `src/lib/director/director.test.ts`, docs | Split Mira's NPC profile context into stable description, background, persona, voice, mood, status, memory, and private knowledge | uncommitted |
| 2026-06-30 | Manual feedback refinement | main | `src/lib/director/prompt.ts`, `src/lib/director/director.test.ts`, docs | Rendered NPC profiles as canonical NPC Cards, added non-durable conversation focus for ambiguous follow-up dialogue, and made speech-like direct address expect a small response | uncommitted |
| 2026-06-30 | Manual feedback refinement | main | `convex/world.ts`, `src/lib/director/director.test.ts`, README/docs/Epic | Added Brother Alden as a second seeded chapel NPC so playtests can exercise multiple present NPCs | uncommitted |
| 2026-06-30 | Manual feedback refinement | main | `src/lib/director/prompt.ts`, `src/lib/director/director.test.ts`, `CHANGELOG.md` | Replaced verbose JSON prompt component dumps with compact AI Dungeon-style provider prompts while keeping structured request summaries for logs | uncommitted |
| 2026-06-30 | Manual feedback refinement | main | `src/app/api/director/turn/route.ts`, `src/lib/director/prompt.ts`, `src/lib/director/director.test.ts`, docs | Split story generation from future state extraction by requesting plain prose in persistent mode and wrapping narration with empty NPC updates | uncommitted |
| 2026-06-30 | Local model benchmarking | main | `scripts/director-model-benchmark.mjs`, `.env.local`, `src/lib/director/provider.ts`, `src/lib/director/director.test.ts` | Added repeatable same-prompt model benchmark, installed Studio `gemma4:26b-mlx`, `gemma4:31b-mlx`, and `llama3.1:8b`, added `LLM_REASONING_EFFORT`, and switched local playtest default to `gemma4:26b` | uncommitted |
| 2026-06-30 | Review remediation | main / sdd-review | `scripts/director-playtest.mjs`, `src/app/api/debug/npc-overrides/route.ts`, `src/lib/director/director.test.ts`, `README.md` | Updated stale persistent smoke-test assertions for plain-prose/read-only NPC Cards and production-gated debug NPC override routes unless explicitly enabled | uncommitted |

## Verification Ledger

Record proof as it happens.

| Date | Check | What It Proves | Result |
|---|---|---|---|
| 2026-06-29 | Artifact self-check | Proposal/design/tasks exist and identify LC-001-S9 scope | passed |
| 2026-06-29 | Branch policy preflight | Planning artifacts on `develop` are allowed; implementation code edits should use `change/read-only-npc-context` from `develop` unless Taylor explicitly overrides | planning pass / implementation pending |
| 2026-06-30 | `npm run test -- src/lib/director/director.test.ts` | Persistent Game Master request includes NPC profiles; transcript mode omits profiles; override store/route plumbing works; route-saved overrides reach the next Game Master prompt; read-only scene beat suppresses NPC updates | passed, 31 tests |
| 2026-06-29 | `npm run typecheck` | TypeScript compile boundary for app and routes | passed |
| 2026-06-29 | `npm run lint` | React/Next lint boundary for the new debug UI and API route changes | passed |
| 2026-06-30 | `npm run ci:required` | Required local CI after manual feedback remediation: lint, full tests, typecheck, and Next build | passed, 31 tests |
| 2026-06-30 | `npm run ci:required` | Required local CI after NPC debug override autosave UI refinement | passed, 31 tests |
| 2026-06-30 | `npm run test -- src/lib/director/director.test.ts` | Prompt priority, persistent scene directive, and quoted direct-NPC question targeting are deterministic | passed, 31 tests |
| 2026-06-30 | `npm run ci:required` | Required local CI after persistent prompt-priority and targeter changes | passed, 31 tests |
| 2026-06-29 | `git diff --check` | No whitespace errors in the working diff | passed |
| 2026-06-30 | `npm run test -- src/lib/director/director.test.ts` | Refined NPC profile fields, hidden `knowledge` context, scene directive `mustUse`, and read-only update rejection are deterministic | passed, 31 tests |
| 2026-06-30 | `npm run ci:required` | Required local CI after splitting NPC profile fields into description/background/persona/voice/mood/status/memory/knowledge | passed, 31 tests |
| 2026-06-30 | `git diff --check` | No whitespace errors after NPC profile field refinement | passed |
| 2026-06-30 | `npm run test -- src/lib/director/director.test.ts` | NPC Cards, derived conversation focus, direct-address response expectations, and Garth follow-up targeting are deterministic | passed, 33 tests |
| 2026-06-30 | `npm run lint` | ESLint boundary after NPC Card prompt rendering changes | passed |
| 2026-06-30 | `npm run typecheck` | TypeScript compile boundary after NPC Card prompt rendering changes | passed |
| 2026-06-30 | `npm run ci:required` | Required local CI after NPC Card prompt rendering and derived conversation focus | passed, 33 tests |
| 2026-06-30 | `npm run test -- src/lib/director/director.test.ts` | Compact persistent/transcript provider prompt sections, NPC card content, debug override injection, invalid transcript filtering, and absence of debug-only JSON structures are deterministic | passed, 34 tests |
| 2026-06-30 | `npm run lint` | ESLint boundary after compact provider prompt rendering | passed |
| 2026-06-30 | `npm run typecheck` | TypeScript compile boundary after compact provider prompt rendering | passed |
| 2026-06-30 | `npx --yes tsx -e ...buildDirectorRequest...` | Current seeded persistent prompt request size is reduced to 5,728 chars for two NPCs and 10 recent feed entries, versus the recent logged 18,499-char request shape | passed |
| 2026-06-30 | `npm run test -- src/lib/director/director.test.ts` | Persistent Game Master request now uses plain-prose output, strips provider JSON response format, keeps NPC cards/read-only context, and leaves strict JSON parsing available for future extraction tests | passed, 34 tests |
| 2026-06-30 | `npm run benchmark:director-models -- --models gemma4:31b,gemma4:31b-mlx,gemma4:26b,gemma4:26b-mlx,llama3.1:8b --temperature 0 --reasoning-effort none --max-tokens 500` | Same 6,220-char prompt against Studio models showed `gemma4:26b` as the best current balance: 14.8s complete coherent prose; `gemma4:26b-mlx` was fastest at 10.8s but hit the output cap mid-sentence; `31b`/`31b-mlx` were ~27s; `llama3.1:8b` was 11.7s but lower quality and also capped | passed; artifact `logs/director-model-benchmark.json` |
| 2026-06-30 | `npm run benchmark:director-models -- --models gemma4:31b,gemma4:31b-mlx,gemma4:26b,gemma4:26b-mlx,llama3.1:8b --temperature 0 --reasoning-effort none --max-tokens 200` | AI Dungeon-style shorter cap still favored `gemma4:26b`: 11.5s complete coherent prose; `26b-mlx` was 12.2s and still capped mid-sentence; `31b` variants were ~27s; `llama3.1:8b` was 11.0s but lower quality and capped | passed; artifact `logs/director-model-benchmark-200.json` |
| 2026-06-30 | `npm run test -- src/lib/director/director.test.ts` | Review remediation coverage: persistent smoke-test contract expectations, debug override route production guard, and existing NPC Card/read-only context behavior | passed, 35 tests |
| 2026-06-30 | `npm run ci:required` | Required local CI after `/sdd-review` remediation: lint, full Vitest suite, typecheck, and Next build | passed, 35 tests |
| 2026-06-30 | `npm run playtest:director -- --timeout-ms 240000` | Running local app can seed a fresh world, send direct Mira question and plain action, persist plain-prose Game Master responses, and expose current read-only NPC metadata without durable NPC updates | passed |
| 2026-06-30 | `git diff --check` | No whitespace errors after `/sdd-review` remediation | passed |

## Manual Feedback

Record Taylor's manual testing feedback after implementation starts.

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| 2026-06-29 | Taylor requested reintroducing NPCs as readable objects with attributes visible to the LLM, explicitly excluding intelligent state mutation and adding debug-only non-durable overrides. | requirement refinement | Captured in proposal/design/tasks as LC-001-S9. | accepted |
| 2026-06-30 | Taylor found Mira details blank and then found a red-hair debug override did not appear in Game Master logs. | defect / verification gap | Made current NPC values render as actual text instead of placeholders; added deterministic tests for override storage, debug route GET/POST/DELETE, malformed request rejection, and route-saved override prompt injection. | accepted |
| 2026-06-30 | Taylor asked for NPC debug overrides to behave more like autosave with a Clear button. | requirement refinement | Replaced Apply button with debounced autosave status labels while retaining explicit Clear. | accepted |
| 2026-06-30 | Taylor asked to improve model behavior after logs showed NPC profile data was present but the model still contradicted it or failed to answer. | defect / prompt refinement | Added prompt priority, near-output scene directive, canonical profile conflict policy, and direct-NPC targeting for quoted questions to the sole present NPC. | accepted |
| 2026-06-30 | Taylor asked to separate NPC description, background, personality/voice, status, and memory so the model does not blur biography, current state, and interaction history. | requirement refinement | Refined seeded Mira profile fields and canonical docs around `description`, `background`, `persona`, `voice`, `mood`, `status`, `memory`, and `knowledge`. | accepted |
| 2026-06-30 | Taylor reframed the direction as AI Dungeon-style Story Cards with better structured, consistent, updateable NPC context, while avoiding preemptive game-engine structure. | product direction / prompt refinement | Rendered NPC profiles into canonical NPC Cards and added only derived conversation focus for ambiguous follow-up dialogue; no location or simulation state was added. | accepted |
| 2026-06-30 | Taylor clarified Lorecraft should eventually feel like a TTRPG with hidden adjudication, dice, and rules when uncertainty matters, without becoming a lightweight MUD or random storyteller. | product direction / deferred scope | Documented Game Master-led TTRPG-style adjudication as a future selective GM tool and kept rules, stats, combat, movement commands, and schedules out of current scope. | accepted |
| 2026-06-30 | Taylor asked to significantly trim the prompt using the earlier AI Dungeon example after local 31B responses slowed down. | performance / prompt refinement | Replaced runtime provider prompts with compact sectioned prose while preserving request summaries and raw request logging for troubleshooting. | accepted |
| 2026-06-30 | Taylor asked to apply the proposed split between creative story generation and future structured mutation extraction, without creating rework before mutation is reintroduced next. | architecture refinement | Persistent Game Master generation now returns plain prose; backend normalizes it to narration with empty updates; strict JSON parsing/validation remains available for the upcoming extractor. | accepted |
| 2026-06-30 | Taylor asked whether smaller or MLX-tuned Studio models could be tested systematically with the same prompt. | performance / local model selection | Added a deterministic same-prompt benchmark script, installed missing Studio models, disabled reasoning for Gemma 26B compatibility, and selected `gemma4:26b` as the current local playtest default. | accepted |
| 2026-06-30 | Taylor noted AI Dungeon appears to default to short outputs around 100-200 tokens and asked to try that. | performance / pacing refinement | Set local `LLM_MAX_TOKENS=200`, added a one-complete-short-beat prompt instruction, and reran the same model benchmark at the shorter cap. | accepted |

## Planning Updates

Record `/sdd-propose --replan` updates when implementation or feedback discovers planning-level requirements.

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|---|
| 2026-06-29 | Initial proposal created after transcript mode proved useful but removed authored NPC grounding. | in-scope refinement | Created proposal.md / design.md / tasks.md | `/sdd-apply` from LC-001-S9 R1 |

## Manual UI Confirmation

- Status: pending Taylor
- App URL / route: `http://localhost:3000`
- Required setup or test data: seeded Stormbound Chapel world, app running in persistent Game Master mode, debug panel open
- Steps for Taylor: inspect the new `NPCs` debug tab, override one Mira value, submit a `Look at Mira` or direct Mira interaction, inspect the Game Master raw request/debug evidence, restart the app server, and confirm the override is gone
- Expected result: NPC profile values shape the Game Master response, Game Master NPC update attempts do not mutate canonical NPC state, and debug overrides clear on server restart
- Feedback that would change artifacts: overrides need to be durable, transcript mode should also consume NPC profiles, NPCs need a dedicated table now, or Game Master mutations should be re-enabled

## Questions And Readiness

### Blocking Questions

- None.

### Implementation-Discovery Questions

- Debug override lifetime: default to a module-level in-memory store on the Next.js server. Replan if dev server behavior makes this unusable within one running test session.
- NPC profile type: default to deriving a typed profile from `actors` plus actor-scoped `facts`. Replan if this shape cannot cleanly support the `Look at Mira` grounding behavior.

### Deferred Scope

- Intelligent NPC state mutation.
- Durable debug/admin editing of NPC data.
- Polished World Builder NPC editor.
- Dedicated NPC, relationship, faction, schedule, visibility, or offscreen-simulation models.
- Applying read-only NPC context to transcript mode.
- Hidden TTRPG-style adjudication, dice rolls, stats, combat, and rule systems.

### Apply Readiness

- Status: applied; final verification in progress.
- Reason: Product/design scope has been implemented on the compliant app branch; final CI/review/manual confirmation remain.

## Closeout

- Epic files updated: yes
- Story/Requirement/Scenario IDs current: yes
- Implemented By maps current: yes
- Verified By maps current: yes for automated verification; local LLM playtest remains a Verification Gap
- Changelog current: yes
- `sdd-review` verdict: local review passed after safe remediation
- Review record: clean review recorded in this task ledger; no `review.md` created
- `review.md` findings resolved: not applicable
- Planning updates resolved: yes
- Manual UI confirmation status: pending Taylor; accepted as a non-blocking closeout gap for this local MVP iteration
- PR / merge state: Taylor authorized close-and-merge on 2026-06-30; source branch is committed for local merge into `develop`
- Deferred scope accepted: intelligent NPC state mutation, durable admin editing, World Builder NPC UI, richer NPC models, transcript-mode NPC context
- Change moved to `docs/changes/closed/`: yes
