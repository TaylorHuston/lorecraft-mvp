import type { NpcDebugOverride } from "./types";

type OverrideStore = Map<string, Map<string, NpcDebugOverride>>;

const MAX_OVERRIDE_WORLDS = 20;
const MAX_OVERRIDES_PER_WORLD = 50;

const globalForNpcOverrides = globalThis as typeof globalThis & {
  __lorecraftNpcDebugOverrides?: OverrideStore;
};

const overridesByWorld =
  globalForNpcOverrides.__lorecraftNpcDebugOverrides ??
  (globalForNpcOverrides.__lorecraftNpcDebugOverrides = new Map());

export function getNpcDebugOverrides(worldId: string): Record<string, NpcDebugOverride> {
  return Object.fromEntries(overridesByWorld.get(worldId.trim())?.entries() ?? []);
}

export function setNpcDebugOverride(worldId: string, actorKey: string, override: NpcDebugOverride) {
  const normalizedWorldId = worldId.trim();
  const normalizedActorKey = actorKey.trim();
  if (!normalizedWorldId || !normalizedActorKey) {
    return {};
  }

  const normalizedOverride = normalizeOverride(override);
  let worldOverrides = overridesByWorld.get(normalizedWorldId);
  if (!worldOverrides) {
    evictOldestWorldIfNeeded();
    worldOverrides = new Map();
    overridesByWorld.set(normalizedWorldId, worldOverrides);
  } else {
    touchWorld(normalizedWorldId, worldOverrides);
  }

  if (isEmptyOverride(normalizedOverride)) {
    worldOverrides.delete(normalizedActorKey);
  } else {
    evictOldestActorIfNeeded(worldOverrides, normalizedActorKey);
    worldOverrides.set(normalizedActorKey, normalizedOverride);
  }

  if (worldOverrides.size === 0) {
    overridesByWorld.delete(normalizedWorldId);
  }

  return getNpcDebugOverrides(normalizedWorldId);
}

export function clearNpcDebugOverride(worldId: string, actorKey: string) {
  const normalizedWorldId = worldId.trim();
  const worldOverrides = overridesByWorld.get(normalizedWorldId);
  worldOverrides?.delete(actorKey.trim());
  if (worldOverrides?.size === 0) {
    overridesByWorld.delete(normalizedWorldId);
  }
  return getNpcDebugOverrides(normalizedWorldId);
}

export function clearNpcDebugOverrides(worldId: string) {
  overridesByWorld.delete(worldId.trim());
  return {};
}

function touchWorld(worldId: string, worldOverrides: Map<string, NpcDebugOverride>) {
  overridesByWorld.delete(worldId);
  overridesByWorld.set(worldId, worldOverrides);
}

function evictOldestWorldIfNeeded() {
  if (overridesByWorld.size < MAX_OVERRIDE_WORLDS) {
    return;
  }

  const oldestWorldId = overridesByWorld.keys().next().value;
  if (oldestWorldId) {
    overridesByWorld.delete(oldestWorldId);
  }
}

function evictOldestActorIfNeeded(
  worldOverrides: Map<string, NpcDebugOverride>,
  actorKey: string,
) {
  if (worldOverrides.has(actorKey) || worldOverrides.size < MAX_OVERRIDES_PER_WORLD) {
    return;
  }

  const oldestActorKey = worldOverrides.keys().next().value;
  if (oldestActorKey) {
    worldOverrides.delete(oldestActorKey);
  }
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
