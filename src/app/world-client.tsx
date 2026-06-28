"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type DirectorTurnResponse =
  | {
      ok: true;
      narration: string;
      acceptedUpdates: unknown[];
      ignoredUpdates: unknown[];
    }
  | {
      ok: false;
      error: string;
    };

export function WorldClient() {
  const defaultWorldId = useQuery(api.world.getDefaultWorld);
  const seedWorld = useMutation(api.world.seedDemoWorld);
  const resetPlaytestWorld = useMutation(api.world.resetPlaytestWorld);
  const [selectedWorldId, setSelectedWorldId] = useState<Id<"worlds"> | null>(null);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const worldId = selectedWorldId ?? defaultWorldId ?? null;
  const snapshot = useQuery(api.world.getSnapshot, worldId ? { worldId } : "skip");

  async function handleSeed() {
    setError(null);
    const seededWorldId = await seedWorld();
    setSelectedWorldId(seededWorldId);
    setNotice("Stormbound Chapel is ready.");
  }

  async function handleReset() {
    if (!worldId) {
      return;
    }

    setError(null);
    setIsResetting(true);
    try {
      const result = await resetPlaytestWorld({ worldId });
      setNotice(
        `Reset playtest state: cleared ${result.deletedCommands} player turns and restored ${result.restoredFacts} Mira facts.`,
      );
    } catch (resetError) {
      setError(errorMessage(resetError));
    } finally {
      setIsResetting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!worldId || !input.trim() || isSubmitting) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/director/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worldId, input }),
      });
      const result = (await response.json()) as DirectorTurnResponse;

      if (!response.ok || !result.ok) {
        setError(result.ok ? "The Director turn failed." : result.error);
        return;
      }

      setInput("");
      setNotice("Director response persisted.");
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="px-5 py-6 sm:px-8 lg:px-10">
          <header className="border-b border-zinc-800 pb-5">
            <p className="text-sm uppercase tracking-[0.22em] text-cyan-300">Lorecraft MVP</p>
            <h1 className="mt-3 text-3xl font-semibold text-zinc-50 sm:text-5xl">
              Stormbound Chapel
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">
              A narrative Director loop for testing persistent scene memory and Mira&apos;s evolving state.
            </p>
          </header>

          <div className="flex flex-col gap-5 py-6">
            {!worldId ? (
              <div className="flex min-h-[40vh] flex-col items-start justify-center gap-4">
                <p className="max-w-xl text-lg text-zinc-300">
                  Seed the demo world to begin the persistent scene playtest.
                </p>
                <button
                  type="button"
                  onClick={handleSeed}
                  className="border border-cyan-300 bg-cyan-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-cyan-200"
                >
                  Seed Stormbound Chapel
                </button>
              </div>
            ) : snapshot === undefined ? (
              <p className="text-zinc-400">Loading world state...</p>
            ) : snapshot === null ? (
              <div className="space-y-4">
                <p className="text-zinc-300">
                  The selected world is missing required player or room state.
                </p>
                <button
                  type="button"
                  onClick={handleSeed}
                  className="border border-cyan-300 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-zinc-900"
                >
                  Seed or reload demo world
                </button>
              </div>
            ) : (
              <>
                <section className="flex min-h-[24rem] flex-col gap-3 border border-zinc-800 bg-zinc-900/60 p-4">
                  {snapshot.feed.length > 0 ? (
                    snapshot.feed.map((entry) => (
                      <article
                        key={entry.id}
                        className={`max-w-3xl border px-4 py-3 ${feedEntryClass(entry.kind)}`}
                      >
                        <p className="text-xs uppercase tracking-[0.18em] opacity-70">
                          {feedEntryLabel(entry.kind)}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{entry.text}</p>
                      </article>
                    ))
                  ) : (
                    <div className="flex flex-1 items-center justify-center text-center text-zinc-500">
                      <p>The story feed is empty. Describe what Taylor does, says, or notices.</p>
                    </div>
                  )}
                </section>

                <form onSubmit={handleSubmit} className="border border-zinc-800 bg-zinc-900 p-4">
                  <label htmlFor="director-input" className="text-sm font-medium text-zinc-300">
                    Narrative input
                  </label>
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                    <textarea
                      id="director-input"
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder="I ask Mira what she knows about the storm."
                      rows={3}
                      className="min-h-24 flex-1 resize-y border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !input.trim()}
                      className="min-h-11 border border-cyan-300 bg-cyan-300 px-4 text-sm font-medium text-zinc-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60 sm:self-stretch"
                    >
                      {isSubmitting ? "Director thinking" : "Send"}
                    </button>
                  </div>
                  {notice ? <p className="mt-3 text-sm text-cyan-200">{notice}</p> : null}
                  {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
                </form>
              </>
            )}
          </div>
        </section>

        <aside className="border-t border-zinc-800 bg-zinc-900 px-5 py-6 lg:border-l lg:border-t-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:flex-col">
            <div>
              <h2 className="text-lg font-semibold text-zinc-50">Debug panel</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Hidden world state, Director calls, validation decisions, events, and state diffs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSeed}
                className="border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Ensure seed
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={!worldId || isResetting}
                className="border border-rose-400 px-3 py-2 text-sm text-rose-200 hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResetting ? "Resetting" : "Rough reset"}
              </button>
            </div>
          </div>

          {snapshot ? (
            <div className="mt-6 space-y-6">
              <DebugList
                title="Scene"
                items={[
                  `${snapshot.world.name} / ${snapshot.room.name}`,
                  `Player: ${snapshot.player.name} (${snapshot.player.key})`,
                  `Actors: ${snapshot.actors.map((actor) => `${actor.name} (${actor.key})`).join(", ")}`,
                  `Objects: ${snapshot.objects.map((object) => object.name).join(", ") || "none"}`,
                ]}
              />
              <DebugList
                title="Hidden facts"
                items={snapshot.facts.map(
                  (fact) => `${fact.subjectId}.${fact.key} = ${String(fact.value)} (${fact.source})`,
                )}
              />
              <DebugList
                title="NPC state changes"
                items={directorUpdateItems(snapshot.directorCalls)}
              />
              <DebugList
                title="Events"
                items={snapshot.events.map((event) => `${event.text} (${event.source})`)}
              />
              <DebugList
                title="Narrations"
                items={snapshot.narrations.map(
                  (narration) => `${narration.text} (${narration.source})`,
                )}
              />
              <DebugJson title="Director calls" value={snapshot.directorCalls} />
              <DebugJson title="State diffs" value={snapshot.diffs} />
            </div>
          ) : (
            <p className="mt-6 text-sm text-zinc-500">Seed a world to inspect state.</p>
          )}
        </aside>
      </div>
    </main>
  );
}

function feedEntryClass(kind: "player" | "director" | "event") {
  if (kind === "player") {
    return "self-end border-cyan-500/40 bg-cyan-950/30 text-cyan-50";
  }
  if (kind === "event") {
    return "self-center border-zinc-700 bg-zinc-950/70 text-zinc-300";
  }
  return "self-start border-emerald-500/40 bg-emerald-950/20 text-emerald-50";
}

function feedEntryLabel(kind: "player" | "director" | "event") {
  if (kind === "player") {
    return "Taylor";
  }
  if (kind === "event") {
    return "World event";
  }
  return "Director";
}

function DebugList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-400">{title}</h3>
      <ul className="mt-3 space-y-2 text-xs leading-5 text-zinc-300">
        {items.length > 0 ? (
          items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)
        ) : (
          <li className="text-zinc-500">None yet.</li>
        )}
      </ul>
    </div>
  );
}

function DebugJson({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-400">{title}</h3>
      <pre className="mt-3 max-h-80 overflow-auto border border-zinc-800 bg-zinc-950 p-3 text-xs leading-5 text-zinc-300">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function directorUpdateItems(directorCalls: unknown[]) {
  return directorCalls.flatMap((call) => {
    if (!isRecord(call) || !Array.isArray(call.acceptedUpdates)) {
      return [];
    }

    return call.acceptedUpdates.flatMap((update) => {
      if (!isRecord(update) || !Array.isArray(update.changes)) {
        return [];
      }

      const actorName =
        typeof update.actorName === "string"
          ? update.actorName
          : typeof update.actorKey === "string"
            ? update.actorKey
            : "Unknown actor";
      const reason = typeof update.reason === "string" ? ` Reason: ${update.reason}` : "";
      const changes = update.changes
        .filter(isRecord)
        .map((change) => {
          const key = typeof change.key === "string" ? change.key : "unknown";
          const value = typeof change.value === "string" ? change.value : JSON.stringify(change.value);
          return `${key} -> ${value}`;
        })
        .join("; ");

      return changes ? [`${actorName}: ${changes}.${reason}`] : [];
    });
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request failed.";
}
