import type { DirectorMessage } from "./types";

export type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

type LlmEnv = Record<string, string | undefined>;

export type LlmConfigResult =
  | { ok: true; config: LlmConfig }
  | { ok: false; error: string };

export type OpenAICompatibleChatOptions = {
  config: LlmConfig;
  messages: DirectorMessage[];
  fetchImpl?: typeof fetch;
};

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly responseBody?: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export function readLlmConfig(env: LlmEnv = process.env): LlmConfigResult {
  const baseUrl = env.LLM_BASE_URL?.trim();
  const apiKey = env.LLM_API_KEY?.trim();
  const model = env.LLM_MODEL?.trim();

  const missing = [
    !baseUrl ? "LLM_BASE_URL" : null,
    !apiKey ? "LLM_API_KEY" : null,
    !model ? "LLM_MODEL" : null,
  ].filter((item): item is string => item !== null);

  if (missing.length > 0) {
    return {
      ok: false,
      error: `Configure ${missing.join(", ")} before sending Director turns.`,
    };
  }

  if (!baseUrl || !apiKey || !model) {
    return {
      ok: false,
      error: "Configure LLM_BASE_URL, LLM_API_KEY, LLM_MODEL before sending Director turns.",
    };
  }

  return { ok: true, config: { baseUrl, apiKey, model } };
}

export async function requestOpenAICompatibleChat({
  config,
  messages,
  fetchImpl = fetch,
}: OpenAICompatibleChatOptions): Promise<string> {
  const response = await fetchImpl(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new ProviderError(
      `LLM provider returned HTTP ${response.status}.`,
      response.status,
      responseText.slice(0, 2000),
    );
  }

  const parsed = parseProviderResponse(responseText);
  if (!parsed.ok) {
    throw new ProviderError(parsed.error, response.status, responseText.slice(0, 2000));
  }

  return parsed.content;
}

function parseProviderResponse(responseText: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    return { ok: false as const, error: "LLM provider response was not valid JSON." };
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.choices)) {
    return { ok: false as const, error: "LLM provider response did not include choices." };
  }

  const firstChoice = parsed.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    return { ok: false as const, error: "LLM provider response did not include a message." };
  }

  const content = firstChoice.message.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    return { ok: false as const, error: "LLM provider response message was empty." };
  }

  return { ok: true as const, content };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
