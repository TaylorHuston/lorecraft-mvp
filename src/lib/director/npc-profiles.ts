import type {
  DirectorActor,
  DirectorContext,
  DirectorNpcProfile,
  NpcDebugOverride,
} from "./types";

const OVERRIDE_SOURCE = "debug_override";

export function buildNpcProfiles(
  actors: DirectorActor[],
  overrides: Record<string, NpcDebugOverride> = {},
): DirectorNpcProfile[] {
  return actors
    .filter((actor) => actor.role === "npc")
    .map((actor) => ({
      key: actor.key,
      name: actor.name,
      description: actor.description,
      attributes: actor.facts.map((fact) => ({
        key: fact.key,
        value: fact.value,
        source: fact.source,
        ...(fact.source === OVERRIDE_SOURCE ? { overridden: true } : {}),
      })),
      overriddenFields: overriddenFieldsFor(actor, overrides[actor.key]),
    }));
}

export function applyNpcDebugOverrides(
  context: DirectorContext,
  overrides: Record<string, NpcDebugOverride>,
): DirectorContext {
  const existingActorKeys = new Set(context.actors.map((actor) => actor.key));
  const actors = context.actors.map((actor) => {
    if (actor.role !== "npc") {
      return actor;
    }

    const override = overrides[actor.key];
    if (!override) {
      return actor;
    }

    return {
      ...actor,
      name: override.name?.trim() || actor.name,
      description: override.description?.trim() || actor.description,
      facts: mergeFactOverrides(actor.facts, override.facts ?? {}),
    };
  });
  const addedActors = Object.entries(overrides)
    .filter(([actorKey]) => !existingActorKeys.has(actorKey))
    .map(([actorKey, override]) => debugOverrideToActor(actorKey, override));
  const allActors = [...actors, ...addedActors];

  return {
    ...context,
    actors: allActors,
    npcProfiles: buildNpcProfiles(allActors, overrides),
  };
}

export function npcOverrideKeys(overrides: Record<string, NpcDebugOverride>) {
  return Object.entries(overrides).flatMap(([actorKey, override]) => {
    const keys: string[] = [];
    if (override.name?.trim()) {
      keys.push(`${actorKey}.name`);
    }
    if (override.description?.trim()) {
      keys.push(`${actorKey}.description`);
    }
    for (const factKey of Object.keys(override.facts ?? {}).sort()) {
      keys.push(`${actorKey}.${factKey}`);
    }
    return keys;
  });
}

function mergeFactOverrides(actorFacts: DirectorActor["facts"], overrides: Record<string, string>) {
  const factsByKey = new Map(actorFacts.map((fact) => [fact.key, fact]));

  for (const [key, value] of Object.entries(overrides)) {
    const trimmed = value.trim();
    if (!key.trim() || !trimmed) {
      continue;
    }

    factsByKey.set(key, {
      key,
      value: trimmed,
      source: OVERRIDE_SOURCE,
    });
  }

  return Array.from(factsByKey.values());
}

function debugOverrideToActor(actorKey: string, override: NpcDebugOverride): DirectorActor {
  return {
    key: actorKey,
    name: override.name?.trim() || titleFromKey(actorKey),
    role: "npc",
    description: override.description?.trim() || "A temporary debug NPC.",
    facts: mergeFactOverrides([], override.facts ?? {}),
  };
}

function titleFromKey(actorKey: string) {
  const words = actorKey
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "Debug NPC";
  }

  return words.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(" ");
}

function overriddenFieldsFor(actor: DirectorActor, override: NpcDebugOverride | undefined) {
  const fields: string[] = [];

  if (override?.name?.trim()) {
    fields.push("name");
  }
  if (override?.description?.trim()) {
    fields.push("description");
  }

  fields.push(
    ...actor.facts
      .filter((fact) => fact.source === OVERRIDE_SOURCE)
      .map((fact) => `facts.${fact.key}`),
  );

  return fields;
}
