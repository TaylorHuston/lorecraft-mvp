# Architecture

Lorecraft MVP is a Next.js + Convex persistent-world prototype. It tests whether a small narrative world can remember play as durable state while keeping the player-facing UI story-first.

## System Boundaries

- `src/app/world-client.tsx`: narrative playtest UI, debug drawer, reset controls, and client-side interaction state.
- `src/app/api/director/turn/route.ts`: synchronous Game Master turn orchestration boundary.
- `src/lib/director/`: prompt construction, OpenAI-compatible provider adapter, parsing, validation, and generation settings.
- `convex/world.ts`: world seed/reset, feed reconstruction, canonical state reads/writes, Game Master debug records, and mutation validation.
- `convex/schema.ts`: durable table and index definitions.
- `scripts/`: local playtest, benchmark, fixture-provider, and E2E support scripts.

## Game Master Flow

1. The UI submits player narrative input for the selected world.
2. The Next route validates input and loads current Convex world context.
3. Persistent mode builds a bounded prompt from canonical state, recent feed, NPC profiles, and location context.
4. The provider returns player-facing narration.
5. A separate extractor may propose bounded state changes.
6. Convex validates accepted mutations before storing canonical state.
7. The feed is reconstructed from persisted commands, narrations, events, and state evidence.

## Authority Boundaries

- Convex is the canonical world state.
- Game Master prose is not canonical state until backend validation stores an accepted mutation.
- Transcript mode is a comparison mode built from seed text plus transcript, not live canonical state.
- Debug UI can expose technical state, but player-facing UI should remain narrative-first.
- Debug write and full debug snapshot surfaces are local/dev-oriented. They require `LORECRAFT_ENABLE_DEBUG_ROUTES=1` in a non-production process.
- `/api/director/turn` is local-only by default. Remote use requires explicit opt-in plus a server-held Convex write token, and still needs real auth before production.

## Related Docs

- `docs/data-model.md`
- `docs/persistence-system.md`
- `docs/testing.md`
- `docs/ci-cd.md`
- `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
