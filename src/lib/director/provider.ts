import type { DirectorGenerationSettingsSummary, DirectorMessage } from "./types";

export type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  generationSettings: DirectorGenerationSettingsSummary;
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
  const generationSettings = readGenerationSettings(env);

  const missing = [
    !baseUrl ? "LLM_BASE_URL" : null,
    !apiKey ? "LLM_API_KEY" : null,
    !model ? "LLM_MODEL" : null,
  ].filter((item): item is string => item !== null);

  if (missing.length > 0) {
    return {
      ok: false,
      error: `Configure ${missing.join(", ")} before sending Game Master turns.`,
    };
  }

  if (!generationSettings.ok) {
    return generationSettings;
  }

  if (!baseUrl || !apiKey || !model) {
    return {
      ok: false,
      error: "Configure LLM_BASE_URL, LLM_API_KEY, LLM_MODEL before sending Game Master turns.",
    };
  }

  return { ok: true, config: { baseUrl, apiKey, model, generationSettings: generationSettings.value } };
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
      temperature: config.generationSettings.temperature,
      ...(config.generationSettings.maxTokens !== undefined
        ? { max_tokens: config.generationSettings.maxTokens }
        : {}),
      ...(config.generationSettings.topP !== undefined ? { top_p: config.generationSettings.topP } : {}),
      ...(config.generationSettings.reasoningEffort !== undefined
        ? { reasoning_effort: config.generationSettings.reasoningEffort }
        : {}),
      ...(config.generationSettings.responseFormat === "json_object"
        ? { response_format: { type: "json_object" } }
        : {}),
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

function readGenerationSettings(env: LlmEnv):
  | { ok: true; value: DirectorGenerationSettingsSummary }
  | { ok: false; error: string } {
  const temperature = readOptionalNumber(env.LLM_TEMPERATURE, "LLM_TEMPERATURE", {
    min: 0,
    max: 2,
    integer: false,
  });
  if (!temperature.ok) {
    return temperature;
  }

  const maxTokens = readOptionalNumber(env.LLM_MAX_TOKENS, "LLM_MAX_TOKENS", {
    min: 1,
    max: 8000,
    integer: true,
  });
  if (!maxTokens.ok) {
    return maxTokens;
  }

  const topP = readOptionalNumber(env.LLM_TOP_P, "LLM_TOP_P", {
    min: 0,
    max: 1,
    integer: false,
    exclusiveMin: true,
  });
  if (!topP.ok) {
    return topP;
  }

  const reasoningEffort = readReasoningEffort(env.LLM_REASONING_EFFORT);
  if (!reasoningEffort.ok) {
    return reasoningEffort;
  }

  return {
    ok: true,
    value: {
      temperature: temperature.value ?? 0.7,
      ...(maxTokens.value !== undefined ? { maxTokens: maxTokens.value } : {}),
      ...(topP.value !== undefined ? { topP: topP.value } : {}),
      ...(reasoningEffort.value !== undefined ? { reasoningEffort: reasoningEffort.value } : {}),
      responseFormat: "json_object",
    },
  };
}

function readReasoningEffort(rawValue: string | undefined):
  | { ok: true; value?: NonNullable<DirectorGenerationSettingsSummary["reasoningEffort"]> }
  | { ok: false; error: string } {
  const trimmed = rawValue?.trim().toLowerCase();
  if (!trimmed) {
    return { ok: true };
  }

  if (["none", "low", "medium", "high", "max"].includes(trimmed)) {
    return {
      ok: true,
      value: trimmed as NonNullable<DirectorGenerationSettingsSummary["reasoningEffort"]>,
    };
  }

  return {
    ok: false,
    error: "LLM_REASONING_EFFORT must be one of none, low, medium, high, or max.",
  };
}

function readOptionalNumber(
  rawValue: string | undefined,
  name: string,
  {
    min,
    max,
    integer,
    exclusiveMin = false,
  }: { min: number; max: number; integer: boolean; exclusiveMin?: boolean },
): { ok: true; value?: number } | { ok: false; error: string } {
  const trimmed = rawValue?.trim();
  if (!trimmed) {
    return { ok: true };
  }

  const value = Number(trimmed);
  const meetsMin = exclusiveMin ? value > min : value >= min;
  if (!Number.isFinite(value) || !meetsMin || value > max || (integer && !Number.isInteger(value))) {
    const minText = exclusiveMin ? `greater than ${min}` : `at least ${min}`;
    const numberKind = integer ? "an integer" : "a";
    return {
      ok: false,
      error: `${name} must be ${numberKind} number ${minText} and no greater than ${max}.`,
    };
  }

  return { ok: true, value };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
