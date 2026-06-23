import assert from "node:assert/strict";
import test from "node:test";

import {
  WORKTREE_STATE_SCHEMA_VERSION_V02,
  computeAggregateStatus,
  liftV01ToV02,
  parseWorktreeState,
  serializeWorktreeStateV02
} from "../state.mjs";

function v01State(status, patch = {}) {
  return {
    schema_version: "requirement-worktree-v0.1",
    requirement_id: "cmp-state-test",
    status,
    path: "../SU-CCB-req-cmp-state-test",
    branch: "ccb/req-cmp-state-test",
    confirmed_target_branch: "main",
    base_sha: "1111111",
    created_at: "2026-06-07T00:00:00.000Z",
    updated_at: "2026-06-07T00:01:00.000Z",
    ...patch
  };
}

function space(status, patch = {}) {
  return {
    space_id: patch.space_id ?? `space-${status}`,
    kind: "git_worktree",
    repo: ".",
    path: `../wt-${patch.space_id ?? status}`,
    branch: `ccb/req-${patch.space_id ?? status}`,
    status,
    ...patch
  };
}

function association(status, patch = {}) {
  return {
    association_id: patch.association_id ?? `assoc-${status}`,
    kind: "git_submodule_gitlink",
    from_space: "plugin",
    to_space: "root",
    submodule_path: "su-ccb-claude-plugin",
    status,
    ...patch
  };
}

test("liftV01ToV02 maps ready v0.1 record to one root space", () => {
  const lifted = liftV01ToV02(v01State("ready"));
  assert.equal(lifted.schema_version, WORKTREE_STATE_SCHEMA_VERSION_V02);
  assert.equal(lifted.aggregate_status, "ready");
  assert.deepEqual(lifted.associations, []);
  assert.equal(lifted.spaces.length, 1);
  assert.equal(lifted.spaces[0].space_id, "root");
  assert.equal(lifted.spaces[0].target_branch, "main");
});

test("liftV01ToV02 maps merged v0.1 merge cluster onto root space", () => {
  const lifted = liftV01ToV02(v01State("merged", {
    merged_branch_sha: "2222222",
    target_sha_after_merge: "3333333",
    merged_at: "2026-06-07T00:02:00.000Z",
    merge: { target_branch: "main", warnings: [] }
  }));
  assert.equal(lifted.aggregate_status, "merged");
  assert.equal(lifted.spaces[0].merged_branch_sha, "2222222");
  assert.equal(lifted.spaces[0].target_sha_after_merge, "3333333");
  assert.deepEqual(lifted.spaces[0].merge, { target_branch: "main", warnings: [] });
});

test("liftV01ToV02 maps archived v0.1 archive cluster onto root space", () => {
  const lifted = liftV01ToV02(v01State("archived", {
    archived_at: "2026-06-07T00:03:00.000Z",
    archive: { target_branch: "main", branch_sha: "4444444" }
  }));
  assert.equal(lifted.aggregate_status, "archived");
  assert.equal(lifted.spaces[0].archived_at, "2026-06-07T00:03:00.000Z");
  assert.deepEqual(lifted.spaces[0].archive, { target_branch: "main", branch_sha: "4444444" });
});

test("liftV01ToV02 maps discarded v0.1 record onto root space", () => {
  const lifted = liftV01ToV02(v01State("discarded", {
    discarded_at: "2026-06-07T00:04:00.000Z"
  }));
  assert.equal(lifted.aggregate_status, "discarded");
  assert.equal(lifted.spaces[0].discarded_at, "2026-06-07T00:04:00.000Z");
});

test("computeAggregateStatus D5/C2/C8 all discarded wins", () => {
  assert.equal(
    computeAggregateStatus([space("discarded", { space_id: "root" }), space("discarded", { space_id: "plugin" })]),
    "discarded"
  );
});

test("computeAggregateStatus D5/C2/C8 all archived wins", () => {
  assert.equal(
    computeAggregateStatus([space("archived", { space_id: "root" }), space("archived", { space_id: "plugin" })]),
    "archived"
  );
});

test("computeAggregateStatus D5/C2/C8 all merged plus all associations synced becomes merged", () => {
  assert.equal(
    computeAggregateStatus(
      [space("merged", { space_id: "root" }), space("merged", { space_id: "plugin" })],
      [association("synced")]
    ),
    "merged"
  );
});

test("computeAggregateStatus D5/C2/C8 merged with pending association escalates", () => {
  assert.equal(
    computeAggregateStatus(
      [space("merged", { space_id: "root" }), space("merged", { space_id: "plugin" })],
      [association("pending")]
    ),
    "escalated"
  );
});

test("computeAggregateStatus D5/C2/C8 all ready ignores pending associations", () => {
  assert.equal(
    computeAggregateStatus(
      [space("ready", { space_id: "root" }), space("ready", { space_id: "plugin" })],
      [association("pending")]
    ),
    "ready"
  );
});

test("computeAggregateStatus D5/C2/C8 pending plus ready stays pending", () => {
  assert.equal(
    computeAggregateStatus([space("pending", { space_id: "root" }), space("ready", { space_id: "plugin" })]),
    "pending"
  );
});

test("computeAggregateStatus D5/C2/C8 all pending stays pending during expansion", () => {
  assert.equal(
    computeAggregateStatus([space("pending", { space_id: "root" }), space("pending", { space_id: "plugin" })]),
    "pending"
  );
});

test("computeAggregateStatus D5/C2/C8 other mixed states escalate", () => {
  assert.equal(
    computeAggregateStatus([space("merged", { space_id: "root" }), space("ready", { space_id: "plugin" })]),
    "escalated"
  );
});

test("serializeWorktreeStateV02 writes v0.2 JSON and recomputes aggregate", () => {
  const serialized = serializeWorktreeStateV02({
    schema_version: WORKTREE_STATE_SCHEMA_VERSION_V02,
    requirement_id: "cmp-state-test",
    aggregate_status: "escalated",
    spaces: [space("ready", { space_id: "root" })],
    associations: [],
    topology_source: {
      path: "docs/.ccb/config/implementation-topology.yaml",
      schema_version: "implementation-topology-v0.1",
      content_hash: "abc"
    },
    created_at: "2026-06-07T00:00:00.000Z",
    updated_at: "2026-06-07T00:01:00.000Z"
  });
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.schema_version, WORKTREE_STATE_SCHEMA_VERSION_V02);
  assert.equal(parsed.aggregate_status, "ready");
  assert.ok(serialized.endsWith("\n"));
});

test("serializeWorktreeStateV02 keeps aggregate escalated while top-level last_error is present", () => {
  const serialized = serializeWorktreeStateV02({
    schema_version: WORKTREE_STATE_SCHEMA_VERSION_V02,
    requirement_id: "cmp-state-test",
    aggregate_status: "ready",
    spaces: [space("ready", { space_id: "root" })],
    associations: [],
    topology_source: null,
    last_error: {
      op: "merge",
      reason: "merge_incomplete",
      at: "2026-06-07T00:00:00.000Z"
    },
    created_at: "2026-06-07T00:00:00.000Z",
    updated_at: "2026-06-07T00:01:00.000Z"
  });
  assert.equal(JSON.parse(serialized).aggregate_status, "escalated");

  const recovered = serializeWorktreeStateV02({
    schema_version: WORKTREE_STATE_SCHEMA_VERSION_V02,
    requirement_id: "cmp-state-test",
    aggregate_status: "escalated",
    spaces: [space("ready", { space_id: "root" })],
    associations: [],
    topology_source: null,
    last_error: null
  });
  assert.equal(JSON.parse(recovered).aggregate_status, "ready");
});

test("parseWorktreeState lifts v0.1 content in memory", () => {
  const parsed = parseWorktreeState(JSON.stringify(v01State("ready")));
  assert.equal(parsed.schema_version, WORKTREE_STATE_SCHEMA_VERSION_V02);
  assert.equal(parsed.spaces[0].space_id, "root");
});
