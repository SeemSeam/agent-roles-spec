import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { applyCapabilityOutcome } from "../../capability-outcome/index.mjs";
import { acquireFileLock, ConflictError, hashContent } from "../../runtime/index.mjs";
import { getAssociationExecutor } from "../associations.mjs";
import {
  canonicalSyncAllowlist,
  classifyDirtyEntries,
  classifyDirtyPath,
  DIRTY_FOREIGN,
  DIRTY_OWN,
  DIRTY_TOLERATE,
  parseStatusEntries
} from "../dirty-classifier.mjs";
import { computeAggregateStatus } from "../state.mjs";
import { expandTopology, zeroImplementationTopology } from "../topology.mjs";
import {
  codeWorkspace as multiRepoCodeWorkspace,
  createMultiRepoFixture,
  createThreeRepoFixture,
  git as fixtureGit,
  readJournalEvents as readMultiRepoJournalEvents,
  readState as readMultiRepoState,
  runGitResult as runFixtureGitResult,
  spaceWorktreePath,
  twoSpaceTopologyYaml
} from "./helpers/multi-repo-fixture.mjs";
import {
  archiveRequirementWorktree,
  cleanupRequirementWorktree,
  discardRequirementWorktree,
  ensureRequirementWorktree,
  mergeRequirementWorktree,
  requirementWorktreeStatePath,
  reopenRequirementWorktree
} from "../index.mjs";

process.env.CCB_EVENT_HOOK_URLS = "";

const execFileAsync = promisify(execFile);

async function git(cwd, args, options = {}) {
  const result = await execFileAsync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    ...options
  });
  return (result.stdout ?? "").trim();
}

async function runGitResult(cwd, args, options = {}) {
  try {
    const result = await execFileAsync("git", args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      env: options.env ? { ...process.env, ...options.env } : undefined
    });
    return {
      exitCode: 0,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? ""
    };
  } catch (error) {
    return {
      exitCode: Number.isInteger(error?.code) ? error.code : 1,
      stdout: error?.stdout ?? "",
      stderr: error?.stderr ?? ""
    };
  }
}

async function pathPresent(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function tempGitProject() {
  const baseDir = join(tmpdir(), `ccb-worktree-lib-${randomUUID()}`);
  const projectRoot = join(baseDir, "repo");
  await mkdir(projectRoot, { recursive: true });
  await git(projectRoot, ["init", "-b", "main"]);
  await git(projectRoot, ["config", "user.email", "ccb-test@example.invalid"]);
  await git(projectRoot, ["config", "user.name", "CCB Test"]);
  await writeFile(join(projectRoot, "README.md"), "initial\n", "utf8");
  await writeFile(join(projectRoot, ".gitignore"), "/.ccb/\n", "utf8");
  await git(projectRoot, ["add", "README.md", ".gitignore"]);
  await git(projectRoot, ["commit", "-m", "initial"]);
  return { baseDir, projectRoot };
}

function codeWorkspace(requirementId) {
  return {
    path: `../SU-CCB-req-${requirementId}`,
    branch: `ccb/req-${requirementId}`
  };
}

function worktreePath(projectRoot, requirementId) {
  return resolve(projectRoot, codeWorkspace(requirementId).path);
}

function canonicalRepoLockTargetPath(projectRoot) {
  return join(projectRoot, ".ccb", "locks", "canonical-repo");
}

function deferred() {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

async function readState(projectRoot, requirementId) {
  return JSON.parse(await readFile(requirementWorktreeStatePath(projectRoot, requirementId), "utf8"));
}

function rootSpace(state) {
  return state.spaces?.find((space) => space.space_id === "root") ?? state;
}

function rootStatus(state) {
  return rootSpace(state).status;
}

function spaceById(state, spaceId) {
  return state.spaces.find((space) => space.space_id === spaceId);
}

function associationById(state, associationId) {
  return state.associations.find((association) => association.association_id === associationId);
}

async function readJournalEvents(projectRoot) {
  const journal = await readFile(join(projectRoot, "docs", ".ccb", "events", "journal.jsonl"), "utf8");
  return journal
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function commitCanonicalState(projectRoot, message = "commit runtime state") {
  await git(projectRoot, ["add", "docs/.ccb"]);
  await git(projectRoot, ["commit", "-m", message]);
}

async function branchExists(projectRoot, branch) {
  try {
    await git(projectRoot, ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`]);
    return true;
  } catch {
    return false;
  }
}

async function commitWorktreeFile(worktreeRoot, fileName, content, message) {
  await writeFile(join(worktreeRoot, fileName), content, "utf8");
  await git(worktreeRoot, ["add", fileName]);
  await git(worktreeRoot, ["commit", "-m", message]);
  return await git(worktreeRoot, ["rev-parse", "HEAD"]);
}

async function overwriteRuntimeState(projectRoot, requirementId, patch) {
  const statePath = requirementWorktreeStatePath(projectRoot, requirementId);
  const state = JSON.parse(await readFile(statePath, "utf8"));
  if (Array.isArray(state.spaces)) {
    const rootPatch = {};
    const topLevelPatch = { ...patch };
    for (const key of [
      "status",
      "base_sha",
      "merged_branch_sha",
      "target_sha_after_merge",
      "merged_at",
      "archived_at",
      "discarded_at",
      "reopened_at",
      "merge",
      "archive",
      "last_error"
    ]) {
      if (Object.hasOwn(topLevelPatch, key)) {
        rootPatch[key] = topLevelPatch[key];
        delete topLevelPatch[key];
      }
    }
    if (Object.hasOwn(topLevelPatch, "confirmed_target_branch")) {
      rootPatch.target_branch = topLevelPatch.confirmed_target_branch;
      delete topLevelPatch.confirmed_target_branch;
    }
    const nextSpaces = state.spaces.map((space) =>
      space.space_id === "root" ? { ...space, ...rootPatch } : space
    );
    const nextState = {
      ...state,
      ...topLevelPatch,
      spaces: nextSpaces,
      aggregate_status: computeAggregateStatus(nextSpaces, state.associations ?? [])
    };
    await writeFile(statePath, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
    return;
  }
  await writeFile(statePath, `${JSON.stringify({ ...state, ...patch }, null, 2)}\n`, "utf8");
}

async function mutateRuntimeState(projectRoot, requirementId, mutator) {
  const statePath = requirementWorktreeStatePath(projectRoot, requirementId);
  const state = JSON.parse(await readFile(statePath, "utf8"));
  const next = mutator(state);
  if (Array.isArray(next.spaces)) {
    next.aggregate_status = next.last_error
      ? "escalated"
      : computeAggregateStatus(next.spaces, next.associations ?? []);
  }
  await writeFile(statePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function fakeAssociationFixtureOptions(options = {}) {
  return {
    ...options,
    associationKind: options.associationKind ?? "test_fake_association"
  };
}

async function markMultiSpacesMerged(projectRoot, requirementId) {
  const state = await readMultiRepoState(projectRoot, requirementId);
  const rootHead = await fixtureGit(projectRoot, ["rev-parse", "HEAD"]);
  const pluginHead = await fixtureGit(join(projectRoot, "vendor", "plugin"), ["rev-parse", "HEAD"]);
  await mutateRuntimeState(projectRoot, requirementId, (current) => ({
    ...current,
    spaces: current.spaces.map((space) => ({
      ...space,
      status: "merged",
      merged_branch_sha: space.space_id === "root" ? rootHead : pluginHead,
      target_sha_after_merge: space.space_id === "root" ? rootHead : pluginHead,
      merged_at: "2026-06-07T00:00:00.000Z",
      last_error: null
    })),
    associations: current.associations.map((association) => ({
      ...association,
      status: "pending",
      synced_commit_sha: null,
      noop: false,
      synced_at: null,
      last_error: null
    })),
    last_error: state.last_error ?? null
  }));
}

async function readGitlinkSha(projectRoot, submodulePath) {
  return await fixtureGit(projectRoot, ["rev-parse", `HEAD:${submodulePath}`]);
}

function executorSpacesById(projectRoot, state) {
  return new Map(state.spaces.map((space) => [space.space_id, {
    ...space,
    repoRoot: resolve(projectRoot, space.repo),
    absolutePath: resolve(projectRoot, space.path),
    relativePath: space.path
  }]));
}

async function writeRequirementDoc(projectRoot, requirementId, content = []) {
  const path = join(projectRoot, requirementMarkdownRelativePath(requirementId));
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, [
    "---",
    `id: ${requirementId}`,
    "doc_type: requirement",
    "status: delivering",
    "---",
    "",
    "# Requirement",
    "",
    ...content
  ].join("\n"), "utf8");
  return path;
}

async function writeMarkdownDoc(projectRoot, relativePath, frontmatter, body = "# Document\n") {
  const path = join(projectRoot, relativePath);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, [
    "---",
    ...frontmatter,
    "---",
    "",
    body
  ].join("\n"), "utf8");
  return path;
}

function requirementMarkdownRelativePath(requirementId) {
  return `docs/02_需求设计/${requirementId}.md`;
}

async function readRequirementMarkdown(projectRoot, requirementId) {
  const relativePath = requirementMarkdownRelativePath(requirementId);
  const path = join(projectRoot, relativePath);
  const content = await readFile(path, "utf8");
  return { path, relativePath, content, hash: hashContent(content) };
}

async function finalizeRequirement(projectRoot, requirementId, expectedHash = null) {
  const requirement = await readRequirementMarkdown(projectRoot, requirementId);
  return await applyCapabilityOutcome({
    projectRoot,
    capabilityId: "requirement.finalize",
    outcomeType: "delivered",
    subjectRef: {
      subject_type: "requirement",
      subject_id: requirementId,
      canonical_path: requirement.relativePath,
      base_hash: expectedHash ?? requirement.hash
    },
    expectedHash: expectedHash ?? requirement.hash,
    evidence: [
      {
        kind: "C",
        ref: `dev-task-requirement:${requirementId}`,
        check_id: "dev_task_requirement_terminal",
        params: { requirement_id: requirementId }
      }
    ],
    retryPolicy: { maxAttempts: 1, initialDelayMs: 1, multiplier: 1, maxDelayMs: 1 }
  });
}

async function writeDevTaskDoc(projectRoot, requirementId, taskId, overrides = {}) {
  const path = join(projectRoot, "docs", "03_开发计划", `${taskId}-开发任务.md`);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, [
    "---",
    "doc_type: dev_task",
    `task_id: ${taskId}`,
    `title: ${taskId}`,
    `status: ${overrides.status ?? "done"}`,
    `current_node: ${overrides.current_node ?? "archive"}`,
    "node_substate: archived",
    `review_status: ${overrides.review_status ?? "passed"}`,
    "priority: medium",
    `requirement_id: ${requirementId}`,
    "section_id: pr1-worktree",
    "order: 1",
    "implementation_owner: ccb_codex",
    "dependencies: []",
    `source_breakdown_draft: docs/.ccb/drafts/breakdown/${requirementId}.json`,
    `source_draft_hash: ${"a".repeat(64)}`,
    "created_at: 2026-06-06T10:00:00.000Z",
    "---",
    "",
    "# Dev Task",
    ""
  ].join("\n"), "utf8");
  return path;
}

async function writeTechnicalDesignDoc(projectRoot, requirementId, fileName = `${requirementId}-技术设计.md`) {
  return await writeMarkdownDoc(
    projectRoot,
    `docs/03_开发计划/${fileName}`,
    [
      "doc_type: technical_design",
      `requirement_id: ${requirementId}`
    ],
    "# Technical Design\n"
  );
}

async function writeRequirementAsset(projectRoot, requirementId, fileName, content = "asset\n") {
  const assetDir = join(projectRoot, "docs", ".ccb", "assets", "requirements", requirementId);
  await mkdir(assetDir, { recursive: true });
  const assetPath = join(assetDir, fileName);
  await writeFile(assetPath, content, "utf8");
  return `docs/.ccb/assets/requirements/${requirementId}/${fileName}`;
}

test("dirty classifier assigns requirement assets and rejects invalid asset dirt", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-asset-own";
  const otherRequirementId = "req-asset-other";
  const assetName = `${"a".repeat(64)}.png`;
  const renamedAssetName = `${"b".repeat(64)}.png`;
  try {
    await writeRequirementDoc(projectRoot, requirementId);
    await writeRequirementDoc(projectRoot, otherRequirementId);
    const ownAssetPath = await writeRequirementAsset(projectRoot, requirementId, assetName);
    const otherAssetPath = await writeRequirementAsset(projectRoot, otherRequirementId, assetName);
    const invalidAssetPath = await writeRequirementAsset(projectRoot, requirementId, "not-a-hash.png");
    const tmpAssetPath = await writeRequirementAsset(projectRoot, "tmp-preview", assetName);
    const missingRequirementAssetPath = await writeRequirementAsset(projectRoot, "req-missing", assetName);

    const allowlist = await canonicalSyncAllowlist(projectRoot, requirementId);
    assert.equal(allowlist.has(ownAssetPath), true);
    assert.equal(await classifyDirtyPath(projectRoot, ownAssetPath, allowlist, { requirementId }), DIRTY_OWN);
    assert.equal(await classifyDirtyPath(projectRoot, otherAssetPath, allowlist, { requirementId }), DIRTY_TOLERATE);
    assert.equal(await classifyDirtyPath(projectRoot, invalidAssetPath, allowlist, { requirementId }), DIRTY_FOREIGN);
    assert.equal(await classifyDirtyPath(projectRoot, tmpAssetPath, allowlist, { requirementId }), DIRTY_FOREIGN);
    assert.equal(await classifyDirtyPath(projectRoot, missingRequirementAssetPath, allowlist, { requirementId }), DIRTY_FOREIGN);

    await git(projectRoot, ["add", requirementMarkdownRelativePath(requirementId), ownAssetPath]);
    await git(projectRoot, ["commit", "-m", "add own asset"]);
    await rm(join(projectRoot, ownAssetPath));
    let status = parseStatusEntries(await git(projectRoot, ["-c", "core.quotePath=false", "status", "--porcelain", "--untracked-files=all"]));
    let classification = await classifyDirtyEntries(
      projectRoot,
      status,
      await canonicalSyncAllowlist(projectRoot, requirementId),
      { requirementId }
    );
    assert.match(classification.foreign.map((entry) => entry.raw).join("\n"), new RegExp(ownAssetPath));

    await git(projectRoot, ["checkout", "--", ownAssetPath]);
    const renamedAssetPath = `docs/.ccb/assets/requirements/${requirementId}/${renamedAssetName}`;
    await git(projectRoot, ["mv", ownAssetPath, renamedAssetPath]);
    status = parseStatusEntries(await git(projectRoot, ["-c", "core.quotePath=false", "status", "--porcelain", "--untracked-files=all"]));
    classification = await classifyDirtyEntries(
      projectRoot,
      status,
      await canonicalSyncAllowlist(projectRoot, requirementId),
      { requirementId }
    );
    assert.match(classification.foreign.map((entry) => entry.raw).join("\n"), /docs\/\.ccb\/assets\/requirements\/req-asset-own/);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("dirty classifier tolerates only tracked machine and evergreen docs", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-classifier-tracked";
  const trackedStatePath = "docs/.ccb/state/index.md";
  const trackedConfigPath = "docs/.ccb/config/runtime.yaml";
  const trackedSchemaPath = "docs/.ccb/schemas/runtime.yaml";
  const contractPath = "docs/.ccb/docs-structure-contract.yaml";
  const overviewPath = "docs/00_项目总览.md";
  const architecturePath = "docs/01_架构设计/系统架构.md";
  const archivePath = "docs/99_归档/旧需求.md";
  try {
    await writeMarkdownDoc(projectRoot, trackedStatePath, ["doc_type: state"], "# State\n");
    await mkdir(join(projectRoot, "docs", ".ccb", "config"), { recursive: true });
    await mkdir(join(projectRoot, "docs", ".ccb", "schemas"), { recursive: true });
    await writeFile(join(projectRoot, trackedConfigPath), "version: 1\n", "utf8");
    await writeFile(join(projectRoot, trackedSchemaPath), "version: 1\n", "utf8");
    await writeFile(join(projectRoot, contractPath), "version: docs-structure-contract-v0.1\n", "utf8");
    await writeMarkdownDoc(projectRoot, overviewPath, ["doc_type: project_overview", "updated: 2026-06-10"], "# Overview\n");
    await writeMarkdownDoc(projectRoot, architecturePath, ["doc_type: architecture", "updated: 2026-06-10"], "# Architecture\n");
    await writeMarkdownDoc(projectRoot, archivePath, ["doc_type: requirement", "updated: 2026-06-10"], "# Archived Requirement\n");
    await git(projectRoot, ["add", "docs"]);
    await git(projectRoot, ["commit", "-m", "add tracked docs"]);

    await writeMarkdownDoc(projectRoot, trackedStatePath, ["doc_type: state"], "# State Updated\n");
    await writeFile(join(projectRoot, trackedConfigPath), "version: 2\n", "utf8");
    await writeFile(join(projectRoot, trackedSchemaPath), "version: 2\n", "utf8");
    await writeFile(join(projectRoot, contractPath), "version: docs-structure-contract-v0.1\nupdated: true\n", "utf8");
    await writeMarkdownDoc(projectRoot, overviewPath, ["doc_type: project_overview", "updated: 2026-06-11"], "# Overview Updated\n");
    await writeMarkdownDoc(projectRoot, architecturePath, ["doc_type: architecture", "updated: 2026-06-11"], "# Architecture Updated\n");
    await writeMarkdownDoc(projectRoot, archivePath, ["doc_type: requirement", "updated: 2026-06-11"], "# Archived Requirement Updated\n");

    for (const path of [
      trackedStatePath,
      trackedConfigPath,
      trackedSchemaPath,
      contractPath,
      overviewPath,
      architecturePath,
      archivePath
    ]) {
      assert.equal(await classifyDirtyPath(projectRoot, path, new Set(), { requirementId }), DIRTY_TOLERATE, path);
    }

    const untrackedStatePath = "docs/.ccb/state/new.md";
    const untrackedConfigPath = "docs/.ccb/config/new.yaml";
    const untrackedSchemaPath = "docs/.ccb/schemas/new.yaml";
    const untrackedArchitecturePath = "docs/01_架构设计/新架构.md";
    const untrackedArchivePath = "docs/99_归档/新归档.md";
    await writeMarkdownDoc(projectRoot, untrackedStatePath, ["doc_type: state"], "# New State\n");
    await writeFile(join(projectRoot, untrackedConfigPath), "new: true\n", "utf8");
    await writeFile(join(projectRoot, untrackedSchemaPath), "new: true\n", "utf8");
    await writeMarkdownDoc(projectRoot, untrackedArchitecturePath, ["doc_type: architecture", "updated: 2026-06-11"], "# New Architecture\n");
    await writeMarkdownDoc(projectRoot, untrackedArchivePath, ["doc_type: requirement", "updated: 2026-06-11"], "# New Archive\n");

    for (const path of [
      untrackedStatePath,
      untrackedConfigPath,
      untrackedSchemaPath,
      untrackedArchitecturePath,
      untrackedArchivePath
    ]) {
      assert.equal(await classifyDirtyPath(projectRoot, path, new Set(), { requirementId }), DIRTY_FOREIGN, path);
    }
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

async function mergeRequirementFixture(projectRoot, requirementId, fileName = "feature.txt") {
  await ensureRequirementWorktree({
    projectRoot,
    requirementId,
    codeWorkspace: codeWorkspace(requirementId)
  });
  const featureSha = await commitWorktreeFile(
    worktreePath(projectRoot, requirementId),
    fileName,
    "from worktree\n",
    "feature work"
  );
  await commitCanonicalState(projectRoot);
  const merged = await mergeRequirementWorktree({
    projectRoot,
    requirementId,
    codeWorkspace: codeWorkspace(requirementId)
  });
  assert.equal(merged.status, "merged");
  assert.equal(merged.mergedBranchSha, featureSha);
  assert.equal(rootStatus(await readState(projectRoot, requirementId)), "merged");
  return { featureSha, merged };
}

async function rewriteRuntimeAsV01(projectRoot, requirementId) {
  const statePath = requirementWorktreeStatePath(projectRoot, requirementId);
  const state = JSON.parse(await readFile(statePath, "utf8"));
  const root = rootSpace(state);
  await writeFile(statePath, `${JSON.stringify({
    schema_version: "requirement-worktree-v0.1",
    requirement_id: requirementId,
    status: root.status,
    path: root.path,
    branch: root.branch,
    confirmed_target_branch: root.target_branch,
    base_sha: root.base_sha,
    merged_branch_sha: root.merged_branch_sha,
    target_sha_after_merge: root.target_sha_after_merge,
    merged_at: root.merged_at,
    merge: root.merge,
    archived_at: root.archived_at,
    archive: root.archive,
    discarded_at: root.discarded_at,
    reopened_at: root.reopened_at,
    created_at: state.created_at,
    updated_at: state.updated_at
  }, null, 2)}\n`, "utf8");
}

test("ensure creates a requirement worktree, records target state, and is idempotent", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-ensure";
  try {
    const baseSha = await git(projectRoot, ["rev-parse", "HEAD"]);
    const created = await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(created.status, "created");
    assert.equal(created.targetBranch, "main");
    assert.equal(created.baseSha, baseSha);
    assert.equal(await git(worktreePath(projectRoot, requirementId), ["rev-parse", "--abbrev-ref", "HEAD"]), codeWorkspace(requirementId).branch);

    const state = await readState(projectRoot, requirementId);
    assert.equal(state.schema_version, "requirement-worktree-v0.2");
    assert.equal(state.aggregate_status, "ready");
    assert.equal(state.topology_source.content_hash.length, 64);
    assert.equal(rootSpace(state).target_branch, "main");
    assert.equal(rootSpace(state).base_sha, baseSha);
    assert.equal(rootSpace(state).path, codeWorkspace(requirementId).path);
    assert.equal(rootSpace(state).branch, codeWorkspace(requirementId).branch);

    const existing = await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    assert.equal(existing.status, "existing");
    assert.equal(existing.baseSha, baseSha);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("ensure remains reusable after a subtask reaches archive without touching the worktree", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-multi-subtask";
  try {
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    await writeDevTaskDoc(projectRoot, requirementId, "subtask-111111111111");

    const existing = await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(existing.status, "existing");
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "ready");
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), true);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), true);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("ensure rejects a path that exists outside the expected git worktree", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-path-conflict";
  try {
    await mkdir(worktreePath(projectRoot, requirementId), { recursive: true });

    await assert.rejects(
      () =>
        ensureRequirementWorktree({
          projectRoot,
          requirementId,
          codeWorkspace: codeWorkspace(requirementId)
        }),
      ConflictError
    );
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("ensure rejects an expected branch that is already checked out elsewhere", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-branch-conflict";
  try {
    await git(projectRoot, [
      "worktree",
      "add",
      "-b",
      codeWorkspace(requirementId).branch,
      resolve(projectRoot, "../other-worktree"),
      "HEAD"
    ]);

    await assert.rejects(
      () =>
        ensureRequirementWorktree({
          projectRoot,
          requirementId,
          codeWorkspace: codeWorkspace(requirementId)
        }),
      ConflictError
    );
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("materialize code_workspace template matches zero-topology root expansion", async () => {
  const requirementId = "req-materialize-template";
  const workspace = codeWorkspace(requirementId);
  const expanded = expandTopology({
    topology: zeroImplementationTopology(),
    requirementId,
    codeWorkspace: workspace,
    projectRoot: "/tmp/ccb-template-project"
  });
  assert.equal(expanded.spaces.length, 1);
  assert.equal(expanded.spaces[0].space_id, "root");
  assert.equal(expanded.spaces[0].path, workspace.path);
  assert.equal(expanded.spaces[0].branch, workspace.branch);

  const subtaskSource = await readFile(new URL("../../subtask/index.mjs", import.meta.url), "utf8");
  assert.match(subtaskSource, /path: `\.\.\/SU-CCB-req-\$\{draft\.requirement_id\}`/);
  assert.match(subtaskSource, /branch: `ccb\/req-\$\{draft\.requirement_id\}`/);
});

test("ensure expands a declared multi-space topology to ready spaces", async () => {
  const fixture = await createMultiRepoFixture();
  const requirementId = "req-multispace";
  try {
    const result = await ensureRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });

    assert.equal(result.status, "created");
    assert.equal(result.aggregateStatus, "ready");
    assert.equal(result.spaces.length, 2);
    assert.equal(
      await fixtureGit(spaceWorktreePath(fixture.projectRoot, requirementId, "root"), ["rev-parse", "--abbrev-ref", "HEAD"]),
      multiRepoCodeWorkspace(requirementId).branch
    );
    assert.equal(
      await fixtureGit(spaceWorktreePath(fixture.projectRoot, requirementId, "plugin"), ["rev-parse", "--abbrev-ref", "HEAD"]),
      `ccb/req-${requirementId}`
    );

    const state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.equal(state.schema_version, "requirement-worktree-v0.2");
    assert.equal(state.aggregate_status, "ready");
    assert.equal(state.topology_source.content_hash.length, 64);
    assert.deepEqual(state.spaces.map((space) => [space.space_id, space.status]), [
      ["root", "ready"],
      ["plugin", "ready"]
    ]);
    assert.equal(state.associations[0].status, "pending");
    assert.equal(spaceById(state, "root").target_branch, "main");
    assert.equal(spaceById(state, "plugin").target_branch, "main");
  } finally {
    await fixture.cleanup();
  }
});

test("ensure rejects detached submodule canonical checkout with structured runtime error", async () => {
  const fixture = await createMultiRepoFixture();
  const requirementId = "req-detached-subspace";
  try {
    const pluginHead = await fixtureGit(fixture.pluginRepo, ["rev-parse", "HEAD"]);
    await fixtureGit(fixture.pluginRepo, ["checkout", "--detach", pluginHead]);

    await assert.rejects(
      () =>
        ensureRequirementWorktree({
          projectRoot: fixture.projectRoot,
          requirementId,
          codeWorkspace: multiRepoCodeWorkspace(requirementId)
        }),
      ConflictError
    );

    const state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.equal(spaceById(state, "root").status, "ready");
    assert.equal(spaceById(state, "plugin").status, "pending");
    assert.equal(spaceById(state, "plugin").last_error.reason, "target_branch_detached");
    const escalations = (await readMultiRepoJournalEvents(fixture.projectRoot))
      .filter((event) => event.type === "requirement_worktree_archive_escalated");
    assert.equal(escalations.at(-1).payload.reason, "target_branch_detached");
    assert.equal(escalations.at(-1).payload.space_id, "plugin");
  } finally {
    await fixture.cleanup();
  }
});

test("ensure D8 rejects implementation branch captured as target", async () => {
  const fixture = await createMultiRepoFixture();
  const requirementId = "req-d8-target";
  try {
    await fixtureGit(fixture.pluginRepo, ["checkout", "-b", "ccb/req-leftover"]);

    await assert.rejects(
      () =>
        ensureRequirementWorktree({
          projectRoot: fixture.projectRoot,
          requirementId,
          codeWorkspace: multiRepoCodeWorkspace(requirementId)
        }),
      ConflictError
    );

    const state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.equal(spaceById(state, "root").status, "ready");
    assert.equal(spaceById(state, "plugin").status, "pending");
    assert.equal(spaceById(state, "plugin").last_error.reason, "implementation_branch_as_target");
    assert.equal(spaceById(state, "plugin").last_error.captured_target, "ccb/req-leftover");
    const escalations = (await readMultiRepoJournalEvents(fixture.projectRoot))
      .filter((event) => event.type === "requirement_worktree_archive_escalated");
    assert.equal(escalations.at(-1).payload.reason, "implementation_branch_as_target");
    assert.equal(escalations.at(-1).payload.captured_target, "ccb/req-leftover");
  } finally {
    await fixture.cleanup();
  }
});

test("ensure resumes a half-expanded runtime and finishes pending spaces", async () => {
  const fixture = await createMultiRepoFixture();
  const requirementId = "req-half-expanded";
  try {
    let failedPluginAdd = false;
    const runGit = async (cwd, args, options = {}) => {
      if (!failedPluginAdd &&
          cwd === fixture.pluginRepo &&
          args[0] === "worktree" &&
          args[1] === "add") {
        failedPluginAdd = true;
        return {
          exitCode: 1,
          stdout: "",
          stderr: "simulated plugin worktree add failure\n"
        };
      }
      return await runFixtureGitResult(cwd, args, options);
    };

    await assert.rejects(
      () =>
        ensureRequirementWorktree({
          projectRoot: fixture.projectRoot,
          requirementId,
          codeWorkspace: multiRepoCodeWorkspace(requirementId),
          runGit
        }),
      /simulated plugin worktree add failure/
    );

    const partialState = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.equal(partialState.aggregate_status, "pending");
    assert.equal(spaceById(partialState, "root").status, "ready");
    assert.equal(spaceById(partialState, "plugin").status, "pending");
    assert.equal(spaceById(partialState, "plugin").last_error.reason, "ensure_failed");

    const resumed = await ensureRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    assert.equal(resumed.aggregateStatus, "ready");
    const finalState = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.equal(finalState.aggregate_status, "ready");
    assert.equal(spaceById(finalState, "plugin").status, "ready");
    assert.equal(spaceById(finalState, "plugin").last_error, null);
  } finally {
    await fixture.cleanup();
  }
});

test("ensure rejects nested topology worktree paths before writing runtime", async () => {
  const fixture = await createMultiRepoFixture({
    topologyYaml: twoSpaceTopologyYaml({ pluginPath: "../root-req-<requirementId>/plugin" })
  });
  const requirementId = "req-nested-topology";
  try {
    await assert.rejects(
      () =>
        ensureRequirementWorktree({
          projectRoot: fixture.projectRoot,
          requirementId,
          codeWorkspace: multiRepoCodeWorkspace(requirementId)
        }),
      /nested or duplicated/
    );
    assert.equal(await pathPresent(requirementWorktreeStatePath(fixture.projectRoot, requirementId)), false);
  } finally {
    await fixture.cleanup();
  }
});

test("multi-space merge runs root first, syncs fake association, and emits additive events", async () => {
  const fixture = await createMultiRepoFixture(fakeAssociationFixtureOptions());
  const requirementId = "req-multispace-merge";
  try {
    await ensureRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    await commitWorktreeFile(
      spaceWorktreePath(fixture.projectRoot, requirementId, "root"),
      "root-feature.txt",
      "root feature\n",
      "root feature"
    );
    await commitWorktreeFile(
      spaceWorktreePath(fixture.projectRoot, requirementId, "plugin"),
      "plugin-feature.txt",
      "plugin feature\n",
      "plugin feature"
    );

    const mergeCwds = [];
    const runGit = async (cwd, args, options = {}) => {
      if (args[0] === "merge" && args[1] === "--no-edit") mergeCwds.push(cwd);
      return await runFixtureGitResult(cwd, args, options);
    };
    const merged = await mergeRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId),
      runGit
    });

    assert.equal(merged.status, "merged");
    assert.deepEqual(mergeCwds.slice(0, 2), [fixture.projectRoot, fixture.pluginRepo]);
    const state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.equal(state.aggregate_status, "merged");
    assert.deepEqual(state.spaces.map((space) => [space.space_id, space.status]), [
      ["root", "merged"],
      ["plugin", "merged"]
    ]);
    assert.equal(state.associations[0].status, "synced");
    assert.match(state.associations[0].synced_commit_sha, /root->plugin|plugin->root/);
    assert.equal(await readFile(join(fixture.projectRoot, "root-feature.txt"), "utf8"), "root feature\n");
    assert.equal(await readFile(join(fixture.pluginRepo, "plugin-feature.txt"), "utf8"), "plugin feature\n");

    const events = await readMultiRepoJournalEvents(fixture.projectRoot);
    assert.ok(events.some((event) => event.type === "requirement_worktree_association_synced"));
    const mergedEvent = events.filter((event) => event.type === "requirement_worktree_merged").at(-1);
    assert.deepEqual(mergedEvent.payload.spaces.map((space) => space.status), ["merged", "merged"]);
  } finally {
    await fixture.cleanup();
  }
});

test("multi-space merge escalates on child conflict and recovery skips already merged root", async () => {
  const fixture = await createMultiRepoFixture(fakeAssociationFixtureOptions());
  const requirementId = "req-multispace-merge-recovery";
  try {
    await ensureRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    await commitWorktreeFile(
      spaceWorktreePath(fixture.projectRoot, requirementId, "root"),
      "root-feature.txt",
      "root feature\n",
      "root feature"
    );
    await commitWorktreeFile(
      spaceWorktreePath(fixture.projectRoot, requirementId, "plugin"),
      "plugin-feature.txt",
      "plugin feature\n",
      "plugin feature"
    );

    const result = await mergeRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId),
      runGit: async (cwd, args, options = {}) => {
        if (cwd === fixture.pluginRepo && args[0] === "merge" && args[1] === "--no-edit") {
          return { exitCode: 1, stdout: "simulated stdout\n", stderr: "simulated child conflict\n" };
        }
        return await runFixtureGitResult(cwd, args, options);
      }
    });
    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "merge_conflict");
    assert.equal(result.preview_consistency, "incomplete");
    let state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.equal(state.aggregate_status, "escalated");
    assert.equal(spaceById(state, "root").status, "merged");
    assert.equal(spaceById(state, "plugin").status, "ready");
    const rootTargetAfterFirstMerge = await fixtureGit(fixture.projectRoot, ["rev-parse", "HEAD"]);

    const mergeCwds = [];
    const recovered = await mergeRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId),
      runGit: async (cwd, args, options = {}) => {
        if (args[0] === "merge" && args[1] === "--no-edit") mergeCwds.push(cwd);
        return await runFixtureGitResult(cwd, args, options);
      }
    });

    assert.equal(recovered.status, "merged");
    assert.equal(await fixtureGit(fixture.projectRoot, ["rev-parse", "HEAD"]), rootTargetAfterFirstMerge);
    assert.deepEqual(mergeCwds, [fixture.pluginRepo]);
    state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.equal(state.aggregate_status, "merged");
    assert.equal(spaceById(state, "plugin").status, "merged");
  } finally {
    await fixture.cleanup();
  }
});

test("multi-space association-only reentry syncs pending association without space merge", async () => {
  const fixture = await createMultiRepoFixture(fakeAssociationFixtureOptions());
  const requirementId = "req-association-only";
  try {
    await ensureRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    await markMultiSpacesMerged(fixture.projectRoot, requirementId);

    const mergeCwds = [];
    const merged = await mergeRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId),
      runGit: async (cwd, args, options = {}) => {
        if (args[0] === "merge" && args[1] === "--no-edit") mergeCwds.push(cwd);
        return await runFixtureGitResult(cwd, args, options);
      }
    });

    assert.equal(merged.status, "merged");
    assert.deepEqual(mergeCwds, []);
    const state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.equal(state.associations[0].status, "synced");
  } finally {
    await fixture.cleanup();
  }
});

test("multi-space association failures never mark synced", async () => {
  const syncFixture = await createMultiRepoFixture(fakeAssociationFixtureOptions({
    associationId: "plugin-to-root-sync-fail"
  }));
  try {
    const requirementId = "req-association-sync-fail";
    await ensureRequirementWorktree({
      projectRoot: syncFixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    await markMultiSpacesMerged(syncFixture.projectRoot, requirementId);

    const result = await mergeRequirementWorktree({
      projectRoot: syncFixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "association_sync_failed");
    const state = await readMultiRepoState(syncFixture.projectRoot, requirementId);
    assert.equal(state.associations[0].status, "pending");
    assert.equal(state.associations[0].synced_at, null);
  } finally {
    await syncFixture.cleanup();
  }

  const verifyFixture = await createMultiRepoFixture(fakeAssociationFixtureOptions({
    associationId: "plugin-to-root-verify-fail"
  }));
  try {
    const requirementId = "req-association-verify-fail";
    await ensureRequirementWorktree({
      projectRoot: verifyFixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    await markMultiSpacesMerged(verifyFixture.projectRoot, requirementId);

    const result = await mergeRequirementWorktree({
      projectRoot: verifyFixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "association_verify_failed");
    const state = await readMultiRepoState(verifyFixture.projectRoot, requirementId);
    assert.equal(state.associations[0].status, "pending");
    assert.equal(state.associations[0].synced_at, null);
  } finally {
    await verifyFixture.cleanup();
  }

  const dirtyFixture = await createMultiRepoFixture(fakeAssociationFixtureOptions());
  try {
    const requirementId = "req-association-dirty";
    await ensureRequirementWorktree({
      projectRoot: dirtyFixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    await markMultiSpacesMerged(dirtyFixture.projectRoot, requirementId);
    await writeFile(join(dirtyFixture.projectRoot, "outside.txt"), "outside\n", "utf8");

    const result = await mergeRequirementWorktree({
      projectRoot: dirtyFixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "association_dirty_outside_path");
    const state = await readMultiRepoState(dirtyFixture.projectRoot, requirementId);
    assert.equal(state.associations[0].status, "pending");
  } finally {
    await dirtyFixture.cleanup();
  }

  const unknownFixture = await createMultiRepoFixture({
    associationKind: "unknown_association_kind"
  });
  try {
    const requirementId = "req-association-unknown";
    await ensureRequirementWorktree({
      projectRoot: unknownFixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    await markMultiSpacesMerged(unknownFixture.projectRoot, requirementId);

    const result = await mergeRequirementWorktree({
      projectRoot: unknownFixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "unknown_association_kind");
    const state = await readMultiRepoState(unknownFixture.projectRoot, requirementId);
    assert.equal(state.associations[0].status, "pending");
  } finally {
    await unknownFixture.cleanup();
  }
});

test("multi-space recovery gates reject mismatched escalated operations", async () => {
  const fixture = await createMultiRepoFixture(fakeAssociationFixtureOptions());
  const requirementId = "req-gate-negative";
  try {
    await ensureRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    await mutateRuntimeState(fixture.projectRoot, requirementId, (state) => ({
      ...state,
      last_error: {
        op: "cleanup",
        reason: "cleanup_failed",
        at: "2026-06-07T00:00:00.000Z"
      }
    }));
    await assert.rejects(
      () => mergeRequirementWorktree({
        projectRoot: fixture.projectRoot,
        requirementId,
        codeWorkspace: multiRepoCodeWorkspace(requirementId)
      }),
      /aggregate must be ready/
    );
    await mutateRuntimeState(fixture.projectRoot, requirementId, (state) => ({
      ...state,
      last_error: {
        op: "merge",
        reason: "merge_failed",
        at: "2026-06-07T00:00:01.000Z"
      }
    }));
    await assert.rejects(
      () => cleanupRequirementWorktree({
        projectRoot: fixture.projectRoot,
        requirementId,
        codeWorkspace: multiRepoCodeWorkspace(requirementId)
      }),
      /must be merged/
    );
    await assert.rejects(
      () => reopenRequirementWorktree({
        projectRoot: fixture.projectRoot,
        requirementId,
        codeWorkspace: multiRepoCodeWorkspace(requirementId)
      }),
      /must be merged/
    );
  } finally {
    await fixture.cleanup();
  }
});

test("multi-space cleanup partial failure records archived spaces and resumes remaining spaces", async () => {
  const fixture = await createMultiRepoFixture(fakeAssociationFixtureOptions());
  const requirementId = "req-cleanup-recovery";
  try {
    await ensureRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    await markMultiSpacesMerged(fixture.projectRoot, requirementId);
    await mutateRuntimeState(fixture.projectRoot, requirementId, (state) => ({
      ...state,
      associations: state.associations.map((association) => ({
        ...association,
        status: "synced",
        synced_commit_sha: "synced",
        synced_at: "2026-06-07T00:00:00.000Z"
      })),
      last_error: null
    }));

    const result = await cleanupRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId),
      runGit: async (cwd, args, options = {}) => {
        if (cwd === fixture.pluginRepo && args[0] === "branch" && args[1] === "-d") {
          return { exitCode: 1, stdout: "", stderr: "plugin branch delete failed\n" };
        }
        return await runFixtureGitResult(cwd, args, options);
      }
    });
    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "cleanup_branch_delete_failed");
    let state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.equal(spaceById(state, "root").status, "archived");
    assert.equal(spaceById(state, "plugin").status, "merged");
    assert.equal(state.last_error.op, "cleanup");
    assert.equal(await pathPresent(spaceWorktreePath(fixture.projectRoot, requirementId, "root")), false);

    const recovered = await cleanupRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    assert.equal(recovered.status, "archived");
    state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.deepEqual(state.spaces.map((space) => space.status), ["archived", "archived"]);
    assert.equal(await pathPresent(spaceWorktreePath(fixture.projectRoot, requirementId, "plugin")), false);
  } finally {
    await fixture.cleanup();
  }
});

test("multi-space reopen is all-or-nothing and resets associations on success", async () => {
  const fixture = await createMultiRepoFixture(fakeAssociationFixtureOptions());
  const requirementId = "req-reopen-multi";
  try {
    await ensureRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    await markMultiSpacesMerged(fixture.projectRoot, requirementId);
    await mutateRuntimeState(fixture.projectRoot, requirementId, (state) => ({
      ...state,
      associations: state.associations.map((association) => ({
        ...association,
        status: "synced",
        synced_commit_sha: "synced",
        synced_at: "2026-06-07T00:00:00.000Z"
      })),
      last_error: null
    }));

    await writeFile(join(spaceWorktreePath(fixture.projectRoot, requirementId, "plugin"), "dirty.txt"), "dirty\n", "utf8");
    const dirty = await reopenRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    assert.equal(dirty.status, "escalated");
    assert.equal(dirty.reason, "worktree_dirty");
    let state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.deepEqual(state.spaces.map((space) => space.status), ["merged", "merged"]);
    assert.equal(state.associations[0].status, "synced");

    await rm(join(spaceWorktreePath(fixture.projectRoot, requirementId, "plugin"), "dirty.txt"), { force: true });
    const reopened = await reopenRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    assert.equal(reopened.status, "ready");
    state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.deepEqual(state.spaces.map((space) => space.status), ["ready", "ready"]);
    assert.equal(state.associations[0].status, "pending");
  } finally {
    await fixture.cleanup();
  }
});

test("multi-space discard allows pending plus ready and rejects any merged space", async () => {
  const discardFixture = await createMultiRepoFixture(fakeAssociationFixtureOptions());
  try {
    const requirementId = "req-discard-multi";
    await ensureRequirementWorktree({
      projectRoot: discardFixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    await mutateRuntimeState(discardFixture.projectRoot, requirementId, (state) => ({
      ...state,
      spaces: state.spaces.map((space) =>
        space.space_id === "plugin" ? { ...space, status: "pending" } : space
      ),
      last_error: null
    }));
    const discarded = await discardRequirementWorktree({
      projectRoot: discardFixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    assert.equal(discarded.status, "discarded");
    const state = await readMultiRepoState(discardFixture.projectRoot, requirementId);
    assert.deepEqual(state.spaces.map((space) => space.status), ["discarded", "discarded"]);
    assert.equal(await pathPresent(spaceWorktreePath(discardFixture.projectRoot, requirementId, "root")), false);
    assert.equal(await pathPresent(spaceWorktreePath(discardFixture.projectRoot, requirementId, "plugin")), false);
  } finally {
    await discardFixture.cleanup();
  }

  const rejectFixture = await createMultiRepoFixture(fakeAssociationFixtureOptions());
  try {
    const requirementId = "req-discard-merged-reject";
    await ensureRequirementWorktree({
      projectRoot: rejectFixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    await mutateRuntimeState(rejectFixture.projectRoot, requirementId, (state) => ({
      ...state,
      spaces: state.spaces.map((space) =>
        space.space_id === "root" ? { ...space, status: "merged" } : space
      ),
      last_error: null
    }));
    await assert.rejects(
      () => discardRequirementWorktree({
        projectRoot: rejectFixture.projectRoot,
        requirementId,
        codeWorkspace: multiRepoCodeWorkspace(requirementId)
      }),
      ConflictError
    );
    assert.equal(await pathPresent(spaceWorktreePath(rejectFixture.projectRoot, requirementId, "root")), true);
  } finally {
    await rejectFixture.cleanup();
  }
});

test("git_submodule_gitlink e2e merges two submodules, reopens, remerges with warning, and cleans up", async () => {
  const fixture = await createThreeRepoFixture();
  const requirementId = "req-gitlink-e2e";
  try {
    const ensured = await ensureRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    assert.equal(ensured.spaces.length, 3);

    await commitWorktreeFile(
      spaceWorktreePath(fixture.projectRoot, requirementId, "root"),
      "root-e2e.txt",
      "root e2e\n",
      "root e2e"
    );
    await commitWorktreeFile(
      spaceWorktreePath(fixture.projectRoot, requirementId, "plugin"),
      "plugin-e2e.txt",
      "plugin e2e\n",
      "plugin e2e"
    );
    await commitWorktreeFile(
      spaceWorktreePath(fixture.projectRoot, requirementId, "worker"),
      "worker-e2e.txt",
      "worker e2e\n",
      "worker e2e"
    );

    const merged = await mergeRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    assert.equal(merged.status, "merged");
    let state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.equal(state.aggregate_status, "merged");
    assert.deepEqual(state.associations.map((association) => association.status), ["synced", "synced"]);
    assert.equal(await readGitlinkSha(fixture.projectRoot, "vendor/plugin"), await fixtureGit(fixture.pluginRepo, ["rev-parse", "HEAD"]));
    assert.equal(await readGitlinkSha(fixture.projectRoot, "vendor/worker"), await fixtureGit(fixture.workerRepo, ["rev-parse", "HEAD"]));

    const syncedEvents = (await readMultiRepoJournalEvents(fixture.projectRoot))
      .filter((event) => event.type === "requirement_worktree_association_synced");
    assert.equal(syncedEvents.length, 2);

    const reopened = await reopenRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    assert.equal(reopened.status, "ready");
    state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.deepEqual(state.associations.map((association) => association.status), ["pending", "pending"]);

    const secondRootSha = await commitWorktreeFile(
      spaceWorktreePath(fixture.projectRoot, requirementId, "root"),
      "root-e2e-2.txt",
      "root e2e second\n",
      "root e2e second"
    );
    await mutateRuntimeState(fixture.projectRoot, requirementId, (current) => ({
      ...current,
      spaces: current.spaces.map((space) =>
        space.space_id === "root" ? { ...space, base_sha: secondRootSha } : space
      )
    }));

    const remerged = await mergeRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    assert.equal(remerged.status, "merged");
    assert.ok(remerged.warnings.some((warning) => warning.type === "target_branch_diverged"));
    state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.deepEqual(state.associations.map((association) => association.noop), [true, true]);

    const cleaned = await cleanupRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    assert.equal(cleaned.status, "archived");
    state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.deepEqual(state.spaces.map((space) => space.status), ["archived", "archived", "archived"]);
  } finally {
    await fixture.cleanup();
  }
});

test("git_submodule_gitlink corrects a manual implementation-branch gitlink bump to post-merge tip", async () => {
  const fixture = await createMultiRepoFixture();
  const requirementId = "req-gitlink-corrects-bump";
  try {
    await ensureRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });

    const intermediateSha = await commitWorktreeFile(
      spaceWorktreePath(fixture.projectRoot, requirementId, "plugin"),
      "plugin-intermediate.txt",
      "plugin intermediate\n",
      "plugin intermediate"
    );
    await fixtureGit(spaceWorktreePath(fixture.projectRoot, requirementId, "root"), [
      "update-index",
      "--cacheinfo",
      "160000",
      intermediateSha,
      "vendor/plugin"
    ]);
    await fixtureGit(spaceWorktreePath(fixture.projectRoot, requirementId, "root"), ["commit", "-m", "manual gitlink bump"]);

    const finalBranchSha = await commitWorktreeFile(
      spaceWorktreePath(fixture.projectRoot, requirementId, "plugin"),
      "plugin-final.txt",
      "plugin final\n",
      "plugin final"
    );

    const merged = await mergeRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });

    assert.equal(merged.status, "merged");
    const finalTargetSha = await fixtureGit(fixture.pluginRepo, ["rev-parse", "HEAD"]);
    assert.equal(finalTargetSha, finalBranchSha);
    assert.equal(await readGitlinkSha(fixture.projectRoot, "vendor/plugin"), finalTargetSha);
    assert.notEqual(await readGitlinkSha(fixture.projectRoot, "vendor/plugin"), intermediateSha);
    const state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.equal(state.associations[0].status, "synced");
    assert.equal(state.associations[0].noop, false);
  } finally {
    await fixture.cleanup();
  }
});

test("git_submodule_gitlink association allows dirty docs classified as tolerated", async () => {
  const fixture = await createMultiRepoFixture();
  const requirementId = "req-gitlink-tolerates-docs";
  const otherRequirementId = "req-gitlink-other-doc";
  try {
    await ensureRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    await commitWorktreeFile(
      spaceWorktreePath(fixture.projectRoot, requirementId, "plugin"),
      "plugin-doc-tolerated.txt",
      "plugin change\n",
      "plugin change"
    );
    await writeRequirementDoc(fixture.projectRoot, otherRequirementId, ["other dirty requirement"]);

    const merged = await mergeRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });

    assert.equal(merged.status, "merged");
    const state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.equal(state.associations[0].status, "synced");
    const status = await fixtureGit(fixture.projectRoot, [
      "-c",
      "core.quotePath=false",
      "status",
      "--porcelain",
      "--untracked-files=all"
    ]);
    assert.match(status, new RegExp(`docs/02_需求设计/${otherRequirementId}\\.md`));
  } finally {
    await fixture.cleanup();
  }
});

test("git_submodule_gitlink verify failure paths reject mismatch, wrong target, and dirty outside path", async () => {
  const fixture = await createMultiRepoFixture();
  const requirementId = "req-gitlink-verify-fail";
  try {
    await ensureRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });

    const executor = getAssociationExecutor("git_submodule_gitlink");
    const state = await readMultiRepoState(fixture.projectRoot, requirementId);
    const association = state.associations[0];
    const pluginHead = await fixtureGit(fixture.pluginRepo, ["rev-parse", "HEAD"]);
    const rootHead = await fixtureGit(fixture.projectRoot, ["rev-parse", "HEAD"]);
    const spaces = executorSpacesById(fixture.projectRoot, {
      ...state,
      spaces: state.spaces.map((space) =>
        space.space_id === "plugin"
          ? { ...space, status: "merged", target_sha_after_merge: pluginHead }
          : { ...space, status: "merged", target_sha_after_merge: rootHead }
      )
    });
    const runGit = async (cwd, args, options = {}) => await runFixtureGitResult(cwd, args, options);

    assert.equal(await executor.verify({
      projectRoot: fixture.projectRoot,
      requirementId,
      association: { ...association, noop: true, synced_commit_sha: pluginHead },
      spacesById: spaces,
      runGit
    }), true);

    const mismatchSpaces = new Map(spaces);
    mismatchSpaces.set("plugin", {
      ...mismatchSpaces.get("plugin"),
      target_sha_after_merge: "f".repeat(40)
    });
    assert.equal(await executor.verify({
      projectRoot: fixture.projectRoot,
      requirementId,
      association: { ...association, noop: true, synced_commit_sha: pluginHead },
      spacesById: mismatchSpaces,
      runGit
    }), false);

    await fixtureGit(fixture.projectRoot, ["checkout", "-b", "not-main"]);
    assert.equal(await executor.verify({
      projectRoot: fixture.projectRoot,
      requirementId,
      association: { ...association, noop: true, synced_commit_sha: pluginHead },
      spacesById: spaces,
      runGit
    }), false);
    await fixtureGit(fixture.projectRoot, ["checkout", "main"]);

    await writeFile(join(fixture.projectRoot, "outside.txt"), "outside\n", "utf8");
    assert.equal(await executor.verify({
      projectRoot: fixture.projectRoot,
      requirementId,
      association: { ...association, noop: true, synced_commit_sha: pluginHead },
      spacesById: spaces,
      runGit
    }), false);

    await markMultiSpacesMerged(fixture.projectRoot, requirementId);
    const result = await mergeRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "association_dirty_outside_path");
    const dirtyState = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.equal(associationById(dirtyState, "plugin-to-root").status, "pending");
  } finally {
    await fixture.cleanup();
  }
});

test("archive merges the recorded branch, reports divergence, and removes worktree resources", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-archive";
  try {
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    const featureSha = await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "feature.txt",
      "from worktree\n",
      "feature work"
    );
    await overwriteRuntimeState(projectRoot, requirementId, { base_sha: featureSha });
    await commitCanonicalState(projectRoot);

    const result = await archiveRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(result.status, "archived");
    assert.deepEqual(result.warnings.map((warning) => warning.type), ["target_branch_diverged"]);
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), false);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), false);
    assert.equal(await readFile(join(projectRoot, "feature.txt"), "utf8"), "from worktree\n");
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "archived");
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("merge keeps worktree resources and cleanup archives after ancestor validation", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-merge-cleanup";
  try {
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    const featureSha = await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "feature.txt",
      "from worktree\n",
      "feature work"
    );
    await commitCanonicalState(projectRoot);

    const merged = await mergeRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(merged.status, "merged");
    assert.equal(merged.mergedBranchSha, featureSha);
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), true);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), true);
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "merged");

    const cleaned = await cleanupRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(cleaned.status, "archived");
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), false);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), false);
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "archived");
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("cleanup force-removes an initialized submodule worktree and records the forced removal", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-submodule-cleanup";
  try {
    const submoduleRoot = join(baseDir, "submodule-source");
    await mkdir(submoduleRoot, { recursive: true });
    await git(submoduleRoot, ["init", "-b", "main"]);
    await git(submoduleRoot, ["config", "user.email", "ccb-test@example.invalid"]);
    await git(submoduleRoot, ["config", "user.name", "CCB Test"]);
    await writeFile(join(submoduleRoot, "submodule.txt"), "submodule\n", "utf8");
    await git(submoduleRoot, ["add", "submodule.txt"]);
    await git(submoduleRoot, ["commit", "-m", "submodule initial"]);

    await git(projectRoot, [
      "-c",
      "protocol.file.allow=always",
      "submodule",
      "add",
      submoduleRoot,
      "vendor/submodule"
    ]);
    await git(projectRoot, ["commit", "-m", "add submodule"]);

    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    const requirementWorktree = worktreePath(projectRoot, requirementId);
    await git(requirementWorktree, [
      "-c",
      "protocol.file.allow=always",
      "submodule",
      "update",
      "--init"
    ]);
    assert.equal(await git(requirementWorktree, ["status", "--porcelain", "--untracked-files=all"]), "");

    const worktreeAdminPath = join(projectRoot, ".git", "worktrees", basename(requirementWorktree));
    assert.equal(await pathPresent(join(worktreeAdminPath, "modules")), true);

    const featureSha = await commitWorktreeFile(
      requirementWorktree,
      "feature.txt",
      "from worktree\n",
      "feature work"
    );
    await commitCanonicalState(projectRoot);
    const merged = await mergeRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    assert.equal(merged.status, "merged");
    assert.equal(merged.mergedBranchSha, featureSha);

    const cleaned = await cleanupRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(cleaned.status, "archived");
    assert.equal(await pathPresent(requirementWorktree), false);
    assert.equal(await pathPresent(worktreeAdminPath), false);
    assert.equal(await pathPresent(join(worktreeAdminPath, "modules")), false);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), false);
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "archived");

    const archivedEvents = (await readJournalEvents(projectRoot))
      .filter((event) => event.type === "requirement_worktree_archived");
    assert.equal(archivedEvents.at(-1).payload.removal_forced, true);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("cleanup escalates when forced submodule worktree removal also fails", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-remove-force-fails";
  try {
    await mergeRequirementFixture(projectRoot, requirementId);
    const calls = [];
    const runGit = async (cwd, args, options = {}) => {
      calls.push(args);
      if (args[0] === "worktree" && args[1] === "remove" && args[2] === worktreePath(projectRoot, requirementId)) {
        return {
          exitCode: 1,
          stdout: "",
          stderr: "fatal: working trees containing submodules cannot be moved or removed\n"
        };
      }
      if (args[0] === "worktree" && args[1] === "remove" && args[2] === "--force") {
        return {
          exitCode: 1,
          stdout: "forced stdout\n",
          stderr: "forced stderr\n"
        };
      }
      return await runGitResult(cwd, args, options);
    };

    const result = await cleanupRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId),
      runGit
    });

    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "cleanup_worktree_remove_failed");
    assert.equal(result.forceAttempted, true);
    assert.equal(result.exitCode, 1);
    assert.equal(result.stderr, "forced stderr\n");
    assert.equal(result.stdout, "forced stdout\n");
    assert.equal(calls.some((args) => args[0] === "worktree" && args[1] === "remove" && args[2] === "--force"), true);
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), true);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), true);
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "merged");

    const escalations = (await readJournalEvents(projectRoot))
      .filter((event) => event.type === "requirement_worktree_archive_escalated");
    assert.equal(escalations.at(-1).payload.reason, "cleanup_worktree_remove_failed");
    assert.equal(escalations.at(-1).payload.forceAttempted, true);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("cleanup does not force-remove when worktree removal fails for another reason", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-remove-dirty";
  try {
    await mergeRequirementFixture(projectRoot, requirementId);
    const calls = [];
    const runGit = async (cwd, args, options = {}) => {
      calls.push(args);
      if (args[0] === "worktree" && args[1] === "remove" && args[2] === worktreePath(projectRoot, requirementId)) {
        return {
          exitCode: 1,
          stdout: "",
          stderr: "fatal: worktree contains modified or untracked files, use --force to delete it\nis dirty\n"
        };
      }
      return await runGitResult(cwd, args, options);
    };

    const result = await cleanupRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId),
      runGit
    });

    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "cleanup_worktree_remove_failed");
    assert.equal(result.forceAttempted, false);
    assert.equal(calls.some((args) => args[0] === "worktree" && args[1] === "remove" && args[2] === "--force"), false);
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), true);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), true);
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "merged");
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("cleanup escalates on branch delete failure and recovers on rerun", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-branch-delete-fails";
  try {
    await mergeRequirementFixture(projectRoot, requirementId);
    let removeCalls = 0;
    const runGit = async (cwd, args, options = {}) => {
      if (args[0] === "worktree" && args[1] === "remove") removeCalls += 1;
      if (args[0] === "branch" && args[1] === "-d" && args[2] === codeWorkspace(requirementId).branch) {
        return {
          exitCode: 1,
          stdout: "",
          stderr: "error: branch could not be deleted\n"
        };
      }
      return await runGitResult(cwd, args, options);
    };

    const result = await cleanupRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId),
      runGit
    });

    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "cleanup_branch_delete_failed");
    assert.equal(result.forceAttempted, false);
    assert.equal(result.stderr, "error: branch could not be deleted\n");
    assert.equal(removeCalls, 1);
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), false);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), true);
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "merged");

    const escalations = (await readJournalEvents(projectRoot))
      .filter((event) => event.type === "requirement_worktree_archive_escalated");
    assert.equal(escalations.at(-1).payload.reason, "cleanup_branch_delete_failed");

    const recovered = await cleanupRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    assert.equal(recovered.status, "archived");
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), false);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), false);
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "archived");
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("manual archive cleans a merged worktree and finalizes the requirement", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-manual-archive";
  try {
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    await writeRequirementDoc(projectRoot, requirementId, ["manual archive preview"]);
    await writeDevTaskDoc(projectRoot, requirementId, "subtask-111111111111");
    await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "feature.txt",
      "from worktree\n",
      "feature work"
    );

    const merged = await mergeRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(merged.status, "merged");
    assert.match((await readRequirementMarkdown(projectRoot, requirementId)).content, /status: delivering/);
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), true);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), true);

    const cleaned = await cleanupRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    assert.equal(cleaned.status, "archived");

    const finalized = await finalizeRequirement(projectRoot, requirementId);
    assert.equal(finalized.ok, true);
    assert.match((await readRequirementMarkdown(projectRoot, requirementId)).content, /status: delivered/);
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), false);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), false);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("manual archive supports finalize-only recovery after cleanup succeeds", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-finalize-recovery";
  try {
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    await writeRequirementDoc(projectRoot, requirementId, ["finalize recovery"]);
    await writeDevTaskDoc(projectRoot, requirementId, "subtask-111111111111");
    await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "feature.txt",
      "from worktree\n",
      "feature work"
    );
    await mergeRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    await cleanupRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    const stale = await readRequirementMarkdown(projectRoot, requirementId);
    await writeFile(stale.path, stale.content.replace("# Requirement", "# Requirement\n\nupdated after cleanup"), "utf8");
    const failedFinalize = await finalizeRequirement(projectRoot, requirementId, stale.hash);
    assert.equal(failedFinalize.ok, false);
    assert.equal(failedFinalize.code, "CAS_CONFLICT");
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "archived");
    assert.match((await readRequirementMarkdown(projectRoot, requirementId)).content, /status: delivering/);

    const cleanupNoop = await cleanupRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    assert.equal(cleanupNoop.status, "archived");

    const recovered = await finalizeRequirement(projectRoot, requirementId);
    assert.equal(recovered.ok, true);
    assert.match((await readRequirementMarkdown(projectRoot, requirementId)).content, /status: delivered/);
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), false);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), false);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("reopen moves merged state back to ready and allows another merge from the same branch", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-reopen";
  try {
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "feature.txt",
      "from worktree\n",
      "feature work"
    );
    await commitCanonicalState(projectRoot);
    await mergeRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    const reopened = await reopenRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(reopened.status, "ready");
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), true);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), true);
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "ready");

    const secondSha = await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "feature-2.txt",
      "more worktree changes\n",
      "more feature work"
    );
    await overwriteRuntimeState(projectRoot, requirementId, { base_sha: secondSha });
    const remerged = await mergeRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(remerged.status, "merged");
    assert.equal(remerged.mergedBranchSha, secondSha);
    assert.deepEqual(remerged.warnings.map((warning) => warning.type), ["target_branch_diverged"]);
    assert.equal(await readFile(join(projectRoot, "feature-2.txt"), "utf8"), "more worktree changes\n");
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), true);
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "merged");
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("v0.1 lifted merged runtime supports reopen and cleanup", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  try {
    const reopenRequirementId = "req-v01-reopen";
    await mergeRequirementFixture(projectRoot, reopenRequirementId, "reopen-v01.txt");
    await rewriteRuntimeAsV01(projectRoot, reopenRequirementId);
    const reopened = await reopenRequirementWorktree({
      projectRoot,
      requirementId: reopenRequirementId,
      codeWorkspace: codeWorkspace(reopenRequirementId)
    });
    assert.equal(reopened.status, "ready");
    let state = await readState(projectRoot, reopenRequirementId);
    assert.equal(state.schema_version, "requirement-worktree-v0.2");
    assert.equal(state.aggregate_status, "ready");

    const cleanupRequirementId = "req-v01-cleanup";
    await mergeRequirementFixture(projectRoot, cleanupRequirementId, "cleanup-v01.txt");
    await rewriteRuntimeAsV01(projectRoot, cleanupRequirementId);
    const cleaned = await cleanupRequirementWorktree({
      projectRoot,
      requirementId: cleanupRequirementId,
      codeWorkspace: codeWorkspace(cleanupRequirementId)
    });
    assert.equal(cleaned.status, "archived");
    state = await readState(projectRoot, cleanupRequirementId);
    assert.equal(state.schema_version, "requirement-worktree-v0.2");
    assert.equal(state.aggregate_status, "archived");
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("discard rejects merged and archived worktree states", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-discard-guard";
  try {
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "feature.txt",
      "from worktree\n",
      "feature work"
    );
    await commitCanonicalState(projectRoot);
    await mergeRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    await assert.rejects(
      () =>
        discardRequirementWorktree({
          projectRoot,
          requirementId,
          codeWorkspace: codeWorkspace(requirementId)
        }),
      ConflictError
    );

    await cleanupRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    await assert.rejects(
      () =>
        discardRequirementWorktree({
          projectRoot,
          requirementId,
          codeWorkspace: codeWorkspace(requirementId)
        }),
      ConflictError
    );
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("merge sync-commits canonical allowlist files before merging requirement branch", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-sync";
  try {
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    await writeRequirementDoc(projectRoot, requirementId, ["synced requirement"]);
    await writeTechnicalDesignDoc(projectRoot, requirementId);
    await writeDevTaskDoc(projectRoot, requirementId, "subtask-111111111111");
    const assetPath = await writeRequirementAsset(projectRoot, requirementId, `${"c".repeat(64)}.png`);
    await mkdir(join(projectRoot, "docs", ".ccb", "drafts", "breakdown"), { recursive: true });
    await writeFile(join(projectRoot, "docs", ".ccb", "drafts", "breakdown", `${requirementId}.json`), "{}\n", "utf8");
    await writeFile(join(projectRoot, "docs", "00_文档地图.md"), "# Map\n", "utf8");
    await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "feature.txt",
      "from worktree\n",
      "feature work"
    );

    const merged = await mergeRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(merged.status, "merged");
    assert.match(
      await git(projectRoot, ["log", "--format=%s", "--", `docs/02_需求设计/${requirementId}.md`]),
      new RegExp(`chore\\(${requirementId}\\): canonical sync before requirement merge`)
    );
    assert.match(
      await git(projectRoot, ["log", "--format=%s", "--", `docs/03_开发计划/${requirementId}-技术设计.md`]),
      new RegExp(`chore\\(${requirementId}\\): canonical sync before requirement merge`)
    );
    assert.match(
      await git(projectRoot, ["log", "--format=%s", "--", assetPath]),
      new RegExp(`chore\\(${requirementId}\\): canonical sync before requirement merge`)
    );
    assert.deepEqual(rootSpace(await readState(projectRoot, requirementId)).merge.canonical_sync.tolerated_paths, []);
    assert.equal(await readFile(join(projectRoot, "feature.txt"), "utf8"), "from worktree\n");
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("merge tolerates managed canonical dirty files outside the requirement allowlist", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-sync-tolerate";
  const otherRequirementId = "req-other";
  const otherTaskId = "subtask-other";
  const spacedRequirementPath = 'docs/02_需求设计/other "quoted req".md';
  const trackedLessonPath = "docs/05_经验沉淀/tracked-lessons.md";
  try {
    await writeMarkdownDoc(
      projectRoot,
      trackedLessonPath,
      [
        "doc_type: lessons",
        "updated: 2026-06-10"
      ],
      "# Tracked Lessons\n"
    );
    await git(projectRoot, ["add", trackedLessonPath]);
    await git(projectRoot, ["commit", "-m", "add tracked evergreen doc"]);

    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    await writeRequirementDoc(projectRoot, requirementId, ["synced requirement"]);
    await writeTechnicalDesignDoc(projectRoot, requirementId);
    await writeRequirementDoc(projectRoot, otherRequirementId, ["other requirement"]);
    await writeMarkdownDoc(
      projectRoot,
      spacedRequirementPath,
      [
        "id: req-spaced",
        "doc_type: requirement"
      ],
      "# Spaced Requirement\n"
    );
    await writeTechnicalDesignDoc(projectRoot, otherRequirementId);
    await writeDevTaskDoc(projectRoot, otherRequirementId, otherTaskId);
    await mkdir(join(projectRoot, "docs", ".ccb", "worktrees"), { recursive: true });
    await writeFile(join(projectRoot, "docs", ".ccb", "worktrees", `${otherRequirementId}.json`), "{}\n", "utf8");
    await mkdir(join(projectRoot, "docs", ".ccb", "drafts", "breakdown"), { recursive: true });
    await writeFile(join(projectRoot, "docs", ".ccb", "drafts", "breakdown", `${otherRequirementId}.json`), "{}\n", "utf8");
    await writeMarkdownDoc(
      projectRoot,
      trackedLessonPath,
      [
        "doc_type: lessons",
        "updated: 2026-06-11"
      ],
      "# Updated Tracked Lessons\n"
    );
    await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "feature.txt",
      "from worktree\n",
      "feature work"
    );

    const merged = await mergeRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(merged.status, "merged");
    const syncResult = rootSpace(await readState(projectRoot, requirementId)).merge.canonical_sync;
    assert.equal(syncResult.status, "committed");
    assert.deepEqual(syncResult.tolerated_paths, [
      `docs/.ccb/drafts/breakdown/${otherRequirementId}.json`,
      `docs/.ccb/worktrees/${otherRequirementId}.json`,
      spacedRequirementPath,
      `docs/02_需求设计/${otherRequirementId}.md`,
      `docs/03_开发计划/${otherRequirementId}-技术设计.md`,
      `docs/03_开发计划/${otherTaskId}-开发任务.md`,
      trackedLessonPath
    ]);
    assert.match(
      await git(projectRoot, ["log", "--format=%s", "--", `docs/03_开发计划/${requirementId}-技术设计.md`]),
      new RegExp(`chore\\(${requirementId}\\): canonical sync before requirement merge`)
    );
    assert.equal(await git(projectRoot, ["log", "--format=%s", "--", `docs/03_开发计划/${otherRequirementId}-技术设计.md`]), "");
    const status = await git(projectRoot, ["-c", "core.quotePath=false", "status", "--porcelain", "--untracked-files=all"]);
    assert.match(status, new RegExp(`docs/02_需求设计/${otherRequirementId}\\.md`));
    assert.match(status, /"docs\/02_需求设计\/other \\"quoted req\\"\.md"/);
    assert.match(status, new RegExp(trackedLessonPath));
    assert.doesNotMatch(status, new RegExp(`docs/03_开发计划/${requirementId}-技术设计\\.md`));
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("merge escalates when canonical dirty files fall outside the sync allowlist", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-sync-outside";
  try {
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "feature.txt",
      "from worktree\n",
      "feature work"
    );
    await writeFile(join(projectRoot, "outside.txt"), "do not sync\n", "utf8");

    const result = await mergeRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "canonical_dirty_outside_allowlist");
    assert.match(result.porcelain, /outside\.txt/);
    assert.deepEqual(result.tolerated_paths, []);
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "ready");
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), true);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("merge escalations preserve tolerated paths while reporting only foreign porcelain", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-sync-foreign";
  const otherRequirementId = "req-foreign-other";
  const untrackedLessonPath = "docs/05_经验沉淀/new-lessons.md";
  try {
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    await writeRequirementDoc(projectRoot, otherRequirementId, ["other requirement"]);
    await writeMarkdownDoc(
      projectRoot,
      untrackedLessonPath,
      [
        "doc_type: lessons",
        "updated: 2026-06-10"
      ],
      "# New Lessons\n"
    );
    await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "feature.txt",
      "from worktree\n",
      "feature work"
    );

    const result = await mergeRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "canonical_dirty_outside_allowlist");
    assert.match(result.porcelain, new RegExp(untrackedLessonPath));
    assert.doesNotMatch(result.porcelain, new RegExp(`docs/02_需求设计/${otherRequirementId}\\.md`));
    assert.deepEqual(result.tolerated_paths, [`docs/02_需求设计/${otherRequirementId}.md`]);
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "ready");
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("merge treats deleted and renamed non-allowlist docs as foreign dirty entries", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-sync-rename";
  const deletedPath = "docs/02_需求设计/deleted-requirement.md";
  const renamedPath = "docs/02_需求设计/renamed-requirement.md";
  const renamedTargetPath = "docs/02_需求设计/renamed-requirement-next.md";
  try {
    await writeMarkdownDoc(
      projectRoot,
      deletedPath,
      [
        "id: deleted-req",
        "doc_type: requirement"
      ],
      "# Deleted Requirement\n"
    );
    await writeMarkdownDoc(
      projectRoot,
      renamedPath,
      [
        "id: renamed-req",
        "doc_type: requirement"
      ],
      "# Renamed Requirement\n"
    );
    await git(projectRoot, ["add", deletedPath, renamedPath]);
    await git(projectRoot, ["commit", "-m", "add managed docs"]);
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    await rm(join(projectRoot, deletedPath));
    await git(projectRoot, ["mv", renamedPath, renamedTargetPath]);
    await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "feature.txt",
      "from worktree\n",
      "feature work"
    );

    const result = await mergeRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "canonical_dirty_outside_allowlist");
    assert.match(result.porcelain, new RegExp(deletedPath));
    assert.match(result.porcelain, /renamed-requirement\.md -> docs\/02_需求设计\/renamed-requirement-next\.md/);
    assert.deepEqual(result.tolerated_paths, []);
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "ready");
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("cleanup escalates when the worktree branch tip is not an ancestor of target", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-cleanup-ancestor";
  try {
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    const featureSha = await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "feature.txt",
      "from worktree\n",
      "feature work"
    );
    await overwriteRuntimeState(projectRoot, requirementId, {
      status: "merged",
      merged_branch_sha: featureSha,
      target_sha_after_merge: await git(projectRoot, ["rev-parse", "HEAD"]),
      merged_at: "2026-06-06T10:00:00.000Z"
    });

    const result = await cleanupRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "cleanup_branch_not_ancestor");
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), true);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), true);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("merge and cleanup recover after git state already reached the target transition", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-recovery";
  try {
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    const featureSha = await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "feature.txt",
      "from worktree\n",
      "feature work"
    );
    await commitCanonicalState(projectRoot);
    await git(projectRoot, ["merge", "--no-edit", codeWorkspace(requirementId).branch]);
    await overwriteRuntimeState(projectRoot, requirementId, { status: "ready" });

    const merged = await mergeRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    assert.equal(merged.status, "merged");
    assert.equal(merged.mergedBranchSha, featureSha);

    await git(projectRoot, ["worktree", "remove", worktreePath(projectRoot, requirementId)]);
    await git(projectRoot, ["branch", "-d", codeWorkspace(requirementId).branch]);

    const cleaned = await cleanupRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    assert.equal(cleaned.status, "archived");
    assert.equal(cleaned.recovery, "git_resources_already_cleaned");
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "archived");
    const archivedEvents = (await readJournalEvents(projectRoot))
      .filter((event) => event.type === "requirement_worktree_archived");
    assert.equal(archivedEvents.at(-1).payload.removal_forced, false);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("archive escalates when the recorded target branch no longer exists and preserves the worktree", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-target-missing";
  try {
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    await commitCanonicalState(projectRoot);
    await git(projectRoot, ["checkout", "--detach"]);
    await git(projectRoot, ["branch", "-D", "main"]);

    const result = await archiveRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "target_branch_missing");
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), true);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), true);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("archive aborts a merge conflict and leaves the worktree branch intact", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-conflict";
  try {
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    await commitCanonicalState(projectRoot);
    await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "conflict.txt",
      "worktree\n",
      "worktree conflict side"
    );
    await writeFile(join(projectRoot, "conflict.txt"), "main\n", "utf8");
    await git(projectRoot, ["add", "conflict.txt"]);
    await git(projectRoot, ["commit", "-m", "main conflict side"]);

    const result = await archiveRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "merge_conflict");
    assert.equal(await git(projectRoot, ["diff", "--name-only", "--diff-filter=U"]), "");
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), true);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), true);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("discard force-removes the worktree and branch without merging code", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-discard";
  try {
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "discarded.txt",
      "discard me\n",
      "discarded work"
    );

    const result = await discardRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    assert.equal(result.status, "discarded");
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), false);
    assert.equal(await branchExists(projectRoot, codeWorkspace(requirementId).branch), false);
    assert.equal(await pathPresent(join(projectRoot, "discarded.txt")), false);
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "discarded");
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("concurrent ensure calls for the same requirement are serialized by the canonical lock", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-lock";
  try {
    const results = await Promise.all([
      ensureRequirementWorktree({
        projectRoot,
        requirementId,
        codeWorkspace: codeWorkspace(requirementId)
      }),
      ensureRequirementWorktree({
        projectRoot,
        requirementId,
        codeWorkspace: codeWorkspace(requirementId)
      })
    ]);

    assert.deepEqual(results.map((result) => result.status).sort(), ["created", "existing"]);
    assert.equal(await git(worktreePath(projectRoot, requirementId), ["rev-parse", "--abbrev-ref", "HEAD"]), codeWorkspace(requirementId).branch);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("canonical repo lock files stay outside git status", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  let release;
  try {
    release = await acquireFileLock(canonicalRepoLockTargetPath(projectRoot));

    const status = await git(projectRoot, ["status", "--porcelain", "--untracked-files=all"]);

    assert.doesNotMatch(status, /\.ccb\/locks\/canonical-repo/);
    assert.equal(await pathPresent(join(projectRoot, ".ccb", "locks", "canonical-repo.lock", "owner.json")), true);
  } finally {
    if (release) await release();
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("single-space merge reports canonical repo lock timeout as escalation", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-canonical-lock-timeout";
  let release;
  try {
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });
    await commitWorktreeFile(
      worktreePath(projectRoot, requirementId),
      "feature.txt",
      "from worktree\n",
      "feature work"
    );
    release = await acquireFileLock(canonicalRepoLockTargetPath(projectRoot));

    const result = await mergeRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId),
      canonicalLockOptions: { timeoutMs: 25, retryIntervalMs: 5 }
    });

    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "canonical_repo_lock_timeout");
    assert.equal(result.lock_path, canonicalRepoLockTargetPath(projectRoot));
    assert.equal(result.lock_owner.path, canonicalRepoLockTargetPath(projectRoot));
    const escalations = (await readJournalEvents(projectRoot))
      .filter((event) => event.type === "requirement_worktree_archive_escalated");
    assert.equal(escalations.at(-1).payload.reason, "canonical_repo_lock_timeout");
    assert.equal(rootStatus(await readState(projectRoot, requirementId)), "ready");
  } finally {
    if (release) await release();
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("multi-space root merge reports canonical repo lock timeout as escalation", async () => {
  const fixture = await createMultiRepoFixture(fakeAssociationFixtureOptions());
  const requirementId = "req-root-lock-timeout";
  let release;
  try {
    await ensureRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    await commitWorktreeFile(
      spaceWorktreePath(fixture.projectRoot, requirementId, "root"),
      "root-feature.txt",
      "root feature\n",
      "root feature"
    );
    await commitWorktreeFile(
      spaceWorktreePath(fixture.projectRoot, requirementId, "plugin"),
      "plugin-feature.txt",
      "plugin feature\n",
      "plugin feature"
    );
    release = await acquireFileLock(canonicalRepoLockTargetPath(fixture.projectRoot));

    const result = await mergeRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId),
      canonicalLockOptions: { timeoutMs: 25, retryIntervalMs: 5 }
    });

    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "canonical_repo_lock_timeout");
    assert.equal(result.op, "merge");
    assert.equal(result.space_id, "root");
    assert.equal(result.lock_path, canonicalRepoLockTargetPath(fixture.projectRoot));
    const state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.equal(state.aggregate_status, "escalated");
    assert.equal(state.last_error.reason, "canonical_repo_lock_timeout");
  } finally {
    if (release) await release();
    await fixture.cleanup();
  }
});

test("association root gitlink sync reports canonical repo lock timeout as escalation", async () => {
  const fixture = await createMultiRepoFixture();
  const requirementId = "req-association-lock-timeout";
  let release;
  try {
    await ensureRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId)
    });
    const pluginBranchSha = await commitWorktreeFile(
      spaceWorktreePath(fixture.projectRoot, requirementId, "plugin"),
      "plugin-feature.txt",
      "plugin feature\n",
      "plugin feature"
    );
    await fixtureGit(fixture.pluginRepo, ["merge", "--no-edit", `ccb/req-${requirementId}`]);
    const rootHead = await fixtureGit(fixture.projectRoot, ["rev-parse", "HEAD"]);
    const pluginHead = await fixtureGit(fixture.pluginRepo, ["rev-parse", "HEAD"]);
    assert.equal(pluginHead, pluginBranchSha);
    await mutateRuntimeState(fixture.projectRoot, requirementId, (state) => ({
      ...state,
      spaces: state.spaces.map((space) => {
        if (space.space_id === "root") {
          return {
            ...space,
            status: "merged",
            merged_branch_sha: rootHead,
            target_sha_after_merge: rootHead,
            merged_at: "2026-06-10T00:00:00.000Z",
            last_error: null
          };
        }
        return {
          ...space,
          status: "merged",
          merged_branch_sha: pluginBranchSha,
          target_sha_after_merge: pluginHead,
          merged_at: "2026-06-10T00:00:00.000Z",
          last_error: null
        };
      }),
      associations: state.associations.map((association) => ({
        ...association,
        status: "pending",
        synced_commit_sha: null,
        noop: false,
        synced_at: null,
        last_error: null
      })),
      last_error: null
    }));
    release = await acquireFileLock(canonicalRepoLockTargetPath(fixture.projectRoot));

    const result = await mergeRequirementWorktree({
      projectRoot: fixture.projectRoot,
      requirementId,
      codeWorkspace: multiRepoCodeWorkspace(requirementId),
      canonicalLockOptions: { timeoutMs: 25, retryIntervalMs: 5 }
    });

    assert.equal(result.status, "escalated");
    assert.equal(result.reason, "canonical_repo_lock_timeout");
    assert.equal(result.op, "associate");
    assert.equal(result.association_id, "plugin-to-root");
    assert.equal(result.lock_path, canonicalRepoLockTargetPath(fixture.projectRoot));
    const state = await readMultiRepoState(fixture.projectRoot, requirementId);
    assert.equal(state.aggregate_status, "escalated");
    assert.equal(associationById(state, "plugin-to-root").status, "pending");
    assert.equal(associationById(state, "plugin-to-root").last_error.reason, "canonical_repo_lock_timeout");
  } finally {
    if (release) await release();
    await fixture.cleanup();
  }
});

test("concurrent single-space merges serialize root git mutations with canonical repo lock", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementA = "req-lock-a";
  const requirementB = "req-lock-b";
  const aAtRootCommit = deferred();
  const releaseA = deferred();
  const bBeforeCanonicalLock = deferred();
  const bRootMutations = [];
  let pausedA = false;
  let released = false;
  try {
    for (const requirementId of [requirementA, requirementB]) {
      await ensureRequirementWorktree({
        projectRoot,
        requirementId,
        codeWorkspace: codeWorkspace(requirementId)
      });
      await writeRequirementDoc(projectRoot, requirementId, [`requirement ${requirementId}`]);
      await commitWorktreeFile(
        worktreePath(projectRoot, requirementId),
        `${requirementId}.txt`,
        `${requirementId}\n`,
        `${requirementId} feature`
      );
    }

    const runGitA = async (cwd, args, options = {}) => {
      if (!pausedA && cwd === projectRoot && args[0] === "commit") {
        pausedA = true;
        aAtRootCommit.resolve();
        await releaseA.promise;
      }
      return await runGitResult(cwd, args, options);
    };
    const runGitB = async (cwd, args, options = {}) => {
      if (cwd === projectRoot && ["add", "commit", "merge"].includes(args[0])) {
        bRootMutations.push(args[0]);
        assert.equal(released, true, `B entered root ${args[0]} before A released canonical lock`);
      }
      const result = await runGitResult(cwd, args, options);
      if (cwd === worktreePath(projectRoot, requirementB) &&
          args[0] === "-c" &&
          args[2] === "status") {
        bBeforeCanonicalLock.resolve();
      }
      return result;
    };

    const mergeA = mergeRequirementWorktree({
      projectRoot,
      requirementId: requirementA,
      codeWorkspace: codeWorkspace(requirementA),
      runGit: runGitA
    });
    await aAtRootCommit.promise;
    const mergeB = mergeRequirementWorktree({
      projectRoot,
      requirementId: requirementB,
      codeWorkspace: codeWorkspace(requirementB),
      runGit: runGitB
    });
    await bBeforeCanonicalLock.promise;
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(bRootMutations, []);

    released = true;
    releaseA.resolve();
    const [resultA, resultB] = await Promise.all([mergeA, mergeB]);

    assert.equal(resultA.status, "merged");
    assert.equal(resultB.status, "merged");
    assert.deepEqual(bRootMutations, ["add", "commit", "merge"]);
    assert.equal(await git(projectRoot, ["diff", "--cached", "--quiet"]).then(() => "clean"), "clean");
    assert.equal(await readFile(join(projectRoot, `${requirementA}.txt`), "utf8"), `${requirementA}\n`);
    assert.equal(await readFile(join(projectRoot, `${requirementB}.txt`), "utf8"), `${requirementB}\n`);
  } finally {
    releaseA.resolve();
    await rm(baseDir, { recursive: true, force: true });
  }
});
