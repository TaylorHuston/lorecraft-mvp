import { v } from "convex/values";
import {
  action,
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  DEFAULT_ADVENTURE_SLUG,
  NPC_PROFILE_FACT_KEYS_FOR_WRITE,
  TUTORIAL_WORLD_SLUG,
  WORLD_SLUG,
  buildStormboundBaseline,
  buildTutorialBaseline,
  type AdventureBaseline,
} from "../src/lib/world/stormbound-baseline";
import {
  baselineNpcLegacyFactKeys,
  countDebugCreatedLocationKeys,
  countDebugCreatedNpcKeys,
  findBaselineNpc,
} from "../src/lib/world/adventure-baseline";
import {
  loadSnapshotReadModel,
} from "../src/lib/world/convex-snapshot-read-model";
import {
  loadDirectorContextReadModel,
  loadTranscriptDirectorContextReadModel,
} from "../src/lib/world/convex-director-context";
import {
  applyAcceptedActorMoves as applyAcceptedActorMovesToTurn,
  applyAcceptedNpcUpdates as applyAcceptedNpcUpdatesToTurn,
  type FactValue,
} from "../src/lib/world/convex-turn-persistence";

type DatabaseCtx = MutationCtx | QueryCtx;
type DebugLocationWriteResult = {
  ok: boolean;
  error?: string;
  locationId?: Id<"rooms">;
};
type DebugNpcWriteResult = {
  ok: boolean;
  error?: string;
  actorId?: Id<"actors">;
};

const DEMO_RESET_ROW_LIMIT = 500;
const DEBUG_CREATED_LOCATION_LIMIT = 25;
const DEBUG_CREATED_NPC_LIMIT = 25;
const STORY_INSERT_MAX_LENGTH = 4000;
const GUIDE_GUIDANCE_MAX_LENGTH = 1200;

const factValue = v.union(v.string(), v.number(), v.boolean(), v.null());
const actorRole = v.union(v.literal("player"), v.literal("npc"));
const feedKind = v.union(
  v.literal("player"),
  v.literal("story"),
  v.literal("director"),
  v.literal("event"),
  v.literal("utility"),
);
const turnTrigger = v.union(v.literal("act"), v.literal("pass"), v.literal("guide"));
const directorStatus = v.union(
  v.literal("success"),
  v.literal("provider_error"),
  v.literal("invalid_output"),
);
const utilityStatus = v.union(v.literal("success"), v.literal("error"));
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
const npcDebugFacts = v.object({
  background: v.optional(v.string()),
  persona: v.optional(v.string()),
  voice: v.optional(v.string()),
  mood: v.optional(v.string()),
  status: v.optional(v.string()),
  memory: v.optional(v.string()),
  knowledge: v.optional(v.string()),
});
const debugNpcWriteResult = v.object({
  ok: v.boolean(),
  error: v.optional(v.string()),
  actorId: v.optional(v.id("actors")),
});
const adventureCreateResult = v.union(
  v.object({ ok: v.literal(true), adventureId: v.id("adventures") }),
  v.object({ ok: v.literal(false), error: v.string() }),
);
const adventureDeleteResult = v.union(
  v.object({
    ok: v.literal(true),
    deletedAdventureId: v.id("adventures"),
    deletedTurns: v.number(),
    deletedCommands: v.number(),
    deletedNarrations: v.number(),
    deletedEvents: v.number(),
    deletedUtilityMessages: v.number(),
    deletedStateDiffs: v.number(),
    deletedDirectorCalls: v.number(),
    deletedFacts: v.number(),
    deletedObjects: v.number(),
    deletedExits: v.number(),
    deletedActors: v.number(),
    deletedLocations: v.number(),
  }),
  v.object({ ok: v.literal(false), error: v.string() }),
);
const adventureListItem = v.object({
  worldId: v.id("worlds"),
  _id: v.id("adventures"),
  name: v.string(),
  worldName: v.string(),
  sourceVersionNumber: v.number(),
  currentLocationName: v.optional(v.string()),
  turnCount: v.number(),
  lastPlayedAt: v.number(),
});
const worldContainerItem = v.object({
  _id: v.id("worlds"),
  name: v.string(),
  description: v.string(),
  sourceVersionNumber: v.number(),
  adventures: v.array(adventureListItem),
});
const worldVersionCreateResult = v.union(
  v.object({ ok: v.literal(true), worldVersionId: v.id("worldVersions") }),
  v.object({ ok: v.literal(false), error: v.string() }),
);
const storyInsertResult = v.union(
  v.object({ ok: v.literal(true), narrationId: v.id("narrations") }),
  v.object({ ok: v.literal(false), error: v.string() }),
);

function normalized(input: string) {
  return input.trim().toLowerCase();
}

function validatePlayerAuthoredText(
  value: string,
  args: { label: string; maxLength: number },
): { ok: true; text: string } | { ok: false; error: string } {
  const text = value.trim();
  if (!text) {
    return { ok: false, error: `${args.label} is required.` };
  }
  if (!/[A-Za-z0-9]/.test(text)) {
    return { ok: false, error: `${args.label} must include words or numbers.` };
  }
  if (text.length > args.maxLength) {
    return { ok: false, error: `${args.label} must be ${args.maxLength} characters or less.` };
  }
  return { ok: true, text };
}

function actorSubjectId(actorKey: string) {
  return `actor:${actorKey}`;
}

function objectSubjectId(objectId: Id<"worldObjects">) {
  return `object:${objectId}`;
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function stableActorKey(actor: { key?: string; name: string }) {
  return actor.key ?? normalized(actor.name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function findRoomByKey(ctx: DatabaseCtx, adventureId: Id<"adventures">, key: string) {
  return await ctx.db
    .query("rooms")
    .withIndex("by_adventureId_and_key", (q) =>
      q.eq("adventureId", adventureId).eq("key", key),
    )
    .unique();
}

async function findActorByKeyOrName(
  ctx: DatabaseCtx,
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

async function setFact(
  ctx: MutationCtx,
  args: {
    worldId: Id<"worlds">;
    adventureId: Id<"adventures">;
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
    .withIndex("by_adventureId_and_subjectId_and_key", (q) =>
      q.eq("adventureId", args.adventureId).eq("subjectId", args.subjectId).eq("key", args.key),
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
    adventureId: args.adventureId,
    subjectType: args.subjectType,
    subjectId: args.subjectId,
    key: args.key,
    value: args.value,
    source: args.source,
  });
}

async function createAdventureFromBaseline(
  ctx: MutationCtx,
  args: {
    slug: string;
    name: string;
    worldId: Id<"worlds">;
    worldVersionId: Id<"worldVersions">;
    baseline: AdventureBaseline;
  },
) {
  const adventureId = await ctx.db.insert("adventures", {
    slug: args.slug,
    worldId: args.worldId,
    worldVersionId: args.worldVersionId,
    name: args.name,
  });

  await copyBaselineRuntimeRows(ctx, {
    worldId: args.worldId,
    worldVersionId: args.worldVersionId,
    adventureId,
    baseline: args.baseline,
  });
  return adventureId;
}

async function ensureSeededWorldVersion(
  ctx: MutationCtx,
  args: {
    slug: string;
    baseline: AdventureBaseline;
  },
) {
  const existingWorld = await ctx.db
    .query("worlds")
    .withIndex("by_slug", (q) => q.eq("slug", args.slug))
    .unique();

  if (existingWorld?.currentWorldVersionId) {
    const existingVersion = await ctx.db.get(existingWorld.currentWorldVersionId);
    if (existingVersion) {
      return {
        worldId: existingWorld._id,
        worldVersionId: existingVersion._id,
        baseline: existingVersion.baseline as AdventureBaseline,
      };
    }
  }

  const worldId =
    existingWorld?._id ??
    (await ctx.db.insert("worlds", {
      slug: args.slug,
      name: args.baseline.world.name,
      description: args.baseline.world.description,
    }));

  const latest = await ctx.db
    .query("worldVersions")
    .withIndex("by_worldId_and_versionNumber", (q) => q.eq("worldId", worldId))
    .order("desc")
    .take(1);
  if (latest[0]) {
    await ctx.db.patch(worldId, { currentWorldVersionId: latest[0]._id });
    return {
      worldId,
      worldVersionId: latest[0]._id,
      baseline: latest[0].baseline as AdventureBaseline,
    };
  }

  const worldVersionId = await ctx.db.insert("worldVersions", {
    worldId,
    versionNumber: 1,
    name: args.baseline.world.name,
    description: args.baseline.world.description,
    baseline: args.baseline,
  });
  await ctx.db.patch(worldId, { currentWorldVersionId: worldVersionId });

  return { worldId, worldVersionId, baseline: args.baseline };
}

async function ensureDemoWorldVersion(ctx: MutationCtx) {
  return await ensureSeededWorldVersion(ctx, {
    slug: WORLD_SLUG,
    baseline: buildStormboundBaseline(),
  });
}

async function ensureTutorialWorldVersion(ctx: MutationCtx) {
  return await ensureSeededWorldVersion(ctx, {
    slug: TUTORIAL_WORLD_SLUG,
    baseline: buildTutorialBaseline(),
  });
}

async function nextAdventureIdentity(
  ctx: MutationCtx,
  worldId: Id<"worlds">,
  worldName: string,
  preferredName?: string,
) {
  const adventures = await ctx.db
    .query("adventures")
    .withIndex("by_worldId", (q) => q.eq("worldId", worldId))
    .take(100);
  const ordinal = adventures.length + 1;
  const name = preferredName?.trim().slice(0, 120) || `${worldName} Adventure ${ordinal}`;
  const baseSlug = slugify(name) || `${slugify(worldName) || "adventure"}-${ordinal}`;

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const slug = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
    const existing = await ctx.db
      .query("adventures")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!existing) {
      return { name, slug };
    }
  }

  return {
    name,
    slug: `${baseSlug}-${adventures.length + 101}`,
  };
}

async function copyBaselineRuntimeRows(
  ctx: MutationCtx,
  args: {
    worldId: Id<"worlds">;
    worldVersionId: Id<"worldVersions">;
    adventureId: Id<"adventures">;
    baseline: AdventureBaseline;
  },
) {
  const roomsByKey = new Map<string, Id<"rooms">>();
  for (const room of args.baseline.rooms) {
    const roomId = await ctx.db.insert("rooms", {
      worldId: args.worldId,
      adventureId: args.adventureId,
      key: room.key,
      name: room.name,
      description: room.description,
    });
    roomsByKey.set(room.key, roomId);
  }

  for (const exit of args.baseline.exits) {
    const fromRoomId = roomsByKey.get(exit.fromRoomKey);
    const toRoomId = roomsByKey.get(exit.toRoomKey);
    if (!fromRoomId || !toRoomId) {
      continue;
    }
    await ctx.db.insert("exits", {
      worldId: args.worldId,
      adventureId: args.adventureId,
      fromRoomId,
      toRoomId,
      label: exit.label,
      visible: exit.visible,
    });
  }

  const playerRoomId = roomsByKey.get(args.baseline.player.roomKey);
  if (!playerRoomId) {
    throw new Error("Adventure baseline is missing the player starting room.");
  }
  const playerId = await ctx.db.insert("actors", {
    worldId: args.worldId,
    adventureId: args.adventureId,
    roomId: playerRoomId,
    key: args.baseline.player.key,
    name: args.baseline.player.name,
    role: "player",
    description: args.baseline.player.description,
  });
  await ctx.db.patch(args.adventureId, { currentPlayerActorId: playerId });

  for (const npc of args.baseline.npcs) {
    const roomId = roomsByKey.get(npc.roomKey);
    if (!roomId) {
      continue;
    }
    await ctx.db.insert("actors", {
      worldId: args.worldId,
      adventureId: args.adventureId,
      roomId,
      key: npc.key,
      name: npc.name,
      role: "npc",
      description: npc.description,
    });
    for (const fact of npc.facts) {
      await setFact(ctx, {
        worldId: args.worldId,
        adventureId: args.adventureId,
        subjectType: "actor",
        subjectId: actorSubjectId(npc.key),
        key: fact.key,
        value: fact.value,
        source: "seed",
        overwrite: false,
      });
    }
  }

  for (const object of args.baseline.objects) {
    const roomId = roomsByKey.get(object.roomKey);
    if (!roomId) {
      continue;
    }
    const objectId = await ctx.db.insert("worldObjects", {
      worldId: args.worldId,
      adventureId: args.adventureId,
      roomId,
      key: object.key,
      name: object.name,
      description: object.description,
      visible: object.visible,
    });
    for (const fact of object.facts) {
      await setFact(ctx, {
        worldId: args.worldId,
        adventureId: args.adventureId,
        subjectType: "object",
        subjectId: objectSubjectId(objectId),
        key: fact.key,
        value: fact.value,
        source: "seed",
        overwrite: false,
      });
    }
  }

  await ctx.db.insert("events", {
    worldId: args.worldId,
    adventureId: args.adventureId,
    text: args.baseline.initialEvent,
    source: "seed",
  });
  await ctx.db.insert("narrations", {
    worldId: args.worldId,
    adventureId: args.adventureId,
    text: args.baseline.initialNarration,
    source: "seed",
  });
}

async function deleteActorFactByKey(
  ctx: MutationCtx,
  adventureId: Id<"adventures">,
  actorKey: string,
  key: string,
) {
  const existing = await ctx.db
    .query("facts")
    .withIndex("by_adventureId_and_subjectId_and_key", (q) =>
      q.eq("adventureId", adventureId).eq("subjectId", actorSubjectId(actorKey)).eq("key", key),
    )
    .unique();

  if (existing) {
    await ctx.db.delete(existing._id);
  }
}

async function deleteActorFacts(ctx: MutationCtx, adventureId: Id<"adventures">, actorKey: string) {
  const rows = await ctx.db
    .query("facts")
    .withIndex("by_adventureId_and_subjectId", (q) =>
      q.eq("adventureId", adventureId).eq("subjectId", actorSubjectId(actorKey)),
    )
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("facts", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function restoreSeededNpc(
  ctx: MutationCtx,
  args: {
    worldId: Id<"worlds">;
    adventureId: Id<"adventures">;
    key: string;
    name: string;
    description: string;
    facts: readonly { key: string; value: FactValue }[];
    legacyFactKeys?: readonly string[];
  },
) {
  const actor = await findActorByKeyOrName(ctx, args.adventureId, args.key, args.name);
  if (!actor) {
    return 0;
  }

  await ctx.db.patch(actor._id, {
    key: args.key,
    name: args.name,
    description: args.description,
  });

  for (const key of args.legacyFactKeys ?? []) {
    await deleteActorFactByKey(ctx, args.adventureId, args.key, key);
  }

  for (const fact of args.facts) {
    await setFact(ctx, {
      worldId: args.worldId,
      adventureId: args.adventureId,
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

export const seedDemoWorld = mutation({
  args: {},
  returns: v.id("adventures"),
  handler: async (ctx) => {
    await deleteDemoWorld(ctx);

    const baseline = buildStormboundBaseline();
    const worldId = await ctx.db.insert("worlds", {
      slug: WORLD_SLUG,
      name: baseline.world.name,
      description: baseline.world.description,
    });

    const worldVersionId = await ctx.db.insert("worldVersions", {
      worldId,
      versionNumber: 1,
      name: baseline.world.name,
      description: baseline.world.description,
      baseline,
    });

    await ctx.db.patch(worldId, { currentWorldVersionId: worldVersionId });
    const adventureId = await createAdventureFromBaseline(ctx, {
      slug: DEFAULT_ADVENTURE_SLUG,
      name: "Stormbound Chapel",
      worldId,
      worldVersionId,
      baseline,
    });
    await ensureTutorialWorldVersion(ctx);

    return adventureId;
  },
});

export const getDefaultAdventure = query({
  args: {},
  returns: v.union(v.null(), v.id("adventures")),
  handler: async (ctx) => {
    const adventure = await ctx.db
      .query("adventures")
      .withIndex("by_slug", (q) => q.eq("slug", DEFAULT_ADVENTURE_SLUG))
      .unique();
    return adventure?._id ?? null;
  },
});

export const listAdventures = query({
  args: {},
  returns: v.array(adventureListItem),
  handler: async (ctx) => {
    const worlds = (
      await Promise.all([
        ctx.db.query("worlds").withIndex("by_slug", (q) => q.eq("slug", WORLD_SLUG)).unique(),
        ctx.db
          .query("worlds")
          .withIndex("by_slug", (q) => q.eq("slug", TUTORIAL_WORLD_SLUG))
          .unique(),
      ])
    ).filter((world): world is Doc<"worlds"> => Boolean(world));

    const nestedItems = await Promise.all(
      worlds.map(async (world) => {
        const adventures = await ctx.db
          .query("adventures")
          .withIndex("by_worldId", (q) => q.eq("worldId", world._id))
          .take(50);

        return await Promise.all(
          adventures.map(async (adventure) => {
            const sourceVersion = await ctx.db.get(adventure.worldVersionId);
            const player = adventure.currentPlayerActorId
              ? await ctx.db.get(adventure.currentPlayerActorId)
              : null;
            const currentRoom = player ? await ctx.db.get(player.roomId) : null;
            const latestTurn = await ctx.db
              .query("turns")
              .withIndex("by_adventureId_and_sequenceNumber", (q) =>
                q.eq("adventureId", adventure._id),
              )
              .order("desc")
              .take(1);
            const turnCount = latestTurn[0]?.sequenceNumber ?? 0;

            return {
              _id: adventure._id,
              worldId: world._id,
              name: adventure.name,
              worldName: world.name,
              sourceVersionNumber: sourceVersion?.versionNumber ?? 0,
              currentLocationName: currentRoom?.name,
              turnCount,
              lastPlayedAt:
                latestTurn[0]?.completedAt ?? latestTurn[0]?._creationTime ?? adventure._creationTime,
            };
          }),
        );
      }),
    );
    const items = nestedItems.flat();

    return items.sort((left, right) => right.lastPlayedAt - left.lastPlayedAt);
  },
});

export const listWorldContainers = query({
  args: {},
  returns: v.array(worldContainerItem),
  handler: async (ctx) => {
    const seededWorlds = (
      await Promise.all([
        ctx.db.query("worlds").withIndex("by_slug", (q) => q.eq("slug", WORLD_SLUG)).unique(),
        ctx.db
          .query("worlds")
          .withIndex("by_slug", (q) => q.eq("slug", TUTORIAL_WORLD_SLUG))
          .unique(),
      ])
    ).filter((world): world is Doc<"worlds"> => Boolean(world));

    return await Promise.all(
      seededWorlds.map(async (world) => {
        const worldVersion = world.currentWorldVersionId
          ? await ctx.db.get(world.currentWorldVersionId)
          : null;
        const adventures = await ctx.db
          .query("adventures")
          .withIndex("by_worldId", (q) => q.eq("worldId", world._id))
          .take(50);
        const adventureItems = await Promise.all(
          adventures.map(async (adventure) => {
            const sourceVersion = await ctx.db.get(adventure.worldVersionId);
            const player = adventure.currentPlayerActorId
              ? await ctx.db.get(adventure.currentPlayerActorId)
              : null;
            const currentRoom = player ? await ctx.db.get(player.roomId) : null;
            const latestTurn = await ctx.db
              .query("turns")
              .withIndex("by_adventureId_and_sequenceNumber", (q) =>
                q.eq("adventureId", adventure._id),
              )
              .order("desc")
              .take(1);
            const turnCount = latestTurn[0]?.sequenceNumber ?? 0;
            return {
              _id: adventure._id,
              worldId: world._id,
              name: adventure.name,
              worldName: world.name,
              sourceVersionNumber: sourceVersion?.versionNumber ?? 0,
              currentLocationName: currentRoom?.name,
              turnCount,
              lastPlayedAt:
                latestTurn[0]?.completedAt ?? latestTurn[0]?._creationTime ?? adventure._creationTime,
            };
          }),
        );

        return {
          _id: world._id,
          name: world.name,
          description: world.description,
          sourceVersionNumber: worldVersion?.versionNumber ?? 0,
          adventures: adventureItems.sort((left, right) => right.lastPlayedAt - left.lastPlayedAt),
        };
      }),
    );
  },
});

export const createAdventure = mutation({
  args: {
    worldId: v.optional(v.id("worlds")),
    name: v.optional(v.string()),
  },
  returns: adventureCreateResult,
  handler: async (ctx, args) => {
    const stormbound = await ensureDemoWorldVersion(ctx);
    const tutorial = await ensureTutorialWorldVersion(ctx);
    const selected =
      args.worldId && args.worldId === tutorial.worldId
        ? tutorial
        : args.worldId && args.worldId === stormbound.worldId
          ? stormbound
          : stormbound;
    const world = await ctx.db.get(selected.worldId);
    if (!world) {
      return { ok: false as const, error: "World could not be found." };
    }
    const identity = await nextAdventureIdentity(ctx, selected.worldId, world.name, args.name);
    const adventureId = await createAdventureFromBaseline(ctx, {
      slug: identity.slug,
      name: identity.name,
      worldId: selected.worldId,
      worldVersionId: selected.worldVersionId,
      baseline: selected.baseline,
    });

    return { ok: true as const, adventureId };
  },
});

export const deleteAdventure = mutation({
  args: { adventureId: v.id("adventures") },
  returns: adventureDeleteResult,
  handler: async (ctx, args) => {
    const adventure = await ctx.db.get(args.adventureId);
    if (!adventure) {
      return { ok: false as const, error: "Adventure could not be found." };
    }

    const deletedNarrations = await deleteNarrations(ctx, args.adventureId);
    const deletedEvents = await deleteEvents(ctx, args.adventureId);
    const deletedUtilityMessages = await deleteUtilityMessages(ctx, args.adventureId);
    const deletedStateDiffs = await deleteStateDiffs(ctx, args.adventureId);
    const deletedDirectorCalls = await deleteDirectorCalls(ctx, args.adventureId);
    const deletedCommands = await deleteCommands(ctx, args.adventureId);
    const deletedTurns = await deleteTurns(ctx, args.adventureId);
    const deletedFacts = await deleteFacts(ctx, args.adventureId);
    const deletedObjects = await deleteWorldObjects(ctx, args.adventureId);
    const deletedExits = await deleteExits(ctx, args.adventureId);
    const deletedActors = await deleteActors(ctx, args.adventureId);
    const deletedLocations = await deleteRooms(ctx, args.adventureId);

    await ctx.db.delete(args.adventureId);

    return {
      ok: true as const,
      deletedAdventureId: args.adventureId,
      deletedTurns,
      deletedCommands,
      deletedNarrations,
      deletedEvents,
      deletedUtilityMessages,
      deletedStateDiffs,
      deletedDirectorCalls,
      deletedFacts,
      deletedObjects,
      deletedExits,
      deletedActors,
      deletedLocations,
    };
  },
});

export const createDemoWorldVersion = mutation({
  args: {
    chapelDescription: v.optional(v.string()),
  },
  returns: worldVersionCreateResult,
  handler: async (ctx, args) => {
    if (!debugLocationWritesEnabled()) {
      return { ok: false as const, error: "Debug WorldVersion writes are disabled." };
    }

    const world = await ctx.db
      .query("worlds")
      .withIndex("by_slug", (q) => q.eq("slug", WORLD_SLUG))
      .unique();
    if (!world) {
      return { ok: false as const, error: "Demo World could not be found." };
    }

    const latest = await ctx.db
      .query("worldVersions")
      .withIndex("by_worldId_and_versionNumber", (q) => q.eq("worldId", world._id))
      .order("desc")
      .take(1);
    const baseline = buildStormboundBaseline();
    const chapelDescription = args.chapelDescription?.trim();
    if (chapelDescription) {
      baseline.rooms = baseline.rooms.map((room) =>
        room.key === "chapel"
          ? { ...room, description: chapelDescription.slice(0, 1200) }
          : room,
      );
    }

    const worldVersionId = await ctx.db.insert("worldVersions", {
      worldId: world._id,
      versionNumber: (latest[0]?.versionNumber ?? 0) + 1,
      name: baseline.world.name,
      description: baseline.world.description,
      baseline,
    });
    await ctx.db.patch(world._id, { currentWorldVersionId: worldVersionId });

    return { ok: true as const, worldVersionId };
  },
});

export const createAdventureFromCurrentWorldVersion = mutation({
  args: {
    slug: v.string(),
    name: v.optional(v.string()),
  },
  returns: adventureCreateResult,
  handler: async (ctx, args) => {
    if (!debugLocationWritesEnabled()) {
      return { ok: false as const, error: "Debug Adventure creation is disabled." };
    }

    const slug = args.slug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,64}$/.test(slug)) {
      return { ok: false as const, error: "Adventure slug must use lowercase letters, numbers, and hyphens." };
    }

    const existing = await ctx.db
      .query("adventures")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing) {
      return { ok: false as const, error: "An Adventure with that slug already exists." };
    }

    const world = await ctx.db
      .query("worlds")
      .withIndex("by_slug", (q) => q.eq("slug", WORLD_SLUG))
      .unique();
    if (!world?.currentWorldVersionId) {
      return { ok: false as const, error: "Demo WorldVersion could not be found." };
    }

    const worldVersion = await ctx.db.get(world.currentWorldVersionId);
    if (!worldVersion) {
      return { ok: false as const, error: "Current WorldVersion could not be loaded." };
    }

    const adventureId = await createAdventureFromBaseline(ctx, {
      slug,
      name: args.name?.trim().slice(0, 120) || worldVersion.name,
      worldId: world._id,
      worldVersionId: worldVersion._id,
      baseline: worldVersion.baseline as AdventureBaseline,
    });

    return { ok: true as const, adventureId };
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
  utilityMessageId: v.optional(v.id("utilityMessages")),
  command: v.optional(v.string()),
  input: v.optional(v.string()),
  target: v.optional(v.string()),
  status: v.optional(utilityStatus),
});

export const getSnapshot = query({
  args: { adventureId: v.id("adventures") },
  returns: v.union(
    v.null(),
    v.object({
      adventure: v.object({
        _id: v.id("adventures"),
        name: v.string(),
        worldId: v.id("worlds"),
        worldVersionId: v.id("worldVersions"),
      }),
      world: v.object({
        _id: v.id("worlds"),
        name: v.string(),
        description: v.string(),
      }),
      sourceWorldVersion: v.object({
        _id: v.id("worldVersions"),
        versionNumber: v.number(),
        name: v.string(),
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
          actors: v.array(
            v.object({
              _id: v.id("actors"),
              key: v.string(),
              name: v.string(),
              description: v.string(),
              role: actorRole,
            }),
          ),
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
          trigger: v.optional(turnTrigger),
          hiddenGuidance: v.optional(v.string()),
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
    const loaded = await loadCurrentAdventure(ctx, args.adventureId);
    if (!loaded) {
      return null;
    }

    return await loadSnapshotReadModel(ctx, {
      adventureId: args.adventureId,
      loaded,
      includeDebugState: debugSnapshotDataEnabled(),
    });
  },
});

export const getDirectorContext = query({
  args: { adventureId: v.id("adventures"), serverWriteToken: v.optional(v.string()) },
  returns: v.union(
    v.null(),
    v.object({
      adventure: v.object({
        id: v.string(),
        name: v.string(),
        worldId: v.string(),
        worldVersionId: v.string(),
      }),
      world: v.object({ id: v.string(), name: v.string(), description: v.string() }),
      sourceWorldVersion: v.object({
        id: v.string(),
        versionNumber: v.number(),
        name: v.string(),
      }),
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
      storyVisibleHistory: v.array(feedEntry),
    }),
  ),
  handler: async (ctx, args) => {
    if (!serverWriteAuthorized(args.serverWriteToken)) {
      return null;
    }

    const loaded = await loadCurrentAdventure(ctx, args.adventureId);
    if (!loaded) {
      return null;
    }

    return await loadDirectorContextReadModel(ctx, {
      adventureId: args.adventureId,
      loaded,
    });
  },
});

export const getTranscriptDirectorContext = query({
  args: { adventureId: v.id("adventures"), serverWriteToken: v.optional(v.string()) },
  returns: v.union(
    v.null(),
    v.object({
      adventure: v.object({
        id: v.string(),
        name: v.string(),
        worldId: v.string(),
        worldVersionId: v.string(),
      }),
      world: v.object({ id: v.string(), name: v.string(), description: v.string() }),
      sourceWorldVersion: v.object({
        id: v.string(),
        versionNumber: v.number(),
        name: v.string(),
      }),
      initialSeed: v.string(),
      transcript: v.array(feedEntry),
    }),
  ),
  handler: async (ctx, args) => {
    if (!serverWriteAuthorized(args.serverWriteToken)) {
      return null;
    }

    const loaded = await loadCurrentAdventure(ctx, args.adventureId);
    if (!loaded) {
      return null;
    }
    return await loadTranscriptDirectorContextReadModel(ctx, {
      adventureId: args.adventureId,
      loaded,
    });
  },
});

export const recordPlayerInput = mutation({
  args: { adventureId: v.id("adventures"), input: v.string(), serverWriteToken: v.optional(v.string()) },
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
    if (!serverWriteAuthorized(args.serverWriteToken)) {
      return { ok: false as const, error: "Server write access is not configured." };
    }

    const input = args.input.trim();
    if (!input) {
      return { ok: false as const, error: "Enter narrative text to continue." };
    }

    const adventure = await ctx.db.get(args.adventureId);
    if (!adventure?.currentPlayerActorId) {
      return { ok: false as const, error: "No active player exists in this Adventure yet." };
    }

    const player = await ctx.db.get(adventure.currentPlayerActorId);
    if (!player) {
      return { ok: false as const, error: "The active player could not be loaded." };
    }

    const room = await ctx.db.get(player.roomId);
    if (!room) {
      return { ok: false as const, error: "The current room could not be loaded." };
    }

    const previousTurn = await ctx.db
      .query("turns")
      .withIndex("by_adventureId_and_sequenceNumber", (q) =>
        q.eq("adventureId", args.adventureId),
      )
      .order("desc")
      .take(1);
    const sequenceNumber = (previousTurn[0]?.sequenceNumber ?? 0) + 1;
    const turnId = await ctx.db.insert("turns", {
      worldId: adventure.worldId,
      adventureId: args.adventureId,
      sequenceNumber,
      actorId: player._id,
      trigger: "act",
      status: "pending",
    });

    const commandId = await ctx.db.insert("commands", {
      worldId: adventure.worldId,
      adventureId: args.adventureId,
      turnId,
      actorId: player._id,
      input,
      normalizedInput: normalized(input),
    });

    await ctx.db.patch(turnId, { commandId });

    return { ok: true as const, turnId, commandId, sequenceNumber };
  },
});

export const recordPassTurn = mutation({
  args: { adventureId: v.id("adventures"), serverWriteToken: v.optional(v.string()) },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      turnId: v.id("turns"),
      sequenceNumber: v.number(),
    }),
    v.object({ ok: v.literal(false), error: v.string() }),
  ),
  handler: async (ctx, args) => {
    if (!serverWriteAuthorized(args.serverWriteToken)) {
      return { ok: false as const, error: "Server write access is not configured." };
    }

    const adventure = await ctx.db.get(args.adventureId);
    if (!adventure?.currentPlayerActorId) {
      return { ok: false as const, error: "No active player exists in this Adventure yet." };
    }

    const player = await ctx.db.get(adventure.currentPlayerActorId);
    if (!player) {
      return { ok: false as const, error: "The active player could not be loaded." };
    }

    const previousTurn = await ctx.db
      .query("turns")
      .withIndex("by_adventureId_and_sequenceNumber", (q) =>
        q.eq("adventureId", args.adventureId),
      )
      .order("desc")
      .take(1);
    const sequenceNumber = (previousTurn[0]?.sequenceNumber ?? 0) + 1;
    const turnId = await ctx.db.insert("turns", {
      worldId: adventure.worldId,
      adventureId: args.adventureId,
      sequenceNumber,
      actorId: player._id,
      trigger: "pass",
      status: "pending",
    });

    return { ok: true as const, turnId, sequenceNumber };
  },
});

export const recordGuideTurn = mutation({
  args: {
    adventureId: v.id("adventures"),
    guidance: v.string(),
    serverWriteToken: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      turnId: v.id("turns"),
      sequenceNumber: v.number(),
    }),
    v.object({ ok: v.literal(false), error: v.string() }),
  ),
  handler: async (ctx, args) => {
    if (!serverWriteAuthorized(args.serverWriteToken)) {
      return { ok: false as const, error: "Server write access is not configured." };
    }

    const guidance = validatePlayerAuthoredText(args.guidance, {
      label: "Guide guidance",
      maxLength: GUIDE_GUIDANCE_MAX_LENGTH,
    });
    if (!guidance.ok) {
      return { ok: false as const, error: guidance.error };
    }

    const adventure = await ctx.db.get(args.adventureId);
    if (!adventure?.currentPlayerActorId) {
      return { ok: false as const, error: "No active player exists in this Adventure yet." };
    }

    const player = await ctx.db.get(adventure.currentPlayerActorId);
    if (!player) {
      return { ok: false as const, error: "The active player could not be loaded." };
    }

    const previousTurn = await ctx.db
      .query("turns")
      .withIndex("by_adventureId_and_sequenceNumber", (q) =>
        q.eq("adventureId", args.adventureId),
      )
      .order("desc")
      .take(1);
    const sequenceNumber = (previousTurn[0]?.sequenceNumber ?? 0) + 1;
    const turnId = await ctx.db.insert("turns", {
      worldId: adventure.worldId,
      adventureId: args.adventureId,
      sequenceNumber,
      actorId: player._id,
      trigger: "guide",
      hiddenGuidance: guidance.text,
      status: "pending",
    });

    return { ok: true as const, turnId, sequenceNumber };
  },
});

export const recordStoryInsert = mutation({
  args: {
    adventureId: v.id("adventures"),
    text: v.string(),
  },
  returns: storyInsertResult,
  handler: async (ctx, args) => {
    const text = validatePlayerAuthoredText(args.text, {
      label: "Story text",
      maxLength: STORY_INSERT_MAX_LENGTH,
    });
    if (!text.ok) {
      return { ok: false as const, error: text.error };
    }

    const adventure = await ctx.db.get(args.adventureId);
    if (!adventure?.currentPlayerActorId) {
      return { ok: false as const, error: "No active player exists in this Adventure yet." };
    }

    const narrationId = await ctx.db.insert("narrations", {
      worldId: adventure.worldId,
      adventureId: args.adventureId,
      text: text.text,
      source: "player",
    });

    return { ok: true as const, narrationId };
  },
});

export const recordUtilityMessage = mutation({
  args: {
    adventureId: v.id("adventures"),
    serverWriteToken: v.optional(v.string()),
    input: v.string(),
    command: v.string(),
    target: v.optional(v.string()),
    text: v.string(),
    source: v.union(v.literal("engine"), v.literal("llm")),
    status: utilityStatus,
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), utilityMessageId: v.id("utilityMessages") }),
    v.object({ ok: v.literal(false), error: v.string() }),
  ),
  handler: async (ctx, args) => {
    if (!serverWriteAuthorized(args.serverWriteToken)) {
      return { ok: false as const, error: "Server write access is not configured." };
    }

    const adventure = await ctx.db.get(args.adventureId);
    if (!adventure) {
      return { ok: false as const, error: "Adventure could not be found." };
    }

    const command = args.command.trim().toLowerCase();
    const input = args.input.trim();
    const text = args.text.trim();
    if (!command || !input || !text) {
      return { ok: false as const, error: "Utility command input and output are required." };
    }

    const utilityMessageId = await ctx.db.insert("utilityMessages", {
      worldId: adventure.worldId,
      adventureId: args.adventureId,
      input: input.slice(0, 1000),
      command: command.slice(0, 48),
      ...(args.target?.trim() ? { target: args.target.trim().slice(0, 160) } : {}),
      text: text.slice(0, 4000),
      source: args.source,
      status: args.status,
      ...(args.provider ? { provider: args.provider.slice(0, 160) } : {}),
      ...(args.model ? { model: args.model.slice(0, 160) } : {}),
    });

    return { ok: true as const, utilityMessageId };
  },
});

function requireTurnMatchesCommand(
  turn: NonNullable<Doc<"turns">>,
  commandId: Id<"commands"> | undefined,
  allowedStatuses: readonly Doc<"turns">["status"][],
) {
  if (!allowedStatuses.includes(turn.status)) {
    throw new Error("Turn is not in the expected status.");
  }

  if ((turn.trigger ?? "act") === "pass" || turn.trigger === "guide") {
    if (turn.commandId || commandId) {
      throw new Error("Commandless turns must not reference a command.");
    }
    return;
  }

  if (!turn.commandId || !commandId || turn.commandId !== commandId) {
    throw new Error("Action turns require a matching command.");
  }
}

export const completeDirectorTurn = mutation({
  args: {
    adventureId: v.id("adventures"),
    serverWriteToken: v.optional(v.string()),
    turnId: v.id("turns"),
    commandId: v.optional(v.id("commands")),
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
    requireServerWrite(args.serverWriteToken);

    const adventure = await ctx.db.get(args.adventureId);
    const turn = await ctx.db.get(args.turnId);
    if (!adventure || !turn || turn.adventureId !== args.adventureId) {
      throw new Error("Turn, Adventure, and command do not match.");
    }
    requireTurnMatchesCommand(turn, args.commandId, ["pending"]);

    const directorCall = {
      worldId: adventure.worldId,
      adventureId: args.adventureId,
      turnId: args.turnId,
      ...(args.commandId ? { commandId: args.commandId } : {}),
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
      worldId: adventure.worldId,
      adventureId: args.adventureId,
      turnId: args.turnId,
      ...(args.commandId ? { commandId: args.commandId } : {}),
      text: args.narration.trim(),
      source: "llm",
    });

    if (args.applyWorldMutations === false) {
      await ctx.db.patch(args.turnId, { status: "succeeded", completedAt: Date.now() });
      return { directorCallId, narrationId, changedFacts: 0 };
    }

    const changedFacts = await applyAcceptedNpcUpdatesToTurn(
      ctx,
      { setFact, actorSubjectId },
      {
        worldId: adventure.worldId,
        adventureId: args.adventureId,
        turnId: args.turnId,
        commandId: args.commandId,
        acceptedUpdates: args.acceptedUpdates,
      },
    );

    await ctx.db.patch(args.turnId, { status: "succeeded", completedAt: Date.now() });

    return { directorCallId, narrationId, changedFacts };
  },
});

export const recordNpcStateExtraction = mutation({
  args: {
    adventureId: v.id("adventures"),
    serverWriteToken: v.optional(v.string()),
    turnId: v.id("turns"),
    commandId: v.optional(v.id("commands")),
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
    requireServerWrite(args.serverWriteToken);

    const adventure = await ctx.db.get(args.adventureId);
    const turn = await ctx.db.get(args.turnId);
    if (!adventure || !turn || turn.adventureId !== args.adventureId) {
      throw new Error("Turn, Adventure, and command do not match.");
    }
    requireTurnMatchesCommand(turn, args.commandId, ["succeeded"]);

    const acceptedMoveUpdates = (args.acceptedMoves ?? []).map((move) => ({
      type: "actorMove",
      ...move,
    }));
    const ignoredMoveUpdates = (args.ignoredMoves ?? []).map((move) => ({
      type: "actorMove",
      ...move,
    }));
    const directorCall = {
      worldId: adventure.worldId,
      adventureId: args.adventureId,
      turnId: args.turnId,
      ...(args.commandId ? { commandId: args.commandId } : {}),
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

    const changedFacts = await applyAcceptedNpcUpdatesToTurn(
      ctx,
      { setFact, actorSubjectId },
      {
        worldId: adventure.worldId,
        adventureId: args.adventureId,
        turnId: args.turnId,
        commandId: args.commandId,
        acceptedUpdates: args.acceptedUpdates,
      },
    );
    const movedActors = await applyAcceptedActorMovesToTurn(
      ctx,
      { findActorByKeyOrName, findRoomByKey },
      {
        worldId: adventure.worldId,
        adventureId: args.adventureId,
        turnId: args.turnId,
        commandId: args.commandId,
        acceptedMoves: args.acceptedMoves ?? [],
      },
    );

    return { directorCallId, changedFacts, movedActors };
  },
});

export const resetPlaytestWorld = mutation({
  args: { adventureId: v.id("adventures") },
  returns: v.object({
    deletedTurns: v.number(),
    deletedCommands: v.number(),
    deletedNarrations: v.number(),
    deletedEvents: v.number(),
    deletedUtilityMessages: v.number(),
    deletedStateDiffs: v.number(),
    deletedDirectorCalls: v.number(),
    restoredFacts: v.number(),
    resetActorLocations: v.number(),
    restoredLocations: v.number(),
    deletedLocations: v.number(),
    deletedActors: v.number(),
  }),
  handler: async (ctx, args) => {
    const adventure = await ctx.db.get(args.adventureId);
    if (!adventure) {
      throw new Error("Adventure could not be found.");
    }
    const worldVersion = await ctx.db.get(adventure.worldVersionId);
    if (!worldVersion) {
      throw new Error("Adventure source WorldVersion could not be found.");
    }
    const baseline = worldVersion.baseline as AdventureBaseline;

    const deletedNarrations = await deleteNarrations(ctx, args.adventureId);
    const deletedEvents = await deleteEvents(ctx, args.adventureId);
    const deletedUtilityMessages = await deleteUtilityMessages(ctx, args.adventureId);
    const deletedStateDiffs = await deleteStateDiffs(ctx, args.adventureId);
    const deletedDirectorCalls = await deleteDirectorCalls(ctx, args.adventureId);
    const deletedCommands = await deleteCommands(ctx, args.adventureId);
    const deletedTurns = await deleteTurns(ctx, args.adventureId);
    await deleteFacts(ctx, args.adventureId);
    await deleteWorldObjects(ctx, args.adventureId);
    await deleteExits(ctx, args.adventureId);
    const deletedActors = await deleteActors(ctx, args.adventureId);
    const deletedLocations = await deleteRooms(ctx, args.adventureId);

    await copyBaselineRuntimeRows(ctx, {
      worldId: adventure.worldId,
      worldVersionId: adventure.worldVersionId,
      adventureId: args.adventureId,
      baseline,
    });

    return {
      deletedTurns,
      deletedCommands,
      deletedNarrations,
      deletedEvents,
      deletedUtilityMessages,
      deletedStateDiffs,
      deletedDirectorCalls,
      restoredFacts: baseline.npcs.reduce((total, npc) => total + npc.facts.length, 0),
      resetActorLocations: baseline.npcs.length + 1,
      restoredLocations: baseline.rooms.length,
      deletedLocations,
      deletedActors,
    };
  },
});

export const updateLocation = action({
  args: {
    adventureId: v.id("adventures"),
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
    adventureId: v.id("adventures"),
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

export const updateNpc = action({
  args: {
    adventureId: v.id("adventures"),
    actorId: v.id("actors"),
    name: v.string(),
    description: v.string(),
    facts: npcDebugFacts,
  },
  returns: debugNpcWriteResult,
  handler: async (ctx, args): Promise<DebugNpcWriteResult> => {
    if (!debugLocationWritesEnabled()) {
      return { ok: false, error: "Debug NPC writes are disabled." };
    }

    const result: DebugNpcWriteResult = await ctx.runMutation(internal.world.updateNpcInternal, args);
    return result;
  },
});

export const createNpc = action({
  args: {
    adventureId: v.id("adventures"),
    key: v.string(),
    name: v.string(),
    description: v.string(),
    facts: npcDebugFacts,
  },
  returns: debugNpcWriteResult,
  handler: async (ctx, args): Promise<DebugNpcWriteResult> => {
    if (!debugLocationWritesEnabled()) {
      return { ok: false, error: "Debug NPC writes are disabled." };
    }

    const result: DebugNpcWriteResult = await ctx.runMutation(internal.world.createNpcInternal, args);
    return result;
  },
});

export const resetNpc = action({
  args: {
    adventureId: v.id("adventures"),
    actorId: v.id("actors"),
  },
  returns: debugNpcWriteResult,
  handler: async (ctx, args): Promise<DebugNpcWriteResult> => {
    if (!debugLocationWritesEnabled()) {
      return { ok: false, error: "Debug NPC writes are disabled." };
    }

    const result: DebugNpcWriteResult = await ctx.runMutation(internal.world.resetNpcInternal, args);
    return result;
  },
});

export const updateLocationInternal = internalMutation({
  args: {
    adventureId: v.id("adventures"),
    locationId: v.id("rooms"),
    name: v.string(),
    description: v.string(),
  },
  returns: debugLocationWriteResult,
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.locationId);
    if (!room || room.adventureId !== args.adventureId) {
      return { ok: false, error: "Location could not be found in this Adventure." };
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
    adventureId: v.id("adventures"),
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

    const adventure = await ctx.db.get(args.adventureId);
    if (!adventure) {
      return { ok: false, error: "Adventure could not be found." };
    }

    const existing = await findRoomByKey(ctx, args.adventureId, key);
    if (existing) {
      return { ok: false, error: "A location with that key already exists." };
    }

    const baseline = await loadAdventureBaseline(ctx, adventure);
    if (!baseline) {
      return { ok: false, error: "Adventure source WorldVersion could not be loaded." };
    }

    const debugLocationCount = await countDebugCreatedLocations(ctx, args.adventureId, baseline);
    if (debugLocationCount >= DEBUG_CREATED_LOCATION_LIMIT) {
      return {
        ok: false,
        error: `Debug-created locations are capped at ${DEBUG_CREATED_LOCATION_LIMIT}. Reset Session before adding more.`,
      };
    }

    const locationId = await ctx.db.insert("rooms", {
      worldId: adventure.worldId,
      adventureId: args.adventureId,
      key,
      name: name.slice(0, 120),
      description: description.slice(0, 1200),
    });
    return { ok: true, locationId };
  },
});

export const updateNpcInternal = internalMutation({
  args: {
    adventureId: v.id("adventures"),
    actorId: v.id("actors"),
    name: v.string(),
    description: v.string(),
    facts: npcDebugFacts,
  },
  returns: debugNpcWriteResult,
  handler: async (ctx, args) => {
    const actor = await ctx.db.get(args.actorId);
    if (!actor || actor.adventureId !== args.adventureId || actor.role !== "npc") {
      return { ok: false, error: "NPC could not be found in this Adventure." };
    }

    const actorKey = stableActorKey(actor);
    const name = args.name.trim();
    const description = args.description.trim();
    if (!name || !description) {
      return { ok: false, error: "NPC name and description are required." };
    }

    await ctx.db.patch(actor._id, {
      name: name.slice(0, 120),
      description: description.slice(0, 1200),
    });
    await writeNpcFacts(ctx, actor.worldId, args.adventureId, actorKey, args.facts);

    return { ok: true, actorId: actor._id };
  },
});

export const createNpcInternal = internalMutation({
  args: {
    adventureId: v.id("adventures"),
    key: v.string(),
    name: v.string(),
    description: v.string(),
    facts: npcDebugFacts,
  },
  returns: debugNpcWriteResult,
  handler: async (ctx, args) => {
    const key = args.key.trim().toLowerCase();
    const name = args.name.trim();
    const description = args.description.trim();
    if (!/^[a-z0-9][a-z0-9-]{1,48}$/.test(key)) {
      return { ok: false, error: "NPC key must use lowercase letters, numbers, and hyphens." };
    }
    if (!name || !description) {
      return { ok: false, error: "NPC name and description are required." };
    }

    const adventure = await ctx.db.get(args.adventureId);
    if (!adventure) {
      return { ok: false, error: "Adventure could not be found." };
    }

    const existing = await findActorByKeyOrName(ctx, args.adventureId, key, name);
    if (existing) {
      return { ok: false, error: "An actor with that key or name already exists." };
    }

    const baseline = await loadAdventureBaseline(ctx, adventure);
    if (!baseline) {
      return { ok: false, error: "Adventure source WorldVersion could not be loaded." };
    }

    const debugNpcCount = await countDebugCreatedNpcs(ctx, args.adventureId, baseline);
    if (debugNpcCount >= DEBUG_CREATED_NPC_LIMIT) {
      return {
        ok: false,
        error: `Debug-created NPCs are capped at ${DEBUG_CREATED_NPC_LIMIT}. Reset Session before adding more.`,
      };
    }

    const player = adventure.currentPlayerActorId
      ? await ctx.db.get(adventure.currentPlayerActorId)
      : null;
    if (!player) {
      return { ok: false, error: "Player actor could not be found." };
    }

    const actorId = await ctx.db.insert("actors", {
      worldId: adventure.worldId,
      adventureId: args.adventureId,
      roomId: player.roomId,
      key,
      name: name.slice(0, 120),
      role: "npc",
      description: description.slice(0, 1200),
    });
    await writeNpcFacts(ctx, adventure.worldId, args.adventureId, key, args.facts);

    return { ok: true, actorId };
  },
});

export const resetNpcInternal = internalMutation({
  args: {
    adventureId: v.id("adventures"),
    actorId: v.id("actors"),
  },
  returns: debugNpcWriteResult,
  handler: async (ctx, args) => {
    const actor = await ctx.db.get(args.actorId);
    if (!actor || actor.adventureId !== args.adventureId || actor.role !== "npc") {
      return { ok: false, error: "NPC could not be found in this Adventure." };
    }

    const adventure = await ctx.db.get(args.adventureId);
    if (!adventure) {
      return { ok: false, error: "Adventure could not be found." };
    }
    const baseline = await loadAdventureBaseline(ctx, adventure);
    if (!baseline) {
      return { ok: false, error: "Adventure source WorldVersion could not be loaded." };
    }

    const actorKey = stableActorKey(actor);
    const seededNpc = findBaselineNpc(baseline, actorKey);
    if (!seededNpc) {
      await deleteActorFacts(ctx, args.adventureId, actorKey);
      await ctx.db.delete(actor._id);
      return { ok: true };
    }

    await restoreSeededNpc(ctx, {
      worldId: actor.worldId,
      adventureId: args.adventureId,
      key: seededNpc.key,
      name: seededNpc.name,
      description: seededNpc.description,
      facts: seededNpc.facts,
      legacyFactKeys: baselineNpcLegacyFactKeys(seededNpc),
    });
    const room = await findRoomByKey(ctx, args.adventureId, seededNpc.roomKey);
    if (room && actor.roomId !== room._id) {
      await ctx.db.patch(actor._id, { roomId: room._id });
    }

    return { ok: true, actorId: actor._id };
  },
});

async function writeNpcFacts(
  ctx: MutationCtx,
  worldId: Id<"worlds">,
  adventureId: Id<"adventures">,
  actorKey: string,
  facts: Partial<Record<"background" | "persona" | "voice" | "mood" | "status" | "memory" | "knowledge", string>>,
) {
  for (const key of NPC_PROFILE_FACT_KEYS_FOR_WRITE) {
    const value = facts[key]?.trim();
    if (!value) {
      await deleteActorFactByKey(ctx, adventureId, actorKey, key);
      continue;
    }
    await setFact(ctx, {
      worldId,
      adventureId,
      subjectType: "actor",
      subjectId: actorSubjectId(actorKey),
      key,
      value: value.slice(0, 1200),
      source: "manual",
      overwrite: true,
    });
  }
}

function debugLocationWritesEnabled() {
  return isLocalConvexDeployment() && process.env.LORECRAFT_ENABLE_DEBUG_ROUTES === "1";
}

function debugSnapshotDataEnabled() {
  return isLocalConvexDeployment() && process.env.LORECRAFT_ENABLE_DEBUG_ROUTES === "1";
}

function serverWriteAuthorized(token: string | undefined) {
  if (isLocalConvexDeployment()) {
    return true;
  }

  const expectedToken = process.env.LORECRAFT_SERVER_WRITE_TOKEN?.trim();
  return Boolean(expectedToken && token === expectedToken);
}

function isLocalConvexDeployment() {
  return isLoopbackUrl(process.env.CONVEX_CLOUD_URL) || isLoopbackUrl(process.env.CONVEX_SITE_URL);
}

function isLoopbackUrl(value: string | undefined) {
  if (!value) {
    return false;
  }

  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function requireServerWrite(token: string | undefined) {
  if (!serverWriteAuthorized(token)) {
    throw new Error("Server write access is not configured.");
  }
}

async function countDebugCreatedLocations(
  ctx: DatabaseCtx,
  adventureId: Id<"adventures">,
  baseline: AdventureBaseline,
) {
  const locations = await ctx.db
    .query("rooms")
    .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("rooms", locations.length);
  return countDebugCreatedLocationKeys(
    baseline,
    locations.map((location) => location.key),
  );
}

async function countDebugCreatedNpcs(
  ctx: DatabaseCtx,
  adventureId: Id<"adventures">,
  baseline: AdventureBaseline,
) {
  const actors = await ctx.db
    .query("actors")
    .withIndex("by_adventureId_and_role", (q) =>
      q.eq("adventureId", adventureId).eq("role", "npc"),
    )
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("actors", actors.length);
  return countDebugCreatedNpcKeys(
    baseline,
    actors.map((actor) => stableActorKey(actor)),
  );
}

async function loadAdventureBaseline(
  ctx: DatabaseCtx,
  adventure: Pick<Doc<"adventures">, "worldVersionId">,
) {
  const worldVersion = await ctx.db.get(adventure.worldVersionId);
  return (worldVersion?.baseline as AdventureBaseline | undefined) ?? null;
}

async function loadCurrentAdventure(ctx: QueryCtx, adventureId: Id<"adventures">) {
  const adventure = await ctx.db.get(adventureId);
  if (!adventure?.currentPlayerActorId) {
    return null;
  }

  const [world, worldVersion, player] = await Promise.all([
    ctx.db.get(adventure.worldId),
    ctx.db.get(adventure.worldVersionId),
    ctx.db.get(adventure.currentPlayerActorId),
  ]);
  if (!world || !worldVersion) {
    return null;
  }
  if (!player) {
    return null;
  }

  const room = await ctx.db.get(player.roomId);
  if (!room) {
    return null;
  }

  if (player.adventureId !== adventureId || room.adventureId !== adventureId) {
    return null;
  }

  return { adventure, world, worldVersion, player, room };
}

async function deleteCommands(ctx: MutationCtx, adventureId: Id<"adventures">) {
  const rows = await ctx.db
    .query("commands")
    .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("commands", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteNarrations(ctx: MutationCtx, adventureId: Id<"adventures">) {
  const rows = await ctx.db
    .query("narrations")
    .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("narrations", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteEvents(ctx: MutationCtx, adventureId: Id<"adventures">) {
  const rows = await ctx.db
    .query("events")
    .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("events", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteUtilityMessages(ctx: MutationCtx, adventureId: Id<"adventures">) {
  const rows = await ctx.db
    .query("utilityMessages")
    .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("utilityMessages", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteStateDiffs(ctx: MutationCtx, adventureId: Id<"adventures">) {
  const rows = await ctx.db
    .query("stateDiffs")
    .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("stateDiffs", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteDirectorCalls(ctx: MutationCtx, adventureId: Id<"adventures">) {
  const rows = await ctx.db
    .query("directorCalls")
    .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("directorCalls", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteDemoWorld(ctx: MutationCtx) {
  await deleteWorldBySlug(ctx, WORLD_SLUG);
}

async function deleteWorldBySlug(ctx: MutationCtx, slug: string) {
  const world = await ctx.db
    .query("worlds")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (!world) {
    return;
  }

  const adventures = await ctx.db
    .query("adventures")
    .withIndex("by_worldId", (q) => q.eq("worldId", world._id))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("adventures", adventures.length);

  for (const adventure of adventures) {
    await deleteNarrations(ctx, adventure._id);
    await deleteEvents(ctx, adventure._id);
    await deleteUtilityMessages(ctx, adventure._id);
    await deleteStateDiffs(ctx, adventure._id);
    await deleteDirectorCalls(ctx, adventure._id);
    await deleteCommands(ctx, adventure._id);
    await deleteTurns(ctx, adventure._id);
    await deleteFacts(ctx, adventure._id);
    await deleteWorldObjects(ctx, adventure._id);
    await deleteExits(ctx, adventure._id);
    await deleteActors(ctx, adventure._id);
    await deleteRooms(ctx, adventure._id);
    await ctx.db.delete(adventure._id);
  }

  const versions = await ctx.db
    .query("worldVersions")
    .withIndex("by_worldId", (q) => q.eq("worldId", world._id))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("worldVersions", versions.length);
  for (const version of versions) {
    await ctx.db.delete(version._id);
  }
  await ctx.db.delete(world._id);
}

async function deleteFacts(ctx: MutationCtx, adventureId: Id<"adventures">) {
  const rows = await ctx.db
    .query("facts")
    .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("facts", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteWorldObjects(ctx: MutationCtx, adventureId: Id<"adventures">) {
  const rows = await ctx.db
    .query("worldObjects")
    .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("worldObjects", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteExits(ctx: MutationCtx, adventureId: Id<"adventures">) {
  const rows = await ctx.db
    .query("exits")
    .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("exits", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteActors(ctx: MutationCtx, adventureId: Id<"adventures">) {
  const rows = await ctx.db
    .query("actors")
    .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("actors", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteRooms(ctx: MutationCtx, adventureId: Id<"adventures">) {
  const rows = await ctx.db
    .query("rooms")
    .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("rooms", rows.length);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteTurns(ctx: MutationCtx, adventureId: Id<"adventures">) {
  const rows = await ctx.db
    .query("turns")
    .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
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
