import type { AdventureBaseline } from "./stormbound-baseline";

export type BaselineNpc = AdventureBaseline["npcs"][number];
const LEGACY_NPC_FACT_KEYS_BY_ACTOR_KEY: Record<string, readonly string[]> = {
  mira: ["knows_about_storm"],
};

export function findBaselineNpc(baseline: AdventureBaseline, actorKey: string) {
  return baseline.npcs.find((npc) => npc.key === actorKey) ?? null;
}

export function baselineNpcLegacyFactKeys(npc: BaselineNpc) {
  return npc.legacyFactKeys ?? LEGACY_NPC_FACT_KEYS_BY_ACTOR_KEY[npc.key] ?? [];
}

export function countDebugCreatedLocationKeys(
  baseline: AdventureBaseline,
  locationKeys: readonly string[],
) {
  const baselineKeys = new Set(baseline.rooms.map((room) => room.key));
  return locationKeys.filter((key) => !baselineKeys.has(key)).length;
}

export function countDebugCreatedNpcKeys(
  baseline: AdventureBaseline,
  npcKeys: readonly string[],
) {
  const baselineKeys = new Set(baseline.npcs.map((npc) => npc.key));
  return npcKeys.filter((key) => !baselineKeys.has(key)).length;
}
