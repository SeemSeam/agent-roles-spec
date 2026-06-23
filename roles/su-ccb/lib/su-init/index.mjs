import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_CONTRACT_PATH,
  DEFAULT_SCHEMA_PATH,
  loadDocsStructureResolver
} from "../docs-structure/index.mjs";

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const templatesRoot = join(pluginRoot, "templates");
const docsTemplatesRoot = join(templatesRoot, "docs");
const ARCHITECTURE_CAP_LIMIT = 8;
const MAX_MARKER_SCAN_DEPTH = 3;
const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "vendor",
  ".venv",
  "target",
  ".next",
  "coverage",
  "tmp",
  ".tmp",
  "examples",
  "fixtures",
  "testdata",
  "docs",
  ".ccb",
  ".claude"
]);
const MARKER_FILES = new Set([
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "composer.json",
  "Gemfile"
]);
const ENTRY_FILES = [
  "app.py",
  "main.go",
  "main.py",
  "manage.py",
  "src/index.js",
  "src/index.mjs",
  "src/index.ts",
  "src/main.rs"
];

function normalizePath(value) {
  return value.replace(/\\/g, "/");
}

function normalizeRelativePath(value) {
  const normalized = normalizePath(String(value ?? ""))
    .replace(/^\.\/+/, "")
    .replace(/\/+$/g, "");
  return normalized === "" ? "." : normalized;
}

function rel(projectRoot, absolutePath) {
  return normalizePath(relative(projectRoot, absolutePath));
}

function slugFor(value, fallback = "project") {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;
}

function shortHash(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 6);
}

async function safeReadDir(path) {
  try {
    return (await readdir(path, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

function isTemplateMarkdownFile(fileName) {
  return fileName.startsWith("_模板_");
}

function splitInlineList(value) {
  const body = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!body.trim()) return [];
  const items = [];
  let quote = null;
  let cursor = "";
  for (const char of body) {
    if ((char === "\"" || char === "'") && cursor[cursor.length - 1] !== "\\") {
      quote = quote === char ? null : quote ?? char;
      cursor += char;
      continue;
    }
    if (char === "," && !quote) {
      items.push(cursor.trim());
      cursor = "";
      continue;
    }
    cursor += char;
  }
  if (cursor.trim()) items.push(cursor.trim());
  return items.map(stripQuotes).filter(Boolean);
}

function stripQuotes(value) {
  const trimmed = String(value ?? "").trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function stripLineComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === "\"" || char === "'") && line[index - 1] !== "\\") {
      quote = quote === char ? null : quote ?? char;
      continue;
    }
    if (char === "#" && !quote) {
      return line.slice(0, index);
    }
  }
  return line;
}

function parseFrontmatter(text) {
  const lines = String(text).split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return {};
  const frontmatter = {};
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === "---") break;
    const match = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = stripLineComment(rawValue).trim();
    frontmatter[key] = value.startsWith("[") && value.endsWith("]") ? splitInlineList(value) : stripQuotes(value);
  }
  return frontmatter;
}

async function collectExistingArchitectureDocs(projectRoot, architectureDirectory) {
  const root = join(projectRoot, architectureDirectory);
  const matches = [];

  async function visit(directory) {
    for (const entry of await safeReadDir(directory)) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md") && !isTemplateMarkdownFile(entry.name)) {
        matches.push({
          path: rel(projectRoot, entryPath),
          frontmatter: parseFrontmatter(await readFile(entryPath, "utf8"))
        });
      }
    }
  }

  await visit(root);
  return matches.sort((left, right) => left.path.localeCompare(right.path));
}

async function fileExists(path) {
  try {
    const value = await stat(path);
    return value.isFile();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function dirExists(path) {
  try {
    const value = await stat(path);
    return value.isDirectory();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function readTextIfExists(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function addWarning(options, message) {
  if (Array.isArray(options.warnings)) {
    options.warnings.push(message);
  }
}

function cleanWorkspacePattern(pattern) {
  return normalizeRelativePath(stripQuotes(pattern).replace(/^\.\//, ""));
}

function isMarkerFile(fileName) {
  return MARKER_FILES.has(fileName) || fileName.endsWith(".csproj");
}

async function directoryContainsMarker(projectRoot, relativePath) {
  const entries = await safeReadDir(join(projectRoot, relativePath === "." ? "" : relativePath));
  return entries.some((entry) => entry.isFile() && isMarkerFile(entry.name));
}

async function expandWorkspacePattern(projectRoot, rawPattern, source, options) {
  const pattern = cleanWorkspacePattern(rawPattern);
  if (pattern.startsWith("!")) {
    addWarning(options, `ignored unsupported workspace negation pattern in ${source}: ${pattern}`);
    return [];
  }
  if (pattern.includes("*") && !pattern.endsWith("/*")) {
    addWarning(options, `ignored unsupported workspace glob in ${source}: ${pattern}`);
    return [];
  }
  if (pattern.endsWith("/*")) {
    const base = normalizeRelativePath(pattern.slice(0, -2));
    const basePath = join(projectRoot, base === "." ? "" : base);
    const members = [];
    for (const entry of await safeReadDir(basePath)) {
      if (!entry.isDirectory()) continue;
      const member = normalizeRelativePath(base === "." ? entry.name : `${base}/${entry.name}`);
      if (await directoryContainsMarker(projectRoot, member)) {
        members.push(member);
      }
    }
    return members.sort();
  }
  if ((await dirExists(join(projectRoot, pattern === "." ? "" : pattern))) && await directoryContainsMarker(projectRoot, pattern)) {
    return [pattern];
  }
  return [];
}

async function packageWorkspaceMembers(projectRoot, options) {
  const content = await readTextIfExists(join(projectRoot, "package.json"));
  if (!content) return { declared: false, members: [] };
  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { declared: false, members: [] };
  }
  if (!parsed || typeof parsed !== "object" || !Object.hasOwn(parsed, "workspaces")) {
    return { declared: false, members: [] };
  }
  const patterns = Array.isArray(parsed.workspaces)
    ? parsed.workspaces
    : Array.isArray(parsed.workspaces?.packages)
      ? parsed.workspaces.packages
      : [];
  const members = [];
  for (const pattern of patterns) {
    if (typeof pattern !== "string") continue;
    members.push(...(await expandWorkspacePattern(projectRoot, pattern, "package.json", options)));
  }
  return { declared: true, members };
}

async function pnpmWorkspaceMembers(projectRoot, options) {
  const content = await readTextIfExists(join(projectRoot, "pnpm-workspace.yaml"));
  if (!content) return { declared: false, members: [] };
  const members = [];
  let inPackages = false;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = stripLineComment(rawLine);
    if (/^\s*packages\s*:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages && /^\S/.test(line) && !/^\s*-/.test(line)) {
      inPackages = false;
    }
    if (!inPackages) continue;
    const match = line.match(/^\s*-\s*(.+?)\s*$/);
    if (!match) continue;
    members.push(...(await expandWorkspacePattern(projectRoot, match[1], "pnpm-workspace.yaml", options)));
  }
  return { declared: true, members };
}

function workspaceSectionLines(content) {
  const lines = [];
  let inWorkspace = false;
  for (const line of content.split(/\r?\n/)) {
    if (/^\s*\[[^\]]+\]\s*$/.test(line)) {
      if (inWorkspace) break;
      inWorkspace = /^\s*\[workspace\]\s*$/.test(line);
      continue;
    }
    if (inWorkspace) lines.push(line);
  }
  return inWorkspace ? lines : null;
}

async function cargoWorkspaceMembers(projectRoot, options) {
  const content = await readTextIfExists(join(projectRoot, "Cargo.toml"));
  if (!content) return { declared: false, members: [] };
  const lines = workspaceSectionLines(content);
  if (!lines) return { declared: false, members: [] };
  const body = lines.join("\n");
  const match = body.match(/members\s*=\s*\[([\s\S]*?)\]/m);
  const patterns = [];
  if (match) {
    for (const item of match[1].matchAll(/["']([^"']+)["']/g)) {
      patterns.push(item[1]);
    }
  }
  const members = [];
  for (const pattern of patterns) {
    members.push(...(await expandWorkspacePattern(projectRoot, pattern, "Cargo.toml", options)));
  }
  return { declared: true, members };
}

async function goWorkMembers(projectRoot, options) {
  const content = await readTextIfExists(join(projectRoot, "go.work"));
  if (!content) return { declared: false, members: [] };
  const patterns = [];
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = stripLineComment(lines[index]).trim();
    if (line === "use (") {
      index += 1;
      while (index < lines.length && stripLineComment(lines[index]).trim() !== ")") {
        const value = stripLineComment(lines[index]).trim();
        if (value) patterns.push(value);
        index += 1;
      }
      continue;
    }
    const single = line.match(/^use\s+(.+)$/);
    if (single) patterns.push(single[1]);
  }
  const members = [];
  for (const pattern of patterns) {
    members.push(...(await expandWorkspacePattern(projectRoot, pattern, "go.work", options)));
  }
  return { declared: true, members };
}

async function collectWorkspaceMembers(projectRoot, options) {
  const sources = await Promise.all([
    packageWorkspaceMembers(projectRoot, options),
    pnpmWorkspaceMembers(projectRoot, options),
    cargoWorkspaceMembers(projectRoot, options),
    goWorkMembers(projectRoot, options)
  ]);
  return {
    declared: sources.some((source) => source.declared),
    members: [...new Set(sources.flatMap((source) => source.members).map(normalizeRelativePath))].sort()
  };
}

function isWithinOrEqualPath(path, ancestor) {
  const candidate = normalizeRelativePath(path);
  const parent = normalizeRelativePath(ancestor);
  if (parent === ".") return true;
  return candidate === parent || candidate.startsWith(`${parent}/`);
}

function isStrictDescendant(path, ancestor) {
  const candidate = normalizeRelativePath(path);
  const parent = normalizeRelativePath(ancestor);
  if (candidate === parent) return false;
  if (parent === ".") return true;
  return candidate.startsWith(`${parent}/`);
}

function isFrameworkShellPath(path) {
  return path === "src-tauri" || path === "android" || path === "ios";
}

async function parseGitmodulesPaths(projectRoot) {
  const content = await readTextIfExists(join(projectRoot, ".gitmodules"));
  if (!content) return [];
  const paths = [];
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*path\s*=\s*(.+?)\s*$/);
    if (match) paths.push(normalizeRelativePath(match[1]));
  }
  return [...new Set(paths)].sort();
}

async function scanMarkerDirs(projectRoot, submodulePaths) {
  const markerDirs = new Set();

  async function visit(directory, depth) {
    const relativePath = normalizeRelativePath(rel(projectRoot, directory));
    if (relativePath !== "." && submodulePaths.some((path) => isWithinOrEqualPath(relativePath, path))) {
      return;
    }
    const entries = await safeReadDir(directory);
    let hasMarker = false;

    for (const entry of entries) {
      if (entry.isFile() && isMarkerFile(entry.name)) {
        hasMarker = true;
      }
    }

    if (hasMarker) {
      markerDirs.add(relativePath);
    }

    if (depth >= MAX_MARKER_SCAN_DEPTH) {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || IGNORE_DIRS.has(entry.name)) {
        continue;
      }
      await visit(join(directory, entry.name), depth + 1);
    }
  }

  await visit(projectRoot, 0);
  return [...markerDirs].sort();
}

async function packageJsonAt(projectRoot, relativePath) {
  const text = await readTextIfExists(join(projectRoot, relativePath === "." ? "" : relativePath, "package.json"));
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function packageHasDependency(packageJson, names) {
  if (!packageJson || typeof packageJson !== "object") return false;
  const sections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
  for (const section of sections) {
    const values = packageJson[section];
    if (!values || typeof values !== "object") continue;
    for (const name of names) {
      if (Object.hasOwn(values, name)) return true;
    }
  }
  return false;
}

async function hasTauriHostEvidence(projectRoot) {
  if (await fileExists(join(projectRoot, "tauri.conf.json"))) return true;
  return packageHasDependency(await packageJsonAt(projectRoot, "."), ["@tauri-apps/api", "@tauri-apps/cli"]);
}

async function hasMobileHostEvidence(projectRoot) {
  return packageHasDependency(await packageJsonAt(projectRoot, "."), [
    "@capacitor/core",
    "capacitor",
    "expo",
    "react-native"
  ]);
}

async function hasRootAggregatorRuntimeEvidence(projectRoot) {
  if (await fileExists(join(projectRoot, "Dockerfile"))) return true;
  for (const entry of ENTRY_FILES) {
    if (await fileExists(join(projectRoot, entry))) return true;
  }
  return false;
}

function createInternalCandidate(path, kind = "source_root") {
  const normalizedPath = normalizeRelativePath(path);
  return {
    path: normalizedPath,
    kind,
    explicitWorkspaceMember: false,
    scopeSourceRoots: new Set([normalizedPath])
  };
}

function addSourceCandidate(candidates, path, { explicitWorkspaceMember = false } = {}) {
  const normalizedPath = normalizeRelativePath(path);
  const candidate = candidates.get(normalizedPath) ?? createInternalCandidate(normalizedPath);
  candidate.explicitWorkspaceMember = candidate.explicitWorkspaceMember || explicitWorkspaceMember;
  candidates.set(normalizedPath, candidate);
}

async function applyFrameworkShellMerges(projectRoot, candidates, excluded) {
  const host = candidates.get(".");
  if (!host) return;

  if ((await fileExists(join(projectRoot, "src-tauri", "Cargo.toml"))) && await hasTauriHostEvidence(projectRoot)) {
    candidates.delete("src-tauri");
    host.scopeSourceRoots.add("src-tauri");
    excluded.push({ path: "src-tauri", reason: "framework_shell_merged" });
  }

  if ((await fileExists(join(projectRoot, "android", "build.gradle"))) && await hasMobileHostEvidence(projectRoot)) {
    candidates.delete("android");
    host.scopeSourceRoots.add("android");
    excluded.push({ path: "android", reason: "framework_shell_merged" });
  }

  if ((await dirExists(join(projectRoot, "ios"))) && await hasMobileHostEvidence(projectRoot)) {
    candidates.delete("ios");
    host.scopeSourceRoots.add("ios");
    excluded.push({ path: "ios", reason: "framework_shell_merged" });
  }
}

async function collectMarkerEvidence(projectRoot, candidatePath) {
  const entries = await safeReadDir(join(projectRoot, candidatePath === "." ? "" : candidatePath));
  return entries
    .filter((entry) => entry.isFile() && isMarkerFile(entry.name))
    .map((entry) => `marker:${entry.name}`);
}

async function collectPackageEvidence(projectRoot, candidatePath) {
  const evidence = [];
  const packageJson = await packageJsonAt(projectRoot, candidatePath);
  if (!packageJson || typeof packageJson !== "object") return evidence;
  for (const scriptName of ["dev", "serve", "start"]) {
    if (typeof packageJson.scripts?.[scriptName] === "string") {
      evidence.push(`run_script:${scriptName}`);
    }
  }
  if (typeof packageJson.main === "string" && packageJson.main.trim()) {
    evidence.push(`entry:${normalizeRelativePath(candidatePath === "." ? packageJson.main : `${candidatePath}/${packageJson.main}`)}`);
  }
  if (typeof packageJson.bin === "string" && packageJson.bin.trim()) {
    evidence.push(`entry:${normalizeRelativePath(candidatePath === "." ? packageJson.bin : `${candidatePath}/${packageJson.bin}`)}`);
  } else if (packageJson.bin && typeof packageJson.bin === "object") {
    for (const value of Object.values(packageJson.bin).sort()) {
      if (typeof value === "string" && value.trim()) {
        evidence.push(`entry:${normalizeRelativePath(candidatePath === "." ? value : `${candidatePath}/${value}`)}`);
      }
    }
  }
  return evidence;
}

async function collectPyprojectEvidence(projectRoot, candidatePath) {
  const evidence = [];
  const content = await readTextIfExists(join(projectRoot, candidatePath === "." ? "" : candidatePath, "pyproject.toml"));
  if (!content) return evidence;
  let inScripts = false;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = stripLineComment(rawLine).trim();
    if (/^\[[^\]]+\]$/.test(line)) {
      inScripts = line === "[project.scripts]";
      continue;
    }
    if (!inScripts) continue;
    const match = line.match(/^([A-Za-z0-9_.-]+)\s*=/);
    if (match) evidence.push(`run_script:${match[1]}`);
  }
  return evidence;
}

async function collectDeployEvidence(projectRoot, candidatePath) {
  const evidence = [];
  const basePath = join(projectRoot, candidatePath === "." ? "" : candidatePath);
  const dockerfile = normalizeRelativePath(candidatePath === "." ? "Dockerfile" : `${candidatePath}/Dockerfile`);
  if (await fileExists(join(basePath, "Dockerfile"))) evidence.push(`deploy:${dockerfile}`);
  const composePath = join(basePath, "docker-compose.yml");
  const composeContent = await readTextIfExists(composePath);
  if (composeContent && /^\s*services\s*:/m.test(composeContent)) {
    evidence.push(`deploy:${normalizeRelativePath(candidatePath === "." ? "docker-compose.yml" : `${candidatePath}/docker-compose.yml`)}`);
  }
  return evidence;
}

async function collectEntryFileEvidence(projectRoot, candidatePath) {
  const evidence = [];
  for (const entry of ENTRY_FILES) {
    if (await fileExists(join(projectRoot, candidatePath === "." ? "" : candidatePath, entry))) {
      evidence.push(`entry:${normalizeRelativePath(candidatePath === "." ? entry : `${candidatePath}/${entry}`)}`);
    }
  }
  return evidence;
}

async function collectEvidence(projectRoot, candidate) {
  if (candidate.kind === "submodule") {
    return {
      confidence: "medium",
      disposition: "list_only",
      evidence: ["git_submodule"]
    };
  }

  const evidence = [
    ...(await collectEntryFileEvidence(projectRoot, candidate.path)),
    ...(await collectDeployEvidence(projectRoot, candidate.path)),
    ...(await collectMarkerEvidence(projectRoot, candidate.path)),
    ...(await collectPackageEvidence(projectRoot, candidate.path)),
    ...(await collectPyprojectEvidence(projectRoot, candidate.path))
  ];
  if (candidate.explicitWorkspaceMember) evidence.push("workspace_member");

  const uniqueEvidence = [...new Set(evidence)].sort();
  const hasHardEvidence = uniqueEvidence.some((item) =>
    item.startsWith("entry:") || item.startsWith("run_script:") || item.startsWith("deploy:")
  );
  return {
    confidence: hasHardEvidence ? "high" : "medium",
    disposition: hasHardEvidence ? "generate" : "list_only",
    evidence: uniqueEvidence
  };
}

function assignCandidateIds(candidates) {
  const groups = new Map();
  for (const candidate of candidates) {
    const baseId = candidate.path === "." ? "root" : slugFor(candidate.path, "source");
    const group = groups.get(baseId) ?? [];
    group.push(candidate);
    groups.set(baseId, group);
  }
  for (const [baseId, group] of groups) {
    if (group.length === 1) {
      group[0].id = baseId;
      continue;
    }
    for (const candidate of group) {
      candidate.id = `${baseId}-${shortHash(candidate.path)}`;
    }
  }
}

function scopedSourceRoots(frontmatter) {
  const value = frontmatter.scope_source_roots;
  if (!Array.isArray(value)) return [];
  return value.map(normalizeRelativePath).sort();
}

function matchExistingDocs(candidate, scopedDocs) {
  const roots = [...candidate.scopeSourceRoots].map(normalizeRelativePath);
  return scopedDocs.filter((doc) => {
    const docRoots = scopedSourceRoots(doc.frontmatter);
    return docRoots.some((root) => roots.includes(root));
  });
}

function architectureResult({
  mode,
  reason = null,
  candidates = [],
  overviewTargetPath,
  overviewExisting = false,
  excluded = [],
  scopeConflicts = [],
  existingArchitectureDocs = []
}) {
  return {
    mode,
    reason,
    candidates,
    overviewTargetPath,
    overviewExisting,
    excluded: excluded.sort((left, right) => `${left.path}:${left.reason}`.localeCompare(`${right.path}:${right.reason}`)),
    scopeConflicts,
    existingArchitectureDocs: existingArchitectureDocs.map((doc) => doc.path).sort(),
    capLimit: ARCHITECTURE_CAP_LIMIT
  };
}

function candidateTargetPath(architectureDirectory, candidate, usedTargets, existingPaths, scopeConflicts) {
  let targetPath = normalizePath(join(architectureDirectory, `${candidate.id}-架构.md`));
  if (!usedTargets.has(targetPath) && !existingPaths.has(targetPath)) {
    usedTargets.add(targetPath);
    return targetPath;
  }
  const baseId = `${candidate.id}-${shortHash(candidate.path)}`;
  targetPath = normalizePath(join(architectureDirectory, `${baseId}-架构.md`));
  usedTargets.add(targetPath);
  scopeConflicts.push({ path: candidate.path, reason: "target_path_conflict", targetPath });
  return targetPath;
}

export async function detectArchitectureCandidates(options = {}) {
  const projectRoot = options.projectRoot ?? process.cwd();
  const resolver = options.resolver ?? (await loadDocsStructureResolver(options));
  const architecture = resolver.resolveDocType("architecture");
  const existingArchitectureDocs = await collectExistingArchitectureDocs(projectRoot, architecture.directory);
  const projectSlug = slugFor(basename(projectRoot), "project");
  const overviewTargetPath = normalizePath(join(architecture.directory, `${projectSlug}-总架构.md`));

  if (existingArchitectureDocs.some((doc) => !doc.frontmatter.architecture_scope)) {
    return architectureResult({
      mode: "skip",
      reason: "architecture_exists",
      overviewTargetPath,
      existingArchitectureDocs
    });
  }

  const overviewExisting = existingArchitectureDocs.some((doc) => doc.frontmatter.architecture_scope === "overview");
  const scopedDocs = existingArchitectureDocs.filter((doc) => doc.frontmatter.architecture_scope !== "overview");
  const excluded = [];
  const scopeConflicts = [];
  const submodulePaths = await parseGitmodulesPaths(projectRoot);
  const workspace = await collectWorkspaceMembers(projectRoot, options);
  const markerDirs = await scanMarkerDirs(projectRoot, submodulePaths);
  const sourceCandidates = new Map();

  for (const member of workspace.members) {
    addSourceCandidate(sourceCandidates, member, { explicitWorkspaceMember: true });
  }
  for (const markerDir of markerDirs) {
    addSourceCandidate(sourceCandidates, markerDir);
  }

  if (workspace.declared && sourceCandidates.has(".") && !(await hasRootAggregatorRuntimeEvidence(projectRoot))) {
    sourceCandidates.delete(".");
    excluded.push({ path: ".", reason: "root_aggregator" });
  } else if (workspace.declared && await hasRootAggregatorRuntimeEvidence(projectRoot)) {
    addSourceCandidate(sourceCandidates, ".");
  }

  for (const candidate of [...sourceCandidates.values()].sort((left, right) => left.path.localeCompare(right.path))) {
    if (candidate.explicitWorkspaceMember || isFrameworkShellPath(candidate.path)) continue;
    const ancestor = [...sourceCandidates.keys()]
      .filter((path) => path !== candidate.path && isStrictDescendant(candidate.path, path))
      .sort()[0];
    if (ancestor) {
      sourceCandidates.delete(candidate.path);
      excluded.push({ path: candidate.path, reason: "nested_absorbed" });
    }
  }

  await applyFrameworkShellMerges(projectRoot, sourceCandidates, excluded);

  const internalCandidates = [
    ...submodulePaths.map((path) => createInternalCandidate(path, "submodule")),
    ...sourceCandidates.values()
  ].sort((left, right) => left.path.localeCompare(right.path) || left.kind.localeCompare(right.kind));

  assignCandidateIds(internalCandidates);

  const existingPaths = new Set(existingArchitectureDocs.map((doc) => doc.path));
  const usedTargets = new Set();
  const candidates = [];
  for (const candidate of internalCandidates) {
    const matches = candidate.kind === "source_root" ? matchExistingDocs(candidate, scopedDocs) : [];
    if (matches.length > 1) {
      scopeConflicts.push({ path: candidate.path, reason: "multiple_existing_architecture_docs", existingDocs: matches.map((doc) => doc.path) });
    }
    const collected = await collectEvidence(projectRoot, candidate);
    const targetPath = matches[0]?.path ?? candidateTargetPath(architecture.directory, candidate, usedTargets, existingPaths, scopeConflicts);
    usedTargets.add(targetPath);
    candidates.push({
      id: candidate.id,
      path: candidate.path,
      kind: candidate.kind,
      disposition: collected.disposition,
      confidence: collected.confidence,
      evidence: collected.evidence,
      targetPath,
      existing: matches.length > 0
    });
  }

  if (candidates.length === 0) {
    return architectureResult({
      mode: "skip",
      reason: "no_source",
      candidates,
      overviewTargetPath,
      overviewExisting,
      excluded,
      scopeConflicts,
      existingArchitectureDocs
    });
  }

  const generatableCount = candidates.filter((candidate) => candidate.disposition === "generate").length;
  if (generatableCount > ARCHITECTURE_CAP_LIMIT) {
    for (const candidate of candidates) {
      candidate.disposition = "list_only";
    }
    return architectureResult({
      mode: "overview_only",
      candidates,
      overviewTargetPath,
      overviewExisting,
      excluded,
      scopeConflicts,
      existingArchitectureDocs
    });
  }

  return architectureResult({
    mode: generatableCount === 1 ? "single" : generatableCount >= 2 ? "layered" : "overview_only",
    candidates,
    overviewTargetPath,
    overviewExisting,
    excluded,
    scopeConflicts,
    existingArchitectureDocs
  });
}

async function listFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

async function buildTemplateIndex() {
  const files = await listFiles(docsTemplatesRoot);
  const byName = new Map();
  for (const file of files) {
    byName.set(basename(file), file);
  }
  return byName;
}

async function ensureDir(projectRoot, absolutePath, summary) {
  if (existsSync(absolutePath)) {
    summary.skipped.push({ path: rel(projectRoot, absolutePath), reason: "exists" });
    return;
  }
  await mkdir(absolutePath, { recursive: true });
  summary.created.push({ path: rel(projectRoot, absolutePath), type: "dir" });
}

async function copyIfMissing(projectRoot, sourcePath, targetPath, summary) {
  if (existsSync(targetPath)) {
    summary.skipped.push({ path: rel(projectRoot, targetPath), reason: "exists" });
    return;
  }
  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(sourcePath, targetPath);
  summary.created.push({ path: rel(projectRoot, targetPath), type: "file" });
}

async function writeIfMissing(projectRoot, targetPath, content, summary) {
  if (existsSync(targetPath)) {
    summary.skipped.push({ path: rel(projectRoot, targetPath), reason: "exists" });
    return;
  }
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content, "utf8");
  summary.created.push({ path: rel(projectRoot, targetPath), type: "file" });
}

function isGeneratedDoc(resolvedDocType) {
  return resolvedDocType.maintainedBy === "generated";
}

function isConcreteOutputPath(resolvedDocType) {
  return !resolvedDocType.outputPathPattern.includes("<");
}

async function scaffoldHumanDocs({ projectRoot, resolver, summary }) {
  const templates = await buildTemplateIndex();
  const copiedTemplateNames = new Set();

  for (const docType of resolver.availableDocTypes) {
    const resolved = resolver.resolveDocType(docType);
    await ensureDir(projectRoot, join(projectRoot, resolved.directory), summary);

    if (!resolved.template || isGeneratedDoc(resolved)) {
      continue;
    }

    const sourcePath = templates.get(basename(resolved.template));
    if (!sourcePath) {
      summary.warnings.push(`template not found for ${docType}: ${resolved.template}`);
      continue;
    }

    const targetPath = isConcreteOutputPath(resolved)
      ? join(projectRoot, resolved.outputPathPattern)
      : join(projectRoot, resolved.directory, basename(resolved.template));
    const targetKey = normalizePath(targetPath);
    if (copiedTemplateNames.has(targetKey)) {
      continue;
    }
    copiedTemplateNames.add(targetKey);
    await copyIfMissing(projectRoot, sourcePath, targetPath, summary);
  }
}

function machineRootFromContract(resolver) {
  return resolver.contract.machine_layer?.root ?? "docs/.ccb/";
}

function contractMachinePaths(resolver) {
  const paths = new Set(["index/", "config/"]);
  for (const raw of resolver.contract.machine_layer?.holds ?? []) {
    if (typeof raw !== "string") continue;
    for (const match of raw.matchAll(/[a-z0-9._/-]+\/?/gi)) {
      const value = match[0];
      if (value.includes("/") || value.endsWith(".jsonl")) {
        paths.add(value);
      }
    }
  }
  return [...paths];
}

async function scaffoldMachineLayer({ projectRoot, resolver, summary }) {
  const machineRoot = join(projectRoot, machineRootFromContract(resolver));
  await ensureDir(projectRoot, machineRoot, summary);

  for (const machinePath of contractMachinePaths(resolver)) {
    const target = join(machineRoot, machinePath);
    if (machinePath.endsWith(".jsonl")) {
      await writeIfMissing(projectRoot, target, "", summary);
    } else {
      await ensureDir(projectRoot, target, summary);
    }
  }

  await copyIfMissing(
    projectRoot,
    DEFAULT_CONTRACT_PATH,
    join(machineRoot, "docs-structure-contract.yaml"),
    summary
  );
  await copyIfMissing(
    projectRoot,
    DEFAULT_SCHEMA_PATH,
    join(machineRoot, "schemas", "docs-structure-contract.schema.yaml"),
    summary
  );
}

async function scaffoldAgentFiles({ projectRoot, summary }) {
  await copyIfMissing(projectRoot, join(templatesRoot, "claude-md-template.md"), join(projectRoot, "CLAUDE.md"), summary);
  await copyIfMissing(projectRoot, join(templatesRoot, "codex-md-template.md"), join(projectRoot, "AGENTS.md"), summary);
  await copyIfMissing(
    projectRoot,
    join(pluginRoot, "references", "settings-template.json"),
    join(projectRoot, ".claude", "settings.json"),
    summary
  );

  const hooksRoot = join(templatesRoot, "hooks");
  if (!existsSync(hooksRoot)) return;
  for (const hookPath of await listFiles(hooksRoot)) {
    const targetPath = join(projectRoot, ".claude", "hooks", basename(hookPath));
    await copyIfMissing(projectRoot, hookPath, targetPath, summary);
    await chmod(targetPath, 0o755).catch(() => {});
  }
}

export async function initProjectScaffold(options = {}) {
  const projectRoot = options.projectRoot ?? process.cwd();
  const resolver = options.resolver ?? (await loadDocsStructureResolver(options));
  const summary = {
    projectRoot,
    created: [],
    skipped: [],
    warnings: []
  };

  await scaffoldHumanDocs({ projectRoot, resolver, summary });
  await scaffoldMachineLayer({ projectRoot, resolver, summary });
  await scaffoldAgentFiles({ projectRoot, summary });

  const docMap = resolver.resolveDocType("doc_map");
  summary.warnings.push(`${docMap.outputPathPattern} is generated by indexer and was not created by su-init`);
  summary.architectureCandidates = await detectArchitectureCandidates({ projectRoot, resolver, warnings: summary.warnings });

  return summary;
}

export async function assertInitializedProject(projectRoot) {
  const requiredPaths = [
    "CLAUDE.md",
    "AGENTS.md",
    ".claude/settings.json",
    "docs/00_项目总览.md",
    "docs/01_架构设计/_模板_架构.md",
    "docs/02_需求设计/_模板_需求.md",
    "docs/03_开发计划/_模板_技术设计.md",
    "docs/03_开发计划/_模板_开发任务.md",
    "docs/04_模块规格/_模板_模块规格.md",
    "docs/05_经验沉淀/_模板_经验沉淀.md",
    "docs/06_决策记录/_模板_ADR.md",
    "docs/99_归档",
    "docs/.ccb/docs-structure-contract.yaml",
    "docs/.ccb/schemas/docs-structure-contract.schema.yaml",
    "docs/.ccb/index",
    "docs/.ccb/events/journal.jsonl",
    "docs/.ccb/locks",
    "docs/.ccb/drafts/breakdown"
  ];

  const missing = [];
  for (const path of requiredPaths) {
    try {
      await stat(join(projectRoot, path));
    } catch {
      missing.push(path);
    }
  }
  return {
    ok: missing.length === 0,
    missing
  };
}
