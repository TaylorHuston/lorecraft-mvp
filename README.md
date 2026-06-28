# Lorecraft MVP

Experimental Next.js + Convex scaffold for the Lorecraft persistent-world memory spike.

The first goal is not a complete RPG. It is to test whether a small world can remember narrative interaction as durable state: a resumable story feed, Director narrations, world events, debug records, and Mira's mutable NPC facts.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Convex 1.42
- npm

## Development

Install dependencies:

```bash
npm install
```

Configure an OpenAI-compatible local model endpoint for Director turns. Ollama on macOS is the first intended runtime:

```bash
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=<installed-ollama-model>
```

LM Studio, OpenRouter, Vercel AI Gateway, or a direct provider can use the same variables if they expose an OpenAI-compatible chat completions endpoint.

Optional local tuning variables:

```bash
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=700
LLM_TOP_P=0.9
```

Unset optional values use safe defaults. The app currently supports the OpenAI-compatible subset above and records a compact generation-settings summary in Director debug metadata.

Provision or validate the local Convex deployment once:

```bash
npm run convex:once
```

Start the local development loop:

```bash
npm run dev
```

This starts Convex and Next.js together. The app runs at:

```text
http://localhost:3000
```

For local troubleshooting, enable structured Director logs:

```bash
npm run dev:debug
```

This writes newline-delimited JSON to `logs/director-debug.jsonl`, which is gitignored. Records include route stage, provider host, model, compact request summary, outcome, errors, accepted/ignored update counts, response length metadata, and timing data. Full raw LLM response text is omitted unless `LORECRAFT_DEBUG_LOG_RAW_LLM=1` is also set.

Run the repeatable local Director smoke playtest against a running dev server:

```bash
npm run playtest:director
```

The script seeds and rough-resets the demo world, sends a direct Mira question, sends a plain action, and verifies response shape plus Director debug metadata. Use `--base-url` if Next is running somewhere other than `http://localhost:3000`.

## What Is Scaffolded

- `convex/schema.ts` defines the persistent-world tables.
- `convex/world.ts` seeds the Stormbound Chapel world, reconstructs the feed, persists Director debug records, stores accepted NPC facts, and resets playtest state.
- `src/app/api/director/turn/route.ts` coordinates synchronous Director turns through a provider-neutral backend boundary.
- `src/lib/director/` contains provider-agnostic prompt, parsing, validation, and OpenAI-compatible adapter logic.
- `src/app/world-client.tsx` renders the narrative playtest UI and debug state panel.
- `src/app/providers.tsx` wires the Convex React provider into the App Router root.

The persistence strategy is documented in [`docs/persistence-system.md`](docs/persistence-system.md). The canonical object and field reference is [`docs/data-model.md`](docs/data-model.md). Update them when canonical state, Director mutation authority, feed reconstruction, reset behavior, or object semantics change.

Try narrative input such as:

```text
I ask Mira what she knows about the storm.
```

Direct questions to present NPCs derive a required scene beat so the Director is prompted to let that NPC make a meaningful response or choice. Hidden read-only NPC facts, such as Mira's seeded `knows_about_storm` fact, are included as private context without expanding the mutable fact allowlist beyond `mood`, `status`, and `memory`.

The player-facing surface is intentionally narrative-only for now. Slash commands, MUD-style commands, room movement mutation, combat, HP, inventory, quests, campaign copies, marketplace logic, and polished builder UI are out of scope.

## Current Intent

Keep this repo disposable until the core loop proves itself. The current proof is one editable persistent world with a rough reset. The later target model is independent story/play-session instances generated from a world or template.
