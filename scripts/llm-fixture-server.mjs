#!/usr/bin/env node
import { createServer } from "node:http";

const port = Number(process.env.LORECRAFT_FIXTURE_PORT ?? "3102");
if (!Number.isInteger(port) || port <= 0) {
  console.error("LORECRAFT_FIXTURE_PORT must be a positive integer.");
  process.exit(1);
}

const storyResponse =
  'Mira turns from the warped shutters. "The storm began when the chapel bell rang at midnight," she says, keeping her voice low. The lantern flame gutters as if the room itself heard her.';

const extractionResponse = JSON.stringify({
  npcUpdates: [
    {
      actorKey: "mira",
      reason: "Mira chose to share specific storm knowledge with Taylor.",
      changes: {
        memory:
          "Mira told Taylor the storm began after the chapel bell rang at midnight.",
      },
    },
  ],
});

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    writeJson(response, 200, { ok: true });
    return;
  }

  if (request.method !== "POST" || !request.url?.endsWith("/chat/completions")) {
    writeJson(response, 404, { error: { message: "Not found" } });
    return;
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(await readRequestBody(request));
  } catch {
    writeJson(response, 400, { error: { message: "Request body must be JSON." } });
    return;
  }

  const content = isExtractionRequest(parsedBody) ? extractionResponse : storyResponse;
  writeJson(response, 200, {
    id: "chatcmpl-lorecraft-fixture",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model:
      typeof parsedBody.model === "string" && parsedBody.model.trim()
        ? parsedBody.model
        : "lorecraft-fixture-model",
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        message: {
          role: "assistant",
          content,
        },
      },
    ],
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Lorecraft fixture LLM listening on http://127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}

function isExtractionRequest(body) {
  if (body?.response_format?.type === "json_object") {
    return true;
  }

  const messageText = Array.isArray(body?.messages)
    ? body.messages.map((message) => message?.content).join("\n")
    : "";
  return /Extraction Instructions|npcUpdates|json_npc_updates/i.test(messageText);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function writeJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(body));
}
