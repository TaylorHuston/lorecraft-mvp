"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorMessage } from "./debug-formatters";

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
  onError: (message: string | null) => void;
};

type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

export function PlayerCard({ adventureId, player, onError }: PlayerCardProps) {
  const updatePlayerProfile = useMutation(api.world.updatePlayerProfile);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PlayerCardDraft>(() => draftFromPlayer(player));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, []);

  function updateDraft(next: PlayerCardDraft) {
    setDraft(next);
    setSaveStatus("unsaved");
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void save(next);
    }, 700);
  }

  async function save(next: PlayerCardDraft) {
    onError(null);
    setSaveStatus("saving");
    try {
      const result = await updatePlayerProfile({
        adventureId,
        description: next.physicalDescription,
        facts: {
          backstory: next.backstory,
          status: next.status,
        },
      });
      if (!result.ok) {
        onError(result.error ?? "Failed to save Player Card.");
        setSaveStatus("error");
        return false;
      }
      setSaveStatus("saved");
      return true;
    } catch (saveError) {
      onError(errorMessage(saveError));
      setSaveStatus("error");
      return false;
    }
  }

  const hasFilledProfile =
    Boolean(player.profile.physicalDescription.trim()) ||
    Boolean(player.profile.backstory.trim()) ||
    Boolean(player.profile.status.trim());
  const fieldsId = "player-card-fields";

  return (
    <aside
      id="player-card"
      className={`border-b border-zinc-900 bg-zinc-950/40 px-5 py-4 lg:h-[calc(100vh-3rem)] lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-4 ${
        isCollapsed ? "lg:w-16" : ""
      }`}
    >
      <div id="player-card-header" className="flex items-start justify-between gap-3">
        <div id="player-card-title-block" className={isCollapsed ? "lg:sr-only" : "min-w-0"}>
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Player
          </p>
          <h2 id="player-card-name" className="mt-1 truncate text-base font-medium text-zinc-100">
            {player.name}
          </h2>
          <p id="player-card-location" className="mt-1 text-xs leading-5 text-zinc-500">
            {player.locationName}
          </p>
        </div>
        <button
          id="player-card-collapse-toggle"
          type="button"
          aria-expanded={!isCollapsed}
          aria-controls={fieldsId}
          onClick={() => setIsCollapsed((current) => !current)}
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
          title={isCollapsed ? "Expand Player Card" : "Collapse Player Card"}
        >
          <span aria-hidden="true">{isCollapsed ? ">" : "<"}</span>
          <span className="sr-only">{isCollapsed ? "Expand Player Card" : "Collapse Player Card"}</span>
        </button>
      </div>

      {!isCollapsed ? (
        <div id={fieldsId} className="mt-5 space-y-4">
          {!isEditing ? (
            <>
              {hasFilledProfile ? (
                <div id="player-card-profile-summary" className="space-y-4">
                  <PlayerCardReadField
                    id="player-card-physical-description"
                    label="Physical description"
                    value={player.profile.physicalDescription}
                  />
                  <PlayerCardReadField
                    id="player-card-backstory"
                    label="Backstory"
                    value={player.profile.backstory}
                  />
                  <PlayerCardReadField
                    id="player-card-status"
                    label="Status"
                    value={player.profile.status}
                  />
                </div>
              ) : (
                <p id="player-card-empty-profile" className="text-sm leading-6 text-zinc-500">
                  No character details added yet.
                </p>
              )}
              <button
                id="player-card-edit-button"
                type="button"
                onClick={() => setIsEditing(true)}
                className="h-9 rounded-md bg-zinc-900 px-3 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
              >
                Edit
              </button>
            </>
          ) : (
            <div id="player-card-edit-fields" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Edit character</p>
                <span
                  id="player-card-save-status"
                  role="status"
                  aria-live="polite"
                  className="text-xs uppercase text-emerald-300/70"
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
              <button
                id="player-card-done-button"
                type="button"
                onClick={() => {
                  if (saveTimer.current) {
                    clearTimeout(saveTimer.current);
                    saveTimer.current = null;
                    void save(draft);
                  }
                  setIsEditing(false);
                }}
                className="h-9 rounded-md bg-zinc-900 px-3 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
              >
                Done
              </button>
            </div>
          )}
        </div>
      ) : null}
    </aside>
  );
}

function PlayerCardReadField({
  id,
  label,
  value,
}: {
  id: string;
  label: string;
  value: string;
}) {
  if (!value.trim()) {
    return null;
  }

  return (
    <section id={id}>
      <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{value}</p>
    </section>
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
        <span className="text-xs tabular-nums text-zinc-600">{value.length}/1200</span>
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

function saveStatusLabel(status: SaveStatus) {
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
