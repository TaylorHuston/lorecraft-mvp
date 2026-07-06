"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorMessage } from "./debug-formatters";

export type NpcSaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

export type NpcDebugDraft = {
  name?: string;
  description?: string;
  facts?: Record<string, string>;
};

export type NpcDebugSavePayload = {
  name: string;
  description: string;
  facts: Record<string, string>;
};

export type NpcDebugActor = {
  _id: Id<"actors">;
  key: string;
  name: string;
  description: string;
  role: "npc";
  locationKey: string;
  locationName: string;
};

type NpcPendingSave = {
  adventureId: Id<"adventures">;
  actor: NpcDebugActor;
  payload: NpcDebugSavePayload;
  saveVersion: number;
};

type UseNpcDebugAutosaveOptions = {
  adventureId: Id<"adventures"> | null;
  locations:
    | Array<{
        key: string;
        name: string;
        actors: Array<{
          _id: Id<"actors">;
          key: string;
          name: string;
          description: string;
          role: "player" | "npc";
        }>;
      }>
    | undefined;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
};

export const NPC_PROFILE_FACT_KEYS = [
  "background",
  "persona",
  "voice",
  "mood",
  "status",
  "memory",
  "knowledge",
];

export function useNpcDebugAutosave({
  adventureId,
  locations,
  onError,
  onNotice,
}: UseNpcDebugAutosaveOptions) {
  const updateNpc = useAction(api.world.updateNpc);
  const createNpc = useAction(api.world.createNpc);
  const resetNpc = useAction(api.world.resetNpc);
  const [drafts, setDrafts] = useState<Record<string, NpcDebugDraft>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, NpcSaveStatus>>({});
  const [collapsedNpcKeys, setCollapsedNpcKeys] = useState<Record<string, boolean>>({});
  const [savingNpcKey, setSavingNpcKey] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveVersions = useRef<Record<string, number>>({});
  const pendingSaves = useRef<Record<string, NpcPendingSave>>({});
  const activeSaves = useRef<Record<string, Promise<boolean>[]>>({});
  const nextDebugNpcOrdinal = useRef(1);

  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      for (const timer of Object.values(timers)) {
        clearTimeout(timer);
      }
      pendingSaves.current = {};
    };
  }, []);

  function resetLocalState() {
    setDrafts({});
    setSaveStatus({});
    setCollapsedNpcKeys({});
  }

  function updateDraft(
    actor: NpcDebugActor,
    draft: NpcDebugDraft,
    payload: NpcDebugSavePayload,
  ) {
    setDrafts((current) => ({
      ...current,
      [actor.key]: draft,
    }));
    scheduleSave(actor, payload);
  }

  async function addNpc() {
    if (!adventureId) {
      return;
    }

    const existingActorKeys = new Set(
      locations?.flatMap((location) => location.actors.map((actor) => actor.key)) ?? [],
    );
    let actorKey = `debug-npc-${nextDebugNpcOrdinal.current}`;
    while (existingActorKeys.has(actorKey)) {
      nextDebugNpcOrdinal.current += 1;
      actorKey = `debug-npc-${nextDebugNpcOrdinal.current}`;
    }
    nextDebugNpcOrdinal.current += 1;
    const payload = {
      name: "New NPC",
      description: "A temporary NPC for playtesting.",
      facts: defaultNpcFacts(),
    };

    onError(null);
    onNotice(null);
    setSavingNpcKey(actorKey);
    setSaveStatus((current) => ({ ...current, [actorKey]: "saving" }));
    setCollapsedNpcKeys((current) => ({ ...current, [actorKey]: false }));
    try {
      const result = await createNpc({
        adventureId,
        key: actorKey,
        ...payload,
      });
      if (!result.ok) {
        onError(result.error ?? "Failed to create NPC.");
        setSaveStatus((current) => ({ ...current, [actorKey]: "error" }));
        return;
      }
      setSaveStatus((current) => ({ ...current, [actorKey]: "saved" }));
      onNotice("NPC created.");
    } catch (createError) {
      onError(errorMessage(createError));
      setSaveStatus((current) => ({ ...current, [actorKey]: "error" }));
    } finally {
      setSavingNpcKey(null);
    }
  }

  function toggleCollapsed(actorKey: string) {
    setCollapsedNpcKeys((current) => ({ ...current, [actorKey]: !(current[actorKey] ?? true) }));
  }

  function scheduleSave(actor: NpcDebugActor, payload: NpcDebugSavePayload) {
    if (!adventureId) {
      return;
    }

    saveVersions.current[actor.key] = (saveVersions.current[actor.key] ?? 0) + 1;
    const saveVersion = saveVersions.current[actor.key];
    const saveAdventureId = adventureId;

    setSaveStatus((current) => ({ ...current, [actor.key]: "unsaved" }));
    clearTimeout(saveTimers.current[actor.key]);
    pendingSaves.current[actor.key] = {
      adventureId: saveAdventureId,
      actor,
      payload,
      saveVersion,
    };
    saveTimers.current[actor.key] = setTimeout(() => {
      delete saveTimers.current[actor.key];
      delete pendingSaves.current[actor.key];
      void startPersist({ adventureId: saveAdventureId, actor, payload, saveVersion });
    }, 700);
  }

  function startPersist(pendingSave: NpcPendingSave) {
    const savePromise = persistNpc(
      pendingSave.adventureId,
      pendingSave.actor,
      pendingSave.payload,
      pendingSave.saveVersion,
    );
    activeSaves.current[pendingSave.actor.key] = [
      ...(activeSaves.current[pendingSave.actor.key] ?? []),
      savePromise,
    ];
    void savePromise.finally(() => {
      const remainingSaves = (activeSaves.current[pendingSave.actor.key] ?? []).filter(
        (activeSave) => activeSave !== savePromise,
      );
      if (remainingSaves.length > 0) {
        activeSaves.current[pendingSave.actor.key] = remainingSaves;
      } else {
        delete activeSaves.current[pendingSave.actor.key];
      }
    });
    return savePromise;
  }

  async function flushQueuedSaves() {
    const queuedSaves = Object.values(pendingSaves.current);
    const flushedSaves = queuedSaves.map((pendingSave) => {
      clearTimeout(saveTimers.current[pendingSave.actor.key]);
      delete saveTimers.current[pendingSave.actor.key];
      delete pendingSaves.current[pendingSave.actor.key];
      return startPersist(pendingSave);
    });
    const activeSaveList = Object.values(activeSaves.current).flat();
    const results = await Promise.all([...flushedSaves, ...activeSaveList]);
    return results.every(Boolean);
  }

  async function cancelQueuedSavesAndWaitForActive() {
    const actorKeys = new Set([
      ...Object.keys(saveTimers.current),
      ...Object.keys(pendingSaves.current),
      ...Object.keys(activeSaves.current),
      ...Object.keys(saveVersions.current),
    ]);

    for (const actorKey of actorKeys) {
      clearTimeout(saveTimers.current[actorKey]);
      delete saveTimers.current[actorKey];
      delete pendingSaves.current[actorKey];
      saveVersions.current[actorKey] = (saveVersions.current[actorKey] ?? 0) + 1;
    }

    await Promise.allSettled(Object.values(activeSaves.current).flat());
  }

  async function persistNpc(
    saveAdventureId: Id<"adventures">,
    actor: NpcDebugActor,
    payload: NpcDebugSavePayload,
    saveVersion: number,
  ): Promise<boolean> {
    onError(null);
    setSavingNpcKey(actor.key);
    setSaveStatus((current) => ({ ...current, [actor.key]: "saving" }));
    try {
      const result = await updateNpc({
        adventureId: saveAdventureId,
        actorId: actor._id,
        name: payload.name,
        description: payload.description,
        facts: payload.facts,
      });
      if (!result.ok) {
        onError(result.error ?? "Failed to save NPC.");
        setSaveStatus((current) => ({ ...current, [actor.key]: "error" }));
        return false;
      }

      if (saveVersions.current[actor.key] === saveVersion) {
        setSaveStatus((current) => ({ ...current, [actor.key]: "saved" }));
      }
      return true;
    } catch (saveError) {
      onError(errorMessage(saveError));
      setSaveStatus((current) => ({ ...current, [actor.key]: "error" }));
      return false;
    } finally {
      if (saveVersions.current[actor.key] === saveVersion) {
        setSavingNpcKey(null);
      }
    }
  }

  async function resetActor(actor: NpcDebugActor) {
    if (!adventureId) {
      return;
    }

    onError(null);
    onNotice(null);
    setSavingNpcKey(actor.key);
    clearTimeout(saveTimers.current[actor.key]);
    delete saveTimers.current[actor.key];
    delete pendingSaves.current[actor.key];
    saveVersions.current[actor.key] = (saveVersions.current[actor.key] ?? 0) + 1;
    try {
      const result = await resetNpc({ adventureId, actorId: actor._id });
      if (!result.ok) {
        onError(result.error ?? "Failed to reset NPC.");
        return;
      }
      setDrafts((current) => {
        const next = { ...current };
        delete next[actor.key];
        return next;
      });
      setSaveStatus((current) => ({ ...current, [actor.key]: "idle" }));
      onNotice(result.actorId ? "NPC reset." : "Debug NPC removed.");
    } catch (resetError) {
      onError(errorMessage(resetError));
    } finally {
      setSavingNpcKey(null);
    }
  }

  return {
    actors: buildNpcDebugActors(locations ?? []),
    drafts,
    saveStatus,
    collapsedNpcKeys,
    savingNpcKey,
    addNpc,
    updateDraft,
    toggleCollapsed,
    resetActor,
    flushQueuedSaves,
    cancelQueuedSavesAndWaitForActive,
    resetLocalState,
  };
}

export function defaultNpcFacts() {
  return {
    background: "New NPC background.",
    persona: "New NPC personality.",
    voice: "New NPC voice.",
    mood: "neutral",
    status: "present in the current scene",
    memory: "This NPC has not yet formed meaningful memories of Taylor.",
    knowledge: "This NPC has no private knowledge yet.",
  };
}

export function buildNpcDebugActors(
  locations: Array<{
    key: string;
    name: string;
    actors: Array<{
      _id: Id<"actors">;
      key: string;
      name: string;
      description: string;
      role: "player" | "npc";
    }>;
  }>,
): NpcDebugActor[] {
  return locations.flatMap((location) =>
    location.actors
      .filter((actor): actor is typeof actor & { role: "npc" } => actor.role === "npc")
      .map((actor) => ({
        _id: actor._id,
        key: actor.key,
        name: actor.name,
        description: actor.description,
        role: "npc",
        locationKey: location.key,
        locationName: location.name,
      })),
  );
}
