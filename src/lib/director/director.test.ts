import { describe, expect, it } from "vitest";
import { buildDirectorDebugLogRecord, writeDirectorDebugLog } from "./debug-log";
import { readDirectorMode } from "./mode";
import { validateNarrativeInput } from "./input";
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
      directorMode: "persistent",
      outputContract: "json_npc_updates",
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

  it("builds a transcript-only plain-prose request from seed and transcript", () => {
    const request = buildTranscriptDirectorRequest(transcriptContext, "What do I see now?", {
      generationSettings: {
        temperature: 0.7,
        responseFormat: "text",
      },
    });
    const systemMessage = request.messages.find((message) => message.role === "system");
    const userMessage = request.messages.find((message) => message.role === "user");
    const payload = JSON.parse(userMessage?.content ?? "{}");

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
    expect(systemMessage?.content).toContain("prompt is ordered by priority");
    expect(systemMessage?.content).toContain("transcript is the source of story continuity");
    expect(systemMessage?.content).toContain("immediateContext field is the high-priority");
    expect(systemMessage?.content).toContain("lastAction field is the only new action");
    expect(systemMessage?.content).toContain("not as already-canonical story prose");
    expect(systemMessage?.content).toContain("Do not copy lastAction verbatim");
    expect(systemMessage?.content).toContain("Respond directly to lastAction");
    expect(systemMessage?.content).toContain("include that character's answer, refusal, action");
    expect(systemMessage?.content).toContain("Do not merely restate that the player said the line");
    expect(systemMessage?.content).toContain("conflicts with transcript continuity");
    expect(systemMessage?.content).toContain("do not make Mira answer unless the transcript establishes she is present");
    expect(systemMessage?.content).toContain("plain prose only");
    expect(systemMessage?.content).not.toContain("strict JSON");
    expect(systemMessage?.content).not.toContain("Return exactly this top-level shape");
    expect(payload.promptComponents.sourceOwnership).toMatchObject({
      seedOnly: ["worldSeed"],
      transcriptContinuity: ["transcript"],
      highPriorityContinuity: ["immediateContext"],
      latestPlayerAction: ["lastAction"],
      nearOutputGuidance: ["sceneDirective"],
      noRuntimeWorldState: true,
    });
    expect(Object.keys(payload.promptComponents)).toEqual([
      "sourceOwnership",
      "directorInstructions",
      "authorToneGuidance",
      "promptGuidance",
      "worldSeed",
      "transcript",
      "immediateContext",
      "lastAction",
      "sceneDirective",
    ]);
    expect(payload.promptComponents.lastAction).toEqual({
      rawInput: "What do I see now?",
      inferredMode: "speech_or_address",
      directive:
        "Resolve this player input now before advancing the scene. Treat it as intent, not already-canonical prose.",
    });
    expect(payload.promptComponents.sceneDirective).toContain("Resolve lastAction");
    expect(payload.promptComponents.sceneDirective).toContain(
      "not already-canonical story prose",
    );
    expect(payload.promptComponents.sceneDirective).toContain("Do not copy lastAction verbatim");
    expect(payload.promptComponents.sceneDirective).toContain("nearby character has been directly engaged");
    expect(payload.promptComponents.worldSeed.initialSeed).toContain("Mira waits near the aisle");
    expect(payload.promptComponents.immediateContext).toEqual(payload.promptComponents.transcript);
    expect(payload.promptComponents.transcript.at(-1).text).toContain("gray valley");
    expect(userMessage?.content).not.toContain("sceneState");
    expect(userMessage?.content).not.toContain("visibleFacts");
    expect(userMessage?.content).not.toContain("hiddenNpcKnowledge");
    expect(userMessage?.content).not.toContain("requiredSceneBeat");
    expect(userMessage?.content).not.toContain("currentTurn");
  });

  it("highlights immediate transcript context and omits invalid historical turns", () => {
    const request = buildTranscriptDirectorRequest(
      transcriptWithInvalidTurn,
      '"Just some ale please"',
    );
    const userMessage = request.messages.find((message) => message.role === "user");
    const payload = JSON.parse(userMessage?.content ?? "{}");

    expect(request.requestSummary.recentFeedCount).toBe(4);
    expect(payload.promptComponents.lastAction).toEqual({
      rawInput: '"Just some ale please"',
      inferredMode: "speech",
      directive:
        "Resolve this player input now before advancing the scene. Treat it as intent, not already-canonical prose.",
    });
    expect(payload.promptComponents.sceneDirective).toContain(
      "Treat lastAction as something the player says",
    );
    expect(payload.promptComponents.sceneDirective).toContain(
      "include that character's response",
    );
    expect(payload.promptComponents.transcript.map((entry: { text: string }) => entry.text)).toEqual([
      "I leave the chapel and walk for days.",
      "You leave the chapel behind. Days later, the road opens into a gray valley.",
      "You sit at the bar.",
      "The bartender leans close and asks what you want.",
    ]);
    expect(payload.promptComponents.immediateContext.at(-1).text).toBe(
      "The bartender leans close and asks what you want.",
    );
    expect(userMessage?.content).not.toContain("√");
    expect(userMessage?.content).not.toContain("symbol was treated as a turn");
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
      error: "Director response was not valid JSON.",
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
      error: "Director returned an empty response.",
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
