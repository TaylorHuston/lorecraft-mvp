import { describe, expect, it } from "vitest";
import { buildDirectorDebugLogRecord, writeDirectorDebugLog } from "./debug-log";
import { buildDirectorRequest, deriveRequiredSceneBeat } from "./prompt";
import { rawDirectorRequestForStorage, shouldStoreRawDirectorRequest } from "./raw-request";
import {
  applySceneBeatPersistenceBoundary,
  parseDirectorOutput,
  validateNpcUpdates,
} from "./output";
import { readLlmConfig, requestOpenAICompatibleChat } from "./provider";
import { normalizeWorldLoadError } from "./turn-errors";
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
    {
      key: "knows_about_storm",
      value:
        "Mira knows the storm began after the chapel bell rang at midnight, and she is afraid to say that too plainly.",
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

describe("Director request construction", () => {
  it("builds a bounded stateless request from explicit prompt components", () => {
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
    const payload = JSON.parse(userMessage?.content ?? "{}");
    const components = payload.promptComponents;

    expect(request.messages).toHaveLength(2);
    expect(request.requestSummary).toMatchObject({
      worldName: "Stormbound Chapel",
      roomKey: "chapel",
      recentFeedCount: 12,
      actorKeys: ["taylor", "mira"],
      npcFactKeys: ["mood", "status", "memory"],
      readOnlyKnowledgeKeys: ["mira.knows_about_storm"],
      requiredSceneBeat: {
        kind: "direct_npc_question",
        targetActorKey: "mira",
        expectsNpcResponse: true,
        allowsNpcUpdates: true,
      },
      generationSettings: {
        temperature: 0.4,
        maxTokens: 700,
        topP: 0.9,
        responseFormat: "json_object",
      },
      promptGuidanceKeys: ["style", "npcBehavior", "persistence"],
    });
    expect(request.requestSummary.promptComponentKeys).toEqual([
      "currentTurn",
      "sourceOwnership",
      "directorInstructions",
      "authorToneGuidance",
      "promptGuidance",
      "sceneState",
      "visibleFacts",
      "hiddenNpcKnowledge",
      "recentFeed",
    ]);
    expect(components.currentTurn.playerInput).toBe("I ask Mira about the storm.");
    expect(components.promptGuidance).toEqual({
      style: "Write like a tense chapel scene.",
      npcBehavior: "Mira should answer direct questions with a concrete choice.",
      persistence: "Keep passing reactions out of durable facts.",
    });
    expect(components.currentTurn.requiredSceneBeat.instruction).toContain("meaningful response");
    expect(components.currentTurn.requiredSceneBeat.instruction).toContain(
      "Do not stop at setup",
    );
    expect(components.currentTurn.requiredSceneBeat.instruction).toContain(
      "Facial expression alone does not satisfy this beat",
    );
    expect(components.recentFeed.at(-1).text).toBe("feed entry 14");
    expect(userMessage?.content).not.toContain("feed entry 0");
    expect(userMessage?.content).not.toContain("turn-14");
    expect(userMessage?.content).not.toContain("command-14");
    expect(userMessage?.content).not.toContain("outputShape");
    expect(components.visibleFacts.currentSceneActors[1].mutableFacts).toEqual([
      { key: "mood", value: "watchful", source: "seed" },
      { key: "status", value: "waiting near the chapel aisle", source: "seed" },
      {
        key: "memory",
        value: "Mira has not yet formed any meaningful memories of Taylor.",
        source: "seed",
      },
    ]);
    expect(components.hiddenNpcKnowledge).toEqual([
      {
        key: "mira",
        name: "Mira",
        readOnlyFacts: [
          {
            key: "knows_about_storm",
            value:
              "Mira knows the storm began after the chapel bell rang at midnight, and she is afraid to say that too plainly.",
            source: "seed",
          },
        ],
      },
    ]);
    expect(components.sourceOwnership).toMatchObject({
      editableConfiguration: [
        "directorInstructions",
        "authorToneGuidance",
        "promptGuidance",
        "providerGenerationSettings",
      ],
      derivedFromPlayerInput: ["currentTurn.playerInput", "currentTurn.requiredSceneBeat"],
    });
    expect(systemMessage?.content).toContain(
      "The status field is stable ongoing circumstance, not moment-to-moment physical action.",
    );
    expect(systemMessage?.content).toContain("current playerInput is the only new action");
    expect(systemMessage?.content).toContain("Facial expressions or posture alone are not enough");
    expect(systemMessage?.content).toContain("never end with setup");
    expect(systemMessage?.content).toContain("Do not put emotions or attitudes");
    expect(systemMessage?.content).toContain("narrate those beats instead");
    expect(systemMessage?.content).toContain("NPC dialogue is allowed inside narration");
  });

  it("derives a direct NPC question scene beat without forcing dialogue for plain actions", () => {
    expect(deriveRequiredSceneBeat(context, "I ask Mira what she knows about the storm.")).toMatchObject({
      kind: "direct_npc_question",
      targetActorKey: "mira",
      expectsNpcResponse: true,
      allowsNpcUpdates: true,
    });

    expect(deriveRequiredSceneBeat(context, "I jump.")).toMatchObject({
      kind: "trivial_player_action",
      expectsNpcResponse: false,
      allowsNpcUpdates: false,
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
            knows_about_storm: false,
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
        field: "knows_about_storm",
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
  it("reports missing config without choosing a provider", () => {
    const config = readLlmConfig({});

    expect(config).toEqual({
      ok: false,
      error: "Configure LLM_BASE_URL, LLM_API_KEY, LLM_MODEL before sending Director turns.",
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
      response_format: { type: "json_object" },
    });
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
          responseFormat: "json_object",
        },
      },
    });
    expect(invalid).toEqual({
      ok: false,
      error: "LLM_MAX_TOKENS must be an integer number at least 1 and no greater than 8000.",
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
        event: "director.turn.invalid_output",
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
      event: "director.turn.invalid_output",
      rawResponseLength: 22,
      turnId: "turn-id",
    });
    expect(record).not.toHaveProperty("rawResponse");
  });

  it("writes JSONL records only when local debug logging is enabled", async () => {
    const writes: string[] = [];
    const mkdirs: string[] = [];
    const entry = { event: "director.turn.completed", stage: "complete_director_turn" };

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
    expect(writes[0]).toContain('"event":"director.turn.completed"');
  });
});
