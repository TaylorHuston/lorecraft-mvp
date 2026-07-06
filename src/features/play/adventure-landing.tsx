"use client";

import type { Id } from "../../../convex/_generated/dataModel";
import { formatAdventureTimestamp } from "./debug-formatters";

export type AdventureListItem = {
  _id: Id<"adventures">;
  name: string;
  worldName: string;
  sourceVersionNumber: number;
  currentLocationName?: string;
  turnCount: number;
  lastPlayedAt: number;
};

type AdventureLandingProps = {
  adventures: AdventureListItem[];
  isLoading: boolean;
  isCreatingAdventure: boolean;
  deletingAdventureId: Id<"adventures"> | null;
  error: string | null;
  notice: string | null;
  onCreateAdventure: () => void;
  onSelectAdventure: (adventureId: Id<"adventures">) => void;
  onDeleteAdventure: (adventure: AdventureListItem) => void;
};

export function AdventureLanding({
  adventures,
  isLoading,
  isCreatingAdventure,
  deletingAdventureId,
  error,
  notice,
  onCreateAdventure,
  onSelectAdventure,
  onDeleteAdventure,
}: AdventureLandingProps) {
  const worldName = adventures[0]?.worldName ?? "Stormbound Chapel";

  return (
    <section
      id="adventure-landing"
      className="mx-auto flex min-h-0 w-full max-w-[56rem] flex-1 flex-col justify-center px-5 py-8 sm:px-8"
    >
      <div id="adventure-landing-header" className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
            World
          </p>
          <h1 id="world-container-title" className="mt-2 text-xl font-semibold text-zinc-100">
            {worldName}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
            Continue a saved Adventure or start a fresh copy of the current WorldVersion.
          </p>
        </div>
        <div id="adventure-landing-actions" className="flex flex-wrap gap-2">
          <button
            id="create-adventure-button"
            type="button"
            onClick={onCreateAdventure}
            disabled={isCreatingAdventure || deletingAdventureId !== null}
            className="rounded-md bg-amber-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreatingAdventure ? "Creating" : "New Adventure"}
          </button>
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

      <div id="world-container" className="rounded-md bg-zinc-900/70">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-200">Adventures</h2>
          <span className="text-xs text-zinc-500">{adventures.length}</span>
        </div>
        {isLoading ? (
          <p id="adventure-list-loading-state" className="px-4 py-5 text-sm text-zinc-500">
            Loading Adventures...
          </p>
        ) : adventures.length > 0 ? (
          <div id="adventure-list" className="divide-y divide-zinc-800">
            {adventures.map((adventure) => (
              <article
                id={`adventure-card-${adventure._id}`}
                key={adventure._id}
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
                    className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continue
                  </button>
                  <button
                    id={`delete-adventure-${adventure._id}`}
                    type="button"
                    onClick={() => onDeleteAdventure(adventure)}
                    disabled={deletingAdventureId !== null}
                    className="rounded-md border border-rose-900/70 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-950/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingAdventureId === adventure._id ? "Deleting" : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div id="adventure-list-empty-state" className="px-4 py-5">
            <p className="text-sm leading-6 text-zinc-400">No Adventures yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}
