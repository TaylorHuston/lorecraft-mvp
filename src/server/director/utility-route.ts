import "server-only";

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { writeDirectorDebugLog } from "@/lib/director/debug-log";
import { buildLookRequest, resolveLookTarget } from "@/lib/director/look-prompt";
import { parsePlainProseDirectorOutput } from "@/lib/director/output";
import { ProviderError, readLlmConfig, requestOpenAICompatibleChat } from "@/lib/director/provider";
import { helpText, parseSlashCommand } from "@/lib/director/slash-command";
import { normalizeWorldLoadError } from "@/lib/director/turn-errors";
import type { DirectorContext } from "@/lib/director/types";
import { isLocalDirectorRequest, isLocalUrl } from "./turn-request";
import { readDirectorUtilityBody } from "./utility-request";

type UtilityResponse =
  | {
      ok: true;
      message: string;
      command: "help" | "look";
    }
  | {
      ok: false;
      error: string;
    };
type UtilityRecordArgs = {
  adventureId: Id<"adventures">;
  serverWriteToken?: string;
  input: string;
  command: string;
  target?: string;
  text: string;
  source: "engine" | "llm";
  status: "success" | "error";
  provider?: string;
  model?: string;
};

export async function POST(request: Request) {
  const startedAt = performance.now();
  if (!isLocalDirectorRequest(request)) {
    return json<UtilityResponse>(
      {
        ok: false,
        error: "Director utility commands are only enabled for local development requests by default.",
      },
      403,
    );
  }

  const bodyResult = await readDirectorUtilityBody(request);
  if (!bodyResult.ok) {
    return json<UtilityResponse>({ ok: false, error: bodyResult.error }, 400);
  }

  const parsedCommand = parseSlashCommand(bodyResult.body.input);
  const convexResult = createConvexClient();
  if (!convexResult.ok) {
    return json<UtilityResponse>({ ok: false, error: convexResult.error }, 500);
  }

  const serverWriteToken = process.env.LORECRAFT_SERVER_WRITE_TOKEN?.trim() || undefined;
  if (convexResult.requiresServerWriteToken && !serverWriteToken) {
    return json<UtilityResponse>(
      {
        ok: false,
        error: "LORECRAFT_SERVER_WRITE_TOKEN is required when utility commands use a remote Convex deployment.",
      },
      503,
    );
  }
  const serverWriteArgs = serverWriteToken ? { serverWriteToken } : {};

  if (!parsedCommand.ok) {
    const message = parsedCommand.error;
    const recorded = await recordUtility(convexResult.client, {
      adventureId: bodyResult.body.adventureId,
      ...serverWriteArgs,
      input: bodyResult.body.input,
      command: parsedCommand.command ?? "unknown",
      text: message,
      source: "engine",
      status: "error",
    });
    if (!recorded.ok) {
      return utilityRecordFailureResponse(recorded);
    }
    return json<UtilityResponse>({ ok: false, error: message }, 200);
  }

  if (parsedCommand.command === "help") {
    const message = helpText();
    const recorded = await recordUtility(convexResult.client, {
      adventureId: bodyResult.body.adventureId,
      ...serverWriteArgs,
      input: parsedCommand.rawInput,
      command: "help",
      text: message,
      source: "engine",
      status: "success",
    });
    if (!recorded.ok) {
      return utilityRecordFailureResponse(recorded);
    }
    return json<UtilityResponse>({ ok: true, command: "help", message });
  }

  let context: DirectorContext | null;
  try {
    context = await convexResult.client.query(api.world.getDirectorContext, {
      adventureId: bodyResult.body.adventureId,
      ...serverWriteArgs,
    });
  } catch (error) {
    const worldLoadError = normalizeWorldLoadError(error);
    return json<UtilityResponse>({ ok: false, error: worldLoadError.clientMessage }, worldLoadError.httpStatus);
  }

  if (!context) {
    return json<UtilityResponse>(
      {
        ok: false,
        error: "The selected Adventure is missing required state. Seed or reload the Adventure and try again.",
      },
      404,
    );
  }

  const targetResult = resolveLookTarget(context, parsedCommand.target);
  if (!targetResult.ok) {
    const recorded = await recordUtility(convexResult.client, {
      adventureId: bodyResult.body.adventureId,
      ...serverWriteArgs,
      input: parsedCommand.rawInput,
      command: "look",
      ...(parsedCommand.target ? { target: parsedCommand.target } : {}),
      text: targetResult.text,
      source: "engine",
      status: "error",
    });
    if (!recorded.ok) {
      return utilityRecordFailureResponse(recorded);
    }
    return json<UtilityResponse>({ ok: true, command: "look", message: targetResult.text });
  }

  const configResult = readLlmConfig();
  if (!configResult.ok) {
    return json<UtilityResponse>({ ok: false, error: configResult.error }, 503);
  }

  const provider = providerName(configResult.config.baseUrl);
  const generationSettings = {
    ...configResult.config.generationSettings,
    responseFormat: "text" as const,
  };
  const lookRequest = buildLookRequest(context, targetResult.target, {
    rawInput: parsedCommand.rawInput,
    generationSettings,
  });
  let rawOutput: string;
  const providerStartedAt = performance.now();
  try {
    rawOutput = await requestOpenAICompatibleChat({
      config: { ...configResult.config, generationSettings },
      messages: lookRequest.messages,
    });
  } catch (error) {
    const providerError = normalizeProviderError(error);
    const recorded = await recordUtility(convexResult.client, {
      adventureId: bodyResult.body.adventureId,
      ...serverWriteArgs,
      input: parsedCommand.rawInput,
      command: "look",
      ...(parsedCommand.target ? { target: parsedCommand.target } : {}),
      text: providerError.message,
      source: "engine",
      status: "error",
      provider,
      model: configResult.config.model,
    });
    if (!recorded.ok) {
      return utilityRecordFailureResponse(recorded);
    }
    await logUtility({
      event: "director.utility.look",
      stage: "provider_request",
      adventureId: bodyResult.body.adventureId,
      provider,
      model: configResult.config.model,
      requestSummary: lookRequest.requestSummary,
      rawRequest: lookRequest.messages,
      rawResponse: providerError.rawResponse,
      status: "provider_error",
      error: providerError.message,
      httpStatus: 502,
      timingsMs: { provider: elapsedSince(providerStartedAt), total: elapsedSince(startedAt) },
    });
    return json<UtilityResponse>({ ok: false, error: providerError.message }, 502);
  }

  const parsedOutput = parsePlainProseDirectorOutput(rawOutput);
  if (!parsedOutput.ok) {
    const recorded = await recordUtility(convexResult.client, {
      adventureId: bodyResult.body.adventureId,
      ...serverWriteArgs,
      input: parsedCommand.rawInput,
      command: "look",
      ...(parsedCommand.target ? { target: parsedCommand.target } : {}),
      text: parsedOutput.error,
      source: "engine",
      status: "error",
      provider,
      model: configResult.config.model,
    });
    if (!recorded.ok) {
      return utilityRecordFailureResponse(recorded);
    }
    await logUtility({
      event: "director.utility.look",
      stage: "parse_utility_output",
      adventureId: bodyResult.body.adventureId,
      provider,
      model: configResult.config.model,
      requestSummary: lookRequest.requestSummary,
      rawRequest: lookRequest.messages,
      rawResponse: rawOutput,
      status: "invalid_output",
      error: parsedOutput.error,
      httpStatus: 422,
      timingsMs: { provider: elapsedSince(providerStartedAt), total: elapsedSince(startedAt) },
    });
    return json<UtilityResponse>({ ok: false, error: parsedOutput.error }, 422);
  }

  const recorded = await recordUtility(convexResult.client, {
    adventureId: bodyResult.body.adventureId,
    ...serverWriteArgs,
    input: parsedCommand.rawInput,
    command: "look",
    ...(parsedCommand.target ? { target: parsedCommand.target } : {}),
    text: parsedOutput.output.narration,
    source: "llm",
    status: "success",
    provider,
    model: configResult.config.model,
  });
  if (!recorded.ok) {
    return utilityRecordFailureResponse(recorded);
  }
  await logUtility({
    event: "director.utility.look",
    stage: "complete_utility_look",
    adventureId: bodyResult.body.adventureId,
    provider,
    model: configResult.config.model,
    requestSummary: lookRequest.requestSummary,
    rawRequest: lookRequest.messages,
    rawResponse: rawOutput,
    parsedResponse: parsedOutput.output,
    status: "success",
    httpStatus: 200,
    timingsMs: { provider: elapsedSince(providerStartedAt), total: elapsedSince(startedAt) },
  });

  return json<UtilityResponse>({
    ok: true,
    command: "look",
    message: parsedOutput.output.narration,
  });
}

function json<T>(body: T, status = 200) {
  return Response.json(body, { status });
}

function createConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!convexUrl) {
    return {
      ok: false as const,
      error: "NEXT_PUBLIC_CONVEX_URL is not configured, so utility commands cannot persist.",
    };
  }
  return {
    ok: true as const,
    client: new ConvexHttpClient(convexUrl),
    requiresServerWriteToken: !isLocalUrl(convexUrl),
  };
}

async function recordUtility(
  convex: ConvexHttpClient,
  args: UtilityRecordArgs,
) {
  let result: Awaited<ReturnType<typeof convex.mutation<typeof api.world.recordUtilityMessage>>>;
  try {
    result = await convex.mutation(api.world.recordUtilityMessage, args);
  } catch (error) {
    const worldLoadError = normalizeWorldLoadError(error);
    return {
      ok: false as const,
      error: worldLoadError.clientMessage,
      httpStatus: worldLoadError.httpStatus,
    };
  }

  if (!result.ok) {
    return {
      ok: false as const,
      error: utilityRecordFailureMessage(result.error),
      httpStatus: utilityRecordFailureStatus(result.error),
    };
  }
  return { ok: true as const, utilityMessageId: result.utilityMessageId };
}

function utilityRecordFailureResponse(recorded: {
  ok: false;
  error: string;
  httpStatus: 400 | 404 | 500 | 503;
}) {
  return json<UtilityResponse>({ ok: false, error: recorded.error }, recorded.httpStatus);
}

function utilityRecordFailureMessage(error: string) {
  if (error === "Adventure could not be found.") {
    return "The selected Adventure is missing required state. Seed or reload the Adventure and try again.";
  }
  return error;
}

function utilityRecordFailureStatus(error: string): 404 | 500 | 503 {
  if (error === "Adventure could not be found.") {
    return 404;
  }
  if (error === "Server write access is not configured.") {
    return 503;
  }
  return 500;
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

async function logUtility(entry: Parameters<typeof writeDirectorDebugLog>[0]) {
  await writeDirectorDebugLog(entry);
}

function elapsedSince(start: number) {
  return Math.round(performance.now() - start);
}
