import type { NpcDebugOverride } from "./types";

type OverrideStore = Map<string, Map<string, NpcDebugOverride>>;

const globalForNpcOverrides = globalThis as typeof globalThis & {
  __lorecraftNpcDebugOverrides?: OverrideStore;
};

const overridesByWorld =
  globalForNpcOverrides.__lorecraftNpcDebugOverrides ??
  (globalForNpcOverrides.__lorecraftNpcDebugOverrides = new Map());

export function getNpcDebugOverrides(worldId: string): Record<string, NpcDebugOverride> {
  return Object.fromEntries(overridesByWorld.get(worldId)?.entries() ?? []);
}

export function setNpcDebugOverride(worldId: string, actorKey: string, override: NpcDebugOverride) {
  const normalizedActorKey = actorKey.trim();
  if (!worldId.trim() || !normalizedActorKey) {
    return getNpcDebugOverrides(worldId);
  }

  const normalizedOverride = normalizeOverride(override);
  let worldOverrides = overridesByWorld.get(worldId);
  if (!worldOverrides) {
    worldOverrides = new Map();
    overridesByWorld.set(worldId, worldOverrides);
  }

  if (isEmptyOverride(normalizedOverride)) {
    worldOverrides.delete(normalizedActorKey);
  } else {
    worldOverrides.set(normalizedActorKey, normalizedOverride);
  }

  if (worldOverrides.size === 0) {
    overridesByWorld.delete(worldId);
  }

  return getNpcDebugOverrides(worldId);
}

export function clearNpcDebugOverride(worldId: string, actorKey: string) {
  const worldOverrides = overridesByWorld.get(worldId);
  worldOverrides?.delete(actorKey.trim());
  if (worldOverrides?.size === 0) {
    overridesByWorld.delete(worldId);
  }
  return getNpcDebugOverrides(worldId);
}

export function clearNpcDebugOverrides(worldId: string) {
  overridesByWorld.delete(worldId);
  return {};
}

function normalizeOverride(override: NpcDebugOverride): NpcDebugOverride {
  const facts = Object.fromEntries(
    Object.entries(override.facts ?? {})
      .map(([key, value]) => [key.trim(), value.trim().slice(0, 1200)])
      .filter(([key, value]) => key.length > 0 && value.length > 0),
  );

  return {
    ...(override.name?.trim() ? { name: override.name.trim().slice(0, 120) } : {}),
    ...(override.description?.trim()
      ? { description: override.description.trim().slice(0, 1200) }
      : {}),
    ...(Object.keys(facts).length > 0 ? { facts } : {}),
  };
}

function isEmptyOverride(override: NpcDebugOverride) {
  return !override.name && !override.description && Object.keys(override.facts ?? {}).length === 0;
}
