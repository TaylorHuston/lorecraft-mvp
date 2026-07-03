import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const factValue = v.union(v.string(), v.number(), v.boolean(), v.null());

export default defineSchema({
  worlds: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    currentWorldVersionId: v.optional(v.id("worldVersions")),
    // Deprecated runtime pointer retained only so old local rows can validate during the MVP migration.
    currentPlayerActorId: v.optional(v.id("actors")),
  }).index("by_slug", ["slug"]),

  worldVersions: defineTable({
    worldId: v.id("worlds"),
    versionNumber: v.number(),
    name: v.string(),
    description: v.string(),
    baseline: v.any(),
  })
    .index("by_worldId", ["worldId"])
    .index("by_worldId_and_versionNumber", ["worldId", "versionNumber"]),

  adventures: defineTable({
    slug: v.string(),
    worldId: v.id("worlds"),
    worldVersionId: v.id("worldVersions"),
    name: v.string(),
    currentPlayerActorId: v.optional(v.id("actors")),
  })
    .index("by_slug", ["slug"])
    .index("by_worldId", ["worldId"])
    .index("by_worldVersionId", ["worldVersionId"]),

  rooms: defineTable({
    worldId: v.id("worlds"),
    adventureId: v.optional(v.id("adventures")),
    key: v.string(),
    name: v.string(),
    description: v.string(),
  })
    .index("by_worldId", ["worldId"])
    .index("by_worldId_and_key", ["worldId", "key"])
    .index("by_adventureId", ["adventureId"])
    .index("by_adventureId_and_key", ["adventureId", "key"]),

  exits: defineTable({
    worldId: v.id("worlds"),
    adventureId: v.optional(v.id("adventures")),
    fromRoomId: v.id("rooms"),
    toRoomId: v.id("rooms"),
    label: v.string(),
    visible: v.boolean(),
  })
    .index("by_worldId", ["worldId"])
    .index("by_worldId_and_fromRoomId", ["worldId", "fromRoomId"])
    .index("by_adventureId", ["adventureId"])
    .index("by_adventureId_and_fromRoomId", ["adventureId", "fromRoomId"]),

  actors: defineTable({
    worldId: v.id("worlds"),
    adventureId: v.optional(v.id("adventures")),
    roomId: v.id("rooms"),
    key: v.optional(v.string()),
    name: v.string(),
    role: v.union(v.literal("player"), v.literal("npc")),
    description: v.string(),
  })
    .index("by_worldId", ["worldId"])
    .index("by_worldId_and_roomId", ["worldId", "roomId"])
    .index("by_worldId_and_key", ["worldId", "key"])
    .index("by_worldId_and_role", ["worldId", "role"])
    .index("by_adventureId", ["adventureId"])
    .index("by_adventureId_and_roomId", ["adventureId", "roomId"])
    .index("by_adventureId_and_key", ["adventureId", "key"])
    .index("by_adventureId_and_role", ["adventureId", "role"]),

  worldObjects: defineTable({
    worldId: v.id("worlds"),
    adventureId: v.optional(v.id("adventures")),
    roomId: v.id("rooms"),
    key: v.string(),
    name: v.string(),
    description: v.string(),
    visible: v.boolean(),
  })
    .index("by_worldId", ["worldId"])
    .index("by_worldId_and_roomId", ["worldId", "roomId"])
    .index("by_worldId_and_key", ["worldId", "key"])
    .index("by_adventureId", ["adventureId"])
    .index("by_adventureId_and_roomId", ["adventureId", "roomId"])
    .index("by_adventureId_and_key", ["adventureId", "key"]),

  facts: defineTable({
    worldId: v.id("worlds"),
    adventureId: v.optional(v.id("adventures")),
    subjectType: v.union(
      v.literal("world"),
      v.literal("room"),
      v.literal("actor"),
      v.literal("object"),
      v.literal("exit"),
    ),
    subjectId: v.string(),
    key: v.string(),
    value: factValue,
    source: v.union(
      v.literal("seed"),
      v.literal("player"),
      v.literal("engine"),
      v.literal("llm"),
      v.literal("manual"),
    ),
  })
    .index("by_worldId", ["worldId"])
    .index("by_worldId_and_subjectId", ["worldId", "subjectId"])
    .index("by_worldId_and_subjectId_and_key", ["worldId", "subjectId", "key"])
    .index("by_adventureId", ["adventureId"])
    .index("by_adventureId_and_subjectId", ["adventureId", "subjectId"])
    .index("by_adventureId_and_subjectId_and_key", ["adventureId", "subjectId", "key"]),

  commands: defineTable({
    worldId: v.id("worlds"),
    adventureId: v.optional(v.id("adventures")),
    turnId: v.optional(v.id("turns")),
    actorId: v.id("actors"),
    input: v.string(),
    normalizedInput: v.string(),
  })
    .index("by_worldId", ["worldId"])
    .index("by_worldId_and_turnId", ["worldId", "turnId"])
    .index("by_adventureId", ["adventureId"])
    .index("by_adventureId_and_turnId", ["adventureId", "turnId"]),

  turns: defineTable({
    worldId: v.id("worlds"),
    adventureId: v.optional(v.id("adventures")),
    sequenceNumber: v.number(),
    actorId: v.id("actors"),
    commandId: v.optional(v.id("commands")),
    trigger: v.optional(v.union(v.literal("act"), v.literal("pass"))),
    status: v.union(v.literal("pending"), v.literal("succeeded"), v.literal("failed")),
    error: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  })
    .index("by_worldId", ["worldId"])
    .index("by_worldId_and_sequenceNumber", ["worldId", "sequenceNumber"])
    .index("by_adventureId", ["adventureId"])
    .index("by_adventureId_and_sequenceNumber", ["adventureId", "sequenceNumber"]),

  events: defineTable({
    worldId: v.id("worlds"),
    adventureId: v.optional(v.id("adventures")),
    turnId: v.optional(v.id("turns")),
    commandId: v.optional(v.id("commands")),
    text: v.string(),
    source: v.union(
      v.literal("seed"),
      v.literal("player"),
      v.literal("engine"),
      v.literal("llm"),
      v.literal("manual"),
    ),
  })
    .index("by_worldId", ["worldId"])
    .index("by_worldId_and_turnId", ["worldId", "turnId"])
    .index("by_adventureId", ["adventureId"])
    .index("by_adventureId_and_turnId", ["adventureId", "turnId"]),

  stateDiffs: defineTable({
    worldId: v.id("worlds"),
    adventureId: v.optional(v.id("adventures")),
    turnId: v.optional(v.id("turns")),
    commandId: v.optional(v.id("commands")),
    source: v.union(v.literal("player"), v.literal("engine"), v.literal("llm"), v.literal("manual")),
    operations: v.array(
      v.union(
        v.object({
          op: v.literal("moveActor"),
          actorId: v.id("actors"),
          toRoomId: v.id("rooms"),
        }),
        v.object({
          op: v.literal("setFact"),
          subjectType: v.string(),
          subjectId: v.string(),
          key: v.string(),
          value: factValue,
        }),
        v.object({
          op: v.literal("appendEvent"),
          text: v.string(),
        }),
      ),
    ),
  })
    .index("by_worldId", ["worldId"])
    .index("by_worldId_and_turnId", ["worldId", "turnId"])
    .index("by_adventureId", ["adventureId"])
    .index("by_adventureId_and_turnId", ["adventureId", "turnId"]),

  narrations: defineTable({
    worldId: v.id("worlds"),
    adventureId: v.optional(v.id("adventures")),
    turnId: v.optional(v.id("turns")),
    commandId: v.optional(v.id("commands")),
    text: v.string(),
    source: v.union(v.literal("seed"), v.literal("engine"), v.literal("llm")),
  })
    .index("by_worldId", ["worldId"])
    .index("by_worldId_and_turnId", ["worldId", "turnId"])
    .index("by_adventureId", ["adventureId"])
    .index("by_adventureId_and_turnId", ["adventureId", "turnId"]),

  directorCalls: defineTable({
    worldId: v.id("worlds"),
    adventureId: v.optional(v.id("adventures")),
    turnId: v.optional(v.id("turns")),
    commandId: v.optional(v.id("commands")),
    provider: v.string(),
    model: v.string(),
    requestSummary: v.any(),
    rawRequest: v.optional(v.any()),
    rawResponse: v.optional(v.string()),
    parsedResponse: v.optional(v.any()),
    status: v.union(
      v.literal("success"),
      v.literal("provider_error"),
      v.literal("invalid_output"),
    ),
    acceptedUpdates: v.array(v.any()),
    ignoredUpdates: v.array(v.any()),
    error: v.optional(v.string()),
  })
    .index("by_worldId", ["worldId"])
    .index("by_worldId_and_turnId", ["worldId", "turnId"])
    .index("by_adventureId", ["adventureId"])
    .index("by_adventureId_and_turnId", ["adventureId", "turnId"]),
});
