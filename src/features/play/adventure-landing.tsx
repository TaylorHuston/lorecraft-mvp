"use client";

import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatAdventureTimestamp } from "./debug-formatters";

export type AdventureListItem = {
  worldId: Id<"worlds">;
  _id: Id<"adventures">;
  name: string;
  worldName: string;
  sourceVersionNumber: number;
  currentLocationName?: string;
  turnCount: number;
  lastPlayedAt: number;
};

export type WorldContainerItem = {
  _id: Id<"worlds">;
  name: string;
  description: string;
  sourceVersionNumber: number;
  adventures: AdventureListItem[];
};

type AdventureLandingProps = {
  worlds: WorldContainerItem[];
  isLoading: boolean;
  isSeeding: boolean;
  creatingWorldId: Id<"worlds"> | null;
  deletingAdventureId: Id<"adventures"> | null;
  error: string | null;
  notice: string | null;
  onSeedWorld: () => void;
  onCreateAdventure: (worldId: Id<"worlds">, playerName: string) => void;
  onSelectAdventure: (adventureId: Id<"adventures">) => void;
  onDeleteAdventure: (adventure: AdventureListItem) => void;
};

export function AdventureLanding({
  worlds,
  isLoading,
  isSeeding,
  creatingWorldId,
  deletingAdventureId,
  error,
  notice,
  onSeedWorld,
  onCreateAdventure,
  onSelectAdventure,
  onDeleteAdventure,
}: AdventureLandingProps) {
  const [pendingWorldId, setPendingWorldId] = useState<Id<"worlds"> | null>(null);
  const [playerName, setPlayerName] = useState("");

  function cancelCreateAdventure() {
    setPendingWorldId(null);
    setPlayerName("");
  }

  return (
    <section
      id="adventure-landing"
      className="mx-auto flex min-h-0 w-full max-w-[56rem] flex-1 flex-col justify-start px-5 py-8 sm:px-8"
    >
      <div id="adventure-landing-header" className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
            World
          </p>
          <h1 id="world-container-title" className="mt-2 text-xl font-semibold text-zinc-100">
            Lorecraft Worlds
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
            Continue a saved Adventure or start a fresh copy of the current WorldVersion.
          </p>
        </div>
      </div>

      {error ? (
        <p id="adventure-landing-error" role="alert" className="mb-4 text-sm text-rose-300">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p id="adventure-landing-notice" className="mb-4 text-sm text-emerald-300/80">
          {notice}
        </p>
      ) : null}

      {isLoading ? (
        <div id="world-container-loading" className="rounded-md bg-zinc-900/70 motion-safe:animate-pulse">
          <p id="adventure-list-loading-state" role="status" className="px-4 py-5 text-sm text-zinc-400">
            Loading Adventures...
          </p>
        </div>
      ) : worlds.length > 0 ? (
        <div id="world-container-list" className="space-y-5">
          {worlds.map((world) => (
            <section id={`world-container-${world._id}`} key={world._id} className="scroll-mt-16 rounded-md bg-zinc-900/70">
              <div className="flex flex-col gap-3 border-b border-zinc-800 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-medium text-zinc-100">{world.name}</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">{world.description}</p>
                  <p className="mt-2 text-xs text-zinc-500">WorldVersion v{world.sourceVersionNumber}</p>
                </div>
                <button
                  id={`create-adventure-${world._id}`}
                  type="button"
                  onClick={() => {
                    setPendingWorldId(world._id);
                    setPlayerName("");
                  }}
                  disabled={creatingWorldId !== null || deletingAdventureId !== null}
                  className="min-h-11 w-fit scroll-mt-16 rounded-md bg-amber-300 px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingWorldId === world._id ? "Creating" : "New Adventure"}
                </button>
              </div>
              {pendingWorldId === world._id ? (
                <form
                  id={`create-adventure-form-${world._id}`}
                  className="border-b border-zinc-800 px-4 py-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const trimmedName = playerName.trim();
                    if (!trimmedName) {
                      return;
                    }
                    onCreateAdventure(world._id, trimmedName);
                  }}
                >
                  <label
                    htmlFor={`create-adventure-player-name-${world._id}`}
                    className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500"
                  >
                    Player name
                  </label>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      id={`create-adventure-player-name-${world._id}`}
                      value={playerName}
                      maxLength={80}
                      autoFocus
                      onChange={(event) => setPlayerName(event.target.value)}
                      className="min-h-11 flex-1 rounded-md bg-zinc-950 px-3 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 transition placeholder:text-zinc-600 focus:ring-amber-300/70 sm:text-sm"
                      placeholder="Character name"
                    />
                    <div className="flex gap-2">
                      <button
                        id={`confirm-create-adventure-${world._id}`}
                        type="submit"
                        disabled={!playerName.trim() || creatingWorldId !== null || deletingAdventureId !== null}
                        className="min-h-11 rounded-md bg-amber-300 px-4 text-sm font-medium text-zinc-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Create
                      </button>
                      <button
                        id={`cancel-create-adventure-${world._id}`}
                        type="button"
                        onClick={cancelCreateAdventure}
                        disabled={creatingWorldId !== null}
                        className="min-h-11 rounded-md bg-zinc-800 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              ) : null}
              {world.adventures.length > 0 ? (
                <div id={`adventure-list-${world._id}`} className="divide-y divide-zinc-800">
                  {world.adventures.map((adventure) => (
                    <AdventureRow
                      key={adventure._id}
                      adventure={adventure}
                      deletingAdventureId={deletingAdventureId}
                      onSelectAdventure={onSelectAdventure}
                      onDeleteAdventure={onDeleteAdventure}
                    />
                  ))}
                </div>
              ) : (
                <div id={`adventure-list-empty-${world._id}`} className="px-4 py-5">
                  <p className="text-sm leading-6 text-zinc-400">No Adventures yet.</p>
                </div>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div id="world-container-empty-state" className="rounded-md bg-zinc-900/70 px-4 py-5">
          <p className="text-sm leading-6 text-zinc-400">
            Seed the demo world to begin.
          </p>
          <button
            id="seed-world-button"
            type="button"
            onClick={onSeedWorld}
            disabled={isSeeding || creatingWorldId !== null || deletingAdventureId !== null}
            className="mt-4 min-h-11 rounded-md bg-amber-300 px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSeeding ? "Seeding" : "Seed Demo World"}
          </button>
        </div>
      )}
    </section>
  );
}

function AdventureRow({
  adventure,
  deletingAdventureId,
  onSelectAdventure,
  onDeleteAdventure,
}: {
  adventure: AdventureListItem;
  deletingAdventureId: Id<"adventures"> | null;
  onSelectAdventure: (adventureId: Id<"adventures">) => void;
  onDeleteAdventure: (adventure: AdventureListItem) => void;
}) {
  return (
    <article
      id={`adventure-card-${adventure._id}`}
      className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <div className="min-w-0">
        <h2 className="truncate text-base font-medium text-zinc-100">{adventure.name}</h2>
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-zinc-400">
          <div>
            <dt className="sr-only">Turns</dt>
            <dd>{adventure.turnCount} turns</dd>
          </div>
          <div>
            <dt className="sr-only">Last played</dt>
            <dd>{formatAdventureTimestamp(adventure.lastPlayedAt)}</dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <button
          id={`continue-adventure-${adventure._id}`}
          type="button"
          onClick={() => onSelectAdventure(adventure._id)}
          disabled={deletingAdventureId === adventure._id}
        className="min-h-11 scroll-mt-16 rounded-md border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
        <button
          id={`delete-adventure-${adventure._id}`}
          type="button"
          onClick={() => onDeleteAdventure(adventure)}
          disabled={deletingAdventureId !== null}
          className="min-h-11 scroll-mt-16 rounded-md border border-rose-900/70 px-4 text-sm font-medium text-rose-200 transition-colors hover:bg-rose-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deletingAdventureId === adventure._id ? "Deleting" : "Delete"}
        </button>
      </div>
    </article>
  );
}
