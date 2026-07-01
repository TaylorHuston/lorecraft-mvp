# Proposal: End To End Testing

## Why

Lorecraft now depends on a real browser workflow, a Next.js Route Handler, Convex state, reset/seed behavior, debug panels, and provider-shaped Game Master calls. The current required gate proves TypeScript, lint, unit tests, and production build, but browser behavior is still verified manually or through ad hoc runtime checks. That leaves recurring gaps around story-stream anchoring, input behavior, debug-drawer interaction, reset controls, seeded-world empty states, and full turn persistence.

This change adds a proper end-to-end testing layer without making local LLM availability, remote providers, or model quality a required CI dependency.

## What Changes

- Add Playwright-based E2E coverage for the core Lorecraft playtest loop.
- Add deterministic test-provider support so browser E2E can exercise the real backend Game Master route without calling Ollama or a hosted provider.
- Keep existing fast unit/lint/type/build checks as the required cheap gate for now.
- Add clear scripts and CI/CD guidance that distinguish deterministic E2E, optional local-provider playtests, and future release-gated browser checks.

## Epic Actions

### New Epic Directories

- None proposed.

### Existing Epic Directory Updates

- Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.

## Epic Story Changes

- Added: `LC-001-S11: End To End Playtest Verification`.
- Modified: Existing Story verification evidence may be updated after implementation where Playwright coverage closes current browser-verification gaps, especially `LC-001-S1`, `LC-001-S4`, `LC-001-S5`, `LC-001-S6`, `LC-001-S8`, `LC-001-S9`, and `LC-001-S10`.

## Change Folder

- Active location: `docs/changes/2026-06-30-end-to-end-testing/`
- Closed location: `docs/changes/closed/2026-06-30-end-to-end-testing/`

## Impact

- Product: gives the MVP a repeatable proof loop for the actual play surface, not only library-level behavior.
- Code: adds test harness/configuration and may add small test-only seams for deterministic provider behavior.
- Tests: adds Playwright E2E, deterministic fixture-provider checks, and possibly focused accessibility/smoke assertions where they protect real UI value.
- Docs: updates `README.md`, `docs/ci-cd.md`, Epic verification maps, and any testing guidance created by implementation.

## Changelog Impact

- Required: yes
- Category: Added
- Public summary: Add deterministic browser E2E coverage for the Lorecraft playtest loop.

## Questions And Readiness

### Blocking Questions

- None. Conservative decision: deterministic Playwright E2E should be introduced as an optional/local and release-gateable layer first, while `npm run ci:required` remains the cheap required gate until E2E runtime stability is proven.

### Implementation-Discovery Questions

- Best E2E server orchestration:
  - Default path: use Playwright `webServer` entries to start a deterministic OpenAI-compatible fixture provider and a Convex-backed Next app stack on test ports with `LLM_BASE_URL` pointed at that fixture.
  - Evidence needed: the E2E script can start cleanly from no running server, seed/reset the demo world, submit a turn, and stop without orphaning processes.
  - Replan trigger: if Convex dev server orchestration makes Playwright startup materially flaky or too slow for routine use.
- CI placement:
  - Default path: add `npm run e2e` as an optional local/release check and do not add it to `ci:required` yet.
  - Evidence needed: repeated local runs show stable startup time, process cleanup, and deterministic pass/fail behavior.
  - Replan trigger: if Taylor wants hosted branch protection to require browser E2E immediately, because that changes CI resources and runtime expectations.

### Deferred Scope

- Visual regression screenshot baselines.
- Cross-browser matrix beyond the smallest useful Chromium path.
- Real Ollama, Mac Studio, OpenRouter, Vercel AI Gateway, or hosted-model E2E in required CI.
- Load, concurrency, and rollback testing.
- Mobile-native or packaged-app testing.

## Apply Readiness

- Status: ready
- Reason: scope, Epic ownership, default technical approach, verification strategy, changelog impact, and deferred scope are clear enough to start `/sdd-apply`.
