#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DIRECT_QUESTION_INPUT = "I ask Mira what she knows about the storm.";
const PLAIN_ACTION_INPUT = "I jump.";

loadDotEnv(".env.local");
loadDotEnv(".env");

const options = parseArgs(process.argv.slice(2));
const baseUrl = options.baseUrl ?? process.env.LORECRAFT_PLAYTEST_BASE_URL ?? DEFAULT_BASE_URL;
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();

if (!convexUrl) {
  fail("NEXT_PUBLIC_CONVEX_URL is required. Start the app with `npm run dev` or configure .env.local.");
}

const convex = new ConvexHttpClient(convexUrl);

console.log(`Director playtest target: ${baseUrl}`);

const worldId = await seedFreshWorld();
const directQuestion = await submitTurn(baseUrl, worldId, DIRECT_QUESTION_INPUT);
assertDirectQuestion(directQuestion);

const plainAction = await submitTurn(baseUrl, worldId, PLAIN_ACTION_INPUT);
assertPlainAction(plainAction);

const snapshot = await convex.query(api.world.getSnapshot, { worldId });
assertSnapshot(snapshot);

console.log("");
console.log("Director playtest passed.");
console.log(`- Direct question narration: ${directQuestion.narration}`);
console.log(`- Plain action narration: ${plainAction.narration}`);

async function seedFreshWorld() {
  try {
    return await convex.mutation(api.world.seedDemoWorld, {});
  } catch (error) {
    fail(
      `Could not seed a fresh Convex world at ${convexUrl}. Is Convex running? ${errorMessage(error)}`,
    );
  }
}

async function submitTurn(targetBaseUrl, worldId, input) {
  let response;
  try {
    response = await fetch(`${targetBaseUrl.replace(/\/$/, "")}/api/director/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worldId, input }),
      signal: AbortSignal.timeout(options.timeoutMs),
    });
  } catch (error) {
    fail(`Could not reach Director route at ${targetBaseUrl}. Is Next running? ${errorMessage(error)}`);
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    fail(`Director route returned non-JSON response with HTTP ${response.status}: ${errorMessage(error)}`);
  }

  if (!response.ok || !body.ok) {
    fail(`Director turn failed for "${input}" with HTTP ${response.status}: ${body.error ?? "unknown error"}`);
  }

  return body;
}

function assertDirectQuestion(result) {
  assertTextIncludesAny(result.narration, ["'", "\"", "says", "asks", "warns", "answers", "refuses"], {
    label: "direct question narration",
    message:
      "Expected the direct Mira question to include a concrete response, dialogue, refusal, warning, answer, or counter-question.",
  });
}

function assertPlainAction(result) {
  if (result.acceptedUpdates.length > 0) {
    fail(
      `Expected plain action to avoid durable NPC updates, but accepted ${result.acceptedUpdates.length}: ${JSON.stringify(result.acceptedUpdates)}`,
    );
  }
}

function assertSnapshot(snapshot) {
  if (!snapshot) {
    fail("Convex snapshot was missing after playtest.");
  }

  const calls = snapshot.directorCalls.slice(0, 2);
  if (calls.length < 2) {
    fail(`Expected at least 2 Director calls in snapshot, found ${calls.length}.`);
  }

  const plainActionCall = calls[0];
  const directQuestionCall = calls[1];
  assertSceneBeat(plainActionCall.requestSummary, {
    kind: "trivial_player_action",
    expectsNpcResponse: false,
    allowsNpcUpdates: false,
  });
  assertSceneBeat(directQuestionCall.requestSummary, {
    kind: "direct_npc_question",
    expectsNpcResponse: true,
    allowsNpcUpdates: true,
    targetActorKey: "mira",
  });

  for (const call of calls) {
    const summary = call.requestSummary;
    assertArrayIncludes(summary.promptComponentKeys, "currentTurn", "promptComponentKeys");
    assertArrayIncludes(summary.promptComponentKeys, "hiddenNpcKnowledge", "promptComponentKeys");
    assertArrayIncludes(summary.readOnlyKnowledgeKeys, "mira.knows_about_storm", "readOnlyKnowledgeKeys");
    if (summary.generationSettings?.responseFormat !== "json_object") {
      fail("Expected generationSettings.responseFormat to be json_object in Director request summary.");
    }
  }
}

function assertSceneBeat(summary, expected) {
  if (!summary?.requiredSceneBeat) {
    fail("Director request summary is missing requiredSceneBeat.");
  }

  for (const [key, value] of Object.entries(expected)) {
    if (summary.requiredSceneBeat[key] !== value) {
      fail(
        `Expected requiredSceneBeat.${key} to be ${JSON.stringify(value)}, got ${JSON.stringify(summary.requiredSceneBeat[key])}.`,
      );
    }
  }
}

function assertTextIncludesAny(text, fragments, { label, message }) {
  if (typeof text !== "string" || !fragments.some((fragment) => text.toLowerCase().includes(fragment))) {
    fail(`${message}\n${label}: ${text}`);
  }
}

function assertArrayIncludes(value, expected, label) {
  if (!Array.isArray(value) || !value.includes(expected)) {
    fail(`Expected ${label} to include ${expected}. Got ${JSON.stringify(value)}.`);
  }
}

function parseArgs(args) {
  const parsed = {
    baseUrl: undefined,
    timeoutMs: 180_000,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--base-url") {
      parsed.baseUrl = requiredValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--timeout-ms") {
      parsed.timeoutMs = Number(requiredValue(args, index, arg));
      if (!Number.isInteger(parsed.timeoutMs) || parsed.timeoutMs < 1000) {
        fail("--timeout-ms must be an integer number of milliseconds, at least 1000.");
      }
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    fail(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function requiredValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    fail(`${flag} requires a value.`);
  }
  return value;
}

function printHelp() {
  console.log(`Usage: npm run playtest:director -- [--base-url ${DEFAULT_BASE_URL}] [--timeout-ms 180000]

Runs a local Director smoke playtest against a running Lorecraft app:
1. Seeds a fresh demo world through Convex.
2. Sends a direct Mira question through /api/director/turn.
3. Sends a plain action through /api/director/turn.
4. Verifies narration, durable update behavior, and Director debug metadata.
`);
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

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function fail(message) {
  console.error("");
  console.error(`Director playtest failed: ${message}`);
  process.exit(1);
}
