# Testing

## Strategy

Lorecraft verification separates deterministic product checks from live provider playtests.

- Unit tests protect prompt construction, parsing, validation, provider adapter behavior, and state-boundary rules.
- Deterministic Playwright E2E uses a local OpenAI-compatible fixture provider.
- Live-provider playtests evaluate local model/runtime behavior and remain optional.
- Manual browser confirmation is still required for meaningful playtest UI changes.

## Required Gate

```bash
npm run ci:required
```

`npm run ci:required` runs:

```bash
npm run lint
npm run test
npm run typecheck
npm run build
```

## Focused Checks

| Command | Use When |
|---|---|
| `npm run test` | Prompt, parser, validation, provider, or domain logic changes. |
| `npm run e2e` | Browser, route, Convex state, provider adapter, or persistence loop changes. |
| `npm run playtest:director` | Live persistent-mode Game Master smoke test against a running dev server. |
| `npm run playtest:director:transcript` | Live transcript-mode smoke test. |
| `npm run benchmark:director-models` | Comparing local models against the latest logged Game Master prompt. |

## E2E Notes

`npm run e2e` starts a local fixture provider and test app stack on test ports. It should not call Ollama, OpenRouter, Vercel AI Gateway, or hosted providers.

The E2E app server enables `LORECRAFT_DEBUG_STORE_RAW_REQUEST=1` so deterministic tests can inspect the exact prompt context persisted in local `directorCalls.rawRequest`. This is local fixture evidence only; do not treat raw prompt persistence as safe for shared deployments.

The E2E path is local-only and destructive against local test state. Confirm configured ports are free before assuming failures are app regressions.

## Manual Verification

Use manual browser checks when story quality, debug readability, reset behavior, or player-facing narrative rhythm changes.

For tracked SDD changes, record manual UI confirmation in the active `docs/changes/**/tasks.md`.

## Sensitive Logs

`npm run dev:debug` records raw provider request and response data. These logs may contain prompt guidance, player text, model output, hidden NPC knowledge, and playtest context. Keep them local and out of commits, durable vault docs, and public artifacts.

`npm run dev:debug` and `npm run e2e:convex` set `LORECRAFT_ENABLE_DEBUG_ROUTES=1` only for the launched local process. They must not persist debug write access into a shared Convex deployment. If a previous local run set `LORECRAFT_ENABLE_DEBUG_ROUTES` in Convex deployment env, clear it before treating a shared deployment as reviewable.
