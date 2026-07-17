# Lorecraft MVP Workspace Guide

## Purpose

This repository is an archived Lorecraft MVP prototype: a Next.js + Convex persistent-world memory spike retained as implementation and product-history reference for the official Lorecraft application.

Do not begin new implementation work here. Use the official Lorecraft repository for active product development. Changes to this repository should be limited to archival integrity, security-sensitive corrections, or explicit reference maintenance authorized by the user.

## Read First

- `README.md` for current product intent, local model setup, development flow, playtest modes, and out-of-scope systems.
- `package.json` for the available npm scripts.
- `docs/ci-cd.md` for branch flow, required gates, optional checks, branch protection, and deployment expectations.
- `docs/data-model.md` before changing canonical Convex state, facts, actors, objects, turns, narrations, state diffs, or Game Master call records.
- `docs/persistence-system.md` before changing Game Master context assembly, persistence semantics, transcript mode, NPC state strategy, or reset behavior.
- `../../AGENTS.md`, `../../developer-guide.md`, and `../../story-driven-development.md` for shared workspace, branch, architecture, verification, and SDD doctrine.
- `../../shared/visual-style-guide.md` before creating, reviewing, or materially changing UI.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Repo Boundaries

- Treat this directory as an independent application repo with its own Git history. Do not stage, commit, or push from the surrounding Obsidian vault repo.
- The surrounding vault is private by default. Do not copy private planning notes, critique, strategy, or raw research into public app docs without explicit approval.
- Keep generated dependencies, logs, local environment files, Playwright output, and build artifacts inside this repo and out of durable vault docs.
- Do not edit unrelated in-flight changes. Inspect `git status` before work and keep changes scoped to the requested files.

## Branch Policy

- `main` is the production branch.
- `develop` is the integration branch and the GitHub default branch.
- Routine work branches start from `develop` and use:
  - `change/<short-slug>` for planned product, UX, architecture, or feature changes.
  - `fix/<short-slug>` for defects and regressions.
  - `misc/<short-slug>` for chores, tooling, documentation, process, infrastructure, and low-risk maintenance.
- Planning and documentation-only SDD artifacts may be created on `develop`, or on `main` only when Taylor explicitly allows that branch.
- Application code, tests, schemas, configuration, generated app artifacts, or runtime behavior changes require the appropriate work branch before editing.
- Routine integration may merge locally into `develop` after `/sdd-review` or equivalent local verification.
- Promotion to `main` should use `/sdd-release` and a remote release PR by default.
- See `docs/ci-cd.md` for required gates, optional checks, and branch protection expectations.

## Development Commands

- Install dependencies: `npm install`
- Provision or validate local Convex once: `npm run convex:once`
- Start the normal local debug loop: `npm run dev:debug`
- Start transcript comparison mode: `LORECRAFT_DIRECTOR_MODE=transcript npm run dev:debug`
- Run the local Game Master smoke playtest: `npm run playtest:director`
- Run the transcript-mode smoke check: `npm run playtest:director:transcript`
- Install local Chromium for Playwright once: `npm run e2e:install`
- Run deterministic browser E2E: `npm run e2e`
- Compare local models against the latest logged Game Master prompt: `npm run benchmark:director-models`

For the foreseeable future, use `npm run dev:debug` instead of `npm run dev` for normal Lorecraft playtesting. It enables the current Game Master diagnostics: local JSONL logs, raw provider request logging, raw LLM response logging, and persisted raw request storage.

## SDD Workflow

- Use current `/sdd-*` workflows.
- Use `/sdd-propose` for new tracked changes, `/sdd-propose --replan` when implementation discovers planning-level changes, `/sdd-apply` for implementation, `/sdd-review` as the local integration gate, and `/sdd-release` for promotion to `main`.
- Keep Epic/Story truth current when product behavior changes. Epics are the durable source for accepted user paths, Requirements, Scenarios, `Implemented By`, `Verified By`, and known gaps.
- Keep active changes under `docs/changes/yyyy-mm-dd-change-name/` with `proposal.md`, `design.md`, and `tasks.md`.
- Record manual UI confirmation status in `tasks.md` for browser-visible behavior: `not applicable`, `pending Taylor`, `Taylor confirmed`, or `accepted gap`.
- Do not close or merge a change while Epic truth, tasks, review state, changelog state, branch state, or manual confirmation status contradict each other.

## Verification

- Required cheap gate: `npm run ci:required`
- `npm run ci:required` runs `npm run lint`, `npm run test`, `npm run typecheck`, and `npm run build`.
- Use focused checks while developing, then run the required gate before calling code work complete.
- `npm run e2e` is deterministic browser coverage with a local fixture provider and local test ports. Use it when the browser, route, Convex state, provider adapter, or persistence loop is affected.
- Provider-backed playtests with Ollama, LM Studio, OpenRouter, Vercel AI Gateway, or a direct hosted provider are optional local/runtime checks, not required hosted CI.
- If a relevant check cannot run, record the exact command, why it could not run, and what risk remains.

## UI / Visual Guidance

- Follow `../../shared/visual-style-guide.md`: utilitarian workbench UI, dark-mode-native surfaces, compact density, clear state, restrained motion, and no generic AI-dashboard decoration.
- The player-facing surface is intentionally narrative-first. Slash commands are allowed only as narrow pre-turn utilities until an Epic explicitly expands them. Avoid MUD-style command lists, room-movement controls, combat UI, HP, inventory, quests, marketplace logic, and broad simulation controls until playtesting proves the need.
- Debug surfaces may be dense and technical, but they must remain readable, local-first, and visually distinct from player-facing story state.
- Prefer product-state visibility over decorative presentation: story feed, canonical world context, NPC profile/fact state, prompt/debug evidence, and reset/playtest controls should be inspectable when relevant.

## Project-Specific Safety Rules

- Convex is the canonical world state. Game Master output is untrusted prose unless the backend validates and stores a state change.
- Persistent mode treats Game Master story generation as plain prose. Structured mutation happens only through the separate post-narration extractor, not as creative JSON embedded in narration.
- Do not let the Game Master directly mutate rooms, exits, inventory, combat state, HP, object state, or arbitrary world facts. NPC facts and actor locations may change only through bounded extractor output plus backend validation.
- Stormbound Chapel and Tutorial are resettable seed Worlds. Reset Session affects the selected Adventure copy; Reset World reseeds local authored demo source data and dependent local rows, so use it only when destructive local playtest behavior is intended.
- Local debug logs and raw request storage can include prompt guidance, player text, model output, hidden NPC knowledge, and other sensitive playtest context. Keep them local/debug-only and out of commits, durable vault docs, and public artifacts.
- Debug NPC and Location editing writes canonical Adventure Convex state. Keep it resettable and local/dev-oriented; do not treat it as a polished public World Builder contract yet.
- Keep provider secrets in ignored `.env*` files, process environment, or platform secret stores. Never print API keys, generated tokens, database URLs, full environment dumps, or provider credentials.
