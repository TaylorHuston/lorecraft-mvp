# Lorecraft MVP

Experimental Next.js + Convex scaffold for the Lorecraft persistent-world memory spike.

The first goal is not a complete RPG. It is to test whether a small world can remember narrative interaction as durable state: a resumable story feed, Game Master narrations, world events, debug records, and readable NPC profile/facts.

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

Configure an OpenAI-compatible local model endpoint for Game Master turns. Ollama on macOS is the first intended runtime:

```bash
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=<installed-ollama-model>
```

LM Studio, OpenRouter, Vercel AI Gateway, or a direct provider can use the same variables if they expose an OpenAI-compatible chat completions endpoint.

Optional local tuning variables:

```bash
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=200
LLM_TOP_P=0.9
LLM_REASONING_EFFORT=none
```

Unset optional values use safe defaults. `LLM_MAX_TOKENS=200` keeps local turns short and interactive; raise it only when testing longer descriptive beats. `LLM_REASONING_EFFORT=none` is useful for local Ollama Gemma playtests where some models otherwise return reasoning text with empty assistant content. The app currently supports the OpenAI-compatible subset above and records a compact generation-settings summary in Game Master debug metadata.

To compare local models against the same latest logged Game Master prompt:

```bash
npm run benchmark:director-models
```

Provision or validate the local Convex deployment once:

```bash
npm run convex:once
```

Start the local development loop with Game Master diagnostics enabled:

```bash
npm run dev:debug
```

This starts Convex and Next.js together. The app runs at:

```text
http://localhost:3000
```

`npm run dev:debug` currently enables all local Game Master diagnostics: newline-delimited JSON logs at `logs/director-debug.jsonl`, raw provider request messages in those local logs, raw LLM response text in those local logs, and persisted provider request messages in `directorCalls.rawRequest`.

Each recorded Game Master turn attempt writes one `director.turn.unit` record containing the turn ID, command ID, player input, provider host, model, compact request summary, outcome, errors, parsed narration/output when available, accepted/ignored updates, response length metadata, raw request, raw response, and timing data. Pre-turn failures still write `director.turn.rejected` records because no concrete turn exists yet. This can include prompt guidance, player text, model output, and in persistent mode hidden NPC knowledge, so keep it local/debug-only.

Persistent Game Master mode is the default. To compare story-only prose generation without canonical world mutation, start the app with transcript mode:

```bash
LORECRAFT_DIRECTOR_MODE=transcript npm run dev:debug
```

Transcript mode still persists turns, player input, Game Master narrations, Game Master debug calls, and local logs. Its prompt is built from the canonical opening seed plus the transcript only; it does not include current room state, present actors, exits, object state, NPC facts, hidden NPC knowledge, or a scene-beat classifier. It does not apply NPC fact changes, LLM-authored world events, or LLM-authored state diffs from the Game Master response.

The demo world is intentionally fresh seed data for now. Seeding Stormbound Chapel deletes prior demo worlds and starts a new boot-scoped world, so after a server restart the expected workflow is to seed again and test the initial world setup.

Run the repeatable local Game Master smoke playtest against a running dev server:

```bash
npm run playtest:director
```

The script seeds a fresh demo world, sends a direct Mira question, sends a plain action, and verifies response shape plus Game Master debug metadata. Use `--base-url` if Next is running somewhere other than `http://localhost:3000`.

When the app is running in transcript mode, run the no-mutation smoke check:

```bash
npm run playtest:director:transcript
```

## What Is Scaffolded

- `convex/schema.ts` defines the persistent-world tables.
- `convex/world.ts` seeds a fresh boot-scoped Stormbound Chapel demo world, reconstructs the feed, persists Game Master debug records, exposes actor/fact state, and resets playtest state.
- `src/app/api/director/turn/route.ts` coordinates synchronous Game Master turns through a provider-neutral backend boundary.
- `src/lib/director/` contains provider-agnostic prompt, parsing, validation, and OpenAI-compatible adapter logic.
- `src/app/world-client.tsx` renders the narrative playtest UI and debug state panel.
- `src/app/providers.tsx` wires the Convex React provider into the App Router root.

The persistence strategy is documented in [`docs/persistence-system.md`](docs/persistence-system.md). The canonical object and field reference is [`docs/data-model.md`](docs/data-model.md). Update them when canonical state, Game Master mutation authority, feed reconstruction, reset behavior, or object semantics change.

Try narrative input such as:

```text
I ask Mira what she knows about the storm.
```

Direct questions to present NPCs derive a required scene beat so the Game Master is prompted to let that NPC make a meaningful response or choice. Current-scene NPC profiles are rendered into card-like prompt context, including Mira's description, background, persona, voice, mood, status, memory, and private knowledge. Game Master-returned NPC updates are ignored for this read-only NPC context test.

The seeded chapel currently includes Mira and Brother Alden so local playtesting can compare how the Game Master handles multiple NPCs in the same scene.

The debug panel includes text-only prompt guidance sections for style, NPC behavior, and persistence strategy. It also includes an `NPCs` tab for temporary server-local NPC description/fact overrides. These sections and overrides are sent with the next persistent Game Master turn and are summarized in the latest Game Master call debug metadata. NPC debug overrides are not stored in Convex and disappear when the application server restarts.

The NPC override API is local-debug tooling. It is available outside production by default and returns 404 in production unless `LORECRAFT_ENABLE_DEBUG_ROUTES=1` is explicitly set.

The player-facing surface is intentionally narrative-only for now. Slash commands, MUD-style commands, room movement mutation, combat, HP, inventory, quests, campaign copies, marketplace logic, and polished builder UI are out of scope.

## Current Intent

Keep this repo disposable until the core loop proves itself. The current proof is one editable persistent world with a rough reset. The later target model is independent story/play-session instances generated from a world or template.

The long-term direction is not a lightweight MUD. Lorecraft should feel like a TTRPG-style Game Master: story-first play supported by structured Story Cards, durable memory, and eventually selective hidden adjudication for risky or consequential uncertainty. Do not add movement commands, combat rules, stats, or broad simulation systems before playtesting shows a concrete need.
