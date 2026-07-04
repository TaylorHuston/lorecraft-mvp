# Design: Next.js Architecture Refactor

## Context

Lorecraft is a Next.js 16 App Router app backed by Convex. The current architecture has good product boundaries conceptually: Convex is canonical state, `/api/director/turn` is the Game Master backend boundary, and `src/lib/director/` holds prompt/provider/parsing helpers.

The implementation has outgrown its MVP file shape:

- `src/app/page.tsx` and `src/app/adventures/[adventureId]/page.tsx` are thin, but both import the same giant Client Component.
- `src/app/world-client.tsx` is a `2307` line Client Component and helper bundle.
- `src/app/api/director/turn/route.ts` is a `757` line Route Handler with many orchestration stages in one file.
- `convex/world.ts` is a `3040` line Convex module with unrelated capabilities sharing one namespace.

Current Next.js guidance and local project guidance both point toward the same fix: keep route files thin, use Server Components by default, isolate Client Components to interactive boundaries, keep route handlers server-only and small, keep durable behavior outside React, and make backend/application logic testable without rendering the whole app.

## Goals / Non-Goals

**Goals:**

- Refactor Lorecraft's Next.js app structure around explicit App Router, feature, server/application, and Convex capability boundaries.
- Split `world-client.tsx` into smaller route-level containers, presentational components, and hooks.
- Split `/api/director/turn/route.ts` into a thin HTTP adapter plus server/application orchestration modules.
- Split `convex/world.ts` internals into capability-focused modules while preserving public Convex behavior.
- Preserve existing LC-001 and LC-002 player-facing behavior.
- Improve deterministic testability around the new boundaries.
- Update architecture docs, README project structure, ADRs, and Epic implementation maps.

**Non-Goals:**

- Product redesign.
- New player-facing features.
- New user-path Epic.
- New data model semantics.
- Replacing Convex as canonical state.
- Replacing the Game Master Route Handler with Server Actions, Convex actions, or a separate service.
- Production auth, permissions, remote deployment hardening, rate limiting, or public API launch.
- Broad styling changes beyond accidental layout break prevention.

## Planning Interview / Boundary Refinement

- Scope boundary reviewed:
  - Initial question distinguished a UI-only Next.js refactor from a full-stack app architecture pass.
  - User selected "Everything," so this design includes UI, route handlers, server/application orchestration, and Convex module shape.
- User decisions:
  - Include backend orchestration shape, not only `world-client.tsx`.
  - Keep the change framed as better Next.js best practices.
  - Epics should be tied to collections of user paths, not technical architecture.
- Assumptions:
  - No behavior change is intended.
  - Any small loading/error UI added through App Router conventions should preserve the existing story-first visual direction.
  - The Game Master turn route remains the right boundary because it is provider-facing, secret-bearing, loggable, testable, and a plausible future mobile/external client contract.
  - Current public Convex function names can remain stable during this refactor, with internals extracted underneath.
- Deferred scope:
  - Server Actions for Game Master turns.
  - Public REST/OpenAPI contract.
  - Auth/ownership/security production model.
  - New Story/Adventure behavior.
  - Convex schema redesign.
- Boundary choices challenged:
  - This should not be split into one Epic Story per file; those would be implementation tasks, not user-path capabilities.
  - A technical architecture Epic would make Epics less product-facing, so this revision removes that approach.
  - Existing LC-001 and LC-002 product Stories remain the durable behavior truth.
- Requirement handling:
  - Product Requirements stay in LC-001 and LC-002.
  - This design tracks architecture requirements as implementation workstreams, with verification tied to preserved LC-001/LC-002 behavior and the ADR.
- Scenario gaps considered:
  - Direct Adventure URL load.
  - Missing or invalid Adventure state.
  - Provider failure and invalid output.
  - Pass turns and action turns.
  - Debug edits and autosave flushing before Game Master turns.
  - Reset/delete flows.
  - E2E coverage proving refactor did not alter behavior.
- Open questions that block implementation:
  - None. Exact directory names are implementation details constrained by the selected approach below.

## Epic Changes

### New Epics

- None.

### Update Epic: LC-001 Provider-Agnostic Chat Experience

- Target Epic: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Change Type: implementation map updates only

#### Story Changes

- Added: none.
- Modified:
  - Update `Implemented By` paths for Stories whose current evidence points at `src/app/world-client.tsx`, `src/app/api/director/turn/route.ts`, or `convex/world.ts` after those responsibilities move.
- Removed: none.

#### Supersedes / Reconciles

- Earlier Story, Requirement, Scenario, or boundary wording this change supersedes:
  - None expected. This is not a product behavior change.
- `Verified By` or `Verification Gaps` entries that must be rewritten or reclassified:
  - Only stale file paths or evidence descriptions made inaccurate by code movement.
- Closed or active change artifacts likely to need lifecycle/status cleanup:
  - None.
- Manual confirmation status updates expected:
  - Pending Taylor only if browser-visible route fallback or layout behavior changes are introduced; otherwise not applicable.

### Update Epic: LC-002 World / Adventure Model

- Target Epic: `docs/epics/lc-002-world-adventure-model/epic.md`
- Change Type: implementation map updates only

#### Story Changes

- Added: none.
- Modified:
  - Update `Implemented By` paths for Stories whose current evidence points at `src/app/world-client.tsx`, `src/app/api/director/turn/route.ts`, or `convex/world.ts` after those responsibilities move.
- Removed: none.

#### Supersedes / Reconciles

- Earlier Story, Requirement, Scenario, or boundary wording this change supersedes:
  - None expected. This is not a World/Adventure behavior change.
- `Verified By` or `Verification Gaps` entries that must be rewritten or reclassified:
  - Only stale file paths or evidence descriptions made inaccurate by code movement.
- Closed or active change artifacts likely to need lifecycle/status cleanup:
  - None.
- Manual confirmation status updates expected:
  - Pending Taylor only if browser-visible route fallback or layout behavior changes are introduced; otherwise not applicable.

## Architecture Workstreams

These workstreams are implementation design constraints, not Epic Stories.

### Workstream 1: App Router Route Composition

- Keep App Router `page.tsx`, `layout.tsx`, and route segment files focused on routing, metadata, provider composition, route params, and route-level fallback composition.
- Keep `/` as the World container route.
- Keep `/adventures/<id>` as the Adventure play route.
- Resolve async route `params` using current Next.js conventions.
- Add App Router `loading.tsx`, `error.tsx`, or `not-found.tsx` only where they protect a real route/user flow.

Verification:

- `npm run typecheck` for route params and serializable route props.
- `npm run e2e` for home and Adventure route behavior.

### Workstream 2: Client UI Decomposition And State Ownership

- Separate the player-facing play surface, Adventure landing surface, story stream, turn action panel, top bar, debug drawer, and debug tab panels into focused components.
- Move workflow state and side effects into focused client hooks or feature controllers:
  - Adventure selection/create/delete.
  - Act/Pass turn submission.
  - Prompt guidance state.
  - NPC debug editing and autosave queueing.
  - Location debug editing and autosave queueing.
- Keep Client Component imports browser-safe.
- Keep provider calls, prompt construction, mutation validation, and canonical state rules out of React components.

Verification:

- Focused component/hook tests where behavior can be tested deterministically.
- `npm run lint` and `npm run typecheck` for import/type boundaries.
- `npm run e2e` for story, turn, debug edit, reset, and Adventure management flows.

### Workstream 3: Game Master Route Handler And Server Orchestration Boundary

- Preserve `/api/director/turn` as the Game Master HTTP boundary.
- Keep route handler responsibilities to HTTP/server concerns:
  - route runtime declaration;
  - local request guard;
  - body parsing;
  - response status and shape;
  - calling a typed server/application turn orchestration function.
- Move Game Master workflow stages into reusable server/application modules:
  - Convex HTTP client setup;
  - context loading;
  - provider request construction;
  - provider call;
  - output parsing;
  - narration persistence;
  - post-narration extraction;
  - movement/NPC update validation;
  - debug logging.
- Preserve action turn, Pass turn, provider failure, invalid output, persistence failure, and extraction failure behavior.
- Use `server-only` where it protects provider/env/server modules from client bundles.

Verification:

- Existing route tests or new extracted orchestration tests for body parsing, action/pass turns, and failure paths.
- `npm run e2e` through the real browser/route/fixture-provider loop.

### Workstream 4: Convex World Capability Modules

- Preserve current public Convex function behavior unless a migration is explicitly designed.
- Split Convex internals by capability:
  - seed/baseline data;
  - World/Adventure lifecycle;
  - snapshots and Game Master context assembly;
  - turn/narration/state diff persistence;
  - reset and cleanup;
  - debug NPC/Location writes;
  - pure builders and mappers.
- Keep Convex functions thin orchestration boundaries around shared helpers.
- Move deterministic transformations out of Convex runtime functions when doing so improves testability and does not leak privileged server state to the browser.

Verification:

- Focused unit tests for extracted pure helpers.
- `npm run convex:once` if Convex module exports or generated API shape are touched.
- `npm run e2e` for browser calls into Convex-backed behavior.

### Workstream 5: Behavior-Preserving Traceability

- Update `docs/architecture.md` and README project structure after code movement.
- Update LC-001 and LC-002 `Implemented By` / `Verified By` maps after paths move.
- Keep `CHANGELOG.md` unchanged unless implementation creates a user-facing behavior change.
- Keep the ADR linked from architecture docs and closeout state.

Verification:

- `npm run ci:required`.
- `npm run e2e`.
- Source/docs review for stale file paths and behavior claims.

## Technical Options

### Option 1: UI-Only Component Split

- Summary: Split `world-client.tsx` into smaller components and hooks, leaving Route Handler and Convex modules largely intact.
- User impact: no intended change.
- Implementation complexity: medium.
- Reversibility: high.
- Client surfaces: web UI only.
- API / contract shape: unchanged.
- Frontend/backend boundary: improves UI only; leaves backend concentration unresolved.
- Data / schema impact: none.
- Auth / security impact: none.
- Testability: improves UI readability but only modestly improves backend tests.
- Operational risk: low.
- Fit with project conventions: partial fit; does not satisfy the user's "Everything" scope.

### Option 2: Layered Full-Stack Refactor

- Summary: Split UI, route handler orchestration, and Convex internals into focused layers while preserving existing contracts.
- User impact: no intended change.
- Implementation complexity: high.
- Reversibility: medium; code movement is broad but behavior is covered by tests.
- Client surfaces: web UI now; future mobile/external clients benefit from clearer route/application boundaries.
- API / contract shape: `/api/director/turn` and Convex public functions remain stable.
- Frontend/backend boundary: strong; React owns presentation and local interaction, route/application modules own Game Master workflow, Convex owns canonical state.
- Data / schema impact: none expected.
- Auth / security impact: no new auth model; should preserve local route guard and server-only provider/secrets boundary.
- Testability: high; extracted pure helpers and orchestration services can be tested directly.
- Operational risk: medium due to broad import movement.
- Fit with project conventions: strong; aligns with developer guide, app AGENTS guidance, and current Next.js guidance.

### Option 3: Deeper Backend Redesign

- Summary: Replace the Game Master Route Handler with Server Actions or Convex actions, redesign Convex module boundaries and route contracts, and possibly introduce a public API shape.
- User impact: no intended change, but high regression risk.
- Implementation complexity: very high.
- Reversibility: low.
- Client surfaces: could improve future clients, but current clients would need more contract work.
- API / contract shape: changes substantially.
- Frontend/backend boundary: potentially strong, but unproven for this MVP.
- Data / schema impact: possible.
- Auth / security impact: would force production-grade decisions too early.
- Testability: potentially high after completion, but expensive to reach safely.
- Operational risk: high.
- Fit with project conventions: over-scoped for a refactor whose goal is better structure, not new platform behavior.

## Selected Approach

Select Option 2: Layered Full-Stack Refactor.

The implementation should move code into stable layers without changing behavior:

- `src/app/`
  - Keep App Router files thin.
  - Use route segment files for route composition and fallback UI.
  - Avoid importing `app/` modules from feature, server, director, or Convex code.
- Feature UI layer, likely under `src/features/` or a project-equivalent folder:
  - Adventure landing/container.
  - Adventure play shell.
  - Story stream.
  - Turn action panel.
  - Top bar.
  - Debug drawer and debug tabs.
  - Focused client hooks/controllers for Adventure selection, turn submission, prompt guidance, NPC debug editing, and Location debug editing.
- Server/application layer, likely under `src/server/` or a `src/lib/director/server`-style boundary:
  - Request/body parsing for the route.
  - Local route guard.
  - Convex HTTP client setup.
  - `runDirectorTurn` or equivalent orchestration service.
  - Provider/extraction/persistence stage coordination.
  - Typed result/error helpers.
  - Use `server-only` where it protects provider/env/server modules from client bundles.
- Director library:
  - Keep provider-agnostic prompt/provider/output modules reusable and framework-light.
  - Keep pure parsing/validation tests close to this layer.
- Convex layer:
  - Preserve public generated API surface where practical.
  - Split internals by seed/baseline, Adventure lifecycle, snapshots/context, turn persistence, debug write actions, cleanup helpers, and pure builders.
  - Keep Convex functions thin orchestration boundaries around shared helpers.

## Client And API Boundary

- Current clients:
  - Web UI through Next.js App Router.
  - Deterministic E2E client through browser and local fixture provider.
  - Local playtest scripts through the running app.
- Plausible future clients:
  - Mobile app.
  - Admin/debug tooling.
  - World Builder UI.
  - Automated playtest harnesses.
- Reusable product capabilities:
  - List/create/delete Adventures.
  - Load Adventure snapshot.
  - Submit action/pass Game Master turns.
  - Reset Adventure to source WorldVersion.
  - Debug-edit NPC and Location cards.
  - Build Game Master context and persist validated outcomes.
- API or typed contract:
  - Preserve Convex generated function contracts for canonical state and debug write behavior.
  - Preserve `/api/director/turn` request/response shape for Game Master turns.
  - Extract shared TypeScript request/response types so UI, route, tests, and server orchestration agree.
- OpenAPI plan, if HTTP-facing:
  - Not required for this MVP refactor. Record the current route contract in code/types/docs; consider OpenAPI only when external clients or production API consumers become real.
- Backend platform exposed directly to clients?:
  - The web UI currently uses Convex React hooks directly for app state. That remains acceptable for the MVP because Convex generated functions are the intentional backend contract for those capabilities.
  - Provider calls, secrets, prompt assembly, output validation, and state mutation orchestration remain server-side.
- Client-specific presentation or local state:
  - Story layout, Act input open state, debug drawer tab state, unsaved form drafts, save status labels, scroll anchoring, and loading/error display.
- Rationale:
  - This preserves the current working architecture while making each boundary easier to test, reason about, and eventually reuse from a non-web client.

## Alternatives Considered

- Option: UI-only component split.
  - Why not: It fixes the most visible file-size issue but leaves the Game Master route and Convex module as large orchestration bottlenecks.
- Option: Deep backend redesign using Server Actions or Convex actions for Game Master turns.
  - Why not: It changes core contracts before the MVP needs it and risks folding provider-facing logic into a framework-specific path that is less useful for mobile/external clients.
- Option: Create a technical architecture Epic.
  - Why not: Epics should collect user paths. This change is better represented by the existing user-path Epics plus an ADR and implementation workstreams.
- Option: Do nothing until the app has more features.
  - Why not: Current files are already large enough that future turn modes, debug surfaces, or world editing will become riskier and harder to review.

## Why This Approach

This approach is the smallest architecture pass that satisfies "everything" without turning refactor work into a platform rewrite. It respects current Next.js App Router guidance, the project-local separation between frontend and durable backend behavior, the existing provider-agnostic Game Master boundary, and Convex as canonical state. It keeps user-facing behavior stable while improving the places where future product work will land.

## ADRs

- Required: yes.
- ADR path: `docs/adrs/2026-07-03-layered-nextjs-application-boundaries.md`
- Decision summary: Lorecraft should use thin App Router route files, focused Client Component boundaries, a Route Handler adapter for Game Master turns, server/application orchestration modules, and capability-focused Convex modules.
- Reconsider when:
  - A mobile client needs a different API contract.
  - Server Actions become a better fit for a specific internal mutation.
  - Convex actions become the preferred Game Master orchestration host.
  - Production auth/deployment requirements change route or backend ownership.

## Implementation Constraints

- Start implementation on a `change/nextjs-architecture-refactor` branch from `develop`.
- Do not change user-facing behavior unless required to preserve existing flows through route fallback states.
- Preserve local debug logging and raw request flags.
- Preserve local-only route guard behavior.
- Keep provider secrets and server-only imports out of client bundles.
- Do not rewrite the data model.
- Do not hand-edit generated Convex files.
- Keep code movement reviewable through focused commits or implementation ledger entries.
- Run current required gates before review; run deterministic E2E because browser, route, Convex, and provider-adapter boundaries are affected.

## Verification Strategy

- Focused automated tests:
  - Add or update tests for extracted Game Master orchestration, body parsing, local route guard, action/pass behavior, provider failure, invalid output, and extraction failure.
  - Add or update unit tests for extracted pure builders from UI/director/Convex where deterministic behavior is currently embedded in large files.
- Broad supporting gates:
  - `npm run ci:required`.
  - `npm run convex:once` if Convex module exports or generated API shape are touched.
- Deterministic E2E:
  - `npm run e2e` is required because the change touches browser flows, route handler, Convex state, provider adapter path, and persistence loop.
- Live-provider or external-service playtests:
  - Not required for this behavior-preserving refactor. Optional if implementation unexpectedly changes prompt/request shape.
- Manual UI confirmation:
  - Pending Taylor if visible layout/fallback behavior changes.
  - Not applicable if the browser UI is behaviorally and visually unchanged beyond internal component extraction.
- Debug/log inspection:
  - Inspect local Game Master logs only if route orchestration movement risks losing turn unit evidence, raw request storage, provider/model summary, or extraction records.

## Decisions

- Preserve `/api/director/turn` as the Game Master HTTP boundary for this refactor.
- Preserve Convex as the canonical state and generated Convex functions as the current app-state contract.
- Do not create a new technical architecture Epic.
- Use the ADR to record durable architecture boundaries.
- Do not create a public changelog entry for this internal refactor.

## Risks / Trade-Offs

- The diff will be broad even without behavior changes.
- Refactors can hide regressions if tests only prove compilation; E2E and focused orchestration tests are required.
- Splitting too aggressively could add indirection. Keep modules capability-sized, not file-count-driven.
- Keeping current public Convex functions stable may require temporary wrapper modules, but that is preferable to breaking generated API consumers during a refactor.
