import { execFile } from "node:child_process";
import { access, lstat, readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const GIT_MAX_BUFFER = 10 * 1024 * 1024;

export const DIRTY_OWN = "OWN";
export const DIRTY_TOLERATE = "TOLERATE";
export const DIRTY_FOREIGN = "FOREIGN";

const REQUIREMENT_ASSET_FILE = /^[0-9a-f]{64}\.(png|jpg|jpeg|webp|gif)$/;
const EVERGREEN_DOC_TYPES = new Set(["module_spec", "lessons", "adr"]);

function safeFileSegment(value) {
  const safe = String(value).replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe || "requirement";
}

export function parseFrontmatter(content) {
  const matched = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!matched) return {};
  const frontmatter = {};
  for (const line of matched[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    frontmatter[key] = value;
  }
  return frontmatter;
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function pathIsFile(path) {
  try {
    return (await lstat(path)).isFile();
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return false;
    throw error;
  }
}

async function runGitResult(cwd, args, options = {}) {
  if (typeof options.runGit === "function") {
    return await options.runGit(cwd, args, { ...options, allowFailure: true });
  }
  try {
    const result = await execFileAsync("git", args, {
      cwd,
      encoding: "utf8",
      maxBuffer: GIT_MAX_BUFFER,
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

async function listMarkdownFiles(root) {
  const entries = await readdir(root, { withFileTypes: true }).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  const files = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path);
    }
  }
  return files;
}

export async function markdownPathsMatchingFrontmatter(projectRoot, relativeDirectory, predicate) {
  const root = join(projectRoot, relativeDirectory);
  const files = await listMarkdownFiles(root);
  const matched = [];
  for (const path of files) {
    const frontmatter = parseFrontmatter(await readFile(path, "utf8"));
    if (predicate(frontmatter)) matched.push(relative(projectRoot, path).replace(/\\/g, "/"));
  }
  return matched;
}

async function requirementDocumentExists(projectRoot, requirementId) {
  if (typeof requirementId !== "string" || requirementId.length === 0 || requirementId.startsWith("tmp-")) {
    return false;
  }
  const requirementDocs = await markdownPathsMatchingFrontmatter(
    projectRoot,
    join("docs", "02_需求设计"),
    (frontmatter) => frontmatter.doc_type === "requirement" && frontmatter.id === requirementId
  );
  return requirementDocs.length > 0;
}

export async function requirementAssetPaths(projectRoot, requirementId) {
  if (!await requirementDocumentExists(projectRoot, requirementId)) return [];
  const root = join(projectRoot, "docs", ".ccb", "assets", "requirements", requirementId);
  const entries = await readdir(root, { withFileTypes: true }).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  return entries
    .filter((entry) => entry.isFile() && REQUIREMENT_ASSET_FILE.test(entry.name))
    .map((entry) => `docs/.ccb/assets/requirements/${requirementId}/${entry.name}`)
    .sort();
}

export async function canonicalSyncAllowlist(projectRoot, requirementId) {
  const requirementDocs = await markdownPathsMatchingFrontmatter(
    projectRoot,
    join("docs", "02_需求设计"),
    (frontmatter) => frontmatter.id === requirementId || frontmatter.requirement_id === requirementId
  );
  const technicalDesignDocs = await markdownPathsMatchingFrontmatter(
    projectRoot,
    join("docs", "03_开发计划"),
    (frontmatter) => frontmatter.doc_type === "technical_design" && frontmatter.requirement_id === requirementId
  );
  const devTaskDocs = await markdownPathsMatchingFrontmatter(
    projectRoot,
    join("docs", "03_开发计划"),
    (frontmatter) => frontmatter.doc_type === "dev_task" && frontmatter.requirement_id === requirementId
  );
  const assets = await requirementAssetPaths(projectRoot, requirementId);
  return new Set([
    ...requirementDocs,
    ...technicalDesignDocs,
    ...devTaskDocs,
    ...assets,
    "docs/00_文档地图.md",
    "docs/.ccb/events/journal.jsonl",
    `docs/.ccb/worktrees/${safeFileSegment(requirementId)}.json`,
    `docs/.ccb/drafts/breakdown/${safeFileSegment(requirementId)}.json`
  ]);
}

function unquoteStatusPath(path) {
  const trimmed = path.trim();
  if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function statusPathsFromLine(line) {
  const raw = line.slice(3).trim();
  if (!raw) return [];
  if (raw.includes(" -> ")) {
    return raw.split(" -> ").map(unquoteStatusPath).filter(Boolean);
  }
  return [unquoteStatusPath(raw)];
}

export function parseStatusEntries(output) {
  return output
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => ({
      raw: line,
      paths: statusPathsFromLine(line).map((path) => path.replace(/\\/g, "/"))
    }));
}

export async function pathExistsOrTracked(projectRoot, relativePath, options = {}) {
  if (await pathExists(join(projectRoot, relativePath))) return true;
  return await pathTracked(projectRoot, relativePath, options);
}

async function pathTracked(projectRoot, relativePath, options = {}) {
  const tracked = await runGitResult(
    projectRoot,
    ["ls-files", "--error-unmatch", "--", relativePath],
    options
  );
  return tracked.exitCode === 0;
}

async function pathTrackedInHead(projectRoot, relativePath, options = {}) {
  const tracked = await runGitResult(
    projectRoot,
    ["cat-file", "-e", `HEAD:${relativePath}`],
    options
  );
  return tracked.exitCode === 0;
}

async function frontmatterForPath(projectRoot, relativePath) {
  try {
    return parseFrontmatter(await readFile(join(projectRoot, relativePath), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return null;
    throw error;
  }
}

function isMarkdownUnder(relativePath, directory) {
  return relativePath.startsWith(`${directory}/`) && relativePath.endsWith(".md");
}

function isCoordinationPath(relativePath) {
  return /^docs\/\.ccb\/worktrees\/[^/]+\.json$/.test(relativePath) ||
    /^docs\/\.ccb\/drafts\/breakdown\/[^/]+\.json$/.test(relativePath);
}

function isRequirementAssetPath(relativePath) {
  return /^docs\/\.ccb\/assets\/requirements\/[^/]+\/[^/]+$/.test(relativePath);
}

function requirementAssetParts(relativePath) {
  const matched = relativePath.match(/^docs\/\.ccb\/assets\/requirements\/([^/]+)\/([^/]+)$/);
  if (!matched) return null;
  return {
    requirementId: matched[1],
    fileName: matched[2]
  };
}

async function classifyRequirementAssetPath(projectRoot, relativePath, currentRequirementId) {
  const parts = requirementAssetParts(relativePath);
  if (!parts) return null;
  if (parts.requirementId.startsWith("tmp-")) return DIRTY_FOREIGN;
  if (!REQUIREMENT_ASSET_FILE.test(parts.fileName)) return DIRTY_FOREIGN;
  if (!await pathIsFile(join(projectRoot, relativePath))) return DIRTY_FOREIGN;
  if (!await requirementDocumentExists(projectRoot, parts.requirementId)) return DIRTY_FOREIGN;
  return parts.requirementId === currentRequirementId ? DIRTY_OWN : DIRTY_TOLERATE;
}

function isTrackedMachinePath(relativePath) {
  return /^docs\/\.ccb\/state\/[^/]+\.md$/.test(relativePath) ||
    relativePath.startsWith("docs/.ccb/config/") ||
    relativePath.startsWith("docs/.ccb/schemas/") ||
    relativePath === "docs/.ccb/docs-structure-contract.yaml";
}

async function classifyTrackedMachinePath(projectRoot, relativePath, options) {
  if (!await pathIsFile(join(projectRoot, relativePath))) return DIRTY_FOREIGN;
  return await pathTrackedInHead(projectRoot, relativePath, options)
    ? DIRTY_TOLERATE
    : DIRTY_FOREIGN;
}

async function classifyTrackedMarkdownPath(projectRoot, relativePath, predicate, options) {
  if (!await pathTrackedInHead(projectRoot, relativePath, options)) return DIRTY_FOREIGN;
  const frontmatter = await frontmatterForPath(projectRoot, relativePath);
  return predicate(frontmatter ?? {}) ? DIRTY_TOLERATE : DIRTY_FOREIGN;
}

async function classifyEvergreenPath(projectRoot, relativePath, options) {
  if (relativePath === "docs/00_项目总览.md") {
    return await classifyTrackedMarkdownPath(
      projectRoot,
      relativePath,
      (frontmatter) => frontmatter.doc_type === "project_overview",
      options
    );
  }

  if (isMarkdownUnder(relativePath, "docs/01_架构设计")) {
    return await classifyTrackedMarkdownPath(
      projectRoot,
      relativePath,
      (frontmatter) => frontmatter.doc_type === "architecture",
      options
    );
  }

  if (isMarkdownUnder(relativePath, "docs/99_归档")) {
    return await classifyTrackedMarkdownPath(
      projectRoot,
      relativePath,
      (frontmatter) => Boolean(frontmatter.doc_type),
      options
    );
  }

  for (const directory of ["docs/04_模块规格", "docs/05_经验沉淀", "docs/06_决策记录"]) {
    if (!isMarkdownUnder(relativePath, directory)) continue;
    return await classifyTrackedMarkdownPath(
      projectRoot,
      relativePath,
      (frontmatter) => EVERGREEN_DOC_TYPES.has(frontmatter.doc_type),
      options
    );
  }

  return null;
}

export async function classifyDirtyPath(projectRoot, relativePath, allowlist = new Set(), options = {}) {
  if (allowlist.has(relativePath)) return DIRTY_OWN;
  if (isCoordinationPath(relativePath)) return DIRTY_TOLERATE;

  if (isRequirementAssetPath(relativePath)) {
    return await classifyRequirementAssetPath(projectRoot, relativePath, options.requirementId);
  }

  if (isTrackedMachinePath(relativePath)) {
    return await classifyTrackedMachinePath(projectRoot, relativePath, options);
  }

  if (isMarkdownUnder(relativePath, "docs/02_需求设计")) {
    const frontmatter = await frontmatterForPath(projectRoot, relativePath);
    return frontmatter?.doc_type === "requirement" && Boolean(frontmatter.id)
      ? DIRTY_TOLERATE
      : DIRTY_FOREIGN;
  }

  if (isMarkdownUnder(relativePath, "docs/03_开发计划")) {
    const frontmatter = await frontmatterForPath(projectRoot, relativePath);
    return ["technical_design", "dev_task"].includes(frontmatter?.doc_type) && Boolean(frontmatter.requirement_id)
      ? DIRTY_TOLERATE
      : DIRTY_FOREIGN;
  }

  const evergreenClassification = await classifyEvergreenPath(projectRoot, relativePath, options);
  if (evergreenClassification) return evergreenClassification;

  return DIRTY_FOREIGN;
}

export async function classifyDirtyEntry(projectRoot, entry, allowlist = new Set(), options = {}) {
  const toleratedPaths = [];
  let hasTolerated = false;

  for (const path of entry.paths) {
    const classification = await classifyDirtyPath(projectRoot, path, allowlist, options);
    if (classification === DIRTY_FOREIGN) {
      return { classification: DIRTY_FOREIGN, toleratedPaths: [] };
    }
    if (classification === DIRTY_TOLERATE) {
      hasTolerated = true;
      toleratedPaths.push(path);
    }
  }

  return {
    classification: hasTolerated ? DIRTY_TOLERATE : DIRTY_OWN,
    toleratedPaths
  };
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

export async function classifyDirtyEntries(projectRoot, entries, allowlist = new Set(), options = {}) {
  const foreign = [];
  const toleratedPaths = [];
  for (const entry of entries) {
    const classification = await classifyDirtyEntry(projectRoot, entry, allowlist, options);
    if (classification.classification === DIRTY_FOREIGN) {
      foreign.push(entry);
      continue;
    }
    toleratedPaths.push(...classification.toleratedPaths);
  }
  return {
    foreign,
    toleratedPaths: sortedUnique(toleratedPaths)
  };
}

export function runtimeDirtyAllowlist(requirementId) {
  return new Set([
    `docs/.ccb/worktrees/${safeFileSegment(requirementId)}.json`,
    "docs/.ccb/events/journal.jsonl"
  ]);
}

function pathMatchesPathspec(path, pathspec) {
  return path === pathspec || path.startsWith(`${pathspec}/`);
}

export function pathMatchesAnyPathspec(path, pathspecs) {
  return pathspecs.some((pathspec) => pathMatchesPathspec(path, pathspec));
}

export async function statusEntryAllowedForAssociation(projectRoot, entry, pathspecs, allowlist, options = {}) {
  const pathsToClassify = entry.paths.filter((path) => !pathMatchesAnyPathspec(path, pathspecs));
  if (pathsToClassify.length === 0) return true;
  const classification = await classifyDirtyEntry(
    projectRoot,
    { ...entry, paths: pathsToClassify },
    allowlist,
    options
  );
  return classification.classification !== DIRTY_FOREIGN;
}
