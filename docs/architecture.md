# Architecture

Lorecraft MVP is a Next.js + Convex persistent-world prototype. It tests whether a small narrative world can remember play as durable state while keeping the player-facing UI story-first.

## System Boundaries

- `src/app/`: thin App Router route composition, route-level loading/error fallbacks, and `/api/director/turn` adapter exports.
- `src/features/play/`: narrative playtest UI, debug drawer, reset controls, client-side interaction state, and browser-safe display helpers.
- `src/server/director/`: server-only Game Master turn request parsing, local route guard helpers, Convex HTTP client orchestration, provider calls, persistence, extraction, logging, and response shaping.
- `src/lib/director/`: prompt construction, OpenAI-compatible provider adapter, parsing, validation, and generation settings.
- `convex/world.ts`: WorldVersion/Adventure seed/copy/reset, feed reconstruction, canonical state reads/writes, Game Master debug records, and mutation validation.
- `src/lib/world/stormbound-baseline.ts`: Stormbound Chapel seed constants and baseline builder used by WorldVersion/Adventure creation and reset.
- `convex/schema.ts`: durable table and index definitions.
- `scripts/`: local playtest, benchmark, fixture-provider, and E2E support scripts.

## Game Master Flow

1. The UI submits player narrative input or a Pass trigger for the selected Adventure.
2. The thin Next route delegates to `src/server/director/`, which validates the request and loads current Convex Adventure context plus source WorldVersion metadata.
3. Persistent mode builds a bounded prompt from canonical state, recent successful narration history, NPC profiles, and location context.
4. The provider returns player-facing narration.
5. A separate extractor may propose bounded state changes.
6. Convex validates accepted mutations before storing canonical state.
7. The feed is reconstructed from Adventure-scoped commands, narrations, events, and state evidence.

## Authority Boundaries

- Convex is the canonical Adventure runtime state.
- Worlds and WorldVersions are authored source material; Adventures are mutable playable copies.
- Game Master prose is not canonical state until backend validation stores an accepted mutation.
- Transcript mode is a comparison mode built from Adventure seed text plus transcript, not live canonical state mutation.
- Debug UI can expose technical state, but player-facing UI should remain narrative-first.
- Debug write and full debug snapshot surfaces are local/dev-oriented. They require `LORECRAFT_ENABLE_DEBUG_ROUTES=1` in a non-production process.
- `/api/director/turn` is local-only by default. Remote use requires explicit opt-in plus a server-held Convex write token, and still needs real auth before production.

## Related Docs

- `docs/data-model.md`
- `docs/persistence-system.md`
- `docs/testing.md`
- `docs/ci-cd.md`
- `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
