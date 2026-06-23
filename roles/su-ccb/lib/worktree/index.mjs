import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, lstat, readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { promisify } from "node:util";

import {
  ConflictError,
  IOError,
  LockTimeoutError,
  RuntimeError,
  ValidationError,
  appendEvent,
  safeWriteFile,
  withFileLock
} from "../runtime/index.mjs";
import {
  WORKTREE_STATE_SCHEMA_VERSION_V02,
  normalizeWorktreeStateV02,
  serializeWorktreeStateV02
} from "./state.mjs";
import { getAssociationExecutor } from "./associations.mjs";
import {
  expandTopology,
  loadImplementationTopology,
  topologySourceFor
} from "./topology.mjs";
import {
  canonicalSyncAllowlist,
  classifyDirtyEntries,
  parseStatusEntries,
  pathExistsOrTracked,
  runtimeDirtyAllowlist,
  statusEntryAllowedForAssociation as classifierStatusEntryAllowedForAssociation
} from "./dirty-classifier.mjs";

const execFileAsync = promisify(execFile);

const SOURCE_ACTOR = "ccb_claude";
const STATE_SCHEMA_VERSION = WORKTREE_STATE_SCHEMA_VERSION_V02;
const GIT_MAX_BUFFER = 10 * 1024 * 1024;
const GIT_DIAGNOSTIC_SNIPPET_LENGTH = 500;
const SUBMODULE_REMOVE_REJECTION = /working trees containing submodules cannot be moved or removed/;
export class GitCommandError extends RuntimeError {
  constructor(cwd, args, result, cause) {
    const detail = (result.stderr || result.stdout || "").trim();
    super(
      `git ${args.join(" ")} failed in ${cwd}${detail ? `: ${detail}` : ""}`,
      { code: "GIT_COMMAND_FAILED", path: cwd, cause }
    );
    this.cwd = cwd;
    this.args = args;
    this.exitCode = result.exitCode;
    this.stdout = result.stdout;
    this.stderr = result.stderr;
  }
}

function normalizeProjectRoot(projectRoot) {
  if (typeof projectRoot !== "string" || projectRoot.trim().length === 0) {
    throw new ValidationError("projectRoot must be a non-empty string");
  }
  return resolve(projectRoot);
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function safeFileSegment(value) {
  const safe = String(value).replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe || "requirement";
}

function statePath(projectRoot, requirementId) {
  return join(projectRoot, "docs", ".ccb", "worktrees", `${safeFileSegment(requirementId)}.json`);
}

function lockTargetPath(projectRoot, requirementId) {
  return join(projectRoot, ".ccb", "locks", "worktree", safeFileSegment(requirementId));
}

function canonicalRepoLockTargetPath(projectRoot) {
  return join(projectRoot, ".ccb", "locks", "canonical-repo");
}

function isoNow(options) {
  const value = options.now?.() ?? new Date();
  return typeof value === "string" ? value : value.toISOString();
}

function normalizeBranchRef(value) {
  if (!value) return null;
  return value.startsWith("refs/heads/") ? value.slice("refs/heads/".length) : value;
}

function parseWorktreeList(output) {
  const records = [];
  let current = null;
  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) {
      current = null;
      continue;
    }
    const separator = line.indexOf(" ");
    const key = separator === -1 ? line : line.slice(0, separator);
    const value = separator === -1 ? "" : line.slice(separator + 1);
    if (key === "worktree") {
      current = { path: resolve(value), head: null, branch: null, detached: false };
      records.push(current);
      continue;
    }
    if (!current) continue;
    if (key === "HEAD") current.head = value;
    if (key === "branch") current.branch = normalizeBranchRef(value);
    if (key === "detached") current.detached = true;
  }
  return records;
}

function samePath(left, right) {
  return resolve(left) === resolve(right);
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw new IOError(`failed to inspect path: ${path}`, { path, cause: error });
  }
}

async function assertPathAbsentOrExpectedWorktree(path, records) {
  if (records.some((record) => samePath(record.path, path))) return;
  if (!await pathExists(path)) return;
  let kind = "path";
  try {
    const stats = await lstat(path);
    kind = stats.isDirectory() ? "directory" : "file";
  } catch {
    // The earlier access check already proved the conflict; the exact kind is best-effort.
  }
  throw new ConflictError(`worktree path exists but is not the expected git worktree: ${path}`, {
    path,
    kind
  });
}

async function defaultRunGit(cwd, args, options = {}) {
  try {
    const result = await execFileAsync("git", args, {
      cwd,
      encoding: "utf8",
      maxBuffer: GIT_MAX_BUFFER,
      env: {
        ...process.env,
        ...(options.env ?? {}),
        LC_ALL: "C",
        LANG: "C",
        LANGUAGE: "C"
      }
    });
    return {
      exitCode: 0,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? ""
    };
  } catch (error) {
    const failed = {
      exitCode: Number.isInteger(error?.code) ? error.code : 1,
      stdout: error?.stdout ?? "",
      stderr: error?.stderr ?? ""
    };
    if (options.allowFailure) return failed;
    throw new GitCommandError(cwd, args, failed, error);
  }
}

async function git(projectRoot, args, options = {}) {
  const runGit = options.runGit ?? defaultRunGit;
  const cwd = options.cwd ?? projectRoot;
  const result = await runGit(cwd, args, options);
  if (result.exitCode !== 0 && !options.allowFailure) {
    throw new GitCommandError(cwd, args, result);
  }
  return result;
}

async function gitOutput(projectRoot, args, options = {}) {
  return (await git(projectRoot, args, options)).stdout.trim();
}

function truncateGitDiagnostic(value) {
  const output = typeof value === "string" ? value : "";
  return output.length > GIT_DIAGNOSTIC_SNIPPET_LENGTH
    ? output.slice(0, GIT_DIAGNOSTIC_SNIPPET_LENGTH)
    : output;
}

function cleanupGitFailurePayload(requirementId, workspace, failure = {}, forceAttempted = false) {
  return {
    requirementId,
    path: workspace.absolutePath,
    branch: workspace.branch,
    forceAttempted,
    exitCode: Number.isInteger(failure.exitCode) ? failure.exitCode : 1,
    stderr: truncateGitDiagnostic(failure.stderr),
    stdout: truncateGitDiagnostic(failure.stdout)
  };
}

function gitFailureFromError(error) {
  return {
    exitCode: Number.isInteger(error?.exitCode) ? error.exitCode : 1,
    stderr: error?.stderr ?? error?.message ?? "",
    stdout: error?.stdout ?? ""
  };
}

async function removeWorktreeForCleanup(projectRoot, absolutePath, options = {}) {
  const result = await git(projectRoot, ["worktree", "remove", absolutePath], {
    ...options,
    allowFailure: true
  });
  if (result.exitCode === 0) return { removed: true, forceAttempted: false };

  if (SUBMODULE_REMOVE_REJECTION.test(result.stderr ?? "")) {
    const forced = await git(projectRoot, ["worktree", "remove", "--force", absolutePath], {
      ...options,
      allowFailure: true
    });
    if (forced.exitCode === 0) return { removed: true, forceAttempted: true };
    return { removed: false, forceAttempted: true, ...forced };
  }

  return { removed: false, forceAttempted: false, ...result };
}

async function branchExists(projectRoot, branch, options = {}) {
  const result = await git(
    projectRoot,
    ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
    { ...options, allowFailure: true }
  );
  if (result.exitCode === 0) return true;
  if (result.exitCode === 1) return false;
  throw new GitCommandError(projectRoot, ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], result);
}

async function currentBranch(projectRoot, options = {}) {
  const branch = await gitOutput(projectRoot, ["rev-parse", "--abbrev-ref", "HEAD"], options);
  if (!branch || branch === "HEAD") {
    throw new ConflictError("canonical root must be checked out on a branch before ensuring a requirement worktree", {
      path: projectRoot
    });
  }
  return branch;
}

async function headSha(projectRoot, options = {}) {
  return await gitOutput(projectRoot, ["rev-parse", "HEAD"], options);
}

async function worktreeRecords(projectRoot, options = {}) {
  const output = await gitOutput(projectRoot, ["worktree", "list", "--porcelain"], options);
  return parseWorktreeList(output);
}

async function statusPorcelain(cwd, options = {}) {
  return (await git(cwd, ["-c", "core.quotePath=false", "status", "--porcelain", "--untracked-files=all"], { ...options, cwd })).stdout;
}

async function canonicalSyncCommit(projectRoot, requirementId, options = {}) {
  const allowlist = await canonicalSyncAllowlist(projectRoot, requirementId);
  const before = parseStatusEntries(await statusPorcelain(projectRoot, options));
  const classifierOptions = { ...options, requirementId };
  const beforeClassification = await classifyDirtyEntries(projectRoot, before, allowlist, classifierOptions);
  if (beforeClassification.foreign.length > 0) {
    return escalation("canonical_dirty_outside_allowlist", {
      requirementId,
      path: projectRoot,
      porcelain: beforeClassification.foreign.map((entry) => entry.raw).join("\n"),
      tolerated_paths: beforeClassification.toleratedPaths
    });
  }

  const changedAllowlistPaths = [
    ...new Set(before.flatMap((entry) => entry.paths).filter((path) => allowlist.has(path)))
  ];
  const addPaths = [];
  for (const relativePath of changedAllowlistPaths) {
    if (await pathExistsOrTracked(projectRoot, relativePath, classifierOptions)) addPaths.push(relativePath);
  }
  if (addPaths.length === 0) {
    return { status: "noop", committed: false, allowlist: [...allowlist], tolerated_paths: beforeClassification.toleratedPaths };
  }

  await git(projectRoot, ["add", "--", ...addPaths], options);
  const diff = await git(projectRoot, ["diff", "--cached", "--quiet", "--", ...addPaths], {
    ...options,
    allowFailure: true
  });
  if (diff.exitCode === 0) {
    return { status: "noop", committed: false, allowlist: [...allowlist], tolerated_paths: beforeClassification.toleratedPaths };
  }
  if (diff.exitCode !== 1) {
    throw new GitCommandError(projectRoot, ["diff", "--cached", "--quiet", "--", ...addPaths], diff);
  }

  await git(projectRoot, [
    "commit",
    "-m",
    `chore(${requirementId}): canonical sync before requirement merge`,
    "--",
    ...addPaths
  ], options);

  const after = parseStatusEntries(await statusPorcelain(projectRoot, options));
  const afterClassification = await classifyDirtyEntries(projectRoot, after, allowlist, classifierOptions);
  if (afterClassification.foreign.length > 0) {
    return escalation("canonical_dirty_outside_allowlist", {
      requirementId,
      path: projectRoot,
      porcelain: afterClassification.foreign.map((entry) => entry.raw).join("\n"),
      tolerated_paths: afterClassification.toleratedPaths
    });
  }
  return {
    status: "committed",
    committed: true,
    commitSha: await headSha(projectRoot, options),
    paths: addPaths,
    allowlist: [...allowlist],
    tolerated_paths: afterClassification.toleratedPaths
  };
}

function normalizeWorkspace(projectRoot, codeWorkspace, runtimeState = null) {
  const pathValue = codeWorkspace?.path ?? runtimeState?.path;
  const branchValue = codeWorkspace?.branch ?? runtimeState?.branch;
  const relativePath = requiredString(pathValue, "codeWorkspace.path");
  const branch = requiredString(branchValue, "codeWorkspace.branch");
  if (isAbsolute(relativePath)) {
    throw new ValidationError("codeWorkspace.path must be relative to projectRoot", {
      path: relativePath
    });
  }
  return {
    relativePath,
    absolutePath: resolve(projectRoot, relativePath),
    branch
  };
}

function isMultiSpaceRuntime(runtimeState) {
  return Boolean(runtimeState) &&
    (runtimeState.spaces.length !== 1 || runtimeState.associations.length !== 0);
}

function assertSingleSpaceRuntime(runtimeState) {
  if (!runtimeState) return;
  if (isMultiSpaceRuntime(runtimeState)) {
    throw new ConflictError("multi-space runtime cannot be viewed as a single-space record");
  }
}

function rootSpaceFromState(runtimeState) {
  return runtimeState?.spaces?.find((space) => space.space_id === "root") ?? runtimeState?.spaces?.[0] ?? null;
}

function singleSpaceRuntimeView(runtimeState) {
  if (!runtimeState) return null;
  assertSingleSpaceRuntime(runtimeState);
  const space = rootSpaceFromState(runtimeState);
  return {
    schema_version: runtimeState.schema_version,
    requirement_id: runtimeState.requirement_id,
    status: space.status,
    path: space.path,
    branch: space.branch,
    confirmed_target_branch: space.target_branch,
    base_sha: space.base_sha,
    merged_branch_sha: space.merged_branch_sha,
    target_sha_after_merge: space.target_sha_after_merge,
    merged_at: space.merged_at,
    merge: space.merge,
    archived_at: space.archived_at,
    archive: space.archive,
    discarded_at: space.discarded_at,
    reopened_at: space.reopened_at,
    topology_source: runtimeState.topology_source,
    last_error: space.last_error ?? runtimeState.last_error,
    created_at: runtimeState.created_at,
    updated_at: runtimeState.updated_at
  };
}

function assertStateMatchesWorkspace(runtimeState, workspace) {
  if (!runtimeState) return;
  const mismatches = [];
  if (runtimeState.path !== workspace.relativePath) {
    mismatches.push(`path=${runtimeState.path ?? "<missing>"}`);
  }
  if (runtimeState.branch !== workspace.branch) {
    mismatches.push(`branch=${runtimeState.branch ?? "<missing>"}`);
  }
  if (mismatches.length > 0) {
    throw new ConflictError(`worktree runtime state does not match code_workspace: ${mismatches.join(", ")}`);
  }
}

async function readRuntimeState(projectRoot, requirementId, options = {}) {
  const path = statePath(projectRoot, requirementId);
  try {
    const parsed = JSON.parse(await readFile(path, "utf8"));
    return {
      path,
      state: options.normalized ? normalizeWorktreeStateV02(parsed) : parsed,
      rawState: parsed
    };
  } catch (error) {
    if (error?.code === "ENOENT") return { path, state: null };
    if (error instanceof SyntaxError) {
      throw new ValidationError(`invalid worktree runtime state JSON: ${path}`, { path, cause: error });
    }
    throw new IOError(`failed to read worktree runtime state: ${path}`, { path, cause: error });
  }
}

async function readSingleSpaceRuntimeState(projectRoot, requirementId) {
  const { path, state } = await readRuntimeState(projectRoot, requirementId, { normalized: true });
  return { path, state: singleSpaceRuntimeView(state) };
}

async function writeRuntimeState(projectRoot, requirementId, state, operation, options = {}) {
  const path = statePath(projectRoot, requirementId);
  await safeWriteFile(path, serializeWorktreeStateV02(state), {
    audit: {
      projectRoot,
      subjectType: "requirement",
      subjectId: requirementId,
      sourceActor: SOURCE_ACTOR,
      resourceType: "requirement_worktree_state",
      operation,
      runId: `worktree-${operation}-${safeFileSegment(requirementId)}-${randomUUID()}`,
      targetPath: relative(projectRoot, path)
    }
  });
  return path;
}

async function appendWorktreeEvent(projectRoot, requirementId, type, payload, options = {}) {
  return await appendEvent(
    {
      type,
      subject_type: "requirement",
      subject_id: requirementId,
      payload,
      idempotency_key: `worktree:${type}:${safeFileSegment(requirementId)}:${randomUUID()}`,
      emitted_at: isoNow(options),
      source_actor: SOURCE_ACTOR
    },
    { projectRoot }
  );
}

function escalation(reason, payload = {}) {
  return {
    status: "escalated",
    reason,
    ...payload
  };
}

async function appendEscalationEvent(projectRoot, requirementId, reason, payload, options) {
  await appendWorktreeEvent(
    projectRoot,
    requirementId,
    "requirement_worktree_archive_escalated",
    { reason, ...payload },
    options
  );
}

async function withRequirementLock(projectRoot, requirementId, options, fn) {
  return await withFileLock(lockTargetPath(projectRoot, requirementId), fn, options.lockOptions ?? {});
}

async function withCanonicalRepoLock(projectRoot, fn, options = {}) {
  return await withFileLock(
    canonicalRepoLockTargetPath(projectRoot),
    fn,
    options.canonicalLockOptions ?? options.lockOptions ?? {}
  );
}

async function readCanonicalRepoLockOwner(projectRoot) {
  try {
    return JSON.parse(await readFile(`${canonicalRepoLockTargetPath(projectRoot)}.lock/owner.json`, "utf8"));
  } catch {
    return null;
  }
}

async function canonicalRepoLockTimeoutPayload(projectRoot, requirementId, error, payload = {}) {
  const lockOwner = await readCanonicalRepoLockOwner(projectRoot);
  return {
    requirementId,
    lock_path: canonicalRepoLockTargetPath(projectRoot),
    ...(Number.isInteger(error?.timeoutMs) ? { timeoutMs: error.timeoutMs } : {}),
    ...(lockOwner ? { lock_owner: lockOwner } : {}),
    ...payload
  };
}

async function commitExists(projectRoot, sha, options = {}) {
  if (!sha) return false;
  const result = await git(projectRoot, ["cat-file", "-e", `${sha}^{commit}`], {
    ...options,
    allowFailure: true
  });
  return result.exitCode === 0;
}

async function isAncestor(projectRoot, ancestor, descendant, options = {}) {
  const result = await git(projectRoot, ["merge-base", "--is-ancestor", ancestor, descendant], {
    ...options,
    allowFailure: true
  });
  if (result.exitCode === 0) return true;
  if (result.exitCode === 1) return false;
  throw new GitCommandError(projectRoot, ["merge-base", "--is-ancestor", ancestor, descendant], result);
}

async function collectMergeWarnings(projectRoot, runtimeState, targetBranch, options = {}) {
  const warnings = [];
  if (!runtimeState.base_sha) return warnings;
  if (!await commitExists(projectRoot, runtimeState.base_sha, options)) {
    warnings.push({
      type: "base_sha_missing",
      base_sha: runtimeState.base_sha
    });
    return warnings;
  }
  if (!await isAncestor(projectRoot, runtimeState.base_sha, targetBranch, options)) {
    warnings.push({
      type: "target_branch_diverged",
      target_branch: targetBranch,
      base_sha: runtimeState.base_sha
    });
  }
  return warnings;
}

function rootSpaceOrThrow(spaces) {
  const root = spaces.find((space) => space.space_id === "root");
  if (!root) {
    throw new ConflictError("implementation topology must declare a root space");
  }
  return root;
}

function assertRootSpaceMatchesWorkspace(projectRoot, rootSpace, codeWorkspace) {
  const rootWorkspace = normalizeWorkspace(projectRoot, {
    path: rootSpace.path,
    branch: rootSpace.branch
  });
  assertStateMatchesWorkspace(
    {
      path: rootWorkspace.relativePath,
      branch: rootWorkspace.branch
    },
    normalizeWorkspace(projectRoot, codeWorkspace)
  );
}

function spaceWorkspace(projectRoot, space) {
  return {
    relativePath: space.path,
    absolutePath: resolve(projectRoot, space.path),
    branch: space.branch,
    repoRoot: resolve(projectRoot, space.repo)
  };
}

function spaceSummary(runtimeState) {
  return (runtimeState?.spaces ?? []).map((space) => ({
    space_id: space.space_id,
    status: space.status,
    target_branch: space.target_branch
  }));
}

function spacesById(projectRoot, runtimeState) {
  return new Map(runtimeState.spaces.map((space) => {
    const workspace = spaceWorkspace(projectRoot, space);
    return [space.space_id, {
      ...space,
      repoRoot: workspace.repoRoot,
      absolutePath: workspace.absolutePath,
      relativePath: workspace.relativePath
    }];
  }));
}

function operationLastError(op, reason, options, payload = {}) {
  return {
    op,
    reason,
    at: isoNow(options),
    ...payload
  };
}

function updateAssociation(runtimeState, associationId, updater) {
  return {
    ...runtimeState,
    associations: runtimeState.associations.map((association) =>
      association.association_id === associationId ? updater(association) : association
    )
  };
}

function markRuntimeFailure(runtimeState, op, reason, options, payload = {}) {
  const lastError = operationLastError(op, reason, options, payload);
  let next = runtimeState;
  if (payload.space_id) {
    next = updateSpace(next, payload.space_id, (space) => ({
      ...space,
      last_error: lastError
    }));
  }
  if (payload.association_id) {
    next = updateAssociation(next, payload.association_id, (association) => ({
      ...association,
      status: "pending",
      last_error: lastError
    }));
  }
  return normalizeWorktreeStateV02({
    ...next,
    last_error: lastError,
    updated_at: isoNow(options)
  });
}

function mergeCheckpointLastError(runtimeState, options) {
  if (runtimeState.spaces.some((space) => space.status !== "merged")) {
    return operationLastError("merge", "merge_incomplete", options);
  }
  if (runtimeState.associations.some((association) => association.status !== "synced")) {
    return operationLastError("associate", "association_pending", options);
  }
  return null;
}

function cleanupCheckpointLastError(runtimeState, options) {
  if (runtimeState.spaces.some((space) => space.status !== "archived")) {
    return operationLastError("cleanup", "cleanup_incomplete", options);
  }
  return null;
}

async function writeMultiRuntimeState(projectRoot, requirementId, runtimeState, operation, options = {}) {
  const next = normalizeWorktreeStateV02(runtimeState);
  await writeRuntimeState(projectRoot, requirementId, next, operation, options);
  return next;
}

async function recordMultiFailure(projectRoot, requirementId, runtimeState, op, reason, payload, options = {}) {
  const failedState = markRuntimeFailure(runtimeState, op, reason, options, payload);
  await writeRuntimeState(projectRoot, requirementId, failedState, op, options);
  const result = escalation(reason, {
    requirementId,
    op,
    spaces: spaceSummary(failedState),
    ...payload
  });
  await appendEscalationEvent(projectRoot, requirementId, reason, result, options);
  return { state: failedState, result };
}

function assertRootWorkspaceForRuntime(projectRoot, runtimeState, codeWorkspace) {
  if (!codeWorkspace) return;
  const rootSpace = rootSpaceOrThrow(runtimeState.spaces);
  assertRootSpaceMatchesWorkspace(projectRoot, rootSpace, codeWorkspace);
}

function mergeGateAllows(runtimeState) {
  if (runtimeState.aggregate_status === "ready" || runtimeState.aggregate_status === "merged") return true;
  if (runtimeState.aggregate_status !== "escalated") return false;
  if (["merge", "associate"].includes(runtimeState.last_error?.op)) return true;
  return runtimeState.spaces.every((space) => space.status === "merged") &&
    runtimeState.associations.some((association) => association.status !== "synced");
}

function cleanupGateAllows(runtimeState) {
  if (runtimeState.aggregate_status === "merged" || runtimeState.aggregate_status === "archived") return true;
  return runtimeState.aggregate_status === "escalated" && runtimeState.last_error?.op === "cleanup";
}

function discardGateAllows(runtimeState) {
  return runtimeState.spaces.every((space) => space.status === "pending" || space.status === "ready");
}

async function preflightMergeSpace(projectRoot, requirementId, space, options = {}) {
  const workspace = spaceWorkspace(projectRoot, space);
  const payloadBase = {
    space_id: space.space_id,
    path: workspace.absolutePath,
    branch: workspace.branch
  };
  const targetBranch = space.target_branch;
  if (!targetBranch) {
    return { reason: "missing_target_branch", payload: payloadBase };
  }

  const records = await worktreeRecords(workspace.repoRoot, { ...options, cwd: workspace.repoRoot });
  const targetRecord = records.find((record) => samePath(record.path, workspace.absolutePath));
  if (!targetRecord) {
    return { reason: "worktree_missing", payload: { ...payloadBase, targetBranch } };
  }
  if (targetRecord.branch !== workspace.branch) {
    return {
      reason: "worktree_branch_mismatch",
      payload: {
        ...payloadBase,
        targetBranch,
        expectedBranch: workspace.branch,
        actualBranch: targetRecord.branch
      }
    };
  }
  if (!await branchExists(workspace.repoRoot, targetBranch, { ...options, cwd: workspace.repoRoot })) {
    return { reason: "target_branch_missing", payload: { ...payloadBase, targetBranch } };
  }

  let activeBranch;
  try {
    activeBranch = await currentBranch(workspace.repoRoot, { ...options, cwd: workspace.repoRoot });
  } catch {
    return {
      reason: "target_branch_not_current",
      payload: { ...payloadBase, targetBranch, activeBranch: "HEAD" }
    };
  }
  if (activeBranch !== targetBranch) {
    return {
      reason: "target_branch_not_current",
      payload: { ...payloadBase, targetBranch, activeBranch }
    };
  }

  const worktreeStatus = await statusPorcelain(workspace.absolutePath, options);
  if (worktreeStatus.trim()) {
    return {
      reason: "worktree_dirty",
      payload: { ...payloadBase, targetBranch, porcelain: worktreeStatus }
    };
  }

  return null;
}

async function preflightReopenSpace(projectRoot, space, options = {}) {
  const workspace = spaceWorkspace(projectRoot, space);
  const payloadBase = {
    space_id: space.space_id,
    path: workspace.absolutePath,
    branch: workspace.branch
  };
  const records = await worktreeRecords(workspace.repoRoot, { ...options, cwd: workspace.repoRoot });
  const targetRecord = records.find((record) => samePath(record.path, workspace.absolutePath));
  if (!targetRecord) {
    return { reason: "worktree_missing", payload: payloadBase };
  }
  if (targetRecord.branch !== workspace.branch) {
    return {
      reason: "worktree_branch_mismatch",
      payload: {
        ...payloadBase,
        expectedBranch: workspace.branch,
        actualBranch: targetRecord.branch
      }
    };
  }
  if (!await branchExists(workspace.repoRoot, workspace.branch, { ...options, cwd: workspace.repoRoot })) {
    return { reason: "worktree_branch_missing", payload: payloadBase };
  }
  const worktreeStatus = await statusPorcelain(workspace.absolutePath, options);
  if (worktreeStatus.trim()) {
    return { reason: "worktree_dirty", payload: { ...payloadBase, porcelain: worktreeStatus } };
  }
  return null;
}

function mergeOrder(spaces) {
  const root = spaces.find((space) => space.space_id === "root");
  return [
    ...(root ? [root] : []),
    ...spaces.filter((space) => space.space_id !== "root")
  ];
}

async function mergeOneSpace(projectRoot, requirementId, runtimeState, space, options = {}) {
  const runMerge = async () => {
    const workspace = spaceWorkspace(projectRoot, space);
    const targetBranch = space.target_branch;
    let syncResult = { status: "noop", committed: false, allowlist: [] };
    if (space.space_id === "root") {
      syncResult = await canonicalSyncCommit(projectRoot, requirementId, options);
      if (syncResult.status === "escalated") {
        return { failure: { reason: syncResult.reason, payload: { ...syncResult, space_id: space.space_id } } };
      }
    }

    const gitOptions = { ...options, cwd: workspace.repoRoot };
    const warnings = await collectMergeWarnings(workspace.repoRoot, space, targetBranch, gitOptions);
    const branchSha = await gitOutput(workspace.repoRoot, ["rev-parse", workspace.branch], gitOptions);
    let mergeResult = { stdout: "", stderr: "" };
    if (!await isAncestor(workspace.repoRoot, branchSha, targetBranch, gitOptions)) {
      mergeResult = await git(workspace.repoRoot, ["merge", "--no-edit", workspace.branch], {
        ...gitOptions,
        allowFailure: true
      });
      if (mergeResult.exitCode !== 0) {
        await git(workspace.repoRoot, ["merge", "--abort"], { ...gitOptions, allowFailure: true });
        const payload = {
          space_id: space.space_id,
          targetBranch,
          branch: workspace.branch,
          path: workspace.absolutePath,
          warnings,
          stderr: mergeResult.stderr,
          stdout: mergeResult.stdout
        };
        if (space.space_id !== "root") payload.preview_consistency = "incomplete";
        return { failure: { reason: "merge_conflict", payload } };
      }
    }

    const targetShaAfterMerge = await headSha(workspace.repoRoot, gitOptions);
    return {
      space: {
        ...space,
        status: "merged",
        merged_branch_sha: branchSha,
        target_sha_after_merge: targetShaAfterMerge,
        merged_at: space.merged_at ?? isoNow(options),
        last_error: null,
        merge: {
          target_branch: targetBranch,
          warnings,
          canonical_sync: space.space_id === "root" ? syncResult : null,
          merge_stdout: mergeResult.stdout,
          merge_stderr: mergeResult.stderr
        }
      },
      warnings,
      branchSha,
      targetShaAfterMerge
    };
  };

  if (space.space_id !== "root") return await runMerge();

  try {
    return await withCanonicalRepoLock(projectRoot, runMerge, options);
  } catch (error) {
    if (error instanceof LockTimeoutError) {
      return {
        failure: {
          reason: "canonical_repo_lock_timeout",
          payload: await canonicalRepoLockTimeoutPayload(projectRoot, requirementId, error, {
            space_id: space.space_id
          })
        }
      };
    }
    throw error;
  }
}

function associationDirtyAllowlist(projectRoot, requirementId) {
  return runtimeDirtyAllowlist(requirementId);
}

function associationDirtyPathspecs(runtimeState, association) {
  return runtimeState.associations
    .filter((candidate) =>
      candidate.to_space === association.to_space &&
      candidate.status !== "synced"
    )
    .map((candidate) => candidate.submodule_path);
}

async function statusEntryAllowedForAssociation(projectRoot, entry, association, runtimeAllowlist, options = {}) {
  const pathspecs = association.allowed_dirty_submodule_paths ?? [association.submodule_path];
  return await classifierStatusEntryAllowedForAssociation(projectRoot, entry, pathspecs, runtimeAllowlist, options);
}

async function runAssociationExecutor(projectRoot, requirementId, runtimeState, association, options = {}) {
  const executor = getAssociationExecutor(association.kind);
  if (!executor) {
    return {
      failure: {
        reason: "unknown_association_kind",
        payload: {
          association_id: association.association_id,
          kind: association.kind
        }
      }
    };
  }

  const spaceMap = spacesById(projectRoot, runtimeState);
  const toSpace = spaceMap.get(association.to_space);
  if (!toSpace) {
    return {
      failure: {
        reason: "association_space_missing",
        payload: {
          association_id: association.association_id,
          to_space: association.to_space
        }
      }
    };
  }

  const allowedDirtySubmodulePaths = associationDirtyPathspecs(runtimeState, association);
  const associationForExecution = {
    ...association,
    allowed_dirty_submodule_paths: allowedDirtySubmodulePaths
  };
  const runtimeAllowlist = associationDirtyAllowlist(projectRoot, requirementId);
  const dirtyEntries = [];
  const classifierOptions = { ...options, requirementId };
  for (const entry of parseStatusEntries(await statusPorcelain(toSpace.repoRoot, { ...options, cwd: toSpace.repoRoot }))) {
    if (!await statusEntryAllowedForAssociation(
      toSpace.repoRoot,
      entry,
      associationForExecution,
      runtimeAllowlist,
      classifierOptions
    )) {
      dirtyEntries.push(entry);
    }
  }
  if (dirtyEntries.length > 0) {
    return {
      failure: {
        reason: "association_dirty_outside_path",
        payload: {
          association_id: association.association_id,
          kind: association.kind,
          to_space: association.to_space,
          submodule_path: association.submodule_path,
          porcelain: dirtyEntries.map((entry) => entry.raw).join("\n")
        }
      }
    };
  }

  const runGit = async (cwd, args, runOptions = {}) =>
    await git(cwd, args, { ...options, ...runOptions, cwd });
  const rootRepoLock = async (fn) => await withCanonicalRepoLock(projectRoot, fn, options);

  let syncResult = {
    synced_commit_sha: association.synced_commit_sha,
    noop: association.noop
  };
  if (association.status !== "synced") {
    try {
      syncResult = await executor.sync({
        projectRoot,
        requirementId,
        association: associationForExecution,
        spacesById: spaceMap,
        runGit,
        withCanonicalRepoLock: rootRepoLock
      }) ?? syncResult;
    } catch (error) {
      if (error instanceof LockTimeoutError) {
        return {
          failure: {
            reason: "canonical_repo_lock_timeout",
            payload: await canonicalRepoLockTimeoutPayload(projectRoot, requirementId, error, {
              association_id: association.association_id,
              kind: association.kind,
              to_space: association.to_space
            })
          }
        };
      }
      return {
        failure: {
          reason: "association_sync_failed",
          payload: {
            association_id: association.association_id,
            kind: association.kind,
            error: error instanceof Error ? error.message : String(error)
          }
        }
      };
    }
  }

  let verified = false;
  try {
    verified = Boolean(await executor.verify({
      projectRoot,
      requirementId,
      association: {
        ...associationForExecution,
        synced_commit_sha: syncResult.synced_commit_sha ?? association.synced_commit_sha,
        noop: Boolean(syncResult.noop)
      },
      spacesById: spaceMap,
      runGit,
      withCanonicalRepoLock: rootRepoLock
    }));
  } catch (error) {
    if (error instanceof LockTimeoutError) {
      return {
        failure: {
          reason: "canonical_repo_lock_timeout",
          payload: await canonicalRepoLockTimeoutPayload(projectRoot, requirementId, error, {
            association_id: association.association_id,
            kind: association.kind,
            to_space: association.to_space
          })
        }
      };
    }
    return {
      failure: {
        reason: "association_verify_failed",
        payload: {
          association_id: association.association_id,
          kind: association.kind,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    };
  }
  if (!verified) {
    return {
      failure: {
        reason: "association_verify_failed",
        payload: {
          association_id: association.association_id,
          kind: association.kind
        }
      }
    };
  }

  return {
    association: {
      ...association,
      status: "synced",
      synced_commit_sha: syncResult.synced_commit_sha ?? association.synced_commit_sha ?? null,
      noop: Boolean(syncResult.noop),
      synced_at: association.synced_at ?? isoNow(options),
      last_error: null
    }
  };
}

function branchTemplatePrefix(template) {
  if (typeof template !== "string") return "";
  const marker = template.indexOf("<requirementId>");
  return marker === -1 ? "" : template.slice(0, marker);
}

function implementationBranchPrefix(space, topology, requirementId) {
  const declared = topology?.spaces?.find((candidate) => candidate.space_id === space.space_id);
  const declaredPrefix = branchTemplatePrefix(declared?.branch);
  if (declaredPrefix) return declaredPrefix;
  const marker = space.branch.indexOf(requirementId);
  return marker > 0 ? space.branch.slice(0, marker) : "";
}

function ensureConflict(message, reason, payload = {}) {
  const error = new ConflictError(message, payload);
  error.ccbEnsureReason = reason;
  error.ccbEnsurePayload = payload;
  return error;
}

function ensureLastError(reason, spaceId, options, payload = {}) {
  return {
    op: "ensure",
    space_id: spaceId,
    reason,
    at: isoNow(options),
    ...payload
  };
}

function updateSpace(runtimeState, spaceId, updater) {
  return {
    ...runtimeState,
    spaces: runtimeState.spaces.map((space) =>
      space.space_id === spaceId ? updater(space) : space
    )
  };
}

function markEnsureFailure(runtimeState, spaceId, reason, options, payload = {}) {
  const lastError = ensureLastError(reason, spaceId, options, payload);
  const next = updateSpace(runtimeState, spaceId, (space) => ({
    ...space,
    last_error: lastError
  }));
  return {
    ...next,
    last_error: lastError,
    updated_at: isoNow(options)
  };
}

async function ensureSpaceWorktree(projectRoot, requirementId, topology, space, input = {}) {
  const workspace = spaceWorkspace(projectRoot, space);
  await git(workspace.repoRoot, ["worktree", "prune"], { ...input, cwd: workspace.repoRoot });
  const records = await worktreeRecords(workspace.repoRoot, { ...input, cwd: workspace.repoRoot });
  const targetRecord = records.find((record) => samePath(record.path, workspace.absolutePath));
  const branchRecord = records.find((record) => record.branch === workspace.branch);

  if (targetRecord && targetRecord.branch !== workspace.branch) {
    throw new ConflictError(`worktree path is checked out with unexpected branch: ${workspace.absolutePath}`, {
      path: workspace.absolutePath,
      space_id: space.space_id
    });
  }
  if (branchRecord && !samePath(branchRecord.path, workspace.absolutePath)) {
    throw new ConflictError(`worktree branch is already checked out at another path: ${workspace.branch}`, {
      path: branchRecord.path,
      space_id: space.space_id
    });
  }
  await assertPathAbsentOrExpectedWorktree(workspace.absolutePath, records);

  if (targetRecord) {
    if (!space.target_branch || !space.base_sha) {
      throw new ConflictError(`worktree exists but runtime target state is missing: ${requirementId}`, {
        path: workspace.absolutePath,
        space_id: space.space_id
      });
    }
    return {
      status: "existing",
      space: {
        ...space,
        status: "ready",
        last_error: null
      },
      workspace
    };
  }

  if (await branchExists(workspace.repoRoot, workspace.branch, { ...input, cwd: workspace.repoRoot })) {
    throw new ConflictError(`worktree branch already exists without the expected worktree: ${workspace.branch}`, {
      space_id: space.space_id
    });
  }

  let targetBranch;
  try {
    targetBranch = await currentBranch(workspace.repoRoot, { ...input, cwd: workspace.repoRoot });
  } catch (error) {
    if (error instanceof ConflictError) {
      throw ensureConflict(
        `implementation space canonical checkout is detached: ${space.space_id}`,
        "target_branch_detached",
        { space_id: space.space_id, repo: space.repo }
      );
    }
    throw error;
  }

  const branchPrefix = implementationBranchPrefix(space, topology, requirementId);
  if (branchPrefix && targetBranch.startsWith(branchPrefix)) {
    throw ensureConflict(
      `implementation branch cannot be captured as merge target: ${targetBranch}`,
      "implementation_branch_as_target",
      { space_id: space.space_id, captured_target: targetBranch }
    );
  }

  const baseSha = await headSha(workspace.repoRoot, { ...input, cwd: workspace.repoRoot });
  await git(
    workspace.repoRoot,
    ["worktree", "add", "-b", workspace.branch, workspace.absolutePath, "HEAD"],
    { ...input, cwd: workspace.repoRoot }
  );

  return {
    status: "created",
    space: {
      ...space,
      target_branch: targetBranch,
      base_sha: baseSha,
      status: "ready",
      last_error: null
    },
    workspace
  };
}

export function requirementWorktreeStatePath(projectRoot, requirementId) {
  return statePath(normalizeProjectRoot(projectRoot), requiredString(requirementId, "requirementId"));
}

export async function ensureRequirementWorktree(input = {}) {
  const projectRoot = normalizeProjectRoot(input.projectRoot);
  const requirementId = requiredString(input.requirementId, "requirementId");

  return await withRequirementLock(projectRoot, requirementId, input, async () => {
    const topology = await loadImplementationTopology({ projectRoot });
    const expanded = expandTopology({
      topology,
      requirementId,
      codeWorkspace: input.codeWorkspace,
      projectRoot
    });
    const { path: runtimeStatePath, state: existingState, rawState: existingRawState } =
      await readRuntimeState(projectRoot, requirementId, { normalized: true });
    const now = isoNow(input);
    let runtimeState = existingState ?? {
      schema_version: STATE_SCHEMA_VERSION,
      requirement_id: requirementId,
      aggregate_status: "pending",
      spaces: expanded.spaces,
      associations: expanded.associations,
      topology_source: topologySourceFor(topology, expanded.contentHash),
      last_error: null,
      created_at: now,
      updated_at: now
    };

    const rootSpace = rootSpaceOrThrow(runtimeState.spaces);
    assertRootSpaceMatchesWorkspace(projectRoot, rootSpace, input.codeWorkspace);

    if (!["pending", "ready"].includes(runtimeState.aggregate_status)) {
      throw new ConflictError(`requirement worktree is already ${runtimeState.aggregate_status}: ${requirementId}`);
    }

    if (!existingState) {
      await writeRuntimeState(projectRoot, requirementId, runtimeState, "ensure", input);
    }

    let createdAny = false;
    let existingAny = false;
    let forceStateWrite = !existingState || existingRawState?.schema_version !== STATE_SCHEMA_VERSION;
    for (const space of runtimeState.spaces) {
      try {
        const result = await ensureSpaceWorktree(projectRoot, requirementId, topology, space, input);
        createdAny = createdAny || result.status === "created";
        existingAny = existingAny || result.status === "existing";
        const shouldWriteState = forceStateWrite ||
          result.status !== "existing" ||
          space.status !== "ready" ||
          space.last_error !== null ||
          runtimeState.last_error !== null;
        runtimeState = normalizeWorktreeStateV02({
          ...updateSpace(runtimeState, space.space_id, () => result.space),
          last_error: null,
          updated_at: shouldWriteState ? isoNow(input) : runtimeState.updated_at
        });
        if (shouldWriteState) {
          await writeRuntimeState(projectRoot, requirementId, runtimeState, "ensure", input);
          forceStateWrite = false;
        }
        await appendWorktreeEvent(
          projectRoot,
          requirementId,
          result.status === "existing" ? "requirement_worktree_ensure_noop" : "requirement_worktree_ensured",
          {
            space_id: result.space.space_id,
            repo: result.space.repo,
            path: result.space.path,
            branch: result.space.branch,
            confirmed_target_branch: result.space.target_branch,
            base_sha: result.space.base_sha
          },
          input
        );
      } catch (error) {
        const reason = error?.ccbEnsureReason ?? "ensure_failed";
        const payload = error?.ccbEnsurePayload ?? { space_id: space.space_id };
        runtimeState = markEnsureFailure(runtimeState, space.space_id, reason, input, payload);
        await writeRuntimeState(projectRoot, requirementId, runtimeState, "ensure", input);
        if (reason === "implementation_branch_as_target" || reason === "target_branch_detached") {
          await appendEscalationEvent(projectRoot, requirementId, reason, {
            requirementId,
            ...payload
          }, input);
        }
        throw error;
      }
    }

    const finalRoot = rootSpaceOrThrow(runtimeState.spaces);
    const finalWorkspace = spaceWorkspace(projectRoot, finalRoot);
    const status = createdAny ? "created" : existingAny ? "existing" : "existing";
    return {
      status,
      requirementId,
      path: finalWorkspace.absolutePath,
      relativePath: finalWorkspace.relativePath,
      branch: finalWorkspace.branch,
      targetBranch: finalRoot.target_branch,
      baseSha: finalRoot.base_sha,
      statePath: runtimeStatePath,
      spaces: runtimeState.spaces.map((space) => ({
        space_id: space.space_id,
        repo: space.repo,
        path: resolve(projectRoot, space.path),
        relativePath: space.path,
        branch: space.branch,
        targetBranch: space.target_branch,
        baseSha: space.base_sha,
        status: space.status
      })),
      aggregateStatus: runtimeState.aggregate_status
    };
  });
}

async function mergeMultiSpaceRequirementWorktree(projectRoot, requirementId, runtimeStatePath, initialState, input = {}) {
  let runtimeState = initialState;
  assertRootWorkspaceForRuntime(projectRoot, runtimeState, input.codeWorkspace);

  if (runtimeState.aggregate_status === "merged") {
    return {
      status: "merged",
      requirementId,
      statePath: runtimeStatePath,
      aggregateStatus: "merged",
      spaces: spaceSummary(runtimeState)
    };
  }
  if (!mergeGateAllows(runtimeState)) {
    throw new ConflictError(`requirement worktree aggregate must be ready before merge: ${requirementId}`, {
      aggregate_status: runtimeState.aggregate_status,
      last_error: runtimeState.last_error
    });
  }

  for (const space of runtimeState.spaces) {
    const failure = await preflightMergeSpace(projectRoot, requirementId, space, input);
    if (failure) {
      const recorded = await recordMultiFailure(
        projectRoot,
        requirementId,
        runtimeState,
        "merge",
        failure.reason,
        failure.payload,
        input
      );
      return recorded.result;
    }
  }

  const mergeWarnings = [];
  for (const space of mergeOrder(runtimeState.spaces)) {
    if (space.status === "merged") continue;
    const merged = await mergeOneSpace(projectRoot, requirementId, runtimeState, space, input);
    if (merged.failure) {
      const recorded = await recordMultiFailure(
        projectRoot,
        requirementId,
        runtimeState,
        "merge",
        merged.failure.reason,
        merged.failure.payload,
        input
      );
      return recorded.result;
    }
    mergeWarnings.push(...merged.warnings);
    const nextRaw = updateSpace(runtimeState, space.space_id, () => merged.space);
    const checkpoint = mergeCheckpointLastError(nextRaw, input);
    runtimeState = await writeMultiRuntimeState(projectRoot, requirementId, {
      ...nextRaw,
      last_error: checkpoint,
      updated_at: isoNow(input)
    }, "merge", input);
  }

  if (runtimeState.associations.some((association) => association.status !== "synced")) {
    runtimeState = await writeMultiRuntimeState(projectRoot, requirementId, {
      ...runtimeState,
      last_error: operationLastError("associate", "association_pending", input),
      updated_at: isoNow(input)
    }, "merge", input);
  }

  for (const association of runtimeState.associations) {
    const synced = await runAssociationExecutor(projectRoot, requirementId, runtimeState, association, input);
    if (synced.failure) {
      const recorded = await recordMultiFailure(
        projectRoot,
        requirementId,
        runtimeState,
        "associate",
        synced.failure.reason,
        synced.failure.payload,
        input
      );
      return recorded.result;
    }
    const nextRaw = updateAssociation(runtimeState, association.association_id, () => synced.association);
    const checkpoint = mergeCheckpointLastError(nextRaw, input);
    runtimeState = await writeMultiRuntimeState(projectRoot, requirementId, {
      ...nextRaw,
      last_error: checkpoint,
      updated_at: isoNow(input)
    }, "associate", input);
    await appendWorktreeEvent(
      projectRoot,
      requirementId,
      "requirement_worktree_association_synced",
      {
        association_id: synced.association.association_id,
        kind: synced.association.kind,
        synced_commit_sha: synced.association.synced_commit_sha,
        noop: synced.association.noop,
        spaces: spaceSummary(runtimeState)
      },
      input
    );
  }

  runtimeState = await writeMultiRuntimeState(projectRoot, requirementId, {
    ...runtimeState,
    last_error: null,
    updated_at: isoNow(input)
  }, "merge", input);
  await appendWorktreeEvent(
    projectRoot,
    requirementId,
    "requirement_worktree_merged",
    {
      spaces: spaceSummary(runtimeState),
      warnings: mergeWarnings
    },
    input
  );

  return {
    status: "merged",
    requirementId,
    statePath: runtimeStatePath,
    aggregateStatus: runtimeState.aggregate_status,
    spaces: spaceSummary(runtimeState),
    warnings: mergeWarnings
  };
}

export async function mergeRequirementWorktree(input = {}) {
  const projectRoot = normalizeProjectRoot(input.projectRoot);
  const requirementId = requiredString(input.requirementId, "requirementId");

  return await withRequirementLock(projectRoot, requirementId, input, async () => {
    const { path: runtimeStatePath, state: normalizedState } = await readRuntimeState(projectRoot, requirementId, { normalized: true });
    if (isMultiSpaceRuntime(normalizedState)) {
      return await mergeMultiSpaceRequirementWorktree(projectRoot, requirementId, runtimeStatePath, normalizedState, input);
    }
    await git(projectRoot, ["worktree", "prune"], input);
    const runtimeState = singleSpaceRuntimeView(normalizedState);
    if (!runtimeState) {
      const result = escalation("missing_runtime_state", { requirementId, statePath: runtimeStatePath });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }

    const workspace = normalizeWorkspace(projectRoot, input.codeWorkspace, runtimeState);
    assertStateMatchesWorkspace(runtimeState, workspace);
    if (runtimeState.status === "merged") {
      return {
        status: "merged",
        requirementId,
        path: workspace.absolutePath,
        relativePath: workspace.relativePath,
        branch: workspace.branch,
        targetBranch: runtimeState.confirmed_target_branch,
        mergedBranchSha: runtimeState.merged_branch_sha,
        targetShaAfterMerge: runtimeState.target_sha_after_merge,
        statePath: runtimeStatePath
      };
    }
    if (runtimeState.status !== "ready") {
      throw new ConflictError(`requirement worktree must be ready before merge: ${requirementId}`, {
        status: runtimeState.status
      });
    }

    const targetBranch = runtimeState.confirmed_target_branch;
    if (!targetBranch) {
      const result = escalation("missing_target_branch", { requirementId, statePath: runtimeStatePath });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }

    const records = await worktreeRecords(projectRoot, input);
    const targetRecord = records.find((record) => samePath(record.path, workspace.absolutePath));
    if (!targetRecord) {
      const result = escalation("worktree_missing", {
        requirementId,
        path: workspace.absolutePath,
        branch: workspace.branch
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }
    if (targetRecord.branch !== workspace.branch) {
      const result = escalation("worktree_branch_mismatch", {
        requirementId,
        path: workspace.absolutePath,
        expectedBranch: workspace.branch,
        actualBranch: targetRecord.branch
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }
    if (!await branchExists(projectRoot, targetBranch, input)) {
      const result = escalation("target_branch_missing", {
        requirementId,
        targetBranch,
        path: workspace.absolutePath,
        branch: workspace.branch
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }

    let activeBranch;
    try {
      activeBranch = await currentBranch(projectRoot, input);
    } catch (error) {
      const result = escalation("target_branch_not_current", {
        requirementId,
        targetBranch,
        activeBranch: "HEAD"
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }
    if (activeBranch !== targetBranch) {
      const result = escalation("target_branch_not_current", {
        requirementId,
        targetBranch,
        activeBranch
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }

    const worktreeStatus = await statusPorcelain(workspace.absolutePath, input);
    if (worktreeStatus.trim()) {
      const result = escalation("worktree_dirty", {
        requirementId,
        path: workspace.absolutePath,
        porcelain: worktreeStatus
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }

    let lockedMerge;
    try {
      lockedMerge = await withCanonicalRepoLock(projectRoot, async () => {
        const syncResult = await canonicalSyncCommit(projectRoot, requirementId, input);
        if (syncResult.status === "escalated") {
          await appendEscalationEvent(projectRoot, requirementId, syncResult.reason, syncResult, input);
          return { completed: true, result: syncResult };
        }

        const warnings = await collectMergeWarnings(projectRoot, runtimeState, targetBranch, input);
        const branchSha = await gitOutput(projectRoot, ["rev-parse", workspace.branch], input);
        let mergeResult = { stdout: "", stderr: "" };
        if (!await isAncestor(projectRoot, branchSha, targetBranch, input)) {
          mergeResult = await git(projectRoot, ["merge", "--no-edit", workspace.branch], {
            ...input,
            allowFailure: true
          });
          if (mergeResult.exitCode !== 0) {
            await git(projectRoot, ["merge", "--abort"], { ...input, allowFailure: true });
            const result = escalation("merge_conflict", {
              requirementId,
              targetBranch,
              branch: workspace.branch,
              path: workspace.absolutePath,
              warnings,
              stderr: mergeResult.stderr,
              stdout: mergeResult.stdout
            });
            await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
            return { completed: true, result };
          }
        }

        return {
          completed: false,
          syncResult,
          warnings,
          branchSha,
          mergeResult,
          targetShaAfterMerge: await headSha(projectRoot, input)
        };
      }, input);
    } catch (error) {
      if (error instanceof LockTimeoutError) {
        const result = escalation(
          "canonical_repo_lock_timeout",
          await canonicalRepoLockTimeoutPayload(projectRoot, requirementId, error)
        );
        await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
        return result;
      }
      throw error;
    }
    if (lockedMerge.completed) return lockedMerge.result;

    const now = isoNow(input);
    const mergedState = {
      ...runtimeState,
      status: "merged",
      merged_branch_sha: lockedMerge.branchSha,
      target_sha_after_merge: lockedMerge.targetShaAfterMerge,
      merged_at: runtimeState.merged_at ?? now,
      updated_at: now,
      merge: {
        target_branch: targetBranch,
        warnings: lockedMerge.warnings,
        canonical_sync: lockedMerge.syncResult,
        merge_stdout: lockedMerge.mergeResult.stdout,
        merge_stderr: lockedMerge.mergeResult.stderr
      }
    };
    await writeRuntimeState(projectRoot, requirementId, mergedState, "merge");
    await appendWorktreeEvent(
      projectRoot,
      requirementId,
      "requirement_worktree_merged",
      {
        path: workspace.relativePath,
        branch: workspace.branch,
        target_branch: targetBranch,
        merged_branch_sha: lockedMerge.branchSha,
        target_sha_after_merge: lockedMerge.targetShaAfterMerge,
        warnings: lockedMerge.warnings
      },
      input
    );

    return {
      status: "merged",
      requirementId,
      path: workspace.absolutePath,
      relativePath: workspace.relativePath,
      branch: workspace.branch,
      targetBranch,
      warnings: lockedMerge.warnings,
      mergedBranchSha: lockedMerge.branchSha,
      targetShaAfterMerge: lockedMerge.targetShaAfterMerge,
      statePath: runtimeStatePath
    };
  });
}

async function cleanupOneSpace(projectRoot, requirementId, space, options = {}) {
  const workspace = spaceWorkspace(projectRoot, space);
  const targetBranch = space.target_branch;
  const payloadBase = {
    space_id: space.space_id,
    path: workspace.absolutePath,
    branch: workspace.branch,
    targetBranch
  };
  const gitOptions = { ...options, cwd: workspace.repoRoot };
  if (space.status !== "merged") {
    return { failure: { reason: "cleanup_space_not_merged", payload: payloadBase } };
  }
  if (!targetBranch) {
    return { failure: { reason: "missing_target_branch", payload: payloadBase } };
  }
  if (!await branchExists(workspace.repoRoot, targetBranch, gitOptions)) {
    return { failure: { reason: "target_branch_missing", payload: payloadBase } };
  }

  let activeBranch;
  try {
    activeBranch = await currentBranch(workspace.repoRoot, gitOptions);
  } catch {
    return {
      failure: {
        reason: "target_branch_not_current",
        payload: { ...payloadBase, activeBranch: "HEAD" }
      }
    };
  }
  if (activeBranch !== targetBranch) {
    return {
      failure: {
        reason: "target_branch_not_current",
        payload: { ...payloadBase, activeBranch }
      }
    };
  }

  const records = await worktreeRecords(workspace.repoRoot, gitOptions);
  const targetRecord = records.find((record) => samePath(record.path, workspace.absolutePath));
  if (targetRecord && targetRecord.branch !== workspace.branch) {
    return {
      failure: {
        reason: "worktree_branch_mismatch",
        payload: {
          ...payloadBase,
          expectedBranch: workspace.branch,
          actualBranch: targetRecord.branch
        }
      }
    };
  }
  if (targetRecord) {
    const worktreeStatus = await statusPorcelain(workspace.absolutePath, options);
    if (worktreeStatus.trim()) {
      return {
        failure: {
          reason: "worktree_dirty",
          payload: { ...payloadBase, porcelain: worktreeStatus }
        }
      };
    }
  }

  const hasBranch = await branchExists(workspace.repoRoot, workspace.branch, gitOptions);
  if (!hasBranch && !targetRecord) {
    const mergedSha = space.merged_branch_sha;
    if (mergedSha &&
        await commitExists(workspace.repoRoot, mergedSha, gitOptions) &&
        await isAncestor(workspace.repoRoot, mergedSha, targetBranch, gitOptions)) {
      return {
        space: {
          ...space,
          status: "archived",
          archived_at: space.archived_at ?? isoNow(options),
          last_error: null,
          archive: {
            ...(space.archive ?? {}),
            target_branch: targetBranch,
            recovery: "git_resources_already_cleaned"
          }
        },
        removalForced: false,
        recovery: "git_resources_already_cleaned"
      };
    }
    return {
      failure: {
        reason: "worktree_branch_missing",
        payload: payloadBase
      }
    };
  }

  const branchSha = hasBranch
    ? await gitOutput(workspace.repoRoot, ["rev-parse", workspace.branch], gitOptions)
    : space.merged_branch_sha;
  if (!branchSha || !await isAncestor(workspace.repoRoot, branchSha, targetBranch, gitOptions)) {
    return {
      failure: {
        reason: "cleanup_branch_not_ancestor",
        payload: { ...payloadBase, branchSha }
      }
    };
  }

  let removalForced = false;
  if (targetRecord) {
    const removal = await removeWorktreeForCleanup(workspace.repoRoot, workspace.absolutePath, gitOptions);
    removalForced = removal.forceAttempted;
    if (!removal.removed) {
      return {
        failure: {
          reason: "cleanup_worktree_remove_failed",
          payload: {
            ...cleanupGitFailurePayload(requirementId, workspace, removal, removal.forceAttempted),
            space_id: space.space_id
          }
        }
      };
    }
  } else {
    await assertPathAbsentOrExpectedWorktree(workspace.absolutePath, records);
  }

  let shouldDeleteBranch;
  try {
    shouldDeleteBranch = await branchExists(workspace.repoRoot, workspace.branch, gitOptions);
  } catch (error) {
    return {
      failure: {
        reason: "cleanup_branch_delete_failed",
        payload: {
          ...cleanupGitFailurePayload(requirementId, workspace, gitFailureFromError(error), removalForced),
          space_id: space.space_id
        }
      }
    };
  }
  if (shouldDeleteBranch) {
    const branchDelete = await git(workspace.repoRoot, ["branch", "-d", workspace.branch], {
      ...gitOptions,
      allowFailure: true
    });
    if (branchDelete.exitCode !== 0) {
      return {
        failure: {
          reason: "cleanup_branch_delete_failed",
          payload: {
            ...cleanupGitFailurePayload(requirementId, workspace, branchDelete, removalForced),
            space_id: space.space_id
          }
        }
      };
    }
  }

  return {
    space: {
      ...space,
      status: "archived",
      archived_at: space.archived_at ?? isoNow(options),
      last_error: null,
      archive: {
        ...(space.archive ?? {}),
        target_branch: targetBranch,
        branch_sha: branchSha
      }
    },
    removalForced
  };
}

async function cleanupMultiSpaceRequirementWorktree(projectRoot, requirementId, runtimeStatePath, initialState, input = {}) {
  let runtimeState = initialState;
  assertRootWorkspaceForRuntime(projectRoot, runtimeState, input.codeWorkspace);

  if (runtimeState.aggregate_status === "archived") {
    return {
      status: "archived",
      requirementId,
      statePath: runtimeStatePath,
      aggregateStatus: "archived",
      spaces: spaceSummary(runtimeState)
    };
  }
  if (!cleanupGateAllows(runtimeState)) {
    throw new ConflictError(`requirement worktree must be merged before cleanup: ${requirementId}`, {
      aggregate_status: runtimeState.aggregate_status,
      last_error: runtimeState.last_error
    });
  }

  const archived = [];
  for (const space of runtimeState.spaces) {
    if (space.status === "archived") continue;
    const cleaned = await cleanupOneSpace(projectRoot, requirementId, space, input);
    if (cleaned.failure) {
      const recorded = await recordMultiFailure(
        projectRoot,
        requirementId,
        runtimeState,
        "cleanup",
        cleaned.failure.reason,
        cleaned.failure.payload,
        input
      );
      return recorded.result;
    }

    archived.push({
      space_id: cleaned.space.space_id,
      removal_forced: cleaned.removalForced,
      recovery: cleaned.recovery ?? null
    });
    const nextRaw = updateSpace(runtimeState, space.space_id, () => cleaned.space);
    runtimeState = await writeMultiRuntimeState(projectRoot, requirementId, {
      ...nextRaw,
      last_error: cleanupCheckpointLastError(nextRaw, input),
      updated_at: isoNow(input)
    }, "cleanup", input);
  }

  runtimeState = await writeMultiRuntimeState(projectRoot, requirementId, {
    ...runtimeState,
    last_error: null,
    updated_at: isoNow(input)
  }, "cleanup", input);
  await appendWorktreeEvent(
    projectRoot,
    requirementId,
    "requirement_worktree_archived",
    {
      spaces: spaceSummary(runtimeState),
      archived
    },
    input
  );

  return {
    status: "archived",
    requirementId,
    statePath: runtimeStatePath,
    aggregateStatus: runtimeState.aggregate_status,
    spaces: spaceSummary(runtimeState),
    archived
  };
}

export async function cleanupRequirementWorktree(input = {}) {
  const projectRoot = normalizeProjectRoot(input.projectRoot);
  const requirementId = requiredString(input.requirementId, "requirementId");

  return await withRequirementLock(projectRoot, requirementId, input, async () => {
    const { path: runtimeStatePath, state: normalizedState } = await readRuntimeState(projectRoot, requirementId, { normalized: true });
    if (isMultiSpaceRuntime(normalizedState)) {
      return await cleanupMultiSpaceRequirementWorktree(projectRoot, requirementId, runtimeStatePath, normalizedState, input);
    }
    await git(projectRoot, ["worktree", "prune"], input);
    const runtimeState = singleSpaceRuntimeView(normalizedState);
    if (!runtimeState) {
      const result = escalation("missing_runtime_state", { requirementId, statePath: runtimeStatePath });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }

    const workspace = normalizeWorkspace(projectRoot, input.codeWorkspace, runtimeState);
    assertStateMatchesWorkspace(runtimeState, workspace);
    if (runtimeState.status === "archived") {
      return {
        status: "archived",
        requirementId,
        path: workspace.absolutePath,
        relativePath: workspace.relativePath,
        branch: workspace.branch,
        targetBranch: runtimeState.confirmed_target_branch,
        statePath: runtimeStatePath
      };
    }
    if (runtimeState.status !== "merged") {
      throw new ConflictError(`requirement worktree must be merged before cleanup: ${requirementId}`, {
        status: runtimeState.status
      });
    }

    const targetBranch = runtimeState.confirmed_target_branch;
    if (!targetBranch) {
      const result = escalation("missing_target_branch", { requirementId, statePath: runtimeStatePath });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }
    if (!await branchExists(projectRoot, targetBranch, input)) {
      const result = escalation("target_branch_missing", {
        requirementId,
        targetBranch,
        path: workspace.absolutePath,
        branch: workspace.branch
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }

    let activeBranch;
    try {
      activeBranch = await currentBranch(projectRoot, input);
    } catch {
      const result = escalation("target_branch_not_current", {
        requirementId,
        targetBranch,
        activeBranch: "HEAD"
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }
    if (activeBranch !== targetBranch) {
      const result = escalation("target_branch_not_current", {
        requirementId,
        targetBranch,
        activeBranch
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }

    const records = await worktreeRecords(projectRoot, input);
    const targetRecord = records.find((record) => samePath(record.path, workspace.absolutePath));
    if (targetRecord && targetRecord.branch !== workspace.branch) {
      const result = escalation("worktree_branch_mismatch", {
        requirementId,
        path: workspace.absolutePath,
        expectedBranch: workspace.branch,
        actualBranch: targetRecord.branch
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }
    if (targetRecord) {
      const worktreeStatus = await statusPorcelain(workspace.absolutePath, input);
      if (worktreeStatus.trim()) {
        const result = escalation("worktree_dirty", {
          requirementId,
          path: workspace.absolutePath,
          porcelain: worktreeStatus
        });
        await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
        return result;
      }
    }

    const hasBranch = await branchExists(projectRoot, workspace.branch, input);
    if (!hasBranch && !targetRecord) {
      const mergedSha = runtimeState.merged_branch_sha;
      if (mergedSha && await commitExists(projectRoot, mergedSha, input) && await isAncestor(projectRoot, mergedSha, targetBranch, input)) {
        const now = isoNow(input);
        const archivedState = {
          ...runtimeState,
          status: "archived",
          archived_at: runtimeState.archived_at ?? now,
          updated_at: now,
          archive: {
            ...(runtimeState.archive ?? {}),
            target_branch: targetBranch,
            recovery: "git_resources_already_cleaned"
          }
        };
        await writeRuntimeState(projectRoot, requirementId, archivedState, "cleanup");
        await appendWorktreeEvent(
          projectRoot,
          requirementId,
          "requirement_worktree_archived",
          {
            path: workspace.relativePath,
            branch: workspace.branch,
            target_branch: targetBranch,
            recovery: "git_resources_already_cleaned",
            removal_forced: false
          },
          input
        );
        return {
          status: "archived",
          requirementId,
          path: workspace.absolutePath,
          relativePath: workspace.relativePath,
          branch: workspace.branch,
          targetBranch,
          statePath: runtimeStatePath,
          recovery: "git_resources_already_cleaned"
        };
      }
      const result = escalation("worktree_branch_missing", {
        requirementId,
        path: workspace.absolutePath,
        branch: workspace.branch
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }

    const branchSha = hasBranch
      ? await gitOutput(projectRoot, ["rev-parse", workspace.branch], input)
      : runtimeState.merged_branch_sha;
    if (!branchSha || !await isAncestor(projectRoot, branchSha, targetBranch, input)) {
      const result = escalation("cleanup_branch_not_ancestor", {
        requirementId,
        targetBranch,
        branch: workspace.branch,
        branchSha
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }

    let removalForced = false;
    if (targetRecord) {
      const removal = await removeWorktreeForCleanup(projectRoot, workspace.absolutePath, input);
      removalForced = removal.forceAttempted;
      if (!removal.removed) {
        const result = escalation(
          "cleanup_worktree_remove_failed",
          cleanupGitFailurePayload(requirementId, workspace, removal, removal.forceAttempted)
        );
        await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
        return result;
      }
    } else {
      await assertPathAbsentOrExpectedWorktree(workspace.absolutePath, records);
    }
    let shouldDeleteBranch;
    try {
      shouldDeleteBranch = await branchExists(projectRoot, workspace.branch, input);
    } catch (error) {
      const result = escalation(
        "cleanup_branch_delete_failed",
        cleanupGitFailurePayload(requirementId, workspace, gitFailureFromError(error), removalForced)
      );
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }
    if (shouldDeleteBranch) {
      const branchDelete = await git(projectRoot, ["branch", "-d", workspace.branch], {
        ...input,
        allowFailure: true
      });
      if (branchDelete.exitCode !== 0) {
        const result = escalation(
          "cleanup_branch_delete_failed",
          cleanupGitFailurePayload(requirementId, workspace, branchDelete, removalForced)
        );
        await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
        return result;
      }
    }

    const now = isoNow(input);
    const archivedState = {
      ...runtimeState,
      status: "archived",
      archived_at: runtimeState.archived_at ?? now,
      updated_at: now,
      archive: {
        ...(runtimeState.archive ?? {}),
        target_branch: targetBranch,
        branch_sha: branchSha
      }
    };
    await writeRuntimeState(projectRoot, requirementId, archivedState, "cleanup");
    await appendWorktreeEvent(
      projectRoot,
      requirementId,
      "requirement_worktree_archived",
      {
        path: workspace.relativePath,
        branch: workspace.branch,
        target_branch: targetBranch,
        removal_forced: removalForced
      },
      input
    );

    return {
      status: "archived",
      requirementId,
      path: workspace.absolutePath,
      relativePath: workspace.relativePath,
      branch: workspace.branch,
      targetBranch,
      statePath: runtimeStatePath
    };
  });
}

async function reopenMultiSpaceRequirementWorktree(projectRoot, requirementId, runtimeStatePath, runtimeState, input = {}) {
  assertRootWorkspaceForRuntime(projectRoot, runtimeState, input.codeWorkspace);
  if (runtimeState.aggregate_status !== "merged") {
    throw new ConflictError(`requirement worktree must be merged before reopen: ${requirementId}`, {
      aggregate_status: runtimeState.aggregate_status,
      last_error: runtimeState.last_error
    });
  }

  for (const space of runtimeState.spaces) {
    const failure = await preflightReopenSpace(projectRoot, space, input);
    if (failure) {
      const result = escalation(failure.reason, {
        requirementId,
        op: "reopen",
        spaces: spaceSummary(runtimeState),
        ...failure.payload
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }
  }

  const now = isoNow(input);
  const readyState = await writeMultiRuntimeState(projectRoot, requirementId, {
    ...runtimeState,
    spaces: runtimeState.spaces.map((space) => ({
      ...space,
      status: "ready",
      reopened_at: now,
      last_error: null
    })),
    associations: runtimeState.associations.map((association) => ({
      ...association,
      status: "pending",
      synced_commit_sha: null,
      noop: false,
      synced_at: null,
      last_error: null
    })),
    last_error: null,
    updated_at: now
  }, "reopen", input);
  await appendWorktreeEvent(
    projectRoot,
    requirementId,
    "requirement_worktree_reopened",
    {
      spaces: spaceSummary(readyState)
    },
    input
  );

  return {
    status: "ready",
    requirementId,
    statePath: runtimeStatePath,
    aggregateStatus: readyState.aggregate_status,
    spaces: spaceSummary(readyState)
  };
}

export async function reopenRequirementWorktree(input = {}) {
  const projectRoot = normalizeProjectRoot(input.projectRoot);
  const requirementId = requiredString(input.requirementId, "requirementId");

  return await withRequirementLock(projectRoot, requirementId, input, async () => {
    const { path: runtimeStatePath, state: normalizedState } = await readRuntimeState(projectRoot, requirementId, { normalized: true });
    if (isMultiSpaceRuntime(normalizedState)) {
      return await reopenMultiSpaceRequirementWorktree(projectRoot, requirementId, runtimeStatePath, normalizedState, input);
    }
    await git(projectRoot, ["worktree", "prune"], input);
    const runtimeState = singleSpaceRuntimeView(normalizedState);
    if (!runtimeState) {
      const result = escalation("missing_runtime_state", { requirementId, statePath: runtimeStatePath });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }

    const workspace = normalizeWorkspace(projectRoot, input.codeWorkspace, runtimeState);
    assertStateMatchesWorkspace(runtimeState, workspace);
    if (runtimeState.status !== "merged") {
      throw new ConflictError(`requirement worktree must be merged before reopen: ${requirementId}`, {
        status: runtimeState.status
      });
    }

    const records = await worktreeRecords(projectRoot, input);
    const targetRecord = records.find((record) => samePath(record.path, workspace.absolutePath));
    if (!targetRecord) {
      const result = escalation("worktree_missing", {
        requirementId,
        path: workspace.absolutePath,
        branch: workspace.branch
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }
    if (targetRecord.branch !== workspace.branch) {
      const result = escalation("worktree_branch_mismatch", {
        requirementId,
        path: workspace.absolutePath,
        expectedBranch: workspace.branch,
        actualBranch: targetRecord.branch
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }
    if (!await branchExists(projectRoot, workspace.branch, input)) {
      const result = escalation("worktree_branch_missing", {
        requirementId,
        path: workspace.absolutePath,
        branch: workspace.branch
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }

    const worktreeStatus = await statusPorcelain(workspace.absolutePath, input);
    if (worktreeStatus.trim()) {
      const result = escalation("worktree_dirty", {
        requirementId,
        path: workspace.absolutePath,
        porcelain: worktreeStatus
      });
      await appendEscalationEvent(projectRoot, requirementId, result.reason, result, input);
      return result;
    }

    const now = isoNow(input);
    const readyState = {
      ...runtimeState,
      status: "ready",
      reopened_at: now,
      updated_at: now
    };
    await writeRuntimeState(projectRoot, requirementId, readyState, "reopen");
    await appendWorktreeEvent(
      projectRoot,
      requirementId,
      "requirement_worktree_reopened",
      {
        path: workspace.relativePath,
        branch: workspace.branch,
        target_branch: runtimeState.confirmed_target_branch
      },
      input
    );

    return {
      status: "ready",
      requirementId,
      path: workspace.absolutePath,
      relativePath: workspace.relativePath,
      branch: workspace.branch,
      targetBranch: runtimeState.confirmed_target_branch,
      statePath: runtimeStatePath
    };
  });
}

/**
 * Legacy compatibility wrapper: requirement-level archive remains merge followed by cleanup.
 */
export async function archiveRequirementWorktree(input = {}) {
  const merged = await mergeRequirementWorktree(input);
  if (merged.status === "escalated") return merged;
  const cleaned = await cleanupRequirementWorktree(input);
  return {
    ...cleaned,
    warnings: cleaned.warnings ?? merged.warnings ?? []
  };
}

async function discardOneSpace(projectRoot, space, options = {}) {
  const workspace = spaceWorkspace(projectRoot, space);
  const gitOptions = { ...options, cwd: workspace.repoRoot };
  const records = await worktreeRecords(workspace.repoRoot, gitOptions);
  const targetRecord = records.find((record) => samePath(record.path, workspace.absolutePath));
  if (targetRecord) {
    if (targetRecord.branch !== workspace.branch) {
      throw new ConflictError(`worktree path is checked out with unexpected branch: ${workspace.absolutePath}`, {
        path: workspace.absolutePath,
        space_id: space.space_id
      });
    }
    await git(workspace.repoRoot, ["worktree", "remove", "--force", workspace.absolutePath], gitOptions);
  } else {
    await assertPathAbsentOrExpectedWorktree(workspace.absolutePath, records);
  }

  if (await branchExists(workspace.repoRoot, workspace.branch, gitOptions)) {
    await git(workspace.repoRoot, ["branch", "-D", workspace.branch], gitOptions);
  }
}

async function discardMultiSpaceRequirementWorktree(projectRoot, requirementId, runtimeStatePath, runtimeState, input = {}) {
  assertRootWorkspaceForRuntime(projectRoot, runtimeState, input.codeWorkspace);
  if (!discardGateAllows(runtimeState)) {
    throw new ConflictError(`requirement worktree must be pending or ready before discard: ${requirementId}`, {
      aggregate_status: runtimeState.aggregate_status,
      spaces: spaceSummary(runtimeState)
    });
  }

  for (const space of runtimeState.spaces) {
    try {
      await discardOneSpace(projectRoot, space, input);
    } catch (error) {
      if (error instanceof ConflictError) throw error;
      const recorded = await recordMultiFailure(
        projectRoot,
        requirementId,
        runtimeState,
        "discard",
        "discard_failed",
        {
          space_id: space.space_id,
          path: spaceWorkspace(projectRoot, space).absolutePath,
          branch: space.branch,
          error: error instanceof Error ? error.message : String(error)
        },
        input
      );
      return recorded.result;
    }
  }

  const now = isoNow(input);
  const discardedState = await writeMultiRuntimeState(projectRoot, requirementId, {
    ...runtimeState,
    spaces: runtimeState.spaces.map((space) => ({
      ...space,
      status: "discarded",
      discarded_at: space.discarded_at ?? now,
      last_error: null
    })),
    last_error: null,
    updated_at: now
  }, "discard", input);
  await appendWorktreeEvent(
    projectRoot,
    requirementId,
    "requirement_worktree_discarded",
    {
      spaces: spaceSummary(discardedState)
    },
    input
  );

  return {
    status: "discarded",
    requirementId,
    statePath: runtimeStatePath,
    aggregateStatus: discardedState.aggregate_status,
    spaces: spaceSummary(discardedState)
  };
}

export async function discardRequirementWorktree(input = {}) {
  const projectRoot = normalizeProjectRoot(input.projectRoot);
  const requirementId = requiredString(input.requirementId, "requirementId");

  return await withRequirementLock(projectRoot, requirementId, input, async () => {
    const { path: runtimeStatePath, state: normalizedState } = await readRuntimeState(projectRoot, requirementId, { normalized: true });
    if (isMultiSpaceRuntime(normalizedState)) {
      return await discardMultiSpaceRequirementWorktree(projectRoot, requirementId, runtimeStatePath, normalizedState, input);
    }
    await git(projectRoot, ["worktree", "prune"], input);
    const runtimeState = singleSpaceRuntimeView(normalizedState);
    if (runtimeState?.status && runtimeState.status !== "ready") {
      throw new ConflictError(`requirement worktree must be ready before discard: ${requirementId}`, {
        status: runtimeState.status
      });
    }
    const workspace = normalizeWorkspace(projectRoot, input.codeWorkspace, runtimeState);
    assertStateMatchesWorkspace(runtimeState, workspace);

    const records = await worktreeRecords(projectRoot, input);
    const targetRecord = records.find((record) => samePath(record.path, workspace.absolutePath));
    if (targetRecord) {
      if (targetRecord.branch !== workspace.branch) {
        throw new ConflictError(`worktree path is checked out with unexpected branch: ${workspace.absolutePath}`, {
          path: workspace.absolutePath
        });
      }
      await git(projectRoot, ["worktree", "remove", "--force", workspace.absolutePath], input);
    } else {
      await assertPathAbsentOrExpectedWorktree(workspace.absolutePath, records);
    }

    if (await branchExists(projectRoot, workspace.branch, input)) {
      await git(projectRoot, ["branch", "-D", workspace.branch], input);
    }

    const now = isoNow(input);
    const discardedState = {
      ...(runtimeState ?? {
        schema_version: STATE_SCHEMA_VERSION,
        requirement_id: requirementId,
        path: workspace.relativePath,
        branch: workspace.branch,
        confirmed_target_branch: null,
        base_sha: null,
        created_at: null
      }),
      status: "discarded",
      discarded_at: now,
      updated_at: now
    };
    await writeRuntimeState(projectRoot, requirementId, discardedState, "discard");
    await appendWorktreeEvent(
      projectRoot,
      requirementId,
      "requirement_worktree_discarded",
      {
        path: workspace.relativePath,
        branch: workspace.branch
      },
      input
    );

    return {
      status: "discarded",
      requirementId,
      path: workspace.absolutePath,
      relativePath: workspace.relativePath,
      branch: workspace.branch,
      statePath: runtimeStatePath
    };
  });
}
