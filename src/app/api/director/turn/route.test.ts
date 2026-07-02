import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  mutation: vi.fn(),
  writeDirectorDebugLog: vi.fn(),
}));

vi.mock("convex/browser", () => ({
  ConvexHttpClient: vi.fn(function ConvexHttpClient() {
    return {
      query: mocks.query,
      mutation: mocks.mutation,
    };
  }),
}));

vi.mock("@/lib/director/debug-log", () => ({
  writeDirectorDebugLog: mocks.writeDirectorDebugLog,
}));

import { POST } from "./route";

const originalEnv = { ...process.env };

describe("Game Master turn route preflight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      LORECRAFT_ALLOW_REMOTE_DIRECTOR: "1",
      NEXT_PUBLIC_CONVEX_URL: "http://127.0.0.1:3210",
    };
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_MODEL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("returns a structured 400 for malformed world ids before requiring LLM config", async () => {
    mocks.query.mockRejectedValueOnce(
      new Error('ArgumentValidationError: Value does not match validator for field "worldId"'),
    );

    const response = await POST(turnRequest({ worldId: "not-a-convex-id" }));

    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "The selected world id is invalid. Seed or reload the world and try again.",
    });
    expect(response.status).toBe(400);
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.mutation).not.toHaveBeenCalled();
  });

  it("returns setup failure without mutation when config is missing after world context loads", async () => {
    mocks.query.mockResolvedValueOnce({});

    const response = await POST(turnRequest({ worldId: "valid-world-id" }));

    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Configure LLM_BASE_URL, LLM_API_KEY, LLM_MODEL before sending Game Master turns.",
    });
    expect(response.status).toBe(503);
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.mutation).not.toHaveBeenCalled();
  });

  it("records successful no-update extraction without mutating state", async () => {
    configureLlmEnv();
    mocks.query.mockResolvedValueOnce(persistentContext());
    mocks.mutation
      .mockResolvedValueOnce({ ok: true, turnId: "turn-1", commandId: "command-1" })
      .mockResolvedValue(undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(providerResponse("Mira watches the rain but says nothing new."))
      .mockResolvedValueOnce(providerResponse(JSON.stringify({ npcUpdates: [], actorMoves: [] })));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(turnRequest({ worldId: "valid-world-id" }));

    await expect(response.json()).resolves.toEqual({
      ok: true,
      narration: "Mira watches the rain but says nothing new.",
      acceptedUpdates: [],
      ignoredUpdates: [],
    });
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mocks.mutation).toHaveBeenCalledTimes(3);
    expect(mocks.mutation).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      expect.objectContaining({
        status: "success",
        acceptedUpdates: [],
        ignoredUpdates: [],
        acceptedMoves: [],
        ignoredMoves: [],
      }),
    );
  });

  it("records invalid extraction output while preserving the successful narration", async () => {
    configureLlmEnv();
    mocks.query.mockResolvedValueOnce(persistentContext());
    mocks.mutation
      .mockResolvedValueOnce({ ok: true, turnId: "turn-1", commandId: "command-1" })
      .mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(providerResponse("Mira gives a careful answer."))
        .mockResolvedValueOnce(providerResponse("This is not JSON.")),
    );

    const response = await POST(turnRequest({ worldId: "valid-world-id" }));

    await expect(response.json()).resolves.toEqual({
      ok: true,
      narration: "Mira gives a careful answer.",
      acceptedUpdates: [],
      ignoredUpdates: [],
    });
    expect(response.status).toBe(200);
    expect(mocks.mutation).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      expect.objectContaining({
        status: "invalid_output",
        acceptedUpdates: [],
        ignoredUpdates: [],
        error: "NPC state extractor response was not valid JSON.",
      }),
    );
  });

  it("records extraction provider failure while preserving the successful narration", async () => {
    configureLlmEnv();
    mocks.query.mockResolvedValueOnce(persistentContext());
    mocks.mutation
      .mockResolvedValueOnce({ ok: true, turnId: "turn-1", commandId: "command-1" })
      .mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(providerResponse("Mira lowers her voice."))
        .mockResolvedValueOnce(new Response("model overloaded", { status: 503 })),
    );

    const response = await POST(turnRequest({ worldId: "valid-world-id" }));

    await expect(response.json()).resolves.toEqual({
      ok: true,
      narration: "Mira lowers her voice.",
      acceptedUpdates: [],
      ignoredUpdates: [],
    });
    expect(response.status).toBe(200);
    expect(mocks.mutation).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      expect.objectContaining({
        status: "provider_error",
        acceptedUpdates: [],
        ignoredUpdates: [],
        error: "LLM provider returned HTTP 503.",
      }),
    );
  });
});

function turnRequest({ worldId }: { worldId: string }) {
  return new Request("http://localhost/api/director/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      worldId,
      input: "I ask Mira about the storm.",
    }),
  });
}

function configureLlmEnv() {
  process.env.LLM_BASE_URL = "http://llm.test/v1";
  process.env.LLM_API_KEY = "test-key";
  process.env.LLM_MODEL = "test-model";
}

function providerResponse(content: string) {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: { content },
        },
      ],
    }),
    { status: 200 },
  );
}

function persistentContext() {
  return {
    world: {
      id: "world-1",
      name: "Stormbound Chapel",
      description: "A chapel under a dangerous storm.",
    },
    player: {
      id: "actor-player",
      key: "taylor",
      name: "Taylor",
    },
    room: {
      id: "room-chapel",
      key: "chapel",
      name: "Chapel",
      description: "Rain taps against warped shutters.",
    },
    exits: [],
    actors: [
      {
        id: "actor-player",
        key: "taylor",
        name: "Taylor",
        role: "player",
        description: "The playtester.",
        facts: [],
      },
      {
        id: "actor-mira",
        key: "mira",
        name: "Mira",
        role: "npc",
        description: "A careful local with rain-dark hair.",
        facts: [
          { key: "mood", value: "watchful", source: "seed" },
          { key: "status", value: "waiting near the chapel aisle", source: "seed" },
          {
            key: "memory",
            value: "Mira has not yet formed meaningful memories of Taylor.",
            source: "seed",
          },
        ],
      },
    ],
    objects: [],
    locationCard: {
      id: "room-chapel",
      key: "chapel",
      name: "Chapel",
      description: "Rain taps against warped shutters.",
      facts: [],
      visibleObjects: [],
      visibleExits: [],
      presentActors: [
        { key: "taylor", name: "Taylor", role: "player" },
        { key: "mira", name: "Mira", role: "npc" },
      ],
    },
    knownLocations: [
      {
        id: "room-chapel",
        key: "chapel",
        name: "Chapel",
        description: "Rain taps against warped shutters.",
      },
    ],
    recentFeed: [],
  };
}
