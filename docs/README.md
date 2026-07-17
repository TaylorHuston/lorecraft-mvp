# Docs

This directory contains supporting engineering references for the archived Lorecraft MVP implementation. These documents preserve prototype behavior and decisions; they do not define the current official Lorecraft product.

Canonical product behavior lives in `docs/epics/**/epic.md`. Active or proposed work lives in `docs/changes/**`. Root docs explain architecture, state, persistence, verification, deployment posture, and visual direction.

## Root References

| File | Purpose |
|---|---|
| `architecture.md` | Next.js, Convex, Game Master, prompt/extractor, and debug-surface boundaries. |
| `data-model.md` | Canonical Convex entities, facts, turns, narrations, state diffs, and reset semantics. |
| `persistence-system.md` | Persistent-world strategy, transcript mode, Game Master authority, and mutation boundaries. |
| `testing.md` | Unit, CI, deterministic E2E, live-provider playtest, and manual verification guidance. |
| `ci-cd.md` | Required gate, optional E2E/provider checks, and current deployment gap. |
| `deployment.md` | Current non-deployed status and the information required before production release. |
| `style-guide.md` | Repo-local pointer to the Lorecraft visual identity and implementation-level UI constraints. |

## Maintenance

- Keep these docs aligned with `README.md`, `AGENTS.md`, package scripts, and active SDD artifacts.
- Keep private product direction in `../../../ideas/lorecraft/`.
- Do not duplicate Epic/Story truth here; link to `docs/epics/` and `docs/changes/` when behavior evidence matters.
