import { describe, expect, it, vi } from "vitest";
import {
  DELETE as deleteNpcOverrides,
  GET as getNpcOverrides,
  POST as postNpcOverride,
} from "../../app/api/debug/npc-overrides/route";
import { buildDirectorDebugLogRecord, writeDirectorDebugLog } from "./debug-log";
import { readDirectorMode } from "./mode";
import { validateNarrativeInput } from "./input";
import {
  clearNpcDebugOverride,
  clearNpcDebugOverrides,
  getNpcDebugOverrides,
  setNpcDebugOverride,
} from "./npc-debug-overrides";
import { applyNpcDebugOverrides } from "./npc-profiles";
import {
  buildDirectorRequest,
  buildTranscriptDirectorRequest,
  deriveRequiredSceneBeat,
} from "./prompt";
import { rawDirectorRequestForStorage, shouldStoreRawDirectorRequest } from "./raw-request";
import {
  applySceneBeatPersistenceBoundary,
  parseDirectorOutput,
  parsePlainProseDirectorOutput,
  validateNpcUpdates,
} from "./output";
import { readLlmConfig, requestOpenAICompatibleChat } from "./provider";
import { normalizeWorldLoadError } from "./turn-errors";
import type { DirectorActor, DirectorContext, TranscriptDirectorContext } from "./types";

const mira: DirectorActor = {
  key: "mira",
  name: "Mira",
  role: "npc",
  description:
    "A local woman in practical rain-dark clothes, with damp dark hair and watchful eyes.",
  facts: [
    {
      key: "background",
      value:
        "Mira grew up around Stormbound Chapel and learned its routines from older caretakers.",
      source: "seed",
    },
    {
      key: "persona",
      value: "Cautious, observant, and slow to trust.",
      source: "seed",
    },
    {
      key: "voice",
      value: "Plain-spoken and restrained, with short practical warnings.",
      source: "seed",
    },
    { key: "mood", value: "watchful", source: "seed" },
    {
      key: "status",
      value: "standing near the chapel aisle, tense from the storm",
      source: "seed",
    },
    {
      key: "memory",
      value: "Mira has not yet formed meaningful memories of Taylor.",
      source: "seed",
    },
    {
      key: "knowledge",
      value:
        "Mira knows the storm began after the chapel bell rang at midnight, but she is afraid to say that plainly.",
      source: "seed",
    },
  ],
};

const brotherAlden: DirectorActor = {
  key: "brother-alden",
  name: "Brother Alden",
  role: "npc",
  description:
    "A small, middle-aged priest in a patched black cassock, with ink-stained fingers and a careful stoop.",
  facts: [
    {
      key: "background",
      value: "Brother Alden has tended Stormbound Chapel for years.",
      source: "seed",
    },
    {
      key: "persona",
      value: "Gentle, nervous, and dutiful.",
      source: "seed",
    },
    {
      key: "voice",
      value: "Soft and formal, with small apologies and careful religious phrasing.",
      source: "seed",
    },
    { key: "mood", value: "uneasy", source: "seed" },
    {
      key: "status",
      value: "standing near the altar with a damp ledger tucked under one arm",
      source: "seed",
    },
    {
      key: "memory",
      value: "Brother Alden has not yet formed meaningful memories of Taylor.",
      source: "seed",
    },
    {
      key: "knowledge",
      value:
        "Alden found a torn bell-rope fiber near the altar after midnight, but he has not told Mira.",
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
    turnId: `turn-${index}`,
    commandId: `command-${index}`,
  })),
};

const transcriptContext: TranscriptDirectorContext = {
  world: {
    id: "world-id",
    name: "Stormbound Chapel",
    description: "A chapel in a storm.",
  },
  initialSeed:
    "Stormbound Chapel: A chapel in a storm.\nOpening scene: Rain taps against warped shutters. Mira waits near the aisle.",
  transcript: [
    {
      id: "command-1",
      kind: "player",
      text: "I leave the chapel and walk for days.",
      source: "player",
      createdAt: 1,
    },
    {
      id: "narration-1",
      kind: "director",
      text: "You leave the chapel behind. Days later, the road opens into a gray valley.",
      source: "llm",
      createdAt: 2,
    },
  ],
};

const transcriptWithInvalidTurn: TranscriptDirectorContext = {
  ...transcriptContext,
  transcript: [
    ...transcriptContext.transcript,
    {
      id: "command-bad",
      kind: "player",
      text: "√",
      source: "player",
      createdAt: 3,
      turnId: "turn-bad",
      commandId: "command-bad",
    },
    {
      id: "narration-bad",
      kind: "director",
      text: "You walk into a deserted inn because the symbol was treated as a turn.",
      source: "llm",
      createdAt: 4,
      turnId: "turn-bad",
      commandId: "command-bad",
    },
    {
      id: "command-2",
      kind: "player",
      text: "You sit at the bar.",
      source: "player",
      createdAt: 5,
      turnId: "turn-2",
      commandId: "command-2",
    },
    {
      id: "narration-2",
      kind: "director",
      text: "The bartender leans close and asks what you want.",
      source: "llm",
      createdAt: 6,
      turnId: "turn-2",
      commandId: "command-2",
    },
  ],
};

function jsonRequest(method: string, url: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function expectJson(response: Response, expected: unknown) {
  expect(await response.json()).toEqual(expected);
}

describe("Director request construction", () => {
  it("builds a bounded plain-prose story request from compact prompt sections", () => {
    const request = buildDirectorRequest(context, "I ask Mira about the storm.", {
      generationSettings: {
        temperature: 0.4,
        maxTokens: 700,
        topP: 0.9,
        responseFormat: "json_object",
      },
      promptGuidance: {
        style: "  Write like a tense chapel scene.  ",
        npcBehavior: "Mira should answer direct questions with a concrete choice.",
        persistence: "Keep passing reactions out of durable facts.",
      },
    });
    const systemMessage = request.messages.find((message) => message.role === "system");
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.messages).toHaveLength(2);
    expect(request.requestSummary).toMatchObject({
      directorMode: "persistent",
      outputContract: "plain_prose",
      worldName: "Stormbound Chapel",
      roomKey: "chapel",
      recentFeedCount: 12,
      actorKeys: ["taylor", "mira"],
      npcFactKeys: ["mood", "status", "memory"],
      npcProfileKeys: ["mira"],
      readOnlyKnowledgeKeys: ["mira.knowledge"],
      requiredSceneBeat: {
        kind: "direct_npc_question",
        targetActorKey: "mira",
        expectsNpcResponse: true,
        allowsNpcUpdates: false,
      },
      npcMutationMode: "read_only",
      generationSettings: {
        temperature: 0.4,
        maxTokens: 700,
        topP: 0.9,
        responseFormat: "text",
      },
      promptGuidanceKeys: ["style", "npcBehavior", "persistence"],
    });
    expect(request.requestSummary.promptComponentKeys).toEqual([
      "aiInstructions",
      "world",
      "npcCards",
      "recentStory",
      "currentInput",
      "output",
    ]);
    expect(userMessage?.content).toContain("AI Instructions:");
    expect(userMessage?.content).toContain("World:");
    expect(userMessage?.content).toContain("NPC Cards:");
    expect(userMessage?.content).toContain("Recent Story:");
    expect(userMessage?.content).toContain("Current Input:");
    expect(userMessage?.content).toContain("Output:");
    expect(userMessage?.content).toContain("> I ask Mira about the storm.");
    expect(userMessage?.content).toContain("Style guidance: Write like a tense chapel scene.");
    expect(userMessage?.content).toContain(
      "NPC behavior guidance: Mira should answer direct questions with a concrete choice.",
    );
    expect(userMessage?.content).toContain(
      "Persistence guidance: Keep passing reactions out of durable facts.",
    );
    expect(userMessage?.content).toContain("Mira is being directly engaged");
    expect(userMessage?.content).toContain("NPC CARD: Mira (mira)");
    expect(userMessage?.content).toContain(
      "Description: A local woman in practical rain-dark clothes, with damp dark hair and watchful eyes.",
    );
    expect(userMessage?.content).toContain(
      "Private knowledge: Mira knows the storm began after the chapel bell rang at midnight",
    );
    expect(userMessage?.content).toContain("feed entry 14");
    expect(userMessage?.content).not.toContain("feed entry 0");
    expect(userMessage?.content).not.toContain("turn-14");
    expect(userMessage?.content).not.toContain("command-14");
    expect(userMessage?.content).not.toContain("outputShape");
    expect(userMessage?.content).not.toContain("promptComponents");
    expect(userMessage?.content).not.toContain("sourceOwnership");
    expect(userMessage?.content).not.toContain("npcProfiles");
    expect(userMessage?.content).not.toContain("hiddenNpcKnowledge");
    expect(userMessage?.content).not.toContain("mutableFacts");
    expect(userMessage?.content).not.toContain("Return JSON");
    expect(userMessage?.content.length).toBeLessThan(5000);
    expect(systemMessage?.content).toContain("Continue the scene in present tense");
    expect(systemMessage?.content).toContain("NPC cards are canonical");
    expect(systemMessage?.content).toContain("Return only player-facing story prose");
    expect(systemMessage?.content).not.toContain("strict JSON");
  });

  it("applies debug NPC overrides to persistent prompt context without changing transcript mode", () => {
    const overriddenContext = applyNpcDebugOverrides(context, {
      mira: {
        description: "A drenched archivist with silver spectacles and a storm-dark cloak.",
        facts: {
          mood: "deeply suspicious",
          occupation: "chapel archivist",
        },
      },
    });
    const request = buildDirectorRequest(overriddenContext, "I look at Mira.");
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary).toMatchObject({
      npcProfileKeys: ["mira"],
      npcOverrideKeys: ["mira.description", "mira.mood", "mira.occupation"],
    });
    expect(userMessage?.content).toContain(
      "Description: A drenched archivist with silver spectacles and a storm-dark cloak.",
    );
    expect(userMessage?.content).toContain("Mood: deeply suspicious");
    expect(userMessage?.content).toContain("occupation: chapel archivist");

    const transcriptRequest = buildTranscriptDirectorRequest(transcriptContext, "I look at Mira.");
    const transcriptUserMessage = transcriptRequest.messages.find((message) => message.role === "user");
    expect(transcriptUserMessage?.content).not.toContain("npcProfiles");
    expect(transcriptRequest.requestSummary.npcProfileKeys).toBeUndefined();
  });

  it("includes multiple current-scene NPCs as readable cards and targets the addressed NPC", () => {
    const multiNpcContext: DirectorContext = {
      ...context,
      actors: [...context.actors, brotherAlden],
    };

    const request = buildDirectorRequest(multiNpcContext, "I ask Brother Alden about the bell.");
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary).toMatchObject({
      actorKeys: ["taylor", "mira", "brother-alden"],
      npcProfileKeys: ["mira", "brother-alden"],
      readOnlyKnowledgeKeys: ["mira.knowledge", "brother-alden.knowledge"],
      requiredSceneBeat: {
        kind: "direct_npc_question",
        targetActorKey: "brother-alden",
        expectsNpcResponse: true,
      },
    });
    expect(userMessage?.content).toContain("NPC CARD: Mira (mira)");
    expect(userMessage?.content).toContain("NPC CARD: Brother Alden (brother-alden)");
    expect(userMessage?.content).toContain("Brother Alden is being directly engaged");
    expect(userMessage?.content).not.toContain("hiddenNpcKnowledge");
  });

  it("adds debug-only NPCs to persistent prompt context", () => {
    const request = buildDirectorRequest(
      applyNpcDebugOverrides(context, {
        "debug-npc-1": {
          name: "Ilyra",
          description: "A temporary scholar with ink-stained sleeves.",
          facts: {
            persona: "Curious and direct.",
            voice: "Precise, clipped, and impatient.",
            status: "standing beside the chapel pews",
          },
        },
      }),
      "I ask Ilyra what she noticed.",
    );
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary).toMatchObject({
      actorKeys: ["taylor", "mira", "debug-npc-1"],
      npcProfileKeys: ["mira", "debug-npc-1"],
      npcOverrideKeys: expect.arrayContaining([
        "debug-npc-1.name",
        "debug-npc-1.description",
        "debug-npc-1.persona",
        "debug-npc-1.status",
        "debug-npc-1.voice",
      ]),
    });
    expect(userMessage?.content).toContain("NPC CARD: Ilyra (debug-npc-1)");
    expect(userMessage?.content).toContain(
      "Description: A temporary scholar with ink-stained sleeves.",
    );
    expect(userMessage?.content).toContain("Personality: Curious and direct.");
    expect(userMessage?.content).toContain("Current status: standing beside the chapel pews");
  });

  it("builds a transcript-only plain-prose request from seed and transcript", () => {
    const request = buildTranscriptDirectorRequest(transcriptContext, "What do I see now?", {
      generationSettings: {
        temperature: 0.7,
        responseFormat: "text",
      },
    });
    const systemMessage = request.messages.find((message) => message.role === "system");
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary).toMatchObject({
      directorMode: "transcript",
      outputContract: "plain_prose",
      roomKey: "transcript",
      actorKeys: [],
      npcFactKeys: [],
      readOnlyKnowledgeKeys: [],
      recentFeedCount: 2,
      generationSettings: {
        temperature: 0.7,
        responseFormat: "text",
      },
    });
    expect(systemMessage?.content).toContain("Do not return JSON");
    expect(systemMessage?.content).toContain("Recent story is the live continuity");
    expect(systemMessage?.content).toContain("Resolve the current player input first");
    expect(systemMessage?.content).toContain("include that character's answer, refusal, action");
    expect(systemMessage?.content).toContain("plain prose only");
    expect(systemMessage?.content).not.toContain("strict JSON");
    expect(systemMessage?.content).not.toContain("Return exactly this top-level shape");
    expect(request.requestSummary.promptComponentKeys).toEqual([
      "aiInstructions",
      "worldSeed",
      "recentStory",
      "currentInput",
    ]);
    expect(userMessage?.content).toContain("AI Instructions:");
    expect(userMessage?.content).toContain("World Seed:");
    expect(userMessage?.content).toContain("Recent Story:");
    expect(userMessage?.content).toContain("Current Input:");
    expect(userMessage?.content).toContain("> What do I see now?");
    expect(userMessage?.content).toContain("Mira waits near the aisle");
    expect(userMessage?.content).toContain("gray valley");
    expect(userMessage?.content).not.toContain("sceneState");
    expect(userMessage?.content).not.toContain("visibleFacts");
    expect(userMessage?.content).not.toContain("hiddenNpcKnowledge");
    expect(userMessage?.content).not.toContain("requiredSceneBeat");
    expect(userMessage?.content).not.toContain("currentTurn");
    expect(userMessage?.content).not.toContain("immediateContext");
    expect(userMessage?.content).not.toContain("sourceOwnership");
    expect(userMessage?.content).not.toContain("promptComponents");
    expect(userMessage?.content.length).toBeLessThan(2500);
  });

  it("reports transcript prompt guidance only when it is rendered as its own section", () => {
    const request = buildTranscriptDirectorRequest(transcriptContext, "What do I see now?", {
      promptGuidance: {
        style: "Keep the chapel scene spare and tense.",
        npcBehavior: "NPCs should answer direct questions with specific intent.",
      },
    });
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary.promptComponentKeys).toEqual([
      "aiInstructions",
      "promptGuidance",
      "worldSeed",
      "recentStory",
      "currentInput",
    ]);
    expect(request.requestSummary.promptGuidanceKeys).toEqual(["style", "npcBehavior"]);
    expect(userMessage?.content).toContain("Prompt Guidance:");
    expect(userMessage?.content).toContain("Style guidance: Keep the chapel scene spare and tense.");
    expect(userMessage?.content).toContain(
      "NPC behavior guidance: NPCs should answer direct questions with specific intent.",
    );
  });

  it("highlights immediate transcript context and omits invalid historical turns", () => {
    const request = buildTranscriptDirectorRequest(
      transcriptWithInvalidTurn,
      '"Just some ale please"',
    );
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary.recentFeedCount).toBe(4);
    expect(userMessage?.content).toContain('> "Just some ale please"');
    expect(userMessage?.content).toContain(
      "Treat Current Input as something the player says",
    );
    expect(userMessage?.content).toContain(
      "include that character's response",
    );
    expect(userMessage?.content).toContain("I leave the chapel and walk for days.");
    expect(userMessage?.content).toContain(
      "You leave the chapel behind. Days later, the road opens into a gray valley.",
    );
    expect(userMessage?.content).toContain("You sit at the bar.");
    expect(userMessage?.content).toContain("The bartender leans close and asks what you want.");
    expect(userMessage?.content).not.toContain("√");
    expect(userMessage?.content).not.toContain("symbol was treated as a turn");
    expect(userMessage?.content).not.toContain("immediateContext");
    expect(userMessage?.content).not.toContain("promptComponents");
  });

  it("derives a direct NPC question scene beat without forcing dialogue for plain actions", () => {
    expect(deriveRequiredSceneBeat(context, "I ask Mira what she knows about the storm.")).toMatchObject({
      kind: "direct_npc_question",
      targetActorKey: "mira",
      expectsNpcResponse: true,
      allowsNpcUpdates: true,
    });
    expect(deriveRequiredSceneBeat(context, '"When was the last time we saw each other?"')).toMatchObject(
      {
        kind: "direct_npc_question",
        targetActorKey: "mira",
        expectsNpcResponse: true,
        allowsNpcUpdates: true,
      },
    );

    expect(deriveRequiredSceneBeat(context, "I jump.")).toMatchObject({
      kind: "trivial_player_action",
      expectsNpcResponse: false,
      allowsNpcUpdates: false,
    });
  });

  it("uses recent addressed NPC focus for ambiguous follow-up dialogue", () => {
    const garthContext = {
      ...applyNpcDebugOverrides(context, {
        "debug-npc-1": {
          name: "Garth",
          description: "A burly bartender with a limp and curled mustache.",
          facts: {
            persona: "Friendly and boisterous.",
            voice: "Speaks with dramatic flair.",
            status: "working behind the bar",
          },
        },
      }),
      recentFeed: [
        {
          id: "garth-greeting",
          kind: "player" as const,
          text: '"Well met Garth!"',
          source: "player",
          createdAt: 1,
        },
      ],
    };

    expect(deriveRequiredSceneBeat(garthContext, '"How have you been?"')).toMatchObject({
      kind: "direct_npc_question",
      targetActorKey: "debug-npc-1",
      targetActorName: "Garth",
      expectsNpcResponse: true,
    });
    expect(deriveRequiredSceneBeat(garthContext, '"Well met Garth!"')).toMatchObject({
      kind: "direct_npc_address",
      targetActorKey: "debug-npc-1",
      expectsNpcResponse: true,
    });
    expect(deriveRequiredSceneBeat(garthContext, "I look at Garth.")).toMatchObject({
      kind: "direct_npc_address",
      targetActorKey: "debug-npc-1",
      expectsNpcResponse: false,
    });
  });
});

describe("NPC debug override plumbing", () => {
  it("stores normalized NPC debug overrides in process memory", () => {
    const worldId = "test-world-store";
    clearNpcDebugOverrides(worldId);

    const stored = setNpcDebugOverride(worldId, " mira ", {
      name: "  Mira Brightfall  ",
      description: "  She has bright red hair.  ",
      facts: {
        " mood ": "  amused  ",
        empty: "   ",
      },
    });

    expect(stored).toEqual({
      mira: {
        name: "Mira Brightfall",
        description: "She has bright red hair.",
        facts: {
          mood: "amused",
        },
      },
    });
    expect(getNpcDebugOverrides(worldId)).toEqual(stored);

    expect(clearNpcDebugOverride(worldId, "mira")).toEqual({});
    expect(getNpcDebugOverrides(worldId)).toEqual({});
  });

  it("bounds NPC debug override storage in process memory", () => {
    for (let index = 0; index <= 20; index += 1) {
      setNpcDebugOverride(`test-world-bound-${index}`, "mira", {
        description: `description ${index}`,
      });
    }

    expect(getNpcDebugOverrides("test-world-bound-0")).toEqual({});
    expect(getNpcDebugOverrides("test-world-bound-20")).toEqual({
      mira: { description: "description 20" },
    });

    for (let index = 0; index <= 20; index += 1) {
      clearNpcDebugOverrides(`test-world-bound-${index}`);
    }

    const worldId = "test-world-actor-bound";
    clearNpcDebugOverrides(worldId);
    for (let index = 0; index <= 50; index += 1) {
      setNpcDebugOverride(worldId, `actor-${index}`, {
        description: `description ${index}`,
      });
    }

    const boundedOverrides = getNpcDebugOverrides(worldId);
    expect(Object.keys(boundedOverrides)).toHaveLength(50);
    expect(boundedOverrides["actor-0"]).toBeUndefined();
    expect(boundedOverrides["actor-50"]).toEqual({ description: "description 50" });
    clearNpcDebugOverrides(worldId);
  });

  it("exposes NPC debug overrides through GET, POST, and DELETE route handlers", async () => {
    const worldId = "test-world-route";
    clearNpcDebugOverrides(worldId);

    const postResponse = await postNpcOverride(
      jsonRequest("POST", "http://localhost/api/debug/npc-overrides", {
        worldId,
        actorKey: "mira",
        override: {
          description: "She has bright red hair.",
          facts: {
            mood: "curious",
          },
        },
      }),
    );
    expect(postResponse.status).toBe(200);
    await expectJson(postResponse, {
      ok: true,
      overrides: {
        mira: {
          description: "She has bright red hair.",
          facts: {
            mood: "curious",
          },
        },
      },
    });

    const getResponse = await getNpcOverrides(
      new Request(`http://localhost/api/debug/npc-overrides?worldId=${worldId}`),
    );
    expect(getResponse.status).toBe(200);
    await expectJson(getResponse, {
      ok: true,
      overrides: {
        mira: {
          description: "She has bright red hair.",
          facts: {
            mood: "curious",
          },
        },
      },
    });

    const deleteResponse = await deleteNpcOverrides(
      new Request(`http://localhost/api/debug/npc-overrides?worldId=${worldId}&actorKey=mira`, {
        method: "DELETE",
      }),
    );
    expect(deleteResponse.status).toBe(200);
    await expectJson(deleteResponse, { ok: true, overrides: {} });
    expect(getNpcDebugOverrides(worldId)).toEqual({});
  });

  it("rejects malformed NPC debug override requests before mutating the store", async () => {
    const worldId = "test-world-invalid-route";
    clearNpcDebugOverrides(worldId);

    const response = await postNpcOverride(
      jsonRequest("POST", "http://localhost/api/debug/npc-overrides", {
        worldId,
        actorKey: "mira",
        override: {
          facts: "mood=curious",
        },
      }),
    );

    expect(response.status).toBe(400);
    await expectJson(response, { ok: false, error: "override.facts must be an object when provided." });
    expect(getNpcDebugOverrides(worldId)).toEqual({});
  });

  it("disables NPC debug override routes in production unless explicitly enabled", async () => {
    const worldId = "test-world-production-route";
    clearNpcDebugOverrides(worldId);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LORECRAFT_ENABLE_DEBUG_ROUTES", "");

    try {
      const response = await postNpcOverride(
        jsonRequest("POST", "http://localhost/api/debug/npc-overrides", {
          worldId,
          actorKey: "mira",
          override: {
            description: "She has bright red hair.",
          },
        }),
      );

      expect(response.status).toBe(404);
      await expectJson(response, { ok: false, error: "Debug NPC overrides are disabled." });
      expect(getNpcDebugOverrides(worldId)).toEqual({});
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("feeds route-saved NPC debug overrides into the next persistent Director request", async () => {
    const worldId = "test-world-route-to-prompt";
    clearNpcDebugOverrides(worldId);

    await postNpcOverride(
      jsonRequest("POST", "http://localhost/api/debug/npc-overrides", {
        worldId,
        actorKey: "mira",
        override: {
          description: "She has bright red hair.",
        },
      }),
    );

    const request = buildDirectorRequest(
      applyNpcDebugOverrides(context, getNpcDebugOverrides(worldId)),
      "What color hair do you have, Mira?",
    );
    const userMessage = request.messages.find((message) => message.role === "user");

    expect(request.requestSummary.npcOverrideKeys).toEqual(["mira.description"]);
    expect(userMessage?.content).toContain("Description: She has bright red hair.");
    expect(userMessage?.content).toContain("NPC CARD: Mira (mira)");
    expect(userMessage?.content).not.toContain("npcProfiles");
    expect(userMessage?.content).not.toContain("currentSceneActors");
  });
});

describe("Narrative input validation", () => {
  it("rejects empty and symbol-only narrative inputs before they become turns", () => {
    expect(validateNarrativeInput("")).toEqual({
      ok: false,
      error: "Narrative input is required.",
    });
    expect(validateNarrativeInput("   ")).toEqual({
      ok: false,
      error: "Narrative input is required.",
    });
    expect(validateNarrativeInput("√")).toEqual({
      ok: false,
      error: "Narrative input must include words or numbers.",
    });
    expect(validateNarrativeInput("...")).toEqual({
      ok: false,
      error: "Narrative input must include words or numbers.",
    });
  });

  it("accepts trimmed prose, dialogue, and numeric narrative input", () => {
    expect(validateNarrativeInput('  "Please."  ')).toEqual({
      ok: true,
      input: '"Please."',
    });
    expect(validateNarrativeInput("I wait for 10 minutes.")).toEqual({
      ok: true,
      input: "I wait for 10 minutes.",
    });
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
      error: "Game Master response was not valid JSON.",
    });
  });

  it("accepts non-empty plain prose without JSON parsing for transcript mode", () => {
    const result = parsePlainProseDirectorOutput("  Mira says, 'Enough to be afraid.'  ");

    expect(result).toEqual({
      ok: true,
      output: {
        narration: "Mira says, 'Enough to be afraid.'",
        npcUpdates: [],
      },
    });
  });

  it("rejects empty plain prose without inventing narration", () => {
    expect(parsePlainProseDirectorOutput("   ")).toEqual({
      ok: false,
      error: "Game Master returned an empty response.",
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
            knowledge: "Mira blurts out the bell secret.",
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
      {
        actorKey: "mira",
        field: "knowledge",
        reason: "NPC update field is not allowed.",
      },
    ]);
  });

  it("ignores unknown or offscreen NPC updates", () => {
    const validation = validateNpcUpdates(
      [
        {
          actorKey: "osric",
          reason: "The Game Master tried to update someone offscreen.",
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

  it("suppresses accepted NPC updates when the scene beat disallows durable changes", () => {
    const validation = validateNpcUpdates(
      [
        {
          actorKey: "mira",
          reason: "Mira noticed a trivial action.",
          changes: { mood: "concerned" },
        },
      ],
      context.actors,
    );
    const bounded = applySceneBeatPersistenceBoundary(validation, {
      allowsNpcUpdates: false,
    });

    expect(bounded.acceptedUpdates).toEqual([]);
    expect(bounded.ignoredUpdates).toMatchObject([
      {
        actorKey: "mira",
        field: "mood",
        reason: "Required scene beat does not allow durable NPC updates for this action.",
        valuePreview: "concerned",
      },
    ]);
  });
});

describe("OpenAI-compatible provider boundary", () => {
  it("defaults to persistent mode and rejects unknown director modes", () => {
    expect(readDirectorMode({})).toEqual({ ok: true, mode: "persistent" });
    expect(readDirectorMode({ LORECRAFT_DIRECTOR_MODE: "transcript" })).toEqual({
      ok: true,
      mode: "transcript",
    });
    expect(readDirectorMode({ LORECRAFT_DIRECTOR_MODE: "transcript" })).toEqual({
      ok: true,
      mode: "transcript",
    });
    expect(readDirectorMode({ LORECRAFT_DIRECTOR_MODE: "weird" })).toEqual({
      ok: false,
      error: 'LORECRAFT_DIRECTOR_MODE must be "persistent" or "transcript".',
    });
  });

  it("reports missing config without choosing a provider", () => {
    const config = readLlmConfig({});

    expect(config).toEqual({
      ok: false,
      error: "Configure LLM_BASE_URL, LLM_API_KEY, LLM_MODEL before sending Game Master turns.",
    });
  });

  it("extracts the assistant message from an OpenAI-compatible response", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const content = await requestOpenAICompatibleChat({
      config: {
        baseUrl: "http://localhost:11434/v1",
        apiKey: "ollama",
        model: "local-model",
        generationSettings: {
          temperature: 0.2,
          maxTokens: 600,
          topP: 0.85,
          reasoningEffort: "none",
          responseFormat: "json_object",
        },
      },
      messages: [{ role: "user", content: "hello" }],
      fetchImpl: async (_input, init) => {
        capturedBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"narration":"Hello."}' } }],
          }),
          { status: 200 },
        );
      },
    });

    expect(content).toBe('{"narration":"Hello."}');
    expect(capturedBody).toMatchObject({
      model: "local-model",
      temperature: 0.2,
      max_tokens: 600,
      top_p: 0.85,
      reasoning_effort: "none",
      response_format: { type: "json_object" },
    });
  });

  it("omits provider JSON response_format for plain-text generation settings", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const content = await requestOpenAICompatibleChat({
      config: {
        baseUrl: "http://localhost:11434/v1",
        apiKey: "ollama",
        model: "local-model",
        generationSettings: {
          temperature: 0.7,
          responseFormat: "text",
        },
      },
      messages: [{ role: "user", content: "continue the scene" }],
      fetchImpl: async (_input, init) => {
        capturedBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "Mira answers in plain prose." } }],
          }),
          { status: 200 },
        );
      },
    });

    expect(content).toBe("Mira answers in plain prose.");
    expect(capturedBody).toMatchObject({
      model: "local-model",
      temperature: 0.7,
    });
    expect(capturedBody).not.toHaveProperty("response_format");
    expect(capturedBody).not.toHaveProperty("reasoning_effort");
  });

  it("reads optional generation settings with safe defaults", () => {
    const defaults = readLlmConfig({
      LLM_BASE_URL: "http://localhost:11434/v1",
      LLM_API_KEY: "ollama",
      LLM_MODEL: "llama3.1:8b",
    });
    const configured = readLlmConfig({
      LLM_BASE_URL: "http://localhost:11434/v1",
      LLM_API_KEY: "ollama",
      LLM_MODEL: "llama3.1:8b",
      LLM_TEMPERATURE: "0.3",
      LLM_MAX_TOKENS: "900",
      LLM_TOP_P: "0.8",
      LLM_REASONING_EFFORT: "none",
    });
    const invalid = readLlmConfig({
      LLM_BASE_URL: "http://localhost:11434/v1",
      LLM_API_KEY: "ollama",
      LLM_MODEL: "llama3.1:8b",
      LLM_MAX_TOKENS: "12.5",
    });

    expect(defaults).toMatchObject({
      ok: true,
      config: {
        generationSettings: { temperature: 0.7, responseFormat: "json_object" },
      },
    });
    expect(configured).toMatchObject({
      ok: true,
      config: {
        generationSettings: {
          temperature: 0.3,
          maxTokens: 900,
          topP: 0.8,
          reasoningEffort: "none",
          responseFormat: "json_object",
        },
      },
    });
    expect(invalid).toEqual({
      ok: false,
      error: "LLM_MAX_TOKENS must be an integer number at least 1 and no greater than 8000.",
    });
    expect(
      readLlmConfig({
        LLM_BASE_URL: "http://localhost:11434/v1",
        LLM_API_KEY: "ollama",
        LLM_MODEL: "llama3.1:8b",
        LLM_REASONING_EFFORT: "extreme",
      }),
    ).toEqual({
      ok: false,
      error: "LLM_REASONING_EFFORT must be one of none, low, medium, high, or max.",
    });
  });
});

describe("Raw Director request storage", () => {
  it("stores exact provider messages only when explicitly enabled", () => {
    const messages = [
      { role: "system" as const, content: "System prompt" },
      { role: "user" as const, content: '{"promptComponents":{}}' },
    ];

    expect(shouldStoreRawDirectorRequest({})).toBe(false);
    expect(shouldStoreRawDirectorRequest({ LORECRAFT_DEBUG_STORE_RAW_REQUEST: "0" })).toBe(false);
    expect(shouldStoreRawDirectorRequest({ LORECRAFT_DEBUG_STORE_RAW_REQUEST: "1" })).toBe(true);
    expect(rawDirectorRequestForStorage(messages, {})).toBeUndefined();
    expect(
      rawDirectorRequestForStorage(messages, {
        LORECRAFT_DEBUG_STORE_RAW_REQUEST: "1",
      }),
    ).toBe(messages);
  });
});

describe("Director turn route errors", () => {
  it("maps malformed Convex world ids to a structured 400 response", () => {
    const result = normalizeWorldLoadError(
      new Error('ArgumentValidationError: Value does not match validator for field "worldId"'),
    );

    expect(result).toEqual({
      httpStatus: 400,
      clientMessage: "The selected world id is invalid. Seed or reload the world and try again.",
      logMessage: "The selected world id is invalid.",
    });
  });

  it("keeps unexpected context load errors as server errors", () => {
    const result = normalizeWorldLoadError(new Error("Convex deployment unavailable"));

    expect(result).toEqual({
      httpStatus: 500,
      clientMessage: "The selected world could not be loaded. Seed or reload the world and try again.",
      logMessage: "The selected world could not be loaded.",
    });
  });
});

describe("Director debug logging", () => {
  it("omits raw LLM text unless explicitly enabled", () => {
    const record = buildDirectorDebugLogRecord(
      {
        event: "director.turn.unit",
        stage: "parse_director_output",
        turnId: "turn-id",
        provider: "localhost:11434",
        model: "llama3.1:8b",
        rawResponse: '{"narration":"Hello."}',
        status: "invalid_output",
      },
      {
        env: { LORECRAFT_DEBUG_LOG: "1" },
        now: () => new Date("2026-06-27T19:30:00.000Z"),
      },
    );

    expect(record).toMatchObject({
      ts: "2026-06-27T19:30:00.000Z",
      event: "director.turn.unit",
      rawResponseLength: 22,
      turnId: "turn-id",
    });
    expect(record).not.toHaveProperty("rawResponse");
  });

  it("builds a turn-centered debug unit without raw request text by default", () => {
    const record = buildDirectorDebugLogRecord(
      {
        event: "director.turn.unit",
        stage: "complete_director_turn",
        turnId: "turn-id",
        commandId: "command-id",
        playerInput: "I ask Mira about the storm.",
        requestSummary: { roomKey: "chapel" },
        rawRequest: [
          { role: "system", content: "Hidden context." },
          { role: "user", content: "I ask Mira about the storm." },
        ],
        rawResponse: '{"narration":"Mira answers."}',
        parsedResponse: { narration: "Mira answers.", npcUpdates: [] },
        narration: "Mira answers.",
        acceptedUpdates: [{ actorKey: "mira" }],
        ignoredUpdates: [],
        status: "success",
      },
      {
        env: { LORECRAFT_DEBUG_LOG: "1" },
        now: () => new Date("2026-06-27T19:32:00.000Z"),
      },
    );

    expect(record).toMatchObject({
      event: "director.turn.unit",
      stage: "complete_director_turn",
      turnId: "turn-id",
      commandId: "command-id",
      playerInput: "I ask Mira about the storm.",
      rawRequestMessageCount: 2,
      rawResponseLength: 29,
      parsedResponse: { narration: "Mira answers.", npcUpdates: [] },
      narration: "Mira answers.",
      acceptedUpdateCount: 1,
      ignoredUpdateCount: 0,
    });
    expect(record).not.toHaveProperty("rawRequest");
    expect(record).not.toHaveProperty("rawResponse");
  });

  it("includes raw provider request text in local logs only when explicitly enabled", () => {
    const rawRequest = [{ role: "user", content: "Exact provider message." }];
    const record = buildDirectorDebugLogRecord(
      {
        event: "director.turn.unit",
        stage: "complete_director_turn",
        rawRequest,
      },
      {
        env: { LORECRAFT_DEBUG_LOG: "1", LORECRAFT_DEBUG_LOG_RAW_REQUEST: "1" },
      },
    );

    expect(record).toMatchObject({
      rawRequestMessageCount: 1,
      rawRequest,
    });
  });

  it("writes JSONL records only when local debug logging is enabled", async () => {
    const writes: string[] = [];
    const mkdirs: string[] = [];
    const entry = { event: "director.turn.unit", stage: "complete_director_turn" };

    const disabled = await writeDirectorDebugLog(entry, {
      env: {},
      mkdirImpl: async (path) => {
        mkdirs.push(String(path));
        return undefined;
      },
      appendFileImpl: async (_path, data) => {
        writes.push(String(data));
      },
    });

    const enabled = await writeDirectorDebugLog(entry, {
      env: { LORECRAFT_DEBUG_LOG: "1", LORECRAFT_DEBUG_LOG_PATH: "logs/test.jsonl" },
      cwd: "/tmp/lorecraft",
      now: () => new Date("2026-06-27T19:31:00.000Z"),
      mkdirImpl: async (path) => {
        mkdirs.push(String(path));
        return undefined;
      },
      appendFileImpl: async (path, data) => {
        writes.push(`${path}:${data}`);
      },
    });

    expect(disabled).toBe(false);
    expect(enabled).toBe(true);
    expect(mkdirs).toEqual(["/tmp/lorecraft/logs"]);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("/tmp/lorecraft/logs/test.jsonl:");
    expect(writes[0]).toContain('"event":"director.turn.unit"');
  });
});
