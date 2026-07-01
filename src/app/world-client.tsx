"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { NpcDebugOverride } from "@/lib/director/types";

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

type DebugTab = "prompt" | "npcs" | "state";

type NpcOverrideResponse =
  | { ok: true; overrides: Record<string, NpcDebugOverride> }
  | { ok: false; error: string };

type NpcOverrideSaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

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
  const defaultWorldId = useQuery(api.world.getDefaultWorld);
  const seedWorld = useMutation(api.world.seedDemoWorld);
  const resetPlaytestWorld = useMutation(api.world.resetPlaytestWorld);
  const [selectedWorldId, setSelectedWorldId] = useState<Id<"worlds"> | null>(null);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDebugPanelCollapsed, setIsDebugPanelCollapsed] = useState(false);
  const [debugTab, setDebugTab] = useState<DebugTab>("prompt");
  const [npcOverrides, setNpcOverrides] = useState<Record<string, NpcDebugOverride>>({});
  const [npcOverrideSaveStatus, setNpcOverrideSaveStatus] = useState<
    Record<string, NpcOverrideSaveStatus>
  >({});
  const [collapsedNpcKeys, setCollapsedNpcKeys] = useState<Record<string, boolean>>({});
  const [savingNpcKey, setSavingNpcKey] = useState<string | null>(null);
  const [promptGuidance, setPromptGuidance] = useState<DirectorPromptGuidance>(
    DEFAULT_PROMPT_GUIDANCE,
  );
  const storyScrollerRef = useRef<HTMLElement | null>(null);
  const npcOverrideSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const npcOverrideSaveVersions = useRef<Record<string, number>>({});
  const nextDebugNpcOrdinal = useRef(1);

  const worldId = selectedWorldId ?? defaultWorldId ?? null;
  const isLoadingDefaultWorld = selectedWorldId === null && defaultWorldId === undefined;
  const snapshot = useQuery(api.world.getSnapshot, worldId ? { worldId } : "skip");
  const feedLength = snapshot?.feed.length ?? 0;
  const turnSequenceById = snapshot ? buildTurnSequenceById(snapshot.turns) : new Map<string, number>();
  const topBarWorldName = snapshot?.world.name ?? (worldId ? "Loading world" : "No world");

  useEffect(() => {
    const storyScroller = storyScrollerRef.current;

    if (!storyScroller) {
      return;
    }

    storyScroller.scrollTop = storyScroller.scrollHeight;
  }, [feedLength, isSubmitting, error]);

  useEffect(() => {
    if (!worldId) {
      return;
    }

    let cancelled = false;
    void fetch(`/api/debug/npc-overrides?worldId=${encodeURIComponent(worldId)}`)
      .then((response) => response.json() as Promise<NpcOverrideResponse>)
      .then((result) => {
        if (!cancelled && result.ok) {
          setNpcOverrides(result.overrides);
          setNpcOverrideSaveStatus({});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNpcOverrides({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, [worldId]);

  useEffect(() => {
    const timers = npcOverrideSaveTimers.current;
    return () => {
      for (const timer of Object.values(timers)) {
        clearTimeout(timer);
      }
    };
  }, []);

  async function handleSeed() {
    setError(null);
    const seededWorldId = await seedWorld();
    setSelectedWorldId(seededWorldId);
    setNpcOverrides({});
    setNpcOverrideSaveStatus({});
    setCollapsedNpcKeys({});
    setNotice("Fresh Stormbound Chapel world seeded.");
  }

  async function handleReset() {
    if (!worldId) {
      return;
    }

    setError(null);
    setIsResetting(true);
    try {
      const result = await resetPlaytestWorld({ worldId });
      setNotice(
        `Reset playtest state: cleared ${result.deletedTurns} scoped turns, ${result.deletedCommands} player inputs, and restored ${result.restoredFacts} NPC facts.`,
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

    if (!worldId || !submittedInput || isSubmitting) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    setInput("");
    try {
      const response = await fetch("/api/director/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worldId,
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

  function updateNpcOverride(actorKey: string, override: NpcDebugOverride) {
    setNpcOverrides((current) => ({
      ...current,
      [actorKey]: override,
    }));
    scheduleNpcOverrideSave(actorKey, override);
  }

  function addNpcOverride() {
    const existingActorKeys = new Set([
      ...(snapshot?.actors.map((actor) => actor.key) ?? []),
      ...Object.keys(npcOverrides),
    ]);
    let actorKey = `debug-npc-${nextDebugNpcOrdinal.current}`;
    while (existingActorKeys.has(actorKey)) {
      nextDebugNpcOrdinal.current += 1;
      actorKey = `debug-npc-${nextDebugNpcOrdinal.current}`;
    }
    nextDebugNpcOrdinal.current += 1;
    const override: NpcDebugOverride = {
      name: "New NPC",
      description: "A temporary NPC for playtesting.",
      facts: {
        background: "New NPC background.",
        persona: "New NPC personality.",
        voice: "New NPC voice.",
        mood: "neutral",
        status: "present in the current scene",
        memory: "This NPC has not yet formed meaningful memories of Taylor.",
        knowledge: "This NPC has no private knowledge yet.",
      },
    };

    setCollapsedNpcKeys((current) => ({ ...current, [actorKey]: false }));
    updateNpcOverride(actorKey, override);
  }

  function toggleNpcCollapsed(actorKey: string) {
    setCollapsedNpcKeys((current) => ({ ...current, [actorKey]: !current[actorKey] }));
  }

  function scheduleNpcOverrideSave(actorKey: string, override: NpcDebugOverride) {
    if (!worldId) {
      return;
    }

    npcOverrideSaveVersions.current[actorKey] = (npcOverrideSaveVersions.current[actorKey] ?? 0) + 1;
    const saveVersion = npcOverrideSaveVersions.current[actorKey];
    const saveWorldId = worldId;

    setNpcOverrideSaveStatus((current) => ({ ...current, [actorKey]: "unsaved" }));
    clearTimeout(npcOverrideSaveTimers.current[actorKey]);
    npcOverrideSaveTimers.current[actorKey] = setTimeout(() => {
      void persistNpcOverride(saveWorldId, actorKey, override, saveVersion);
    }, 700);
  }

  async function persistNpcOverride(
    saveWorldId: string,
    actorKey: string,
    override: NpcDebugOverride,
    saveVersion: number,
  ) {
    setError(null);
    setSavingNpcKey(actorKey);
    setNpcOverrideSaveStatus((current) => ({ ...current, [actorKey]: "saving" }));
    try {
      const response = await fetch("/api/debug/npc-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worldId: saveWorldId,
          actorKey,
          override,
        }),
      });
      const result = (await response.json()) as NpcOverrideResponse;
      if (!response.ok || !result.ok) {
        setError(result.ok ? "Failed to save NPC override." : result.error);
        setNpcOverrideSaveStatus((current) => ({ ...current, [actorKey]: "error" }));
        return;
      }

      if (npcOverrideSaveVersions.current[actorKey] === saveVersion) {
        setNpcOverrides(result.overrides);
        setNpcOverrideSaveStatus((current) => ({ ...current, [actorKey]: "saved" }));
      }
    } catch (saveError) {
      setError(errorMessage(saveError));
      setNpcOverrideSaveStatus((current) => ({ ...current, [actorKey]: "error" }));
    } finally {
      if (npcOverrideSaveVersions.current[actorKey] === saveVersion) {
        setSavingNpcKey(null);
      }
    }
  }

  async function clearNpcOverride(actorKey: string) {
    if (!worldId) {
      return;
    }

    setError(null);
    setSavingNpcKey(actorKey);
    clearTimeout(npcOverrideSaveTimers.current[actorKey]);
    npcOverrideSaveVersions.current[actorKey] = (npcOverrideSaveVersions.current[actorKey] ?? 0) + 1;
    try {
      const response = await fetch(
        `/api/debug/npc-overrides?worldId=${encodeURIComponent(worldId)}&actorKey=${encodeURIComponent(actorKey)}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as NpcOverrideResponse;
      if (!response.ok || !result.ok) {
        setError(result.ok ? "Failed to clear NPC override." : result.error);
        return;
      }
      setNpcOverrides(result.overrides);
      setNpcOverrideSaveStatus((current) => ({ ...current, [actorKey]: "idle" }));
      setNotice("NPC override cleared.");
    } catch (clearError) {
      setError(errorMessage(clearError));
    } finally {
      setSavingNpcKey(null);
    }
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
            {isLoadingDefaultWorld ? (
              <p id="default-world-loading-state" className="text-zinc-400">
                Loading world state...
              </p>
            ) : !worldId ? (
              <div
                id="seed-world-empty-state"
                className="flex min-h-0 flex-1 flex-col items-start justify-center gap-4"
              >
                <p className="max-w-xl text-base leading-7 text-zinc-300">
                  Seed a fresh demo world to begin the transcript playtest.
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
              <p id="world-loading-state" className="text-zinc-400">Loading world state...</p>
            ) : snapshot === null ? (
              <div id="world-missing-state" className="min-h-0 flex-1 space-y-4">
                <p className="text-zinc-300">
                  The selected world is missing required player or room state.
                </p>
                <button
                  id="seed-or-reload-world-button"
                  type="button"
                  onClick={handleSeed}
                  className="rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-950/20"
                >
                  Seed or reload demo world
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
                  {notice ? (
                    <p id="turn-notice-message" className="mt-3 text-xs text-emerald-300/80">
                      {notice}
                    </p>
                  ) : null}
                  {error ? (
                    <p id="turn-error-message" className="mt-3 text-sm text-rose-300">
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
          className={`fixed right-0 top-12 z-20 h-[calc(100vh-3rem)] w-full max-w-[380px] overflow-y-auto border-l border-zinc-800 bg-zinc-900/95 px-4 py-5 shadow-2xl shadow-black/40 transition-transform duration-200 ease-out sm:w-[380px] ${
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
                Hidden world state, Game Master calls, validation decisions, events, and state diffs.
              </p>
            </div>
            <div id="debug-panel-actions" className="flex flex-wrap gap-2">
              <button
                id="fresh-seed-button"
                type="button"
                onClick={handleSeed}
                className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Reset World
              </button>
              <button
                id="rough-reset-button"
                type="button"
                onClick={handleReset}
                disabled={!worldId || isResetting}
                className="rounded border border-rose-500/70 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResetting ? "Resetting" : "Reset Session"}
              </button>
            </div>
          </div>

          {snapshot ? (
            <div id="debug-panel-content" className="mt-6 space-y-6">
              <DebugTabs value={debugTab} onChange={setDebugTab} />
              {debugTab === "prompt" ? (
                <DirectorPromptControls
                  value={promptGuidance}
                  onChange={setPromptGuidance}
                  latestSummary={latestDirectorRequestSummary(snapshot.directorCalls)}
                />
              ) : null}
              {debugTab === "npcs" ? (
                <NpcDebugPanel
                  actors={snapshot.actors}
                  facts={snapshot.facts}
                  overrides={npcOverrides}
                  saveStatus={npcOverrideSaveStatus}
                  collapsedNpcKeys={collapsedNpcKeys}
                  savingNpcKey={savingNpcKey}
                  onAdd={addNpcOverride}
                  onChange={updateNpcOverride}
                  onToggleCollapsed={toggleNpcCollapsed}
                  onClear={clearNpcOverride}
                />
              ) : null}
              {debugTab === "state" ? (
                <>
                  <DebugList
                    title="Scene"
                    items={[
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
                    title="NPC state changes"
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
                </>
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
    { value: "state", label: "State" },
  ];

  return (
    <div id="debug-tabs" className="grid grid-cols-3 rounded-md border border-zinc-800 text-xs uppercase">
      {tabs.map((tab) => (
        <button
          id={`debug-tab-${tab.value}`}
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
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

function NpcDebugPanel({
  actors,
  facts,
  overrides,
  saveStatus,
  collapsedNpcKeys,
  savingNpcKey,
  onAdd,
  onChange,
  onToggleCollapsed,
  onClear,
}: {
  actors: Array<{
    key: string;
    name: string;
    description: string;
    role: "player" | "npc";
  }>;
  facts: Array<{
    subjectId: string;
    key: string;
    value: string | number | boolean | null;
    source: string;
  }>;
  overrides: Record<string, NpcDebugOverride>;
  saveStatus: Record<string, NpcOverrideSaveStatus>;
  collapsedNpcKeys: Record<string, boolean>;
  savingNpcKey: string | null;
  onAdd: () => void;
  onChange: (actorKey: string, override: NpcDebugOverride) => void;
  onToggleCollapsed: (actorKey: string) => void;
  onClear: (actorKey: string) => void;
}) {
  const actorKeys = new Set(actors.map((actor) => actor.key));
  const npcs = [
    ...actors.filter((actor) => actor.role === "npc").map((actor) => ({ ...actor, debugOnly: false })),
    ...Object.entries(overrides)
      .filter(([actorKey]) => !actorKeys.has(actorKey))
      .map(([actorKey, override]) => ({
        key: actorKey,
        name: override.name?.trim() || titleFromKey(actorKey),
        description: override.description?.trim() || "A temporary debug NPC.",
        role: "npc" as const,
        debugOnly: true,
      })),
  ];

  return (
    <section id="npc-debug-panel" className="space-y-4">
      <div id="npc-debug-panel-header" className="flex items-start justify-between gap-4">
        <div id="npc-debug-panel-title-block">
          <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-300">NPCs</h3>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Temporary debug NPC values are server-local and disappear on restart.
          </p>
        </div>
        <button
          id="add-debug-npc-button"
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Add NPC
        </button>
      </div>
      {npcs.length > 0 ? (
        npcs.map((npc) => {
          const npcDomId = `npc-card-${domId(npc.key)}`;
          const override = overrides[npc.key] ?? {};
          const overrideFacts = override.facts ?? {};
          const actorFacts = npc.debugOnly
            ? NPC_PROFILE_FACT_KEYS.map((key) => ({
                subjectId: `actor:${npc.key}`,
                key,
                value: overrideFacts[key] ?? "",
                source: "debug_override",
              }))
            : facts.filter((fact) => fact.subjectId === `actor:${npc.key}`);
          const isSaving = savingNpcKey === npc.key;
          const status = saveStatus[npc.key] ?? "idle";
          const statusLabel = npcOverrideStatusLabel(status, Boolean(overrides[npc.key]));
          const isCollapsed = Boolean(collapsedNpcKeys[npc.key]);

          return (
            <div
              id={npcDomId}
              key={npc.key}
              className="rounded-md border border-zinc-800 bg-zinc-950/45 p-3"
            >
              <div id={`${npcDomId}-header`} className="flex items-start justify-between gap-3">
                <div id={`${npcDomId}-identity`}>
                  <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-300">
                    {npc.name} <span className="text-zinc-600">({npc.key})</span>
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {npc.description}
                    {npc.debugOnly ? " (debug-only)" : ""}
                  </p>
                </div>
                <div id={`${npcDomId}-actions`} className="flex shrink-0 items-center gap-2">
                  <span id={`${npcDomId}-save-status`} className="text-xs uppercase text-emerald-300/60">{statusLabel}</span>
                  <button
                    id={`${npcDomId}-collapse-toggle`}
                    type="button"
                    onClick={() => onToggleCollapsed(npc.key)}
                    className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    {isCollapsed ? "Expand" : "Collapse"}
                  </button>
                  <button
                    id={`${npcDomId}-reset-button`}
                    type="button"
                    onClick={() => onClear(npc.key)}
                    disabled={isSaving || !overrides[npc.key]}
                    className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {!isCollapsed ? (
                <div id={`${npcDomId}-fields`} className="mt-4 space-y-4">
                  <NpcOverrideTextarea
                    actorKey={npc.key}
                    label="Name"
                    meta={override.name !== undefined ? "override" : "canonical"}
                    value={override.name ?? npc.name}
                    onChange={(name) => onChange(npc.key, { ...override, name })}
                  />
                  <NpcOverrideTextarea
                    actorKey={npc.key}
                    label="Description"
                    meta={override.description !== undefined ? "override" : "canonical"}
                    value={override.description ?? npc.description}
                    onChange={(description) => onChange(npc.key, { ...override, description })}
                  />
                  {actorFacts.map((fact) => (
                    <NpcOverrideTextarea
                      key={fact.key}
                      actorKey={npc.key}
                      label={fact.key}
                      meta={overrideFacts[fact.key] !== undefined ? "override" : fact.source}
                      value={overrideFacts[fact.key] ?? String(fact.value ?? "")}
                      onChange={(value) =>
                        onChange(npc.key, {
                          ...override,
                          facts: {
                            ...overrideFacts,
                            [fact.key]: value,
                          },
                        })
                      }
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })
      ) : (
        <p id="npc-debug-panel-empty-state" className="text-sm text-zinc-500">No NPCs in the current scene.</p>
      )}
    </section>
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

function npcOverrideStatusLabel(status: NpcOverrideSaveStatus, hasOverride: boolean) {
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
  return hasOverride ? "Override active" : "Canonical";
}

function NpcOverrideTextarea({
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
  const id = `npc-override-${domId(actorKey)}-${domId(label)}`;

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
        className="min-h-20 w-full resize-y rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs leading-5 text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-amber-300"
      />
    </div>
  );
}

function DebugList({ title, items }: { title: string; items: string[] }) {
  const listDomId = `debug-list-${domId(title)}`;

  return (
    <div id={listDomId}>
      <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">{title}</h3>
      <ul id={`${listDomId}-items`} className="mt-3 space-y-2 text-xs leading-5 text-zinc-300">
        {items.length > 0 ? (
          items.map((item, index) => <li id={`${listDomId}-item-${index + 1}`} key={`${title}-${index}`}>{item}</li>)
        ) : (
          <li id={`${listDomId}-empty-state`} className="text-zinc-500">None yet.</li>
        )}
      </ul>
    </div>
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
    <section id="prompt-guidance-panel" className="rounded-md border border-zinc-800 bg-zinc-950/45 p-3">
      <div id="prompt-guidance-header" className="flex items-start justify-between gap-4">
        <div id="prompt-guidance-title-block">
          <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-300">
            Prompt guidance
          </h3>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Editable text sections for the next Game Master turn. These guide style and behavior without changing the output schema.
          </p>
        </div>
        <button
          id="prompt-guidance-reset-button"
          type="button"
          onClick={() => onChange(DEFAULT_PROMPT_GUIDANCE)}
          className="shrink-0 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Reset
        </button>
      </div>

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

      <div id="last-game-master-summary" className="mt-5 border-t border-zinc-800 pt-4">
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
      </div>
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
        className="min-h-20 w-full resize-y rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs leading-5 text-zinc-200 outline-none focus:border-amber-300"
      />
    </div>
  );
}

function DebugJson({ title, value }: { title: string; value: unknown }) {
  const jsonDomId = `debug-json-${domId(title)}`;

  return (
    <div id={jsonDomId}>
      <h3 className="text-sm font-medium uppercase text-zinc-400">{title}</h3>
      <pre id={`${jsonDomId}-content`} className="mt-3 max-h-80 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs leading-5 text-zinc-300">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
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
