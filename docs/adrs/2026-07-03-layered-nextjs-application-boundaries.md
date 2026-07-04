# ADR: Layered Next.js Application Boundaries

- Status: Proposed
- Date: 2026-07-03
- Related change: `docs/changes/2026-07-03-nextjs-architecture-refactor/`
- Related Epics / Stories: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`; `docs/epics/lc-002-world-adventure-model/epic.md`

## Context

Lorecraft's MVP has proven the Game Master loop, World/Adventure copies, story-visible turn context, Pass turns, NPC state mutation, Location Cards, and debug surfaces. The implementation now concentrates too much behavior in a few files:

- `src/app/world-client.tsx` combines route UI, story UI, turn submission, Adventure management, debug editing, autosave queues, display helpers, and Convex hook usage.
- `src/app/api/director/turn/route.ts` combines HTTP concerns, local route guarding, Convex setup, Game Master orchestration, provider calls, parsing, persistence, extraction, movement validation, logging, and response shaping.
- `convex/world.ts` combines seed data, Adventure lifecycle, snapshot construction, Game Master context, turn persistence, reset behavior, debug editing, and cleanup helpers.

Next.js 16 App Router guidance and Lorecraft's local developer guide both favor thin route files, Server Components by default, small Client Component boundaries, route handlers for server-only API work, and durable application behavior outside React components. Lorecraft also needs to preserve a clean backend boundary for future clients such as mobile, scripts, debug tooling, or a World Builder.

## Decision

Lorecraft SHALL use layered Next.js application boundaries:

- App Router files under `src/app/` SHALL stay thin and focus on route composition, metadata, providers, route params, route handlers, and route-level fallback UI.
- Interactive web UI SHALL live behind focused Client Component boundaries and feature hooks/controllers. React components may present state, collect input, and trigger typed operations, but must not own provider calls, prompt construction, mutation validation, or canonical state rules.
- Game Master turns SHALL continue to enter through the `/api/director/turn` Route Handler for this MVP. The Route Handler SHALL act as an HTTP/server adapter around typed server/application orchestration modules.
- Provider calls, provider configuration, raw request/response handling, Game Master logging, Convex HTTP client setup, and server-held write tokens SHALL remain in server-only modules and must not be imported by Client Components.
- Convex remains canonical state. Public Convex function behavior SHOULD remain stable during refactors, while internals SHOULD be split by capability: seed/baseline, Adventure lifecycle, snapshot/context assembly, turn persistence, debug writes, cleanup, and pure builders.
- Deterministic transformations SHOULD move into plain TypeScript modules when that improves testability and does not leak privileged server state to the browser.

## Options Considered

### Option 1: UI-only split

- Summary: Split `world-client.tsx` into components and hooks while leaving the Route Handler and Convex module largely unchanged.
- Pros: Lowest risk; fixes the most visible file-size issue; easier to review.
- Cons: Leaves backend orchestration bottlenecks intact; does not satisfy the full-stack scope; future Game Master and World/Adventure changes would still require scanning large server files.

### Option 2: Layered full-stack refactor

- Summary: Split App Router composition, interactive UI, Game Master route orchestration, server/application modules, and Convex internals while preserving existing contracts.
- Pros: Aligns with Next.js and project guidance; improves frontend/backend separation; supports future clients; improves focused testability; preserves working MVP behavior.
- Cons: Broad diff; requires careful verification; can add indirection if modules are split by file count instead of capability.

### Option 3: Backend platform redesign

- Summary: Replace the Game Master Route Handler with Server Actions, Convex actions, or a new service/API contract.
- Pros: Could eventually produce a more formal backend contract.
- Cons: Over-scoped; changes working contracts too early; risks forcing production auth/API decisions before the MVP needs them; likely distracts from the refactor goal.

## Consequences

- Positive: Route files, Client Components, server orchestration, and Convex functions become easier to reason about independently.
- Positive: Future UI changes should be less likely to break Game Master or persistence logic.
- Positive: Provider secrets, raw requests, and server write tokens remain server-only.
- Positive: Future mobile/debug/tooling clients can target clearer product capability boundaries.
- Positive: Focused tests can cover extracted orchestration and pure builders without booting the whole app.
- Negative: The implementation diff will be broad even though behavior is intended to stay unchanged.
- Negative: Some temporary wrapper modules may exist to preserve Convex generated API stability while internals move.
- Negative: Over-splitting could make the app harder to follow; implementation must split by capability, not by arbitrary line count.
- Follow-up: After implementation, update `docs/architecture.md`, README project structure, and Epic `Implemented By` maps.

## Validation

Implementation and review should prove:

- `src/app/page.tsx` and `src/app/adventures/[adventureId]/page.tsx` remain thin route composition files.
- Client Components do not import server-only provider, Convex server, environment, or Game Master route modules.
- `/api/director/turn` preserves its request/response contract and local guard behavior.
- Action and Pass turns still work through the real browser, route, fixture provider, Convex state, and feed reconstruction path.
- Debug NPC and Location editing, autosave flushing, reset, Adventure create/delete, and direct Adventure URLs still work.
- `npm run ci:required` passes.
- `npm run e2e` passes, or any blocker is documented with residual risk.
- `npm run convex:once` passes when Convex module boundaries or generated API shape are touched.

## Reconsider When

- A mobile client needs a formal public API contract instead of direct Convex plus `/api/director/turn`.
- Production auth/ownership rules require route or Convex function ownership to change.
- Game Master orchestration needs background jobs, streaming, queues, or long-running workflow semantics that no longer fit a synchronous Route Handler.
- Server Actions become a better fit for a specific internal UI mutation that does not need external/mobile/API access.
- Convex actions become the preferred host for provider orchestration and can preserve diagnostics, local model playtesting, and future-client access.
