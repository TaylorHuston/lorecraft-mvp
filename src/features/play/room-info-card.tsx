"use client";

import { useState } from "react";
import { PaneCollapseIcon } from "./pane-collapse-icon";

export type RoomInfoRoom = {
  key: string;
  name: string;
  description: string;
};

export type RoomInfoActor = {
  key: string;
  name: string;
  description: string;
  role: string;
  locationName?: string;
  facts?: Array<{
    key: string;
    value: string | number | boolean | null;
  }>;
};

type RoomInfoCardProps = {
  room: RoomInfoRoom;
  actors: RoomInfoActor[];
  isCollapsed: boolean;
  onCollapseChange: (isCollapsed: boolean) => void;
};

export function RoomInfoCard({
  room,
  actors,
  isCollapsed,
  onCollapseChange,
}: RoomInfoCardProps) {
  const npcs = roomInfoNpcList(actors);
  const [selection, setSelection] = useState<{ roomKey: string; npcKey: string } | null>(null);
  const selectedNpc = selectedRoomNpc(selection, room.key, npcs);
  const bodyId = "room-info-card-body";

  return (
    <aside
      id="room-info-card"
      aria-labelledby="room-info-card-title"
      className={`mx-4 mb-4 self-start rounded-sm border-2 border-zinc-700 bg-transparent py-4 lg:m-0 lg:h-full lg:max-h-none lg:max-w-none lg:self-stretch lg:justify-self-end lg:overflow-y-auto ${
        isCollapsed ? "px-3 lg:w-20" : "px-4 lg:w-full"
      }`}
    >
      <div
        id="room-info-card-toolbar"
        className={`mb-2 flex h-11 items-center ${selectedNpc ? "justify-between" : "justify-end"}`}
      >
        {selectedNpc ? (
          <button
            id="room-info-npc-back-button"
            type="button"
            onClick={() => setSelection(null)}
            className="flex min-h-11 items-center gap-2 rounded-sm px-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80"
          >
            <PaneCollapseIcon direction="left" />
            <span>Back to room</span>
          </button>
        ) : null}
        <button
          id="room-info-collapse-toggle"
          type="button"
          aria-expanded={!isCollapsed}
          aria-controls={bodyId}
          onClick={() => onCollapseChange(!isCollapsed)}
          className="group flex size-11 shrink-0 items-center justify-end rounded-sm text-zinc-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80"
          title={isCollapsed ? "Expand Room Info" : "Collapse Room Info"}
        >
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-sm border-2 border-zinc-700 bg-transparent transition-colors group-hover:border-zinc-500 group-hover:bg-zinc-900 group-hover:text-zinc-100"
          >
            <PaneCollapseIcon direction={isCollapsed ? "left" : "right"} />
          </span>
          <span className="sr-only">{isCollapsed ? "Expand Room Info" : "Collapse Room Info"}</span>
        </button>
      </div>
      <div
        id="room-info-card-accent"
        className={`mb-4 h-1 rounded-full bg-sky-300/70 shadow-[0_0_18px_rgba(125,211,252,0.22)] ${isCollapsed ? "w-full" : "w-16"}`}
      />
      <div id="room-info-card-header">
        <div className={isCollapsed ? "lg:sr-only" : "min-w-0"}>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sky-200/75">
            {selectedNpc ? "NPC" : "Room"}
          </p>
          <h2 id="room-info-card-title" className="mt-1 text-base font-medium text-zinc-100">
            {selectedNpc?.name ?? room.name}
          </h2>
        </div>
      </div>

      <div id={bodyId} hidden={isCollapsed} className="mt-5 space-y-5">
        {selectedNpc ? (
          <NpcInfoView npc={selectedNpc} />
        ) : (
          <RoomInfoView
            room={room}
            npcs={npcs}
            onSelectNpc={(npcKey) => setSelection({ roomKey: room.key, npcKey })}
          />
        )}
      </div>
    </aside>
  );
}

function RoomInfoView({
  room,
  npcs,
  onSelectNpc,
}: {
  room: RoomInfoRoom;
  npcs: RoomInfoActor[];
  onSelectNpc: (npcKey: string) => void;
}) {
  return (
    <>
      <section id="room-info-description" aria-labelledby="room-info-description-title">
        <h3
          id="room-info-description-title"
          className="text-xs uppercase tracking-[0.14em] text-zinc-400"
        >
          Description
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-300">{room.description}</p>
      </section>

      <section id="room-info-npcs" aria-labelledby="room-info-npcs-title">
        <h3 id="room-info-npcs-title" className="text-xs uppercase tracking-[0.14em] text-zinc-400">
          NPCs
        </h3>
        {npcs.length > 0 ? (
          <ul id="room-info-npc-list" className="mt-3 space-y-2">
            {npcs.map((npc) => (
              <li key={npc.key}>
                <button
                  id={`room-info-npc-${npc.key}`}
                  type="button"
                  onClick={() => onSelectNpc(npc.key)}
                  className="min-h-11 w-full rounded-sm border border-zinc-700 bg-transparent px-3 py-2 text-left text-sm leading-5 text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80"
                >
                  {npc.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p id="room-info-npc-empty" className="mt-3 text-sm leading-6 text-zinc-400">
            No one else is here.
          </p>
        )}
      </section>
    </>
  );
}

function NpcInfoView({ npc }: { npc: RoomInfoActor }) {
  return (
    <div id={`room-info-npc-profile-${npc.key}`}>
      <section aria-labelledby="room-info-npc-description-title">
        <h3
          id="room-info-npc-description-title"
          className="text-xs uppercase tracking-[0.14em] text-zinc-400"
        >
          Description
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          {npc.description || "No description is available."}
        </p>
      </section>
      <section className="mt-5" aria-labelledby="room-info-npc-fields-title">
        <h3
          id="room-info-npc-fields-title"
          className="text-xs uppercase tracking-[0.14em] text-zinc-400"
        >
          Details
        </h3>
        <dl className="mt-3 space-y-4">
          <NpcReadOnlyField label="Key" value={npc.key} />
          <NpcReadOnlyField label="Location" value={npc.locationName ?? "Unknown"} />
          {(npc.facts ?? []).map((fact) => (
            <NpcReadOnlyField key={fact.key} label={titleFromFactKey(fact.key)} value={fact.value} />
          ))}
        </dl>
      </section>
    </div>
  );
}

function NpcReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
        {value === null || value === "" ? "Not set" : String(value)}
      </dd>
    </div>
  );
}

function titleFromFactKey(key: string) {
  return key
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function roomInfoNpcList(actors: RoomInfoActor[]) {
  return actors.filter((actor) => actor.role === "npc");
}

export function selectedRoomNpc(
  selection: { roomKey: string; npcKey: string } | null,
  roomKey: string,
  npcs: RoomInfoActor[],
) {
  return selection?.roomKey === roomKey
    ? (npcs.find((npc) => npc.key === selection.npcKey) ?? null)
    : null;
}
