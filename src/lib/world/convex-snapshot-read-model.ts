import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { QueryCtx } from "../../../convex/_generated/server";

type LoadedAdventure = {
  adventure: Doc<"adventures">;
  world: Doc<"worlds">;
  worldVersion: Doc<"worldVersions">;
  player: Doc<"actors">;
  room: Doc<"rooms">;
};

export async function loadSnapshotReadModel(
  ctx: QueryCtx,
  args: {
    adventureId: Id<"adventures">;
    loaded: LoadedAdventure;
    includeDebugState: boolean;
  },
) {
  const { adventure, world, worldVersion, player, room } = args.loaded;
  const [
    exits,
    actors,
    objects,
    facts,
    playerFacts,
    events,
    narrations,
    diffs,
    directorCalls,
    turns,
    feed,
    locations,
  ] =
    await Promise.all([
      loadVisibleExits(ctx, args.adventureId, room._id),
      ctx.db
        .query("actors")
        .withIndex("by_adventureId_and_roomId", (q) =>
          q.eq("adventureId", args.adventureId).eq("roomId", room._id),
        )
        .take(20),
      ctx.db
        .query("worldObjects")
        .withIndex("by_adventureId_and_roomId", (q) =>
          q.eq("adventureId", args.adventureId).eq("roomId", room._id),
        )
        .take(30),
      ctx.db
        .query("facts")
        .withIndex("by_adventureId", (q) => q.eq("adventureId", args.adventureId))
        .order("desc")
        .take(80),
      loadPlayerProfileFacts(ctx, args.adventureId, player),
      ctx.db
        .query("events")
        .withIndex("by_adventureId", (q) => q.eq("adventureId", args.adventureId))
        .order("desc")
        .take(30),
      ctx.db
        .query("narrations")
        .withIndex("by_adventureId", (q) => q.eq("adventureId", args.adventureId))
        .order("desc")
        .take(30),
      ctx.db
        .query("stateDiffs")
        .withIndex("by_adventureId", (q) => q.eq("adventureId", args.adventureId))
        .order("desc")
        .take(12),
      ctx.db
        .query("directorCalls")
        .withIndex("by_adventureId", (q) => q.eq("adventureId", args.adventureId))
        .order("desc")
        .take(10),
      loadTurnSummaries(ctx, args.adventureId, 12),
      loadFeed(ctx, args.adventureId, 60),
      loadLocationSummaries(ctx, args.adventureId),
    ]);
  const npcProfiles = await loadCurrentSceneNpcProfiles(
    ctx,
    args.adventureId,
    room,
    actors,
  );

  return {
    adventure: {
      _id: adventure._id,
      name: adventure.name,
      worldId: adventure.worldId,
      worldVersionId: adventure.worldVersionId,
    },
    world: {
      _id: world._id,
      name: world.name,
      description: world.description,
    },
    sourceWorldVersion: {
      _id: worldVersion._id,
      versionNumber: worldVersion.versionNumber,
      name: worldVersion.name,
    },
      player: {
      _id: player._id,
      key: stableActorKey(player),
      name: player.name,
      description: player.description,
      roomId: player.roomId,
      locationName: room.name,
      profile: playerProfileFromFacts(player, playerFacts),
    },
    room: {
      _id: room._id,
      key: room.key,
      name: room.name,
      description: room.description,
    },
    npcProfiles,
    locations,
    exits: exits.map((exit) => ({
      _id: exit._id,
      label: exit.label,
      toRoomName: exit.toRoomName,
    })),
    actors: actors.map((actor) => ({
      _id: actor._id,
      key: stableActorKey(actor),
      name: actor.name,
      description: actor.description,
      role: actor.role,
    })),
    objects: objects
      .filter((object) => object.visible)
      .map((object) => ({
        _id: object._id,
        key: object.key,
        name: object.name,
        description: object.description,
      })),
    facts: args.includeDebugState
      ? facts.map((fact) => ({
          _id: fact._id,
          subjectType: fact.subjectType,
          subjectId: fact.subjectId,
          key: fact.key,
          value: fact.value,
          source: fact.source,
        }))
      : [],
    feed,
    events: events.map((event) => ({
      _id: event._id,
      text: event.text,
      source: event.source,
    })),
    narrations: narrations.map((narration) => ({
      _id: narration._id,
      text: narration.text,
      source: narration.source,
    })),
    diffs: args.includeDebugState
      ? diffs.map((diff) => ({
          _id: diff._id,
          ...(diff.turnId ? { turnId: diff.turnId } : {}),
          source: diff.source,
          operations: diff.operations,
        }))
      : [],
    turns,
    directorCalls: args.includeDebugState
      ? directorCalls.map((call) => ({
          _id: call._id,
          _creationTime: call._creationTime,
          ...(call.turnId ? { turnId: call.turnId } : {}),
          provider: call.provider,
          model: call.model,
          requestSummary: call.requestSummary,
          status: call.status,
          acceptedUpdates: call.acceptedUpdates,
          ignoredUpdates: call.ignoredUpdates,
          ...(call.commandId ? { commandId: call.commandId } : {}),
          ...(call.rawRequest !== undefined ? { rawRequest: call.rawRequest } : {}),
          ...(call.rawResponse !== undefined ? { rawResponse: call.rawResponse } : {}),
          ...(call.parsedResponse !== undefined ? { parsedResponse: call.parsedResponse } : {}),
          ...(call.error !== undefined ? { error: call.error } : {}),
        }))
      : [],
  };
}

async function loadCurrentSceneNpcProfiles(
  ctx: QueryCtx,
  adventureId: Id<"adventures">,
  room: Doc<"rooms">,
  actors: Array<Doc<"actors">>,
) {
  return await Promise.all(
    actors
      .filter((actor) => actor.role === "npc")
      .map(async (actor) => {
        const key = stableActorKey(actor);
        const facts = await ctx.db
          .query("facts")
          .withIndex("by_adventureId_and_subjectId", (q) =>
            q.eq("adventureId", adventureId).eq("subjectId", actorSubjectId(key)),
          )
          .take(20);

        return {
          _id: actor._id,
          key,
          name: actor.name,
          locationKey: room.key,
          locationName: room.name,
          description: actor.description,
          background: stringFactValue(facts, "background"),
          persona: stringFactValue(facts, "persona"),
          voice: stringFactValue(facts, "voice"),
          mood: stringFactValue(facts, "mood"),
          status: stringFactValue(facts, "status"),
          memory: stringFactValue(facts, "memory"),
          knowledge: stringFactValue(facts, "knowledge"),
        };
      }),
  );
}

function playerProfileFromFacts(
  player: Doc<"actors">,
  facts: Array<Doc<"facts">>,
) {
  const actorKey = stableActorKey(player);
  const actorFacts = facts.filter((fact) => fact.subjectId === actorSubjectId(actorKey));
  return {
    physicalDescription: player.description,
    backstory: stringFactValue(actorFacts, "backstory"),
    status: stringFactValue(actorFacts, "status"),
  };
}

async function loadPlayerProfileFacts(
  ctx: QueryCtx,
  adventureId: Id<"adventures">,
  player: Doc<"actors">,
) {
  return await ctx.db
    .query("facts")
    .withIndex("by_adventureId_and_subjectId", (q) =>
      q.eq("adventureId", adventureId).eq("subjectId", actorSubjectId(stableActorKey(player))),
    )
    .take(20);
}

function stringFactValue(facts: Array<Doc<"facts">>, key: string) {
  const fact = facts.find((candidate) => candidate.key === key);
  return typeof fact?.value === "string" ? fact.value : "";
}

export async function loadVisibleExits(
  ctx: QueryCtx,
  adventureId: Id<"adventures">,
  roomId: Id<"rooms">,
) {
  const exits = await ctx.db
    .query("exits")
    .withIndex("by_adventureId_and_fromRoomId", (q) =>
      q.eq("adventureId", adventureId).eq("fromRoomId", roomId),
    )
    .take(20);

  return await Promise.all(
    exits
      .filter((exit) => exit.visible)
      .map(async (exit) => {
        const toRoom = await ctx.db.get(exit.toRoomId);
        return {
          _id: exit._id,
          label: exit.label,
          toRoomKey: toRoom?.key ?? "unknown",
          toRoomName: toRoom?.name ?? "Unknown",
        };
      }),
  );
}

export async function loadFeed(ctx: QueryCtx, adventureId: Id<"adventures">, limit: number) {
  const [commands, narrations, events, utilityMessages] = await Promise.all([
    ctx.db
      .query("commands")
      .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
      .order("desc")
      .take(limit),
    ctx.db
      .query("narrations")
      .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
      .order("desc")
      .take(limit),
    ctx.db
      .query("events")
      .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
      .order("desc")
      .take(limit),
    ctx.db
      .query("utilityMessages")
      .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
      .order("desc")
      .take(limit),
  ]);

  return [
    ...commands.map((command) => ({
      id: `command:${command._id}`,
      kind: "player" as const,
      text: command.input,
      source: "player",
      createdAt: command._creationTime,
      ...(command.turnId ? { turnId: command.turnId } : {}),
      commandId: command._id,
    })),
    ...narrations.map((narration) => ({
      id: `narration:${narration._id}`,
      kind: narration.source === "player" ? ("story" as const) : ("director" as const),
      text: narration.text,
      source: narration.source,
      createdAt: narration._creationTime,
      ...(narration.turnId ? { turnId: narration.turnId } : {}),
      ...(narration.commandId ? { commandId: narration.commandId } : {}),
    })),
    ...events.map((event) => ({
      id: `event:${event._id}`,
      kind: "event" as const,
      text: event.text,
      source: event.source,
      createdAt: event._creationTime,
      ...(event.turnId ? { turnId: event.turnId } : {}),
      ...(event.commandId ? { commandId: event.commandId } : {}),
    })),
    ...utilityMessages.map((message) => ({
      id: `utility:${message._id}`,
      kind: "utility" as const,
      text: message.text,
      source: message.source,
      createdAt: message._creationTime,
      utilityMessageId: message._id,
      command: message.command,
      input: message.input,
      status: message.status,
      ...(message.target ? { target: message.target } : {}),
    })),
  ].sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
}

export async function loadStoryVisibleHistory(
  ctx: QueryCtx,
  adventureId: Id<"adventures">,
  limit: number,
) {
  const narrations = await ctx.db
    .query("narrations")
    .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
    .order("desc")
    .take(limit);
  const turnIds = [...new Set(narrations.flatMap((narration) => (narration.turnId ? [narration.turnId] : [])))];
  const turns = await Promise.all(turnIds.map((turnId) => ctx.db.get(turnId)));
  const successfulTurnIds = new Set(
    turns
      .filter((turn): turn is NonNullable<typeof turn> => turn?.status === "succeeded")
      .map((turn) => turn._id),
  );

  return narrations
    .filter((narration) => narration.source === "seed" || !narration.turnId || successfulTurnIds.has(narration.turnId))
    .map((narration) => ({
      id: `narration:${narration._id}`,
      kind: narration.source === "player" ? ("story" as const) : ("director" as const),
      text: narration.text,
      source: narration.source,
      createdAt: narration._creationTime,
      ...(narration.turnId ? { turnId: narration.turnId } : {}),
      ...(narration.commandId ? { commandId: narration.commandId } : {}),
    }))
    .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
}

export async function loadTranscript(ctx: QueryCtx, adventureId: Id<"adventures">, limit: number) {
  const [commands, narrations] = await Promise.all([
    ctx.db
      .query("commands")
      .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
      .order("desc")
      .take(limit),
    ctx.db
      .query("narrations")
      .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
      .order("desc")
      .take(limit),
  ]);

  return [
    ...commands.map((command) => ({
      id: `command:${command._id}`,
      kind: "player" as const,
      text: command.input,
      source: "player",
      createdAt: command._creationTime,
      ...(command.turnId ? { turnId: command.turnId } : {}),
      commandId: command._id,
    })),
    ...narrations
      .filter((narration) => narration.source !== "seed")
      .map((narration) => ({
        id: `narration:${narration._id}`,
        kind: narration.source === "player" ? ("story" as const) : ("director" as const),
        text: narration.text,
        source: narration.source,
        createdAt: narration._creationTime,
        ...(narration.turnId ? { turnId: narration.turnId } : {}),
        ...(narration.commandId ? { commandId: narration.commandId } : {}),
      })),
  ].sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
}

async function loadLocationSummaries(ctx: QueryCtx, adventureId: Id<"adventures">) {
  const [rooms, actors, objects, exits] = await Promise.all([
    ctx.db
      .query("rooms")
      .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
      .take(100),
    ctx.db
      .query("actors")
      .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
      .take(100),
    ctx.db
      .query("worldObjects")
      .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
      .take(100),
    ctx.db
      .query("exits")
      .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
      .take(100),
  ]);
  const roomsById = new Map(rooms.map((room) => [room._id, room]));

  return rooms.map((room) => ({
    _id: room._id,
    key: room.key,
    name: room.name,
    description: room.description,
    actors: actors
      .filter((actor) => actor.roomId === room._id)
      .map((actor) => ({
        _id: actor._id,
        key: stableActorKey(actor),
        name: actor.name,
        description: actor.description,
        role: actor.role,
      })),
    objects: objects
      .filter((object) => object.roomId === room._id && object.visible)
      .map((object) => ({ key: object.key, name: object.name })),
    exits: exits
      .filter((exit) => exit.fromRoomId === room._id && exit.visible)
      .map((exit) => {
        const toRoom = roomsById.get(exit.toRoomId);
        return {
          label: exit.label,
          toLocationKey: toRoom?.key ?? "unknown",
          toLocationName: toRoom?.name ?? "Unknown",
        };
      }),
  }));
}

async function loadTurnSummaries(ctx: QueryCtx, adventureId: Id<"adventures">, limit: number) {
  const turns = await ctx.db
    .query("turns")
    .withIndex("by_adventureId_and_sequenceNumber", (q) => q.eq("adventureId", adventureId))
    .order("desc")
    .take(limit);

  return await Promise.all(
    turns.map(async (turn) => {
      const [command, narrations, events, stateDiffs, directorCalls] = await Promise.all([
        turn.commandId ? ctx.db.get(turn.commandId) : Promise.resolve(null),
        ctx.db
          .query("narrations")
          .withIndex("by_adventureId_and_turnId", (q) =>
            q.eq("adventureId", adventureId).eq("turnId", turn._id),
          )
          .take(20),
        ctx.db
          .query("events")
          .withIndex("by_adventureId_and_turnId", (q) =>
            q.eq("adventureId", adventureId).eq("turnId", turn._id),
          )
          .take(20),
        ctx.db
          .query("stateDiffs")
          .withIndex("by_adventureId_and_turnId", (q) =>
            q.eq("adventureId", adventureId).eq("turnId", turn._id),
          )
          .take(20),
        ctx.db
          .query("directorCalls")
          .withIndex("by_adventureId_and_turnId", (q) =>
            q.eq("adventureId", adventureId).eq("turnId", turn._id),
          )
          .order("desc")
          .take(1),
      ]);

      return {
        _id: turn._id,
        _creationTime: turn._creationTime,
        sequenceNumber: turn.sequenceNumber,
        actorId: turn.actorId,
        trigger: turn.trigger,
        ...(turn.hiddenGuidance !== undefined ? { hiddenGuidance: turn.hiddenGuidance } : {}),
        status: turn.status,
        narrationCount: narrations.length,
        eventCount: events.length,
        stateDiffCount: stateDiffs.length,
        ...(turn.commandId ? { commandId: turn.commandId } : {}),
        ...(turn.error !== undefined ? { error: turn.error } : {}),
        ...(turn.completedAt !== undefined ? { completedAt: turn.completedAt } : {}),
        ...(command ? { playerInput: command.input } : {}),
        ...(directorCalls[0] ? { directorCallStatus: directorCalls[0].status } : {}),
      };
    }),
  );
}

function stableActorKey(actor: { key?: string; name: string }) {
  return actor.key ?? actor.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function actorSubjectId(actorKey: string) {
  return `actor:${actorKey}`;
}
