import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { buildDirectorRequest } from "@/lib/director/prompt";
import { parseDirectorOutput, validateNpcUpdates } from "@/lib/director/output";
import {
  ProviderError,
  readLlmConfig,
  requestOpenAICompatibleChat,
} from "@/lib/director/provider";

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
  const bodyResult = await readBody(request);
  if (!bodyResult.ok) {
    return json<TurnResponse>({ ok: false, error: bodyResult.error }, 400);
  }

  const configResult = readLlmConfig();
  if (!configResult.ok) {
    return json<TurnResponse>({ ok: false, error: configResult.error }, 503);
  }

  const convexResult = createConvexClient();
  if (!convexResult.ok) {
    return json<TurnResponse>({ ok: false, error: convexResult.error }, 500);
  }

  const { worldId, input } = bodyResult.body;
  const convex = convexResult.client;
  const provider = providerName(configResult.config.baseUrl);

  const context = await convex.query(api.world.getDirectorContext, { worldId });
  if (!context) {
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
    return json<TurnResponse>({ ok: false, error: recorded.error }, 409);
  }

  const directorRequest = buildDirectorRequest(context, input);
  let rawOutput: string;
  try {
    rawOutput = await requestOpenAICompatibleChat({
      config: configResult.config,
      messages: directorRequest.messages,
    });
  } catch (error) {
    const providerError = normalizeProviderError(error);
    await convex.mutation(api.world.completeDirectorTurn, {
      worldId,
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
    return json<TurnResponse>({ ok: false, error: providerError.message }, 502);
  }

  const parsed = parseDirectorOutput(rawOutput);
  if (!parsed.ok) {
    await convex.mutation(api.world.completeDirectorTurn, {
      worldId,
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
    return json<TurnResponse>({ ok: false, error: parsed.error }, 422);
  }

  const validated = validateNpcUpdates(parsed.output.npcUpdates, context.actors);
  await convex.mutation(api.world.completeDirectorTurn, {
    worldId,
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

  return {
    ok: true as const,
    body: {
      worldId: parsed.worldId as Id<"worlds">,
      input: parsed.input.trim(),
    },
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
