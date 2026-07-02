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
type BaselineFact = { key: string; value: FactValue };
type AdventureBaseline = {
  world: { name: string; description: string };
  rooms: Array<{ key: string; name: string; description: string }>;
  exits: Array<{ fromRoomKey: string; toRoomKey: string; label: string; visible: boolean }>;
  player: { key: string; name: string; description: string; roomKey: string };
  npcs: Array<{
    key: string;
    name: string;
    description: string;
    roomKey: string;
    facts: BaselineFact[];
  }>;
  objects: Array<{
    key: string;
    name: string;
    description: string;
    roomKey: string;
    visible: boolean;
    facts: BaselineFact[];
  }>;
  initialEvent: string;
  initialNarration: string;
};
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
type DebugNpcWriteResult = {
  ok: boolean;
  error?: string;
  actorId?: Id<"actors">;
};

const WORLD_SLUG = "stormbound-chapel-default";
const DEFAULT_ADVENTURE_SLUG = "stormbound-chapel-default-adventure";
const DEMO_RESET_ROW_LIMIT = 500;
const DEBUG_CREATED_LOCATION_LIMIT = 25;
const DEBUG_CREATED_NPC_LIMIT = 25;
const PLAYER_KEY = "taylor";
const NPC_PROFILE_FACT_KEYS_FOR_WRITE = [
  "background",
  "persona",
  "voice",
  "mood",
  "status",
  "memory",
  "knowledge",
] as const;
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
const TAVERNKEEP_KEY = "rowan";
const TAVERNKEEP_NAME = "Rowan";
const TAVERNKEEP_DESCRIPTION =
  "A broad-shouldered tavernkeeper with rolled sleeves, gray-shot hair, and a towel tucked through his belt.";
const TAVERNKEEP_BASELINE_FACTS = [
  {
    key: "background",
    value:
      "Rowan has kept the Lantern & Bell open through bad weather, bad harvests, and worse rumors. He knows which villagers drink quietly and which ones talk when the rain gets loud.",
  },
  {
    key: "persona",
    value:
      "Practical, watchful, and protective of his regulars. Rowan is friendly enough to paying guests, but he notices trouble before he names it.",
  },
  {
    key: "voice",
    value:
      "Dry and plainspoken, with tavern humor and short warnings. Rowan asks direct questions and rarely wastes words.",
  },
  { key: "mood", value: "wary but hospitable" },
  {
    key: "status",
    value: "working behind the tavern bar while keeping one eye on the door",
  },
  { key: "memory", value: "Rowan has not yet formed meaningful memories of Taylor." },
  {
    key: "knowledge",
    value:
      "Rowan heard someone pass the tavern toward the chapel shortly before the midnight bell, but he did not see their face.",
  },
] as const;
const MINSTREL_KEY = "lena";
const MINSTREL_NAME = "Lena";
const MINSTREL_DESCRIPTION =
  "A wiry traveling minstrel in a weather-stained green cloak, with quick hands and sharper eyes than her songs suggest.";
const MINSTREL_BASELINE_FACTS = [
  {
    key: "background",
    value:
      "Lena arrived in Stormbound two nights ago with a cracked lute, three half-finished songs, and no clear explanation for why she chose this road.",
  },
  {
    key: "persona",
    value:
      "Curious, evasive, and amused by danger until it becomes personal. Lena collects rumors and tests strangers with jokes before offering truth.",
  },
  {
    key: "voice",
    value:
      "Lyrical but sly. Lena answers with teasing images, half-rhymes, and sudden blunt admissions when cornered.",
  },
  { key: "mood", value: "restless" },
  {
    key: "status",
    value: "sitting near the tavern hearth with her lute case under one boot",
  },
  { key: "memory", value: "Lena has not yet formed meaningful memories of Taylor." },
  {
    key: "knowledge",
    value:
      "Lena noticed the chapel bell's sound had two tones at midnight, as if something cracked after the first strike.",
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
  {
    key: "tavern",
    name: "Lantern & Bell Tavern",
    description:
      "Warm lamplight pools across scarred tables. Rain ticks against leaded windows, Rowan works behind the bar, and Lena sits near the hearth with a lute case under one boot.",
  },
] as const;

const SEEDED_EXITS = [
  { fromRoomKey: "chapel", toRoomKey: "vestry", label: "west", visible: true },
  { fromRoomKey: "vestry", toRoomKey: "chapel", label: "east", visible: true },
  { fromRoomKey: "chapel", toRoomKey: "graveyard", label: "north", visible: true },
  { fromRoomKey: "graveyard", toRoomKey: "chapel", label: "south", visible: true },
  { fromRoomKey: "chapel", toRoomKey: "tavern", label: "east", visible: true },
  { fromRoomKey: "tavern", toRoomKey: "chapel", label: "west", visible: true },
] as const;

const SEEDED_OBJECTS = [
  {
    key: "shutters",
    name: "Shutters",
    description: "Warped wooden shutters latched against the storm.",
    roomKey: "chapel",
    visible: true,
    facts: [{ key: "open", value: false }],
  },
  {
    key: "lantern",
    name: "Lantern",
    description: "A cracked lantern with a low, unsteady flame.",
    roomKey: "chapel",
    visible: true,
    facts: [{ key: "broken", value: false }],
  },
  {
    key: "altar",
    name: "Altar",
    description: "A stone altar scarred by old candle wax.",
    roomKey: "chapel",
    visible: true,
    facts: [{ key: "marked_with_chalk", value: false }],
  },
] as const;

const SEEDED_NPCS = [
  {
    key: MIRA_KEY,
    name: "Mira",
    description: MIRA_DESCRIPTION,
    facts: MIRA_BASELINE_FACTS,
    roomKey: "chapel",
    legacyFactKeys: LEGACY_MIRA_FACT_KEYS,
  },
  {
    key: PRIEST_KEY,
    name: PRIEST_NAME,
    description: PRIEST_DESCRIPTION,
    facts: PRIEST_BASELINE_FACTS,
    roomKey: "chapel",
  },
  {
    key: TAVERNKEEP_KEY,
    name: TAVERNKEEP_NAME,
    description: TAVERNKEEP_DESCRIPTION,
    facts: TAVERNKEEP_BASELINE_FACTS,
    roomKey: "tavern",
  },
  {
    key: MINSTREL_KEY,
    name: MINSTREL_NAME,
    description: MINSTREL_DESCRIPTION,
    facts: MINSTREL_BASELINE_FACTS,
    roomKey: "tavern",
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
const worldVersionCreateResult = v.union(
  v.object({ ok: v.literal(true), worldVersionId: v.id("worldVersions") }),
  v.object({ ok: v.literal(false), error: v.string() }),
);

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

function buildStormboundBaseline(): AdventureBaseline {
  return {
    world: {
      name: "Stormbound Chapel",
      description:
        "A small persistent-world test set around a chapel, a tavern, a vestry, and a rain-lashed graveyard.",
    },
    rooms: SEEDED_ROOMS.map((room) => ({ ...room })),
    exits: SEEDED_EXITS.map((exit) => ({ ...exit })),
    player: {
      key: PLAYER_KEY,
      name: "Taylor",
      description: "The playtester exploring whether the world remembers.",
      roomKey: "chapel",
    },
    npcs: SEEDED_NPCS.map((npc) => ({
      key: npc.key,
      name: npc.name,
      description: npc.description,
      roomKey: npc.roomKey,
      facts: npc.facts.map((fact) => ({ key: fact.key, value: fact.value })),
    })),
    objects: SEEDED_OBJECTS.map((object) => ({
      key: object.key,
      name: object.name,
      description: object.description,
      roomKey: object.roomKey,
      visible: object.visible,
      facts: object.facts.map((fact) => ({ key: fact.key, value: fact.value })),
    })),
    initialEvent: "The Stormbound Chapel Adventure was created from its source WorldVersion.",
    initialNarration: "You stand in the chapel while rain works at the shutters.",
  };
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

async function applyAcceptedNpcUpdates(
  ctx: MutationCtx,
  args: {
    worldId: Id<"worlds">;
    adventureId: Id<"adventures">;
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
        adventureId: args.adventureId,
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
      adventureId: args.adventureId,
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
      adventureId: args.adventureId,
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
    adventureId: Id<"adventures">;
    turnId: Id<"turns">;
    commandId: Id<"commands">;
    acceptedMoves: AcceptedActorMoveForWrite[];
  },
) {
  if (args.acceptedMoves.length === 0) {
    return 0;
  }

  const adventure = await ctx.db.get(args.adventureId);
  const player = adventure?.currentPlayerActorId
    ? await ctx.db.get(adventure.currentPlayerActorId)
    : null;
  const currentRoomId = player?.roomId;
  const operations: Array<{ op: "moveActor"; actorId: Id<"actors">; toRoomId: Id<"rooms"> }> = [];

  if (!currentRoomId) {
    return 0;
  }

  for (const move of args.acceptedMoves) {
    const actor = await findActorByKeyOrName(ctx, args.adventureId, move.actorKey, move.actorName);
    const toRoom = await findRoomByKey(ctx, args.adventureId, move.toLocationKey);

    if (
      !actor ||
      !toRoom ||
      actor.adventureId !== args.adventureId ||
      toRoom.adventureId !== args.adventureId ||
      actor.roomId !== currentRoomId
    ) {
      continue;
    }

    await ctx.db.patch(actor._id, { roomId: toRoom._id });
    operations.push({ op: "moveActor", actorId: actor._id, toRoomId: toRoom._id });
  }

  if (operations.length > 0) {
    await ctx.db.insert("stateDiffs", {
      worldId: args.worldId,
      adventureId: args.adventureId,
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

    const { adventure, world, worldVersion, player, room } = loaded;
    const includeDebugState = debugSnapshotDataEnabled();
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
      facts: includeDebugState
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
      diffs: includeDebugState
        ? diffs.map((diff) => ({
            _id: diff._id,
            ...(diff.turnId ? { turnId: diff.turnId } : {}),
            source: diff.source,
            operations: diff.operations,
          }))
        : [],
      turns,
      directorCalls: includeDebugState
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

    const { adventure, world, worldVersion, player, room } = loaded;
    const [exits, actors, objects, facts, recentFeed, allRooms] = await Promise.all([
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
      loadFeed(ctx, args.adventureId, 20),
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
    const { adventure, world, worldVersion } = loaded;

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

export const completeDirectorTurn = mutation({
  args: {
    adventureId: v.id("adventures"),
    serverWriteToken: v.optional(v.string()),
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
    requireServerWrite(args.serverWriteToken);

    const adventure = await ctx.db.get(args.adventureId);
    const turn = await ctx.db.get(args.turnId);
    if (!adventure || !turn || turn.adventureId !== args.adventureId || turn.commandId !== args.commandId) {
      throw new Error("Turn, Adventure, and command do not match.");
    }

    const directorCall = {
      worldId: adventure.worldId,
      adventureId: args.adventureId,
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
      worldId: adventure.worldId,
      adventureId: args.adventureId,
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
      worldId: adventure.worldId,
      adventureId: args.adventureId,
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
    adventureId: v.id("adventures"),
    serverWriteToken: v.optional(v.string()),
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
    requireServerWrite(args.serverWriteToken);

    const adventure = await ctx.db.get(args.adventureId);
    const turn = await ctx.db.get(args.turnId);
    if (!adventure || !turn || turn.adventureId !== args.adventureId || turn.commandId !== args.commandId) {
      throw new Error("Turn, Adventure, and command do not match.");
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
      worldId: adventure.worldId,
      adventureId: args.adventureId,
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
      worldId: adventure.worldId,
      adventureId: args.adventureId,
      turnId: args.turnId,
      commandId: args.commandId,
      acceptedUpdates: args.acceptedUpdates,
    });
    const movedActors = await applyAcceptedActorMoves(ctx, {
      worldId: adventure.worldId,
      adventureId: args.adventureId,
      turnId: args.turnId,
      commandId: args.commandId,
      acceptedMoves: args.acceptedMoves ?? [],
    });

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

    const debugLocationCount = await countDebugCreatedLocations(ctx, args.adventureId);
    if (debugLocationCount >= DEBUG_CREATED_LOCATION_LIMIT) {
      return {
        ok: false,
        error: `Debug-created locations are capped at ${DEBUG_CREATED_LOCATION_LIMIT}. Reset the demo world before adding more.`,
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

    const debugNpcCount = await countDebugCreatedNpcs(ctx, args.adventureId);
    if (debugNpcCount >= DEBUG_CREATED_NPC_LIMIT) {
      return {
        ok: false,
        error: `Debug-created NPCs are capped at ${DEBUG_CREATED_NPC_LIMIT}. Reset the demo world before adding more.`,
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

    const actorKey = stableActorKey(actor);
    const seededNpc = SEEDED_NPCS.find((npc) => npc.key === actorKey);
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
      legacyFactKeys: "legacyFactKeys" in seededNpc ? seededNpc.legacyFactKeys : undefined,
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

async function countDebugCreatedLocations(ctx: DatabaseCtx, adventureId: Id<"adventures">) {
  const seededLocationKeys = new Set<string>(SEEDED_ROOMS.map((room) => room.key));
  const locations = await ctx.db
    .query("rooms")
    .withIndex("by_adventureId", (q) => q.eq("adventureId", adventureId))
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("rooms", locations.length);
  return locations.filter((location) => !seededLocationKeys.has(location.key)).length;
}

async function countDebugCreatedNpcs(ctx: DatabaseCtx, adventureId: Id<"adventures">) {
  const seededNpcKeys = new Set<string>(SEEDED_NPCS.map((npc) => npc.key));
  const actors = await ctx.db
    .query("actors")
    .withIndex("by_adventureId_and_role", (q) =>
      q.eq("adventureId", adventureId).eq("role", "npc"),
    )
    .take(DEMO_RESET_ROW_LIMIT + 1);
  assertDemoResetTableWithinLimit("actors", actors.length);
  return actors.filter((actor) => !seededNpcKeys.has(stableActorKey(actor))).length;
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

async function loadVisibleExits(ctx: QueryCtx, adventureId: Id<"adventures">, roomId: Id<"rooms">) {
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

async function loadFeed(ctx: QueryCtx, adventureId: Id<"adventures">, limit: number) {
  const [commands, narrations, events] = await Promise.all([
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

async function loadTranscript(ctx: QueryCtx, adventureId: Id<"adventures">, limit: number) {
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
        kind: "director" as const,
        text: narration.text,
        source: narration.source,
        createdAt: narration._creationTime,
        ...(narration.turnId ? { turnId: narration.turnId } : {}),
        ...(narration.commandId ? { commandId: narration.commandId } : {}),
      })),
  ].sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
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
  const world = await ctx.db
    .query("worlds")
    .withIndex("by_slug", (q) => q.eq("slug", WORLD_SLUG))
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
