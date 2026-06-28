"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function WorldClient() {
  const defaultWorldId = useQuery(api.world.getDefaultWorld);
  const seedWorld = useMutation(api.world.seedDemoWorld);
  const submitCommand = useMutation(api.world.submitCommand);
  const [selectedWorldId, setSelectedWorldId] = useState<Id<"worlds"> | null>(null);
  const [command, setCommand] = useState("");
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const worldId = selectedWorldId ?? defaultWorldId ?? null;
  const snapshot = useQuery(api.world.getSnapshot, worldId ? { worldId } : "skip");

  const suggestedCommands = useMemo(
    () => ["look", "go north", "go west", "talk to Mira", "open shutters", "break lantern", "mark altar with chalk"],
    [],
  );

  async function handleSeed() {
    const seededWorldId = await seedWorld();
    setSelectedWorldId(seededWorldId);
    setLastResult("Seeded Stormbound Chapel.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!worldId || !command.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitCommand({ worldId, input: command });
      setLastResult(result.narration);
      setCommand("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="flex min-h-[70vh] flex-col px-5 py-6 sm:px-8 lg:px-10">
          <header className="border-b border-stone-800 pb-5">
            <p className="text-sm uppercase tracking-[0.24em] text-amber-300">Lorecraft MVP</p>
            <h1 className="mt-3 text-3xl font-semibold text-stone-50 sm:text-5xl">
              Persistent world memory spike
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-stone-300">
              A Next.js 16 and Convex scaffold for testing whether a small world can remember player-made changes as structured state.
            </p>
          </header>

          <div className="flex flex-1 flex-col gap-5 py-6">
            {!worldId ? (
              <div className="flex flex-1 flex-col items-start justify-center gap-4">
                <p className="max-w-xl text-lg text-stone-300">
                  Seed the demo world to create rooms, exits, actors, objects, facts, events, and state-diff tables.
                </p>
                <button
                  type="button"
                  onClick={handleSeed}
                  className="border border-amber-300 bg-amber-300 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-amber-200"
                >
                  Seed Stormbound Chapel
                </button>
              </div>
            ) : snapshot === undefined ? (
              <p className="text-stone-400">Loading world state...</p>
            ) : snapshot === null ? (
              <div className="space-y-4">
                <p className="text-stone-300">The selected world is missing required player or room state.</p>
                <button
                  type="button"
                  onClick={handleSeed}
                  className="border border-amber-300 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-stone-900"
                >
                  Re-seed demo world
                </button>
              </div>
            ) : (
              <>
                <article className="border border-stone-800 bg-stone-900/70 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm text-stone-400">Current location</p>
                      <h2 className="text-2xl font-semibold text-stone-50">{snapshot.room.name}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleSeed}
                      className="w-fit border border-stone-700 px-3 py-2 text-sm text-stone-300 hover:bg-stone-800"
                    >
                      Ensure seed world exists
                    </button>
                  </div>
                  <p className="mt-4 max-w-3xl text-stone-300">{snapshot.room.description}</p>
                </article>

                <section className="grid gap-4 md:grid-cols-3">
                  <InfoPanel title="Exits" empty="No visible exits.">
                    {snapshot.exits.map((exit) => (
                      <li key={exit._id}>
                        <span className="text-amber-200">{exit.label}</span>
                        <span className="text-stone-500"> to </span>
                        {exit.toRoomName}
                      </li>
                    ))}
                  </InfoPanel>
                  <InfoPanel title="Actors" empty="No actors here.">
                    {snapshot.actors.map((actor) => (
                      <li key={actor._id}>
                        <span className="text-amber-200">{actor.name}</span>
                        <span className="text-stone-500"> - </span>
                        {actor.description}
                      </li>
                    ))}
                  </InfoPanel>
                  <InfoPanel title="Objects" empty="No visible objects.">
                    {snapshot.objects.map((object) => (
                      <li key={object._id}>
                        <span className="text-amber-200">{object.name}</span>
                        <span className="text-stone-500"> - </span>
                        {object.description}
                      </li>
                    ))}
                  </InfoPanel>
                </section>

                <form onSubmit={handleSubmit} className="mt-auto border border-stone-800 bg-stone-900 p-4">
                  <label htmlFor="command" className="text-sm font-medium text-stone-300">
                    Command
                  </label>
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                    <input
                      id="command"
                      value={command}
                      onChange={(event) => setCommand(event.target.value)}
                      placeholder="look, go north, talk to Mira, open shutters..."
                      className="min-h-11 flex-1 border border-stone-700 bg-stone-950 px-3 text-stone-100 outline-none focus:border-amber-300"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="min-h-11 border border-amber-300 bg-amber-300 px-4 text-sm font-medium text-stone-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? "Resolving" : "Submit"}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggestedCommands.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setCommand(suggestion)}
                        className="border border-stone-700 px-2 py-1 text-xs text-stone-300 hover:border-stone-500 hover:bg-stone-800"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </form>

                {lastResult ? (
                  <p className="border-l-2 border-amber-300 pl-4 text-stone-200">{lastResult}</p>
                ) : null}
              </>
            )}
          </div>
        </section>

        <aside className="border-t border-stone-800 bg-stone-900 px-5 py-6 lg:border-l lg:border-t-0">
          <h2 className="text-lg font-semibold text-stone-50">Debug state</h2>
          <p className="mt-2 text-sm leading-6 text-stone-400">
            This panel is intentionally visible for the spike. It shows facts, events, narrations, and state diffs as the world changes.
          </p>

          {snapshot ? (
            <div className="mt-6 space-y-6">
              <DebugList title="Facts" items={snapshot.facts.map((fact) => `${fact.subjectId}.${fact.key} = ${String(fact.value)} (${fact.source})`)} />
              <DebugList title="Recent events" items={snapshot.events.map((event) => `${event.text} (${event.source})`)} />
              <DebugList title="Narrations" items={snapshot.narrations.map((narration) => `${narration.text} (${narration.source})`)} />
              <div>
                <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-stone-400">State diffs</h3>
                <pre className="mt-3 max-h-72 overflow-auto border border-stone-800 bg-stone-950 p-3 text-xs leading-5 text-stone-300">
                  {JSON.stringify(snapshot.diffs, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-stone-500">Seed a world to inspect state.</p>
          )}
        </aside>
      </div>
    </main>
  );
}

function InfoPanel({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <div className="border border-stone-800 bg-stone-900/60 p-4">
      <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-stone-400">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-300">
        {hasChildren ? children : <li className="text-stone-500">{empty}</li>}
      </ul>
    </div>
  );
}

function DebugList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-stone-400">{title}</h3>
      <ul className="mt-3 space-y-2 text-xs leading-5 text-stone-300">
        {items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li className="text-stone-500">None yet.</li>}
      </ul>
    </div>
  );
}
