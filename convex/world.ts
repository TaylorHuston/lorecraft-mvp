import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type FactValue = string | number | boolean | null;
type DatabaseCtx = MutationCtx | QueryCtx;

const WORLD_SLUG = "stormbound-chapel";
const PLAYER_KEY = "taylor";
const MIRA_KEY = "mira";
const MIRA_BASELINE_FACTS = [
  { key: "mood", value: "watchful" },
  { key: "status", value: "waiting near the chapel aisle" },
  { key: "memory", value: "Mira has not yet formed any meaningful memories of Taylor." },
] as const;
const MIRA_READ_ONLY_FACTS = [
  {
    key: "knows_about_storm",
    value:
      "Mira knows the storm began after the chapel bell rang at midnight, and she is afraid to say that too plainly.",
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
const ignoredNpcUpdate = v.object({
  actorKey: v.optional(v.string()),
  field: v.optional(v.string()),
  reason: v.string(),
  valuePreview: v.optional(v.string()),
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

async function ensureSeedState(ctx: MutationCtx, worldId: Id<"worlds">) {
  const chapel = await findRoomByKey(ctx, worldId, "chapel");
  const player = await findActorByKeyOrName(ctx, worldId, PLAYER_KEY, "Taylor");
  const mira = await findActorByKeyOrName(ctx, worldId, MIRA_KEY, "Mira");
  const world = await ctx.db.get(worldId);

  if (player && !player.key) {
    await ctx.db.patch(player._id, { key: PLAYER_KEY });
  }
  if (mira && !mira.key) {
    await ctx.db.patch(mira._id, { key: MIRA_KEY });
  }
  if (world && !world.currentPlayerActorId && player) {
    await ctx.db.patch(worldId, { currentPlayerActorId: player._id });
  }
  if (chapel && player && !player.roomId) {
    await ctx.db.patch(player._id, { roomId: chapel._id });
  }
  if (mira) {
    for (const fact of [...MIRA_BASELINE_FACTS, ...MIRA_READ_ONLY_FACTS]) {
      await setFact(ctx, {
        worldId,
        subjectType: "actor",
        subjectId: actorSubjectId(MIRA_KEY),
        key: fact.key,
        value: fact.value,
        source: "seed",
        overwrite: false,
      });
    }
  }
}

export const seedDemoWorld = mutation({
  args: {},
  returns: v.id("worlds"),
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("worlds")
      .withIndex("by_slug", (q) => q.eq("slug", WORLD_SLUG))
      .unique();

    if (existing) {
      await ensureSeedState(ctx, existing._id);
      return existing._id;
    }

    const worldId = await ctx.db.insert("worlds", {
      slug: WORLD_SLUG,
      name: "Stormbound Chapel",
      description:
        "A small persistent-world test set around a chapel, a vestry, and a rain-lashed graveyard.",
    });

    const chapelId = await ctx.db.insert("rooms", {
      worldId,
      key: "chapel",
      name: "Chapel",
      description:
        "Rain taps against warped shutters. A cracked lantern hangs beside a stone altar, and Mira waits near the aisle.",
    });
    const vestryId = await ctx.db.insert("rooms", {
      worldId,
      key: "vestry",
      name: "Vestry",
      description:
        "The vestry smells of old paper and damp wool. A narrow desk sits under shelves of hymnals.",
    });
    const graveyardId = await ctx.db.insert("rooms", {
      worldId,
      key: "graveyard",
      name: "Graveyard",
      description: "Tilted stones vanish into the rain. The chapel door glows behind you.",
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
      description: "A careful local who watches the storm and notices when the chapel changes.",
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
      ...MIRA_READ_ONLY_FACTS.map((fact) =>
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
    const [exits, actors, objects, facts, events, narrations, diffs, directorCalls, turns, feed] =
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
      exits,
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
          key: v.string(),
          name: v.string(),
          role: actorRole,
          description: v.string(),
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
      recentFeed: v.array(feedEntry),
    }),
  ),
  handler: async (ctx, args) => {
    const loaded = await loadCurrentWorld(ctx, args.worldId);
    if (!loaded) {
      return null;
    }

    const { world, player, room } = loaded;
    const [exits, actors, objects, facts, recentFeed] = await Promise.all([
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
    ]);

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
          key: actorKey,
          name: actor.name,
          role: actor.role,
          description: actor.description,
          facts: facts
            .filter((fact) => fact.subjectId === actorSubjectId(actorKey))
            .map((fact) => ({
              key: fact.key,
              value: fact.value,
              source: fact.source,
            })),
        };
      }),
      objects: objects
        .filter((object) => object.visible)
        .map((object) => ({
          key: object.key,
          name: object.name,
          description: object.description,
        })),
      recentFeed,
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

      const eventText = `${update.actorName}'s state changed after the exchange.`;
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

    await ctx.db.patch(args.turnId, { status: "succeeded", completedAt: Date.now() });

    return { directorCallId, narrationId, changedFacts };
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
  }),
  handler: async (ctx, args) => {
    const deletedNarrations = await deleteNarrations(ctx, args.worldId);
    const deletedEvents = await deleteEvents(ctx, args.worldId);
    const deletedStateDiffs = await deleteStateDiffs(ctx, args.worldId);
    const deletedDirectorCalls = await deleteDirectorCalls(ctx, args.worldId);
    const deletedCommands = await deleteCommands(ctx, args.worldId);
    const deletedTurns = await deleteTurns(ctx, args.worldId);

    const mira = await findActorByKeyOrName(ctx, args.worldId, MIRA_KEY, "Mira");
    let restoredFacts = 0;
    if (mira) {
      if (!mira.key) {
        await ctx.db.patch(mira._id, { key: MIRA_KEY });
      }
      for (const fact of MIRA_BASELINE_FACTS) {
        await setFact(ctx, {
          worldId: args.worldId,
          subjectType: "actor",
          subjectId: actorSubjectId(MIRA_KEY),
          key: fact.key,
          value: fact.value,
          source: "seed",
          overwrite: true,
        });
        restoredFacts += 1;
      }
    }

    return {
      deletedTurns,
      deletedCommands,
      deletedNarrations,
      deletedEvents,
      deletedStateDiffs,
      deletedDirectorCalls,
      restoredFacts,
    };
  },
});

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
          toRoomName: toRoom?.name ?? "Unknown",
        };
      }),
  );
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
    .take(500);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteNarrations(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rows = await ctx.db
    .query("narrations")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(500);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteEvents(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rows = await ctx.db
    .query("events")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(500);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteStateDiffs(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rows = await ctx.db
    .query("stateDiffs")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(500);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteDirectorCalls(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rows = await ctx.db
    .query("directorCalls")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(500);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteTurns(ctx: MutationCtx, worldId: Id<"worlds">) {
  const rows = await ctx.db
    .query("turns")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(500);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}
