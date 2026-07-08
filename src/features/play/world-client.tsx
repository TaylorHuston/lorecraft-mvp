"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { SlashCommandAutocompleteTarget } from "@/lib/director/slash-command-autocomplete";
import {
  buildTurnSequenceById,
  directorUpdateItems,
  domId,
  errorMessage,
  latestDirectorRequestSummary,
  summaryList,
  summaryText,
  turnSummaryItems,
} from "./debug-formatters";
import { AdventureLanding, type AdventureListItem } from "./adventure-landing";
import { DebugActionButton, DebugPanelShell } from "./debug-panel-shell";
import { PlayerCard } from "./player-card";
import { RoomInfoCard } from "./room-info-card";
import { TurnActionPanel } from "./turn-action-panel";
import {
  NPC_PROFILE_FACT_KEYS,
  type NpcDebugActor,
  type NpcDebugDraft,
  type NpcDebugSavePayload,
  type NpcSaveStatus,
  useNpcDebugAutosave,
} from "./use-npc-debug-autosave";
import {
  type LocationSaveStatus,
  type NewLocationDraft,
  useLocationDebugSaves,
} from "./use-location-debug-saves";

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

type DirectorTurnPayload =
  | { trigger: "act"; input: string }
  | { trigger: "pass" }
  | { trigger: "guide"; guidance: string };

type DirectorUtilityResponse =
  | {
      ok: true;
      message: string;
      command: "help" | "look";
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

type SlashCommandSnapshot = {
  actors: Array<{ role: string; name: string }>;
  objects: Array<{ name: string }>;
  room: { name: string };
};

type StoryInsertResult =
  | {
      ok: true;
      narrationId?: Id<"narrations">;
    }
  | {
      ok: false;
      error: string;
    };

type StoryFeedKind = "player" | "director" | "event" | "utility" | "story";

const DEFAULT_PROMPT_GUIDANCE: DirectorPromptGuidance = {
  style: "Grounded, concise prose with concrete sensory detail. Keep the scene moving.",
  npcBehavior:
    "Present NPCs should make clear choices when directly engaged: answer, refuse, deflect, warn, ask back, act, or intentionally stay silent.",
  persistence:
    "Keep fleeting gestures and reactions in narration. Only update durable NPC facts when the change should matter after recent context falls away.",
};

export function WorldClient({
  initialAdventureId = null,
}: {
  initialAdventureId?: Id<"adventures"> | null;
}) {
  const router = useRouter();
  const worldContainers = useQuery(api.world.listWorldContainers);
  const seedWorld = useMutation(api.world.seedDemoWorld);
  const createAdventure = useMutation(api.world.createAdventure);
  const deleteAdventure = useMutation(api.world.deleteAdventure);
  const resetPlaytestWorld = useMutation(api.world.resetPlaytestWorld);
  const recordStoryInsert = useMutation(api.world.recordStoryInsert);
  const [selectedAdventureId, setSelectedAdventureId] = useState<Id<"adventures"> | null>(
    initialAdventureId,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [creatingWorldId, setCreatingWorldId] = useState<Id<"worlds"> | null>(null);
  const [deletingAdventureId, setDeletingAdventureId] = useState<Id<"adventures"> | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isDebugPanelCollapsed, setIsDebugPanelCollapsed] = useState(true);
  const [isPlayerCardCollapsed, setIsPlayerCardCollapsed] = useState(false);
  const [isPlayerCardSavePending, setIsPlayerCardSavePending] = useState(false);
  const [promptGuidance, setPromptGuidance] = useState<DirectorPromptGuidance>(
    DEFAULT_PROMPT_GUIDANCE,
  );
  const storyScrollerRef = useRef<HTMLElement | null>(null);

  const adventureId = selectedAdventureId;
  const isLoadingAdventures = selectedAdventureId === null && worldContainers === undefined;
  const snapshot = useQuery(api.world.getSnapshot, adventureId ? { adventureId } : "skip");
  const feedLength = snapshot?.feed.length ?? 0;
  const turnSequenceById = snapshot ? buildTurnSequenceById(snapshot.turns) : new Map<string, number>();
  const slashCommandTargets = useMemo(
    () => (snapshot ? buildSlashCommandTargets(snapshot) : []),
    [snapshot],
  );
  const topBarWorldName = adventureId
    ? (snapshot?.world.name ?? "Loading world")
    : "Adventures";
  const npcDebug = useNpcDebugAutosave({
    adventureId,
    locations: snapshot?.locations,
    onError: setError,
    onNotice: setNotice,
  });
  const locationDebug = useLocationDebugSaves({
    adventureId,
    onError: setError,
    onNotice: setNotice,
  });

  useEffect(() => {
    const storyScroller = storyScrollerRef.current;

    if (!storyScroller) {
      return;
    }

    storyScroller.scrollTop = storyScroller.scrollHeight;
  }, [feedLength, isSubmitting, error]);

  async function handleSeed() {
    setError(null);
    setNotice(null);
    setIsSeeding(true);
    try {
      await npcDebug.cancelQueuedSavesAndWaitForActive();
      await locationDebug.flushActiveSaves();
      setError(null);
      const seededAdventureId = await seedWorld();
      setSelectedAdventureId(seededAdventureId);
      router.push(`/adventures/${seededAdventureId}`);
      resetLocalDraftState();
      setNotice("Fresh Stormbound Chapel world seeded.");
    } catch (seedError) {
      setError(errorMessage(seedError));
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleCreateAdventure(worldId: Id<"worlds">, playerName: string) {
    setError(null);
    setNotice(null);
    setCreatingWorldId(worldId);
    try {
      const result = await createAdventure({ worldId, playerName });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelectedAdventureId(result.adventureId);
      router.push(`/adventures/${result.adventureId}`);
      resetLocalDraftState();
    } catch (createError) {
      setError(errorMessage(createError));
    } finally {
      setCreatingWorldId(null);
    }
  }

  function handleSelectAdventure(nextAdventureId: Id<"adventures">) {
    setError(null);
    setNotice(null);
    setSelectedAdventureId(nextAdventureId);
    router.push(`/adventures/${nextAdventureId}`);
    resetLocalDraftState();
  }

  async function handleDeleteAdventure(adventure: AdventureListItem) {
    const confirmed = window.confirm(
      `Delete "${adventure.name}"? This removes this Adventure's turns, memories, and debug edits. The source World is not changed.`,
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setNotice(null);
    setDeletingAdventureId(adventure._id);
    try {
      const result = await deleteAdventure({ adventureId: adventure._id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice(`Deleted ${adventure.name}.`);
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setDeletingAdventureId(null);
    }
  }

  async function handleReturnToAdventures() {
    setError(null);
    setNotice(null);
    await npcDebug.flushQueuedSaves();
    await locationDebug.flushActiveSaves();
    setSelectedAdventureId(null);
    router.push("/");
    resetLocalDraftState();
  }

  function resetLocalDraftState() {
    npcDebug.resetLocalState();
    locationDebug.resetLocalState();
  }

  async function handleReset() {
    if (!adventureId) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsResetting(true);
    try {
      await npcDebug.cancelQueuedSavesAndWaitForActive();
      await locationDebug.flushActiveSaves();
      setError(null);
      const result = await resetPlaytestWorld({ adventureId });
      resetLocalDraftState();
      setNotice(
        `Reset playtest state: cleared ${result.deletedTurns} scoped turns, ${result.deletedCommands} player inputs, restored ${result.restoredFacts} NPC facts, removed ${result.deletedActors} debug NPCs, and reset ${result.resetActorLocations} actor locations.`,
      );
    } catch (resetError) {
      setError(errorMessage(resetError));
    } finally {
      setIsResetting(false);
    }
  }

  async function handlePass() {
    if (
      !adventureId ||
      isSubmitting ||
      isSeeding ||
      isResetting ||
      creatingWorldId !== null ||
      isPlayerCardSavePending
    ) {
      return false;
    }

    return await submitTurn({ trigger: "pass" });
  }

  async function handleActSubmit(input: string): Promise<"close" | "keep-open" | false> {
    if (
      !adventureId ||
      isSubmitting ||
      isSeeding ||
      isResetting ||
      creatingWorldId !== null ||
      isPlayerCardSavePending
    ) {
      return false;
    }

    if (input.trim().startsWith("/")) {
      return await submitUtilityCommand(input);
    }

    const submitted = await submitTurn({ trigger: "act", input });
    return submitted ? "close" : false;
  }

  async function handleStorySubmit(input: string): Promise<"close" | false> {
    if (
      !adventureId ||
      isSubmitting ||
      isSeeding ||
      isResetting ||
      creatingWorldId !== null ||
      isPlayerCardSavePending
    ) {
      return false;
    }

    const submitted = await submitStoryInsert(input);
    return submitted ? "close" : false;
  }

  async function handleGuideSubmit(input: string): Promise<"close" | false> {
    if (
      !adventureId ||
      isSubmitting ||
      isSeeding ||
      isResetting ||
      creatingWorldId !== null ||
      isPlayerCardSavePending
    ) {
      return false;
    }

    const submitted = await submitTurn({ trigger: "guide", guidance: input });
    return submitted ? "close" : false;
  }

  async function submitStoryInsert(input: string) {
    if (!adventureId) {
      return false;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const npcSavesFlushed = await npcDebug.flushQueuedSaves();
      const locationSavesFlushed = await locationDebug.flushActiveSaves();
      if (!npcSavesFlushed || !locationSavesFlushed) {
        return false;
      }

      const result = (await recordStoryInsert({ adventureId, text: input })) as StoryInsertResult;
      if (!result.ok) {
        setError(result.error);
        return false;
      }

      setNotice("Story added.");
      return true;
    } catch (submitError) {
      setError(errorMessage(submitError));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitUtilityCommand(input: string): Promise<"keep-open" | false> {
    if (!adventureId) {
      return false;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const npcSavesFlushed = await npcDebug.flushQueuedSaves();
      const locationSavesFlushed = await locationDebug.flushActiveSaves();
      if (!npcSavesFlushed || !locationSavesFlushed) {
        return false;
      }

      const response = await fetch("/api/director/utility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adventureId,
          input,
          promptGuidance,
        }),
      });
      const result = (await response.json()) as DirectorUtilityResponse;
      if (!response.ok || !result.ok) {
        setError(result.ok ? "The utility command failed." : result.error);
        return false;
      }
      return "keep-open";
    } catch (submitError) {
      setError(errorMessage(submitError));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitTurn(turn: DirectorTurnPayload) {
    const submittedInput = turn.trigger === "act" ? turn.input : "";
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const npcSavesFlushed = await npcDebug.flushQueuedSaves();
      const locationSavesFlushed = await locationDebug.flushActiveSaves();
      if (!npcSavesFlushed || !locationSavesFlushed) {
        return false;
      }

      const response = await fetch("/api/director/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adventureId,
          trigger: turn.trigger,
          ...(turn.trigger === "act" ? { input: submittedInput } : {}),
          ...(turn.trigger === "guide" ? { guidance: turn.guidance } : {}),
          promptGuidance,
        }),
      });
      const result = (await response.json()) as DirectorTurnResponse;

      if (!response.ok || !result.ok) {
        setError(result.ok ? "The Game Master turn failed." : result.error);
        return false;
      }
      return true;
    } catch (submitError) {
      setError(errorMessage(submitError));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main id="lorecraft-app" className="min-h-screen bg-[#090908] pt-12 text-zinc-100">
      <div
        id="app-top-bar"
        className="pointer-events-none fixed inset-x-0 top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur"
      >
        <div
          id="app-top-bar-inner"
          className="pointer-events-none flex h-12 w-full items-center justify-between px-4 sm:px-6 lg:px-8"
        >
          <div id="app-world-title" className="min-w-0 text-sm font-medium text-zinc-200">
            <span className="text-amber-300">Lorecraft</span>
            <span className="px-2 text-zinc-600">-</span>
            <span className="truncate text-zinc-300">{topBarWorldName}</span>
          </div>
          <div id="top-bar-actions" className="pointer-events-auto flex items-center gap-2">
            {adventureId ? (
              <button
                id="back-to-adventures-button"
                type="button"
                onClick={() => void handleReturnToAdventures()}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
              >
                Adventures
              </button>
            ) : null}
            {adventureId ? (
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
            ) : null}
          </div>
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
            {!adventureId ? (
              <AdventureLanding
                worlds={worldContainers ?? []}
                isLoading={isLoadingAdventures}
                isSeeding={isSeeding}
                creatingWorldId={creatingWorldId}
                deletingAdventureId={deletingAdventureId}
                error={error}
                notice={notice}
                onSeedWorld={() => void handleSeed()}
                onCreateAdventure={(worldId, playerName) => void handleCreateAdventure(worldId, playerName)}
                onSelectAdventure={handleSelectAdventure}
                onDeleteAdventure={(adventure) => void handleDeleteAdventure(adventure)}
              />
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
              <div
                id="play-layout"
                className={`flex min-h-0 flex-1 flex-col lg:grid ${
                  isPlayerCardCollapsed
                    ? "lg:grid-cols-[6rem_56fr_23fr]"
                    : "lg:grid-cols-[23fr_56fr_23fr]"
                }`}
              >
                <PlayerCard
                  key={snapshot.player._id}
                  adventureId={adventureId}
                  player={snapshot.player}
                  isCollapsed={isPlayerCardCollapsed}
                  onError={setError}
                  onCollapseChange={setIsPlayerCardCollapsed}
                  onSavePendingChange={setIsPlayerCardSavePending}
                />
                <div
                  id="story-workspace"
                  className="flex min-h-[calc(100vh-3rem)] min-w-0 flex-col lg:min-h-0"
                >
                  <section
                    id="story-stream"
                    ref={storyScrollerRef}
                    className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-5 lg:px-0"
                  >
                    <div
                      id="story-stream-inner"
                      className="mx-auto flex min-h-full max-w-[53rem] flex-col justify-end"
                    >
                      {snapshot.feed.length > 0 ? (
                        <div id="story-feed" className="space-y-8">
                          {snapshot.feed.map((entry) => {
                            const kind = normalizeFeedKind(entry.kind, entry.source);
                            const turnId = "turnId" in entry ? entry.turnId : undefined;
                            return (
                              <StoryEntry
                                key={entry.id}
                                id={entry.id}
                                kind={kind}
                                text={entry.text}
                                turnNumber={
                                  shouldShowTurnNumber(kind) && turnId
                                    ? turnSequenceById.get(turnId)
                                    : undefined
                                }
                              />
                            );
                          })}
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

                  <TurnActionPanel
                    disabled={
                      isSeeding ||
                      isResetting ||
                      creatingWorldId !== null ||
                      isPlayerCardSavePending
                    }
                    isSubmitting={isSubmitting}
                    notice={notice}
                    error={error}
                    slashCommandTargets={slashCommandTargets}
                    onActSubmit={handleActSubmit}
                    onStorySubmit={handleStorySubmit}
                    onGuideSubmit={handleGuideSubmit}
                    onPass={handlePass}
                  />
                </div>
                <RoomInfoCard room={snapshot.room} actors={snapshot.actors} />
              </div>
            )}
          </div>
        </section>

        {adventureId ? (
          <DebugPanelShell
            isCollapsed={isDebugPanelCollapsed}
            hasSnapshot={Boolean(snapshot)}
            headerActions={
              <>
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
              </>
            }
            emptyState={
              <p id="debug-panel-empty-state" className="mt-6 text-sm text-zinc-500">
                Seed a world to inspect state.
              </p>
            }
            promptPanel={snapshot ? (
              <DirectorPromptControls
                value={promptGuidance}
                onChange={setPromptGuidance}
                latestSummary={latestDirectorRequestSummary(snapshot.directorCalls)}
              />
            ) : null}
            npcsPanel={snapshot ? (
              <NpcDebugPanel
                actors={npcDebug.actors}
                facts={snapshot.facts}
                drafts={npcDebug.drafts}
                saveStatus={npcDebug.saveStatus}
                collapsedNpcKeys={npcDebug.collapsedNpcKeys}
                savingNpcKey={npcDebug.savingNpcKey}
                onAdd={npcDebug.addNpc}
                onChange={npcDebug.updateDraft}
                onToggleCollapsed={npcDebug.toggleCollapsed}
                onReset={npcDebug.resetActor}
              />
            ) : null}
            locationsPanel={snapshot ? (
              <LocationDebugPanel
                locations={snapshot.locations}
                saveStatus={locationDebug.saveStatus}
                newLocation={locationDebug.newLocation}
                onNewLocationChange={locationDebug.setNewLocation}
                onSave={locationDebug.saveLocation}
                onCreate={locationDebug.createNewLocation}
              />
            ) : null}
            statePanel={snapshot ? (
              <div className="space-y-4">
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
          />
        ) : null}
      </div>
    </main>
  );
}

function buildSlashCommandTargets(snapshot: SlashCommandSnapshot) {
  const targets: SlashCommandAutocompleteTarget[] = [];

  for (const actor of snapshot.actors) {
    if (actor.role === "player") {
      continue;
    }
    targets.push({ kind: "actor", label: actor.name });
  }

  for (const object of snapshot.objects) {
    targets.push({ kind: "object", label: object.name });
  }

  targets.push({ kind: "location", label: snapshot.room.name });

  return targets;
}

function normalizeFeedKind(kind: string, source?: string): StoryFeedKind {
  if (kind === "story" || (kind === "director" && source === "player")) {
    return "story";
  }
  if (kind === "player" || kind === "director" || kind === "event" || kind === "utility") {
    return kind;
  }
  return "event";
}

function shouldShowTurnNumber(kind: StoryFeedKind) {
  return kind !== "utility" && kind !== "story";
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

function StoryEntry({
  id,
  kind,
  text,
  turnNumber,
}: {
  id: string;
  kind: StoryFeedKind;
  text: string;
  turnNumber?: number;
}) {
  const entryDomId = `story-entry-${kind}-${domId(id)}`;

  if (kind === "player") {
    return (
      <StoryEntryShell id={entryDomId} kind={kind} turnNumber={turnNumber}>
        <article id={`${entryDomId}-player-input`} className="border-l-2 border-amber-300/70 pl-4 text-amber-50">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-amber-300/80">
            Player
          </p>
          <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-amber-50">{text}</p>
        </article>
      </StoryEntryShell>
    );
  }

  if (kind === "story") {
    return (
      <StoryEntryShell id={entryDomId} kind={kind} turnNumber={undefined}>
        <article
          id={`${entryDomId}-story-insert`}
          className="border-l-2 border-sky-300/45 pl-4 text-zinc-200"
        >
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-sky-200/70">
            Story
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[1.02rem] leading-7 text-zinc-200">
            {text}
          </p>
        </article>
      </StoryEntryShell>
    );
  }

  if (kind === "event") {
    return (
      <StoryEntryShell id={entryDomId} kind={kind} turnNumber={turnNumber}>
        <aside
          id={`${entryDomId}-world-event`}
          className="mx-auto max-w-xl rounded border border-emerald-900/60 bg-emerald-950/10 px-3 py-2 text-center text-xs leading-5 text-emerald-300/60"
        >
          {text}
        </aside>
      </StoryEntryShell>
    );
  }

  if (kind === "utility") {
    return (
      <StoryEntryShell id={entryDomId} kind={kind} turnNumber={undefined}>
        <aside
          id={`${entryDomId}-utility-message`}
          className="max-w-2xl rounded-xl bg-zinc-800/45 px-4 py-3 text-sm leading-6 text-zinc-300"
        >
          <p className="mb-2 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Utility
          </p>
          <p className="whitespace-pre-wrap">{text}</p>
        </aside>
      </StoryEntryShell>
    );
  }

  return (
    <StoryEntryShell id={entryDomId} kind={kind} turnNumber={turnNumber}>
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
  kind,
  turnNumber,
  children,
}: {
  id: string;
  kind: StoryFeedKind;
  turnNumber?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      data-story-kind={kind}
      className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 sm:grid-cols-[2.25rem_minmax(0,1fr)]"
    >
      <div id={`${id}-turn-number`} className="pt-1 text-right text-xs tabular-nums text-zinc-700">
        {turnNumber ? turnNumber : ""}
      </div>
      <div id={`${id}-body`} className="min-w-0">{children}</div>
    </div>
  );
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
  newLocation: NewLocationDraft;
  onNewLocationChange: (location: NewLocationDraft) => void;
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
