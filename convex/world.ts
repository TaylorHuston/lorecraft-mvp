import { v } from "convex/values";
import {
  action,
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

type FactValue = string | number | boolean | null;
type DatabaseCtx = MutationCtx | QueryCtx;
type AcceptedNpcUpdateForWrite = {
  actorKey: string;
  actorName: string;
  reason: string;
  changes: Array<{ key: "mood" | "status" | "memory"; value: string }>;
};
type AcceptedActorMoveForWrite = {
  actorKey: string;
  actorName: string;
  toLocationKey: string;
  toLocationName: string;
  reason: string;
};
type DebugLocationWriteResult = {
  ok: boolean;
  error?: string;
  locationId?: Id<"rooms">;
};

const WORLD_SLUG = "stormbound-chapel-default";
const DEMO_RESET_ROW_LIMIT = 500;
const PLAYER_KEY = "taylor";
const MIRA_KEY = "mira";
const MIRA_DESCRIPTION =
  "A local woman in practical rain-dark clothes, with damp dark hair and watchful eyes.";
const MIRA_BASELINE_FACTS = [
  {
    key: "background",
    value:
      "Mira grew up around Stormbound Chapel and learned its routines from older caretakers. She has seen villagers dismiss old warnings as superstition, and she still carries guilt from once ignoring a sign she should have reported.",
  },
  {
    key: "persona",
    value:
      "Cautious, observant, and slow to trust. Mira notices exits, strangers, and small changes before she speaks, and she tests whether someone is safe before sharing frightening truths.",
  },
  {
    key: "voice",
    value:
      "Plain-spoken and restrained. Mira uses short warnings, practical details, and chapel or weather imagery. She avoids grand claims unless fear breaks through.",
  },
  { key: "mood", value: "watchful" },
  {
    key: "status",
    value:
      "standing near the chapel aisle, tense from the storm and alert to movement around her",
  },
  { key: "memory", value: "Mira has not yet formed meaningful memories of Taylor." },
  {
    key: "knowledge",
    value:
      "Mira knows the storm began after the chapel bell rang at midnight, but she is afraid to say that plainly.",
  },
] as const;
const LEGACY_MIRA_FACT_KEYS = ["knows_about_storm"] as const;
const PRIEST_KEY = "brother-alden";
const PRIEST_NAME = "Brother Alden";
const PRIEST_DESCRIPTION =
  "A small, middle-aged priest in a patched black cassock, with ink-stained fingers and a careful stoop.";
const PRIEST_BASELINE_FACTS = [
  {
    key: "background",
    value:
      "Brother Alden has tended Stormbound Chapel for years, keeping records, repairing small damage, and quietly helping villagers who come in from the rain.",
  },
  {
    key: "persona",
    value:
      "Gentle, nervous, and dutiful. Alden tries to calm frightened people before admitting how much he knows, and he dislikes open confrontation.",
  },
  {
    key: "voice",
    value:
      "Soft and formal, with small apologies and careful religious phrasing. He often answers indirectly before gathering courage.",
  },
  { key: "mood", value: "uneasy" },
  {
    key: "status",
    value: "standing near the altar with a damp ledger tucked under one arm",
  },
  { key: "memory", value: "Brother Alden has not yet formed meaningful memories of Taylor." },
  {
    key: "knowledge",
    value:
      "Alden found a torn bell-rope fiber near the altar after midnight, but he has not told Mira because he fears accusing someone without proof.",
  },
] as const;
const SEEDED_ROOMS = [
  {
    key: "chapel",
    name: "Chapel",
    description:
      "Rain taps against warped shutters. A cracked lantern hangs beside a stone altar, Mira waits near the aisle, and Brother Alden stands close to the altar with a ledger under one arm.",
  },
  {
    key: "vestry",
    name: "Vestry",
    description:
      "The vestry smells of old paper and damp wool. A narrow desk sits under shelves of hymnals.",
  },
  {
    key: "graveyard",
    name: "Graveyard",
    description: "Tilted stones vanish into the rain. The chapel door glows behind you.",
  },
] as const;

const factValue = v.union(v.string(), v.number(), v.boolean(), v.null());
const actorRole = v.union(v.literal("player"), v.literal("npc"));
const feedKind = v.union(v.literal("player"), v.literal("director"), v.literal("event"));
const directorStatus = v.union(
  v.literal("success"),
  v.literal("provider_error"),
  v.literal("invalid_output"),
);
const turnStatus = v.union(v.literal("pending"), v.literal("succeeded"), v.literal("failed"));
const npcFactKey = v.union(v.literal("mood"), v.literal("status"), v.literal("memory"));
const acceptedNpcUpdate = v.object({
  actorKey: v.string(),
  actorName: v.string(),
  reason: v.string(),
  changes: v.array(v.object({ key: npcFactKey, value: v.string() })),
});
const acceptedActorMove = v.object({
  actorKey: v.string(),
  actorName: v.string(),
  toLocationKey: v.string(),
  toLocationName: v.string(),
  reason: v.string(),
});
const ignoredNpcUpdate = v.object({
  actorKey: v.optional(v.string()),
  field: v.optional(v.string()),
  reason: v.string(),
  valuePreview: v.optional(v.string()),
});
const ignoredActorMove = v.object({
  actorKey: v.optional(v.string()),
  toLocationKey: v.optional(v.string()),
  reason: v.string(),
  valuePreview: v.optional(v.string()),
});

const debugLocationWriteResult = v.object({
  ok: v.boolean(),
  error: v.optional(v.string()),
  locationId: v.optional(v.id("rooms")),
});

function normalized(input: string) {
  return input.trim().toLowerCase();
}

function actorSubjectId(actorKey: string) {
  return `actor:${actorKey}`;
}

function objectSubjectId(objectId: Id<"worldObjects">) {
  return `object:${objectId}`;
}

function roomSubjectId(roomKey: string) {
  return `room:${roomKey}`;
}

function stableActorKey(actor: { key?: string; name: string }) {
  return actor.key ?? normalized(actor.name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function findRoomByKey(ctx: DatabaseCtx, worldId: Id<"worlds">, key: string) {
  return await ctx.db
    .query("rooms")
    .withIndex("by_worldId_and_key", (q) => q.eq("worldId", worldId).eq("key", key))
    .unique();
}

async function findActorByKeyOrName(
  ctx: DatabaseCtx,
  worldId: Id<"worlds">,
  key: string,
  name: string,
) {
  const byKey = await ctx.db
    .query("actors")
    .withIndex("by_worldId_and_key", (q) => q.eq("worldId", worldId).eq("key", key))
    .unique();
  if (byKey) {
    return byKey;
  }

  const actors = await ctx.db
    .query("actors")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(100);
  return actors.find((actor) => actor.name.toLowerCase() === name.toLowerCase()) ?? null;
}

async function setFact(
  ctx: MutationCtx,
  args: {
    worldId: Id<"worlds">;
    subjectType: "world" | "room" | "actor" | "object" | "exit";
    subjectId: string;
    key: string;
    value: FactValue;
    source: "seed" | "player" | "engine" | "llm" | "manual";
    overwrite: boolean;
  },
) {
  const existing = await ctx.db
    .query("facts")
    .withIndex("by_worldId_and_subjectId_and_key", (q) =>
      q.eq("worldId", args.worldId).eq("subjectId", args.subjectId).eq("key", args.key),
    )
    .unique();

  if (existing) {
    if (args.overwrite) {
      await ctx.db.patch(existing._id, { value: args.value, source: args.source });
    }
    return existing._id;
  }

  return await ctx.db.insert("facts", {
    worldId: args.worldId,
    subjectType: args.subjectType,
    subjectId: args.subjectId,
    key: args.key,
    value: args.value,
    source: args.source,
  });
}

async function applyAcceptedNpcUpdates(
  ctx: MutationCtx,
  args: {
    worldId: Id<"worlds">;
    turnId: Id<"turns">;
    commandId: Id<"commands">;
    acceptedUpdates: AcceptedNpcUpdateForWrite[];
  },
) {
  let changedFacts = 0;
  const operations: Array<
    | {
        op: "setFact";
        subjectType: string;
        subjectId: string;
        key: string;
        value: FactValue;
      }
    | { op: "appendEvent"; text: string }
  > = [];

  for (const update of args.acceptedUpdates) {
    const subjectId = actorSubjectId(update.actorKey);
    for (const change of update.changes) {
      await setFact(ctx, {
        worldId: args.worldId,
        subjectType: "actor",
        subjectId,
        key: change.key,
        value: change.value,
        source: "llm",
        overwrite: true,
      });
      changedFacts += 1;
      operations.push({
        op: "setFact",
        subjectType: "actor",
        subjectId,
        key: change.key,
        value: change.value,
      });
    }

    const changedKeys = update.changes.map((change) => change.key).join(", ");
    const eventText = `${update.actorName}'s ${changedKeys} changed after the exchange.`;
    await ctx.db.insert("events", {
      worldId: args.worldId,
      turnId: args.turnId,
      commandId: args.commandId,
      text: eventText,
      source: "llm",
    });
    operations.push({ op: "appendEvent", text: eventText });
  }

  if (operations.length > 0) {
    await ctx.db.insert("stateDiffs", {
      worldId: args.worldId,
      turnId: args.turnId,
      commandId: args.commandId,
      source: "llm",
      operations,
    });
  }

  return changedFacts;
}

async function applyAcceptedActorMoves(
  ctx: MutationCtx,
  args: {
    worldId: Id<"worlds">;
    turnId: Id<"turns">;
    commandId: Id<"commands">;
    acceptedMoves: AcceptedActorMoveForWrite[];
  },
) {
  if (args.acceptedMoves.length === 0) {
    return 0;
  }

  const world = await ctx.db.get(args.worldId);
  const player = world?.currentPlayerActorId ? await ctx.db.get(world.currentPlayerActorId) : null;
  const currentRoomId = player?.roomId;
  const operations: Array<{ op: "moveActor"; actorId: Id<"actors">; toRoomId: Id<"rooms"> }> = [];

  if (!currentRoomId) {
    return 0;
  }

  for (const move of args.acceptedMoves) {
    const actor = await findActorByKeyOrName(ctx, args.worldId, move.actorKey, move.actorName);
    const toRoom = await findRoomByKey(ctx, args.worldId, move.toLocationKey);

    if (!actor || !toRoom || actor.roomId !== currentRoomId) {
      continue;
    }

    await ctx.db.patch(actor._id, { roomId: toRoom._id });
    operations.push({ op: "moveActor", actorId: actor._id, toRoomId: toRoom._id });
  }

  if (operations.length > 0) {
    await ctx.db.insert("stateDiffs", {
      worldId: args.worldId,
      turnId: args.turnId,
      commandId: args.commandId,
      source: "llm",
      operations,
    });
  }

  return operations.length;
}

async function deleteActorFactByKey(
  ctx: MutationCtx,
  worldId: Id<"worlds">,
  actorKey: string,
  key: string,
) {
  const existing = await ctx.db
    .query("facts")
    .withIndex("by_worldId_and_subjectId_and_key", (q) =>
      q.eq("worldId", worldId).eq("subjectId", actorSubjectId(actorKey)).eq("key", key),
    )
    .unique();

  if (existing) {
    await ctx.db.delete(existing._id);
  }
}

async function restoreSeededNpc(
  ctx: MutationCtx,
  args: {
    worldId: Id<"worlds">;
    key: string;
    name: string;
    description: string;
    facts: readonly { key: string; value: FactValue }[];
    legacyFactKeys?: readonly string[];
  },
) {
  const actor = await findActorByKeyOrName(ctx, args.worldId, args.key, args.name);
  if (!actor) {
    return 0;
  }

  if (!actor.key) {
    await ctx.db.patch(actor._id, { key: args.key });
  }
  await ctx.db.patch(actor._id, { description: args.description });

  for (const key of args.legacyFactKeys ?? []) {
    await deleteActorFactByKey(ctx, args.worldId, args.key, key);
  }

  for (const fact of args.facts) {
    await setFact(ctx, {
      worldId: args.worldId,
      subjectType: "actor",
      subjectId: actorSubjectId(args.key),
      key: fact.key,
      value: fact.value,
      source: "seed",
      overwrite: true,
    });
  }

  return args.facts.length;
}

async function resetSeededActorLocations(ctx: MutationCtx, worldId: Id<"worlds">) {
  const chapel = await findRoomByKey(ctx, worldId, "chapel");
  if (!chapel) {
    return 0;
  }

  let moved = 0;
  const seededActors = [
    { key: PLAYER_KEY, name: "Taylor" },
    { key: MIRA_KEY, name: "Mira" },
    { key: PRIEST_KEY, name: PRIEST_NAME },
  ];

  for (const seededActor of seededActors) {
    const actor = await findActorByKeyOrName(ctx, worldId, seededActor.key, seededActor.name);
    if (!actor || actor.roomId === chapel._id) {
      continue;
    }
    await ctx.db.patch(actor._id, { roomId: chapel._id });
    moved += 1;
  }

  return moved;
}

async function restoreSeededLocations(ctx: MutationCtx, worldId: Id<"worlds">) {
  let restoredLocations = 0;
  for (const seededRoom of SEEDED_ROOMS) {
    const room = await findRoomByKey(ctx, worldId, seededRoom.key);
    if (!room) {
      continue;
    }

    if (room.name !== seededRoom.name || room.description !== seededRoom.description) {
      await ctx.db.patch(room._id, {
        name: seededRoom.name,
        description: seededRoom.description,
      });
      restoredLocations += 1;
    }
  }

  return restoredLocations;
}

async function deleteNonSeededLocations(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rooms = await ctx.db
    .query("rooms")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("rooms", rooms.length);

  const seededRoomKeys = new Set<string>(SEEDED_ROOMS.map((room) => room.key));
  let deletedLocations = 0;
  for (const room of rooms) {
    if (seededRoomKeys.has(room.key)) {
      continue;
    }
    await ctx.db.delete(room._id);
    deletedLocations += 1;
  }

  return deletedLocations;
}

export const seedDemoWorld = mutation({
  args: {},
  returns: v.id("worlds"),
  handler: async (ctx) => {
    await deleteDemoWorld(ctx);

    const worldId = await ctx.db.insert("worlds", {
      slug: WORLD_SLUG,
      name: "Stormbound Chapel",
      description:
        "A small persistent-world test set around a chapel, a vestry, and a rain-lashed graveyard.",
    });

    const chapelId = await ctx.db.insert("rooms", {
      worldId,
      ...SEEDED_ROOMS[0],
    });
    const vestryId = await ctx.db.insert("rooms", {
      worldId,
      ...SEEDED_ROOMS[1],
    });
    const graveyardId = await ctx.db.insert("rooms", {
      worldId,
      ...SEEDED_ROOMS[2],
    });

    await Promise.all([
      ctx.db.insert("exits", {
        worldId,
        fromRoomId: chapelId,
        toRoomId: vestryId,
        label: "west",
        visible: true,
      }),
      ctx.db.insert("exits", {
        worldId,
        fromRoomId: vestryId,
        toRoomId: chapelId,
        label: "east",
        visible: true,
      }),
      ctx.db.insert("exits", {
        worldId,
        fromRoomId: chapelId,
        toRoomId: graveyardId,
        label: "north",
        visible: true,
      }),
      ctx.db.insert("exits", {
        worldId,
        fromRoomId: graveyardId,
        toRoomId: chapelId,
        label: "south",
        visible: true,
      }),
    ]);

    const playerId = await ctx.db.insert("actors", {
      worldId,
      roomId: chapelId,
      key: PLAYER_KEY,
      name: "Taylor",
      role: "player",
      description: "The playtester exploring whether the world remembers.",
    });
    await ctx.db.insert("actors", {
      worldId,
      roomId: chapelId,
      key: MIRA_KEY,
      name: "Mira",
      role: "npc",
      description: MIRA_DESCRIPTION,
    });
    await ctx.db.insert("actors", {
      worldId,
      roomId: chapelId,
      key: PRIEST_KEY,
      name: PRIEST_NAME,
      role: "npc",
      description: PRIEST_DESCRIPTION,
    });

    await ctx.db.patch(worldId, { currentPlayerActorId: playerId });

    const shuttersId = await ctx.db.insert("worldObjects", {
      worldId,
      roomId: chapelId,
      key: "shutters",
      name: "Shutters",
      description: "Warped wooden shutters latched against the storm.",
      visible: true,
    });
    const lanternId = await ctx.db.insert("worldObjects", {
      worldId,
      roomId: chapelId,
      key: "lantern",
      name: "Lantern",
      description: "A cracked lantern with a low, unsteady flame.",
      visible: true,
    });
    const altarId = await ctx.db.insert("worldObjects", {
      worldId,
      roomId: chapelId,
      key: "altar",
      name: "Altar",
      description: "A stone altar scarred by old candle wax.",
      visible: true,
    });

    await Promise.all([
      setFact(ctx, {
        worldId,
        subjectType: "object",
        subjectId: objectSubjectId(shuttersId),
        key: "open",
        value: false,
        source: "seed",
        overwrite: false,
      }),
      setFact(ctx, {
        worldId,
        subjectType: "object",
        subjectId: objectSubjectId(lanternId),
        key: "broken",
        value: false,
        source: "seed",
        overwrite: false,
      }),
      setFact(ctx, {
        worldId,
        subjectType: "object",
        subjectId: objectSubjectId(altarId),
        key: "marked_with_chalk",
        value: false,
        source: "seed",
        overwrite: false,
      }),
      ...MIRA_BASELINE_FACTS.map((fact) =>
        setFact(ctx, {
          worldId,
          subjectType: "actor",
          subjectId: actorSubjectId(MIRA_KEY),
          key: fact.key,
          value: fact.value,
          source: "seed",
          overwrite: false,
        }),
      ),
      ...PRIEST_BASELINE_FACTS.map((fact) =>
        setFact(ctx, {
          worldId,
          subjectType: "actor",
          subjectId: actorSubjectId(PRIEST_KEY),
          key: fact.key,
          value: fact.value,
          source: "seed",
          overwrite: false,
        }),
      ),
      ctx.db.insert("events", {
        worldId,
        text: "The Stormbound Chapel playtest world was seeded.",
        source: "seed",
      }),
      ctx.db.insert("narrations", {
        worldId,
        text: "You stand in the chapel while rain works at the shutters.",
        source: "seed",
      }),
    ]);

    return worldId;
  },
});

export const getDefaultWorld = query({
  args: {},
  returns: v.union(v.null(), v.id("worlds")),
  handler: async (ctx) => {
    const world = await ctx.db
      .query("worlds")
      .withIndex("by_slug", (q) => q.eq("slug", WORLD_SLUG))
      .unique();
    return world?._id ?? null;
  },
});

const feedEntry = v.object({
  id: v.string(),
  kind: feedKind,
  text: v.string(),
  source: v.string(),
  createdAt: v.number(),
  turnId: v.optional(v.id("turns")),
  commandId: v.optional(v.id("commands")),
});

export const getSnapshot = query({
  args: { worldId: v.id("worlds") },
  returns: v.union(
    v.null(),
    v.object({
      world: v.object({
        _id: v.id("worlds"),
        name: v.string(),
        description: v.string(),
      }),
      player: v.object({
        _id: v.id("actors"),
        key: v.string(),
        name: v.string(),
        roomId: v.id("rooms"),
      }),
      room: v.object({
        _id: v.id("rooms"),
        key: v.string(),
        name: v.string(),
        description: v.string(),
      }),
      locations: v.array(
        v.object({
          _id: v.id("rooms"),
          key: v.string(),
          name: v.string(),
          description: v.string(),
          actors: v.array(v.object({ key: v.string(), name: v.string(), role: actorRole })),
          objects: v.array(v.object({ key: v.string(), name: v.string() })),
          exits: v.array(
            v.object({ label: v.string(), toLocationKey: v.string(), toLocationName: v.string() }),
          ),
        }),
      ),
      exits: v.array(
        v.object({
          _id: v.id("exits"),
          label: v.string(),
          toRoomName: v.string(),
        }),
      ),
      actors: v.array(
        v.object({
          _id: v.id("actors"),
          key: v.string(),
          name: v.string(),
          description: v.string(),
          role: actorRole,
        }),
      ),
      objects: v.array(
        v.object({
          _id: v.id("worldObjects"),
          key: v.string(),
          name: v.string(),
          description: v.string(),
        }),
      ),
      facts: v.array(
        v.object({
          _id: v.id("facts"),
          subjectType: v.string(),
          subjectId: v.string(),
          key: v.string(),
          value: factValue,
          source: v.string(),
        }),
      ),
      feed: v.array(feedEntry),
      events: v.array(v.object({ _id: v.id("events"), text: v.string(), source: v.string() })),
      narrations: v.array(v.object({ _id: v.id("narrations"), text: v.string(), source: v.string() })),
      diffs: v.array(
        v.object({
          _id: v.id("stateDiffs"),
          turnId: v.optional(v.id("turns")),
          source: v.string(),
          operations: v.array(v.any()),
        }),
      ),
      turns: v.array(
        v.object({
          _id: v.id("turns"),
          _creationTime: v.number(),
          sequenceNumber: v.number(),
          actorId: v.id("actors"),
          commandId: v.optional(v.id("commands")),
          status: turnStatus,
          error: v.optional(v.string()),
          completedAt: v.optional(v.number()),
          playerInput: v.optional(v.string()),
          narrationCount: v.number(),
          eventCount: v.number(),
          stateDiffCount: v.number(),
          directorCallStatus: v.optional(directorStatus),
        }),
      ),
      directorCalls: v.array(
        v.object({
          _id: v.id("directorCalls"),
          _creationTime: v.number(),
          turnId: v.optional(v.id("turns")),
          commandId: v.optional(v.id("commands")),
          provider: v.string(),
          model: v.string(),
          requestSummary: v.any(),
          rawRequest: v.optional(v.any()),
          rawResponse: v.optional(v.string()),
          parsedResponse: v.optional(v.any()),
          status: directorStatus,
          acceptedUpdates: v.array(v.any()),
          ignoredUpdates: v.array(v.any()),
          error: v.optional(v.string()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const loaded = await loadCurrentWorld(ctx, args.worldId);
    if (!loaded) {
      return null;
    }

    const { world, player, room } = loaded;
    const [
      exits,
      actors,
      objects,
      facts,
      events,
      narrations,
      diffs,
      directorCalls,
      turns,
      feed,
      locations,
    ] =
      await Promise.all([
        loadVisibleExits(ctx, args.worldId, room._id),
        ctx.db
          .query("actors")
          .withIndex("by_worldId_and_roomId", (q) =>
            q.eq("worldId", args.worldId).eq("roomId", room._id),
          )
          .take(20),
        ctx.db
          .query("worldObjects")
          .withIndex("by_worldId_and_roomId", (q) =>
            q.eq("worldId", args.worldId).eq("roomId", room._id),
          )
          .take(30),
        ctx.db
          .query("facts")
          .withIndex("by_worldId", (q) => q.eq("worldId", args.worldId))
          .order("desc")
          .take(80),
        ctx.db
          .query("events")
          .withIndex("by_worldId", (q) => q.eq("worldId", args.worldId))
          .order("desc")
          .take(30),
        ctx.db
          .query("narrations")
          .withIndex("by_worldId", (q) => q.eq("worldId", args.worldId))
          .order("desc")
          .take(30),
        ctx.db
          .query("stateDiffs")
          .withIndex("by_worldId", (q) => q.eq("worldId", args.worldId))
          .order("desc")
          .take(12),
        ctx.db
          .query("directorCalls")
          .withIndex("by_worldId", (q) => q.eq("worldId", args.worldId))
          .order("desc")
          .take(10),
        loadTurnSummaries(ctx, args.worldId, 12),
        loadFeed(ctx, args.worldId, 60),
        loadLocationSummaries(ctx, args.worldId),
      ]);

    return {
      world: {
        _id: world._id,
        name: world.name,
        description: world.description,
      },
      player: {
        _id: player._id,
        key: stableActorKey(player),
        name: player.name,
        roomId: player.roomId,
      },
      room: {
        _id: room._id,
        key: room.key,
        name: room.name,
        description: room.description,
      },
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
      facts: facts.map((fact) => ({
        _id: fact._id,
        subjectType: fact.subjectType,
        subjectId: fact.subjectId,
        key: fact.key,
        value: fact.value,
        source: fact.source,
      })),
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
      diffs: diffs.map((diff) => ({
        _id: diff._id,
        ...(diff.turnId ? { turnId: diff.turnId } : {}),
        source: diff.source,
        operations: diff.operations,
      })),
      turns,
      directorCalls: directorCalls.map((call) => ({
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
      })),
    };
  },
});

export const getDirectorContext = query({
  args: { worldId: v.id("worlds") },
  returns: v.union(
    v.null(),
    v.object({
      world: v.object({ id: v.string(), name: v.string(), description: v.string() }),
      player: v.object({ id: v.string(), key: v.string(), name: v.string() }),
      room: v.object({
        id: v.string(),
        key: v.string(),
        name: v.string(),
        description: v.string(),
      }),
      exits: v.array(v.object({ label: v.string(), toRoomName: v.string() })),
      actors: v.array(
        v.object({
          id: v.string(),
          key: v.string(),
          name: v.string(),
          role: actorRole,
          description: v.string(),
          locationKey: v.string(),
          facts: v.array(
            v.object({
              key: v.string(),
              value: factValue,
              source: v.string(),
            }),
          ),
        }),
      ),
      objects: v.array(v.object({ key: v.string(), name: v.string(), description: v.string() })),
      locationCard: v.object({
        id: v.string(),
        key: v.string(),
        name: v.string(),
        description: v.string(),
        facts: v.array(v.object({ key: v.string(), value: factValue, source: v.string() })),
        visibleObjects: v.array(
          v.object({ key: v.string(), name: v.string(), description: v.string() }),
        ),
        visibleExits: v.array(
          v.object({
            label: v.string(),
            toLocationKey: v.string(),
            toLocationName: v.string(),
          }),
        ),
        presentActors: v.array(
          v.object({ key: v.string(), name: v.string(), role: actorRole }),
        ),
      }),
      knownLocations: v.array(
        v.object({
          id: v.string(),
          key: v.string(),
          name: v.string(),
          description: v.string(),
        }),
      ),
      recentFeed: v.array(feedEntry),
    }),
  ),
  handler: async (ctx, args) => {
    const loaded = await loadCurrentWorld(ctx, args.worldId);
    if (!loaded) {
      return null;
    }

    const { world, player, room } = loaded;
    const [exits, actors, objects, facts, recentFeed, allRooms] = await Promise.all([
      loadVisibleExits(ctx, args.worldId, room._id),
      ctx.db
        .query("actors")
        .withIndex("by_worldId_and_roomId", (q) =>
          q.eq("worldId", args.worldId).eq("roomId", room._id),
        )
        .take(20),
      ctx.db
        .query("worldObjects")
        .withIndex("by_worldId_and_roomId", (q) =>
          q.eq("worldId", args.worldId).eq("roomId", room._id),
        )
        .take(30),
      ctx.db
        .query("facts")
        .withIndex("by_worldId", (q) => q.eq("worldId", args.worldId))
        .take(100),
      loadFeed(ctx, args.worldId, 20),
      ctx.db
        .query("rooms")
        .withIndex("by_worldId", (q) => q.eq("worldId", args.worldId))
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
      world: {
        id: world._id,
        name: world.name,
        description: world.description,
      },
      player: {
        id: player._id,
        key: stableActorKey(player),
        name: player.name,
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
    };
  },
});

export const getTranscriptDirectorContext = query({
  args: { worldId: v.id("worlds") },
  returns: v.union(
    v.null(),
    v.object({
      world: v.object({ id: v.string(), name: v.string(), description: v.string() }),
      initialSeed: v.string(),
      transcript: v.array(feedEntry),
    }),
  ),
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      return null;
    }

    const [chapel, player, actors, objects, transcript] = await Promise.all([
      findRoomByKey(ctx, args.worldId, "chapel"),
      findActorByKeyOrName(ctx, args.worldId, PLAYER_KEY, "Taylor"),
      ctx.db
        .query("actors")
        .withIndex("by_worldId", (q) => q.eq("worldId", args.worldId))
        .take(100),
      ctx.db
        .query("worldObjects")
        .withIndex("by_worldId", (q) => q.eq("worldId", args.worldId))
        .take(30),
      loadTranscript(ctx, args.worldId, 40),
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
      world: {
        id: world._id,
        name: world.name,
        description: world.description,
      },
      initialSeed,
      transcript,
    };
  },
});

export const recordPlayerInput = mutation({
  args: { worldId: v.id("worlds"), input: v.string() },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      turnId: v.id("turns"),
      commandId: v.id("commands"),
      sequenceNumber: v.number(),
    }),
    v.object({ ok: v.literal(false), error: v.string() }),
  ),
  handler: async (ctx, args) => {
    const input = args.input.trim();
    if (!input) {
      return { ok: false as const, error: "Enter narrative text to continue." };
    }

    const world = await ctx.db.get(args.worldId);
    if (!world?.currentPlayerActorId) {
      return { ok: false as const, error: "No active player exists in this world yet." };
    }

    const player = await ctx.db.get(world.currentPlayerActorId);
    if (!player) {
      return { ok: false as const, error: "The active player could not be loaded." };
    }

    const room = await ctx.db.get(player.roomId);
    if (!room) {
      return { ok: false as const, error: "The current room could not be loaded." };
    }

    const previousTurn = await ctx.db
      .query("turns")
      .withIndex("by_worldId_and_sequenceNumber", (q) => q.eq("worldId", args.worldId))
      .order("desc")
      .take(1);
    const sequenceNumber = (previousTurn[0]?.sequenceNumber ?? 0) + 1;
    const turnId = await ctx.db.insert("turns", {
      worldId: args.worldId,
      sequenceNumber,
      actorId: player._id,
      status: "pending",
    });

    const commandId = await ctx.db.insert("commands", {
      worldId: args.worldId,
      turnId,
      actorId: player._id,
      input,
      normalizedInput: normalized(input),
    });

    await ctx.db.patch(turnId, { commandId });

    return { ok: true as const, turnId, commandId, sequenceNumber };
  },
});

export const completeDirectorTurn = mutation({
  args: {
    worldId: v.id("worlds"),
    turnId: v.id("turns"),
    commandId: v.id("commands"),
    provider: v.string(),
    model: v.string(),
    requestSummary: v.any(),
    rawRequest: v.optional(v.any()),
    rawResponse: v.optional(v.string()),
    parsedResponse: v.optional(v.any()),
    status: directorStatus,
    acceptedUpdates: v.array(acceptedNpcUpdate),
    ignoredUpdates: v.array(ignoredNpcUpdate),
    error: v.optional(v.string()),
    narration: v.optional(v.string()),
    applyWorldMutations: v.optional(v.boolean()),
  },
  returns: v.object({
    directorCallId: v.id("directorCalls"),
    narrationId: v.optional(v.id("narrations")),
    changedFacts: v.number(),
  }),
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn || turn.worldId !== args.worldId || turn.commandId !== args.commandId) {
      throw new Error("Turn, world, and command do not match.");
    }

    const directorCall = {
      worldId: args.worldId,
      turnId: args.turnId,
      commandId: args.commandId,
      provider: args.provider,
      model: args.model,
      requestSummary: args.requestSummary,
      status: args.status,
      acceptedUpdates: args.acceptedUpdates,
      ignoredUpdates: args.ignoredUpdates,
      ...(args.rawRequest !== undefined ? { rawRequest: args.rawRequest } : {}),
      ...(args.rawResponse !== undefined ? { rawResponse: args.rawResponse } : {}),
      ...(args.parsedResponse !== undefined ? { parsedResponse: args.parsedResponse } : {}),
      ...(args.error !== undefined ? { error: args.error } : {}),
    };
    const directorCallId = await ctx.db.insert("directorCalls", directorCall);

    if (args.status !== "success" || !args.narration?.trim()) {
      await ctx.db.patch(args.turnId, {
        status: "failed",
        ...(args.error !== undefined ? { error: args.error } : {}),
        completedAt: Date.now(),
      });
      return { directorCallId, changedFacts: 0 };
    }

    const narrationId = await ctx.db.insert("narrations", {
      worldId: args.worldId,
      turnId: args.turnId,
      commandId: args.commandId,
      text: args.narration.trim(),
      source: "llm",
    });

    if (args.applyWorldMutations === false) {
      await ctx.db.patch(args.turnId, { status: "succeeded", completedAt: Date.now() });
      return { directorCallId, narrationId, changedFacts: 0 };
    }

    const changedFacts = await applyAcceptedNpcUpdates(ctx, {
      worldId: args.worldId,
      turnId: args.turnId,
      commandId: args.commandId,
      acceptedUpdates: args.acceptedUpdates,
    });

    await ctx.db.patch(args.turnId, { status: "succeeded", completedAt: Date.now() });

    return { directorCallId, narrationId, changedFacts };
  },
});

export const recordNpcStateExtraction = mutation({
  args: {
    worldId: v.id("worlds"),
    turnId: v.id("turns"),
    commandId: v.id("commands"),
    provider: v.string(),
    model: v.string(),
    requestSummary: v.any(),
    rawRequest: v.optional(v.any()),
    rawResponse: v.optional(v.string()),
    parsedResponse: v.optional(v.any()),
    status: directorStatus,
    acceptedUpdates: v.array(acceptedNpcUpdate),
    ignoredUpdates: v.array(ignoredNpcUpdate),
    acceptedMoves: v.optional(v.array(acceptedActorMove)),
    ignoredMoves: v.optional(v.array(ignoredActorMove)),
    error: v.optional(v.string()),
  },
  returns: v.object({
    directorCallId: v.id("directorCalls"),
    changedFacts: v.number(),
    movedActors: v.number(),
  }),
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn || turn.worldId !== args.worldId || turn.commandId !== args.commandId) {
      throw new Error("Turn, world, and command do not match.");
    }

    const acceptedMoveUpdates = (args.acceptedMoves ?? []).map((move) => ({
      type: "actorMove",
      ...move,
    }));
    const ignoredMoveUpdates = (args.ignoredMoves ?? []).map((move) => ({
      type: "actorMove",
      ...move,
    }));
    const directorCall = {
      worldId: args.worldId,
      turnId: args.turnId,
      commandId: args.commandId,
      provider: args.provider,
      model: args.model,
      requestSummary: args.requestSummary,
      status: args.status,
      acceptedUpdates: [...args.acceptedUpdates, ...acceptedMoveUpdates],
      ignoredUpdates: [...args.ignoredUpdates, ...ignoredMoveUpdates],
      ...(args.rawRequest !== undefined ? { rawRequest: args.rawRequest } : {}),
      ...(args.rawResponse !== undefined ? { rawResponse: args.rawResponse } : {}),
      ...(args.parsedResponse !== undefined ? { parsedResponse: args.parsedResponse } : {}),
      ...(args.error !== undefined ? { error: args.error } : {}),
    };
    const directorCallId = await ctx.db.insert("directorCalls", directorCall);

    if (args.status !== "success") {
      return { directorCallId, changedFacts: 0, movedActors: 0 };
    }

    const changedFacts = await applyAcceptedNpcUpdates(ctx, {
      worldId: args.worldId,
      turnId: args.turnId,
      commandId: args.commandId,
      acceptedUpdates: args.acceptedUpdates,
    });
    const movedActors = await applyAcceptedActorMoves(ctx, {
      worldId: args.worldId,
      turnId: args.turnId,
      commandId: args.commandId,
      acceptedMoves: args.acceptedMoves ?? [],
    });

    return { directorCallId, changedFacts, movedActors };
  },
});

export const resetPlaytestWorld = mutation({
  args: { worldId: v.id("worlds") },
  returns: v.object({
    deletedTurns: v.number(),
    deletedCommands: v.number(),
    deletedNarrations: v.number(),
    deletedEvents: v.number(),
    deletedStateDiffs: v.number(),
    deletedDirectorCalls: v.number(),
    restoredFacts: v.number(),
    resetActorLocations: v.number(),
    restoredLocations: v.number(),
    deletedLocations: v.number(),
  }),
  handler: async (ctx, args) => {
    const deletedNarrations = await deleteNarrations(ctx, args.worldId);
    const deletedEvents = await deleteEvents(ctx, args.worldId);
    const deletedStateDiffs = await deleteStateDiffs(ctx, args.worldId);
    const deletedDirectorCalls = await deleteDirectorCalls(ctx, args.worldId);
    const deletedCommands = await deleteCommands(ctx, args.worldId);
    const deletedTurns = await deleteTurns(ctx, args.worldId);

    let restoredFacts = 0;
    restoredFacts += await restoreSeededNpc(ctx, {
      worldId: args.worldId,
      key: MIRA_KEY,
      name: "Mira",
      description: MIRA_DESCRIPTION,
      facts: MIRA_BASELINE_FACTS,
      legacyFactKeys: LEGACY_MIRA_FACT_KEYS,
    });
    restoredFacts += await restoreSeededNpc(ctx, {
      worldId: args.worldId,
      key: PRIEST_KEY,
      name: PRIEST_NAME,
      description: PRIEST_DESCRIPTION,
      facts: PRIEST_BASELINE_FACTS,
    });
    const resetActorLocations = await resetSeededActorLocations(ctx, args.worldId);
    const restoredLocations = await restoreSeededLocations(ctx, args.worldId);
    const deletedLocations = await deleteNonSeededLocations(ctx, args.worldId);

    return {
      deletedTurns,
      deletedCommands,
      deletedNarrations,
      deletedEvents,
      deletedStateDiffs,
      deletedDirectorCalls,
      restoredFacts,
      resetActorLocations,
      restoredLocations,
      deletedLocations,
    };
  },
});

export const updateLocation = action({
  args: {
    worldId: v.id("worlds"),
    locationId: v.id("rooms"),
    name: v.string(),
    description: v.string(),
  },
  returns: debugLocationWriteResult,
  handler: async (ctx, args) => {
    if (!debugLocationWritesEnabled()) {
      return { ok: false, error: "Debug location writes are disabled." };
    }

    const result: DebugLocationWriteResult = await ctx.runMutation(
      internal.world.updateLocationInternal,
      args,
    );
    return result;
  },
});

export const createLocation = action({
  args: {
    worldId: v.id("worlds"),
    key: v.string(),
    name: v.string(),
    description: v.string(),
  },
  returns: debugLocationWriteResult,
  handler: async (ctx, args): Promise<DebugLocationWriteResult> => {
    if (!debugLocationWritesEnabled()) {
      return { ok: false, error: "Debug location writes are disabled." };
    }

    const result: DebugLocationWriteResult = await ctx.runMutation(
      internal.world.createLocationInternal,
      args,
    );
    return result;
  },
});

export const updateLocationInternal = internalMutation({
  args: {
    worldId: v.id("worlds"),
    locationId: v.id("rooms"),
    name: v.string(),
    description: v.string(),
  },
  returns: debugLocationWriteResult,
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.locationId);
    if (!room || room.worldId !== args.worldId) {
      return { ok: false, error: "Location could not be found in this world." };
    }

    const name = args.name.trim();
    const description = args.description.trim();
    if (!name || !description) {
      return { ok: false, error: "Location name and description are required." };
    }

    await ctx.db.patch(room._id, {
      name: name.slice(0, 120),
      description: description.slice(0, 1200),
    });
    return { ok: true };
  },
});

export const createLocationInternal = internalMutation({
  args: {
    worldId: v.id("worlds"),
    key: v.string(),
    name: v.string(),
    description: v.string(),
  },
  returns: debugLocationWriteResult,
  handler: async (ctx, args) => {
    const key = args.key.trim().toLowerCase();
    const name = args.name.trim();
    const description = args.description.trim();

    if (!/^[a-z0-9][a-z0-9-]{1,48}$/.test(key)) {
      return {
        ok: false,
        error: "Location key must use lowercase letters, numbers, and hyphens.",
      };
    }
    if (!name || !description) {
      return { ok: false, error: "Location name and description are required." };
    }

    const existing = await findRoomByKey(ctx, args.worldId, key);
    if (existing) {
      return { ok: false, error: "A location with that key already exists." };
    }

    const locationId = await ctx.db.insert("rooms", {
      worldId: args.worldId,
      key,
      name: name.slice(0, 120),
      description: description.slice(0, 1200),
    });
    return { ok: true, locationId };
  },
});

function debugLocationWritesEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.LORECRAFT_ENABLE_DEBUG_ROUTES === "1";
}

async function loadCurrentWorld(ctx: QueryCtx, worldId: Id<"worlds">) {
  const world = await ctx.db.get(worldId);
  if (!world?.currentPlayerActorId) {
    return null;
  }

  const player = await ctx.db.get(world.currentPlayerActorId);
  if (!player) {
    return null;
  }

  const room = await ctx.db.get(player.roomId);
  if (!room) {
    return null;
  }

  return { world, player, room };
}

async function loadVisibleExits(ctx: QueryCtx, worldId: Id<"worlds">, roomId: Id<"rooms">) {
  const exits = await ctx.db
    .query("exits")
    .withIndex("by_worldId_and_fromRoomId", (q) => q.eq("worldId", worldId).eq("fromRoomId", roomId))
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

async function loadLocationSummaries(ctx: QueryCtx, worldId: Id<"worlds">) {
  const [rooms, actors, objects, exits] = await Promise.all([
    ctx.db
      .query("rooms")
      .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
      .take(100),
    ctx.db
      .query("actors")
      .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
      .take(100),
    ctx.db
      .query("worldObjects")
      .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
      .take(100),
    ctx.db
      .query("exits")
      .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
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
        key: stableActorKey(actor),
        name: actor.name,
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

async function loadFeed(ctx: QueryCtx, worldId: Id<"worlds">, limit: number) {
  const [commands, narrations, events] = await Promise.all([
    ctx.db
      .query("commands")
      .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
      .order("desc")
      .take(limit),
    ctx.db
      .query("narrations")
      .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
      .order("desc")
      .take(limit),
    ctx.db
      .query("events")
      .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
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
      kind: "director" as const,
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
  ].sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
}

async function loadTranscript(ctx: QueryCtx, worldId: Id<"worlds">, limit: number) {
  const [commands, narrations] = await Promise.all([
    ctx.db
      .query("commands")
      .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
      .order("desc")
      .take(limit),
    ctx.db
      .query("narrations")
      .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
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
        kind: "director" as const,
        text: narration.text,
        source: narration.source,
        createdAt: narration._creationTime,
        ...(narration.turnId ? { turnId: narration.turnId } : {}),
        ...(narration.commandId ? { commandId: narration.commandId } : {}),
      })),
  ].sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
}

async function loadTurnSummaries(ctx: QueryCtx, worldId: Id<"worlds">, limit: number) {
  const turns = await ctx.db
    .query("turns")
    .withIndex("by_worldId_and_sequenceNumber", (q) => q.eq("worldId", worldId))
    .order("desc")
    .take(limit);

  return await Promise.all(
    turns.map(async (turn) => {
      const [command, narrations, events, stateDiffs, directorCalls] = await Promise.all([
        turn.commandId ? ctx.db.get(turn.commandId) : Promise.resolve(null),
        ctx.db
          .query("narrations")
          .withIndex("by_worldId_and_turnId", (q) => q.eq("worldId", worldId).eq("turnId", turn._id))
          .take(20),
        ctx.db
          .query("events")
          .withIndex("by_worldId_and_turnId", (q) => q.eq("worldId", worldId).eq("turnId", turn._id))
          .take(20),
        ctx.db
          .query("stateDiffs")
          .withIndex("by_worldId_and_turnId", (q) => q.eq("worldId", worldId).eq("turnId", turn._id))
          .take(20),
        ctx.db
          .query("directorCalls")
          .withIndex("by_worldId_and_turnId", (q) => q.eq("worldId", worldId).eq("turnId", turn._id))
          .order("desc")
          .take(1),
      ]);

      return {
        _id: turn._id,
        _creationTime: turn._creationTime,
        sequenceNumber: turn.sequenceNumber,
        actorId: turn.actorId,
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

async function deleteCommands(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rows = await ctx.db
    .query("commands")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("commands", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteNarrations(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rows = await ctx.db
    .query("narrations")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("narrations", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteEvents(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rows = await ctx.db
    .query("events")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("events", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteStateDiffs(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rows = await ctx.db
    .query("stateDiffs")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("stateDiffs", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteDirectorCalls(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rows = await ctx.db
    .query("directorCalls")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("directorCalls", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteDemoWorld(ctx: MutationCtx) {
  const world = await ctx.db
    .query("worlds")
    .withIndex("by_slug", (q) => q.eq("slug", WORLD_SLUG))
    .unique();
  if (!world) {
    return;
  }

  await deleteNarrations(ctx, world._id);
  await deleteEvents(ctx, world._id);
  await deleteStateDiffs(ctx, world._id);
  await deleteDirectorCalls(ctx, world._id);
  await deleteCommands(ctx, world._id);
  await deleteTurns(ctx, world._id);
  await deleteFacts(ctx, world._id);
  await deleteWorldObjects(ctx, world._id);
  await deleteExits(ctx, world._id);
  await deleteActors(ctx, world._id);
  await deleteRooms(ctx, world._id);
  await ctx.db.delete(world._id);
}

async function deleteFacts(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rows = await ctx.db
    .query("facts")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("facts", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteWorldObjects(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rows = await ctx.db
    .query("worldObjects")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("worldObjects", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteExits(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rows = await ctx.db
    .query("exits")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("exits", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteActors(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rows = await ctx.db
    .query("actors")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("actors", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteRooms(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rows = await ctx.db
    .query("rooms")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("rooms", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteTurns(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rows = await ctx.db
    .query("turns")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("turns", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

function assertDemoResetTableWithinLimit(tableName: string, rowCount: number) {
  if (rowCount <= DEMO_RESET_ROW_LIMIT) {
    return;
  }

  throw new Error(
    `Demo world reset found more than ${DEMO_RESET_ROW_LIMIT} ${tableName} rows. Reset a smaller demo dataset before reseeding.`,
  );
}
