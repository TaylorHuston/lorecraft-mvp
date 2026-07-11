export type RoomInfoRoom = {
  name: string;
  description: string;
};

export type RoomInfoActor = {
  name: string;
  role: string;
};

type RoomInfoCardProps = {
  room: RoomInfoRoom;
  actors: RoomInfoActor[];
};

export function RoomInfoCard({ room, actors }: RoomInfoCardProps) {
  const npcNames = roomInfoNpcList(actors);

  return (
    <aside
      id="room-info-card"
      aria-labelledby="room-info-card-title"
      className="mx-4 mb-4 rounded-2xl bg-zinc-900/85 px-4 py-4 shadow-2xl shadow-black/40 ring-1 ring-zinc-700/60 backdrop-blur lg:mx-auto lg:mt-5 lg:max-h-[calc(100vh-6rem)] lg:w-[calc(100%-2rem)] lg:max-w-72 lg:overflow-y-auto"
    >
      <div
        id="room-info-card-accent"
        className="mb-4 h-1 w-16 rounded-full bg-sky-300/70 shadow-[0_0_18px_rgba(125,211,252,0.22)]"
      />
      <div id="room-info-card-header" className="min-w-0">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sky-200/75">
          Room
        </p>
        <h2 id="room-info-card-title" className="mt-1 text-base font-medium text-zinc-100">
          {room.name}
        </h2>
      </div>

      <div id="room-info-card-body" className="mt-5 space-y-5">
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
          {npcNames.length > 0 ? (
            <ul id="room-info-npc-list" className="mt-3 space-y-2">
              {npcNames.map((name, index) => (
                <li
                  key={`${name}-${index}`}
                  className="rounded-lg bg-zinc-950/50 px-3 py-2 text-sm leading-5 text-zinc-200 ring-1 ring-zinc-800/80"
                >
                  {name}
                </li>
              ))}
            </ul>
          ) : (
            <p id="room-info-npc-empty" className="mt-3 text-sm leading-6 text-zinc-400">
              No one else is here.
            </p>
          )}
        </section>
      </div>
    </aside>
  );
}

export function roomInfoNpcList(actors: RoomInfoActor[]) {
  return actors.filter((actor) => actor.role === "npc").map((actor) => actor.name);
}
