#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class CcbExecuteWorktreeError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "CcbExecuteWorktreeError";
    this.code = code;
    this.details = details;
  }
}

function trimQuotes(value) {
  const trimmed = String(value ?? "").trim();
  const quote = trimmed[0];
  if ((quote === "\"" || quote === "'") && trimmed.at(-1) === quote) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseInlineObject(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }
  return null;
}

export function parseFrontmatter(markdown) {
  const text = String(markdown ?? "");
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) {
    throw new CcbExecuteWorktreeError("missing_frontmatter", "spec frontmatter is missing");
  }
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    throw new CcbExecuteWorktreeError("invalid_frontmatter", "spec frontmatter is not closed");
  }
  return match[1];
}

function scalarFrontmatterValue(frontmatter, key) {
  const pattern = new RegExp(`^${key}:\\s*(.*?)\\s*$`, "m");
  const match = frontmatter.match(pattern);
  return match ? trimQuotes(match[1]) : null;
}

export function parseCodeWorkspace(frontmatter) {
  const inline = frontmatter.match(/^code_workspace:\s*(.+?)\s*$/m);
  if (inline) {
    const parsed = parseInlineObject(inline[1]);
    if (parsed) return parsed;
  }

  const lines = frontmatter.split(/\r?\n/);
  const start = lines.findIndex((line) => /^code_workspace:\s*$/.test(line));
  if (start === -1) return null;

  const result = {};
  for (let index = start + 1; index < lines.length; index++) {
    const line = lines[index];
    if (/^\S/.test(line) && line.trim()) break;
    const match = line.match(/^\s{2,}([A-Za-z0-9_]+):\s*(.*?)\s*$/);
    if (match) result[match[1]] = trimQuotes(match[2]);
  }
  return Object.keys(result).length > 0 ? result : null;
}

function normalizeCodeWorkspace(codeWorkspace) {
  const path = typeof codeWorkspace?.path === "string" ? codeWorkspace.path.trim() : "";
  const branch = typeof codeWorkspace?.branch === "string" ? codeWorkspace.branch.trim() : "";
  if (!path || !branch) {
    throw new CcbExecuteWorktreeError(
      "missing_code_workspace",
      "code_workspace.path and code_workspace.branch are required"
    );
  }
  if (isAbsolute(path)) {
    throw new CcbExecuteWorktreeError("absolute_code_workspace_path", "code_workspace.path must be relative", {
      path
    });
  }
  return { path, branch };
}

async function readSpec(projectRoot, specPath) {
  const resolved = isAbsolute(specPath) ? specPath : join(projectRoot, specPath);
  return {
    path: resolved,
    markdown: await readFile(resolved, "utf8")
  };
}

async function git(cwd, args, options = {}) {
  try {
    const gitArgs = ["-C", cwd, ...args];
    const result = await execFileAsync("git", gitArgs, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024
    });
    return {
      exitCode: 0,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? ""
    };
  } catch (error) {
    const result = {
      exitCode: Number.isInteger(error?.code) ? error.code : 1,
      stdout: error?.stdout ?? "",
      stderr: error?.stderr ?? ""
    };
    if (options.allowFailure) return result;
    throw new CcbExecuteWorktreeError("git_failed", `git -C ${cwd} ${args.join(" ")} failed`, {
      cwd,
      args,
      ...result
    });
  }
}

async function assertDirectory(path) {
  try {
    const stats = await stat(path);
    if (!stats.isDirectory()) {
      throw new CcbExecuteWorktreeError("code_root_not_directory", "code_workspace.path is not a directory", {
        codeRoot: path
      });
    }
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new CcbExecuteWorktreeError(
        "code_root_missing",
        "code_workspace.path does not exist; ccb-execute must not create worktrees",
        { codeRoot: path }
      );
    }
    throw error;
  }
}

export async function resolveWorktreeFromSpec({ projectRoot = process.cwd(), specPath }) {
  if (!specPath) {
    throw new CcbExecuteWorktreeError("missing_spec", "--spec is required");
  }
  const canonicalRoot = resolve(projectRoot);
  const spec = await readSpec(canonicalRoot, specPath);
  const frontmatter = parseFrontmatter(spec.markdown);
  const codeWorkspace = normalizeCodeWorkspace(parseCodeWorkspace(frontmatter));
  const codeRoot = resolve(canonicalRoot, codeWorkspace.path);
  await assertDirectory(codeRoot);

  const branchResult = await git(codeRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const actualBranch = branchResult.stdout.trim();
  if (actualBranch !== codeWorkspace.branch) {
    throw new CcbExecuteWorktreeError("branch_mismatch", "codeRoot branch does not match code_workspace.branch", {
      codeRoot,
      expectedBranch: codeWorkspace.branch,
      actualBranch
    });
  }

  return {
    canonicalRoot,
    codeRoot,
    specPath: spec.path,
    requirementId: scalarFrontmatterValue(frontmatter, "requirement_id"),
    taskId: scalarFrontmatterValue(frontmatter, "task_id"),
    codeWorkspace,
    branch: actualBranch
  };
}

export function extractVerificationCommands(markdown) {
  const lines = String(markdown ?? "").split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => /^#{2,6}\s+验证\s*$/.test(line.trim()));
  if (headingIndex === -1) return [];

  let fenceStart = -1;
  for (let index = headingIndex + 1; index < lines.length; index++) {
    const trimmed = lines[index].trim();
    if (/^#{2,6}\s+/.test(trimmed)) break;
    if (/^```/.test(trimmed)) {
      fenceStart = index;
      break;
    }
  }
  if (fenceStart === -1) return [];

  const commands = [];
  for (let index = fenceStart + 1; index < lines.length; index++) {
    const line = lines[index];
    if (/^```/.test(line.trim())) break;
    const command = line.trim();
    if (command && !command.startsWith("#")) commands.push(command);
  }
  return commands;
}

export async function verificationCommandsFromSpec({ projectRoot = process.cwd(), specPath }) {
  const canonicalRoot = resolve(projectRoot);
  const spec = await readSpec(canonicalRoot, specPath);
  return extractVerificationCommands(spec.markdown);
}

export async function runVerificationCommands(commands, { cwd }) {
  const results = [];
  for (const command of commands) {
    const result = await new Promise((resolveResult) => {
      const child = spawn(command, {
        cwd,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"]
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("close", (code, signal) => {
        resolveResult({
          command,
          exitCode: code ?? 1,
          signal: signal ?? null,
          stdout: stdout.slice(-4000),
          stderr: stderr.slice(-4000)
        });
      });
    });
    results.push(result);
    if (result.exitCode !== 0) break;
  }
  return results;
}

function classifyDocsCcbStatus(statusOutput) {
  const lines = statusOutput.split(/\r?\n/).filter(Boolean);
  const staged = [];
  const unstaged = [];
  const untracked = [];

  for (const line of lines) {
    const code = line.slice(0, 2);
    if (code === "??") {
      untracked.push(line);
      continue;
    }
    if (code[0] && code[0] !== " ") staged.push(line);
    if (code[1] && code[1] !== " ") unstaged.push(line);
  }

  return { lines, staged, unstaged, untracked };
}

export async function guardDocsCcbClean({ codeRoot }) {
  const result = await git(resolve(codeRoot), [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--",
    "docs/.ccb"
  ]);
  const classified = classifyDocsCcbStatus(result.stdout);
  if (classified.lines.length > 0) {
    throw new CcbExecuteWorktreeError(
      "docs_ccb_dirty",
      "commit-guard rejected docs/.ccb changes in the worktree",
      classified
    );
  }
  return classified;
}

async function gitStatus(codeRoot) {
  const result = await git(codeRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

export async function autoCommitFromSpec({
  projectRoot = process.cwd(),
  specPath,
  message
}) {
  const resolved = await resolveWorktreeFromSpec({ projectRoot, specPath });
  const spec = await readSpec(resolved.canonicalRoot, specPath);
  const verificationCommands = extractVerificationCommands(spec.markdown);
  const verificationResults = await runVerificationCommands(verificationCommands, { cwd: resolved.codeRoot });
  const failed = verificationResults.find((result) => result.exitCode !== 0);
  if (failed) {
    return {
      status: "validation_failed",
      verificationStatus: "failed",
      ...resolved,
      verificationCommands,
      verificationResults
    };
  }

  const verificationStatus = verificationCommands.length > 0 ? "verified" : "unverified";
  await guardDocsCcbClean({ codeRoot: resolved.codeRoot });
  await git(resolved.codeRoot, ["add", "-A"]);
  await guardDocsCcbClean({ codeRoot: resolved.codeRoot });

  const statusLines = await gitStatus(resolved.codeRoot);
  if (statusLines.length === 0) {
    const head = (await git(resolved.codeRoot, ["rev-parse", "HEAD"])).stdout.trim();
    return {
      status: "no_changes",
      verificationStatus,
      commitSha: head,
      ...resolved,
      verificationCommands,
      verificationResults
    };
  }

  const commitMessage = message || `ccb-execute: ${verificationStatus} ${resolved.taskId || "subtask"}`;
  await git(resolved.codeRoot, ["commit", "-m", commitMessage]);
  const commitSha = (await git(resolved.codeRoot, ["rev-parse", "HEAD"])).stdout.trim();
  return {
    status: "committed",
    verificationStatus,
    commitSha,
    ...resolved,
    verificationCommands,
    verificationResults
  };
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = {
    command,
    projectRoot: process.cwd(),
    specPath: null,
    codeRoot: null,
    message: null,
    pretty: false
  };

  for (let index = 0; index < rest.length; index++) {
    const item = rest[index];
    if (item === "--project-root") args.projectRoot = rest[++index];
    else if (item === "--spec") args.specPath = rest[++index];
    else if (item === "--code-root") args.codeRoot = rest[++index];
    else if (item === "--message") args.message = rest[++index];
    else if (item === "--pretty") args.pretty = true;
    else if (item === "--help" || item === "-h") args.help = true;
    else throw new Error(`unknown argument: ${item}`);
  }

  return args;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/ccb-execute-worktree.mjs validate-worktree --project-root <canonicalRoot> --spec <dev_task.md> [--pretty]",
    "  node scripts/ccb-execute-worktree.mjs verification-commands --project-root <canonicalRoot> --spec <dev_task.md> [--pretty]",
    "  node scripts/ccb-execute-worktree.mjs guard-docs-ccb --code-root <codeRoot> [--pretty]",
    "  node scripts/ccb-execute-worktree.mjs commit --project-root <canonicalRoot> --spec <dev_task.md> [--message <msg>] [--pretty]"
  ].join("\n");
}

function json(value, pretty) {
  console.log(JSON.stringify(value, null, pretty ? 2 : 0));
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.help || !args.command) {
    console.log(usage());
    return;
  }

  if (args.command === "validate-worktree") {
    json(await resolveWorktreeFromSpec({ projectRoot: args.projectRoot, specPath: args.specPath }), args.pretty);
    return;
  }

  if (args.command === "verification-commands") {
    json({
      commands: await verificationCommandsFromSpec({ projectRoot: args.projectRoot, specPath: args.specPath })
    }, args.pretty);
    return;
  }

  if (args.command === "guard-docs-ccb") {
    if (!args.codeRoot) throw new Error("--code-root is required");
    json(await guardDocsCcbClean({ codeRoot: args.codeRoot }), args.pretty);
    return;
  }

  if (args.command === "commit") {
    const result = await autoCommitFromSpec({
      projectRoot: args.projectRoot,
      specPath: args.specPath,
      message: args.message
    });
    json(result, args.pretty);
    if (result.status === "validation_failed") process.exitCode = 1;
    return;
  }

  throw new Error(`unknown command: ${args.command}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    const payload = error instanceof CcbExecuteWorktreeError
      ? { status: "rejected", reason: error.code, message: error.message, details: error.details }
      : { status: "error", message: error instanceof Error ? error.message : String(error) };
    console.error(JSON.stringify(payload, null, 2));
    process.exitCode = 1;
  });
}
