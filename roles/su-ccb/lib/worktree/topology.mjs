// Implementation topology schema:
// - File path: docs/.ccb/config/implementation-topology.yaml
// - schema_version: implementation-topology-v0.1
// - spaces[]: space_id, kind, repo, worktree_path, branch
// - associations[]: association_id(optional), kind, from_space, to_space, submodule_path
//
// YAML subset supported by this parser:
// - Full-line and inline # comments.
// - Top-level maps and two-space nested maps.
// - "- " arrays containing scalars or maps.
// - Single-quoted, double-quoted, and bare scalars.
// Unsupported constructs raise ValidationError with a line number:
// - Anchors/aliases, flow style "{}" or "[]", multiline "|" or ">", and tab indentation.

import { readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

import { IOError, ValidationError, hashContent } from "../runtime/index.mjs";

export const TOPOLOGY_SCHEMA_VERSION = "implementation-topology-v0.1";
export const IMPLEMENTATION_TOPOLOGY_RELATIVE_PATH = "docs/.ccb/config/implementation-topology.yaml";

const REQUIREMENT_ID_PLACEHOLDER = "<requirementId>";
const ZERO_TOPOLOGY_CONTENT = "implementation-topology-v0.1:zero\n";
const SPACE_KIND_VALUES = new Set(["git_worktree"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validationError(message, line = null, options = {}) {
  const suffix = line === null ? "" : ` (line ${line})`;
  return new ValidationError(`${message}${suffix}`, {
    ...options,
    issues: [
      ...(options.issues ?? []),
      ...(line === null ? [] : [{ line, message }])
    ]
  });
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function requiredObject(value, field) {
  if (!isObject(value)) {
    throw new ValidationError(`${field} must be an object`);
  }
  return value;
}

function countLeadingSpaces(value) {
  return value.length - value.trimStart().length;
}

function inspectOutsideQuotes(value, visitor) {
  let quote = null;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote === "\"") {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") quote = null;
      continue;
    }
    if (quote === "'") {
      if (char === "'") quote = null;
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }
    const result = visitor(char, index);
    if (result !== undefined) return result;
  }
  return undefined;
}

function stripInlineComment(line) {
  const index = inspectOutsideQuotes(line, (char, charIndex) => {
    if (char === "#") return charIndex;
    return undefined;
  });
  return index === undefined ? line : line.slice(0, index);
}

function rejectUnsupportedYamlSyntax(value, line) {
  const flowIndex = inspectOutsideQuotes(value, (char, index) => {
    if (char === "{" || char === "}" || char === "[" || char === "]") return index;
    return undefined;
  });
  if (flowIndex !== undefined) {
    throw validationError("YAML flow style is not supported", line);
  }

  let tokenStart = true;
  const anchorIndex = inspectOutsideQuotes(value, (char, index) => {
    if (/\s|:|,/.test(char)) {
      tokenStart = true;
      return undefined;
    }
    if (tokenStart && (char === "&" || char === "*")) return index;
    tokenStart = false;
    return undefined;
  });
  if (anchorIndex !== undefined) {
    throw validationError("YAML anchors and aliases are not supported", line);
  }
}

function splitKeyValue(text, line) {
  const separator = text.indexOf(":");
  if (separator <= 0) {
    throw validationError("YAML map entry must use key: value", line);
  }
  const key = text.slice(0, separator).trim();
  if (!/^[A-Za-z0-9_.-]+$/.test(key)) {
    throw validationError(`unsupported YAML key: ${key || "<empty>"}`, line);
  }
  return {
    key,
    rawValue: text.slice(separator + 1).trim()
  };
}

function parseQuotedScalar(value, quote, line) {
  if (!value.endsWith(quote) || value.length === 1) {
    throw validationError("quoted YAML scalar is not terminated", line);
  }
  const inner = value.slice(1, -1);
  if (quote === "'") return inner;
  return inner.replace(/\\"/g, "\"").replace(/\\\\/g, "\\");
}

function parseYamlScalar(rawValue, line) {
  const value = rawValue.trim();
  if (value === "|" || value === ">") {
    throw validationError("YAML multiline scalars are not supported", line);
  }
  rejectUnsupportedYamlSyntax(value, line);
  if (value.startsWith("\"")) return parseQuotedScalar(value, "\"", line);
  if (value.startsWith("'")) return parseQuotedScalar(value, "'", line);
  return value;
}

function setMapValue(target, key, rawValue, line) {
  if (Object.hasOwn(target, key)) {
    throw validationError(`duplicate YAML key: ${key}`, line);
  }
  target[key] = rawValue === "" ? null : parseYamlScalar(rawValue, line);
}

function arrayItemStartsMap(itemText) {
  const separator = itemText.indexOf(":");
  if (separator <= 0) return false;
  return /^[A-Za-z0-9_.-]+$/.test(itemText.slice(0, separator).trim());
}

export function parseTopologyYaml(content, options = {}) {
  if (typeof content !== "string") {
    throw new ValidationError("topology YAML content must be a string");
  }

  const root = {};
  let currentTopKey = null;
  let currentArrayItem = null;

  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const rawLine = lines[index];
    if (rawLine.includes("\t")) {
      throw validationError("YAML tab indentation is not supported", lineNumber);
    }

    const line = stripInlineComment(rawLine).trimEnd();
    if (line.trim().length === 0) continue;

    const indent = countLeadingSpaces(line);
    if (indent % 2 !== 0 || indent > 4) {
      throw validationError("YAML indentation must use two-space levels up to array item maps", lineNumber, {
        path: options.sourcePath
      });
    }

    const text = line.trim();
    rejectUnsupportedYamlSyntax(text, lineNumber);

    if (text.startsWith("- ")) {
      if (indent !== 2 || !currentTopKey) {
        throw validationError("YAML array items are only supported under a top-level key", lineNumber);
      }
      if (root[currentTopKey] === null) root[currentTopKey] = [];
      if (!Array.isArray(root[currentTopKey])) {
        throw validationError(`YAML key is not an array: ${currentTopKey}`, lineNumber);
      }
      const itemText = text.slice(2).trim();
      if (!itemText) {
        throw validationError("empty YAML array items are not supported", lineNumber);
      }
      if (arrayItemStartsMap(itemText)) {
        const item = {};
        const { key, rawValue } = splitKeyValue(itemText, lineNumber);
        setMapValue(item, key, rawValue, lineNumber);
        root[currentTopKey].push(item);
        currentArrayItem = item;
      } else {
        root[currentTopKey].push(parseYamlScalar(itemText, lineNumber));
        currentArrayItem = null;
      }
      continue;
    }

    const { key, rawValue } = splitKeyValue(text, lineNumber);
    if (indent === 0) {
      setMapValue(root, key, rawValue, lineNumber);
      currentTopKey = key;
      currentArrayItem = null;
      continue;
    }

    if (indent === 2) {
      if (!currentTopKey) {
        throw validationError("nested YAML map entry has no parent key", lineNumber);
      }
      if (root[currentTopKey] === null) root[currentTopKey] = {};
      if (!isObject(root[currentTopKey])) {
        throw validationError(`YAML parent is not a map: ${currentTopKey}`, lineNumber);
      }
      setMapValue(root[currentTopKey], key, rawValue, lineNumber);
      currentArrayItem = null;
      continue;
    }

    if (!isObject(currentArrayItem)) {
      throw validationError("array item map continuation has no current array item", lineNumber);
    }
    setMapValue(currentArrayItem, key, rawValue, lineNumber);
  }

  return root;
}

function assertRelativeProjectPath(value, field) {
  const pathValue = requiredString(value, field);
  if (isAbsolute(pathValue)) {
    throw new ValidationError(`${field} must be relative to projectRoot`, { path: pathValue });
  }
  if (pathValue.split(/[\\/]+/).includes("..")) {
    throw new ValidationError(`${field} must not escape projectRoot`, { path: pathValue });
  }
  return pathValue;
}

function assertTemplate(value, field) {
  const template = requiredString(value, field);
  if (isAbsolute(template)) {
    throw new ValidationError(`${field} must be relative to projectRoot`, { path: template });
  }
  if (!template.includes(REQUIREMENT_ID_PLACEHOLDER)) {
    throw new ValidationError(`${field} must include ${REQUIREMENT_ID_PLACEHOLDER}`);
  }
  return template;
}

function deriveAssociationId(association) {
  if (association.association_id !== undefined && association.association_id !== null) {
    return requiredString(association.association_id, "associations[].association_id");
  }
  return `${association.kind}:${association.from_space}->${association.to_space}:${association.submodule_path}`;
}

export function validateTopology(topology) {
  requiredObject(topology, "topology");
  if (topology.schema_version !== TOPOLOGY_SCHEMA_VERSION) {
    throw new ValidationError(`topology schema_version must be ${TOPOLOGY_SCHEMA_VERSION}`);
  }

  const spaces = topology.spaces ?? [];
  const associations = topology.associations ?? [];
  if (!Array.isArray(spaces)) {
    throw new ValidationError("topology.spaces must be an array");
  }
  if (!Array.isArray(associations)) {
    throw new ValidationError("topology.associations must be an array");
  }
  if (spaces.length === 0 && !topology.__zeroTopology) {
    throw new ValidationError("topology.spaces must declare at least one space");
  }

  const spaceIds = new Set();
  for (const [index, space] of spaces.entries()) {
    requiredObject(space, `spaces[${index}]`);
    const spaceId = requiredString(space.space_id, `spaces[${index}].space_id`);
    if (spaceIds.has(spaceId)) {
      throw new ValidationError(`duplicate topology space_id: ${spaceId}`);
    }
    spaceIds.add(spaceId);

    const kind = requiredString(space.kind, `spaces[${index}].kind`);
    if (!SPACE_KIND_VALUES.has(kind)) {
      throw new ValidationError(`unsupported topology space kind: ${kind}`);
    }
    assertRelativeProjectPath(space.repo, `spaces[${index}].repo`);
    assertTemplate(space.worktree_path, `spaces[${index}].worktree_path`);
    assertTemplate(space.branch, `spaces[${index}].branch`);
  }

  const associationIds = new Set();
  for (const [index, association] of associations.entries()) {
    requiredObject(association, `associations[${index}]`);
    requiredString(association.kind, `associations[${index}].kind`);
    const fromSpace = requiredString(association.from_space, `associations[${index}].from_space`);
    const toSpace = requiredString(association.to_space, `associations[${index}].to_space`);
    if (!spaceIds.has(fromSpace)) {
      throw new ValidationError(`association references unknown from_space: ${fromSpace}`);
    }
    if (!spaceIds.has(toSpace)) {
      throw new ValidationError(`association references unknown to_space: ${toSpace}`);
    }
    assertRelativeProjectPath(association.submodule_path, `associations[${index}].submodule_path`);
    const associationId = deriveAssociationId(association);
    if (associationIds.has(associationId)) {
      throw new ValidationError(`duplicate topology association_id: ${associationId}`);
    }
    associationIds.add(associationId);
  }

  return topology;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (isObject(value)) {
    const entries = Object.keys(value)
      .filter((key) => !key.startsWith("__"))
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function zeroImplementationTopology(options = {}) {
  return {
    schema_version: TOPOLOGY_SCHEMA_VERSION,
    spaces: [],
    associations: [],
    __zeroTopology: true,
    __sourcePath: options.sourcePath ?? IMPLEMENTATION_TOPOLOGY_RELATIVE_PATH,
    __contentHash: hashContent(ZERO_TOPOLOGY_CONTENT)
  };
}

function attachTopologyMetadata(topology, metadata) {
  return {
    ...topology,
    __sourcePath: metadata.sourcePath,
    __contentHash: metadata.contentHash,
    __exists: metadata.exists
  };
}

export async function loadImplementationTopology(options = {}) {
  if (typeof options === "string") {
    options = { projectRoot: options };
  }
  const projectRoot = requiredString(options.projectRoot, "projectRoot");
  const relativePath = options.relativePath ?? IMPLEMENTATION_TOPOLOGY_RELATIVE_PATH;
  const topologyPath = join(projectRoot, relativePath);
  let content;
  try {
    content = await readFile(topologyPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return zeroImplementationTopology({ sourcePath: relativePath });
    }
    throw new IOError(`failed to read implementation topology: ${topologyPath}`, {
      path: topologyPath,
      cause: error
    });
  }

  const topology = parseTopologyYaml(content, { sourcePath: topologyPath });
  validateTopology(topology);
  return attachTopologyMetadata(topology, {
    sourcePath: relativePath,
    contentHash: hashContent(content),
    exists: true
  });
}

function expandTemplate(value, requirementId) {
  return value.split(REQUIREMENT_ID_PLACEHOLDER).join(requirementId);
}

function normalizeCodeWorkspace(codeWorkspace) {
  requiredObject(codeWorkspace, "codeWorkspace");
  const path = requiredString(codeWorkspace.path, "codeWorkspace.path");
  const branch = requiredString(codeWorkspace.branch, "codeWorkspace.branch");
  if (isAbsolute(path)) {
    throw new ValidationError("codeWorkspace.path must be relative to projectRoot", { path });
  }
  return { path, branch };
}

function pendingSpace(fields) {
  return {
    space_id: fields.space_id,
    kind: fields.kind,
    repo: fields.repo,
    path: fields.path,
    branch: fields.branch,
    target_branch: null,
    base_sha: null,
    status: "pending",
    merged_branch_sha: null,
    target_sha_after_merge: null,
    merged_at: null,
    merge: null,
    archived_at: null,
    archive: null,
    discarded_at: null,
    reopened_at: null,
    last_error: null
  };
}

function defaultExpandedSpaces(codeWorkspace) {
  const workspace = normalizeCodeWorkspace(codeWorkspace);
  return [
    pendingSpace({
      space_id: "root",
      kind: "git_worktree",
      repo: ".",
      path: workspace.path,
      branch: workspace.branch
    })
  ];
}

function topologyContentHash(topology, contentHash = null) {
  return contentHash ?? topology?.contentHash ?? topology?.content_hash ??
    topology?.__contentHash ?? hashContent(stableStringify(topology ?? zeroImplementationTopology()));
}

function pathInsideOrSame(basePath, candidatePath) {
  const rel = relative(resolve(basePath), resolve(candidatePath));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function validateExpandedPaths(spaces, projectRoot) {
  const root = resolve(projectRoot);
  const repoDirs = spaces.map((space) => ({
    space,
    absolutePath: resolve(root, space.repo)
  }));
  const worktreeDirs = spaces.map((space) => ({
    space,
    absolutePath: resolve(root, space.path)
  }));

  for (const { space, absolutePath } of worktreeDirs) {
    if (pathInsideOrSame(root, absolutePath)) {
      throw new ValidationError(`worktree path must be outside projectRoot: ${space.space_id}`, {
        path: space.path
      });
    }
    for (const repo of repoDirs) {
      if (pathInsideOrSame(repo.absolutePath, absolutePath)) {
        throw new ValidationError(`worktree path must not be inside a repo directory: ${space.space_id}`, {
          path: space.path,
          repo: repo.space.repo
        });
      }
    }
  }

  for (let leftIndex = 0; leftIndex < worktreeDirs.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < worktreeDirs.length; rightIndex += 1) {
      const left = worktreeDirs[leftIndex];
      const right = worktreeDirs[rightIndex];
      if (pathInsideOrSame(left.absolutePath, right.absolutePath) ||
          pathInsideOrSame(right.absolutePath, left.absolutePath)) {
        throw new ValidationError(
          `worktree paths must not be nested or duplicated: ${left.space.space_id}, ${right.space.space_id}`,
          { path: `${left.space.path} :: ${right.space.path}` }
        );
      }
    }
  }
}

export function expandTopology(options = {}) {
  const requirementId = requiredString(options.requirementId, "requirementId");
  const projectRoot = requiredString(options.projectRoot ?? process.cwd(), "projectRoot");
  const topology = options.topology ?? zeroImplementationTopology();
  const contentHash = topologyContentHash(topology, options.contentHash ?? null);

  let spaces;
  let associations;
  if (topology.__zeroTopology) {
    spaces = defaultExpandedSpaces(options.codeWorkspace);
    associations = [];
  } else {
    validateTopology(topology);
    spaces = topology.spaces.map((space) => pendingSpace({
      space_id: space.space_id,
      kind: space.kind,
      repo: space.repo,
      path: expandTemplate(space.worktree_path, requirementId),
      branch: expandTemplate(space.branch, requirementId)
    }));
    associations = (topology.associations ?? []).map((association) => ({
      association_id: deriveAssociationId(association),
      kind: association.kind,
      from_space: association.from_space,
      to_space: association.to_space,
      submodule_path: association.submodule_path,
      status: "pending",
      synced_commit_sha: null,
      noop: false,
      synced_at: null,
      last_error: null
    }));
  }

  validateExpandedPaths(spaces, projectRoot);
  return { spaces, associations, contentHash };
}

export function topologySourceFor(topology, contentHash = null) {
  return {
    path: topology?.__sourcePath ?? IMPLEMENTATION_TOPOLOGY_RELATIVE_PATH,
    schema_version: TOPOLOGY_SCHEMA_VERSION,
    content_hash: topologyContentHash(topology, contentHash)
  };
}
