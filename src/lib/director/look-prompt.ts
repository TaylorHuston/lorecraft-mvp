import type {
  DirectorContext,
  DirectorGenerationSettingsSummary,
  DirectorRequest,
} from "./types";

type LookTarget =
  | { kind: "scene" }
  | { kind: "actor"; key: string; name: string }
  | { kind: "object"; key: string; name: string }
  | { kind: "location"; key: string; name: string };

const LOOK_SYSTEM_PROMPT = [
  "You are Lorecraft's Game Master handling a read-only look command.",
  "Describe only what the player can plausibly observe right now.",
  "Ground the description in canonical cards first. Recent story may color the moment but must not override canonical truth.",
  "Do not advance time, resolve new actions, mutate state, reveal hidden knowledge, or ask what the player does next.",
  "Return plain player-facing prose only.",
].join("\n");

export function resolveLookTarget(
  context: DirectorContext,
  target: string | undefined,
): { ok: true; target: LookTarget } | { ok: false; text: string } {
  const normalizedTarget = normalizeTarget(target);
  if (!normalizedTarget) {
    return { ok: true, target: { kind: "scene" } };
  }

  const actor = context.actors.find(
    (candidate) =>
      normalizeTarget(candidate.key) === normalizedTarget ||
      normalizeTarget(candidate.name) === normalizedTarget,
  );
  if (actor) {
    return {
      ok: true,
      target: { kind: "actor", key: actor.key, name: actor.name },
    };
  }

  const object = context.objects.find(
    (candidate) =>
      normalizeTarget(candidate.key) === normalizedTarget ||
      normalizeTarget(candidate.name) === normalizedTarget,
  );
  if (object) {
    return {
      ok: true,
      target: { kind: "object", key: object.key, name: object.name },
    };
  }

  const location = [
    {
      key: context.room.key,
      name: context.room.name,
    },
    ...(context.knownLocations ?? []).map((knownLocation) => ({
      key: knownLocation.key,
      name: knownLocation.name,
    })),
  ].find(
    (candidate) =>
      normalizeTarget(candidate.key) === normalizedTarget ||
      normalizeTarget(candidate.name) === normalizedTarget,
  );
  if (location) {
    return {
      ok: true,
      target: { kind: "location", key: location.key, name: location.name },
    };
  }

  return {
    ok: false,
    text: `You do not see "${target?.trim()}" here to inspect.`,
  };
}

export function buildLookRequest(
  context: DirectorContext,
  target: LookTarget,
  options: {
    rawInput: string;
    generationSettings?: DirectorGenerationSettingsSummary;
  },
): DirectorRequest {
  const userPrompt = [
    `World: ${context.world.name}. ${context.world.description}`,
    `Current location: ${context.room.name}. ${context.room.description}`,
    context.locationCard
      ? `Visible exits: ${
          context.locationCard.visibleExits
            .map((exit) => `${exit.label} to ${exit.toLocationName}`)
            .join("; ") || "none"
        }`
      : `Visible exits: ${context.exits.map((exit) => `${exit.label} to ${exit.toRoomName}`).join("; ") || "none"}`,
    `Present actors:\n${context.actors.map(formatActor).join("\n") || "none"}`,
    `Visible objects:\n${context.objects.map(formatObject).join("\n") || "none"}`,
    `Recent story:\n${(context.storyVisibleHistory ?? []).slice(-6).map((entry) => entry.text).join("\n\n") || "No recent narration yet."}`,
    `Look target: ${formatLookTarget(target)}`,
    `Player command: ${options.rawInput}`,
    "Write a concise inspection result in second person.",
  ].join("\n\n");

  const generationSettings = options.generationSettings
    ? { ...options.generationSettings, responseFormat: "text" as const }
    : undefined;

  return {
    messages: [
      { role: "system", content: LOOK_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    requestSummary: {
      directorMode: "persistent",
      callRole: "utility_look",
      outputContract: "plain_prose",
      adventureId: context.adventure.id,
      worldId: context.world.id,
      worldVersionId: context.sourceWorldVersion.id,
      worldName: context.world.name,
      roomKey: context.room.key,
      playerInputLength: options.rawInput.length,
      recentFeedCount: context.storyVisibleHistory?.length ?? 0,
      actorKeys: context.actors.map((actor) => actor.key),
      npcFactKeys: [],
      readOnlyKnowledgeKeys: [],
      requiredSceneBeat: {
        kind: "player_action",
        expectsNpcResponse: false,
        allowsNpcUpdates: false,
      },
      promptComponentKeys: [
        "lookInstructions",
        "locationCard",
        "presentActors",
        "visibleObjects",
        "recentStory",
        "lookTarget",
      ],
      ...(generationSettings ? { generationSettings } : {}),
    },
  };
}

function formatActor(actor: DirectorContext["actors"][number]) {
  const facts = actor.facts
    .filter((fact) => fact.key !== "knowledge")
    .map((fact) => `${fact.key}: ${String(fact.value)}`)
    .join("; ");
  return `- ${actor.name} (${actor.key}, ${actor.role}): ${actor.description}${facts ? ` Facts: ${facts}` : ""}`;
}

function formatObject(object: DirectorContext["objects"][number]) {
  return `- ${object.name} (${object.key}): ${object.description}`;
}

function formatLookTarget(target: LookTarget) {
  if (target.kind === "scene") {
    return "current scene";
  }
  return `${target.kind}: ${target.name} (${target.key})`;
}

function normalizeTarget(value: string | undefined) {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() ?? "";
}
