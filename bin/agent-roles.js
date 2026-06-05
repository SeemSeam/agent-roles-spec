#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const packageRoot = path.resolve(__dirname, "..");
const pythonArgs = ["-m", "agent_roles", ...process.argv.slice(2)];
const env = {
  ...process.env,
  PYTHONPATH: [packageRoot, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter)
};
const candidates = process.platform === "win32" ? ["py", "python3", "python"] : ["python3", "python"];

for (const candidate of candidates) {
  const args = candidate === "py" ? ["-3", ...pythonArgs] : pythonArgs;
  const result = spawnSync(candidate, args, { stdio: "inherit", env });
  if (result.error && result.error.code === "ENOENT") {
    continue;
  }
  if (result.error) {
    console.error(`agent-roles: failed to run ${candidate}: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status === null ? 1 : result.status);
}

console.error("agent-roles requires Python 3.11+ on PATH.");
process.exit(127);
