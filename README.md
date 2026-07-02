# Lorecraft MVP

Lorecraft is a local-first prototype for AI Dungeon-style play with database-backed world memory.

The experiment is simple: can a small narrative world remember what changed because the world has explicit state, not because a long chat transcript happens to mention it?

This is not a complete RPG. The current MVP is a playable persistent-world spike with one resettable demo world, a narrative story feed, an AI Game Master, inspectable debug state, NPC Cards, Location Cards, and bounded state mutation through Convex.

## Current Features

- Narrative-only story input and a resumable player-facing story stream.
- Provider-agnostic Game Master route for OpenAI-compatible chat completions endpoints.
- Local Ollama, LM Studio, OpenRouter, Vercel AI Gateway, or direct-provider playtesting through the same backend adapter.
- Stormbound Chapel demo World with a frozen WorldVersion and a default playable Adventure copy.
- Startup Adventure screen for continuing existing local Adventures or creating a new Adventure from the current WorldVersion.
- Adventure-scoped locations, NPCs, story context, turns, Game Master calls, state diffs, and resettable local state.
- NPC Cards with description, background, persona, voice, mood, status, memory, and private knowledge.
- Location Cards with current-location context, known destination context, debug editing, and bounded movement.
- Post-narration state extraction for validated NPC `mood`, `status`, and `memory` updates.
- Bounded actor movement to existing canonical locations when the player clearly travels and the narration confirms arrival.
- Debug panel for prompt guidance, NPCs, locations, hidden state, turns, Game Master calls, and state diffs.
- Deterministic Playwright E2E coverage using a local OpenAI-compatible fixture provider.

## What This Is Testing

Lorecraft's product thesis is state-first storytelling:

- The Game Master writes prose.
- Convex stores world truth.
- LLM output is untrusted until backend validation accepts a bounded state change.
- Each turn is rebuilt from canonical state plus recent story context.

This is meant to explore a middle ground between freeform AI storytelling and rigid text RPGs. The player should interact naturally, while the engine keeps enough structured state to prevent the world from drifting when old transcript context falls away.

## What This Is Not Yet

This repo does not currently include:

- Production deployment.
- User accounts, auth, permissions, or world ownership.
- Multiplayer.
- Combat, HP, inventory, stats, quests, rulesets, or dice systems.
- A polished World Builder.
- Polished reusable World Builder.
- Marketplace, billing, creator tools, or public hosting.

Remote/shared deployments are not production-ready. The current route guardrails are prototype safety checks, not a replacement for real authentication, ownership checks, rate limiting, or production operations.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Convex 1.42
- npm

## Quick Start

Install dependencies:

```bash
npm install
```

Configure an OpenAI-compatible local model endpoint. Ollama on macOS is the main local playtest path:

```bash
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=<installed-ollama-model>
```

LM Studio, OpenRouter, Vercel AI Gateway, or a direct provider can use the same variables if they expose an OpenAI-compatible chat completions endpoint.

Provision or validate the local Convex deployment once:

```bash
npm run convex:once
```

Start the local app with debug diagnostics enabled:

```bash
npm run dev:debug
```

Open:

```text
http://localhost:3000
```

Seed the demo world from the app if prompted, then try:

```text
I ask Mira what she knows about the storm.
```

## Game Master Modes

Persistent mode is the default. It sends canonical world, location, NPC, and recent-story context to the Game Master. Story generation returns plain prose; a separate extraction pass may propose bounded state changes that Convex validates before saving.

Transcript mode is a comparison mode for story-only generation from the opening seed plus transcript. It does not include live canonical world state and does not apply NPC fact changes, actor movement, state diffs, or LLM-authored world events.

Start transcript mode with:

```bash
LORECRAFT_DIRECTOR_MODE=transcript npm run dev:debug
```

## Useful Commands

| Command | Purpose |
|---|---|
| `npm run dev:debug` | Start Convex and Next.js with local Game Master diagnostics enabled. |
| `npm run ci:required` | Run lint, unit tests, typecheck, and production build. |
| `npm run e2e` | Run deterministic browser E2E with a local fixture provider. |
| `npm run playtest:director` | Run a live persistent-mode Game Master smoke test against a running dev server. |
| `npm run playtest:director:transcript` | Run a live transcript-mode smoke test. |
| `npm run benchmark:director-models` | Compare local models against the latest logged Game Master prompt. |

Optional local tuning variables:

```bash
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=250
LLM_TOP_P=0.9
LLM_REASONING_EFFORT=none
```

Unset optional values use safe defaults. `LLM_MAX_TOKENS=250` keeps local turns short while reducing mid-sentence truncation during action-heavy beats. `LLM_REASONING_EFFORT=none` is useful for local Ollama Gemma playtests where some models otherwise return reasoning text with empty assistant content.

## Testing

The required local gate is:

```bash
npm run ci:required
```

This runs:

- `npm run lint`
- `npm run test`
- `npm run typecheck`
- `npm run build`

The deterministic browser test is:

```bash
npm run e2e
```

The E2E command starts a local OpenAI-compatible fixture provider plus a debug-enabled Convex/Next app stack on test ports. It verifies that the browser can seed/reset Stormbound Chapel as an Adventure copied from a WorldVersion, submit narrative input with Enter, receive a persisted Game Master response, reload the story, inspect debug turn/source-version evidence, edit/create debug locations, accept valid travel, reject unknown travel, and reset Adventure location state.

`npm run e2e` does not call Ollama, OpenRouter, Vercel AI Gateway, or hosted models. It is local-only and destructive against its local test state. The local Convex port `3210` must be free; stop `npm run dev:debug` before treating an E2E port failure as an app regression.

Install the local Chromium browser for Playwright once if needed:

```bash
npm run e2e:install
```

## Project Structure

| Path | Purpose |
|---|---|
| `convex/schema.ts` | World, WorldVersion, Adventure, runtime table, and index definitions. |
| `convex/world.ts` | Demo World/Adventure seed/reset/copy, feed reconstruction, canonical state reads/writes, and mutation validation. |
| `src/app/api/director/turn/route.ts` | Synchronous Game Master turn orchestration boundary. |
| `src/lib/director/` | Prompt construction, provider adapter, parsing, validation, and generation settings. |
| `src/app/world-client.tsx` | Narrative playtest UI and debug panel. |
| `scripts/llm-fixture-server.mjs` | Local OpenAI-compatible fixture provider for deterministic tests. |
| `tests/e2e/` | Playwright coverage for the current playtest loop. |
| `docs/` | Architecture, data model, persistence strategy, testing, CI/CD, deployment notes, Epics, and completed changes. |

## Documentation

- [`docs/architecture.md`](docs/architecture.md) explains the Next.js, Convex, Game Master, prompt/extractor, and debug boundaries.
- [`docs/data-model.md`](docs/data-model.md) defines the current canonical Convex objects and fields.
- [`docs/persistence-system.md`](docs/persistence-system.md) explains the state-first persistence strategy.
- [`docs/testing.md`](docs/testing.md) describes unit, CI, deterministic E2E, live-provider playtest, and manual verification guidance.
- [`docs/ci-cd.md`](docs/ci-cd.md) documents required gates and branch policy.
- [`docs/deployment.md`](docs/deployment.md) captures the current non-deployed status and production gaps.
- [`CHANGELOG.md`](CHANGELOG.md) summarizes user-facing release changes.

## Debugging And Local Logs

`npm run dev:debug` enables local Game Master diagnostics:

- newline-delimited JSON logs at `logs/director-debug.jsonl`
- raw provider request messages in local logs
- raw LLM response text in local logs
- persisted provider request messages in `directorCalls.rawRequest`
- debug-only Convex write/snapshot surfaces

Each recorded Game Master story attempt writes a `director.turn.unit` record with turn metadata, player input, provider/model summary, outcome, parsed narration/output when available, raw request/response diagnostics, and timing data. Persistent mode can also write `director.turn.extraction` records for post-narration NPC-state extraction. Pre-turn failures write `director.turn.rejected` records because no concrete turn exists yet.

These diagnostics can include prompt guidance, player text, model output, and hidden NPC knowledge. Keep them local and out of commits, public docs, and shared deployments.

## Current Direction

Lorecraft should feel like a TTRPG-style Game Master: story-first play supported by structured Story Cards, durable memory, and eventually selective hidden adjudication for risky or consequential uncertainty.

The long-term direction is not a lightweight MUD. Do not add slash commands, command lists, combat turns, HP, inventory, quest systems, or broad simulation controls until playtesting shows a concrete need.
