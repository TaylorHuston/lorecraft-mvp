#!/usr/bin/env node
import { spawn } from "node:child_process";

const port = process.env.PORT ?? "3101";
let child = null;
let shuttingDown = false;

try {
  await run("next", ["build"]);
  await runLongLived("next", ["start", "-p", port]);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const build = spawn(command, args, {
      env: process.env,
      stdio: "inherit",
    });
    child = build;

    build.on("error", reject);
    build.on("exit", (code, signal) => {
      child = null;
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with ${signal ?? code}.`));
    });
  });
}

function runLongLived(command, args) {
  return new Promise((resolve, reject) => {
    const server = spawn(command, args, {
      env: process.env,
      stdio: "inherit",
    });
    child = server;

    server.on("error", reject);
    server.on("exit", (code, signal) => {
      child = null;
      if (shuttingDown || signal === "SIGTERM" || signal === "SIGINT") {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with ${signal ?? code}.`));
    });
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    shuttingDown = true;
    if (child) {
      child.kill(signal);
      setTimeout(() => {
        if (child) {
          child.kill("SIGKILL");
        }
      }, 5_000).unref();
    } else {
      process.exit(0);
    }
  });
}
