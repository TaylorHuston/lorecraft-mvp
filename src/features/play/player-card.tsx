"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorMessage } from "./debug-formatters";
import {
  PlayerCardSaveQueue,
  type PlayerCardSaveStatus,
} from "./player-card-save-queue";

export type PlayerCardProfile = {
  physicalDescription: string;
  backstory: string;
  status: string;
};

export type PlayerCardPlayer = {
  _id: Id<"actors">;
  key: string;
  name: string;
  description: string;
  roomId: Id<"rooms">;
  locationName: string;
  profile: PlayerCardProfile;
};

type PlayerCardDraft = {
  physicalDescription: string;
  backstory: string;
  status: string;
};

type PlayerCardProps = {
  adventureId: Id<"adventures">;
  player: PlayerCardPlayer;
  isCollapsed: boolean;
  onError: (message: string | null) => void;
  onCollapseChange: (isCollapsed: boolean) => void;
  onFlushReady: (flush: () => Promise<boolean>) => void;
  onSavePendingChange: (isPending: boolean) => void;
};

export function PlayerCard({
  adventureId,
  player,
  isCollapsed,
  onError,
  onCollapseChange,
  onFlushReady,
  onSavePendingChange,
}: PlayerCardProps) {
  const updatePlayerProfile = useMutation(api.world.updatePlayerProfile);
  const [draft, setDraft] = useState<PlayerCardDraft>(() => draftFromPlayer(player));
  const [saveStatus, setSaveStatus] = useState<PlayerCardSaveStatus>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveHandlers = useRef({ adventureId, onError, updatePlayerProfile });
  const saveQueue = useRef<PlayerCardSaveQueue<PlayerCardDraft> | null>(null);

  useEffect(() => {
    saveHandlers.current = { adventureId, onError, updatePlayerProfile };
    if (!saveQueue.current) {
      saveQueue.current = new PlayerCardSaveQueue<PlayerCardDraft>(async (next) => {
        const handlers = saveHandlers.current;
        handlers.onError(null);
        try {
          const result = await handlers.updatePlayerProfile({
            adventureId: handlers.adventureId,
            description: next.physicalDescription,
            facts: {
              backstory: next.backstory,
              status: next.status,
            },
          });
          if (!result.ok) {
            handlers.onError(result.error ?? "Failed to save Player Card.");
            return false;
          }
          return true;
        } catch (saveError) {
          handlers.onError(errorMessage(saveError));
          return false;
        }
      }, setSaveStatus);
    }
  }, [adventureId, onError, updatePlayerProfile]);

  useEffect(() => {
    onSavePendingChange(saveStatus !== "idle" && saveStatus !== "saved");
  }, [onSavePendingChange, saveStatus]);

  useEffect(() => {
    onFlushReady(async () => await (saveQueue.current?.flush() ?? true));
  }, [onFlushReady]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      onSavePendingChange(false);
    };
  }, [onSavePendingChange]);

  function updateDraft(next: PlayerCardDraft) {
    setDraft(next);
    saveQueue.current?.stage(next);
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void saveQueue.current?.flush();
    }, 700);
  }

  const fieldsId = "player-card-fields";

  return (
    <aside
      id="player-card"
      aria-label="Player Card"
      className={`mx-4 mt-4 rounded-2xl bg-zinc-900/85 py-4 shadow-2xl shadow-black/40 ring-1 ring-zinc-700/60 backdrop-blur lg:mx-auto lg:mt-5 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto ${
        isCollapsed ? "px-3 lg:w-16" : "px-4 lg:w-[calc(100%-2rem)] lg:max-w-72"
      }`}
    >
      <div
        id="player-card-accent"
        className="mb-4 h-1 w-16 rounded-full bg-amber-300/80 shadow-[0_0_18px_rgba(252,211,77,0.28)]"
      />
      <div id="player-card-header" className="flex items-start justify-between gap-3">
        <div id="player-card-title-block" className={isCollapsed ? "lg:sr-only" : "min-w-0"}>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-amber-200/80">
            Player
          </p>
          <h2 id="player-card-name" className="mt-1 truncate text-base font-medium text-zinc-100">
            {player.name}
          </h2>
          <p id="player-card-location" className="mt-1 text-xs leading-5 text-zinc-400">
            {player.locationName}
          </p>
        </div>
        <button
          id="player-card-collapse-toggle"
          type="button"
          aria-expanded={!isCollapsed}
          aria-controls={fieldsId}
          onClick={() => onCollapseChange(!isCollapsed)}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-zinc-950/80 text-zinc-400 shadow-inner shadow-black/40 ring-1 ring-zinc-800 transition hover:bg-zinc-800 hover:text-zinc-100 hover:ring-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
          title={isCollapsed ? "Expand Player Card" : "Collapse Player Card"}
        >
          <span aria-hidden="true">{isCollapsed ? ">" : "<"}</span>
          <span className="sr-only">{isCollapsed ? "Expand Player Card" : "Collapse Player Card"}</span>
        </button>
      </div>

      <div id={fieldsId} hidden={isCollapsed} className="mt-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Character</p>
          <span
            id="player-card-save-status"
            role="status"
            aria-live="polite"
            className={`text-xs uppercase ${saveStatusClassName(saveStatus)}`}
          >
            {saveStatusLabel(saveStatus)}
          </span>
        </div>
        <PlayerCardTextarea
          id="player-card-edit-physical-description"
          label="Physical description"
          value={draft.physicalDescription}
          onChange={(physicalDescription) => updateDraft({ ...draft, physicalDescription })}
        />
        <PlayerCardTextarea
          id="player-card-edit-backstory"
          label="Backstory"
          value={draft.backstory}
          onChange={(backstory) => updateDraft({ ...draft, backstory })}
        />
        <PlayerCardTextarea
          id="player-card-edit-status"
          label="Status"
          value={draft.status}
          onChange={(status) => updateDraft({ ...draft, status })}
        />
      </div>
    </aside>
  );
}

function PlayerCardTextarea({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div id={`${id}-field`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-medium text-zinc-400">
          {label}
        </label>
        <span className="text-xs tabular-nums text-zinc-400">{value.length}/1200</span>
      </div>
      <textarea
        id={id}
        value={value}
        maxLength={1200}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        className="h-24 w-full resize-none overflow-y-auto rounded-md bg-zinc-900 px-3 py-2 text-sm leading-6 text-zinc-200 outline-none ring-1 ring-zinc-800 transition focus:ring-amber-300/70"
      />
    </div>
  );
}

function draftFromPlayer(player: PlayerCardPlayer): PlayerCardDraft {
  return {
    physicalDescription: player.profile.physicalDescription,
    backstory: player.profile.backstory,
    status: player.profile.status,
  };
}

function saveStatusLabel(status: PlayerCardSaveStatus) {
  if (status === "unsaved") {
    return "Unsaved";
  }
  if (status === "saving") {
    return "Saving";
  }
  if (status === "saved") {
    return "Saved";
  }
  if (status === "error") {
    return "Save failed";
  }
  return "Current";
}

function saveStatusClassName(status: PlayerCardSaveStatus) {
  if (status === "error") {
    return "text-red-300";
  }
  if (status === "unsaved") {
    return "text-amber-300";
  }
  if (status === "saving") {
    return "text-zinc-300";
  }
  return "text-emerald-300";
}
