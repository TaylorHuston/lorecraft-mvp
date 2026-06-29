import type { DirectorMessage } from "./types";

const RAW_REQUEST_FLAG = "LORECRAFT_DEBUG_STORE_RAW_REQUEST";

type RawRequestEnv = Record<string, string | undefined>;

export function shouldStoreRawDirectorRequest(env: RawRequestEnv = process.env) {
  return env[RAW_REQUEST_FLAG]?.trim() === "1";
}

export function rawDirectorRequestForStorage(
  messages: DirectorMessage[],
  env: RawRequestEnv = process.env,
) {
  return shouldStoreRawDirectorRequest(env) ? messages : undefined;
}
