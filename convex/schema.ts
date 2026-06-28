import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const factValue = v.union(v.string(), v.number(), v.boolean(), v.null());

export default defineSchema({
  worlds: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    currentPlayerActorId: v.optional(v.id("actors")),
  }).index("by_slug", ["slug"]),

  rooms: defineTable({
    worldId: v.id("worlds"),
    key: v.string(),
    name: v.string(),
    description: v.string(),
  })
    .index("by_worldId", ["worldId"])
    .index("by_worldId_and_key", ["worldId", "key"]),

  exits: defineTable({
    worldId: v.id("worlds"),
    fromRoomId: v.id("rooms"),
    toRoomId: v.id("rooms"),
    label: v.string(),
    visible: v.boolean(),
  })
    .index("by_worldId", ["worldId"])
    .index("by_worldId_and_fromRoomId", ["worldId", "fromRoomId"]),

  actors: defineTable({
    worldId: v.id("worlds"),
    roomId: v.id("rooms"),
    name: v.string(),
    role: v.union(v.literal("player"), v.literal("npc")),
    description: v.string(),
  })
    .index("by_worldId", ["worldId"])
    .index("by_worldId_and_roomId", ["worldId", "roomId"])
    .index("by_worldId_and_role", ["worldId", "role"]),

  worldObjects: defineTable({
    worldId: v.id("worlds"),
    roomId: v.id("rooms"),
    key: v.string(),
    name: v.string(),
    description: v.string(),
    visible: v.boolean(),
  })
    .index("by_worldId", ["worldId"])
    .index("by_worldId_and_roomId", ["worldId", "roomId"])
    .index("by_worldId_and_key", ["worldId", "key"]),

  facts: defineTable({
    worldId: v.id("worlds"),
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
    .index("by_worldId_and_subjectId_and_key", ["worldId", "subjectId", "key"]),

  commands: defineTable({
    worldId: v.id("worlds"),
    actorId: v.id("actors"),
    input: v.string(),
    normalizedInput: v.string(),
  }).index("by_worldId", ["worldId"]),

  events: defineTable({
    worldId: v.id("worlds"),
    commandId: v.optional(v.id("commands")),
    text: v.string(),
    source: v.union(v.literal("seed"), v.literal("player"), v.literal("engine"), v.literal("manual")),
  }).index("by_worldId", ["worldId"]),

  stateDiffs: defineTable({
    worldId: v.id("worlds"),
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
  }).index("by_worldId", ["worldId"]),

  narrations: defineTable({
    worldId: v.id("worlds"),
    commandId: v.optional(v.id("commands")),
    text: v.string(),
    source: v.union(v.literal("seed"), v.literal("engine"), v.literal("llm")),
  }).index("by_worldId", ["worldId"]),
});
