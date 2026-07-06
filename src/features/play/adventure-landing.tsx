"use client";

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
  onCreateAdventure: (worldId: Id<"worlds">) => void;
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
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
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
        <div id="world-container-loading" className="rounded-md bg-zinc-900/70">
          <p id="adventure-list-loading-state" className="px-4 py-5 text-sm text-zinc-500">
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
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">{world.description}</p>
                  <p className="mt-2 text-xs text-zinc-600">WorldVersion v{world.sourceVersionNumber}</p>
                </div>
                <button
                  id={`create-adventure-${world._id}`}
                  type="button"
                  onClick={() => onCreateAdventure(world._id)}
                  disabled={creatingWorldId !== null || deletingAdventureId !== null}
                  className="w-fit scroll-mt-16 rounded-md bg-amber-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingWorldId === world._id ? "Creating" : "New Adventure"}
                </button>
              </div>
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
            className="mt-4 rounded-md bg-amber-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
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
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-zinc-500">
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
          className="scroll-mt-16 rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
        <button
          id={`delete-adventure-${adventure._id}`}
          type="button"
          onClick={() => onDeleteAdventure(adventure)}
          disabled={deletingAdventureId !== null}
          className="scroll-mt-16 rounded-md border border-rose-900/70 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-950/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deletingAdventureId === adventure._id ? "Deleting" : "Delete"}
        </button>
      </div>
    </article>
  );
}
