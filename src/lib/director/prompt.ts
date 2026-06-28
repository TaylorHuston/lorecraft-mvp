import { NPC_FACT_KEYS, type DirectorContext, type DirectorRequest } from "./types";

export const RECENT_FEED_LIMIT = 12;

const SYSTEM_PROMPT = [
  "You are Lorecraft's Director for a narrative-first persistent-world MVP.",
  "Respond only with strict JSON. Do not wrap the JSON in Markdown.",
  'The JSON object must include a non-empty string field named "narration".',
  'It may include "npcUpdates", an array of updates for current-scene NPCs only. Use an empty array when no NPC state changes.',
  'Return exactly this top-level shape: {"narration":"player-facing narration","npcUpdates":[]}.',
  'Never include playerInput, scene, outputShape, world, room, visibleExits, currentSceneActors, or recentFeed in your response.',
  'Each NPC update must use actorKey, reason, and changes. Only mood, status, and memory may appear inside changes.',
  "The memory field is a compact rolling summary and must be 500 characters or less.",
  "The status field is stable ongoing circumstance, not moment-to-moment physical action.",
  "Do not update status just because an immediate beat happened, such as being pushed, stumbling, flinching, glancing, or briefly moving; narrate those beats instead.",
  "Only update status when the condition remains important after the moment resolves and should still matter after recent feed context falls away.",
  "Use hidden NPC facts as guidance for observable behavior, but do not mechanically expose fact names to the player.",
  "Rooms, exits, actor location, inventory, combat, HP, and rules are out of scope. Narrate movement attempts without changing location state.",
].join("\n");

export function buildDirectorRequest(context: DirectorContext, playerInput: string): DirectorRequest {
  const recentFeed = context.recentFeed.slice(-RECENT_FEED_LIMIT);
  const currentSceneActors = context.actors.map((actor) => ({
    key: actor.key,
    name: actor.name,
    role: actor.role,
    description: actor.description,
    facts: actor.facts.filter((fact) =>
      NPC_FACT_KEYS.includes(fact.key as (typeof NPC_FACT_KEYS)[number]),
    ),
  }));

  const scenePayload = {
    playerInput,
    scene: {
      world: {
        name: context.world.name,
        description: context.world.description,
      },
      room: {
        key: context.room.key,
        name: context.room.name,
        description: context.room.description,
      },
      visibleExits: context.exits,
      visibleObjects: context.objects,
      currentSceneActors,
      recentFeed: recentFeed.map((entry) => ({
        kind: entry.kind,
        text: entry.text,
        source: entry.source,
      })),
    },
  };

  return {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(scenePayload, null, 2) },
    ],
    requestSummary: {
      worldName: context.world.name,
      roomKey: context.room.key,
      playerInputLength: playerInput.length,
      recentFeedCount: recentFeed.length,
      actorKeys: context.actors.map((actor) => actor.key),
      npcFactKeys: NPC_FACT_KEYS.filter((key) =>
        context.actors.some((actor) => actor.facts.some((fact) => fact.key === key)),
      ),
    },
  };
}
