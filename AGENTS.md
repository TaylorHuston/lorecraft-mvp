# Lorecraft MVP Workspace Guide

This repository is the implementation workspace for the Lorecraft MVP prototype.

## Branch Policy

Use the default branch policy from `../../developer-guide.md`.

- Do not commit, merge, rebase, push, or rewrite history unless Taylor explicitly asks in the current conversation.
- Keep this repo independent from the surrounding Obsidian vault git history.

## Local Development

- For the foreseeable future, launch Lorecraft with `npm run dev:debug` instead of `npm run dev`. This must enable all current Game Master debug flags: local JSONL logs, raw provider request logging, raw LLM response logging, and persisted raw request storage.

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
