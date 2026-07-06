# Proposal: Next.js Architecture Refactor

## Why

Lorecraft has validated several core product loops quickly, but the implementation now concentrates too much behavior in a few files:

- `src/app/world-client.tsx` owns route-level UI, Adventure selection, story rendering, turn submission, debug tabs, debug editors, autosave queues, and display helpers.
- `src/app/api/director/turn/route.ts` owns HTTP parsing, local route guards, Convex client setup, Game Master orchestration, provider calls, output parsing, persistence, extraction, movement validation, logging, and response shaping.
- `convex/world.ts` owns seed data, World/Adventure lifecycle, snapshot construction, Game Master context assembly, turn persistence, reset behavior, debug editing, and internal cleanup helpers.

That was acceptable for an MVP spike, but it is starting to fight the project's stated architecture goals: thin Next.js routes/pages, small client boundaries, durable backend/application behavior outside React, reusable capability boundaries for future clients, and focused tests that do not require the whole app to understand one behavior.

## What Changes

Refactor the app to follow current Next.js App Router and project-local architecture guidance without changing the player-facing product model.

The change should:

- split the current monolithic client component into route composition, feature containers, presentational components, and focused hooks;
- keep App Router pages/layouts thin and use route segment conventions where they protect real user flows;
- preserve the Game Master turn endpoint as a Route Handler while moving orchestration into testable server/application modules;
- split Convex `world.ts` internals by capability while preserving current public Convex function contracts unless a wrapper/migration is explicitly planned;
- keep backend rules, provider calls, validation, and persistence out of React components;
- update docs and Epic implementation maps so the new structure is legible to future changes.

## Epic Actions

### New Epic Directories

- None proposed.
- Rationale: Epics should collect product/user paths, not technical architecture. This change is cross-cutting architecture work that supports existing user-path Epics.

### Existing Epic Directory Updates

- `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
  - Update `Implemented By` maps after implementation so existing product Stories point to the new UI, route, and Game Master modules.
  - No user-facing LC-001 Requirements are expected to change.
- `docs/epics/lc-002-world-adventure-model/epic.md`
  - Update `Implemented By` maps after implementation so World/Adventure behavior points to the new Convex/application modules.
  - No user-facing LC-002 Requirements are expected to change.

## Epic Story Changes

- No new Epic Stories proposed.
- No user-facing LC-001 or LC-002 Requirements are expected to change.
- Update LC-001 and LC-002 `Implemented By` / `Verified By` evidence only after the refactor lands and code paths move.
- Track the technical decomposition in `design.md`, `tasks.md`, and the ADR instead of creating a technical Epic.

## Scope Decisions

- Confirmed:
  - Include the full app architecture surface: frontend UI, Next.js route files, Game Master Route Handler, supporting server/application modules, and Convex world module decomposition.
  - Treat this as behavior-preserving refactor work.
  - Preserve the current `/` World container route and `/adventures/<id>` Adventure route.
  - Preserve the current `/api/director/turn` HTTP boundary for Game Master turns.
  - Preserve current Convex public function behavior unless a wrapper-backed migration is explicitly documented.
  - Use current Next.js 16 guidance: App Router route files remain thin, Client Components are isolated to interactive boundaries, route handlers stay server-only, and route segment loading/error/not-found files are added only when they protect real flows.
- Deferred:
  - Product behavior changes such as Retry, multiplayer, auth, production deployment, polished World Builder, new commands, dice/rules, combat, inventory, or mobile UI.
  - Replacing the Game Master Route Handler with Server Actions or Convex actions.
  - Redesigning the Convex schema or World/Adventure data model.
  - Public API/OpenAPI work beyond documenting the existing route contract and keeping it stable.
- Assumptions:
  - Refactor commits may be split internally during `/sdd-apply`, but should land as one reviewed change because all pieces are coupled by import boundaries and tests.
  - Existing E2E coverage should prove product behavior remains intact.
  - File names and exact folder names can be finalized during implementation as long as the selected architecture boundaries remain intact.
- User decisions that shaped the Story/Requirement split:
  - Taylor asked for "everything," meaning the refactor should not stop at `world-client.tsx`; it should include backend orchestration shape too.
  - Taylor clarified that Epics should be tied to collections of user paths, so this proposal does not create a technical architecture Epic.

## Change Folder

- Former active location: `docs/changes/2026-07-03-nextjs-architecture-refactor/`
- Closed location: `docs/changes/closed/2026-07-03-nextjs-architecture-refactor/`

## Impact

- Product: no product-model change; the app should still play, resume, pass, reset, debug, and mutate state as before. During implementation, Taylor approved small Act/Pass/input interaction polish as part of extracting the turn-control UI boundary.
- Code: high. This will move code across UI components, hooks, server/application modules, and Convex helper modules.
- Tests: high. Existing unit and E2E coverage should be preserved and focused tests should be added around newly extracted boundaries where useful.
- Docs: medium. Architecture, README project structure, testing notes, and Epic implementation maps should be updated.
- ADRs: required. This change establishes durable architecture boundaries for future Next.js work.

## Changelog Impact

- Required: no.
- Category: not applicable.
- Public summary: This is an internal architecture refactor with no intended user-facing behavior change.

## Open Questions

- None blocking. Exact file names and extraction sequence are implementation details, provided the design's boundaries and verification requirements are preserved.
