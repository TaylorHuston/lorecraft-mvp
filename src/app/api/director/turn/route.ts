import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { writeDirectorDebugLog } from "@/lib/director/debug-log";
import { readDirectorMode } from "@/lib/director/mode";
import {
  buildDirectorRequest,
  buildNpcStateExtractionRequest,
  buildTranscriptDirectorRequest,
} from "@/lib/director/prompt";
import {
  applySceneBeatPersistenceBoundary,
  parseNpcStateExtractionOutput,
  parsePlainProseDirectorOutput,
  validateNpcUpdates,
} from "@/lib/director/output";
import { ProviderError, readLlmConfig, requestOpenAICompatibleChat } from "@/lib/director/provider";
import { validateNarrativeInput } from "@/lib/director/input";
import { getNpcDebugOverrides } from "@/lib/director/npc-debug-overrides";
import { applyNpcDebugOverrides } from "@/lib/director/npc-profiles";
import { rawDirectorRequestForStorage } from "@/lib/director/raw-request";
import { normalizeWorldLoadError } from "@/lib/director/turn-errors";
import type { DirectorContext, TranscriptDirectorContext } from "@/lib/director/types";

export const runtime = "nodejs";

type TurnResponse =
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

export async function POST(request: Request) {
  const startedAt = performance.now();
  const bodyResult = await readBody(request);
  if (!bodyResult.ok) {
    await logDirectorTurn({
      event: "director.turn.rejected",
      stage: "read_body",
      error: bodyResult.error,
      httpStatus: 400,
      timingsMs: { total: elapsedSince(startedAt) },
    });
    return json<TurnResponse>({ ok: false, error: bodyResult.error }, 400);
  }

  const modeResult = readDirectorMode();
  if (!modeResult.ok) {
    await logDirectorTurn({
      event: "director.turn.rejected",
      stage: "read_director_mode",
      worldId: bodyResult.body.worldId,
      error: modeResult.error,
      httpStatus: 500,
      timingsMs: { total: elapsedSince(startedAt) },
    });
    return json<TurnResponse>({ ok: false, error: modeResult.error }, 500);
  }

  const configResult = readLlmConfig();
  if (!configResult.ok) {
    await logDirectorTurn({
      event: "director.turn.rejected",
      stage: "read_config",
      worldId: bodyResult.body.worldId,
      requestSummary: {
        directorMode: modeResult.mode,
      },
      error: configResult.error,
      httpStatus: 503,
      timingsMs: { total: elapsedSince(startedAt) },
    });
    return json<TurnResponse>({ ok: false, error: configResult.error }, 503);
  }

  const provider = providerName(configResult.config.baseUrl);
  const convexResult = createConvexClient();
  if (!convexResult.ok) {
    await logDirectorTurn({
      event: "director.turn.rejected",
      stage: "create_convex_client",
      worldId: bodyResult.body.worldId,
      provider,
      model: configResult.config.model,
      error: convexResult.error,
      httpStatus: 500,
      timingsMs: { total: elapsedSince(startedAt) },
    });
    return json<TurnResponse>({ ok: false, error: convexResult.error }, 500);
  }

  const { worldId, input } = bodyResult.body;
  const convex = convexResult.client;
  const directorMode = modeResult.mode;

  let context:
    | Awaited<ReturnType<typeof convex.query<typeof api.world.getDirectorContext>>>
    | Awaited<ReturnType<typeof convex.query<typeof api.world.getTranscriptDirectorContext>>>;
  try {
    context =
      directorMode === "transcript"
        ? await convex.query(api.world.getTranscriptDirectorContext, { worldId })
        : await convex.query(api.world.getDirectorContext, { worldId });
  } catch (error) {
    const worldLoadError = normalizeWorldLoadError(error);
    await logDirectorTurn({
      event: "director.turn.rejected",
      stage: "load_context",
      worldId,
      provider,
      model: configResult.config.model,
      error: worldLoadError.logMessage,
      httpStatus: worldLoadError.httpStatus,
      timingsMs: { total: elapsedSince(startedAt) },
    });
    return json<TurnResponse>(
      {
        ok: false,
        error: worldLoadError.clientMessage,
      },
      worldLoadError.httpStatus,
    );
  }

  if (!context) {
    await logDirectorTurn({
      event: "director.turn.rejected",
      stage: "load_context",
      worldId,
      provider,
      model: configResult.config.model,
      error: "The selected world is missing required state.",
      httpStatus: 404,
      timingsMs: { total: elapsedSince(startedAt) },
    });
    return json<TurnResponse>(
      {
        ok: false,
        error: "The selected world is missing required state. Seed or reload the world and try again.",
      },
      404,
    );
  }

  const persistentContext =
    directorMode === "persistent"
      ? applyNpcDebugOverrides(context as unknown as DirectorContext, getNpcDebugOverrides(worldId))
      : null;

  const recorded = await convex.mutation(api.world.recordPlayerInput, { worldId, input });
  if (!recorded.ok) {
    await logDirectorTurn({
      event: "director.turn.rejected",
      stage: "record_player_input",
      worldId,
      provider,
      model: configResult.config.model,
      error: recorded.error,
      httpStatus: 409,
      timingsMs: { total: elapsedSince(startedAt) },
    });
    return json<TurnResponse>({ ok: false, error: recorded.error }, 409);
  }

  const generationSettings = {
    ...configResult.config.generationSettings,
    responseFormat: "text" as const,
  };
  const directorRequest =
    directorMode === "transcript"
      ? buildTranscriptDirectorRequest(context as TranscriptDirectorContext, input, {
          generationSettings,
          promptGuidance: bodyResult.body.promptGuidance,
        })
      : buildDirectorRequest(persistentContext ?? (context as unknown as DirectorContext), input, {
          generationSettings,
          promptGuidance: bodyResult.body.promptGuidance,
        });
  const rawRequest = rawDirectorRequestForStorage(directorRequest.messages);

  let rawOutput: string;
  const providerStartedAt = performance.now();
  try {
    rawOutput = await requestOpenAICompatibleChat({
      config: { ...configResult.config, generationSettings },
      messages: directorRequest.messages,
    });
  } catch (error) {
    const providerError = normalizeProviderError(error);
    await convex.mutation(api.world.completeDirectorTurn, {
      worldId,
      turnId: recorded.turnId,
      commandId: recorded.commandId,
      provider,
      model: configResult.config.model,
      requestSummary: directorRequest.requestSummary,
      ...(rawRequest !== undefined ? { rawRequest } : {}),
      rawResponse: providerError.rawResponse ?? "",
      status: "provider_error",
      acceptedUpdates: [],
      ignoredUpdates: [],
      error: providerError.message,
    });
    await logDirectorTurn({
      event: "director.turn.unit",
      stage: "provider_request",
      worldId,
      turnId: recorded.turnId,
      commandId: recorded.commandId,
      playerInput: input,
      provider,
      model: configResult.config.model,
      requestSummary: directorRequest.requestSummary,
      rawRequest: directorRequest.messages,
      status: "provider_error",
      httpStatus: 502,
      error: providerError.message,
      rawResponse: providerError.rawResponse,
      acceptedUpdateCount: 0,
      ignoredUpdateCount: 0,
      timingsMs: {
        provider: elapsedSince(providerStartedAt),
        total: elapsedSince(startedAt),
      },
    });
    return json<TurnResponse>({ ok: false, error: providerError.message }, 502);
  }

  const parsed = parsePlainProseDirectorOutput(rawOutput);
  if (!parsed.ok) {
    await convex.mutation(api.world.completeDirectorTurn, {
      worldId,
      turnId: recorded.turnId,
      commandId: recorded.commandId,
      provider,
      model: configResult.config.model,
      requestSummary: directorRequest.requestSummary,
      ...(rawRequest !== undefined ? { rawRequest } : {}),
      rawResponse: rawOutput,
      status: "invalid_output",
      acceptedUpdates: [],
      ignoredUpdates: [],
      error: parsed.error,
    });
    await logDirectorTurn({
      event: "director.turn.unit",
      stage: "parse_director_output",
      worldId,
      turnId: recorded.turnId,
      commandId: recorded.commandId,
      playerInput: input,
      provider,
      model: configResult.config.model,
      requestSummary: directorRequest.requestSummary,
      rawRequest: directorRequest.messages,
      status: "invalid_output",
      httpStatus: 422,
      error: parsed.error,
      rawResponse: rawOutput,
      acceptedUpdateCount: 0,
      ignoredUpdateCount: 0,
      timingsMs: {
        provider: elapsedSince(providerStartedAt),
        total: elapsedSince(startedAt),
      },
    });
    return json<TurnResponse>({ ok: false, error: parsed.error }, 422);
  }

  await convex.mutation(api.world.completeDirectorTurn, {
    worldId,
    turnId: recorded.turnId,
    commandId: recorded.commandId,
    provider,
    model: configResult.config.model,
    requestSummary: directorRequest.requestSummary,
    ...(rawRequest !== undefined ? { rawRequest } : {}),
    rawResponse: rawOutput,
    parsedResponse: parsed.output,
    status: "success",
    acceptedUpdates: [],
    ignoredUpdates: [],
    narration: parsed.output.narration,
    applyWorldMutations: false,
  });
  await logDirectorTurn({
    event: "director.turn.unit",
    stage: "complete_director_turn",
    worldId,
    turnId: recorded.turnId,
    commandId: recorded.commandId,
    playerInput: input,
    provider,
    model: configResult.config.model,
    requestSummary: directorRequest.requestSummary,
    rawRequest: directorRequest.messages,
    status: "success",
    httpStatus: 200,
    rawResponse: rawOutput,
    parsedResponse: parsed.output,
    narration: parsed.output.narration,
    acceptedUpdates: [],
    ignoredUpdates: [],
    timingsMs: {
      provider: elapsedSince(providerStartedAt),
      total: elapsedSince(startedAt),
    },
  });

  if (directorMode === "transcript" || !persistentContext) {
    return json<TurnResponse>({
      ok: true,
      narration: parsed.output.narration,
      acceptedUpdates: [],
      ignoredUpdates: [],
    });
  }

  const extractionGenerationSettings = {
    ...configResult.config.generationSettings,
    responseFormat: "json_object" as const,
  };
  const extractionRequest = buildNpcStateExtractionRequest(
    persistentContext,
    input,
    parsed.output.narration,
    {
      generationSettings: extractionGenerationSettings,
      promptGuidance: bodyResult.body.promptGuidance,
      requiredSceneBeat: {
        ...directorRequest.requestSummary.requiredSceneBeat,
        instruction: "",
      },
      sceneBeatSource: directorRequest.requestSummary.sceneBeatSource,
      sceneBeatReason: directorRequest.requestSummary.sceneBeatReason,
    },
  );
  const extractionRawRequest = rawDirectorRequestForStorage(extractionRequest.messages);
  const extractionStartedAt = performance.now();

  let extractionRawOutput: string;
  try {
    extractionRawOutput = await requestOpenAICompatibleChat({
      config: { ...configResult.config, generationSettings: extractionGenerationSettings },
      messages: extractionRequest.messages,
    });
  } catch (error) {
    const providerError = normalizeProviderError(error);
    await convex.mutation(api.world.recordNpcStateExtraction, {
      worldId,
      turnId: recorded.turnId,
      commandId: recorded.commandId,
      provider,
      model: configResult.config.model,
      requestSummary: extractionRequest.requestSummary,
      ...(extractionRawRequest !== undefined ? { rawRequest: extractionRawRequest } : {}),
      rawResponse: providerError.rawResponse ?? "",
      status: "provider_error",
      acceptedUpdates: [],
      ignoredUpdates: [],
      error: providerError.message,
    });
    await logDirectorTurn({
      event: "director.turn.extraction",
      stage: "provider_request",
      worldId,
      turnId: recorded.turnId,
      commandId: recorded.commandId,
      playerInput: input,
      provider,
      model: configResult.config.model,
      requestSummary: extractionRequest.requestSummary,
      rawRequest: extractionRequest.messages,
      status: "provider_error",
      httpStatus: 200,
      error: providerError.message,
      rawResponse: providerError.rawResponse,
      acceptedUpdateCount: 0,
      ignoredUpdateCount: 0,
      timingsMs: {
        provider: elapsedSince(extractionStartedAt),
        total: elapsedSince(startedAt),
      },
    });
    return json<TurnResponse>({
      ok: true,
      narration: parsed.output.narration,
      acceptedUpdates: [],
      ignoredUpdates: [],
    });
  }

  const extractionParsed = parseNpcStateExtractionOutput(extractionRawOutput);
  if (!extractionParsed.ok) {
    await convex.mutation(api.world.recordNpcStateExtraction, {
      worldId,
      turnId: recorded.turnId,
      commandId: recorded.commandId,
      provider,
      model: configResult.config.model,
      requestSummary: extractionRequest.requestSummary,
      ...(extractionRawRequest !== undefined ? { rawRequest: extractionRawRequest } : {}),
      rawResponse: extractionRawOutput,
      status: "invalid_output",
      acceptedUpdates: [],
      ignoredUpdates: [],
      error: extractionParsed.error,
    });
    await logDirectorTurn({
      event: "director.turn.extraction",
      stage: "parse_extraction_output",
      worldId,
      turnId: recorded.turnId,
      commandId: recorded.commandId,
      playerInput: input,
      provider,
      model: configResult.config.model,
      requestSummary: extractionRequest.requestSummary,
      rawRequest: extractionRequest.messages,
      status: "invalid_output",
      httpStatus: 200,
      error: extractionParsed.error,
      rawResponse: extractionRawOutput,
      acceptedUpdateCount: 0,
      ignoredUpdateCount: 0,
      timingsMs: {
        provider: elapsedSince(extractionStartedAt),
        total: elapsedSince(startedAt),
      },
    });
    return json<TurnResponse>({
      ok: true,
      narration: parsed.output.narration,
      acceptedUpdates: [],
      ignoredUpdates: [],
    });
  }

  const extractionValidated = applySceneBeatPersistenceBoundary(
    validateNpcUpdates(extractionParsed.npcUpdates, persistentContext.actors),
    extractionRequest.requestSummary.requiredSceneBeat,
  );
  await convex.mutation(api.world.recordNpcStateExtraction, {
    worldId,
    turnId: recorded.turnId,
    commandId: recorded.commandId,
    provider,
    model: configResult.config.model,
    requestSummary: extractionRequest.requestSummary,
    ...(extractionRawRequest !== undefined ? { rawRequest: extractionRawRequest } : {}),
    rawResponse: extractionRawOutput,
    parsedResponse: { npcUpdates: extractionParsed.npcUpdates },
    status: "success",
    acceptedUpdates: extractionValidated.acceptedUpdates,
    ignoredUpdates: extractionValidated.ignoredUpdates,
  });
  await logDirectorTurn({
    event: "director.turn.extraction",
    stage: "complete_extraction",
    worldId,
    turnId: recorded.turnId,
    commandId: recorded.commandId,
    playerInput: input,
    provider,
    model: configResult.config.model,
    requestSummary: extractionRequest.requestSummary,
    rawRequest: extractionRequest.messages,
    status: "success",
    httpStatus: 200,
    rawResponse: extractionRawOutput,
    parsedResponse: { npcUpdates: extractionParsed.npcUpdates },
    acceptedUpdates: extractionValidated.acceptedUpdates,
    ignoredUpdates: extractionValidated.ignoredUpdates,
    timingsMs: {
      provider: elapsedSince(extractionStartedAt),
      total: elapsedSince(startedAt),
    },
  });

  return json<TurnResponse>({
    ok: true,
    narration: parsed.output.narration,
    acceptedUpdates: extractionValidated.acceptedUpdates,
    ignoredUpdates: extractionValidated.ignoredUpdates,
  });
}

function json<T>(body: T, status = 200) {
  return Response.json(body, { status });
}

async function readBody(request: Request) {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return { ok: false as const, error: "Request body must be JSON." };
  }

  if (!isRecord(parsed)) {
    return { ok: false as const, error: "Request body must be a JSON object." };
  }

  if (typeof parsed.worldId !== "string" || parsed.worldId.trim().length === 0) {
    return { ok: false as const, error: "A worldId is required." };
  }

  const inputResult = validateNarrativeInput(parsed.input);
  if (!inputResult.ok) {
    return inputResult;
  }

  const promptGuidance = readPromptGuidance(parsed.promptGuidance);
  if (!promptGuidance.ok) {
    return promptGuidance;
  }

  return {
    ok: true as const,
    body: {
      worldId: parsed.worldId as Id<"worlds">,
      input: inputResult.input,
      promptGuidance: promptGuidance.value,
    },
  };
}

function readPromptGuidance(value: unknown) {
  if (value === undefined) {
    return { ok: true as const, value: undefined };
  }

  if (!isRecord(value)) {
    return { ok: false as const, error: "promptGuidance must be an object when provided." };
  }

  const guidance: Record<string, string> = {};
  for (const key of ["style", "npcBehavior", "persistence"]) {
    const rawValue = value[key];
    if (rawValue === undefined) {
      continue;
    }
    if (typeof rawValue !== "string") {
      return { ok: false as const, error: `promptGuidance.${key} must be a string.` };
    }

    const trimmed = rawValue.trim();
    if (trimmed.length > 1200) {
      return { ok: false as const, error: `promptGuidance.${key} must be 1200 characters or less.` };
    }
    if (trimmed.length > 0) {
      guidance[key] = trimmed;
    }
  }

  return { ok: true as const, value: guidance };
}

function createConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!convexUrl) {
    return {
      ok: false as const,
      error: "NEXT_PUBLIC_CONVEX_URL is not configured, so the Game Master cannot persist turns.",
    };
  }
  return { ok: true as const, client: new ConvexHttpClient(convexUrl) };
}

function normalizeProviderError(error: unknown) {
  if (error instanceof ProviderError) {
    return {
      message: error.message,
      rawResponse: error.responseBody,
    };
  }

  if (error instanceof Error) {
    return { message: error.message, rawResponse: undefined };
  }

  return { message: "The LLM provider request failed.", rawResponse: undefined };
}

function providerName(baseUrl: string) {
  try {
    return new URL(baseUrl).host || "openai-compatible";
  } catch {
    return "openai-compatible";
  }
}

async function logDirectorTurn(entry: Parameters<typeof writeDirectorDebugLog>[0]) {
  await writeDirectorDebugLog(entry);
}

function elapsedSince(start: number) {
  return Math.round(performance.now() - start);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
