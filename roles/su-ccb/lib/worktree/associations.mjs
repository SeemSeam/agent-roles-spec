import { resolve } from "node:path";

import { ValidationError } from "../runtime/index.mjs";
import {
  parseStatusEntries,
  runtimeDirtyAllowlist,
  statusEntryAllowedForAssociation
} from "./dirty-classifier.mjs";

const associationExecutors = new Map();

function requireExecutor(kind, executor) {
  if (!executor || typeof executor.sync !== "function" || typeof executor.verify !== "function") {
    throw new ValidationError(`association executor must implement sync and verify: ${kind}`);
  }
  return executor;
}

export function registerAssociationExecutor(kind, executor) {
  if (typeof kind !== "string" || kind.trim().length === 0) {
    throw new ValidationError("association executor kind must be a non-empty string");
  }
  associationExecutors.set(kind, requireExecutor(kind, executor));
}

export function getAssociationExecutor(kind) {
  return associationExecutors.get(kind) ?? null;
}

export function unregisterAssociationExecutor(kind) {
  associationExecutors.delete(kind);
}

export function clearAssociationExecutorsForTest() {
  associationExecutors.clear();
  registerBuiltInAssociationExecutors();
}

function requiredSpace(spacesById, spaceId, field) {
  const space = spacesById.get(spaceId);
  if (!space) {
    throw new ValidationError(`association ${field} cannot resolve space: ${spaceId}`);
  }
  return space;
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

async function gitOutput(runGit, cwd, args, options = {}) {
  return (await runGit(cwd, args, options)).stdout.trim();
}

function associationDirtyPathspecs(association) {
  const declared = Array.isArray(association.allowed_dirty_submodule_paths)
    ? association.allowed_dirty_submodule_paths
    : [];
  return [...new Set([association.submodule_path, ...declared].filter(Boolean))];
}

async function statusOutsideSubmodulePath(space, submodulePaths, runGit, requirementId) {
  const status = await runGit(space.repoRoot, [
    "-c",
    "core.quotePath=false",
    "status",
    "--porcelain",
    "--untracked-files=all"
  ]);
  const outside = [];
  const allowlist = runtimeDirtyAllowlist(requirementId);
  for (const entry of parseStatusEntries(status.stdout)) {
    if (!await statusEntryAllowedForAssociation(
      space.repoRoot,
      entry,
      submodulePaths,
      allowlist,
      { requirementId, runGit }
    )) {
      outside.push(entry);
    }
  }
  return outside;
}

async function currentBranch(space, runGit) {
  return await gitOutput(runGit, space.repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);
}

async function gitlinkSha(space, submodulePath, runGit) {
  const result = await runGit(space.repoRoot, ["rev-parse", `HEAD:${submodulePath}`], {
    allowFailure: true
  });
  if (result.exitCode === 0) return result.stdout.trim();
  if (result.exitCode === 128) return null;
  throw new ValidationError(`failed to read gitlink: ${submodulePath}`);
}

async function commitExists(space, sha, runGit) {
  const result = await runGit(space.repoRoot, ["cat-file", "-e", `${sha}^{commit}`], {
    allowFailure: true
  });
  return result.exitCode === 0;
}

async function isAncestor(space, ancestor, descendant, runGit) {
  const result = await runGit(space.repoRoot, ["merge-base", "--is-ancestor", ancestor, descendant], {
    allowFailure: true
  });
  if (result.exitCode === 0) return true;
  if (result.exitCode === 1) return false;
  throw new ValidationError(`failed to test commit ancestry: ${ancestor} -> ${descendant}`);
}

async function assertOnTargetBranch(space, runGit) {
  const targetBranch = requiredString(space.target_branch, `${space.space_id}.target_branch`);
  const activeBranch = await currentBranch(space, runGit);
  if (activeBranch !== targetBranch) {
    throw new ValidationError(
      `association target repo must be on target_branch: ${space.space_id} expected ${targetBranch}, got ${activeBranch}`
    );
  }
}

async function assertNoDirtyOutsidePath(space, submodulePath, runGit, requirementId) {
  const outside = await statusOutsideSubmodulePath(space, submodulePath, runGit, requirementId);
  if (outside.length > 0) {
    throw new ValidationError(
      `association target repo has dirty files outside ${submodulePath}: ${outside.map((entry) => entry.raw).join("\n")}`
    );
  }
}

async function withRootRepoLockIfNeeded(projectRoot, toSpace, withCanonicalRepoLock, fn) {
  if (typeof withCanonicalRepoLock === "function" && resolve(toSpace.repoRoot) === resolve(projectRoot)) {
    return await withCanonicalRepoLock(fn);
  }
  return await fn();
}

async function syncGitSubmoduleGitlink({ projectRoot, requirementId, association, spacesById, runGit, withCanonicalRepoLock }) {
  const fromSpace = requiredSpace(spacesById, association.from_space, "from_space");
  const toSpace = requiredSpace(spacesById, association.to_space, "to_space");
  const submodulePath = requiredString(association.submodule_path, "association.submodule_path");
  const allowedPathspecs = associationDirtyPathspecs(association);
  const targetSha = requiredString(fromSpace.target_sha_after_merge, `${fromSpace.space_id}.target_sha_after_merge`);

  return await withRootRepoLockIfNeeded(projectRoot, toSpace, withCanonicalRepoLock, async () => {
    await assertOnTargetBranch(toSpace, runGit);
    await assertNoDirtyOutsidePath(toSpace, allowedPathspecs, runGit, requirementId);

    const currentGitlinkSha = await gitlinkSha(toSpace, submodulePath, runGit);
    if (currentGitlinkSha === targetSha) {
      return {
        synced_commit_sha: currentGitlinkSha,
        noop: true
      };
    }

    await runGit(toSpace.repoRoot, ["add", "--", submodulePath]);
    const diff = await runGit(toSpace.repoRoot, ["diff", "--cached", "--quiet", "--", submodulePath], {
      allowFailure: true
    });
    if (diff.exitCode === 0) {
      throw new ValidationError(`gitlink differs from target but no pathspec diff was staged: ${association.association_id}`);
    }
    if (diff.exitCode !== 1) {
      throw new ValidationError(`failed to inspect staged gitlink diff: ${association.association_id}`);
    }

    await runGit(toSpace.repoRoot, [
      "commit",
      "-m",
      `chore(${requirementId}): sync ${association.association_id} gitlink`,
      "--",
      submodulePath
    ]);

    return {
      synced_commit_sha: await gitOutput(runGit, toSpace.repoRoot, ["rev-parse", "HEAD"]),
      noop: false
    };
  });
}

async function verifyGitSubmoduleGitlink({ projectRoot, requirementId, association, spacesById, runGit, withCanonicalRepoLock }) {
  const fromSpace = requiredSpace(spacesById, association.from_space, "from_space");
  const toSpace = requiredSpace(spacesById, association.to_space, "to_space");
  const submodulePath = requiredString(association.submodule_path, "association.submodule_path");
  const allowedPathspecs = associationDirtyPathspecs(association);
  const targetSha = requiredString(fromSpace.target_sha_after_merge, `${fromSpace.space_id}.target_sha_after_merge`);

  return await withRootRepoLockIfNeeded(projectRoot, toSpace, withCanonicalRepoLock, async () => {
    if (await currentBranch(toSpace, runGit) !== toSpace.target_branch) return false;
    if (await gitlinkSha(toSpace, submodulePath, runGit) !== targetSha) return false;
    if ((await statusOutsideSubmodulePath(toSpace, allowedPathspecs, runGit, requirementId)).length > 0) return false;

    if (!association.noop) {
      const syncedCommitSha = requiredString(association.synced_commit_sha, "association.synced_commit_sha");
      if (!await commitExists(toSpace, syncedCommitSha, runGit)) return false;
      if (!await isAncestor(toSpace, syncedCommitSha, toSpace.target_branch, runGit)) return false;
    }

    return true;
  });
}

function registerBuiltInAssociationExecutors() {
  registerAssociationExecutor("git_submodule_gitlink", {
    sync: syncGitSubmoduleGitlink,
    verify: verifyGitSubmoduleGitlink
  });

  registerAssociationExecutor("test_fake_association", {
    async sync({ projectRoot, requirementId, association, spacesById, runGit }) {
      if (!projectRoot || !requirementId) {
        throw new ValidationError("test fake association requires projectRoot and requirementId");
      }
      const fromSpace = spacesById.get(association.from_space);
      const toSpace = spacesById.get(association.to_space);
      if (!fromSpace || !toSpace) {
        throw new ValidationError(`test fake association cannot resolve spaces: ${association.association_id}`);
      }
      if (association.association_id.includes("sync-fail")) {
        throw new ValidationError(`test fake association sync failed: ${association.association_id}`);
      }
      const syncedCommit = await runGit(toSpace.repoRoot, ["rev-parse", "HEAD"]);
      return {
        synced_commit_sha: `${syncedCommit.stdout.trim()}:${fromSpace.space_id}->${toSpace.space_id}`,
        noop: association.association_id.includes("noop")
      };
    },
    async verify({ projectRoot, requirementId, association, spacesById, runGit }) {
      if (!projectRoot || !requirementId) {
        throw new ValidationError("test fake association requires projectRoot and requirementId");
      }
      const toSpace = spacesById.get(association.to_space);
      if (!toSpace) {
        throw new ValidationError(`test fake association cannot resolve to_space: ${association.to_space}`);
      }
      await runGit(toSpace.repoRoot, ["rev-parse", "--verify", "HEAD"]);
      return !association.association_id.includes("verify-fail");
    }
  });
}

registerBuiltInAssociationExecutors();
