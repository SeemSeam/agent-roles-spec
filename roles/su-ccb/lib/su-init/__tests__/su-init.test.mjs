import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { promisify } from "node:util";

import { assertInitializedProject, detectArchitectureCandidates, initProjectScaffold } from "../index.mjs";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const pluginRoot = join(testDir, "..", "..", "..");
const initScriptPath = join(pluginRoot, "skills", "su-init", "scripts", "init.mjs");

async function tempProject() {
  const projectRoot = join(tmpdir(), `ccb-su-init-${randomUUID()}`);
  await mkdir(projectRoot, { recursive: true });
  return projectRoot;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function writeProjectFile(projectRoot, relativePath, content = "") {
  const path = join(projectRoot, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function candidateByPath(result, path) {
  return result.candidates.find((candidate) => candidate.path === path);
}

test("initProjectScaffold creates docs structure and attaches architectureCandidates", async () => {
  const projectRoot = await tempProject();
  try {
    const summary = await initProjectScaffold({ projectRoot });
    const verification = await assertInitializedProject(projectRoot);

    assert.equal(verification.ok, true, verification.missing.join(", "));
    assert.ok(summary.created.length > 0);
    assert.match(await readFile(join(projectRoot, "docs", "00_项目总览.md"), "utf8"), /doc_type: project_overview/);
    assert.match(
      await readFile(join(projectRoot, "docs", ".ccb", "docs-structure-contract.yaml"), "utf8"),
      /^version: docs-structure-contract-v0\.1/m
    );
    assert.equal(await exists(join(projectRoot, "docs", ".ccb", "config")), true);
    assert.equal(await exists(join(projectRoot, "docs", ".ccb", "config", "capabilities.project.yaml")), false);
    assert.equal(await readFile(join(projectRoot, "docs", ".ccb", "events", "journal.jsonl"), "utf8"), "");
    assert.equal(await exists(join(projectRoot, "docs", "00_文档地图.md")), false);
    assert.equal(await exists(join(projectRoot, "docs", ".ccb", "specs")), false);
    assert.equal(await exists(join(projectRoot, "docs", ".ccb", "requirements")), false);
    assert.equal(summary.architectureCandidates.mode, "skip");
    assert.equal(summary.architectureCandidates.reason, "no_source");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("initProjectScaffold is additive and does not overwrite existing files", async () => {
  const projectRoot = await tempProject();
  try {
    await initProjectScaffold({ projectRoot });
    const overviewPath = join(projectRoot, "docs", "00_项目总览.md");
    const before = await readFile(overviewPath, "utf8");
    const second = await initProjectScaffold({ projectRoot });
    const after = await readFile(overviewPath, "utf8");

    assert.equal(after, before);
    assert.ok(second.skipped.some((item) => item.path === "docs/00_项目总览.md"));
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("initProjectScaffold copies expression template blocks and keeps existing template files", async () => {
  const projectRoot = await tempProject();
  try {
    await initProjectScaffold({ projectRoot });
    const requirementTemplatePath = join(projectRoot, "docs", "02_需求设计", "_模板_需求.md");
    const technicalDesignTemplatePath = join(projectRoot, "docs", "03_开发计划", "_模板_技术设计.md");
    const devTaskTemplatePath = join(projectRoot, "docs", "03_开发计划", "_模板_开发任务.md");
    const requirementTemplate = await readFile(requirementTemplatePath, "utf8");
    const technicalDesignTemplate = await readFile(technicalDesignTemplatePath, "utf8");
    const devTaskTemplate = await readFile(devTaskTemplatePath, "utf8");

    assert.match(requirementTemplate, /\*\*目标对齐\*\*/);
    assert.match(requirementTemplate, /\*\*模拟示例\*\*/);
    assert.match(requirementTemplate, /\*\*无需示例\*\*/);
    assert.match(technicalDesignTemplate, /^expression_spec: v1$/m);
    assert.match(technicalDesignTemplate, /\*\*目标对齐\*\*/);
    assert.match(technicalDesignTemplate, /\*\*模拟示例\*\*/);
    assert.match(technicalDesignTemplate, /\*\*无需示例\*\*/);
    assert.match(devTaskTemplate, /\*\*目标对齐\*\*/);

    await writeFile(requirementTemplatePath, "custom template\n", "utf8");
    const second = await initProjectScaffold({ projectRoot });

    assert.equal(await readFile(requirementTemplatePath, "utf8"), "custom template\n");
    assert.ok(second.skipped.some((item) => item.path === "docs/02_需求设计/_模板_需求.md"));
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("init.mjs stdout exposes architectureCandidates", async () => {
  const projectRoot = await tempProject();
  try {
    const { stdout } = await execFileAsync(process.execPath, [initScriptPath, "--project-root", projectRoot]);
    const line = stdout.trim().split(/\r?\n/).find((value) => value.startsWith("[CCB_SU_INIT_COMPLETED] "));
    assert.ok(line);
    const payload = JSON.parse(line.replace("[CCB_SU_INIT_COMPLETED] ", ""));
    assert.equal(payload.architectureCandidates.mode, "skip");
    assert.equal(payload.architectureCandidates.reason, "no_source");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("detectArchitectureCandidates returns skip/no_source for empty projects", async () => {
  const projectRoot = await tempProject();
  try {
    const result = await detectArchitectureCandidates({ projectRoot });
    assert.equal(result.mode, "skip");
    assert.equal(result.reason, "no_source");
    assert.deepEqual(result.candidates, []);
    assert.equal(result.capLimit, 8);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("detectArchitectureCandidates returns single root for one marker with an entry", async () => {
  const projectRoot = await tempProject();
  try {
    await writeProjectFile(projectRoot, "package.json", "{\"name\":\"single\"}\n");
    await writeProjectFile(projectRoot, "src/index.js", "export const app = true;\n");

    const result = await detectArchitectureCandidates({ projectRoot });
    assert.equal(result.mode, "single");
    assert.equal(result.reason, null);
    assert.deepEqual(result.candidates, [
      {
        id: "root",
        path: ".",
        kind: "source_root",
        disposition: "generate",
        confidence: "high",
        evidence: ["entry:src/index.js", "marker:package.json"],
        targetPath: "docs/01_架构设计/root-架构.md",
        existing: false
      }
    ]);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("detectArchitectureCandidates returns layered for frontend and backend entries", async () => {
  const projectRoot = await tempProject();
  try {
    await writeProjectFile(projectRoot, "frontend/package.json", "{\"name\":\"frontend\",\"scripts\":{\"dev\":\"vite\"}}\n");
    await writeProjectFile(projectRoot, "backend/package.json", "{\"name\":\"backend\"}\n");
    await writeProjectFile(projectRoot, "backend/main.go", "package main\nfunc main() {}\n");

    const result = await detectArchitectureCandidates({ projectRoot });
    assert.equal(result.mode, "layered");
    assert.deepEqual(result.candidates.map((candidate) => [candidate.path, candidate.disposition, candidate.confidence]), [
      ["backend", "generate", "high"],
      ["frontend", "generate", "high"]
    ]);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("detectArchitectureCandidates handles pnpm workspaces, list_only libraries, root aggregation, and negation warnings", async () => {
  const projectRoot = await tempProject();
  const warnings = [];
  try {
    await writeProjectFile(projectRoot, "package.json", "{\"name\":\"root\"}\n");
    await writeProjectFile(projectRoot, "pnpm-workspace.yaml", "packages:\n  - \"apps/*\"\n  - \"packages/*\"\n  - \"!packages/ignored\"\n");
    await writeProjectFile(projectRoot, "apps/web/package.json", "{\"name\":\"web\"}\n");
    await writeProjectFile(projectRoot, "apps/web/src/index.ts", "export const web = true;\n");
    await writeProjectFile(projectRoot, "packages/ui/package.json", "{\"name\":\"ui\"}\n");

    const result = await detectArchitectureCandidates({ projectRoot, warnings });
    assert.equal(result.mode, "single");
    assert.deepEqual(result.excluded, [{ path: ".", reason: "root_aggregator" }]);
    assert.deepEqual(result.candidates.map((candidate) => [candidate.path, candidate.disposition, candidate.confidence]), [
      ["apps/web", "generate", "high"],
      ["packages/ui", "list_only", "medium"]
    ]);
    assert.deepEqual(candidateByPath(result, "packages/ui").evidence, ["marker:package.json", "workspace_member"]);
    assert.ok(warnings.some((warning) => warning.includes("negation pattern")));
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("detectArchitectureCandidates includes root app when workspace root has Dockerfile", async () => {
  const projectRoot = await tempProject();
  try {
    await writeProjectFile(projectRoot, "package.json", "{\"name\":\"root\",\"workspaces\":[\"apps/*\"]}\n");
    await writeProjectFile(projectRoot, "Dockerfile", "FROM node:22\n");
    await writeProjectFile(projectRoot, "apps/web/package.json", "{\"name\":\"web\"}\n");
    await writeProjectFile(projectRoot, "apps/web/src/index.js", "export const web = true;\n");

    const result = await detectArchitectureCandidates({ projectRoot });
    assert.equal(result.mode, "layered");
    assert.equal(result.excluded.some((item) => item.reason === "root_aggregator"), false);
    assert.deepEqual(result.candidates.map((candidate) => [candidate.path, candidate.disposition]), [
      [".", "generate"],
      ["apps/web", "generate"]
    ]);
    assert.ok(candidateByPath(result, ".").evidence.includes("deploy:Dockerfile"));
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("detectArchitectureCandidates parses package object, Cargo, and go.work workspace members", async () => {
  const projectRoot = await tempProject();
  try {
    await writeProjectFile(projectRoot, "package.json", "{\"name\":\"root\",\"workspaces\":{\"packages\":[\"js/*\"]}}\n");
    await writeProjectFile(projectRoot, "Cargo.toml", "[workspace]\nmembers = [\"crates/*\"]\n");
    await writeProjectFile(projectRoot, "go.work", "go 1.22\nuse (\n  ./services/api\n)\n");
    await writeProjectFile(projectRoot, "js/app/package.json", "{\"name\":\"app\",\"scripts\":{\"start\":\"node .\"}}\n");
    await writeProjectFile(projectRoot, "crates/core/Cargo.toml", "[package]\nname = \"core\"\n");
    await writeProjectFile(projectRoot, "crates/core/src/main.rs", "fn main() {}\n");
    await writeProjectFile(projectRoot, "services/api/go.mod", "module example.com/api\n");
    await writeProjectFile(projectRoot, "services/api/main.go", "package main\nfunc main() {}\n");

    const result = await detectArchitectureCandidates({ projectRoot });
    assert.equal(result.mode, "layered");
    assert.deepEqual(result.candidates.map((candidate) => candidate.path), ["crates/core", "js/app", "services/api"]);
    assert.deepEqual(result.candidates.map((candidate) => candidate.disposition), ["generate", "generate", "generate"]);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("detectArchitectureCandidates merges Tauri shell into root host", async () => {
  const projectRoot = await tempProject();
  try {
    await writeProjectFile(projectRoot, "pyproject.toml", "[project]\nname = \"host\"\n");
    await writeProjectFile(projectRoot, "main.py", "print('host')\n");
    await writeProjectFile(projectRoot, "tauri.conf.json", "{}\n");
    await writeProjectFile(projectRoot, "src-tauri/Cargo.toml", "[package]\nname = \"shell\"\n");

    const result = await detectArchitectureCandidates({ projectRoot });
    assert.equal(result.mode, "single");
    assert.deepEqual(result.excluded, [{ path: "src-tauri", reason: "framework_shell_merged" }]);
    assert.deepEqual(result.candidates.map((candidate) => candidate.path), ["."]);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("detectArchitectureCandidates does not merge src-tauri without host evidence", async () => {
  const projectRoot = await tempProject();
  try {
    await writeProjectFile(projectRoot, "pyproject.toml", "[project]\nname = \"host\"\n");
    await writeProjectFile(projectRoot, "main.py", "print('host')\n");
    await writeProjectFile(projectRoot, "src-tauri/Cargo.toml", "[package]\nname = \"shell\"\n");

    const result = await detectArchitectureCandidates({ projectRoot });
    assert.equal(result.mode, "single");
    assert.deepEqual(result.excluded, []);
    assert.deepEqual(result.candidates.map((candidate) => candidate.path), [".", "src-tauri"]);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("detectArchitectureCandidates switches to overview_only and list_only for more than eight generatable roots", async () => {
  const projectRoot = await tempProject();
  try {
    for (let index = 1; index <= 9; index += 1) {
      const name = `app-${String(index).padStart(2, "0")}`;
      await writeProjectFile(projectRoot, `${name}/package.json`, `{"name":"${name}"}\n`);
      await writeProjectFile(projectRoot, `${name}/src/index.js`, "export const app = true;\n");
    }

    const result = await detectArchitectureCandidates({ projectRoot });
    assert.equal(result.mode, "overview_only");
    assert.equal(result.reason, null);
    assert.equal(result.candidates.length, 9);
    assert.deepEqual([...new Set(result.candidates.map((candidate) => candidate.disposition))], ["list_only"]);
    assert.deepEqual([...new Set(result.candidates.map((candidate) => candidate.confidence))], ["high"]);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("detectArchitectureCandidates reports git submodules without duplicate marker candidates", async () => {
  const projectRoot = await tempProject();
  try {
    await writeProjectFile(projectRoot, ".gitmodules", "[submodule \"external/lib\"]\n\tpath = external/lib\n\turl = git@example.com/lib.git\n");
    await writeProjectFile(projectRoot, "external/lib/package.json", "{\"name\":\"lib\"}\n");
    await writeProjectFile(projectRoot, "external/lib/src/index.js", "export const lib = true;\n");

    const result = await detectArchitectureCandidates({ projectRoot });
    assert.equal(result.mode, "overview_only");
    assert.deepEqual(result.candidates, [
      {
        id: "external-lib",
        path: "external/lib",
        kind: "submodule",
        disposition: "list_only",
        confidence: "medium",
        evidence: ["git_submodule"],
        targetPath: "docs/01_架构设计/external-lib-架构.md",
        existing: false
      }
    ]);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("detectArchitectureCandidates skips when any architecture markdown lacks architecture_scope", async () => {
  const projectRoot = await tempProject();
  try {
    await writeProjectFile(projectRoot, "package.json", "{\"name\":\"single\"}\n");
    await writeProjectFile(projectRoot, "src/index.js", "export const app = true;\n");
    await writeProjectFile(projectRoot, "docs/01_架构设计/已有架构.md", "---\ndoc_type: architecture\n---\n");

    const result = await detectArchitectureCandidates({ projectRoot });
    assert.equal(result.mode, "skip");
    assert.equal(result.reason, "architecture_exists");
    assert.deepEqual(result.candidates, []);
    assert.deepEqual(result.existingArchitectureDocs, ["docs/01_架构设计/已有架构.md"]);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("detectArchitectureCandidates marks scoped existing docs per candidate", async () => {
  const projectRoot = await tempProject();
  try {
    await writeProjectFile(projectRoot, "apps/api/package.json", "{\"name\":\"api\"}\n");
    await writeProjectFile(projectRoot, "apps/api/src/index.js", "export const api = true;\n");
    await writeProjectFile(projectRoot, "apps/web/package.json", "{\"name\":\"web\"}\n");
    await writeProjectFile(projectRoot, "apps/web/src/index.js", "export const web = true;\n");
    await writeProjectFile(
      projectRoot,
      "docs/01_架构设计/web-架构.md",
      "---\ndoc_type: architecture\narchitecture_scope: apps-web\nscope_source_roots: [\"apps/web\"]\n---\n"
    );

    const result = await detectArchitectureCandidates({ projectRoot });
    assert.equal(result.mode, "layered");
    assert.equal(candidateByPath(result, "apps/web").existing, true);
    assert.equal(candidateByPath(result, "apps/web").targetPath, "docs/01_架构设计/web-架构.md");
    assert.equal(candidateByPath(result, "apps/api").existing, false);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("detectArchitectureCandidates reports existing overview architecture", async () => {
  const projectRoot = await tempProject();
  try {
    await writeProjectFile(projectRoot, "package.json", "{\"name\":\"single\"}\n");
    await writeProjectFile(projectRoot, "src/index.js", "export const app = true;\n");
    await writeProjectFile(
      projectRoot,
      "docs/01_架构设计/overview.md",
      "---\ndoc_type: architecture\narchitecture_scope: overview\nscope_source_roots: [\".\"]\n---\n"
    );

    const result = await detectArchitectureCandidates({ projectRoot });
    assert.equal(result.mode, "single");
    assert.equal(result.overviewExisting, true);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("detectArchitectureCandidates adds deterministic hash suffixes for slug conflicts", async () => {
  const projectRoot = await tempProject();
  try {
    await writeProjectFile(projectRoot, "App One/package.json", "{\"name\":\"upper\"}\n");
    await writeProjectFile(projectRoot, "App One/src/index.js", "export const app = true;\n");
    await writeProjectFile(projectRoot, "app-one/package.json", "{\"name\":\"lower\"}\n");
    await writeProjectFile(projectRoot, "app-one/src/index.js", "export const app = true;\n");

    const first = await detectArchitectureCandidates({ projectRoot });
    const second = await detectArchitectureCandidates({ projectRoot });
    assert.deepEqual(second, first);
    assert.equal(first.mode, "layered");
    assert.equal(new Set(first.candidates.map((candidate) => candidate.targetPath)).size, 2);
    assert.ok(first.candidates.every((candidate) => /^app-one-[0-9a-f]{6}$/.test(candidate.id)));
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("detectArchitectureCandidates is bit-identical across repeated runs for unordered fixture creation", async () => {
  const projectRoot = await tempProject();
  try {
    await writeProjectFile(projectRoot, "zeta/package.json", "{\"name\":\"zeta\",\"scripts\":{\"serve\":\"vite\"}}\n");
    await writeProjectFile(projectRoot, "alpha/package.json", "{\"name\":\"alpha\"}\n");
    await writeProjectFile(projectRoot, "alpha/main.py", "print('alpha')\n");
    await writeProjectFile(projectRoot, "middle/package.json", "{\"name\":\"middle\"}\n");

    const first = await detectArchitectureCandidates({ projectRoot });
    const second = await detectArchitectureCandidates({ projectRoot });
    assert.deepEqual(second, first);
    assert.deepEqual(first.candidates.map((candidate) => candidate.path), ["alpha", "middle", "zeta"]);
    assert.deepEqual(first.candidates.map((candidate) => candidate.evidence), [
      ["entry:alpha/main.py", "marker:package.json"],
      ["marker:package.json"],
      ["marker:package.json", "run_script:serve"]
    ]);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("detectArchitectureCandidates recognizes all hard evidence label families", async () => {
  const projectRoot = await tempProject();
  try {
    await writeProjectFile(
      projectRoot,
      "service/package.json",
      "{\"name\":\"service\",\"main\":\"server.js\",\"bin\":{\"svc\":\"bin/svc.js\"},\"scripts\":{\"serve\":\"node server.js\"}}\n"
    );
    await writeProjectFile(projectRoot, "service/pyproject.toml", "[project.scripts]\nservice-cli = \"service:main\"\n");
    await writeProjectFile(projectRoot, "service/docker-compose.yml", "services:\n  web:\n    image: nginx\n");

    const result = await detectArchitectureCandidates({ projectRoot });
    assert.equal(result.mode, "single");
    assert.deepEqual(candidateByPath(result, "service").evidence, [
      "deploy:service/docker-compose.yml",
      "entry:service/bin/svc.js",
      "entry:service/server.js",
      "marker:package.json",
      "marker:pyproject.toml",
      "run_script:serve",
      "run_script:service-cli"
    ]);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});
