// Runtime state schema:
// - Reads support requirement-worktree-v0.1 by lifting it in memory to v0.2.
// - Writes serialize as requirement-worktree-v0.2 with aggregate_status,
//   spaces[], associations[], topology_source, and last_error.

import { ValidationError } from "../runtime/index.mjs";

export const WORKTREE_STATE_SCHEMA_VERSION_V01 = "requirement-worktree-v0.1";
export const WORKTREE_STATE_SCHEMA_VERSION_V02 = "requirement-worktree-v0.2";

const SPACE_STATUSES = new Set(["pending", "ready", "merged", "archived", "discarded"]);
const ASSOCIATION_STATUSES = new Set(["pending", "synced"]);

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, field) {
  if (!isObject(value)) {
    throw new ValidationError(`${field} must be an object`);
  }
  return value;
}

function optionalString(value, field) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string when present`);
  }
  return value;
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function normalizeTopologySource(source) {
  if (source === undefined || source === null) {
    return {
      path: null,
      schema_version: null,
      content_hash: null
    };
  }
  requireObject(source, "topology_source");
  return {
    path: optionalString(source.path, "topology_source.path"),
    schema_version: optionalString(source.schema_version, "topology_source.schema_version"),
    content_hash: optionalString(source.content_hash, "topology_source.content_hash")
  };
}

function normalizeSpace(space, index = 0) {
  requireObject(space, `spaces[${index}]`);
  const status = requiredString(space.status, `spaces[${index}].status`);
  if (!SPACE_STATUSES.has(status)) {
    throw new ValidationError(`spaces[${index}].status is not supported: ${status}`);
  }
  return {
    space_id: requiredString(space.space_id, `spaces[${index}].space_id`),
    kind: requiredString(space.kind, `spaces[${index}].kind`),
    repo: requiredString(space.repo, `spaces[${index}].repo`),
    path: requiredString(space.path, `spaces[${index}].path`),
    branch: requiredString(space.branch, `spaces[${index}].branch`),
    target_branch: optionalString(space.target_branch, `spaces[${index}].target_branch`),
    base_sha: optionalString(space.base_sha, `spaces[${index}].base_sha`),
    status,
    merged_branch_sha: optionalString(space.merged_branch_sha, `spaces[${index}].merged_branch_sha`),
    target_sha_after_merge: optionalString(space.target_sha_after_merge, `spaces[${index}].target_sha_after_merge`),
    merged_at: optionalString(space.merged_at, `spaces[${index}].merged_at`),
    merge: cloneJson(space.merge ?? null),
    archived_at: optionalString(space.archived_at, `spaces[${index}].archived_at`),
    archive: cloneJson(space.archive ?? null),
    discarded_at: optionalString(space.discarded_at, `spaces[${index}].discarded_at`),
    reopened_at: optionalString(space.reopened_at, `spaces[${index}].reopened_at`),
    last_error: cloneJson(space.last_error ?? null)
  };
}

function normalizeAssociation(association, index = 0) {
  requireObject(association, `associations[${index}]`);
  const status = requiredString(association.status, `associations[${index}].status`);
  if (!ASSOCIATION_STATUSES.has(status)) {
    throw new ValidationError(`associations[${index}].status is not supported: ${status}`);
  }
  return {
    association_id: requiredString(association.association_id, `associations[${index}].association_id`),
    kind: requiredString(association.kind, `associations[${index}].kind`),
    from_space: requiredString(association.from_space, `associations[${index}].from_space`),
    to_space: requiredString(association.to_space, `associations[${index}].to_space`),
    submodule_path: requiredString(association.submodule_path, `associations[${index}].submodule_path`),
    status,
    synced_commit_sha: optionalString(association.synced_commit_sha, `associations[${index}].synced_commit_sha`),
    noop: Boolean(association.noop),
    synced_at: optionalString(association.synced_at, `associations[${index}].synced_at`),
    last_error: cloneJson(association.last_error ?? null)
  };
}

function rootSpaceFromV01(state) {
  const status = requiredString(state.status, "status");
  if (!SPACE_STATUSES.has(status)) {
    throw new ValidationError(`status is not supported by v0.2 lift: ${status}`);
  }
  return normalizeSpace({
    space_id: "root",
    kind: "git_worktree",
    repo: ".",
    path: state.path,
    branch: state.branch,
    target_branch: state.confirmed_target_branch ?? state.target_branch ?? null,
    base_sha: state.base_sha ?? null,
    status,
    merged_branch_sha: state.merged_branch_sha ?? null,
    target_sha_after_merge: state.target_sha_after_merge ?? null,
    merged_at: state.merged_at ?? null,
    merge: state.merge ?? null,
    archived_at: state.archived_at ?? null,
    archive: state.archive ?? null,
    discarded_at: state.discarded_at ?? null,
    reopened_at: state.reopened_at ?? null,
    last_error: state.last_error ?? null
  });
}

export function computeAggregateStatus(spaces, associations = []) {
  if (!Array.isArray(spaces) || spaces.length === 0) return "escalated";
  if (!Array.isArray(associations)) return "escalated";

  const statuses = spaces.map((space) => space?.status);
  if (statuses.every((status) => status === "discarded")) return "discarded";
  if (statuses.every((status) => status === "archived")) return "archived";

  const allAssociationsSynced = associations.every((association) => association?.status === "synced");
  if (statuses.every((status) => status === "merged") && allAssociationsSynced) return "merged";
  if (statuses.every((status) => status === "ready")) return "ready";
  if (statuses.every((status) => status === "pending" || status === "ready") &&
      statuses.some((status) => status === "pending")) {
    return "pending";
  }

  return "escalated";
}

function aggregateStatusForState(spaces, associations, lastError) {
  return lastError?.op && lastError.op !== "ensure"
    ? "escalated"
    : computeAggregateStatus(spaces, associations);
}

export function liftV01ToV02(state) {
  requireObject(state, "state");
  const space = rootSpaceFromV01(state);
  const associations = [];
  const spaces = [space];
  const lastError = cloneJson(state.last_error ?? null);
  return {
    schema_version: WORKTREE_STATE_SCHEMA_VERSION_V02,
    requirement_id: requiredString(state.requirement_id, "requirement_id"),
    aggregate_status: aggregateStatusForState(spaces, associations, lastError),
    spaces,
    associations,
    topology_source: normalizeTopologySource(state.topology_source),
    last_error: lastError,
    created_at: state.created_at ?? null,
    updated_at: state.updated_at ?? null
  };
}

export function normalizeWorktreeStateV02(state) {
  requireObject(state, "state");
  if (state.schema_version === WORKTREE_STATE_SCHEMA_VERSION_V01 || !Array.isArray(state.spaces)) {
    return liftV01ToV02(state);
  }
  if (state.schema_version !== WORKTREE_STATE_SCHEMA_VERSION_V02) {
    throw new ValidationError(`unsupported worktree state schema_version: ${state.schema_version ?? "<missing>"}`);
  }

  const spaces = state.spaces.map((space, index) => normalizeSpace(space, index));
  const associations = (state.associations ?? []).map((association, index) =>
    normalizeAssociation(association, index)
  );
  const lastError = cloneJson(state.last_error ?? null);
  return {
    schema_version: WORKTREE_STATE_SCHEMA_VERSION_V02,
    requirement_id: requiredString(state.requirement_id, "requirement_id"),
    aggregate_status: aggregateStatusForState(spaces, associations, lastError),
    spaces,
    associations,
    topology_source: normalizeTopologySource(state.topology_source),
    last_error: lastError,
    created_at: state.created_at ?? null,
    updated_at: state.updated_at ?? null
  };
}

export function parseWorktreeState(content) {
  if (typeof content !== "string") {
    throw new ValidationError("worktree state content must be a string");
  }
  try {
    return normalizeWorktreeStateV02(JSON.parse(content));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ValidationError("invalid worktree state JSON", { cause: error });
    }
    throw error;
  }
}

export function serializeWorktreeStateV02(state) {
  return `${JSON.stringify(normalizeWorktreeStateV02(state), null, 2)}\n`;
}
