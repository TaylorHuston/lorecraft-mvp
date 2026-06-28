## Branch Policy

- Production branch: `main`.
- Integration branch: `develop`.
- Short-lived work branches: branch from `develop` using one of these prefixes:
  - `change/` for planned product, UX, architecture, or feature changes.
  - `fix/` for defects, regressions, and broken behavior.
  - `misc/` for chores, tooling, documentation-only work, and other low-risk maintenance.
- Reserve `release/` or `hotfix/` branches for later if release management needs them; do not use them by default.
- Merge completed work back into `develop` after review/verification.
- Promote `develop` to `main` only for release or explicit closeout work.
- Documentation-only changes may land directly on `develop`; documentation-only changes to `main` require explicit Taylor approval.
- Do not commit, merge, rebase, push, or rewrite history unless Taylor explicitly asks in the current conversation.
- Keep this repo independent from the surrounding Obsidian vault git history.

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
