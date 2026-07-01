# Tasks: NPC State Mutation

## Resume Here

- Current state: reviewed; ready for commit and normal integration path when Taylor authorizes it
- Last completed action: `/sdd-review` completed with no blocking or required findings; fixed one stale README sentence during review and reran `npm run ci:required`
- Next action: commit the change when authorized, then proceed with the normal non-production integration path
- Active branch/ref: `change/npc-state-mutation`
- Branch note: branch preflight classified this as a planned product/runtime change. Implementation branch `change/npc-state-mutation` was created from `develop`; target branch remains `develop`. Planning/docs are allowed here and implementation edits are branch-policy compliant.
- Expected dirty files: NPC state mutation implementation, docs, tests, playtest script, and `docs/changes/2026-06-30-npc-state-mutation/`
- Known unrelated dirty files: `docs/ci-cd.md` already has an unstaged frontmatter-only modification and should not be swept into this change unless Taylor confirms it belongs here.
- Known blockers: none

## Task Checklist

### 1. Epic Artifacts

- [x] 1.1 Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md` with `LC-001-S10`.
- [x] 1.2 Reconcile `LC-001-S3`, `LC-001-S7`, and `LC-001-S9` so Epic truth no longer contradicts extractor-based mutation.
- [x] 1.3 Confirm `LC-001-S10` has app-unique stable Story ID, local Requirement IDs, local Scenario IDs, Implemented By, Verified By, and Verification Gaps.

### 2. Implementation

- [x] 2.1 Implement Story `LC-001-S10: Extracted NPC State Mutation`.
  - [x] Requirement R1: Post-Narration Extraction Pass
    - [x] Scenario R1-S1: Successful story turn triggers extraction
    - [x] Scenario R1-S2: Story generation remains plain prose
    - [x] Scenario R1-S3: Transcript mode does not extract NPC state
  - [x] Requirement R2: Bounded NPC Characteristic Updates
    - [x] Scenario R2-S1: Meaningful attitude change
    - [x] Scenario R2-S2: Durable current circumstance
    - [x] Scenario R2-S3: Rolling player-interaction memory
    - [x] Scenario R2-S4: Ephemeral beat produces no update
    - [x] Scenario R2-S5: Read-only NPC card fields are rejected
    - [x] Scenario R2-S6: Unknown or offscreen NPC is rejected
  - [x] Requirement R3: Turn-Scoped Persistence And Debug Evidence
    - [x] Scenario R3-S1: Accepted extraction update persists canonical state
    - [x] Scenario R3-S2: Accepted update summary is specific enough to inspect
    - [x] Scenario R3-S3: Extractor failure does not fake state
    - [x] Scenario R3-S4: No-update extraction remains inspectable
  - [x] Requirement R4: Provider-Neutral Extractor Contract
    - [x] Scenario R4-S1: Extractor uses configured OpenAI-compatible provider
    - [x] Scenario R4-S2: Extractor request is identifiable
- [x] 2.2 Add a compact extractor request builder that uses final narration, current input, current-scene NPC Cards, bounded recent story, and an explicit `mood` / `status` / `memory` allowlist.
- [x] 2.3 Reuse existing parser/validation boundaries where practical and add only the smallest new application/Convex functions needed for multi-call turn completion.
- [x] 2.4 Update Story-level Implemented By maps with current code locations.

### 3. Verification

- [x] 3.1 Add deterministic tests for extractor prompt shape, no-update behavior, accepted updates, ignored read-only fields, ignored unknown/offscreen NPCs, transcript exclusion, and extractor failure semantics.
- [x] 3.2 Add persistence verification proving accepted updates write actor facts and turn-scoped state diffs without exposing hidden private knowledge in player-facing metadata.
- [x] 3.3 Run `npm run ci:required`.
- [x] 3.4 Run a local `npm run dev:debug` playtest and inspect logs for one no-update turn and one meaningful NPC update turn.
- [x] 3.5 Update Story-level Verified By maps with concrete evidence.

### 4. Documentation

- [x] 4.1 Update `docs/data-model.md` for extractor-driven NPC updates, multi-call Game Master records, and the mutable/read-only NPC field boundary.
- [x] 4.2 Update `docs/persistence-system.md` for the post-narration extractor strategy.
- [x] 4.3 Update `README.md` for current local playtest behavior and debug evidence.
- [x] 4.4 Update root `CHANGELOG.md` under `Unreleased`.

### 5. Review And Closeout

- [x] 5.1 Run `sdd-review` as the local PR gate for Requirements, Scenarios, Epic truth, tests, security, docs, changelog, and branch readiness.
- [x] 5.2 Record review outcome as a `review.md` path, a clean review recorded in this ledger, or an explicit Taylor-approved review waiver.
- [x] 5.3 Address any `review.md` findings or explicitly defer accepted non-blocking risks.
- [x] 5.4 Record manual UI confirmation status as `not applicable`, `pending Taylor`, `Taylor confirmed`, or `accepted gap`.
- [ ] 5.5 Confirm closeout state has no contradictory Resume Here, checklist, review, manual confirmation, changelog, PR/merge, deferred-gap, or folder-location claims.
- [ ] 5.6 Create a PR or merge only after `sdd-review` is ready and the app branch policy plus Taylor authorization allow it.
- [ ] 5.7 After review/PR/merge/acceptance is complete, move this change folder to `docs/changes/closed/`.

## Implementation Ledger

Record meaningful Requirement, Scenario, enabling, or delegated slices as they happen. Keep entries short.

| Date | Slice | Agent / Guidance | Files / Areas | Result | Commit / Ref |
|---|---|---|---|---|---|
| 2026-06-30 | Planning | main | `docs/changes/2026-06-30-npc-state-mutation/` | Proposal, design, and tasks drafted | uncommitted |
| 2026-06-30 | Discovery / branch preflight | main | branch policy, repo status, change artifacts | Created `change/npc-state-mutation` from `develop`; left unrelated `docs/ci-cd.md` dirty change untouched | uncommitted |
| 2026-06-30 | Read-only discovery | Kuhn subagent | `src/lib/director/`, `src/app/api/director/turn/route.ts`, `convex/world.ts` | Recommended separate `story_generation` and `npc_state_extraction` calls, a dedicated extraction parser, and a Convex mutation that cannot fail an already narrated turn | uncommitted |
| 2026-06-30 | LC-001-S10 implementation | main | `src/lib/director/`, `src/app/api/director/turn/route.ts`, `convex/world.ts`, `scripts/director-playtest.mjs` | Added post-narration extractor request, parser, validation flow, persistent-only route orchestration, extraction debug records, accepted fact writes/state diffs/events, and playtest assertions for multi-call turns | uncommitted |
| 2026-06-30 | Documentation reconciliation | main | `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`, `README.md`, `docs/data-model.md`, `docs/persistence-system.md`, `CHANGELOG.md` | Added LC-001-S10 and updated project docs for story/extractor call roles, bounded mutable fields, and debug evidence | uncommitted |
| 2026-06-30 | Debug NPC tab cleanup | main | `src/app/world-client.tsx`, `docs/changes/2026-06-30-npc-state-mutation/tasks.md` | Changed NPC override fields to show current effective values directly in editable textareas with compact source/override metadata and character counts, matching the Prompt tab interaction pattern more closely | uncommitted |
| 2026-06-30 | Short-output truncation cleanup | main | `.env.local`, `README.md`, `src/lib/director/prompt.ts`, `src/lib/director/output.ts`, `src/lib/director/director.test.ts` | Raised local max tokens to 250, tightened prompt guidance toward complete 1-2 paragraph beats, and trimmed incomplete trailing prose fragments before persistence/display | uncommitted |
| 2026-06-30 | SDD review | main | `README.md`, change artifacts, Epic truth, code diff, security/docs/changelog/branch gates | Local review found one stale README sentence and fixed it; no `review.md` created because no blocking or required findings remain | uncommitted |

## Verification Ledger

Record proof as it happens.

| Date | Check | What It Proves | Result |
|---|---|---|---|
| 2026-06-30 | Artifact re-read | Proposal, design, and tasks exist and are internally ready for apply | passed |
| 2026-06-30 | Branch preflight | Planned runtime change is on a compliant implementation branch | passed |
| 2026-06-30 | `npm run test -- src/lib/director/director.test.ts` | Focused prompt/parser/validation coverage for story generation, NPC extraction, allowed fields, rejected fields/actors, memory caps, scene-beat suppression, debug overrides, and transcript exclusion | passed |
| 2026-06-30 | `npx convex codegen` | Convex generated API accepts `recordNpcStateExtraction` and updated world functions | passed |
| 2026-06-30 | `npm run typecheck` | Route, prompt, parser, and Convex API types compile | passed |
| 2026-06-30 | `npm run ci:required` | Required app gate: lint, full Vitest suite, typecheck, and Next build | passed |
| 2026-06-30 | `npm run dev:debug` + `npm run playtest:director` | Runtime persistent mode records both `story_generation` and `npc_state_extraction` calls for direct-question and trivial-action turns | passed |
| 2026-06-30 | Latest `logs/director-debug.jsonl` inspection | Direct Mira question produced one accepted `memory` update; trivial jump produced `{"npcUpdates":[]}` with no accepted updates | passed |
| 2026-06-30 | Convex snapshot query for latest playtest world | Accepted extraction updated Mira's actor-scoped `memory` fact with `source: "llm"` and wrote one turn-scoped state diff/event; later no-update turn left no new diff | passed |
| 2026-06-30 | `npm run lint` and `npm run typecheck` after debug UI cleanup | NPC tab TSX cleanup has no lint or type errors | passed |
| 2026-06-30 | `npm run ci:required` after debug UI cleanup | Required app gate still passes after NPC debug panel cleanup | passed |
| 2026-06-30 | `npm run test -- src/lib/director/director.test.ts` after truncation cleanup | Plain-prose parser trims incomplete trailing fragments while preserving valid prose | passed |
| 2026-06-30 | `npm run ci:required` after truncation cleanup | Required app gate still passes after token cap/prompt/parser changes | passed |
| 2026-06-30 | Restarted `npm run dev:debug` | Running local app picked up `.env.local` with `LLM_MAX_TOKENS=250` | passed |
| 2026-06-30 | `/sdd-review`: duplicate Story ID scan | Active app Epic Story IDs are unique from `LC-001-S1` through `LC-001-S10` | passed |
| 2026-06-30 | `/sdd-review`: source-vs-target conflict check | `git merge-tree $(git merge-base HEAD develop) HEAD develop` produced no conflicts | passed |
| 2026-06-30 | `/sdd-review`: `git diff --check` | Source-vs-target diff has no whitespace errors | passed |
| 2026-06-30 | `/sdd-review`: `npm run ci:required` | Required app gate still passes after the review README correction | passed |

## Manual Feedback

Record Taylor's manual testing feedback after implementation starts.

| Date | Feedback | Classification | Action / Artifact Updates | Status |
|---|---|---|---|---|
| 2026-06-30 | Mutable fields should remain `mood`, `status`, and `memory` for now; other NPC fields may become story-mutable later. | requirement refinement | Recorded as current scope and deferred scope in proposal/design/tasks. | closed |
| 2026-06-30 | Debug `NPCs` tab should look more like the `Prompt` tab: current text should live inside editable boxes that can be overwritten manually. | defect / UX refinement | Normalized NPC override textareas to show effective current values inline, with compact source/override metadata and character counts matching prompt guidance controls. | closed |
| 2026-06-30 | Story responses can still truncate mid-sentence at 200 tokens; try 250 tokens, tighter completion guidance, and incomplete trailing sentence trimming. | defect / UX refinement | Raised local `LLM_MAX_TOKENS` to 250, tightened story prompt guidance toward 1-2 complete paragraphs, and added conservative parser trimming for incomplete trailing prose fragments. | closed |

## Planning Updates

Record `/sdd-propose --replan` updates when implementation or feedback discovers planning-level requirements.

| Date | Discovery | Classification | Planning Updates | Next Apply Starting Point |
|---|---|---|---|---|
| 2026-06-30 | Initial proposal created for extractor-based NPC mutation. | in-scope planning | proposal.md / design.md / tasks.md | `/sdd-apply` branch preflight |

## Manual UI Confirmation

- Status: pending Taylor
- App URL / route: local Lorecraft app root, usually `http://localhost:3000`
- Required setup or test data: seeded Stormbound Chapel world, persistent mode, debug logging enabled with `npm run dev:debug`
- Steps for Taylor:
  1. Submit a turn that should not durably change NPC state, such as a trivial gesture.
  2. Submit a turn that should change Mira or Brother Alden's durable `mood`, `status`, or `memory`.
  3. Inspect the debug panel and story stream.
- Expected result: trivial turns produce no accepted NPC updates; meaningful turns can update only `mood`, `status`, or `memory`; debug evidence shows accepted and ignored extractor decisions.
- Feedback that would change artifacts: extractor is too eager, extractor misses obvious durable changes, debug evidence is unclear, story latency becomes unacceptable, or hidden/private facts leak into player-facing story metadata.

## Questions And Readiness

### Blocking Questions

- None.

### Implementation-Discovery Questions

- Extractor call recording:
  - Default path: record story generation and NPC extraction as separate `directorCalls` rows tied to the same turn, distinguished by `requestSummary.callRole`.
  - Evidence needed: debug panel and local logs make both calls inspectable by turn.
  - Replan trigger: if multi-call turns are too confusing without a schema-level call role or dedicated extraction-call table.
- Extractor failure semantics:
  - Default path: successful narration keeps the turn succeeded even when extraction fails; no NPC mutations are applied.
  - Evidence needed: tests cover provider error, invalid JSON, and no-update output after successful narration.
  - Replan trigger: if manual playtesting shows failed extraction should block the whole turn or surface as a player-visible failure.
- JSON reliability:
  - Default path: use strict prompt guidance, existing JSON parser, and validation; no retry loop in the first implementation.
  - Evidence needed: local debug logs from at least one successful update and one no-update turn.
  - Replan trigger: if the chosen local model repeatedly fails extractor JSON and makes the feature untestable without a retry or separate model.

### Deferred Scope

- Mutating `description`, `background`, `persona`, `voice`, `knowledge`, relationships, locations, object state, room state, exits, inventory, combat, stats, schedules, or offscreen consequences.
- Dedicated `npcs`, `npcMemories`, `relationships`, `actorAppearance`, or `npcBehaviorProfiles` tables.
- Multi-model routing where a stronger creative model writes prose and a smaller/different model extracts state.
- Rollback snapshots, branching timelines, or state restore UI.
- Hidden TTRPG adjudication, dice, or rule checks.

### Apply Readiness

- Status: ready
- Reason: No blocking questions remain. Remaining questions have default implementation paths, evidence plans, and replan triggers.

## Closeout

- Epic files updated: yes
- Story/Requirement/Scenario IDs current: yes
- Implemented By maps current: yes
- Verified By maps current: yes
- Changelog current: yes
- `sdd-review` verdict: ready
- Review record: clean review recorded in this ledger on 2026-06-30; no `review.md` created
- `review.md` findings resolved: not applicable; no `review.md` findings
- Planning updates resolved: no unresolved planning updates
- Manual UI confirmation status: pending Taylor
- PR / merge state: not started; source branch has uncommitted reviewed changes and should be committed before integration
- Deferred scope accepted: yes
- Change moved to `docs/changes/closed/`: no
