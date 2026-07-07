import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../../../convex/_generated/api";

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

vi.mock("server-only", () => ({}));

vi.mock("@/lib/director/debug-log", () => ({
  writeDirectorDebugLog: mocks.writeDirectorDebugLog,
}));

import { POST } from "./route";
import { readDirectorTurnBody } from "@/server/director/turn-request";

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

  it("returns a structured 400 for malformed Adventure ids before requiring LLM config", async () => {
    mocks.query.mockRejectedValueOnce(
      new Error('ArgumentValidationError: Value does not match validator for field "adventureId"'),
    );

    const response = await POST(turnRequest({ adventureId: "not-a-convex-id" }));

    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "The selected Adventure id is invalid. Seed or reload the Adventure and try again.",
    });
    expect(response.status).toBe(400);
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.mutation).not.toHaveBeenCalled();
  });

  it("returns setup failure without mutation when config is missing after world context loads", async () => {
    mocks.query.mockResolvedValueOnce({});

    const response = await POST(turnRequest({ adventureId: "valid-adventure-id" }));

    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Configure LLM_BASE_URL, LLM_API_KEY, LLM_MODEL before sending Game Master turns.",
    });
    expect(response.status).toBe(503);
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.mutation).not.toHaveBeenCalled();
  });

  it("returns setup failure before context load when remote Convex lacks a server write token", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://lorecraft.example.convex.cloud";
    delete process.env.LORECRAFT_SERVER_WRITE_TOKEN;

    const response = await POST(turnRequest({ adventureId: "valid-adventure-id" }));

    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "LORECRAFT_SERVER_WRITE_TOKEN is required when Game Master turns use a remote Convex deployment.",
    });
    expect(response.status).toBe(503);
    expect(mocks.query).not.toHaveBeenCalled();
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

    const response = await POST(turnRequest({ adventureId: "valid-adventure-id" }));

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

  it("records a successful Pass turn without a command id", async () => {
    configureLlmEnv();
    mocks.query.mockResolvedValueOnce(persistentContext());
    mocks.mutation
      .mockResolvedValueOnce({ ok: true, turnId: "turn-pass-1", sequenceNumber: 1 })
      .mockResolvedValue(undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(providerResponse("Rain thickens against the chapel shutters."))
      .mockResolvedValueOnce(providerResponse(JSON.stringify({ npcUpdates: [], actorMoves: [] })));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      turnRequest({ adventureId: "valid-adventure-id", trigger: "pass" }),
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      narration: "Rain thickens against the chapel shutters.",
      acceptedUpdates: [],
      ignoredUpdates: [],
    });
    expect(response.status).toBe(200);
    expect(mocks.mutation).toHaveBeenNthCalledWith(
      1,
      api.world.recordPassTurn,
      expect.objectContaining({ adventureId: "valid-adventure-id" }),
    );
    expect(mocks.mutation).toHaveBeenNthCalledWith(
      2,
      api.world.completeDirectorTurn,
      expect.not.objectContaining({ commandId: expect.anything() }),
    );
    expect(mocks.mutation).toHaveBeenNthCalledWith(
      3,
      api.world.recordNpcStateExtraction,
      expect.objectContaining({
        requestSummary: expect.objectContaining({ turnTrigger: "pass" }),
      }),
    );
  });

  it("parses Guide request bodies with hidden guidance and no player input", async () => {
    await expect(
      readDirectorTurnBody(
        turnRequest({
          adventureId: "valid-adventure-id",
          trigger: "guide",
          guidance: "  Make Mira reveal the bell clue without quoting this instruction.  ",
        }),
      ),
    ).resolves.toEqual({
      ok: true,
      body: {
        adventureId: "valid-adventure-id",
        input: null,
        turnTrigger: "guide",
        guideGuidance: "Make Mira reveal the bell clue without quoting this instruction.",
        promptGuidance: undefined,
      },
    });
  });

  it("rejects Guide request bodies without non-empty guidance", async () => {
    await expect(
      readDirectorTurnBody(
        turnRequest({ adventureId: "valid-adventure-id", trigger: "guide", guidance: "   " }),
      ),
    ).resolves.toEqual({
      ok: false,
      error: "Guide guidance is required.",
    });
  });

  it("records a successful Guide turn without command or visible raw guidance", async () => {
    configureLlmEnv();
    mocks.query.mockResolvedValueOnce(persistentContext());
    mocks.mutation
      .mockResolvedValueOnce({ ok: true, turnId: "turn-guide-1", sequenceNumber: 1 })
      .mockResolvedValue(undefined);
    const requestBodies: Array<{ messages: Array<{ content: string }> }> = [];
    const fetchMock = vi.fn().mockImplementation(async (_input, init) => {
      requestBodies.push(JSON.parse(String(init?.body)));
      return requestBodies.length === 1
        ? providerResponse("Mira lowers her voice and names the midnight bell.")
        : providerResponse(JSON.stringify({ npcUpdates: [], actorMoves: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const guidance = "Make Mira reveal the bell clue without exposing this guidance.";
    const response = await POST(
      turnRequest({
        adventureId: "valid-adventure-id",
        trigger: "guide",
        guidance,
      }),
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      narration: "Mira lowers her voice and names the midnight bell.",
      acceptedUpdates: [],
      ignoredUpdates: [],
    });
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const mutationCalls = mocks.mutation.mock.calls;
    expect(mutationCalls).toHaveLength(3);
    expect(mutationCalls[0]?.[1]).toEqual(
      expect.objectContaining({
        adventureId: "valid-adventure-id",
        guidance,
      }),
    );
    expect(mutationCalls[1]?.[1]).toEqual(
      expect.objectContaining({
        turnId: "turn-guide-1",
        requestSummary: expect.objectContaining({
          turnTrigger: "guide",
          guideGuidanceLength: guidance.length,
          requiredSceneBeat: expect.objectContaining({ kind: "guide" }),
        }),
      }),
    );
    expect(mutationCalls[1]?.[1]).not.toEqual(
      expect.objectContaining({ commandId: expect.anything() }),
    );
    expect(mutationCalls[2]?.[1]).toEqual(
      expect.objectContaining({
        requestSummary: expect.objectContaining({
          turnTrigger: "guide",
          requiredSceneBeat: expect.objectContaining({ kind: "guide" }),
        }),
      }),
    );
    expect(requestBodies[0]?.messages.at(-1)?.content).toContain("[Hidden Guide]");
    expect(requestBodies[0]?.messages.at(-1)?.content).toContain(guidance);
    expect(requestBodies[1]?.messages.at(-1)?.content).toContain("[Hidden Guide omitted");
    expect(requestBodies[1]?.messages.at(-1)?.content).not.toContain(guidance);
  });

  it("rejects Guide turns in transcript mode before creating a turn", async () => {
    process.env.LORECRAFT_DIRECTOR_MODE = "transcript";
    configureLlmEnv();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      turnRequest({
        adventureId: "valid-adventure-id",
        trigger: "guide",
        guidance: "Steer the next narration privately.",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Guide turns are not supported in transcript mode.",
    });
    expect(response.status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.mutation).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("persists a failed Pass turn without fake command or narration", async () => {
    configureLlmEnv();
    mocks.query.mockResolvedValueOnce(persistentContext());
    mocks.mutation
      .mockResolvedValueOnce({ ok: true, turnId: "turn-pass-1", sequenceNumber: 1 })
      .mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("model down", { status: 503 })));

    const response = await POST(
      turnRequest({ adventureId: "valid-adventure-id", trigger: "pass" }),
    );

    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "LLM provider returned HTTP 503.",
    });
    expect(response.status).toBe(502);
    expect(mocks.mutation).toHaveBeenNthCalledWith(
      2,
      api.world.completeDirectorTurn,
      expect.objectContaining({
        turnId: "turn-pass-1",
        status: "provider_error",
      }),
    );
    expect(mocks.mutation).toHaveBeenNthCalledWith(
      2,
      api.world.completeDirectorTurn,
      expect.not.objectContaining({ commandId: expect.anything(), narration: expect.anything() }),
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

    const response = await POST(turnRequest({ adventureId: "valid-adventure-id" }));

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

    const response = await POST(turnRequest({ adventureId: "valid-adventure-id" }));

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

function turnRequest({
  adventureId,
  trigger = "act",
  guidance,
}: {
  adventureId: string;
  trigger?: "act" | "pass" | "guide";
  guidance?: string;
}) {
  return new Request("http://localhost/api/director/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adventureId,
      trigger,
      ...(trigger === "act" ? { input: "I ask Mira about the storm." } : {}),
      ...(trigger === "guide" ? { guidance } : {}),
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
    adventure: {
      id: "adventure-1",
      name: "Stormbound Chapel",
      worldId: "world-1",
      worldVersionId: "world-version-1",
    },
    world: {
      id: "world-1",
      name: "Stormbound Chapel",
      description: "A chapel under a dangerous storm.",
    },
    sourceWorldVersion: {
      id: "world-version-1",
      versionNumber: 1,
      name: "Stormbound Chapel",
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
