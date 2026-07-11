import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { QueryCtx } from "../../../convex/_generated/server";
import { PLAYER_KEY } from "./stormbound-baseline";
import {
  loadFeed,
  loadStoryVisibleHistory,
  loadTranscript,
  loadVisibleExits,
} from "./convex-snapshot-read-model";

type LoadedAdventure = {
  adventure: Doc<"adventures">;
  world: Doc<"worlds">;
  worldVersion: Doc<"worldVersions">;
  player: Doc<"actors">;
  room: Doc<"rooms">;
};

export async function loadDirectorContextReadModel(
  ctx: QueryCtx,
  args: {
    adventureId: Id<"adventures">;
    loaded: LoadedAdventure;
  },
) {
  const { adventure, world, worldVersion, player, room } = args.loaded;
  const [exits, actors, objects, facts, playerFacts, recentFeed, storyVisibleHistory, allRooms] = await Promise.all([
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
      .take(100),
    loadPlayerProfileFacts(ctx, args.adventureId, player),
    loadFeed(ctx, args.adventureId, 20),
    loadStoryVisibleHistory(ctx, args.adventureId, 20),
    ctx.db
      .query("rooms")
      .withIndex("by_adventureId", (q) => q.eq("adventureId", args.adventureId))
      .take(100),
  ]);
  const visibleObjects = objects
    .filter((object) => object.visible)
    .map((object) => ({
      key: object.key,
      name: object.name,
      description: object.description,
    }));
  const actorSummaries = actors.map((actor) => ({
    key: stableActorKey(actor),
    name: actor.name,
    role: actor.role,
  }));

  return {
    adventure: {
      id: adventure._id,
      name: adventure.name,
      worldId: adventure.worldId,
      worldVersionId: adventure.worldVersionId,
    },
    world: {
      id: world._id,
      name: world.name,
      description: world.description,
    },
    sourceWorldVersion: {
      id: worldVersion._id,
      versionNumber: worldVersion.versionNumber,
      name: worldVersion.name,
    },
    player: {
      id: player._id,
      key: stableActorKey(player),
      name: player.name,
      description: player.description,
      locationKey: room.key,
      locationName: room.name,
      profile: playerProfileFromFacts(player, playerFacts),
    },
    room: {
      id: room._id,
      key: room.key,
      name: room.name,
      description: room.description,
    },
    exits: exits.map((exit) => ({ label: exit.label, toRoomName: exit.toRoomName })),
    actors: actors.map((actor) => {
      const actorKey = stableActorKey(actor);
      return {
        id: actor._id,
        key: actorKey,
        name: actor.name,
        role: actor.role,
        description: actor.description,
        locationKey: room.key,
        facts: facts
          .filter((fact) => fact.subjectId === actorSubjectId(actorKey))
          .map((fact) => ({
            key: fact.key,
            value: fact.value,
            source: fact.source,
          })),
      };
    }),
    objects: visibleObjects,
    locationCard: {
      id: room._id,
      key: room.key,
      name: room.name,
      description: room.description,
      facts: facts
        .filter((fact) => fact.subjectId === roomSubjectId(room.key))
        .map((fact) => ({
          key: fact.key,
          value: fact.value,
          source: fact.source,
        })),
      visibleObjects,
      visibleExits: exits.map((exit) => ({
        label: exit.label,
        toLocationKey: exit.toRoomKey,
        toLocationName: exit.toRoomName,
      })),
      presentActors: actorSummaries,
    },
    knownLocations: allRooms.map((knownRoom) => ({
      id: knownRoom._id,
      key: knownRoom.key,
      name: knownRoom.name,
      description: knownRoom.description,
    })),
    recentFeed,
    storyVisibleHistory,
  };
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

export async function loadTranscriptDirectorContextReadModel(
  ctx: QueryCtx,
  args: {
    adventureId: Id<"adventures">;
    loaded: LoadedAdventure;
  },
) {
  const { adventure, world, worldVersion } = args.loaded;

  const [chapel, player, actors, objects, transcript] = await Promise.all([
    findRoomByKey(ctx, args.adventureId, "chapel"),
    findActorByKeyOrName(ctx, args.adventureId, PLAYER_KEY, "Taylor"),
    ctx.db
      .query("actors")
      .withIndex("by_adventureId", (q) => q.eq("adventureId", args.adventureId))
      .take(100),
    ctx.db
      .query("worldObjects")
      .withIndex("by_adventureId", (q) => q.eq("adventureId", args.adventureId))
      .take(30),
    loadTranscript(ctx, args.adventureId, 40),
  ]);
  const startingNpcs = actors
    .filter((actor) => actor.role === "npc")
    .map((actor) => `Starting NPC: ${actor.name}. ${actor.description}`);

  const initialSeed = [
    `${world.name}: ${world.description}`,
    chapel
      ? `Opening scene: ${chapel.description}`
      : "Opening scene: You begin in the Stormbound Chapel as rain lashes the old building.",
    player ? `Player: ${player.name}. ${player.description}` : "Player: Taylor, the playtester.",
    ...startingNpcs,
    objects.length > 0
      ? `Opening details: ${objects
          .filter((object) => object.visible)
          .map((object) => `${object.name}: ${object.description}`)
          .join("; ")}`
      : undefined,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  return {
    adventure: {
      id: adventure._id,
      name: adventure.name,
      worldId: adventure.worldId,
      worldVersionId: adventure.worldVersionId,
    },
    world: {
      id: world._id,
      name: world.name,
      description: world.description,
    },
    sourceWorldVersion: {
      id: worldVersion._id,
      versionNumber: worldVersion.versionNumber,
      name: worldVersion.name,
    },
    initialSeed,
    transcript,
  };
}

async function findRoomByKey(ctx: QueryCtx, adventureId: Id<"adventures">, key: string) {
  return await ctx.db
    .query("rooms")
    .withIndex("by_adventureId_and_key", (q) =>
      q.eq("adventureId", adventureId).eq("key", key),
    )
    .unique();
}

async function findActorByKeyOrName(
  ctx: QueryCtx,
  adventureId: Id<"adventures">,
  key: string,
  name: string,
) {
  const byKey = await ctx.db
    .query("actors")
    .withIndex("by_adventureId_and_key", (q) =>
      q.eq("adventureId", adventureId).eq("key", key),
    )
    .unique();
  if (byKey) {
    return byKey;
  }

  const actors = await ctx.db
    .query("actors")
    .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
    .take(100);
  return actors.find((actor) => actor.name.toLowerCase() === name.toLowerCase()) ?? null;
}

function stableActorKey(actor: { key?: string; name: string }) {
  return actor.key ?? actor.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function actorSubjectId(actorKey: string) {
  return `actor:${actorKey}`;
}

function roomSubjectId(roomKey: string) {
  return `room:${roomKey}`;
}
