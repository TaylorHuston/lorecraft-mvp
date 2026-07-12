# Lorecraft MVP

Lorecraft is a local-first prototype for AI Dungeon-style play with database-backed world memory.

The experiment is simple: can a small narrative world remember what changed because the world has explicit state, not because a long chat transcript happens to mention it?

This is not a complete RPG. The current MVP is a playable persistent-world spike with resettable demo worlds, a narrative story feed, an AI Game Master, persistent Player and Room Info panels, inspectable debug state, NPC Cards, Location Cards, pre-turn utility commands, and bounded state mutation through Convex.

## Current Features

- Narrative-only story input and a resumable player-facing story stream.
- `Pass` turns for letting the Game Master continue the scene without adding player prose.
- `Story` inserts for adding canonical player-authored scene prose before the next resolving turn.
- `Guide` turns for privately steering the next Game Master narration without showing the raw guidance in the story stream.
- Provider-agnostic Game Master route for OpenAI-compatible chat completions endpoints.
- Local Ollama, LM Studio, OpenRouter, Vercel AI Gateway, or direct-provider playtesting through the same backend adapter.
- Stormbound Chapel demo World with a frozen WorldVersion and a default playable Adventure copy.
- Tutorial demo World for learning Act, Pass, `/help`, `/look`, and NPC presence.
- Startup World container screen showing seeded Worlds with local Adventures listed inside them, with each Adventure opened at `/adventures/<id>` and removable from the list.
- Player name prompt when starting a new Adventure, with the name shown in an Adventure-owned Player Card.
- Persistent collapsible Player Card for player-facing character context, including optional physical description, backstory, status, and current location.
- Persistent read-only Room Info panel with the current room, present NPCs, and drill-down profiles for internal playtesting.
- Pre-turn `/help` and `/look` utility commands, with autocomplete for supported commands and visible `/look` targets, that persist in the feed without incrementing turns or entering future Game Master story context.
- Adventure-scoped locations, NPCs, story context, turns, Game Master calls, state diffs, and resettable local state.
- NPC Cards with description, background, persona, voice, mood, status, memory, and private knowledge.
- Location Cards with current-location context, known destination context, debug editing, and bounded movement.
- Post-narration state extraction for validated NPC `mood`, `status`, and `memory` updates.
- Bounded actor movement to existing canonical locations when the player clearly travels and the narration confirms arrival.
- Responsive three-pane Adventure workbench with mobile Player/Story/Room tabs, collapsible context panes, and contained Help and debug modals.
- Persistent bounded command textarea for Act, Story, and Guide, with Pass available without discarding a draft.
- Debug panel for prompt guidance, patch-safe NPC/location editing, hidden state, turns, Game Master calls, and state diffs.
- Deterministic Playwright E2E coverage using a local OpenAI-compatible fixture provider.

## What This Is Testing

Lorecraft's product thesis is state-first storytelling:

- The Game Master writes prose.
- Convex stores world truth.
- LLM output is untrusted until backend validation accepts a bounded state change.
- Each turn is rebuilt from canonical state plus recent successful narration context, with prior commands and debug events kept out of normal future story prompts.

This is meant to explore a middle ground between freeform AI storytelling and rigid text RPGs. The player should interact naturally, while the engine keeps enough structured state to prevent the world from drifting when old transcript context falls away.

## What This Is Not Yet

This repo does not currently include:

- Production deployment.
- User accounts, auth, permissions, or world ownership.
- Multiplayer.
- Combat, HP, inventory, stats, quests, rulesets, or dice systems.
- A polished World Builder.
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

Persistent mode is the default. It sends canonical world, location, NPC, and recent successful narration context to the Game Master. Story generation returns plain prose; a separate extraction pass may propose bounded state changes that Convex validates before saving.

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

The E2E command starts a local OpenAI-compatible fixture provider plus a debug-enabled Convex/Next app stack on test ports. It verifies that the browser can seed/reset Stormbound Chapel as an Adventure copied from a WorldVersion, name a new Adventure player, use the responsive Player/Story/Room workbench, edit the Player Card, inspect complete Room NPC profiles, use Help and debug modals, add Story setup, use hidden Guide steering, use `/help` and `/look` before acting, submit narrative input with Enter, use Pass, receive persisted Game Master responses, reload the story, inspect debug evidence, explicitly create and relocate NPCs, edit/create locations, validate travel, reset Adventure state, and create a Tutorial Adventure.

`npm run e2e` does not call Ollama, OpenRouter, Vercel AI Gateway, or hosted models. It is local-only and destructive against its local test state. The local Convex port `3210` must be free; stop `npm run dev:debug` before treating an E2E port failure as an app regression.

Install the local Chromium browser for Playwright once if needed:

```bash
npm run e2e:install
```

## Project Structure

| Path | Purpose |
|---|---|
| `convex/schema.ts` | World, WorldVersion, Adventure, runtime table, and index definitions. |
| `convex/world.ts` | Public Convex World/Adventure function contract, feed reconstruction, canonical state reads/writes, and mutation validation. |
| `src/lib/world/stormbound-baseline.ts` | Seeded World constants and baseline builders for Stormbound Chapel and Tutorial. |
| `src/app/` | Thin App Router pages, route fallbacks, and API adapter files. |
| `src/app/api/director/turn/route.ts` | Thin `/api/director/turn` Route Handler export. |
| `src/server/director/` | Server-only Game Master turn request parsing, local route guards, orchestration, provider calls, persistence, extraction, and logging. |
| `src/lib/director/` | Prompt construction, provider adapter, parsing, validation, and generation settings. |
| `src/features/play/` | Narrative playtest UI, debug panel, player turn controls, and browser-safe debug display helpers. |
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

The long-term direction is not a lightweight MUD. Keep slash commands limited to useful pre-turn utilities unless playtesting proves a broader command surface is needed. Do not add combat turns, HP, inventory, quest systems, or broad simulation controls until there is a concrete need.
