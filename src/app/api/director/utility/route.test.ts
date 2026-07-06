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

vi.mock("server-only", () => ({}));

vi.mock("@/lib/director/debug-log", () => ({
  writeDirectorDebugLog: mocks.writeDirectorDebugLog,
}));

import { POST } from "./route";

const originalEnv = { ...process.env };

describe("Director utility route", () => {
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
    mocks.mutation.mockResolvedValue({ ok: true, utilityMessageId: "utility-1" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("persists /help without loading context or requiring LLM config", async () => {
    const response = await POST(utilityRequest("/help"));

    await expect(response.json()).resolves.toEqual({
      ok: true,
      command: "help",
      message: [
        "Available commands:",
        "/help - Show supported slash commands.",
        "/look - Inspect what you can currently observe.",
        "/look <target> - Inspect a visible person, place, or object.",
      ].join("\n"),
    });
    expect(response.status).toBe(200);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.mutation).toHaveBeenCalledTimes(1);
    expect(mocks.mutation.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        adventureId: "valid-adventure-id",
        command: "help",
        source: "engine",
        status: "success",
      }),
    );
  });

  it("persists unsupported commands as utility errors without creating turns", async () => {
    const response = await POST(utilityRequest("/dance"));

    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "/dance is not supported yet. Try /help or /look.",
    });
    expect(response.status).toBe(200);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.mutation.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        command: "dance",
        status: "error",
      }),
    );
  });

  it("returns unknown /look targets without calling the provider", async () => {
    mocks.query.mockResolvedValueOnce(persistentContext());
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(utilityRequest("/look moonblade"));

    await expect(response.json()).resolves.toEqual({
      ok: true,
      command: "look",
      message: 'You do not see "moonblade" here to inspect.',
    });
    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.mutation.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        command: "look",
        target: "moonblade",
        source: "engine",
        status: "error",
      }),
    );
  });

  it("calls the provider for visible /look targets and records a utility message", async () => {
    configureLlmEnv();
    mocks.query.mockResolvedValueOnce(persistentContext());
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(providerResponse("Mira is watching the chapel doors closely."));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(utilityRequest("/look Mira"));

    await expect(response.json()).resolves.toEqual({
      ok: true,
      command: "look",
      message: "Mira is watching the chapel doors closely.",
    });
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.mutation.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        command: "look",
        target: "Mira",
        text: "Mira is watching the chapel doors closely.",
        source: "llm",
        status: "success",
        provider: "llm.test",
        model: "test-model",
      }),
    );
    expect(mocks.mutation).toHaveBeenCalledTimes(1);
  });
});

function utilityRequest(input: string) {
  return new Request("http://localhost/api/director/utility", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adventureId: "valid-adventure-id",
      input,
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
    exits: [{ label: "west", toRoomName: "Vestry" }],
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
          { key: "knowledge", value: "Mira knows a hidden fact.", source: "seed" },
        ],
      },
    ],
    objects: [
      {
        key: "lantern",
        name: "Lantern",
        description: "A cracked lantern with a low flame.",
      },
    ],
    locationCard: {
      id: "room-chapel",
      key: "chapel",
      name: "Chapel",
      description: "Rain taps against warped shutters.",
      facts: [],
      visibleObjects: [
        {
          key: "lantern",
          name: "Lantern",
          description: "A cracked lantern with a low flame.",
        },
      ],
      visibleExits: [{ label: "west", toLocationKey: "vestry", toLocationName: "Vestry" }],
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
    storyVisibleHistory: [
      {
        id: "narration-1",
        kind: "director",
        text: "Mira glances toward the warped shutters.",
        source: "llm",
        createdAt: 1,
      },
    ],
  };
}
