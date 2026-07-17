"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorMessage } from "./debug-formatters";
import { NpcSaveQueue, type NpcPatch } from "./npc-save-queue";

export type NpcSaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

export type NpcDebugDraft = {
  name?: string;
  description?: string;
  locationKey?: string;
  facts?: Record<string, string>;
};

export type NpcDebugSavePayload = NpcPatch;

export type NewNpcDraft = {
  key: string;
  name: string;
  description: string;
  locationKey: string;
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

type UseNpcDebugAutosaveOptions = {
  adventureId: Id<"adventures"> | null;
  writesDisabled: boolean;
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
] as const;

const EMPTY_NPC_DRAFT: NewNpcDraft = {
  key: "",
  name: "",
  description: "",
  locationKey: "",
};

export function useNpcDebugAutosave({
  adventureId,
  writesDisabled,
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
  const [newNpc, setNewNpcState] = useState<NewNpcDraft>(EMPTY_NPC_DRAFT);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingNpc, setIsCreatingNpc] = useState(false);
  const isCreatingNpcRef = useRef(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveQueues = useRef<Record<string, NpcSaveQueue>>({});
  const saveQueueOwners = useRef<Record<string, string>>({});
  const newNpcValidationError = validateNewNpcDraft(newNpc, locations ?? []);
  const hasNewNpcInput = Boolean(
    newNpc.key.trim() || newNpc.name.trim() || newNpc.description.trim() || newNpc.locationKey,
  );

  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      for (const timer of Object.values(timers)) {
        clearTimeout(timer);
      }
    };
  }, []);

  function resetLocalState() {
    for (const timer of Object.values(saveTimers.current)) {
      clearTimeout(timer);
    }
    saveTimers.current = {};
    saveQueues.current = {};
    saveQueueOwners.current = {};
    setDrafts({});
    setSaveStatus({});
    setCollapsedNpcKeys({});
    setNewNpcState(EMPTY_NPC_DRAFT);
    setCreateError(null);
  }

  function updateDraft(
    actor: NpcDebugActor,
    draft: NpcDebugDraft,
    patch: NpcDebugSavePayload,
  ) {
    setDrafts((current) => ({
      ...current,
      [actor.key]: draft,
    }));
    scheduleSave(actor, patch);
  }

  async function createNewNpc() {
    if (!adventureId || writesDisabled || isCreatingNpcRef.current) {
      return;
    }
    const validationError = validateNewNpcDraft(newNpc, locations ?? []);
    if (validationError) {
      setCreateError(validationError);
      return;
    }
    const actorKey = newNpc.key.trim().toLowerCase();
    const payload = {
      name: newNpc.name.trim(),
      description: newNpc.description.trim(),
      locationKey: newNpc.locationKey,
      facts: defaultNpcFacts(),
    };

    setCreateError(null);
    onNotice(null);
    isCreatingNpcRef.current = true;
    setIsCreatingNpc(true);
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
        setCreateError(result.error ?? "Failed to create NPC.");
        setSaveStatus((current) => ({ ...current, [actorKey]: "error" }));
        return;
      }
      setNewNpcState(EMPTY_NPC_DRAFT);
      setSaveStatus((current) => ({ ...current, [actorKey]: "saved" }));
      onNotice("NPC created.");
    } catch (createError) {
      setCreateError(errorMessage(createError));
      setSaveStatus((current) => ({ ...current, [actorKey]: "error" }));
    } finally {
      isCreatingNpcRef.current = false;
      setIsCreatingNpc(false);
      setSavingNpcKey(null);
    }
  }

  function toggleCollapsed(actorKey: string) {
    setCollapsedNpcKeys((current) => ({ ...current, [actorKey]: !(current[actorKey] ?? true) }));
  }

  function setNewNpc(draft: NewNpcDraft) {
    setNewNpcState(draft);
    setCreateError(null);
  }

  function scheduleSave(actor: NpcDebugActor, patch: NpcDebugSavePayload) {
    if (!adventureId || writesDisabled) {
      return;
    }

    setSaveStatus((current) => ({ ...current, [actor.key]: "unsaved" }));
    clearTimeout(saveTimers.current[actor.key]);
    queueFor(actor, adventureId).stage(patch);
    saveTimers.current[actor.key] = setTimeout(() => {
      delete saveTimers.current[actor.key];
      void flushNpcQueue(actor.key);
    }, 700);
  }

  function queueFor(actor: NpcDebugActor, saveAdventureId: Id<"adventures">) {
    const owner = `${saveAdventureId}:${actor._id}`;
    if (!saveQueues.current[actor.key] || saveQueueOwners.current[actor.key] !== owner) {
      saveQueues.current[actor.key] = new NpcSaveQueue((patch) =>
        persistNpc(saveAdventureId, actor, patch),
      );
      saveQueueOwners.current[actor.key] = owner;
    }
    return saveQueues.current[actor.key];
  }

  async function flushNpcQueue(actorKey: string) {
    const queue = saveQueues.current[actorKey];
    if (!queue) {
      return true;
    }
    const saved = await queue.flush();
    setSaveStatus((current) => ({ ...current, [actorKey]: saved ? "saved" : "error" }));
    return saved;
  }

  async function flushQueuedSaves() {
    const actorKeys = Object.keys(saveQueues.current);
    for (const actorKey of actorKeys) {
      clearTimeout(saveTimers.current[actorKey]);
      delete saveTimers.current[actorKey];
    }
    const results = await Promise.all(actorKeys.map(flushNpcQueue));
    return results.every(Boolean);
  }

  async function cancelQueuedSavesAndWaitForActive() {
    const actorKeys = Object.keys(saveQueues.current);
    for (const actorKey of actorKeys) {
      clearTimeout(saveTimers.current[actorKey]);
      delete saveTimers.current[actorKey];
    }
    await Promise.allSettled(actorKeys.map((actorKey) => saveQueues.current[actorKey].cancelAndWait()));
  }

  async function persistNpc(
    saveAdventureId: Id<"adventures">,
    actor: NpcDebugActor,
    patch: NpcDebugSavePayload,
  ): Promise<boolean> {
    onError(null);
    setSavingNpcKey(actor.key);
    setSaveStatus((current) => ({ ...current, [actor.key]: "saving" }));
    try {
      const result = await updateNpc({
        adventureId: saveAdventureId,
        actorId: actor._id,
        ...patch,
      });
      if (!result.ok) {
        onError(result.error ?? "Failed to save NPC.");
        setSaveStatus((current) => ({ ...current, [actor.key]: "error" }));
        return false;
      }

      return true;
    } catch (saveError) {
      onError(errorMessage(saveError));
      setSaveStatus((current) => ({ ...current, [actor.key]: "error" }));
      return false;
    } finally {
      setSavingNpcKey(null);
    }
  }

  async function resetActor(actor: NpcDebugActor) {
    if (!adventureId || writesDisabled) {
      return;
    }

    onError(null);
    onNotice(null);
    setSavingNpcKey(actor.key);
    clearTimeout(saveTimers.current[actor.key]);
    delete saveTimers.current[actor.key];
    try {
      const queue = queueFor(actor, adventureId);
      const result = await queue.reset(() => resetNpc({ adventureId, actorId: actor._id }));
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
    newNpc,
    createError,
    createValidationError: hasNewNpcInput ? newNpcValidationError : null,
    isCreatingNpc,
    canCreateNpc: !newNpcValidationError && !isCreatingNpc && !writesDisabled,
    setNewNpc,
    createNewNpc,
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

export function validateNewNpcDraft(
  draft: NewNpcDraft,
  locations: Array<{ key: string }>,
) {
  const key = draft.key.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,48}$/.test(key)) {
    return "NPC key must use lowercase letters, numbers, and hyphens.";
  }
  if (!draft.name.trim() || !draft.description.trim()) {
    return "NPC name and description are required.";
  }
  if (!locations.some((location) => location.key === draft.locationKey)) {
    return "Select a valid location for this NPC.";
  }
  return null;
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
