export type WorldLoadError = {
  httpStatus: 400 | 500;
  clientMessage: string;
  logMessage: string;
};

export function normalizeWorldLoadError(error: unknown): WorldLoadError {
  const message = error instanceof Error ? error.message : String(error);
  const isValidationError =
    message.includes("ArgumentValidationError") ||
    message.includes("Value does not match validator") ||
    message.includes("Invalid id");

  if (isValidationError) {
    return {
      httpStatus: 400,
      clientMessage: "The selected world id is invalid. Seed or reload the world and try again.",
      logMessage: "The selected world id is invalid.",
    };
  }

  return {
    httpStatus: 500,
    clientMessage: "The selected world could not be loaded. Seed or reload the world and try again.",
    logMessage: "The selected world could not be loaded.",
  };
}
