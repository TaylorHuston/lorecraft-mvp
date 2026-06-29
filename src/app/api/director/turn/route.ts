import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { writeDirectorDebugLog } from "@/lib/director/debug-log";
import { buildDirectorRequest } from "@/lib/director/prompt";
import {
  applySceneBeatPersistenceBoundary,
  parseDirectorOutput,
  validateNpcUpdates,
} from "@/lib/director/output";
import {
  ProviderError,
  readLlmConfig,
  requestOpenAICompatibleChat,
} from "@/lib/director/provider";
import { normalizeWorldLoadError } from "@/lib/director/turn-errors";

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

  const configResult = readLlmConfig();
  if (!configResult.ok) {
    await logDirectorTurn({
      event: "director.turn.rejected",
      stage: "read_config",
      worldId: bodyResult.body.worldId,
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

  let context: Awaited<ReturnType<typeof convex.query<typeof api.world.getDirectorContext>>>;
  try {
    context = await convex.query(api.world.getDirectorContext, { worldId });
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

  const directorRequest = buildDirectorRequest(context, input, {
    generationSettings: configResult.config.generationSettings,
    promptGuidance: bodyResult.body.promptGuidance,
  });
  let rawOutput: string;
  const providerStartedAt = performance.now();
  try {
    rawOutput = await requestOpenAICompatibleChat({
      config: configResult.config,
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
      rawResponse: providerError.rawResponse ?? "",
      status: "provider_error",
      acceptedUpdates: [],
      ignoredUpdates: [],
      error: providerError.message,
    });
    await logDirectorTurn({
      event: "director.turn.provider_error",
      stage: "provider_request",
      worldId,
      turnId: recorded.turnId,
      commandId: recorded.commandId,
      provider,
      model: configResult.config.model,
      requestSummary: directorRequest.requestSummary,
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

  const parsed = parseDirectorOutput(rawOutput);
  if (!parsed.ok) {
    await convex.mutation(api.world.completeDirectorTurn, {
      worldId,
      turnId: recorded.turnId,
      commandId: recorded.commandId,
      provider,
      model: configResult.config.model,
      requestSummary: directorRequest.requestSummary,
      rawResponse: rawOutput,
      status: "invalid_output",
      acceptedUpdates: [],
      ignoredUpdates: [],
      error: parsed.error,
    });
    await logDirectorTurn({
      event: "director.turn.invalid_output",
      stage: "parse_director_output",
      worldId,
      turnId: recorded.turnId,
      commandId: recorded.commandId,
      provider,
      model: configResult.config.model,
      requestSummary: directorRequest.requestSummary,
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

  const validated = applySceneBeatPersistenceBoundary(
    validateNpcUpdates(parsed.output.npcUpdates, context.actors),
    directorRequest.requestSummary.requiredSceneBeat,
  );
  await convex.mutation(api.world.completeDirectorTurn, {
    worldId,
    turnId: recorded.turnId,
    commandId: recorded.commandId,
    provider,
    model: configResult.config.model,
    requestSummary: directorRequest.requestSummary,
    rawResponse: rawOutput,
    parsedResponse: parsed.output,
    status: "success",
    acceptedUpdates: validated.acceptedUpdates,
    ignoredUpdates: validated.ignoredUpdates,
    narration: parsed.output.narration,
  });
  await logDirectorTurn({
    event: "director.turn.completed",
    stage: "complete_director_turn",
    worldId,
    turnId: recorded.turnId,
    commandId: recorded.commandId,
    provider,
    model: configResult.config.model,
    requestSummary: directorRequest.requestSummary,
    status: "success",
    httpStatus: 200,
    rawResponse: rawOutput,
    acceptedUpdateCount: validated.acceptedUpdates.length,
    ignoredUpdateCount: validated.ignoredUpdates.length,
    timingsMs: {
      provider: elapsedSince(providerStartedAt),
      total: elapsedSince(startedAt),
    },
  });

  return json<TurnResponse>({
    ok: true,
    narration: parsed.output.narration,
    acceptedUpdates: validated.acceptedUpdates,
    ignoredUpdates: validated.ignoredUpdates,
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

  if (typeof parsed.input !== "string" || parsed.input.trim().length === 0) {
    return { ok: false as const, error: "Narrative input is required." };
  }

  const promptGuidance = readPromptGuidance(parsed.promptGuidance);
  if (!promptGuidance.ok) {
    return promptGuidance;
  }

  return {
    ok: true as const,
    body: {
      worldId: parsed.worldId as Id<"worlds">,
      input: parsed.input.trim(),
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
      error: "NEXT_PUBLIC_CONVEX_URL is not configured, so the Director cannot persist turns.",
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
