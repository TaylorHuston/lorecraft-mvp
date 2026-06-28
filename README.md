# Lorecraft MVP

Experimental Next.js + Convex scaffold for the Lorecraft persistent-world memory spike.

The first goal is not a complete RPG. It is to test whether a small world can remember player-made changes as structured state: rooms, exits, actors, visible objects, facts, events, narrations, and state diffs.

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

## What Is Scaffolded

- `convex/schema.ts` defines the persistent-world tables.
- `convex/world.ts` seeds the Stormbound Chapel world and resolves a few deterministic commands.
- `src/app/world-client.tsx` renders the playtest UI and debug state panel.
- `src/app/providers.tsx` wires the Convex React provider into the App Router root.

Try:

```text
look
go north
go west
talk to Mira
open shutters
break lantern
mark altar with chalk
```

## Current Intent

Keep this repo disposable until the core loop proves itself. Avoid adding combat, HP, inventory, quests, campaign copies, marketplace logic, or polished builder UI before the persistent-world memory loop is validated.
