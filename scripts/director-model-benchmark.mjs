#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";

const DEFAULT_LOG_PATH = "logs/director-debug.jsonl";
const DEFAULT_BASE_URL = "http://100.102.65.3:11434/v1";
const DEFAULT_MODELS = ["gemma4:31b", "gemma4:26b", "gemma4:26b-mlx", "llama3.1:8b"];
const DEFAULT_OUT = "logs/director-model-benchmark.json";

loadDotEnv(".env.local");
loadDotEnv(".env");

const options = parseArgs(process.argv.slice(2));
const rawRequest = readRawRequest(options.logPath);
const results = [];

console.log("Director model benchmark");
console.log(`- Base URL: ${options.baseUrl}`);
console.log(`- Models: ${options.models.join(", ")}`);
console.log(`- Runs per model: ${options.runs}`);
console.log(`- Prompt chars: ${rawRequest.reduce((sum, message) => sum + message.content.length, 0)}`);
console.log(`- Temperature: ${options.temperature}`);
console.log(`- Max tokens: ${options.maxTokens}`);
console.log(`- Reasoning effort: ${options.reasoningEffort}`);
console.log("");

for (const model of options.models) {
  for (let run = 1; run <= options.runs; run += 1) {
    const result = await runBenchmark({ model, run, messages: rawRequest, options });
    results.push(result);
    printResult(result);
  }
}

const summary = {
  createdAt: new Date().toISOString(),
  baseUrl: options.baseUrl,
  promptSource: options.logPath,
  promptChars: rawRequest.reduce((sum, message) => sum + message.content.length, 0),
  temperature: options.temperature,
  maxTokens: options.maxTokens,
  topP: options.topP,
  reasoningEffort: options.reasoningEffort,
  runs: options.runs,
  results,
};

writeJson(options.outPath, summary);
console.log("");
console.log(`Wrote ${options.outPath}`);

async function runBenchmark({ model, run, messages, options }) {
  const startedAt = performance.now();
  let httpStatus = 0;
  let rawProviderResponse = "";

  try {
    const response = await fetch(`${options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        reasoning_effort: options.reasoningEffort,
      }),
      signal: AbortSignal.timeout(options.timeoutMs),
    });
    httpStatus = response.status;
    rawProviderResponse = await response.text();

    if (!response.ok) {
      return {
        model,
        run,
        ok: false,
        httpStatus,
        elapsedMs: Math.round(performance.now() - startedAt),
        error: `HTTP ${response.status}`,
        rawProviderResponse: rawProviderResponse.slice(0, 2000),
      };
    }

    const parsed = JSON.parse(rawProviderResponse);
    const firstChoice = parsed?.choices?.[0];
    const content = firstChoice?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      return {
        model,
        run,
        ok: false,
        httpStatus,
        elapsedMs: Math.round(performance.now() - startedAt),
        error: "Provider returned empty message content.",
        rawProviderResponse: rawProviderResponse.slice(0, 2000),
      };
    }

    return {
      model,
      run,
      ok: true,
      httpStatus,
      elapsedMs: Math.round(performance.now() - startedAt),
      finishReason: firstChoice?.finish_reason,
      outputChars: content.length,
      outputPreview: content.slice(0, 800),
      output: content,
    };
  } catch (error) {
    return {
      model,
      run,
      ok: false,
      httpStatus,
      elapsedMs: Math.round(performance.now() - startedAt),
      error: errorMessage(error),
      rawProviderResponse: rawProviderResponse.slice(0, 2000),
    };
  }
}

function printResult(result) {
  const seconds = (result.elapsedMs / 1000).toFixed(1);
  if (!result.ok) {
    console.log(`${result.model} run ${result.run}: failed in ${seconds}s (${result.error})`);
    return;
  }

  console.log(`${result.model} run ${result.run}: ${seconds}s, ${result.outputChars} chars`);
  console.log(indent(result.outputPreview.trim()));
  console.log("");
}

function readRawRequest(logPath) {
  const resolved = resolve(process.cwd(), logPath);
  if (!existsSync(resolved)) {
    fail(`Log file not found: ${resolved}`);
  }

  const lines = readFileSync(resolved, "utf8").trim().split(/\r?\n/).reverse();
  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    const record = JSON.parse(line);
    if (Array.isArray(record.rawRequest) && record.rawRequest.length > 0) {
      return record.rawRequest.map((message) => ({
        role: message.role,
        content: message.content,
      }));
    }
  }

  fail(`No rawRequest found in ${resolved}. Start with npm run dev:debug and make at least one turn.`);
}

function parseArgs(args) {
  const parsed = {
    baseUrl: process.env.LLM_BASE_URL?.trim() || DEFAULT_BASE_URL,
    apiKey: process.env.LLM_API_KEY?.trim() || "ollama",
    models: DEFAULT_MODELS,
    logPath: DEFAULT_LOG_PATH,
    outPath: DEFAULT_OUT,
    runs: 1,
    temperature: 0,
    maxTokens: 500,
    topP: 1,
    reasoningEffort: "none",
    timeoutMs: 180_000,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--base-url") {
      parsed.baseUrl = requiredValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--api-key") {
      parsed.apiKey = requiredValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--models") {
      parsed.models = requiredValue(args, index, arg).split(",").map((model) => model.trim()).filter(Boolean);
      index += 1;
      continue;
    }
    if (arg === "--log") {
      parsed.logPath = requiredValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--out") {
      parsed.outPath = requiredValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--runs") {
      parsed.runs = readInteger(requiredValue(args, index, arg), arg, 1, 20);
      index += 1;
      continue;
    }
    if (arg === "--temperature") {
      parsed.temperature = readNumber(requiredValue(args, index, arg), arg, 0, 2);
      index += 1;
      continue;
    }
    if (arg === "--max-tokens") {
      parsed.maxTokens = readInteger(requiredValue(args, index, arg), arg, 1, 8000);
      index += 1;
      continue;
    }
    if (arg === "--top-p") {
      parsed.topP = readNumber(requiredValue(args, index, arg), arg, 0, 1);
      index += 1;
      continue;
    }
    if (arg === "--reasoning-effort") {
      parsed.reasoningEffort = readReasoningEffort(requiredValue(args, index, arg));
      index += 1;
      continue;
    }
    if (arg === "--timeout-ms") {
      parsed.timeoutMs = readInteger(requiredValue(args, index, arg), arg, 1000, 600_000);
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    fail(`Unknown argument: ${arg}`);
  }

  if (parsed.models.length === 0) {
    fail("--models must include at least one model.");
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage: npm run benchmark:director-models -- [options]

Benchmarks the latest logged Lorecraft Game Master raw request against multiple OpenAI-compatible models.

Options:
  --models gemma4:31b,gemma4:26b,gemma4:26b-mlx,llama3.1:8b
  --base-url http://100.102.65.3:11434/v1
  --log logs/director-debug.jsonl
  --out logs/director-model-benchmark.json
  --runs 1
  --temperature 0
  --max-tokens 500
  --reasoning-effort none
  --timeout-ms 180000
`);
}

function writeJson(path, value) {
  const resolved = resolve(process.cwd(), path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function requiredValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    fail(`${flag} requires a value.`);
  }
  return value;
}

function readInteger(value, flag, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    fail(`${flag} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function readNumber(value, flag, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    fail(`${flag} must be a number between ${min} and ${max}.`);
  }
  return parsed;
}

function readReasoningEffort(value) {
  const normalized = value.trim().toLowerCase();
  if (!["none", "low", "medium", "high", "max"].includes(normalized)) {
    fail("--reasoning-effort must be one of none, low, medium, high, or max.");
  }
  return normalized;
}

function loadDotEnv(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquote(trimmed.slice(separatorIndex + 1).trim());
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function indent(value) {
  return value.split(/\r?\n/).map((line) => `  ${line}`).join("\n");
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function fail(message) {
  console.error(`Director model benchmark failed: ${message}`);
  process.exit(1);
}
