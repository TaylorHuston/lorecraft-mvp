import type { DirectorMode } from "./types";

const DEFAULT_DIRECTOR_MODE: DirectorMode = "persistent";
const DIRECTOR_MODE_ENV = "LORECRAFT_DIRECTOR_MODE";

type DirectorModeEnv = Record<string, string | undefined>;

export type DirectorModeResult =
  | { ok: true; mode: DirectorMode }
  | { ok: false; error: string };

export function readDirectorMode(env: DirectorModeEnv = process.env): DirectorModeResult {
  const rawMode = env[DIRECTOR_MODE_ENV]?.trim();
  if (!rawMode) {
    return { ok: true, mode: DEFAULT_DIRECTOR_MODE };
  }

  if (rawMode === "persistent" || rawMode === "transcript") {
    return { ok: true, mode: rawMode };
  }

  if (rawMode === "persistenceless") {
    return { ok: true, mode: "transcript" };
  }

  return {
    ok: false,
    error: `${DIRECTOR_MODE_ENV} must be "persistent" or "transcript".`,
  };
}
