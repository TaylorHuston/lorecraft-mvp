import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

type FactValue = string | number | boolean | null;

function normalized(input: string) {
  return input.trim().toLowerCase();
}

function objectSubjectId(objectId: Id<"worldObjects">) {
  return `object:${objectId}`;
}

function actorSubjectId(actorId: Id<"actors">) {
  return `actor:${actorId}`;
}

export const seedDemoWorld = mutation({
  args: {},
  returns: v.id("worlds"),
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("worlds")
      .withIndex("by_slug", (q) => q.eq("slug", "stormbound-chapel"))
      .unique();

    if (existing) {
      return existing._id;
    }

    const worldId = await ctx.db.insert("worlds", {
      slug: "stormbound-chapel",
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
      description:
        "Tilted stones vanish into the rain. The chapel door glows behind you.",
    });

    await ctx.db.insert("exits", {
      worldId,
      fromRoomId: chapelId,
      toRoomId: vestryId,
      label: "west",
      visible: true,
    });
    await ctx.db.insert("exits", {
      worldId,
      fromRoomId: vestryId,
      toRoomId: chapelId,
      label: "east",
      visible: true,
    });
    await ctx.db.insert("exits", {
      worldId,
      fromRoomId: chapelId,
      toRoomId: graveyardId,
      label: "north",
      visible: true,
    });
    await ctx.db.insert("exits", {
      worldId,
      fromRoomId: graveyardId,
      toRoomId: chapelId,
      label: "south",
      visible: true,
    });

    const playerId = await ctx.db.insert("actors", {
      worldId,
      roomId: chapelId,
      name: "Taylor",
      role: "player",
      description: "The playtester exploring whether the world remembers.",
    });
    const miraId = await ctx.db.insert("actors", {
      worldId,
      roomId: chapelId,
      name: "Mira",
      role: "npc",
      description:
        "A careful local who watches the storm and notices when the chapel changes.",
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
      ctx.db.insert("facts", {
        worldId,
        subjectType: "object",
        subjectId: objectSubjectId(shuttersId),
        key: "open",
        value: false,
        source: "seed",
      }),
      ctx.db.insert("facts", {
        worldId,
        subjectType: "object",
        subjectId: objectSubjectId(lanternId),
        key: "broken",
        value: false,
        source: "seed",
      }),
      ctx.db.insert("facts", {
        worldId,
        subjectType: "object",
        subjectId: objectSubjectId(altarId),
        key: "marked_with_chalk",
        value: false,
        source: "seed",
      }),
      ctx.db.insert("facts", {
        worldId,
        subjectType: "actor",
        subjectId: actorSubjectId(miraId),
        key: "knows_about_storm",
        value: true,
        source: "seed",
      }),
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
      .withIndex("by_slug", (q) => q.eq("slug", "stormbound-chapel"))
      .unique();
    return world?._id ?? null;
  },
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
        name: v.string(),
        roomId: v.id("rooms"),
      }),
      room: v.object({
        _id: v.id("rooms"),
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
          name: v.string(),
          description: v.string(),
          role: v.union(v.literal("player"), v.literal("npc")),
        }),
      ),
      objects: v.array(
        v.object({
          _id: v.id("worldObjects"),
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
          value: v.union(v.string(), v.number(), v.boolean(), v.null()),
          source: v.string(),
        }),
      ),
      events: v.array(v.object({ _id: v.id("events"), text: v.string(), source: v.string() })),
      narrations: v.array(v.object({ _id: v.id("narrations"), text: v.string(), source: v.string() })),
      diffs: v.array(
        v.object({
          _id: v.id("stateDiffs"),
          source: v.string(),
          operations: v.array(v.any()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
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

    const exits = await ctx.db
      .query("exits")
      .withIndex("by_worldId_and_fromRoomId", (q) =>
        q.eq("worldId", args.worldId).eq("fromRoomId", room._id),
      )
      .take(20);
    const visibleExits = exits.filter((exit) => exit.visible);

    const exitsWithRooms = await Promise.all(
      visibleExits.map(async (exit) => {
        const toRoom = await ctx.db.get(exit.toRoomId);
        return {
          _id: exit._id,
          label: exit.label,
          toRoomName: toRoom?.name ?? "Unknown",
        };
      }),
    );

    const actors = await ctx.db
      .query("actors")
      .withIndex("by_worldId_and_roomId", (q) =>
        q.eq("worldId", args.worldId).eq("roomId", room._id),
      )
      .take(20);
    const objects = await ctx.db
      .query("worldObjects")
      .withIndex("by_worldId_and_roomId", (q) =>
        q.eq("worldId", args.worldId).eq("roomId", room._id),
      )
      .take(30);
    const facts = await ctx.db
      .query("facts")
      .withIndex("by_worldId", (q) => q.eq("worldId", args.worldId))
      .order("desc")
      .take(40);
    const events = await ctx.db
      .query("events")
      .withIndex("by_worldId", (q) => q.eq("worldId", args.worldId))
      .order("desc")
      .take(10);
    const narrations = await ctx.db
      .query("narrations")
      .withIndex("by_worldId", (q) => q.eq("worldId", args.worldId))
      .order("desc")
      .take(10);
    const diffs = await ctx.db
      .query("stateDiffs")
      .withIndex("by_worldId", (q) => q.eq("worldId", args.worldId))
      .order("desc")
      .take(8);

    return {
      world: {
        _id: world._id,
        name: world.name,
        description: world.description,
      },
      player: {
        _id: player._id,
        name: player.name,
        roomId: player.roomId,
      },
      room: {
        _id: room._id,
        name: room.name,
        description: room.description,
      },
      exits: exitsWithRooms,
      actors: actors.map((actor) => ({
        _id: actor._id,
        name: actor.name,
        description: actor.description,
        role: actor.role,
      })),
      objects: objects
        .filter((object) => object.visible)
        .map((object) => ({
          _id: object._id,
          name: object.name,
          description: object.description,
        })),
      facts,
      events,
      narrations,
      diffs: diffs.map((diff) => ({
        _id: diff._id,
        source: diff.source,
        operations: diff.operations,
      })),
    };
  },
});

async function upsertFact(
  ctx: MutationCtx,
  args: {
    worldId: Id<"worlds">;
    subjectType: "world" | "room" | "actor" | "object" | "exit";
    subjectId: string;
    key: string;
    value: FactValue;
  },
) {
  const existing = await ctx.db
    .query("facts")
    .withIndex("by_worldId_and_subjectId_and_key", (q) =>
      q.eq("worldId", args.worldId).eq("subjectId", args.subjectId).eq("key", args.key),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, { value: args.value, source: "player" });
    return existing._id;
  }

  return await ctx.db.insert("facts", {
    worldId: args.worldId,
    subjectType: args.subjectType,
    subjectId: args.subjectId,
    key: args.key,
    value: args.value,
    source: "player",
  });
}

export const submitCommand = mutation({
  args: { worldId: v.id("worlds"), input: v.string() },
  returns: v.object({
    narration: v.string(),
    accepted: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const input = args.input.trim();
    if (!input) {
      return { narration: "Enter a command to continue.", accepted: false };
    }

    const world = await ctx.db.get(args.worldId);
    if (!world?.currentPlayerActorId) {
      return { narration: "No active player exists in this world yet.", accepted: false };
    }

    const player = await ctx.db.get(world.currentPlayerActorId);
    if (!player) {
      return { narration: "The active player could not be loaded.", accepted: false };
    }

    const currentRoom = await ctx.db.get(player.roomId);
    if (!currentRoom) {
      return { narration: "The current room could not be loaded.", accepted: false };
    }

    const normalizedInput = normalized(input);
    const commandId = await ctx.db.insert("commands", {
      worldId: args.worldId,
      actorId: player._id,
      input,
      normalizedInput,
    });

    if (normalizedInput === "look" || normalizedInput === "look around") {
      const narration = `You are in ${currentRoom.name}. ${currentRoom.description}`;
      await ctx.db.insert("narrations", {
        worldId: args.worldId,
        commandId,
        text: narration,
        source: "engine",
      });
      return { narration, accepted: true };
    }

    const destination = normalizedInput.replace(/^go\s+/, "").replace(/^walk\s+/, "");
    if (destination !== normalizedInput) {
      const exits = await ctx.db
        .query("exits")
        .withIndex("by_worldId_and_fromRoomId", (q) =>
          q.eq("worldId", args.worldId).eq("fromRoomId", currentRoom._id),
        )
        .take(20);
      const exit = exits.find((candidate) => candidate.visible && candidate.label === destination);

      if (!exit) {
        const narration = `There is no visible route from ${currentRoom.name} labeled "${destination}".`;
        await ctx.db.insert("narrations", {
          worldId: args.worldId,
          commandId,
          text: narration,
          source: "engine",
        });
        return { narration, accepted: false };
      }

      const toRoom = await ctx.db.get(exit.toRoomId);
      await ctx.db.patch(player._id, { roomId: exit.toRoomId });
      const eventText = `${player.name} went ${exit.label} to ${toRoom?.name ?? "another room"}.`;
      const narration = `You go ${exit.label} to ${toRoom?.name ?? "the next room"}. ${
        toRoom?.description ?? ""
      }`;
      await Promise.all([
        ctx.db.insert("events", {
          worldId: args.worldId,
          commandId,
          text: eventText,
          source: "engine",
        }),
        ctx.db.insert("stateDiffs", {
          worldId: args.worldId,
          commandId,
          source: "engine",
          operations: [
            { op: "moveActor", actorId: player._id, toRoomId: exit.toRoomId },
            { op: "appendEvent", text: eventText },
          ],
        }),
        ctx.db.insert("narrations", {
          worldId: args.worldId,
          commandId,
          text: narration,
          source: "engine",
        }),
      ]);
      return { narration, accepted: true };
    }

    const objects = await ctx.db
      .query("worldObjects")
      .withIndex("by_worldId_and_roomId", (q) =>
        q.eq("worldId", args.worldId).eq("roomId", currentRoom._id),
      )
      .take(30);

    const knownObject = objects.find((object) =>
      normalizedInput.includes(object.key.toLowerCase()),
    );

    if (knownObject && normalizedInput.includes("open")) {
      await upsertFact(ctx, {
        worldId: args.worldId,
        subjectType: "object",
        subjectId: objectSubjectId(knownObject._id),
        key: "open",
        value: true,
      });
      const eventText = `${player.name} opened ${knownObject.name}.`;
      const narration = `You open ${knownObject.name}. The world records that change.`;
      await Promise.all([
        ctx.db.insert("events", { worldId: args.worldId, commandId, text: eventText, source: "player" }),
        ctx.db.insert("stateDiffs", {
          worldId: args.worldId,
          commandId,
          source: "player",
          operations: [
            {
              op: "setFact",
              subjectType: "object",
              subjectId: objectSubjectId(knownObject._id),
              key: "open",
              value: true,
            },
            { op: "appendEvent", text: eventText },
          ],
        }),
        ctx.db.insert("narrations", { worldId: args.worldId, commandId, text: narration, source: "engine" }),
      ]);
      return { narration, accepted: true };
    }

    if (knownObject && (normalizedInput.includes("break") || normalizedInput.includes("smash"))) {
      await upsertFact(ctx, {
        worldId: args.worldId,
        subjectType: "object",
        subjectId: objectSubjectId(knownObject._id),
        key: "broken",
        value: true,
      });
      const eventText = `${player.name} broke ${knownObject.name}.`;
      const narration = `You break ${knownObject.name}. The fact is now part of the world state.`;
      await Promise.all([
        ctx.db.insert("events", { worldId: args.worldId, commandId, text: eventText, source: "player" }),
        ctx.db.insert("stateDiffs", {
          worldId: args.worldId,
          commandId,
          source: "player",
          operations: [
            {
              op: "setFact",
              subjectType: "object",
              subjectId: objectSubjectId(knownObject._id),
              key: "broken",
              value: true,
            },
            { op: "appendEvent", text: eventText },
          ],
        }),
        ctx.db.insert("narrations", { worldId: args.worldId, commandId, text: narration, source: "engine" }),
      ]);
      return { narration, accepted: true };
    }

    if (knownObject && (normalizedInput.includes("mark") || normalizedInput.includes("chalk"))) {
      await upsertFact(ctx, {
        worldId: args.worldId,
        subjectType: "object",
        subjectId: objectSubjectId(knownObject._id),
        key: "marked_with_chalk",
        value: true,
      });
      const eventText = `${player.name} marked ${knownObject.name} with chalk.`;
      const narration = `You mark ${knownObject.name} with chalk. The mark persists as a fact.`;
      await Promise.all([
        ctx.db.insert("events", { worldId: args.worldId, commandId, text: eventText, source: "player" }),
        ctx.db.insert("stateDiffs", {
          worldId: args.worldId,
          commandId,
          source: "player",
          operations: [
            {
              op: "setFact",
              subjectType: "object",
              subjectId: objectSubjectId(knownObject._id),
              key: "marked_with_chalk",
              value: true,
            },
            { op: "appendEvent", text: eventText },
          ],
        }),
        ctx.db.insert("narrations", { worldId: args.worldId, commandId, text: narration, source: "engine" }),
      ]);
      return { narration, accepted: true };
    }

    const npcs = await ctx.db
      .query("actors")
      .withIndex("by_worldId_and_roomId", (q) =>
        q.eq("worldId", args.worldId).eq("roomId", currentRoom._id),
      )
      .take(20);
    const npc = npcs.find(
      (actor): actor is Doc<"actors"> =>
        actor.role === "npc" && normalizedInput.includes(actor.name.toLowerCase()),
    );

    if (npc && (normalizedInput.includes("talk") || normalizedInput.includes("ask"))) {
      const narration = `${npc.name} says, "I remember what changes here. Try opening the shutters, breaking the lantern, or marking the altar."`;
      await ctx.db.insert("narrations", {
        worldId: args.worldId,
        commandId,
        text: narration,
        source: "engine",
      });
      return { narration, accepted: true };
    }

    const narration =
      "That command is recorded, but this scaffold only resolves look, go <exit>, NPC talk, and simple object changes for now.";
    await ctx.db.insert("narrations", {
      worldId: args.worldId,
      commandId,
      text: narration,
      source: "engine",
    });
    return { narration, accepted: false };
  },
});
