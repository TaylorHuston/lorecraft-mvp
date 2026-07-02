# Deployment

## Status

Production deployment is not wired yet.

Lorecraft is currently a local MVP playtest loop. Required local checks, deterministic E2E, and live-provider playtests are documented in `docs/testing.md` and `docs/ci-cd.md`.

## Before Production Deployment

Create or update this runbook before any production release. It must define:

- hosting provider and project
- Convex deployment target
- environment variables and secret stores
- provider/model configuration
- preview deployment behavior
- production deployment trigger
- release gate
- smoke checks
- rollback path

## Required Release Inputs

- `/sdd-release` readiness for the target branch.
- Current `CHANGELOG.md`.
- Passing `npm run ci:required`.
- Deterministic `npm run e2e` when the release touches browser/runtime behavior.
- Manual UI confirmation or an explicitly accepted gap for player-facing changes.

## Prototype Guardrails

The current Game Master route is local-first. `/api/director/turn` rejects non-local requests unless `LORECRAFT_ALLOW_REMOTE_DIRECTOR=1` is explicitly set. Remote/shared deployments also need `LORECRAFT_SERVER_WRITE_TOKEN` configured so the route can make server-owned Convex context/write calls in production.

This is a prototype guardrail, not product auth. Before production release, replace or supplement it with real user authentication, world ownership checks, rate limiting, and a split between player-facing state and developer/debug state.

## Secrets

Keep provider keys, Convex credentials, deployment tokens, and generated secrets in ignored `.env*` files, GitHub secrets, Vercel environment variables, or provider secret stores. Never commit or print them.

## Known Gaps

- No production hosting target is defined.
- No production Convex deployment is documented for this app.
- No production smoke-check command is defined.
- No production user authentication, ownership, or rate limiting is defined.
