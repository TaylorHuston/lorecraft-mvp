# Design: End To End Testing

## Context

Lorecraft's current `npm run ci:required` gate runs lint, Vitest, typecheck, and production build. The project also has local Game Master playtest scripts, but they are route/runtime smoke checks rather than browser E2E. Recent changes repeatedly needed manual browser confirmation for story stream anchoring, input clearing, pending state, debug-panel behavior, reset controls, NPC overrides, and current turn evidence.

The app's risky path is not a single React component. A useful E2E check must drive the browser, hit the real Next route, use Convex state, and receive deterministic provider-shaped Game Master responses.

## Goals / Non-Goals

**Goals:**

- Add Playwright as the primary browser E2E harness.
- Exercise the real Lorecraft browser flow against the real backend route and Convex dev state.
- Use a deterministic OpenAI-compatible fixture provider for required E2E so test success does not depend on a local or hosted LLM.
- Keep live-model playtests available as optional diagnostic checks.
- Document where E2E sits relative to `ci:required`, release checks, local playtests, and future hosted CI.

**Non-Goals:**

- Do not make real Ollama, Mac Studio, OpenRouter, Vercel AI Gateway, or any hosted model mandatory for required CI.
- Do not evaluate story quality, creativity, or NPC prose quality through deterministic E2E assertions.
- Do not introduce broad visual snapshot testing yet.
- Do not add a cross-browser/device matrix beyond the smallest stable smoke path unless implementation evidence shows it is cheap.
- Do not redesign the app architecture or persistence model for testing.

## Epic Changes

### Update Epic: Provider-Agnostic Chat Experience

- Target Epic: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Change Type: added Story plus verification-map updates after implementation

#### Story Changes

- Added: `LC-001-S11: End To End Playtest Verification`
- Modified: Verification evidence for existing browser-visible or runtime Stories may be refreshed after implementation when the new E2E suite proves their Scenarios.
- Removed: none.

#### Story LC-001-S11: End To End Playtest Verification

As a developer-playtester, I want deterministic browser E2E coverage of the Lorecraft playtest loop, so that UI, backend route, Convex state, and provider-shaped Game Master behavior can be verified together.

##### R1: Browser Playtest Flow

The system SHALL provide a Playwright E2E suite that verifies the core seeded-world playtest loop in a browser.

###### Scenario R1-S1: Seeded world can start the playtest

- WHEN the E2E suite opens the app with no usable playtest state
- THEN it can seed or reset the Stormbound Chapel demo world through the visible app workflow
- AND the story surface becomes ready for narrative input

###### Scenario R1-S2: Player submits a narrative turn

- WHEN the E2E suite enters player text into `What do you do next?`
- AND submits with Enter
- THEN the input clears promptly
- AND duplicate submission is prevented while the turn is pending
- AND a Game Master response appears in the story stream

###### Scenario R1-S3: Reload preserves the turn

- WHEN a successful E2E turn has been persisted
- AND the page reloads
- THEN the player input, Game Master narration, and turn number remain visible or inspectable from persisted state

##### R2: Debug And Reset Verification

The system SHALL verify the debug/test controls that make local playtesting diagnosable.

###### Scenario R2-S1: Debug drawer toggles without breaking play

- WHEN the E2E suite toggles the top-bar debug gear
- THEN the debug drawer opens and closes without trapping focus in hidden controls
- AND the story stream remains usable for narrative input

###### Scenario R2-S2: Debug turn evidence is visible

- WHEN a successful E2E turn completes
- THEN the debug surface exposes current turn/Game Master evidence for that turn
- AND the evidence identifies the deterministic fixture model or provider without exposing secrets

###### Scenario R2-S3: Reset returns to a clean playtest state

- WHEN the E2E suite invokes the appropriate reset control
- THEN persisted playtest history is cleared or reseeded according to the control's documented meaning
- AND the app returns to a state where another deterministic turn can be submitted

##### R3: Deterministic Provider Fixture

The system SHALL allow E2E tests to drive the real backend provider adapter without depending on a real model.

###### Scenario R3-S1: Fixture provider returns story prose

- WHEN Playwright runs deterministic E2E
- THEN the app uses an OpenAI-compatible local fixture endpoint via `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL`
- AND the story-generation call returns stable non-empty prose

###### Scenario R3-S2: Fixture provider returns extraction output

- WHEN persistent mode runs the post-narration NPC-state extractor during E2E
- THEN the fixture can return stable JSON for the extractor call
- AND E2E can verify either no durable update or one expected bounded update without relying on model judgment

###### Scenario R3-S3: Fixture requests remain inspectable

- WHEN local debug logging is enabled for E2E
- THEN logged or persisted Game Master call metadata identifies fixture-backed story/extraction calls
- AND secrets, API keys, and full environment dumps remain excluded

##### R4: CI And Script Boundaries

The system SHALL expose clear scripts for cheap required checks, deterministic E2E, and optional live-provider playtests.

###### Scenario R4-S1: Required CI remains cheap

- WHEN `npm run ci:required` runs
- THEN it continues to execute lint, unit tests, typecheck, and build
- AND it does not require a browser, Convex dev server, or LLM provider unless a later accepted CI policy change says otherwise

###### Scenario R4-S2: Deterministic E2E has a dedicated script

- WHEN a developer runs the new E2E script
- THEN it starts or targets the required app/test-provider services
- AND runs the Playwright smoke suite with deterministic provider behavior

###### Scenario R4-S3: Live-provider playtests remain optional

- WHEN a developer wants to evaluate local model behavior
- THEN existing or updated playtest scripts can still call the configured live model
- AND failures are treated as model/runtime diagnostics rather than deterministic E2E failures

##### Implemented By

- `playwright.config.ts` configures the deterministic local Chromium E2E stack.
- `scripts/llm-fixture-server.mjs` provides the fixture OpenAI-compatible provider.
- `scripts/e2e-next-server.mjs` builds and serves the Next app for the E2E run.
- `tests/e2e/lorecraft-playtest.spec.ts` verifies seed/reset, turn submission, persisted reload, debug evidence, and NPC extraction output.
- `src/app/world-client.tsx` provides stable loading/seed states and debug evidence for the browser test.

##### Verified By

- `npm run ci:required` passed after implementation and review remediation.
- `npm run e2e` passed after implementation and review remediation.
- Delegated `/sdd-review` passes checked artifact truth, code/security, verification coverage, docs, and integration readiness.

##### Verification Gaps

- Taylor manual browser confirmation remains pending.

## Technical Approach

Add `@playwright/test` and a `playwright.config.ts` configured for one stable Chromium project first. The default deterministic E2E run should start a small local OpenAI-compatible fixture provider and a local Convex/Next app stack with debug flags enabled and `LLM_BASE_URL` pointed to the fixture. The app stack may use `next build && next start` on a test port instead of `next dev` so E2E can run without stopping an already-running development server for normal playtesting. This keeps the browser test true end-to-end through the app while removing model nondeterminism from assertions.

The fixture provider should be a tiny Node script under `scripts/` or an equivalent test utility. It should implement the minimal `/v1/chat/completions` shape the current provider adapter expects, return stable story prose for `story_generation`, and return stable JSON for `npc_state_extraction`. The test should assert observable behavior: page readiness, seed/reset controls, input clearing, pending behavior, story append, reload persistence, debug drawer toggling, turn evidence, and reset behavior. It should not assert creative writing quality.

Keep existing `scripts/director-playtest.mjs` and `scripts/director-transcript-playtest.mjs` as provider-backed runtime smoke checks. Implementation may add deterministic fixture-backed variants or let Playwright cover the fixture path, but real-model scripts should remain optional.

## Alternatives Considered

- Option: make live Ollama E2E required.
  - Why not: live model startup, model speed, output variability, and Mac-specific availability would make E2E flaky and unsuitable for a required gate.
- Option: mock browser `fetch` calls only.
  - Why not: the app calls the LLM from the server route, so browser-level request mocking would skip the backend provider adapter and Convex persistence path this change is meant to prove.
- Option: keep using only route-level playtest scripts.
  - Why not: route scripts do not catch browser regressions in input clearing, scroll anchoring, debug panel focus, reset controls, or visible persisted transcript behavior.
- Option: add visual snapshot testing now.
  - Why not: UI styling is still moving quickly; snapshots would likely freeze churn before they protect enough value.

## Why This Approach

This gives Lorecraft the smallest useful end-to-end proof: the same UI Taylor uses, the same backend route, the same Convex state, and provider-shaped responses, but without making nondeterministic model prose part of the pass/fail contract. It also respects the current CI/CD guidance by keeping required CI cheap until the new E2E layer proves stable.

## Implementation Constraints

- Use the repo's existing npm workflow.
- Do not include real API keys, provider credentials, or local model assumptions in E2E config.
- Avoid process leaks when Playwright starts Convex/Next and fixture services.
- Keep test selectors stable. Prefer existing canonical IDs where possible before adding test-only selectors.
- Keep E2E assertions focused on user-visible behavior and debug evidence, not implementation internals.
- Do not add Playwright to `ci:required` in this change unless Taylor explicitly changes the CI policy.

## Verification Strategy

- Run `npm run ci:required` after dependency/config/test changes.
- Run the new deterministic Playwright E2E script from a clean shell.
- Verify the E2E run can start required services, complete one seeded-world turn, inspect debug evidence, reload, and reset.
- Confirm `docs/ci-cd.md` documents whether E2E is optional, release-gated, or required.
- Keep at least one optional provider-backed playtest path documented for local model behavior diagnostics.

## Decisions

- Deterministic browser E2E will use a local fixture provider instead of a real LLM.
- `npm run ci:required` remains the cheap required gate for now.
- Playwright starts with a narrow Chromium smoke path before any broader browser/device matrix.
- Changelog impact is required because this adds a notable project testing capability.

## Risks / Trade-Offs

- E2E startup can be slower than the current gate, especially with Convex dev involved.
- A fixture provider can prove integration shape but not model quality.
- Too many UI assertions could make tests brittle while the MVP interface is still evolving.
- Hosted CI may need extra setup before deterministic E2E is promoted from optional to required.

## Implementation-Discovery Questions

- Best E2E server orchestration:
  - Default path: use Playwright `webServer` entries to start the fixture provider and a Convex-backed Next app stack on test ports.
  - Evidence needed: repeatable local E2E runs with clean startup and shutdown.
  - Replan trigger: if Convex orchestration is flaky enough that a custom test runner or separate local service script is needed.
- Minimal stable selector strategy:
  - Default path: use the canonical IDs already added during UI polish and add only small missing IDs or accessible names if tests need them.
  - Evidence needed: Playwright tests can express the flow without brittle CSS-path selectors.
  - Replan trigger: if the UI lacks stable accessibility or ID hooks for critical controls.
