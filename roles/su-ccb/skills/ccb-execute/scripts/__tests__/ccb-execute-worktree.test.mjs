import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  CcbExecuteWorktreeError,
  autoCommitFromSpec,
  extractVerificationCommands,
  guardDocsCcbClean,
  resolveWorktreeFromSpec
} from "../ccb-execute-worktree.mjs";

const execFileAsync = promisify(execFile);

async function git(cwd, args) {
  const result = await execFileAsync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });
  return (result.stdout ?? "").trim();
}

async function tempProject() {
  const baseDir = join(tmpdir(), `ccb-execute-worktree-${randomUUID()}`);
  const projectRoot = join(baseDir, "repo");
  await mkdir(projectRoot, { recursive: true });
  await git(projectRoot, ["init", "-b", "main"]);
  await git(projectRoot, ["config", "user.email", "ccb-test@example.invalid"]);
  await git(projectRoot, ["config", "user.name", "CCB Test"]);
  await mkdir(join(projectRoot, "docs", ".ccb"), { recursive: true });
  await writeFile(join(projectRoot, "README.md"), "initial\n", "utf8");
  await writeFile(join(projectRoot, "docs", ".ccb", "tracked.txt"), "canonical\n", "utf8");
  await git(projectRoot, ["add", "."]);
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

async function addWorktree(projectRoot, requirementId) {
  await git(projectRoot, [
    "worktree",
    "add",
    "-b",
    codeWorkspace(requirementId).branch,
    worktreePath(projectRoot, requirementId),
    "HEAD"
  ]);
}

async function writeSpec(projectRoot, requirementId, { workspace = codeWorkspace(requirementId), validation = "node --version" } = {}) {
  const path = join(projectRoot, "dev-task.md");
  const lines = [
    "---",
    "doc_type: dev_task",
    "task_id: subtask-123456789abc",
    `requirement_id: ${requirementId}`,
    workspace ? `code_workspace: ${JSON.stringify(workspace)}` : null,
    "---",
    "",
    "## 验证",
    "",
    "```bash",
    validation,
    "```",
    ""
  ].filter((line) => line !== null);
  await writeFile(path, lines.join("\n"), "utf8");
  return path;
}

test("resolveWorktreeFromSpec fail-fasts when code_workspace is missing or path does not exist", async () => {
  const { baseDir, projectRoot } = await tempProject();
  try {
    const missingFieldSpec = await writeSpec(projectRoot, "req-missing-field", { workspace: null });
    await assert.rejects(
      () => resolveWorktreeFromSpec({ projectRoot, specPath: missingFieldSpec }),
      (error) => error instanceof CcbExecuteWorktreeError && error.code === "missing_code_workspace"
    );

    const missingPathSpec = await writeSpec(projectRoot, "req-missing-path");
    await assert.rejects(
      () => resolveWorktreeFromSpec({ projectRoot, specPath: missingPathSpec }),
      (error) => error instanceof CcbExecuteWorktreeError && error.code === "code_root_missing"
    );
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("resolveWorktreeFromSpec rejects branch mismatch and never creates a worktree", async () => {
  const { baseDir, projectRoot } = await tempProject();
  const requirementId = "req-branch";
  try {
    await addWorktree(projectRoot, requirementId);
    const specPath = await writeSpec(projectRoot, requirementId, {
      workspace: { ...codeWorkspace(requirementId), branch: "wrong-branch" }
    });

    await assert.rejects(
      () => resolveWorktreeFromSpec({ projectRoot, specPath }),
      (error) => error instanceof CcbExecuteWorktreeError && error.code === "branch_mismatch"
    );
    assert.equal(await git(worktreePath(projectRoot, requirementId), ["rev-parse", "--abbrev-ref", "HEAD"]), codeWorkspace(requirementId).branch);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("extractVerificationCommands reads the first fenced block under 验证", () => {
  assert.deepEqual(
    extractVerificationCommands([
      "# Task",
      "",
      "### 验证",
      "```bash",
      "# comment",
      "pnpm test",
      "node --test scripts",
      "```"
    ].join("\n")),
    ["pnpm test", "node --test scripts"]
  );
});

test("autoCommitFromSpec runs validation in codeRoot and commits verified work", async () => {
  const { baseDir, projectRoot } = await tempProject();
  const requirementId = "req-commit";
  try {
    await addWorktree(projectRoot, requirementId);
    const codeRoot = worktreePath(projectRoot, requirementId);
    const specPath = await writeSpec(projectRoot, requirementId, {
      validation: "test -f code.txt"
    });
    await writeFile(join(codeRoot, "code.txt"), "code\n", "utf8");

    const result = await autoCommitFromSpec({ projectRoot, specPath });

    assert.equal(result.status, "committed");
    assert.equal(result.verificationStatus, "verified");
    assert.match(result.commitSha, /^[0-9a-f]{40}$/);
    assert.equal(await git(codeRoot, ["status", "--porcelain"]), "");
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("autoCommitFromSpec commits unverified work when no verification block exists", async () => {
  const { baseDir, projectRoot } = await tempProject();
  const requirementId = "req-unverified";
  try {
    await addWorktree(projectRoot, requirementId);
    const codeRoot = worktreePath(projectRoot, requirementId);
    const specPath = await writeSpec(projectRoot, requirementId, { validation: "" });
    await writeFile(specPath, (await readFile(specPath, "utf8")).replace(/## 验证[\s\S]*$/, ""), "utf8");
    await writeFile(join(codeRoot, "unverified.txt"), "code\n", "utf8");

    const result = await autoCommitFromSpec({ projectRoot, specPath });

    assert.equal(result.status, "committed");
    assert.equal(result.verificationStatus, "unverified");
    assert.deepEqual(result.verificationCommands, []);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("commit guard rejects docs/.ccb staged, unstaged, and untracked changes", async () => {
  for (const mode of ["staged", "unstaged", "untracked"]) {
    const { baseDir, projectRoot } = await tempProject();
    const requirementId = `req-guard-${mode}`;
    try {
      await addWorktree(projectRoot, requirementId);
      const codeRoot = worktreePath(projectRoot, requirementId);
      await mkdir(join(codeRoot, "docs", ".ccb"), { recursive: true });

      if (mode === "staged") {
        await writeFile(join(codeRoot, "docs", ".ccb", "tracked.txt"), "staged\n", "utf8");
        await git(codeRoot, ["add", "docs/.ccb/tracked.txt"]);
      } else if (mode === "unstaged") {
        await writeFile(join(codeRoot, "docs", ".ccb", "tracked.txt"), "unstaged\n", "utf8");
      } else {
        await writeFile(join(codeRoot, "docs", ".ccb", "new.txt"), "untracked\n", "utf8");
      }

      await assert.rejects(
        () => guardDocsCcbClean({ codeRoot }),
        (error) => {
          assert.equal(error instanceof CcbExecuteWorktreeError, true);
          assert.equal(error.code, "docs_ccb_dirty");
          assert.equal(error.details[mode].length, 1);
          return true;
        },
        mode
      );
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  }
});
