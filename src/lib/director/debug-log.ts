import { mkdir, appendFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";

type DebugLogEnv = Record<string, string | undefined>;

export type DirectorDebugLogEntry = {
  event: string;
  stage: string;
  adventureId?: string;
  worldId?: string;
  worldVersionId?: string;
  turnId?: string;
  commandId?: string;
  turnTrigger?: "act" | "pass";
  playerInput?: string;
  provider?: string;
  model?: string;
  requestSummary?: unknown;
  rawRequest?: unknown;
  status?: string;
  httpStatus?: number;
  error?: string;
  rawResponse?: string;
  parsedResponse?: unknown;
  narration?: string;
  acceptedUpdates?: unknown[];
  ignoredUpdates?: unknown[];
  acceptedUpdateCount?: number;
  ignoredUpdateCount?: number;
  timingsMs?: Record<string, number>;
};

type WriteDirectorDebugLogOptions = {
  env?: DebugLogEnv;
  cwd?: string;
  now?: () => Date;
  mkdirImpl?: typeof mkdir;
  appendFileImpl?: typeof appendFile;
};

export async function writeDirectorDebugLog(
  entry: DirectorDebugLogEntry,
  {
    env = process.env,
    cwd = process.cwd(),
    now = () => new Date(),
    mkdirImpl = mkdir,
    appendFileImpl = appendFile,
  }: WriteDirectorDebugLogOptions = {},
) {
  if (!debugLogEnabled(env)) {
    return false;
  }

  const filePath = debugLogPath(env, cwd);
  const record = buildDirectorDebugLogRecord(entry, { env, now });

  try {
    await mkdirImpl(dirname(filePath), { recursive: true });
    await appendFileImpl(filePath, `${JSON.stringify(record)}\n`, "utf8");
    return true;
  } catch (error) {
    console.warn("Failed to write Lorecraft Game Master debug log.", error);
    return false;
  }
}

export function buildDirectorDebugLogRecord(
  entry: DirectorDebugLogEntry,
  { env = process.env, now = () => new Date() }: Pick<WriteDirectorDebugLogOptions, "env" | "now"> = {},
) {
  const rawResponseLength =
    typeof entry.rawResponse === "string" ? entry.rawResponse.length : undefined;
  const rawRequestMessageCount = Array.isArray(entry.rawRequest)
    ? entry.rawRequest.length
    : undefined;

  return omitUndefined({
    ts: now().toISOString(),
    event: entry.event,
    stage: entry.stage,
    adventureId: entry.adventureId,
    worldId: entry.worldId,
    worldVersionId: entry.worldVersionId,
    turnId: entry.turnId,
    commandId: entry.commandId,
    turnTrigger: entry.turnTrigger,
    playerInput: entry.playerInput,
    provider: entry.provider,
    model: entry.model,
    requestSummary: entry.requestSummary,
    rawRequestMessageCount,
    rawRequest: rawRequestLoggingEnabled(env) ? entry.rawRequest : undefined,
    status: entry.status,
    httpStatus: entry.httpStatus,
    error: entry.error,
    rawResponseLength,
    rawResponse: rawLlmLoggingEnabled(env) ? entry.rawResponse : undefined,
    parsedResponse: entry.parsedResponse,
    narration: entry.narration,
    acceptedUpdates: entry.acceptedUpdates,
    ignoredUpdates: entry.ignoredUpdates,
    acceptedUpdateCount: entry.acceptedUpdateCount ?? entry.acceptedUpdates?.length,
    ignoredUpdateCount: entry.ignoredUpdateCount ?? entry.ignoredUpdates?.length,
    timingsMs: entry.timingsMs,
  });
}

function debugLogEnabled(env: DebugLogEnv) {
  return truthyEnv(env.LORECRAFT_DEBUG_LOG);
}

function rawLlmLoggingEnabled(env: DebugLogEnv) {
  return truthyEnv(env.LORECRAFT_DEBUG_LOG_RAW_LLM);
}

function rawRequestLoggingEnabled(env: DebugLogEnv) {
  return truthyEnv(env.LORECRAFT_DEBUG_LOG_RAW_REQUEST);
}

function truthyEnv(value: string | undefined) {
  return value === "1" || value?.toLowerCase() === "true";
}

function debugLogPath(env: DebugLogEnv, cwd: string) {
  const configured = env.LORECRAFT_DEBUG_LOG_PATH?.trim() || "logs/director-debug.jsonl";
  return isAbsolute(configured) ? configured : join(/*turbopackIgnore: true*/ cwd, configured);
}

function omitUndefined<T extends Record<string, unknown>>(record: T) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
