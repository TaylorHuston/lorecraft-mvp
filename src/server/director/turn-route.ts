import "server-only";

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { writeDirectorDebugLog } from "@/lib/director/debug-log";
import { readDirectorMode } from "@/lib/director/mode";
import {
  buildDirectorRequest,
  buildNpcStateExtractionRequest,
  buildTranscriptDirectorRequest,
} from "@/lib/director/prompt";
import {
  applySceneBeatPersistenceBoundary,
  parseStateExtractionOutput,
  parsePlainProseDirectorOutput,
  validateActorMoves,
  validateNpcUpdates,
} from "@/lib/director/output";
import { ProviderError, readLlmConfig, requestOpenAICompatibleChat } from "@/lib/director/provider";
import { rawDirectorRequestForStorage } from "@/lib/director/raw-request";
import { normalizeWorldLoadError } from "@/lib/director/turn-errors";
import type { DirectorContext, TranscriptDirectorContext } from "@/lib/director/types";
import { isLocalDirectorRequest, isLocalUrl, readDirectorTurnBody } from "./turn-request";

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
  if (!isLocalDirectorRequest(request)) {
    await logDirectorTurn({
      event: "director.turn.rejected",
      stage: "director_route_guard",
      error: "Director turns are only enabled for local development requests by default.",
      httpStatus: 403,
      timingsMs: { total: elapsedSince(startedAt) },
    });
    return json<TurnResponse>(
      {
        ok: false,
        error: "Director turns are only enabled for local development requests by default.",
      },
      403,
    );
  }

  const bodyResult = await readDirectorTurnBody(request);
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
      adventureId: bodyResult.body.adventureId,
      error: modeResult.error,
      httpStatus: 500,
      timingsMs: { total: elapsedSince(startedAt) },
    });
    return json<TurnResponse>({ ok: false, error: modeResult.error }, 500);
  }

  const convexResult = createConvexClient();
  if (!convexResult.ok) {
    await logDirectorTurn({
      event: "director.turn.rejected",
      stage: "create_convex_client",
      adventureId: bodyResult.body.adventureId,
      requestSummary: {
        directorMode: modeResult.mode,
      },
      error: convexResult.error,
      httpStatus: 500,
      timingsMs: { total: elapsedSince(startedAt) },
    });
    return json<TurnResponse>({ ok: false, error: convexResult.error }, 500);
  }

  const { adventureId, input, turnTrigger, guideGuidance } = bodyResult.body;
  const convex = convexResult.client;
  const directorMode = modeResult.mode;
  if (directorMode === "transcript" && turnTrigger === "guide") {
    const error = "Guide turns are not supported in transcript mode.";
    await logDirectorTurn({
      event: "director.turn.rejected",
      stage: "transcript_guide_unsupported",
      adventureId,
      requestSummary: {
        directorMode,
        turnTrigger,
        guideGuidanceLength: guideGuidance?.length ?? 0,
      },
      error,
      httpStatus: 400,
      timingsMs: { total: elapsedSince(startedAt) },
    });
    return json<TurnResponse>({ ok: false, error }, 400);
  }
  const serverWriteToken = process.env.LORECRAFT_SERVER_WRITE_TOKEN?.trim() || undefined;
  if (convexResult.requiresServerWriteToken && !serverWriteToken) {
    const error = "LORECRAFT_SERVER_WRITE_TOKEN is required when Game Master turns use a remote Convex deployment.";
    await logDirectorTurn({
      event: "director.turn.rejected",
      stage: "server_write_token",
      adventureId,
      requestSummary: {
        directorMode,
      },
      error,
      httpStatus: 503,
      timingsMs: { total: elapsedSince(startedAt) },
    });
    return json<TurnResponse>({ ok: false, error }, 503);
  }
  const serverWriteArgs = serverWriteToken ? { serverWriteToken } : {};

  let context:
    | Awaited<ReturnType<typeof convex.query<typeof api.world.getDirectorContext>>>
    | Awaited<ReturnType<typeof convex.query<typeof api.world.getTranscriptDirectorContext>>>;
  try {
    context =
      directorMode === "transcript"
        ? await convex.query(api.world.getTranscriptDirectorContext, { adventureId, ...serverWriteArgs })
        : await convex.query(api.world.getDirectorContext, { adventureId, ...serverWriteArgs });
  } catch (error) {
    const worldLoadError = normalizeWorldLoadError(error);
    await logDirectorTurn({
      event: "director.turn.rejected",
      stage: "load_context",
      adventureId,
      requestSummary: {
        directorMode,
      },
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
      adventureId,
      requestSummary: {
        directorMode,
      },
      error: "The selected Adventure is missing required state.",
      httpStatus: 404,
      timingsMs: { total: elapsedSince(startedAt) },
    });
    return json<TurnResponse>(
      {
        ok: false,
        error: "The selected Adventure is missing required state. Seed or reload the Adventure and try again.",
      },
      404,
    );
  }

  const persistentContext = directorMode === "persistent" ? (context as DirectorContext) : null;
  const configResult = readLlmConfig();
  if (!configResult.ok) {
    await logDirectorTurn({
      event: "director.turn.rejected",
      stage: "read_config",
      adventureId,
      requestSummary: {
        directorMode,
      },
      error: configResult.error,
      httpStatus: 503,
      timingsMs: { total: elapsedSince(startedAt) },
    });
    return json<TurnResponse>({ ok: false, error: configResult.error }, 503);
  }

  const provider = providerName(configResult.config.baseUrl);

  const recorded =
    turnTrigger === "pass"
      ? await convex.mutation(api.world.recordPassTurn, {
          adventureId,
          ...serverWriteArgs,
        })
      : turnTrigger === "guide"
        ? await convex.mutation(api.world.recordGuideTurn, {
            adventureId,
            guidance: guideGuidance ?? "",
            ...serverWriteArgs,
          })
        : await convex.mutation(api.world.recordPlayerInput, {
            adventureId,
            input: input ?? "",
            ...serverWriteArgs,
          });
  if (!recorded.ok) {
    await logDirectorTurn({
      event: "director.turn.rejected",
      stage:
        turnTrigger === "pass"
          ? "record_pass_turn"
          : turnTrigger === "guide"
            ? "record_guide_turn"
            : "record_player_input",
      adventureId,
      provider,
      model: configResult.config.model,
      error: recorded.error,
      httpStatus: 409,
      timingsMs: { total: elapsedSince(startedAt) },
    });
    return json<TurnResponse>({ ok: false, error: recorded.error }, 409);
  }
  const commandId = ("commandId" in recorded ? recorded.commandId : undefined) as
    | Id<"commands">
    | undefined;

  const generationSettings = {
    ...configResult.config.generationSettings,
    responseFormat: "text" as const,
  };
  const directorRequest =
    directorMode === "transcript"
      ? buildTranscriptDirectorRequest(context as TranscriptDirectorContext, input, {
          generationSettings,
          promptGuidance: bodyResult.body.promptGuidance,
          turnTrigger,
        })
      : buildDirectorRequest(persistentContext ?? (context as unknown as DirectorContext), input, {
          generationSettings,
          promptGuidance: bodyResult.body.promptGuidance,
          turnTrigger,
          guideGuidance,
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
      adventureId,
      ...serverWriteArgs,
      turnId: recorded.turnId,
      ...commandArgs(commandId),
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
      adventureId,
      turnId: recorded.turnId,
      ...commandArgs(commandId),
      turnTrigger,
      playerInput: turnTrigger === "guide" ? undefined : input ?? undefined,
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
      adventureId,
      ...serverWriteArgs,
      turnId: recorded.turnId,
      ...commandArgs(commandId),
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
      adventureId,
      turnId: recorded.turnId,
      ...commandArgs(commandId),
      turnTrigger,
      playerInput: turnTrigger === "guide" ? undefined : input ?? undefined,
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
    adventureId,
    ...serverWriteArgs,
    turnId: recorded.turnId,
    ...commandArgs(commandId),
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
    adventureId,
    turnId: recorded.turnId,
    ...commandArgs(commandId),
    turnTrigger,
    playerInput: turnTrigger === "guide" ? undefined : input ?? undefined,
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
      turnTrigger,
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
      adventureId,
      ...serverWriteArgs,
      turnId: recorded.turnId,
      ...commandArgs(commandId),
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
      adventureId,
      turnId: recorded.turnId,
      ...commandArgs(commandId),
      turnTrigger,
      playerInput: turnTrigger === "guide" ? undefined : input ?? undefined,
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

  const extractionParsed = parseStateExtractionOutput(extractionRawOutput);
  if (!extractionParsed.ok) {
    await convex.mutation(api.world.recordNpcStateExtraction, {
      adventureId,
      ...serverWriteArgs,
      turnId: recorded.turnId,
      ...commandArgs(commandId),
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
      adventureId,
      turnId: recorded.turnId,
      ...commandArgs(commandId),
      turnTrigger,
      playerInput: turnTrigger === "guide" ? undefined : input ?? undefined,
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
  const movementValidated = validateActorMoves(
    extractionParsed.actorMoves,
    persistentContext.actors,
    persistentContext.knownLocations ?? [],
    turnTrigger === "guide" ? "" : input ?? "",
    parsed.output.narration,
  );
  await convex.mutation(api.world.recordNpcStateExtraction, {
    adventureId,
    ...serverWriteArgs,
    turnId: recorded.turnId,
    ...commandArgs(commandId),
    provider,
    model: configResult.config.model,
    requestSummary: extractionRequest.requestSummary,
    ...(extractionRawRequest !== undefined ? { rawRequest: extractionRawRequest } : {}),
    rawResponse: extractionRawOutput,
    parsedResponse: {
      npcUpdates: extractionParsed.npcUpdates,
      actorMoves: extractionParsed.actorMoves,
    },
    status: "success",
    acceptedUpdates: extractionValidated.acceptedUpdates,
    ignoredUpdates: extractionValidated.ignoredUpdates,
    acceptedMoves: movementValidated.acceptedMoves,
    ignoredMoves: movementValidated.ignoredMoves,
  });
  await logDirectorTurn({
    event: "director.turn.extraction",
    stage: "complete_extraction",
    adventureId,
    turnId: recorded.turnId,
    ...commandArgs(commandId),
    turnTrigger,
    playerInput: turnTrigger === "guide" ? undefined : input ?? undefined,
    provider,
    model: configResult.config.model,
    requestSummary: extractionRequest.requestSummary,
    rawRequest: extractionRequest.messages,
    status: "success",
    httpStatus: 200,
    rawResponse: extractionRawOutput,
    parsedResponse: {
      npcUpdates: extractionParsed.npcUpdates,
      actorMoves: extractionParsed.actorMoves,
    },
    acceptedUpdates: [...extractionValidated.acceptedUpdates, ...movementValidated.acceptedMoves],
    ignoredUpdates: [...extractionValidated.ignoredUpdates, ...movementValidated.ignoredMoves],
    timingsMs: {
      provider: elapsedSince(extractionStartedAt),
      total: elapsedSince(startedAt),
    },
  });

  return json<TurnResponse>({
    ok: true,
    narration: parsed.output.narration,
    acceptedUpdates: [...extractionValidated.acceptedUpdates, ...movementValidated.acceptedMoves],
    ignoredUpdates: [...extractionValidated.ignoredUpdates, ...movementValidated.ignoredMoves],
  });
}

function json<T>(body: T, status = 200) {
  return Response.json(body, { status });
}

function commandArgs(commandId: Id<"commands"> | undefined) {
  return commandId ? { commandId } : {};
}

function createConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!convexUrl) {
    return {
      ok: false as const,
      error: "NEXT_PUBLIC_CONVEX_URL is not configured, so the Game Master cannot persist turns.",
    };
  }
  return {
    ok: true as const,
    client: new ConvexHttpClient(convexUrl),
    requiresServerWriteToken: !isLocalUrl(convexUrl),
  };
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
