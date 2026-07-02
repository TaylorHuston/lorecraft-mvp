"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type DirectorTurnResponse =
  | {
      ok: true;
      narration: string;
      acceptedUpdates: unknown[];
      ignoredUpdates: unknown[];
    }
  | {
      ok: false;
      error: string;
    };

type DirectorPromptGuidance = {
  style: string;
  npcBehavior: string;
  persistence: string;
};

type DebugTab = "prompt" | "npcs" | "locations" | "state";

type NpcSaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";
type NpcDebugDraft = {
  name?: string;
  description?: string;
  facts?: Record<string, string>;
};
type NpcDebugSavePayload = {
  name: string;
  description: string;
  facts: Record<string, string>;
};
type NpcDebugActor = {
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
type LocationSaveStatus = "idle" | "saving" | "saved" | "error";

const NPC_PROFILE_FACT_KEYS = [
  "background",
  "persona",
  "voice",
  "mood",
  "status",
  "memory",
  "knowledge",
];

const DEFAULT_PROMPT_GUIDANCE: DirectorPromptGuidance = {
  style: "Grounded, concise prose with concrete sensory detail. Keep the scene moving.",
  npcBehavior:
    "Present NPCs should make clear choices when directly engaged: answer, refuse, deflect, warn, ask back, act, or intentionally stay silent.",
  persistence:
    "Keep fleeting gestures and reactions in narration. Only update durable NPC facts when the change should matter after recent context falls away.",
};

export function WorldClient() {
  const defaultAdventureId = useQuery(api.world.getDefaultAdventure);
  const seedWorld = useMutation(api.world.seedDemoWorld);
  const resetPlaytestWorld = useMutation(api.world.resetPlaytestWorld);
  const updateLocation = useAction(api.world.updateLocation);
  const createLocation = useAction(api.world.createLocation);
  const updateNpc = useAction(api.world.updateNpc);
  const createNpc = useAction(api.world.createNpc);
  const resetNpc = useAction(api.world.resetNpc);
  const [selectedAdventureId, setSelectedAdventureId] = useState<Id<"adventures"> | null>(null);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDebugPanelCollapsed, setIsDebugPanelCollapsed] = useState(false);
  const [debugTab, setDebugTab] = useState<DebugTab>("prompt");
  const [npcDrafts, setNpcDrafts] = useState<Record<string, NpcDebugDraft>>({});
  const [npcSaveStatus, setNpcSaveStatus] = useState<
    Record<string, NpcSaveStatus>
  >({});
  const [collapsedNpcKeys, setCollapsedNpcKeys] = useState<Record<string, boolean>>({});
  const [savingNpcKey, setSavingNpcKey] = useState<string | null>(null);
  const [locationSaveStatus, setLocationSaveStatus] = useState<Record<string, LocationSaveStatus>>({});
  const [newLocation, setNewLocation] = useState({
    key: "",
    name: "",
    description: "",
  });
  const [promptGuidance, setPromptGuidance] = useState<DirectorPromptGuidance>(
    DEFAULT_PROMPT_GUIDANCE,
  );
  const storyScrollerRef = useRef<HTMLElement | null>(null);
  const npcSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const npcSaveVersions = useRef<Record<string, number>>({});
  const npcPendingSaves = useRef<Record<string, NpcPendingSave>>({});
  const npcActiveSaves = useRef<Record<string, Promise<boolean>[]>>({});
  const locationActiveSaves = useRef<Record<string, Promise<boolean>[]>>({});
  const nextDebugNpcOrdinal = useRef(1);

  const adventureId = selectedAdventureId ?? defaultAdventureId ?? null;
  const isLoadingDefaultAdventure =
    selectedAdventureId === null && defaultAdventureId === undefined;
  const snapshot = useQuery(api.world.getSnapshot, adventureId ? { adventureId } : "skip");
  const feedLength = snapshot?.feed.length ?? 0;
  const turnSequenceById = snapshot ? buildTurnSequenceById(snapshot.turns) : new Map<string, number>();
  const topBarWorldName = snapshot?.world.name ?? (adventureId ? "Loading world" : "No world");

  useEffect(() => {
    const storyScroller = storyScrollerRef.current;

    if (!storyScroller) {
      return;
    }

    storyScroller.scrollTop = storyScroller.scrollHeight;
  }, [feedLength, isSubmitting, error]);

  useEffect(() => {
    const timers = npcSaveTimers.current;
    return () => {
      for (const timer of Object.values(timers)) {
        clearTimeout(timer);
      }
      npcPendingSaves.current = {};
    };
  }, []);

  async function handleSeed() {
    setError(null);
    setNotice(null);
    setIsSeeding(true);
    try {
      await cancelQueuedNpcSavesAndWaitForActive();
      await flushActiveLocationSaves();
      setError(null);
      const seededAdventureId = await seedWorld();
      setSelectedAdventureId(seededAdventureId);
      setNpcDrafts({});
      setNpcSaveStatus({});
      setCollapsedNpcKeys({});
      setLocationSaveStatus({});
      setNotice("Fresh Stormbound Chapel world seeded.");
    } catch (seedError) {
      setError(errorMessage(seedError));
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleReset() {
    if (!adventureId) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsResetting(true);
    try {
      await cancelQueuedNpcSavesAndWaitForActive();
      await flushActiveLocationSaves();
      setError(null);
      const result = await resetPlaytestWorld({ adventureId });
      setNpcDrafts({});
      setNpcSaveStatus({});
      setCollapsedNpcKeys({});
      setLocationSaveStatus({});
      setNotice(
        `Reset playtest state: cleared ${result.deletedTurns} scoped turns, ${result.deletedCommands} player inputs, restored ${result.restoredFacts} NPC facts, removed ${result.deletedActors} debug NPCs, and reset ${result.resetActorLocations} actor locations.`,
      );
    } catch (resetError) {
      setError(errorMessage(resetError));
    } finally {
      setIsResetting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedInput = input.trim();

    if (!adventureId || !submittedInput || isSubmitting) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    setInput("");
    try {
      const npcSavesFlushed = await flushQueuedNpcSaves();
      const locationSavesFlushed = await flushActiveLocationSaves();
      if (!npcSavesFlushed || !locationSavesFlushed) {
        setInput((currentInput) => (currentInput.trim() ? currentInput : submittedInput));
        return;
      }

      const response = await fetch("/api/director/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adventureId,
          input: submittedInput,
          promptGuidance,
        }),
      });
      const result = (await response.json()) as DirectorTurnResponse;

      if (!response.ok || !result.ok) {
        setError(result.ok ? "The Game Master turn failed." : result.error);
        setInput((currentInput) => (currentInput.trim() ? currentInput : submittedInput));
        return;
      }

    } catch (submitError) {
      setError(errorMessage(submitError));
      setInput((currentInput) => (currentInput.trim() ? currentInput : submittedInput));
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateNpcDraft(
    actor: NpcDebugActor,
    draft: NpcDebugDraft,
    payload: NpcDebugSavePayload,
  ) {
    setNpcDrafts((current) => ({
      ...current,
      [actor.key]: draft,
    }));
    scheduleNpcSave(actor, payload);
  }

  async function addNpc() {
    if (!adventureId) {
      return;
    }

    const existingActorKeys = new Set(
      snapshot?.locations.flatMap((location) => location.actors.map((actor) => actor.key)) ?? [],
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

    setError(null);
    setNotice(null);
    setSavingNpcKey(actorKey);
    setNpcSaveStatus((current) => ({ ...current, [actorKey]: "saving" }));
    setCollapsedNpcKeys((current) => ({ ...current, [actorKey]: false }));
    try {
      const result = await createNpc({
        adventureId,
        key: actorKey,
        ...payload,
      });
      if (!result.ok) {
        setError(result.error ?? "Failed to create NPC.");
        setNpcSaveStatus((current) => ({ ...current, [actorKey]: "error" }));
        return;
      }
      setNpcSaveStatus((current) => ({ ...current, [actorKey]: "saved" }));
      setNotice("NPC created.");
    } catch (createError) {
      setError(errorMessage(createError));
      setNpcSaveStatus((current) => ({ ...current, [actorKey]: "error" }));
    } finally {
      setSavingNpcKey(null);
    }
  }

  function toggleNpcCollapsed(actorKey: string) {
    setCollapsedNpcKeys((current) => ({ ...current, [actorKey]: !(current[actorKey] ?? true) }));
  }

  function scheduleNpcSave(actor: NpcDebugActor, payload: NpcDebugSavePayload) {
    if (!adventureId) {
      return;
    }

    npcSaveVersions.current[actor.key] = (npcSaveVersions.current[actor.key] ?? 0) + 1;
    const saveVersion = npcSaveVersions.current[actor.key];
    const saveAdventureId = adventureId;

    setNpcSaveStatus((current) => ({ ...current, [actor.key]: "unsaved" }));
    clearTimeout(npcSaveTimers.current[actor.key]);
    npcPendingSaves.current[actor.key] = {
      adventureId: saveAdventureId,
      actor,
      payload,
      saveVersion,
    };
    npcSaveTimers.current[actor.key] = setTimeout(() => {
      delete npcSaveTimers.current[actor.key];
      delete npcPendingSaves.current[actor.key];
      void startPersistNpc({ adventureId: saveAdventureId, actor, payload, saveVersion });
    }, 700);
  }

  function startPersistNpc(pendingSave: NpcPendingSave) {
    const savePromise = persistNpc(
      pendingSave.adventureId,
      pendingSave.actor,
      pendingSave.payload,
      pendingSave.saveVersion,
    );
    npcActiveSaves.current[pendingSave.actor.key] = [
      ...(npcActiveSaves.current[pendingSave.actor.key] ?? []),
      savePromise,
    ];
    void savePromise.finally(() => {
      const remainingSaves = (npcActiveSaves.current[pendingSave.actor.key] ?? []).filter(
        (activeSave) => activeSave !== savePromise,
      );
      if (remainingSaves.length > 0) {
        npcActiveSaves.current[pendingSave.actor.key] = remainingSaves;
      } else {
        delete npcActiveSaves.current[pendingSave.actor.key];
      }
    });
    return savePromise;
  }

  async function flushQueuedNpcSaves() {
    const pendingSaves = Object.values(npcPendingSaves.current);
    const flushedSaves = pendingSaves.map((pendingSave) => {
      clearTimeout(npcSaveTimers.current[pendingSave.actor.key]);
      delete npcSaveTimers.current[pendingSave.actor.key];
      delete npcPendingSaves.current[pendingSave.actor.key];
      return startPersistNpc(pendingSave);
    });
    const activeSaves = Object.values(npcActiveSaves.current).flat();
    const results = await Promise.all([...flushedSaves, ...activeSaves]);
    return results.every(Boolean);
  }

  async function cancelQueuedNpcSavesAndWaitForActive() {
    const actorKeys = new Set([
      ...Object.keys(npcSaveTimers.current),
      ...Object.keys(npcPendingSaves.current),
      ...Object.keys(npcActiveSaves.current),
      ...Object.keys(npcSaveVersions.current),
    ]);

    for (const actorKey of actorKeys) {
      clearTimeout(npcSaveTimers.current[actorKey]);
      delete npcSaveTimers.current[actorKey];
      delete npcPendingSaves.current[actorKey];
      npcSaveVersions.current[actorKey] = (npcSaveVersions.current[actorKey] ?? 0) + 1;
    }

    await Promise.allSettled(Object.values(npcActiveSaves.current).flat());
  }

  async function persistNpc(
    saveAdventureId: Id<"adventures">,
    actor: NpcDebugActor,
    payload: NpcDebugSavePayload,
    saveVersion: number,
  ): Promise<boolean> {
    setError(null);
    setSavingNpcKey(actor.key);
    setNpcSaveStatus((current) => ({ ...current, [actor.key]: "saving" }));
    try {
      const result = await updateNpc({
        adventureId: saveAdventureId,
        actorId: actor._id,
        name: payload.name,
        description: payload.description,
        facts: payload.facts,
      });
      if (!result.ok) {
        setError(result.error ?? "Failed to save NPC.");
        setNpcSaveStatus((current) => ({ ...current, [actor.key]: "error" }));
        return false;
      }

      if (npcSaveVersions.current[actor.key] === saveVersion) {
        setNpcSaveStatus((current) => ({ ...current, [actor.key]: "saved" }));
      }
      return true;
    } catch (saveError) {
      setError(errorMessage(saveError));
      setNpcSaveStatus((current) => ({ ...current, [actor.key]: "error" }));
      return false;
    } finally {
      if (npcSaveVersions.current[actor.key] === saveVersion) {
        setSavingNpcKey(null);
      }
    }
  }

  async function resetNpcDebugActor(actor: NpcDebugActor) {
    if (!adventureId) {
      return;
    }

    setError(null);
    setNotice(null);
    setSavingNpcKey(actor.key);
    clearTimeout(npcSaveTimers.current[actor.key]);
    delete npcSaveTimers.current[actor.key];
    delete npcPendingSaves.current[actor.key];
    npcSaveVersions.current[actor.key] = (npcSaveVersions.current[actor.key] ?? 0) + 1;
    try {
      const result = await resetNpc({ adventureId, actorId: actor._id });
      if (!result.ok) {
        setError(result.error ?? "Failed to reset NPC.");
        return;
      }
      setNpcDrafts((current) => {
        const next = { ...current };
        delete next[actor.key];
        return next;
      });
      setNpcSaveStatus((current) => ({ ...current, [actor.key]: "idle" }));
      setNotice(result.actorId ? "NPC reset." : "Debug NPC removed.");
    } catch (resetError) {
      setError(errorMessage(resetError));
    } finally {
      setSavingNpcKey(null);
    }
  }

  async function saveLocation(
    locationId: Id<"rooms">,
    locationKey: string,
    name: string,
    description: string,
  ): Promise<boolean> {
    if (!adventureId) {
      return false;
    }

    setLocationSaveStatus((current) => ({ ...current, [locationKey]: "saving" }));
    const savePromise = persistLocation(adventureId, locationId, locationKey, name, description);
    locationActiveSaves.current[locationKey] = [
      ...(locationActiveSaves.current[locationKey] ?? []),
      savePromise,
    ];
    void savePromise.finally(() => {
      const remainingSaves = (locationActiveSaves.current[locationKey] ?? []).filter(
        (activeSave) => activeSave !== savePromise,
      );
      if (remainingSaves.length > 0) {
        locationActiveSaves.current[locationKey] = remainingSaves;
      } else {
        delete locationActiveSaves.current[locationKey];
      }
    });
    return savePromise;
  }

  async function persistLocation(
    saveAdventureId: Id<"adventures">,
    locationId: Id<"rooms">,
    locationKey: string,
    name: string,
    description: string,
  ): Promise<boolean> {
    setError(null);
    setNotice(null);
    try {
      const result = await updateLocation({
        adventureId: saveAdventureId,
        locationId,
        name,
        description,
      });
      if (!result.ok) {
        setError(result.error ?? "Failed to save location.");
        setLocationSaveStatus((current) => ({ ...current, [locationKey]: "error" }));
        return false;
      }
      setLocationSaveStatus((current) => ({ ...current, [locationKey]: "saved" }));
      setNotice("Location saved.");
      return true;
    } catch (saveError) {
      setError(errorMessage(saveError));
      setLocationSaveStatus((current) => ({ ...current, [locationKey]: "error" }));
      return false;
    }
  }

  async function flushActiveLocationSaves() {
    const activeSaves = Object.values(locationActiveSaves.current).flat();
    if (activeSaves.length === 0) {
      return true;
    }

    const results = await Promise.all(activeSaves);
    return results.every(Boolean);
  }

  async function handleCreateLocation() {
    if (!adventureId) {
      return;
    }

    setError(null);
    setNotice(null);
    const result = await createLocation({
      adventureId,
      key: newLocation.key,
      name: newLocation.name,
      description: newLocation.description,
    });
    if (!result.ok) {
      setError(result.error ?? "Failed to create location.");
      return;
    }
    setNewLocation({ key: "", name: "", description: "" });
    setNotice("Location created.");
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <main id="lorecraft-app" className="min-h-screen bg-[#090908] pt-12 text-zinc-100">
      <div
        id="app-top-bar"
        className="fixed inset-x-0 top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur"
      >
        <div
          id="app-top-bar-inner"
          className="flex h-12 w-full items-center justify-between px-4 sm:px-6 lg:px-8"
        >
          <div id="app-world-title" className="min-w-0 text-sm font-medium text-zinc-200">
            <span className="text-amber-300">Lorecraft</span>
            <span className="px-2 text-zinc-600">-</span>
            <span className="truncate text-zinc-300">{topBarWorldName}</span>
          </div>
          <button
            id="debug-panel-toggle"
            type="button"
            onClick={() => setIsDebugPanelCollapsed((current) => !current)}
            aria-label={isDebugPanelCollapsed ? "Show debug panel" : "Hide debug panel"}
            aria-pressed={!isDebugPanelCollapsed}
            className={`flex size-8 items-center justify-center rounded border text-zinc-300 hover:bg-zinc-800 ${
              isDebugPanelCollapsed
                ? "border-zinc-700"
                : "border-amber-300/70 bg-amber-950/20 text-amber-200"
            }`}
            title={isDebugPanelCollapsed ? "Show debug panel" : "Hide debug panel"}
          >
            <GearIcon />
          </button>
        </div>
      </div>
      <div
        id="app-workbench"
        className="grid min-h-[calc(100vh-3rem)] grid-cols-1 lg:h-[calc(100vh-3rem)] lg:overflow-hidden"
      >
        <section
          id="story-panel"
          className="flex h-[calc(100vh-3rem)] min-h-0 flex-col"
        >
          <div id="story-panel-content" className="flex min-h-0 flex-1 flex-col gap-4">
            {isLoadingDefaultAdventure ? (
              <p id="default-adventure-loading-state" className="text-zinc-400">
                Loading Adventure state...
              </p>
            ) : !adventureId ? (
              <div
                id="seed-world-empty-state"
                className="flex min-h-0 flex-1 flex-col items-start justify-center gap-4"
              >
                <p className="max-w-xl text-base leading-7 text-zinc-300">
                  Seed a fresh demo Adventure to begin the playtest.
                </p>
                <button
                  id="seed-world-button"
                  type="button"
                  onClick={handleSeed}
                  className="rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-200"
                >
                  Seed Stormbound Chapel
                </button>
              </div>
            ) : snapshot === undefined ? (
              <p id="adventure-loading-state" className="text-zinc-400">Loading Adventure state...</p>
            ) : snapshot === null ? (
              <div id="adventure-missing-state" className="min-h-0 flex-1 space-y-4">
                <p className="text-zinc-300">
                  The selected Adventure is missing required player or location state.
                </p>
                <button
                  id="seed-or-reload-adventure-button"
                  type="button"
                  onClick={handleSeed}
                  className="rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-950/20"
                >
                  Seed or reload demo Adventure
                </button>
              </div>
            ) : (
              <>
                <section
                  id="story-stream"
                  ref={storyScrollerRef}
                  className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 lg:px-10"
                >
                  <div
                    id="story-stream-inner"
                    className="mx-auto flex min-h-full max-w-[53rem] flex-col justify-end pr-0 sm:pr-12"
                  >
                    {snapshot.feed.length > 0 ? (
                      <div id="story-feed" className="space-y-8">
                        {snapshot.feed.map((entry) => (
                          <StoryEntry
                            key={entry.id}
                            id={entry.id}
                            kind={entry.kind}
                            text={entry.text}
                            turnNumber={entry.turnId ? turnSequenceById.get(entry.turnId) : undefined}
                          />
                        ))}
                      </div>
                    ) : (
                      <div id="story-empty-state" className="flex flex-1 items-end pb-8 text-zinc-500">
                        <p className="max-w-md text-base leading-7 text-zinc-400">
                          The chapel waits in rain and lantern light.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <form
                  id="narrative-input-form"
                  onSubmit={handleSubmit}
                  className="mx-auto mb-5 w-[calc(100%-2.5rem)] max-w-[50rem] shrink-0 rounded-2xl bg-zinc-800/95 px-5 py-3 shadow-2xl shadow-black/35 sm:w-[calc(100%-4rem)] lg:w-[calc(100%-5rem)]"
                >
                  {isSubmitting ? (
                    <TurnPendingPlaceholder />
                  ) : (
                    <>
                      <label
                        htmlFor="director-input"
                        className="block text-sm font-medium leading-6 text-zinc-100"
                      >
                        What do you do next?
                      </label>
                      <textarea
                        id="director-input"
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Type your response..."
                        rows={2}
                        className="mt-1 min-h-12 w-full resize-none bg-transparent text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-500"
                      />
                    </>
                  )}
                  <div
                    id="async-status-region"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {notice ? (
                      <p id="turn-notice-message" className="mt-3 text-xs text-emerald-300/80">
                        {notice}
                      </p>
                    ) : null}
                  </div>
                  {error ? (
                    <p
                      id="turn-error-message"
                      role="alert"
                      className="mt-3 text-sm text-rose-300"
                    >
                      {error}
                    </p>
                  ) : null}
                </form>
              </>
            )}
          </div>
        </section>

        <aside
          id="debug-panel"
          className={`fixed right-0 top-12 z-20 h-[calc(100vh-3rem)] w-full max-w-[600px] overflow-y-auto border-l border-zinc-800 bg-zinc-900/95 px-4 py-5 shadow-2xl shadow-black/40 transition-transform duration-200 ease-out sm:w-[600px] ${
            isDebugPanelCollapsed
              ? "pointer-events-none translate-x-full"
              : "translate-x-0"
          }`}
          aria-hidden={isDebugPanelCollapsed}
          inert={isDebugPanelCollapsed ? true : undefined}
        >
          <div
            id="debug-panel-header"
            className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:flex-col"
          >
            <div id="debug-panel-title-block">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-300">
                Debug panel
              </h2>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Hidden Adventure state, Game Master calls, validation decisions, events, and state diffs.
              </p>
            </div>
            <div id="debug-panel-actions" className="flex flex-wrap gap-2">
              <DebugActionButton
                id="fresh-seed-button"
                onClick={handleSeed}
                disabled={isSeeding || isResetting}
              >
                {isSeeding ? "Resetting" : "Reset World"}
              </DebugActionButton>
              <DebugActionButton
                id="rough-reset-button"
                onClick={handleReset}
                disabled={!adventureId || isResetting || isSeeding}
                tone="danger"
              >
                {isResetting ? "Resetting" : "Reset Session"}
              </DebugActionButton>
            </div>
          </div>

          {snapshot ? (
            <div id="debug-panel-content" className="mt-6 space-y-6">
              <DebugTabs value={debugTab} onChange={setDebugTab} />
              {debugTab === "prompt" ? (
                <div
                  id={debugTabPanelId("prompt")}
                  role="tabpanel"
                  aria-labelledby={debugTabId("prompt")}
                >
                  <DirectorPromptControls
                    value={promptGuidance}
                    onChange={setPromptGuidance}
                    latestSummary={latestDirectorRequestSummary(snapshot.directorCalls)}
                  />
                </div>
              ) : null}
              {debugTab === "npcs" ? (
                <div
                  id={debugTabPanelId("npcs")}
                  role="tabpanel"
                  aria-labelledby={debugTabId("npcs")}
                >
                  <NpcDebugPanel
                    actors={buildNpcDebugActors(snapshot.locations)}
                    facts={snapshot.facts}
                    drafts={npcDrafts}
                    saveStatus={npcSaveStatus}
                    collapsedNpcKeys={collapsedNpcKeys}
                    savingNpcKey={savingNpcKey}
                    onAdd={addNpc}
                    onChange={updateNpcDraft}
                    onToggleCollapsed={toggleNpcCollapsed}
                    onReset={resetNpcDebugActor}
                  />
                </div>
              ) : null}
              {debugTab === "locations" ? (
                <div
                  id={debugTabPanelId("locations")}
                  role="tabpanel"
                  aria-labelledby={debugTabId("locations")}
                >
                  <LocationDebugPanel
                    locations={snapshot.locations}
                    saveStatus={locationSaveStatus}
                    newLocation={newLocation}
                    onNewLocationChange={setNewLocation}
                    onSave={saveLocation}
                    onCreate={handleCreateLocation}
                  />
                </div>
              ) : null}
              {debugTab === "state" ? (
                <div
                  id={debugTabPanelId("state")}
                  role="tabpanel"
                  aria-labelledby={debugTabId("state")}
                >
                  <DebugList
                    title="Scene"
                    items={[
                      `Adventure: ${snapshot.adventure.name} (${snapshot.adventure._id})`,
                      `Source WorldVersion: v${snapshot.sourceWorldVersion.versionNumber} (${snapshot.sourceWorldVersion._id})`,
                      `${snapshot.world.name} / ${snapshot.room.name}`,
                      `Player: ${snapshot.player.name} (${snapshot.player.key})`,
                      `Actors: ${snapshot.actors.map((actor) => `${actor.name} (${actor.key})`).join(", ")}`,
                      `Objects: ${snapshot.objects.map((object) => object.name).join(", ") || "none"}`,
                    ]}
                  />
                  <DebugList
                    title="Hidden facts"
                    items={snapshot.facts.map(
                      (fact) => `${fact.subjectId}.${fact.key} = ${String(fact.value)} (${fact.source})`,
                    )}
                  />
                  <DebugList
                    title="State changes"
                    items={directorUpdateItems(snapshot.directorCalls)}
                  />
                  <DebugList title="Turns" items={turnSummaryItems(snapshot.turns)} />
                  <DebugList
                    title="Events"
                    items={snapshot.events.map((event) => `${event.text} (${event.source})`)}
                  />
                  <DebugList
                    title="Narrations"
                    items={snapshot.narrations.map(
                      (narration) => `${narration.text} (${narration.source})`,
                    )}
                  />
                  <DebugJson title="Turns" value={snapshot.turns} />
                  <DebugJson title="Game Master calls" value={snapshot.directorCalls} />
                  <DebugJson title="State diffs" value={snapshot.diffs} />
                </div>
              ) : null}
            </div>
          ) : (
            <p id="debug-panel-empty-state" className="mt-6 text-sm text-zinc-500">
              Seed a world to inspect state.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}

function GearIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.3a2 2 0 1 1-4 0V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H2.7a2 2 0 1 1 0-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.3a2 2 0 1 1 4 0V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.3a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

function TurnPendingPlaceholder() {
  return (
    <div
      id="turn-pending-placeholder"
      role="status"
      aria-live="polite"
      className="flex min-h-[4.5rem] items-center gap-3 text-sm text-zinc-300"
    >
      <span className="sr-only">Game Master is writing a response.</span>
      <span className="flex gap-1" aria-hidden="true">
        <span className="size-2 animate-pulse rounded-full bg-amber-300/90 [animation-delay:0ms]" />
        <span className="size-2 animate-pulse rounded-full bg-amber-300/70 [animation-delay:150ms]" />
        <span className="size-2 animate-pulse rounded-full bg-amber-300/50 [animation-delay:300ms]" />
      </span>
      <span aria-hidden="true" className="text-zinc-400">
        The story is turning...
      </span>
    </div>
  );
}

function StoryEntry({
  id,
  kind,
  text,
  turnNumber,
}: {
  id: string;
  kind: "player" | "director" | "event";
  text: string;
  turnNumber?: number;
}) {
  const entryDomId = `story-entry-${kind}-${domId(id)}`;

  if (kind === "player") {
    return (
      <StoryEntryShell id={entryDomId} turnNumber={turnNumber}>
        <article id={`${entryDomId}-player-input`} className="border-l-2 border-amber-300/70 pl-4 text-amber-50">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-amber-300/80">
            Player
          </p>
          <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-amber-50">{text}</p>
        </article>
      </StoryEntryShell>
    );
  }

  if (kind === "event") {
    return (
      <StoryEntryShell id={entryDomId} turnNumber={turnNumber}>
        <aside
          id={`${entryDomId}-world-event`}
          className="mx-auto max-w-xl rounded border border-emerald-900/60 bg-emerald-950/10 px-3 py-2 text-center text-xs leading-5 text-emerald-300/60"
        >
          {text}
        </aside>
      </StoryEntryShell>
    );
  }

  return (
    <StoryEntryShell id={entryDomId} turnNumber={turnNumber}>
      <article id={`${entryDomId}-game-master-narration`}>
        <p className="whitespace-pre-wrap text-[1.08rem] leading-8 text-zinc-200 text-justify">
          {text}
        </p>
      </article>
    </StoryEntryShell>
  );
}

function StoryEntryShell({
  id,
  turnNumber,
  children,
}: {
  id: string;
  turnNumber?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 sm:grid-cols-[2.25rem_minmax(0,1fr)]"
    >
      <div id={`${id}-turn-number`} className="pt-1 text-right text-xs tabular-nums text-zinc-700">
        {turnNumber ? turnNumber : ""}
      </div>
      <div id={`${id}-body`} className="min-w-0">{children}</div>
    </div>
  );
}

function DebugTabs({ value, onChange }: { value: DebugTab; onChange: (value: DebugTab) => void }) {
  const tabs: Array<{ value: DebugTab; label: string }> = [
    { value: "prompt", label: "Prompt" },
    { value: "npcs", label: "NPCs" },
    { value: "locations", label: "Locations" },
    { value: "state", label: "State" },
  ];
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: DebugTab) => {
    const currentIndex = tabs.findIndex((item) => item.value === tab);
    if (currentIndex < 0) {
      return;
    }

    const lastIndex = tabs.length - 1;
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === "ArrowLeft") {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex].value;
    onChange(nextTab);
    document.getElementById(debugTabId(nextTab))?.focus();
  };

  return (
    <div
      id="debug-tabs"
      role="tablist"
      aria-label="Debug sections"
      className="grid grid-cols-4 rounded-md border border-zinc-800 text-xs uppercase"
    >
      {tabs.map((tab) => (
        <button
          id={debugTabId(tab.value)}
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={value === tab.value}
          aria-controls={debugTabPanelId(tab.value)}
          tabIndex={value === tab.value ? 0 : -1}
          onClick={() => onChange(tab.value)}
          onKeyDown={(event) => handleKeyDown(event, tab.value)}
          className={`px-3 py-2 ${
            value === tab.value
              ? "bg-amber-300 text-zinc-950"
              : "bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function debugTabId(tab: DebugTab) {
  return `debug-tab-${tab}`;
}

function debugTabPanelId(tab: DebugTab) {
  return `debug-tab-panel-${tab}`;
}

function DebugSectionHeader({
  id,
  title,
  description,
  action,
}: {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div id={id} className="flex items-start justify-between gap-4">
      <div id={`${id}-title-block`} className="min-w-0">
        <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-300">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-xs leading-5 text-zinc-500">{description}</p>
        ) : null}
      </div>
      {action ? <div id={`${id}-action`} className="shrink-0">{action}</div> : null}
    </div>
  );
}

function DebugCard({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="rounded-md border border-zinc-800 bg-zinc-950/45 p-3">
      {children}
    </div>
  );
}

function DebugActionButton({
  id,
  children,
  onClick,
  disabled,
  tone = "neutral",
}: {
  id: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "danger";
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60 ${
        tone === "danger"
          ? "border-rose-500/70 text-rose-200 hover:bg-rose-950/40"
          : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

function DebugDisclosureButton({
  id,
  controlsId,
  isExpanded,
  onClick,
  label,
}: {
  id: string;
  controlsId: string;
  isExpanded: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      id={id}
      type="button"
      aria-expanded={isExpanded}
      aria-controls={controlsId}
      onClick={onClick}
      className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
    >
      {isExpanded ? "Collapse" : "Expand"}
      <span className="sr-only"> {label}</span>
    </button>
  );
}

function NpcDebugPanel({
  actors,
  facts,
  drafts,
  saveStatus,
  collapsedNpcKeys,
  savingNpcKey,
  onAdd,
  onChange,
  onToggleCollapsed,
  onReset,
}: {
  actors: NpcDebugActor[];
  facts: Array<{
    subjectId: string;
    key: string;
    value: string | number | boolean | null;
    source: string;
  }>;
  drafts: Record<string, NpcDebugDraft>;
  saveStatus: Record<string, NpcSaveStatus>;
  collapsedNpcKeys: Record<string, boolean>;
  savingNpcKey: string | null;
  onAdd: () => void;
  onChange: (actor: NpcDebugActor, draft: NpcDebugDraft, payload: NpcDebugSavePayload) => void;
  onToggleCollapsed: (actorKey: string) => void;
  onReset: (actor: NpcDebugActor) => void;
}) {
  return (
    <section id="npc-debug-panel" className="space-y-4">
      <DebugSectionHeader
        id="npc-debug-panel-header"
        title="NPCs"
        description="Canonical demo-world NPCs. Edits autosave to Convex and can be reset with Reset Session or Reset World."
        action={
          <DebugActionButton id="add-debug-npc-button" onClick={onAdd}>
            Add NPC
          </DebugActionButton>
        }
      />
      {actors.length > 0 ? (
        actors.map((npc) => {
          const npcDomId = `npc-card-${domId(npc.key)}`;
          const draft = drafts[npc.key] ?? {};
          const draftFacts = draft.facts ?? {};
          const canonicalFacts = facts.filter((fact) => fact.subjectId === `actor:${npc.key}`);
          const editableFacts = NPC_PROFILE_FACT_KEYS.map((key) => {
            const fact = canonicalFacts.find((candidate) => candidate.key === key);
            return {
              key,
              value: draftFacts[key] ?? String(fact?.value ?? ""),
              source: draftFacts[key] !== undefined ? "draft" : (fact?.source ?? "empty"),
            };
          });
          const payload: NpcDebugSavePayload = {
            name: draft.name ?? npc.name,
            description: draft.description ?? npc.description,
            facts: Object.fromEntries(editableFacts.map((fact) => [fact.key, fact.value])),
          };
          const isSaving = savingNpcKey === npc.key;
          const status = saveStatus[npc.key] ?? "idle";
          const hasDraft = Boolean(drafts[npc.key]);
          const statusLabel = npcSaveStatusLabel(status, hasDraft);
          const isCollapsed = collapsedNpcKeys[npc.key] ?? true;
          const fieldsId = `${npcDomId}-fields`;

          return (
            <DebugCard id={npcDomId} key={npc.key}>
              <div id={`${npcDomId}-header`} className="flex items-start justify-between gap-3">
                <div id={`${npcDomId}-identity`}>
                  <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-300">
                    {payload.name || titleFromKey(npc.key)} <span className="text-zinc-600">({npc.key})</span>
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {payload.description || "No description yet."}
                  </p>
                  <p id={`${npcDomId}-location`} className="mt-2 text-xs leading-5 text-zinc-400">
                    Location: {npc.locationName} ({npc.locationKey})
                  </p>
                </div>
                <div id={`${npcDomId}-actions`} className="flex shrink-0 items-center gap-2">
                  <span
                    id={`${npcDomId}-save-status`}
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="text-xs uppercase text-emerald-300/60"
                  >
                    {statusLabel}
                  </span>
                  <DebugDisclosureButton
                    id={`${npcDomId}-collapse-toggle`}
                    controlsId={fieldsId}
                    isExpanded={!isCollapsed}
                    onClick={() => onToggleCollapsed(npc.key)}
                    label={`${npc.name} details`}
                  />
                  <DebugActionButton
                    id={`${npcDomId}-reset-button`}
                    onClick={() => onReset(npc)}
                    disabled={isSaving}
                  >
                    Reset
                  </DebugActionButton>
                </div>
              </div>

              {!isCollapsed ? (
                <div id={fieldsId} className="mt-4 space-y-4">
                  <NpcDebugTextarea
                    actorKey={npc.key}
                    label="Name"
                    meta={draft.name !== undefined ? "draft" : "canonical"}
                    value={payload.name}
                    onChange={(name) => onChange(npc, { ...draft, name }, { ...payload, name })}
                  />
                  <NpcDebugTextarea
                    actorKey={npc.key}
                    label="Description"
                    meta={draft.description !== undefined ? "draft" : "canonical"}
                    value={payload.description}
                    onChange={(description) =>
                      onChange(npc, { ...draft, description }, { ...payload, description })
                    }
                  />
                  {editableFacts.map((fact) => (
                    <NpcDebugTextarea
                      key={fact.key}
                      actorKey={npc.key}
                      label={fact.key}
                      meta={fact.source}
                      value={fact.value}
                      onChange={(value) =>
                        onChange(npc, {
                          ...draft,
                          facts: {
                            ...draftFacts,
                            [fact.key]: value,
                          },
                        }, {
                          ...payload,
                          facts: {
                            ...payload.facts,
                            [fact.key]: value,
                          },
                        })
                      }
                    />
                  ))}
                </div>
              ) : null}
            </DebugCard>
          );
        })
      ) : (
        <p id="npc-debug-panel-empty-state" className="text-sm text-zinc-500">No NPCs exist in this world yet.</p>
      )}
    </section>
  );
}

function LocationDebugPanel({
  locations,
  saveStatus,
  newLocation,
  onNewLocationChange,
  onSave,
  onCreate,
}: {
  locations: Array<{
    _id: Id<"rooms">;
    key: string;
    name: string;
    description: string;
    actors: Array<{ key: string; name: string; role: "player" | "npc" }>;
    objects: Array<{ key: string; name: string }>;
    exits: Array<{ label: string; toLocationKey: string; toLocationName: string }>;
  }>;
  saveStatus: Record<string, LocationSaveStatus>;
  newLocation: { key: string; name: string; description: string };
  onNewLocationChange: (location: { key: string; name: string; description: string }) => void;
  onSave: (
    locationId: Id<"rooms">,
    locationKey: string,
    name: string,
    description: string,
  ) => Promise<boolean>;
  onCreate: () => void;
}) {
  return (
    <section id="location-debug-panel" className="space-y-4">
      <DebugSectionHeader
        id="location-debug-panel-header"
        title="Locations"
        description="Canonical demo-world locations. Keys are stable; names and descriptions can be edited."
      />

      <DebugCard id="location-create-card">
        <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-300">
          Add location
        </h4>
        <div id="location-create-fields" className="mt-4 space-y-3">
          <LocationInput
            id="new-location-key"
            label="Key"
            value={newLocation.key}
            onChange={(key) => onNewLocationChange({ ...newLocation, key })}
          />
          <LocationInput
            id="new-location-name"
            label="Name"
            value={newLocation.name}
            onChange={(name) => onNewLocationChange({ ...newLocation, name })}
          />
          <LocationTextarea
            id="new-location-description"
            label="Description"
            value={newLocation.description}
            onChange={(description) => onNewLocationChange({ ...newLocation, description })}
          />
        </div>
        <div className="mt-3">
          <DebugActionButton
            id="create-location-button"
            onClick={onCreate}
          >
            Add Location
          </DebugActionButton>
        </div>
      </DebugCard>

      {locations.map((location) => (
        <LocationCardEditor
          key={location._id}
          location={location}
          saveStatus={saveStatus[location.key] ?? "idle"}
          onSave={onSave}
        />
      ))}
    </section>
  );
}

function LocationCardEditor({
  location,
  saveStatus,
  onSave,
}: {
  location: {
    _id: Id<"rooms">;
    key: string;
    name: string;
    description: string;
    actors: Array<{ key: string; name: string; role: "player" | "npc" }>;
    objects: Array<{ key: string; name: string }>;
    exits: Array<{ label: string; toLocationKey: string; toLocationName: string }>;
  };
  saveStatus: LocationSaveStatus;
  onSave: (
    locationId: Id<"rooms">,
    locationKey: string,
    name: string,
    description: string,
  ) => Promise<boolean>;
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const locationDomId = `location-card-${domId(location.key)}`;
  const fieldsId = `${locationDomId}-fields`;

  return (
    <DebugCard id={locationDomId}>
      <div id={`${locationDomId}-header`} className="flex items-start justify-between gap-3">
        <div id={`${locationDomId}-summary`} className="min-w-0">
          <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-300">
            {location.name} <span className="text-zinc-600">({location.key})</span>
          </h4>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Actors: {location.actors.map((actor) => `${actor.name} (${actor.role})`).join(", ") || "none"}
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Objects: {location.objects.map((object) => object.name).join(", ") || "none"}
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Exits: {location.exits.map((exit) => `${exit.label} to ${exit.toLocationName}`).join(", ") || "none"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            id={`${locationDomId}-save-status`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-xs uppercase text-emerald-300/60"
          >
            {locationSaveStatusLabel(saveStatus)}
          </span>
          <DebugDisclosureButton
            id={`${locationDomId}-collapse-toggle`}
            controlsId={fieldsId}
            isExpanded={!isCollapsed}
            onClick={() => setIsCollapsed((current) => !current)}
            label={`${location.name} details`}
          />
        </div>
      </div>
      {!isCollapsed ? (
        <LocationCardFields
          key={location._id}
          fieldsId={fieldsId}
          locationDomId={locationDomId}
          locationId={location._id}
          locationKey={location.key}
          name={location.name}
          description={location.description}
          onSave={onSave}
        />
      ) : null}
    </DebugCard>
  );
}

function LocationCardFields({
  fieldsId,
  locationDomId,
  locationId,
  locationKey,
  name: canonicalName,
  description: canonicalDescription,
  onSave,
}: {
  fieldsId: string;
  locationDomId: string;
  locationId: Id<"rooms">;
  locationKey: string;
  name: string;
  description: string;
  onSave: (
    locationId: Id<"rooms">,
    locationKey: string,
    name: string,
    description: string,
  ) => Promise<boolean>;
}) {
  const nameRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (nameRef.current) {
      nameRef.current.value = canonicalName;
    }
  }, [canonicalName]);

  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.value = canonicalDescription;
    }
  }, [canonicalDescription]);

  function saveIfChanged() {
    const name = nameRef.current?.value ?? canonicalName;
    const description = descriptionRef.current?.value ?? canonicalDescription;
    if (name !== canonicalName || description !== canonicalDescription) {
      void onSave(locationId, locationKey, name, description);
    }
  }

  return (
    <div id={fieldsId} className="mt-4 space-y-4">
      <div id={`${locationDomId}-name-field`}>
        <label htmlFor={`${locationDomId}-name`} className="text-xs font-medium text-zinc-400">
          Name
        </label>
        <input
          id={`${locationDomId}-name`}
          ref={nameRef}
          defaultValue={canonicalName}
          onBlur={saveIfChanged}
          className="mt-1 w-full rounded-sm bg-zinc-950/80 px-3 py-2 text-sm text-zinc-200 outline-none ring-1 ring-zinc-700 transition focus:ring-cyan-500/60"
        />
      </div>
      <div id={`${locationDomId}-description-field`}>
        <label htmlFor={`${locationDomId}-description`} className="text-xs font-medium text-zinc-400">
          Description
        </label>
        <textarea
          id={`${locationDomId}-description`}
          ref={descriptionRef}
          defaultValue={canonicalDescription}
          onBlur={saveIfChanged}
          rows={4}
          className="mt-1 w-full resize-none rounded-sm bg-zinc-950/80 px-3 py-2 text-sm leading-5 text-zinc-200 outline-none ring-1 ring-zinc-700 transition focus:ring-cyan-500/60"
        />
      </div>
    </div>
  );
}

function LocationInput({
  id,
  label,
  value,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  return (
    <div id={`${id}-field`}>
      <label htmlFor={id} className="text-xs font-medium text-zinc-400">
        {label}
      </label>
      <input
        id={id}
        value={value}
        maxLength={120}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs leading-5 text-zinc-200 outline-none focus:border-amber-300"
      />
    </div>
  );
}

function LocationTextarea({
  id,
  label,
  value,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  return (
    <div id={`${id}-field`}>
      <div id={`${id}-field-header`} className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-medium text-zinc-400">
          {label}
        </label>
        <span className="text-xs tabular-nums text-zinc-600">{value.length}/1200</span>
      </div>
      <textarea
        id={id}
        value={value}
        maxLength={1200}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="h-20 w-full resize-none overflow-y-auto rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs leading-5 text-zinc-200 outline-none focus:border-amber-300"
      />
    </div>
  );
}

function titleFromKey(actorKey: string) {
  const words = actorKey
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words.length > 0
    ? words.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(" ")
    : "Debug NPC";
}

function defaultNpcFacts() {
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

function buildNpcDebugActors(
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

function npcSaveStatusLabel(status: NpcSaveStatus, hasDraft: boolean) {
  if (status === "unsaved") {
    return "Unsaved";
  }
  if (status === "saving") {
    return "Saving";
  }
  if (status === "saved") {
    return "Saved";
  }
  if (status === "error") {
    return "Save failed";
  }
  return hasDraft ? "Edited" : "Canonical";
}

function locationSaveStatusLabel(status: LocationSaveStatus) {
  if (status === "saving") {
    return "Saving";
  }
  if (status === "saved") {
    return "Saved";
  }
  if (status === "error") {
    return "Save failed";
  }
  return "Canonical";
}

function NpcDebugTextarea({
  actorKey,
  label,
  meta,
  value,
  onChange,
}: {
  actorKey: string;
  label: string;
  meta: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `npc-debug-${domId(actorKey)}-${domId(label)}`;

  return (
    <div id={`${id}-field`}>
      <div id={`${id}-field-header`} className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-medium text-zinc-400">
          {label}
          <span className="ml-2 font-normal text-zinc-600">{meta}</span>
        </label>
        <span className="text-xs tabular-nums text-zinc-600">{value.length}/1200</span>
      </div>
      <textarea
        id={id}
        value={value}
        rows={3}
        maxLength={1200}
        onChange={(event) => onChange(event.target.value)}
        className="h-20 w-full resize-none overflow-y-auto rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs leading-5 text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-amber-300"
      />
    </div>
  );
}

function DebugList({ title, items }: { title: string; items: string[] }) {
  const listDomId = `debug-list-${domId(title)}`;

  return (
    <DebugCard id={listDomId}>
      <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-300">{title}</h3>
      <ul id={`${listDomId}-items`} className="mt-3 space-y-2 text-xs leading-5 text-zinc-300">
        {items.length > 0 ? (
          items.map((item, index) => <li id={`${listDomId}-item-${index + 1}`} key={`${title}-${index}`}>{item}</li>)
        ) : (
          <li id={`${listDomId}-empty-state`} className="text-zinc-500">None yet.</li>
        )}
      </ul>
    </DebugCard>
  );
}

function DirectorPromptControls({
  value,
  onChange,
  latestSummary,
}: {
  value: DirectorPromptGuidance;
  onChange: (value: DirectorPromptGuidance) => void;
  latestSummary: Record<string, unknown> | null;
}) {
  return (
    <section id="prompt-guidance-panel" className="space-y-4">
      <DebugCard id="prompt-guidance-card">
        <DebugSectionHeader
          id="prompt-guidance-header"
          title="Prompt guidance"
          description="Editable text sections for the next Game Master turn. These guide style and behavior without changing the output schema."
          action={
            <DebugActionButton
              id="prompt-guidance-reset-button"
              onClick={() => onChange(DEFAULT_PROMPT_GUIDANCE)}
            >
              Reset
            </DebugActionButton>
          }
        />

        <div id="prompt-guidance-fields" className="mt-4 space-y-4">
          <PromptGuidanceTextarea
            label="Style"
            value={value.style}
            onChange={(style) => onChange({ ...value, style })}
          />
          <PromptGuidanceTextarea
            label="NPC behavior"
            value={value.npcBehavior}
            onChange={(npcBehavior) => onChange({ ...value, npcBehavior })}
          />
          <PromptGuidanceTextarea
            label="Persistence"
            value={value.persistence}
            onChange={(persistence) => onChange({ ...value, persistence })}
          />
        </div>
      </DebugCard>

      <DebugCard id="last-game-master-summary">
        <h4 className="text-xs font-medium uppercase text-zinc-500">Last Game Master summary</h4>
        <dl id="last-game-master-summary-fields" className="mt-3 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs leading-5">
          {latestSummary ? (
            <>
              <dt className="text-zinc-500">Beat</dt>
              <dd className="min-w-0 text-zinc-300">{summaryText(latestSummary.requiredSceneBeat)}</dd>
              <dt className="text-zinc-500">Mode</dt>
              <dd className="min-w-0 text-zinc-300">{summaryText(latestSummary.directorMode)}</dd>
              <dt className="text-zinc-500">Output</dt>
              <dd className="min-w-0 text-zinc-300">{summaryText(latestSummary.outputContract)}</dd>
              <dt className="text-zinc-500">Settings</dt>
              <dd className="min-w-0 text-zinc-300">
                {summaryText(latestSummary.generationSettings)}
              </dd>
              <dt className="text-zinc-500">Guidance</dt>
              <dd className="min-w-0 break-words text-zinc-300">
                {summaryList(latestSummary.promptGuidanceKeys)}
              </dd>
              <dt className="text-zinc-500">Knowledge</dt>
              <dd className="min-w-0 break-words text-zinc-300">
                {summaryList(latestSummary.readOnlyKnowledgeKeys)}
              </dd>
              <dt className="text-zinc-500">Components</dt>
              <dd className="min-w-0 break-words text-zinc-300">
                {summaryList(latestSummary.promptComponentKeys)}
              </dd>
            </>
          ) : (
            <dd id="last-game-master-summary-empty-state" className="col-span-2 text-zinc-500">No Game Master turn yet.</dd>
          )}
        </dl>
      </DebugCard>
    </section>
  );
}

function PromptGuidanceTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `director-${domId(label)}`;

  return (
    <div id={`${id}-field`}>
      <div id={`${id}-field-header`} className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-medium text-zinc-400">
          {label}
        </label>
        <span className="text-xs tabular-nums text-zinc-600">{value.length}/1200</span>
      </div>
      <textarea
        id={id}
        value={value}
        maxLength={1200}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="h-20 w-full resize-none overflow-y-auto rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs leading-5 text-zinc-200 outline-none focus:border-amber-300"
      />
    </div>
  );
}

function DebugJson({ title, value }: { title: string; value: unknown }) {
  const jsonDomId = `debug-json-${domId(title)}`;

  return (
    <DebugCard id={jsonDomId}>
      <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-300">{title}</h3>
      <pre id={`${jsonDomId}-content`} className="mt-3 max-h-80 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs leading-5 text-zinc-300">
        {JSON.stringify(value, null, 2)}
      </pre>
    </DebugCard>
  );
}

function latestDirectorRequestSummary(directorCalls: unknown[]) {
  const latest = directorCalls.find(isRecord);
  return isRecord(latest?.requestSummary) ? latest.requestSummary : null;
}

function summaryList(value: unknown) {
  return Array.isArray(value) && value.length > 0 ? value.join(", ") : "None";
}

function summaryText(value: unknown) {
  if (value === undefined || value === null) {
    return "None";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function directorUpdateItems(directorCalls: unknown[]) {
  return directorCalls.flatMap((call) => {
    if (!isRecord(call) || !Array.isArray(call.acceptedUpdates)) {
      return [];
    }

    return call.acceptedUpdates.flatMap((update) => {
      if (!isRecord(update) || !Array.isArray(update.changes)) {
        if (update.type === "actorMove") {
          const actorName =
            typeof update.actorName === "string"
              ? update.actorName
              : typeof update.actorKey === "string"
                ? update.actorKey
                : "Unknown actor";
          const locationName =
            typeof update.toLocationName === "string"
              ? update.toLocationName
              : typeof update.toLocationKey === "string"
                ? update.toLocationKey
                : "Unknown location";
          const reason = typeof update.reason === "string" ? ` Reason: ${update.reason}` : "";
          return [`${actorName}: moved to ${locationName}.${reason}`];
        }
        return [];
      }

      const actorName =
        typeof update.actorName === "string"
          ? update.actorName
          : typeof update.actorKey === "string"
            ? update.actorKey
            : "Unknown actor";
      const reason = typeof update.reason === "string" ? ` Reason: ${update.reason}` : "";
      const changes = update.changes
        .filter(isRecord)
        .map((change) => {
          const key = typeof change.key === "string" ? change.key : "unknown";
          const value = typeof change.value === "string" ? change.value : JSON.stringify(change.value);
          return `${key} -> ${value}`;
        })
        .join("; ");

      return changes ? [`${actorName}: ${changes}.${reason}`] : [];
    });
  });
}

function turnSummaryItems(turns: unknown[]) {
  return turns.flatMap((turn) => {
    if (!isRecord(turn)) {
      return [];
    }

    const sequenceNumber =
      typeof turn.sequenceNumber === "number" ? `#${turn.sequenceNumber}` : "Unsequenced";
    const status = typeof turn.status === "string" ? turn.status : "unknown";
    const input = typeof turn.playerInput === "string" ? ` - ${turn.playerInput}` : "";
    const counts = [
      countLabel(turn.narrationCount, "narration"),
      countLabel(turn.eventCount, "event"),
      countLabel(turn.stateDiffCount, "diff"),
    ].join(", ");
    const directorStatus =
      typeof turn.directorCallStatus === "string" ? `; Game Master: ${turn.directorCallStatus}` : "";

    return [`Turn ${sequenceNumber}: ${status}${input} (${counts}${directorStatus})`];
  });
}

function countLabel(value: unknown, label: string) {
  const count = typeof value === "number" ? value : 0;
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function buildTurnSequenceById(turns: unknown[]) {
  const sequenceById = new Map<string, number>();

  for (const turn of turns) {
    if (!isRecord(turn) || typeof turn._id !== "string" || typeof turn.sequenceNumber !== "number") {
      continue;
    }

    sequenceById.set(turn._id, turn.sequenceNumber);
  }

  return sequenceById;
}

function domId(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "unknown";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request failed.";
}
