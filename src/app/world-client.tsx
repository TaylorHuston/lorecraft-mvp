"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
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
  const [promptGuidance, setPromptGuidance] = useState<DirectorPromptGuidance>(
    DEFAULT_PROMPT_GUIDANCE,
  );
  const storyScrollerRef = useRef<HTMLElement | null>(null);

  const worldId = selectedWorldId ?? defaultWorldId ?? null;
  const snapshot = useQuery(api.world.getSnapshot, worldId ? { worldId } : "skip");
  const feedLength = snapshot?.feed.length ?? 0;
  const turnSequenceById = snapshot ? buildTurnSequenceById(snapshot.turns) : new Map<string, number>();

  useEffect(() => {
    const storyScroller = storyScrollerRef.current;

    if (!storyScroller) {
      return;
    }

    storyScroller.scrollTop = storyScroller.scrollHeight;
  }, [feedLength, isSubmitting, error]);

  async function handleSeed() {
    setError(null);
    const seededWorldId = await seedWorld();
    setSelectedWorldId(seededWorldId);
    setNotice("Stormbound Chapel is ready.");
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
        `Reset playtest state: cleared ${result.deletedTurns} scoped turns, ${result.deletedCommands} player inputs, and restored ${result.restoredFacts} Mira facts.`,
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
        setError(result.ok ? "The Director turn failed." : result.error);
        setInput((currentInput) => (currentInput.trim() ? currentInput : submittedInput));
        return;
      }

      setNotice("Director response persisted.");
    } catch (submitError) {
      setError(errorMessage(submitError));
      setInput((currentInput) => (currentInput.trim() ? currentInput : submittedInput));
    } finally {
      setIsSubmitting(false);
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
    <main className="min-h-screen bg-[#08090b] text-zinc-100">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:h-screen lg:grid-cols-[minmax(0,1fr)_440px] lg:overflow-hidden">
        <section className="flex h-screen min-h-0 flex-col px-5 py-6 sm:px-8 lg:px-10">
          <header className="shrink-0 border-b border-zinc-800 pb-5">
            <p className="text-sm uppercase text-cyan-300">Lorecraft MVP</p>
            <h1 className="mt-3 text-3xl font-semibold text-zinc-50 sm:text-5xl">
              Stormbound Chapel
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">
              A narrative Director loop for testing persistent scene memory and Mira&apos;s evolving state.
            </p>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-5 py-6">
            {!worldId ? (
              <div className="flex min-h-0 flex-1 flex-col items-start justify-center gap-4">
                <p className="max-w-xl text-lg text-zinc-300">
                  Seed the demo world to begin the persistent scene playtest.
                </p>
                <button
                  type="button"
                  onClick={handleSeed}
                  className="border border-cyan-300 bg-cyan-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-cyan-200"
                >
                  Seed Stormbound Chapel
                </button>
              </div>
            ) : snapshot === undefined ? (
              <p className="text-zinc-400">Loading world state...</p>
            ) : snapshot === null ? (
              <div className="min-h-0 flex-1 space-y-4">
                <p className="text-zinc-300">
                  The selected world is missing required player or room state.
                </p>
                <button
                  type="button"
                  onClick={handleSeed}
                  className="border border-cyan-300 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-zinc-900"
                >
                  Seed or reload demo world
                </button>
              </div>
            ) : (
              <>
                <section
                  ref={storyScrollerRef}
                  className="min-h-0 flex-1 overflow-y-auto border-y border-zinc-800 bg-zinc-950/40 px-3 py-5 sm:px-5"
                >
                  <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end">
                    {snapshot.feed.length > 0 ? (
                      <div className="space-y-7">
                        {snapshot.feed.map((entry) => (
                          <StoryEntry
                            key={entry.id}
                            kind={entry.kind}
                            text={entry.text}
                            turnNumber={entry.turnId ? turnSequenceById.get(entry.turnId) : undefined}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-1 items-end pb-8 text-zinc-500">
                        <p className="max-w-md text-base leading-7 text-zinc-400">
                          The chapel waits in rain and lanternlight.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <form
                  onSubmit={handleSubmit}
                  className="shrink-0 border border-zinc-800 bg-zinc-900/80 p-4 shadow-2xl shadow-black/30"
                >
                  <label htmlFor="director-input" className="text-sm font-medium text-zinc-300">
                    Continue
                  </label>
                  <textarea
                    id="director-input"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="I ask Mira what she knows about the storm."
                    rows={3}
                    className="mt-2 min-h-24 w-full resize-y border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  />
                  {isSubmitting ? <p className="mt-3 text-sm text-zinc-400">Director thinking...</p> : null}
                  {notice ? <p className="mt-3 text-sm text-cyan-200">{notice}</p> : null}
                  {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
                </form>
              </>
            )}
          </div>
        </section>

        <aside className="border-t border-zinc-800 bg-zinc-900 px-5 py-6 lg:h-screen lg:overflow-y-auto lg:border-l lg:border-t-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:flex-col">
            <div>
              <h2 className="text-lg font-semibold text-zinc-50">Debug panel</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Hidden world state, Director calls, validation decisions, events, and state diffs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSeed}
                className="border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Ensure seed
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={!worldId || isResetting}
                className="border border-rose-400 px-3 py-2 text-sm text-rose-200 hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResetting ? "Resetting" : "Rough reset"}
              </button>
            </div>
          </div>

          {snapshot ? (
            <div className="mt-6 space-y-6">
              <DirectorPromptControls
                value={promptGuidance}
                onChange={setPromptGuidance}
                latestSummary={latestDirectorRequestSummary(snapshot.directorCalls)}
              />
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
              <DebugJson title="Director calls" value={snapshot.directorCalls} />
              <DebugJson title="State diffs" value={snapshot.diffs} />
            </div>
          ) : (
            <p className="mt-6 text-sm text-zinc-500">Seed a world to inspect state.</p>
          )}
        </aside>
      </div>
    </main>
  );
}

function StoryEntry({
  kind,
  text,
  turnNumber,
}: {
  kind: "player" | "director" | "event";
  text: string;
  turnNumber?: number;
}) {
  if (kind === "player") {
    return (
      <StoryEntryShell turnNumber={turnNumber}>
        <article className="border-l-2 border-cyan-400/70 pl-4 text-cyan-50">
          <p className="text-xs uppercase text-cyan-300">Player</p>
          <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-cyan-50">{text}</p>
        </article>
      </StoryEntryShell>
    );
  }

  if (kind === "event") {
    return (
      <StoryEntryShell turnNumber={turnNumber}>
        <aside className="mx-auto max-w-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-center text-xs leading-5 text-zinc-500">
          {text}
        </aside>
      </StoryEntryShell>
    );
  }

  return (
    <StoryEntryShell turnNumber={turnNumber}>
      <article>
        <p className="whitespace-pre-wrap text-base leading-7 text-zinc-100 sm:text-lg sm:leading-8">
          {text}
        </p>
      </article>
    </StoryEntryShell>
  );
}

function StoryEntryShell({
  turnNumber,
  children,
}: {
  turnNumber?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
      <div className="pt-1 text-right text-xs tabular-nums text-zinc-600">
        {turnNumber ? turnNumber : ""}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function DebugList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium uppercase text-zinc-400">{title}</h3>
      <ul className="mt-3 space-y-2 text-xs leading-5 text-zinc-300">
        {items.length > 0 ? (
          items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)
        ) : (
          <li className="text-zinc-500">None yet.</li>
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
    <section className="border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium uppercase text-zinc-300">Prompt guidance</h3>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Editable text sections for the next Director turn. These guide style and behavior without changing the output schema.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_PROMPT_GUIDANCE)}
          className="shrink-0 border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 space-y-4">
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

      <div className="mt-5 border-t border-zinc-800 pt-4">
        <h4 className="text-xs font-medium uppercase text-zinc-500">Last Director summary</h4>
        <dl className="mt-3 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs leading-5">
          {latestSummary ? (
            <>
              <dt className="text-zinc-500">Beat</dt>
              <dd className="min-w-0 text-zinc-300">{summaryText(latestSummary.requiredSceneBeat)}</dd>
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
            <dd className="col-span-2 text-zinc-500">No Director turn yet.</dd>
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
  const id = `director-${label.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
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
        className="min-h-20 w-full resize-y border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs leading-5 text-zinc-200 outline-none focus:border-cyan-300"
      />
    </div>
  );
}

function DebugJson({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <h3 className="text-sm font-medium uppercase text-zinc-400">{title}</h3>
      <pre className="mt-3 max-h-80 overflow-auto border border-zinc-800 bg-zinc-950 p-3 text-xs leading-5 text-zinc-300">
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
      typeof turn.directorCallStatus === "string" ? `; Director: ${turn.directorCallStatus}` : "";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request failed.";
}
