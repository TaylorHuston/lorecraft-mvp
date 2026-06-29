#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DIRECT_QUESTION_INPUT = "Mira, what do you know about the storm?";
const BASELINE_MIRA_FACTS = new Map([
  ["mood", "watchful"],
  ["status", "waiting near the chapel aisle"],
  ["memory", "Mira has not yet formed any meaningful memories of Taylor."],
]);

loadDotEnv(".env.local");
loadDotEnv(".env");

const options = parseArgs(process.argv.slice(2));
const baseUrl = options.baseUrl ?? process.env.LORECRAFT_PLAYTEST_BASE_URL ?? DEFAULT_BASE_URL;
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();

if (!convexUrl) {
  fail(
    "NEXT_PUBLIC_CONVEX_URL is required. Start the app with `npm run dev:debug` or configure .env.local.",
  );
}

const convex = new ConvexHttpClient(convexUrl);

console.log(`Transcript Director playtest target: ${baseUrl}`);
console.log("Expected server mode: LORECRAFT_DIRECTOR_MODE=transcript");

const worldId = await seedFreshWorld();
const before = await convex.query(api.world.getSnapshot, { worldId });
assertMiraFacts(before, "before");

const result = await submitTurn(baseUrl, worldId, DIRECT_QUESTION_INPUT);
if (typeof result.narration !== "string" || result.narration.trim().length === 0) {
  fail("Expected non-empty narration.");
}
if (result.acceptedUpdates.length > 0 || result.ignoredUpdates.length > 0) {
  fail("Expected transcript route response to have empty accepted/ignored updates.");
}

const after = await convex.query(api.world.getSnapshot, { worldId });
assertTranscriptSnapshot(after);

console.log("");
console.log("Transcript Director playtest passed.");
console.log(`- Narration: ${result.narration}`);

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

function assertTranscriptSnapshot(snapshot) {
  if (!snapshot) {
    fail("Convex snapshot was missing after playtest.");
  }

  const latestCall = snapshot.directorCalls[0];
  if (!latestCall) {
    fail("Expected a persisted Director call.");
  }
  if (latestCall.requestSummary?.directorMode !== "transcript") {
    fail(
      `Expected latest Director call mode to be transcript, got ${JSON.stringify(latestCall.requestSummary?.directorMode)}. Start the app with LORECRAFT_DIRECTOR_MODE=transcript.`,
    );
  }
  if (latestCall.requestSummary?.roomKey !== "transcript") {
    fail(`Expected latest Director call roomKey to be transcript, got ${JSON.stringify(latestCall.requestSummary?.roomKey)}.`);
  }
  if (latestCall.requestSummary?.actorKeys?.length !== 0 || latestCall.requestSummary?.npcFactKeys?.length !== 0) {
    fail("Expected transcript request summary to omit live actor and NPC fact context.");
  }
  if (latestCall.requestSummary?.outputContract !== "plain_prose") {
    fail("Expected latest Director call outputContract to be plain_prose.");
  }
  if (latestCall.requestSummary?.generationSettings?.responseFormat !== "text") {
    fail("Expected latest Director call generationSettings.responseFormat to be text.");
  }
  if (latestCall.acceptedUpdates.length > 0 || latestCall.ignoredUpdates.length > 0) {
    fail("Expected Director call to have empty accepted/ignored updates.");
  }
  if (latestCall.parsedResponse?.npcUpdates?.length !== 0) {
    fail("Expected parsed transcript response to have no npcUpdates.");
  }

  assertMiraFacts(snapshot, "after");
  if (snapshot.diffs.length > 0) {
    fail(`Expected no state diffs, found ${snapshot.diffs.length}.`);
  }
  const llmEvents = snapshot.events.filter((event) => event.source === "llm");
  if (llmEvents.length > 0) {
    fail(`Expected no LLM-authored world events, found ${llmEvents.length}.`);
  }
  const latestTurn = snapshot.turns[0];
  if (!latestTurn || latestTurn.status !== "succeeded") {
    fail("Expected latest turn to be persisted as succeeded.");
  }
  if (latestTurn.narrationCount !== 1 || latestTurn.eventCount !== 0 || latestTurn.stateDiffCount !== 0) {
    fail(
      `Expected latest turn to have one narration and no events/diffs, got narration=${latestTurn.narrationCount}, events=${latestTurn.eventCount}, diffs=${latestTurn.stateDiffCount}.`,
    );
  }
}

function assertMiraFacts(snapshot, label) {
  if (!snapshot) {
    fail(`Convex snapshot was missing ${label}.`);
  }

  for (const [key, expectedValue] of BASELINE_MIRA_FACTS) {
    const fact = snapshot.facts.find((item) => item.subjectId === "actor:mira" && item.key === key);
    if (!fact) {
      fail(`Missing Mira ${key} fact ${label}.`);
    }
    if (fact.value !== expectedValue) {
      fail(`Expected Mira ${key} to remain ${JSON.stringify(expectedValue)} ${label}, got ${JSON.stringify(fact.value)}.`);
    }
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
  console.log(`Usage: npm run playtest:director:transcript -- [--base-url ${DEFAULT_BASE_URL}] [--timeout-ms 180000]

Runs a local transcript-only Director smoke playtest against a running Lorecraft app:
1. Seeds a fresh demo world through Convex.
2. Sends a direct Mira question through /api/director/turn.
3. Verifies plain-prose transcript mode metadata, persisted narration/debug records, and no NPC fact/state diff/LLM event mutation.

Start the app with LORECRAFT_DIRECTOR_MODE=transcript before running this check.
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
  console.error(`Transcript Director playtest failed: ${message}`);
  process.exit(1);
}
