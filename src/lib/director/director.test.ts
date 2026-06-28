import { describe, expect, it } from "vitest";
import { buildDirectorRequest } from "./prompt";
import { parseDirectorOutput, validateNpcUpdates } from "./output";
import { readLlmConfig, requestOpenAICompatibleChat } from "./provider";
import type { DirectorActor, DirectorContext } from "./types";

const mira: DirectorActor = {
  key: "mira",
  name: "Mira",
  role: "npc",
  description: "A careful local who watches the storm.",
  facts: [
    { key: "mood", value: "watchful", source: "seed" },
    { key: "status", value: "waiting near the chapel aisle", source: "seed" },
    {
      key: "memory",
      value: "Mira has not yet formed any meaningful memories of Taylor.",
      source: "seed",
    },
  ],
};

const context: DirectorContext = {
  world: {
    id: "world-id",
    name: "Stormbound Chapel",
    description: "A chapel in a storm.",
  },
  player: {
    id: "player-id",
    key: "taylor",
    name: "Taylor",
  },
  room: {
    id: "room-id",
    key: "chapel",
    name: "Chapel",
    description: "Rain taps against warped shutters.",
  },
  exits: [{ label: "north", toRoomName: "Graveyard" }],
  actors: [
    {
      key: "taylor",
      name: "Taylor",
      role: "player",
      description: "The playtester.",
      facts: [],
    },
    mira,
  ],
  objects: [{ key: "lantern", name: "Lantern", description: "A cracked lantern." }],
  recentFeed: Array.from({ length: 15 }, (_, index) => ({
    id: `entry-${index}`,
    kind: index % 2 === 0 ? ("player" as const) : ("director" as const),
    text: `feed entry ${index}`,
    source: index % 2 === 0 ? "player" : "llm",
    createdAt: index,
  })),
};

describe("Director request construction", () => {
  it("builds a bounded stateless request from current scene context", () => {
    const request = buildDirectorRequest(context, "I ask Mira about the storm.");
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.messages).toHaveLength(2);
    expect(request.requestSummary).toMatchObject({
      worldName: "Stormbound Chapel",
      roomKey: "chapel",
      recentFeedCount: 12,
      actorKeys: ["taylor", "mira"],
      npcFactKeys: ["mood", "status", "memory"],
    });
    expect(userMessage?.content).toContain("I ask Mira about the storm.");
    expect(userMessage?.content).toContain("feed entry 14");
    expect(userMessage?.content).not.toContain("feed entry 0");
  });
});

describe("Director output parsing", () => {
  it("accepts strict JSON with narration and optional NPC updates", () => {
    const result = parseDirectorOutput(
      JSON.stringify({
        narration: "Mira looks toward the shutters before answering.",
        npcUpdates: [
          {
            actorKey: "mira",
            reason: "Taylor directly asked Mira about the storm.",
            changes: { mood: "concerned" },
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.narration).toBe("Mira looks toward the shutters before answering.");
      expect(result.output.npcUpdates).toHaveLength(1);
    }
  });

  it("rejects malformed JSON without inventing narration", () => {
    const result = parseDirectorOutput("Mira answers in prose.");

    expect(result).toEqual({
      ok: false,
      error: "Director response was not valid JSON.",
    });
  });
});

describe("NPC update validation", () => {
  it("partially accepts valid fields and records ignored fields", () => {
    const validation = validateNpcUpdates(
      [
        {
          actorKey: "mira",
          reason: "Taylor reassured Mira.",
          changes: {
            mood: "less guarded",
            hitPoints: 8,
            status: "standing beside Taylor",
          },
        },
      ],
      context.actors,
    );

    expect(validation.acceptedUpdates).toEqual([
      {
        actorKey: "mira",
        actorName: "Mira",
        reason: "Taylor reassured Mira.",
        changes: [
          { key: "mood", value: "less guarded" },
          { key: "status", value: "standing beside Taylor" },
        ],
      },
    ]);
    expect(validation.ignoredUpdates).toMatchObject([
      {
        actorKey: "mira",
        field: "hitPoints",
        reason: "NPC update field is not allowed.",
      },
    ]);
  });

  it("ignores unknown or offscreen NPC updates", () => {
    const validation = validateNpcUpdates(
      [
        {
          actorKey: "osric",
          reason: "The Director tried to update someone offscreen.",
          changes: { mood: "curious" },
        },
      ],
      context.actors,
    );

    expect(validation.acceptedUpdates).toEqual([]);
    expect(validation.ignoredUpdates).toEqual([
      {
        actorKey: "osric",
        reason: "NPC update actor is unknown or not in the current scene.",
      },
    ]);
  });

  it("caps durable NPC memory at 500 characters", () => {
    const longMemory = "x".repeat(520);
    const validation = validateNpcUpdates(
      [
        {
          actorKey: "mira",
          reason: "Taylor shared a durable secret.",
          changes: { memory: longMemory },
        },
      ],
      context.actors,
    );

    expect(validation.acceptedUpdates[0]?.changes[0]).toEqual({
      key: "memory",
      value: "x".repeat(500),
    });
    expect(validation.ignoredUpdates).toMatchObject([
      {
        actorKey: "mira",
        field: "memory",
        reason: "NPC memory exceeded 500 characters and was truncated.",
      },
    ]);
  });
});

describe("OpenAI-compatible provider boundary", () => {
  it("reports missing config without choosing a provider", () => {
    const config = readLlmConfig({});

    expect(config).toEqual({
      ok: false,
      error: "Configure LLM_BASE_URL, LLM_API_KEY, LLM_MODEL before sending Director turns.",
    });
  });

  it("extracts the assistant message from an OpenAI-compatible response", async () => {
    const content = await requestOpenAICompatibleChat({
      config: {
        baseUrl: "http://localhost:11434/v1",
        apiKey: "ollama",
        model: "local-model",
      },
      messages: [{ role: "user", content: "hello" }],
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"narration":"Hello."}' } }],
          }),
          { status: 200 },
        ),
    });

    expect(content).toBe('{"narration":"Hello."}');
  });
});
