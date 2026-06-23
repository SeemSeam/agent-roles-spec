import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { ValidationError } from "../../runtime/index.mjs";
import {
  IMPLEMENTATION_TOPOLOGY_RELATIVE_PATH,
  TOPOLOGY_SCHEMA_VERSION,
  expandTopology,
  loadImplementationTopology,
  parseTopologyYaml,
  topologySourceFor,
  validateTopology,
  zeroImplementationTopology
} from "../topology.mjs";

async function tempProject() {
  const baseDir = await mkdtemp(join(tmpdir(), "ccb-topology-"));
  const projectRoot = join(baseDir, "project");
  await mkdir(projectRoot, { recursive: true });
  return { baseDir, projectRoot };
}

function codeWorkspace(requirementId = "cmp-topology-test") {
  return {
    path: `../SU-CCB-req-${requirementId}`,
    branch: `ccb/req-${requirementId}`
  };
}

function topologyYaml(patch = {}) {
  const rootPath = patch.rootPath ?? "../root-req-<requirementId>";
  const pluginPath = patch.pluginPath ?? "../plugin-req-<requirementId>";
  const pluginRepo = patch.pluginRepo ?? "su-ccb-claude-plugin";
  const associationTo = patch.associationTo ?? "root";
  return `
schema_version: ${patch.schemaVersion ?? TOPOLOGY_SCHEMA_VERSION}
spaces:
  - space_id: root
    kind: git_worktree
    repo: "."
    worktree_path: "${rootPath}"
    branch: "ccb/req-<requirementId>"
  - space_id: plugin
    kind: git_worktree
    repo: "${pluginRepo}"
    worktree_path: "${pluginPath}"
    branch: "ccb/req-<requirementId>"
associations:
  - association_id: plugin-to-root
    kind: git_submodule_gitlink
    from_space: plugin
    to_space: ${associationTo}
    submodule_path: "su-ccb-claude-plugin"
`;
}

async function writeTopology(projectRoot, content) {
  const path = join(projectRoot, IMPLEMENTATION_TOPOLOGY_RELATIVE_PATH);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  return path;
}

test("topology D1 zero declaration derives root space from codeWorkspace", async () => {
  const { baseDir, projectRoot } = await tempProject();
  try {
    const topology = await loadImplementationTopology({ projectRoot });
    const expanded = expandTopology({
      topology,
      requirementId: "cmp-zero",
      codeWorkspace: codeWorkspace("cmp-zero"),
      projectRoot
    });
    assert.equal(expanded.spaces.length, 1);
    assert.equal(expanded.spaces[0].space_id, "root");
    assert.equal(expanded.spaces[0].repo, ".");
    assert.equal(expanded.spaces[0].path, "../SU-CCB-req-cmp-zero");
    assert.equal(expanded.spaces[0].status, "pending");
    assert.deepEqual(expanded.associations, []);
    assert.equal(expanded.contentHash, expandTopology({
      topology: zeroImplementationTopology(),
      requirementId: "cmp-zero",
      codeWorkspace: codeWorkspace("cmp-zero"),
      projectRoot
    }).contentHash);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("topology D1 YAML subset parses comments, quoted scalars, and arrays", async () => {
  const { baseDir, projectRoot } = await tempProject();
  try {
    const parsed = parseTopologyYaml(`
# full-line comment
schema_version: ${TOPOLOGY_SCHEMA_VERSION} # inline comment
spaces:
  - space_id: root
    kind: git_worktree
    repo: "."
    worktree_path: "../root-<requirementId>" # inline comment
    branch: 'ccb/req-<requirementId>'
  - space_id: plugin
    kind: git_worktree
    repo: "su-ccb-claude-plugin"
    worktree_path: "../plugin-<requirementId>"
    branch: "ccb/req-<requirementId>"
labels:
  - alpha
  - "beta"
associations:
  - association_id: plugin-to-root
    kind: git_submodule_gitlink
    from_space: plugin
    to_space: root
    submodule_path: "su-ccb-claude-plugin"
`);
    assert.deepEqual(parsed.labels, ["alpha", "beta"]);
    validateTopology(parsed);
    const expanded = expandTopology({
      topology: parsed,
      requirementId: "cmp-yaml",
      codeWorkspace: codeWorkspace("cmp-yaml"),
      projectRoot
    });
    assert.equal(expanded.spaces[0].path, "../root-cmp-yaml");
    assert.equal(expanded.spaces[1].branch, "ccb/req-cmp-yaml");
    assert.equal(expanded.associations[0].association_id, "plugin-to-root");
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("topology contentHash is stable across repeated loads and source projection", async () => {
  const { baseDir, projectRoot } = await tempProject();
  try {
    await writeTopology(projectRoot, topologyYaml());
    const first = await loadImplementationTopology({ projectRoot });
    const second = await loadImplementationTopology({ projectRoot });
    const firstExpanded = expandTopology({
      topology: first,
      requirementId: "cmp-hash",
      codeWorkspace: codeWorkspace("cmp-hash"),
      projectRoot
    });
    const secondExpanded = expandTopology({
      topology: second,
      requirementId: "cmp-hash",
      codeWorkspace: codeWorkspace("cmp-hash"),
      projectRoot
    });
    assert.equal(firstExpanded.contentHash, secondExpanded.contentHash);
    assert.deepEqual(topologySourceFor(first), {
      path: IMPLEMENTATION_TOPOLOGY_RELATIVE_PATH,
      schema_version: TOPOLOGY_SCHEMA_VERSION,
      content_hash: firstExpanded.contentHash
    });
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("topology validation rejects wrong schema_version", () => {
  const parsed = parseTopologyYaml(topologyYaml({ schemaVersion: "wrong-version" }));
  assert.throws(() => validateTopology(parsed), /schema_version/);
});

test("topology validation rejects duplicate space_id", () => {
  const parsed = parseTopologyYaml(`
schema_version: ${TOPOLOGY_SCHEMA_VERSION}
spaces:
  - space_id: root
    kind: git_worktree
    repo: "."
    worktree_path: "../root-<requirementId>"
    branch: "ccb/req-<requirementId>"
  - space_id: root
    kind: git_worktree
    repo: "su-ccb-claude-plugin"
    worktree_path: "../plugin-<requirementId>"
    branch: "ccb/req-<requirementId>"
`);
  assert.throws(() => validateTopology(parsed), /duplicate topology space_id/);
});

test("topology validation rejects repo paths escaping projectRoot", () => {
  const parsed = parseTopologyYaml(topologyYaml({ pluginRepo: "../outside" }));
  assert.throws(() => validateTopology(parsed), /must not escape projectRoot/);
});

test("topology validation rejects associations pointing at unknown spaces", () => {
  const parsed = parseTopologyYaml(topologyYaml({ associationTo: "missing-root" }));
  assert.throws(() => validateTopology(parsed), /unknown to_space/);
});

test("topology expansion rejects worktree paths inside projectRoot", async () => {
  const { baseDir, projectRoot } = await tempProject();
  try {
    const parsed = parseTopologyYaml(topologyYaml({ rootPath: "inside-<requirementId>" }));
    assert.throws(() => expandTopology({
      topology: parsed,
      requirementId: "cmp-path",
      codeWorkspace: codeWorkspace("cmp-path"),
      projectRoot
    }), /outside projectRoot/);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("topology expansion rejects nested worktree paths", async () => {
  const { baseDir, projectRoot } = await tempProject();
  try {
    const parsed = parseTopologyYaml(topologyYaml({
      rootPath: "../outer-<requirementId>",
      pluginPath: "../outer-<requirementId>/plugin"
    }));
    assert.throws(() => expandTopology({
      topology: parsed,
      requirementId: "cmp-nested",
      codeWorkspace: codeWorkspace("cmp-nested"),
      projectRoot
    }), /nested or duplicated/);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("topology YAML parser rejects flow style with line number", () => {
  assert.throws(
    () => parseTopologyYaml(`schema_version: ${TOPOLOGY_SCHEMA_VERSION}\nspaces: []\n`),
    (error) => error instanceof ValidationError && /line 2/.test(error.message)
  );
});

test("topology YAML parser rejects tab indentation with line number", () => {
  assert.throws(
    () => parseTopologyYaml(`schema_version: ${TOPOLOGY_SCHEMA_VERSION}\n\tspaces:\n`),
    (error) => error instanceof ValidationError && /line 2/.test(error.message)
  );
});

test("topology YAML parser rejects anchors and multiline scalars", () => {
  assert.throws(
    () => parseTopologyYaml(`schema_version: &version ${TOPOLOGY_SCHEMA_VERSION}\n`),
    /line 1/
  );
  assert.throws(
    () => parseTopologyYaml(`schema_version: ${TOPOLOGY_SCHEMA_VERSION}\nnotes: |\n`),
    /line 2/
  );
});
