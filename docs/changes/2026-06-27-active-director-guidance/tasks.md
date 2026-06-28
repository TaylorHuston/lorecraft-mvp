# Tasks: Active Director Guidance

## Resume Here

- Current state: implementation complete, ready for `/th-review`
- Last completed action: follow-up script and trivial-action persistence boundary verified with `npm run playtest:director`, `npm run ci:required`, and `npx convex codegen`
- Next action: run `/th-review` as the local PR gate
- Active branch/ref: `change/active-director-guidance` from `develop`
- Expected dirty files: `docs/changes/2026-06-27-active-director-guidance/`
- Known blockers: none; discovery choices recorded below

## Task Checklist

### 1. Epic Artifacts

- [x] 1.1 Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.
- [x] 1.2 Add Story `LC-001-S7: Active Director Guidance And Context Assembly`.
- [x] 1.3 Confirm the Story has stable Story ID, local Requirement IDs, local Scenario IDs, Implemented By, Verified By, and Verification Gaps.
- [x] 1.4 Update `docs/persistence-system.md` and `docs/data-model.md` if read-only knowledge context or model settings change canonical guidance.

### 2. Implementation

- [x] 2.1 Implement `LC-001-S7` R1/R1-S1 and R1-S2: explicit prompt context components and source ownership.
- [x] 2.2 Implement `LC-001-S7` R2/R2-S1 and R2-S2: read-only knowledge facts reach the Director but remain non-mutable output fields.
- [x] 2.3 Implement `LC-001-S7` R3/R3-S1 and R3-S2: deterministic required scene-beat derivation for direct NPC questions and non-dialogue actions.
- [x] 2.4 Implement `LC-001-S7` R4/R4-S1 and R4-S2: active NPC response guidance and dialogue permitted inside narration.
- [x] 2.5 Implement `LC-001-S7` R5/R5-S1 and R5-S2: conservative persistence guidance and validation coverage for non-churn.
- [x] 2.6 Implement `LC-001-S7` R6/R6-S1 and R6-S2: dev-configurable provider generation settings and compact debug metadata.
- [x] 2.7 Update Story-level Implemented By maps with current code locations.

### 3. Verification

- [x] 3.1 Add focused tests for prompt component assembly, bounded feed metadata, hidden knowledge inclusion, and source ownership.
- [x] 3.2 Add focused tests for required scene-beat derivation.
- [x] 3.3 Add focused tests for read-only facts being ignored as attempted mutable updates.
- [x] 3.4 Add focused tests for optional provider generation settings and safe defaults.
- [x] 3.5 Run `npm run test`.
- [x] 3.6 Run `npm run lint`.
- [x] 3.7 Run `npm run build`.
- [x] 3.8 Run Convex validation/codegen appropriate to changed Convex contracts.
- [x] 3.9 Manually playtest Mira with a local model:
  - [x] Direct question: "I ask Mira what she knows about the storm" produces a meaningful Mira response.
  - [x] Non-dialogue action: "I jump" does not create durable fact churn unless something meaningful changes.
- [x] 3.10 Update Story-level Verified By maps with concrete evidence.

### 4. Review And Closeout

- [x] 4.1 Update root `CHANGELOG.md` under `Changed`.
- [ ] 4.2 Run `th-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, changelog, and branch readiness.
- [ ] 4.3 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [ ] 4.4 Create a PR or merge only after `th-review` is ready and the app branch policy plus Taylor authorization allow it.
- [ ] 4.5 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-06-27 | Proposal artifacts | main with `th-propose` | `docs/changes/2026-06-27-active-director-guidance/` | Drafted scope for active Director prompt/context guidance, read-only knowledge context, scene beats, and dev model settings | uncommitted |
| 2026-06-28 | Discovery | main with `th-apply`; specialist routing checked, no delegation for small cohesive slice | Epic, Director modules, persistence docs, Next route-handler docs, Convex AI guidance | Scope/artifacts agree; chose conservative MVP defaults: env knobs are `LLM_TEMPERATURE`, `LLM_MAX_TOKENS`, and `LLM_TOP_P`; required scene beat is debug-visible in `requestSummary`; hidden knowledge includes current-scene actor facts outside mutable NPC keys as read-only context | working tree |
| 2026-06-28 | `LC-001-S7` R1-R6 implementation | main; subagents skipped because current tool policy requires explicit user request for delegation | `src/lib/director/*`, `src/app/api/director/turn/route.ts`, `convex/world.ts`, README/docs/Epic/changelog | Added prompt components, current-turn-first scene beats, hidden read-only NPC knowledge, stronger active NPC guidance, OpenAI-compatible generation settings, and richer Mira storm knowledge seed | working tree |
| 2026-06-28 | Prompt refinement from live playtest | main | `src/lib/director/prompt.ts`, `src/lib/director/director.test.ts` | Tightened direct-question guidance after local model initially stopped before Mira's answer and tightened trivial-action guidance after it continued a prior question | working tree |
| 2026-06-28 | Repeatable playtest script | main | `scripts/director-playtest.mjs`, `package.json`, README | Added a local smoke script that seeds/resets Convex, sends the direct-question and plain-action turns, and verifies response/debug metadata | working tree |
| 2026-06-28 | Trivial-action persistence boundary | main | `src/lib/director/prompt.ts`, `src/lib/director/output.ts`, `src/app/api/director/turn/route.ts`, tests, script | Script exposed accepted Mira mood churn for `I jump`; added a deterministic `trivial_player_action` scene beat and post-validation boundary that ignores durable NPC updates for those actions | working tree |

## Verification Ledger

Record proof as it happens.

| Date | Check | What It Proves | Result |
|---|---|---|---|
| 2026-06-27 | Artifact self-check | Proposal, design, and tasks exist and identify Epic action plus changelog impact | Passed |
| 2026-06-28 | `npm run test` | Focused Director tests cover prompt components, hidden knowledge, scene beats, read-only fact rejection, trivial-action update suppression, and generation settings | Passed |
| 2026-06-28 | `npm run ci:required` | Required lint/test/typecheck/build gate after initial implementation | Passed |
| 2026-06-28 | `npx convex codegen` | Convex function/schema validation after richer seed fact change | Passed |
| 2026-06-28 | Local route playtest with Ollama `llama3.1:8b` | Direct Mira question produced actual Mira dialogue; non-dialogue "I jump" produced no accepted durable updates; request summaries included scene-beat and generation metadata | Passed |
| 2026-06-28 | Final `npm run ci:required` | Final lint/test/typecheck/build gate after prompt refinements and artifact updates | Passed |
| 2026-06-28 | `npm run playtest:director -- --help` | New playtest script is wired into npm and prints usage | Passed |
| 2026-06-28 | `npm run lint` | New script passes ESLint | Passed |
| 2026-06-28 | `npm run playtest:director` | Repeatable local Director smoke test passes against local Convex/Next/Ollama; direct question produces Mira dialogue and `I jump.` accepts no durable updates | Passed |
| 2026-06-28 | Follow-up `npm run ci:required` | Final lint/test/typecheck/build gate after adding the script and trivial-action boundary | Passed |
| 2026-06-28 | Follow-up `npx convex codegen` | Convex function validation after trivial-action boundary and script follow-up | Passed |

## Manual UI Confirmation

Use this checklist for Taylor's manual playtest after pulling this branch or running the current dev server:

1. Start local Convex and Next with Ollama config, for example `LLM_BASE_URL=http://localhost:11434/v1 LLM_API_KEY=ollama LLM_MODEL=llama3.1:8b npm run dev`.
2. Open `http://localhost:3000`, enable the debug panel, and rough reset if you want a clean transcript.
3. Enter `I ask Mira what she knows about the storm.` Expected: Mira gives a concrete response, refusal, deflection, warning, counter-question, action, or intentional silence; facial expression alone is not enough.
4. Inspect the latest Director call in debug. Expected: `requiredSceneBeat.kind` is `direct_npc_question`, `targetActorKey` is `mira`, `readOnlyKnowledgeKeys` includes `mira.knows_about_storm`, and generation settings are summarized without secrets.
5. Enter `I jump.` Expected: the Director narrates the immediate action or observable reaction without forcing Mira dialogue and without accepting durable NPC fact updates.

Feedback classification: missing Mira response is a defect; no debug evidence is a verification gap; desired extra behavior beyond direct questions/read-only knowledge/dev settings is scope expansion.

The same flow can be run from the command line with `npm run playtest:director` while `npm run dev` is running.

## Manual Feedback

Record Taylor's manual testing feedback after implementation starts.

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| 2026-06-27 | Current playtest feels passive; Mira does not speak or meaningfully answer direct questions. | requirement refinement | Proposed `LC-001-S7` with active scene-beat guidance and read-only knowledge context. | captured |
| 2026-06-27 | RNG may be useful later but near-term work should focus on better prompting and LLM guidance. | scope boundary | Deferred RNG implementation; kept deterministic prompt/context changes in current scope. | captured |

## Blockers / Open Questions

- Resolved for MVP: Implement `LLM_TEMPERATURE`, `LLM_MAX_TOKENS`, and `LLM_TOP_P`; defer `top_k`, presence penalty, frequency penalty, and provider-specific controls until playtesting proves a need.
- Resolved for MVP: Store compact required scene-beat metadata in `directorCalls.requestSummary` and local debug records through the existing request summary path.
- Resolved for MVP: Include all current-scene actor facts outside mutable NPC keys as read-only hidden context; validation authority remains limited to `mood`, `status`, and `memory`.

## Closeout

- Epic files updated: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Story/Requirement/Scenario IDs current: yes, `LC-001-S7` with `R1`-`R6` and scoped `R#-S#` scenarios
- Implemented By maps current: yes
- Verified By maps current: yes
- Changelog current: yes, `CHANGELOG.md` under `Unreleased / Changed`
- `th-review` verdict: pending
- `review.md` findings resolved: not applicable yet
- PR / merge state: local branch `change/active-director-guidance`, not pushed or merged
- Deferred scope accepted: RNG, fine-tuning, settings UI, world-builder editing, slash commands, combat, inventory, relationship graph, story instances, rollback, and offscreen NPC autonomy remain out of scope.
- Change moved to `docs/changes/closed/`: no, pending `/th-review` and closeout authorization
