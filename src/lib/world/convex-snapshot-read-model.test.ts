import { describe, expect, it } from "vitest";
import type { QueryCtx } from "../../../convex/_generated/server";
import {
  loadFeed,
  loadSnapshotReadModel,
  loadStoryVisibleHistory,
  loadTranscript,
} from "./convex-snapshot-read-model";

describe("Convex snapshot read model", () => {
  it("returns subject-complete current-scene NPC profiles when debug facts are hidden", async () => {
    const adventure = row("adventure-1", {
      name: "Stormbound Chapel",
      worldId: "world-1",
      worldVersionId: "world-version-1",
    });
    const world = row("world-1", {
      name: "Stormbound Chapel",
      description: "A chapel in a storm.",
    });
    const worldVersion = row("world-version-1", {
      versionNumber: 1,
      name: "Stormbound Chapel",
    });
    const room = row("room-1", {
      key: "chapel",
      name: "Chapel",
      description: "Rain taps against warped shutters.",
    });
    const player = row("actor-player", {
      key: "taylor",
      name: "Taylor",
      role: "player",
      roomId: "room-1",
      description: "A rain-soaked traveler.",
    });
    const mira = row("actor-mira", {
      key: "mira-vale",
      name: "Mira Vale",
      role: "npc",
      roomId: "room-1",
      description: "A watchful bell-keeper.",
    });
    const profileFacts = [
      ["background", "Mira has kept the chapel bell for ten winters."],
      ["persona", "Patient, observant, and slow to trust."],
      ["voice", "Low and deliberate."],
      ["mood", "Wary"],
      ["status", "Listening near the altar"],
      ["memory", "The bell rang before the storm arrived."],
      ["knowledge", "A hidden stair lies beneath the vestry."],
    ].map(([key, value]) =>
      row(`fact-${key}`, {
        subjectType: "actor",
        subjectId: "actor:mira-vale",
        key,
        value,
        source: "seed",
      }),
    );
    const ctx = fakeQueryCtx({
      rooms: [room],
      actors: [player, mira],
      worldObjects: [],
      facts: profileFacts,
      exits: [],
      commands: [],
      narrations: [],
      events: [],
      utilityMessages: [],
      stateDiffs: [],
      directorCalls: [],
      turns: [],
    });

    const snapshot = await loadSnapshotReadModel(ctx, {
      adventureId: "adventure-1" as never,
      loaded: { adventure, world, worldVersion, player, room } as never,
      includeDebugState: false,
    });

    expect(snapshot.facts).toEqual([]);
    expect(snapshot.npcProfiles).toEqual([
      {
        _id: "actor-mira",
        key: "mira-vale",
        name: "Mira Vale",
        locationKey: "chapel",
        locationName: "Chapel",
        description: "A watchful bell-keeper.",
        background: "Mira has kept the chapel bell for ten winters.",
        persona: "Patient, observant, and slow to trust.",
        voice: "Low and deliberate.",
        mood: "Wary",
        status: "Listening near the altar",
        memory: "The bell rang before the storm arrived.",
        knowledge: "A hidden stair lies beneath the vestry.",
      },
    ]);
  });

  it("returns Player Card profile fields even when debug facts are hidden", async () => {
    const adventure = row("adventure-1", {
      name: "Stormbound Chapel",
      worldId: "world-1",
      worldVersionId: "world-version-1",
    });
    const world = row("world-1", {
      name: "Stormbound Chapel",
      description: "A chapel in a storm.",
    });
    const worldVersion = row("world-version-1", {
      versionNumber: 1,
      name: "Stormbound Chapel",
    });
    const room = row("room-1", {
      key: "chapel",
      name: "Chapel",
      description: "Rain taps against warped shutters.",
    });
    const player = row("actor-player", {
      key: "taylor",
      name: "Taylor",
      role: "player",
      roomId: "room-1",
      description: "A rain-soaked traveler.",
    });
    const ctx = fakeQueryCtx({
      rooms: [room],
      actors: [player],
      worldObjects: [],
      facts: [
        row("fact-backstory", {
          subjectType: "actor",
          subjectId: "actor:taylor",
          key: "backstory",
          value: "Taylor came to investigate the bell.",
          source: "player",
        }),
        row("fact-status", {
          subjectType: "actor",
          subjectId: "actor:taylor",
          key: "status",
          value: "standing near the chapel aisle",
          source: "player",
        }),
      ],
      exits: [],
      commands: [],
      narrations: [],
      events: [],
      utilityMessages: [],
      stateDiffs: [],
      directorCalls: [],
      turns: [],
    });

    const snapshot = await loadSnapshotReadModel(ctx, {
      adventureId: "adventure-1" as never,
      loaded: {
        adventure,
        world,
        worldVersion,
        player,
        room,
      } as never,
      includeDebugState: false,
    });

    expect(snapshot.facts).toEqual([]);
    expect(snapshot.player).toMatchObject({
      name: "Taylor",
      description: "A rain-soaked traveler.",
      locationName: "Chapel",
      profile: {
        physicalDescription: "A rain-soaked traveler.",
        backstory: "Taylor came to investigate the bell.",
        status: "standing near the chapel aisle",
      },
    });
  });

  it("loads Player Card facts outside the bounded general fact list", async () => {
    const adventure = row("adventure-1", {
      name: "Stormbound Chapel",
      worldId: "world-1",
      worldVersionId: "world-version-1",
    });
    const world = row("world-1", {
      name: "Stormbound Chapel",
      description: "A chapel in a storm.",
    });
    const worldVersion = row("world-version-1", {
      versionNumber: 1,
      name: "Stormbound Chapel",
    });
    const room = row("room-1", {
      key: "chapel",
      name: "Chapel",
      description: "Rain taps against warped shutters.",
    });
    const player = row("actor-player", {
      key: "taylor",
      name: "Taylor",
      role: "player",
      roomId: "room-1",
      description: "A rain-soaked traveler.",
    });
    const playerFacts = [
      row("fact-backstory", {
        subjectType: "actor",
        subjectId: "actor:taylor",
        key: "backstory",
        value: "Taylor remembers the old bell.",
        source: "player",
      }),
      row("fact-status", {
        subjectType: "actor",
        subjectId: "actor:taylor",
        key: "status",
        value: "keeping one hand near the lantern",
        source: "player",
      }),
    ];
    const fillerFacts = Array.from({ length: 100 }, (_, index) =>
      row(`fact-filler-${index}`, {
        subjectType: "actor",
        subjectId: `actor:filler-${index}`,
        key: "status",
        value: `filler ${index}`,
        source: "debug",
      }),
    );
    const ctx = fakeQueryCtx({
      rooms: [room],
      actors: [player],
      worldObjects: [],
      facts: [...playerFacts, ...fillerFacts],
      exits: [],
      commands: [],
      narrations: [],
      events: [],
      utilityMessages: [],
      stateDiffs: [],
      directorCalls: [],
      turns: [],
    });

    const snapshot = await loadSnapshotReadModel(ctx, {
      adventureId: "adventure-1" as never,
      loaded: {
        adventure,
        world,
        worldVersion,
        player,
        room,
      } as never,
      includeDebugState: true,
    });

    expect(snapshot.facts).not.toContainEqual(expect.objectContaining({ key: "backstory" }));
    expect(snapshot.player.profile.backstory).toBe("Taylor remembers the old bell.");
    expect(snapshot.player.profile.status).toBe("keeping one hand near the lantern");
  });

  it("shows player Story inserts as distinct feed entries", async () => {
    const ctx = fakeQueryCtx({
      commands: [],
      narrations: [
        row("narration-seed", { text: "Rain lashes the chapel.", source: "seed" }),
        row("narration-story", {
          text: "You chalk a circle around the lantern.",
          source: "player",
        }),
        row("narration-llm", {
          text: "Mira watches the circle in silence.",
          source: "llm",
          turnId: "turn-1",
        }),
      ],
      events: [],
      utilityMessages: [],
      turns: [row("turn-1", { status: "succeeded" })],
    });

    const feed = await loadFeed(ctx, "adventure-1" as never, 20);

    expect(feed.map((entry) => ({ id: entry.id, kind: entry.kind, source: entry.source }))).toEqual([
      { id: "narration:narration-seed", kind: "director", source: "seed" },
      { id: "narration:narration-story", kind: "story", source: "player" },
      { id: "narration:narration-llm", kind: "director", source: "llm" },
    ]);
  });

  it("includes Story inserts in future story-visible history and excludes failed turns", async () => {
    const ctx = fakeQueryCtx({
      commands: [],
      narrations: [
        row("narration-seed", { text: "Rain lashes the chapel.", source: "seed" }),
        row("narration-story", {
          text: "You chalk a circle around the lantern.",
          source: "player",
        }),
        row("narration-success", {
          text: "Mira studies the chalk circle.",
          source: "llm",
          turnId: "turn-success",
        }),
        row("narration-failed", {
          text: "This failed turn should not enter prompt history.",
          source: "llm",
          turnId: "turn-failed",
        }),
      ],
      events: [],
      utilityMessages: [],
      turns: [
        row("turn-success", { status: "succeeded" }),
        row("turn-failed", { status: "failed" }),
      ],
    });

    const history = await loadStoryVisibleHistory(ctx, "adventure-1" as never, 20);

    expect(history.map((entry) => ({ id: entry.id, kind: entry.kind, source: entry.source }))).toEqual([
      { id: "narration:narration-seed", kind: "director", source: "seed" },
      { id: "narration:narration-story", kind: "story", source: "player" },
      { id: "narration:narration-success", kind: "director", source: "llm" },
    ]);
  });

  it("includes Story inserts as transcript narration without seed narration", async () => {
    const ctx = fakeQueryCtx({
      commands: [
        row("command-act", {
          input: "I ask Mira what she hears.",
          turnId: "turn-success",
        }),
      ],
      narrations: [
        row("narration-seed", { text: "Rain lashes the chapel.", source: "seed" }),
        row("narration-story", {
          text: "The altar candle burns blue before anyone touches it.",
          source: "player",
        }),
        row("narration-success", {
          text: "Mira listens to the rain.",
          source: "llm",
          turnId: "turn-success",
        }),
      ],
    });

    const transcript = await loadTranscript(ctx, "adventure-1" as never, 20);

    expect(transcript.map((entry) => ({ id: entry.id, kind: entry.kind, source: entry.source }))).toEqual([
      { id: "command:command-act", kind: "player", source: "player" },
      { id: "narration:narration-story", kind: "story", source: "player" },
      { id: "narration:narration-success", kind: "director", source: "llm" },
    ]);
  });
});

function row(_id: string, values: Record<string, unknown>) {
  return {
    _id,
    _creationTime: nextCreationTime(),
    adventureId: "adventure-1",
    worldId: "world-1",
    ...values,
  };
}

let creationTime = 0;
function nextCreationTime() {
  creationTime += 1;
  return creationTime;
}

function fakeQueryCtx(tables: Record<string, Array<Record<string, unknown>>>) {
  return {
    db: {
      query(table: string) {
        let rows = [...(tables[table] ?? [])];
        return {
          withIndex(_indexName: string, build?: (query: FakeIndexQuery) => FakeIndexQuery) {
            const filters = build?.(new FakeIndexQuery()).filters ?? [];
            rows = rows.filter((row) =>
              filters.every(({ field, value }) => row[field] === value),
            );
            return this;
          },
          order(direction: "asc" | "desc") {
            rows = rows.sort((left, right) =>
              direction === "desc"
                ? Number(right._creationTime) - Number(left._creationTime)
                : Number(left._creationTime) - Number(right._creationTime),
            );
            return this;
          },
          async take(limit: number) {
            return rows.slice(0, limit);
          },
        };
      },
      async get(id: string) {
        return Object.values(tables)
          .flat()
          .find((record) => record._id === id) ?? null;
      },
    },
  } as unknown as QueryCtx;
}

class FakeIndexQuery {
  filters: Array<{ field: string; value: unknown }> = [];

  eq(field: string, value: unknown) {
    this.filters.push({ field, value });
    return this;
  }
}
