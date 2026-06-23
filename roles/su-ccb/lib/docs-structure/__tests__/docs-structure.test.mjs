import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DEFAULT_SCHEMA_PATH,
  UnknownDocTypeError,
  createDocsStructureResolver,
  loadDocsStructureContract,
  loadDocsStructureResolver,
  parseDocsStructureContract,
  validateDocsStructureContract
} from "../index.mjs";

const EXPECTED_DOC_TYPES = [
  "project_overview",
  "doc_map",
  "architecture",
  "requirement",
  "technical_design",
  "dev_task",
  "module_spec",
  "lessons",
  "adr",
  "archive_index"
];

test("docs structure contract schema file declares the runtime contract kind", async () => {
  const schema = await readFile(DEFAULT_SCHEMA_PATH, "utf8");
  assert.match(schema, /^schema_name: docs-structure-contract$/m);
  assert.match(schema, /^kind: docs_structure_contract_yaml$/m);
});

test("loadDocsStructureContract parses and validates the checked-in contract", async () => {
  const contract = await loadDocsStructureContract();
  assert.equal(contract.version, "docs-structure-contract-v0.1");
  assert.deepEqual(validateDocsStructureContract(contract), []);

  const resolver = createDocsStructureResolver(contract);
  assert.deepEqual(resolver.availableDocTypes, EXPECTED_DOC_TYPES);
});

test("resolver resolves every doc_type from contract entries", async () => {
  const resolver = await loadDocsStructureResolver();
  const resolved = Object.fromEntries(
    EXPECTED_DOC_TYPES.map((docType) => [docType, resolver.resolveDocType(docType)])
  );

  assert.equal(resolved.project_overview.directory, "docs/");
  assert.equal(resolved.project_overview.artifactPath, "docs/00_项目总览.md");
  assert.equal(resolved.project_overview.hasStatus, false);

  assert.equal(resolved.doc_map.maintainedBy, "generated");
  assert.equal(resolved.doc_map.artifactPath, "docs/00_文档地图.md");

  assert.equal(resolved.requirement.directory, "docs/02_需求设计/");
  assert.equal(resolved.requirement.outputPathPattern, "docs/02_需求设计/<模块/主题>-<文档类型>.md");
  assert.equal(resolved.requirement.hasStatus, true);
  assert.equal(resolved.requirement.statusKind, "requirement");
  assert.deepEqual(resolved.requirement.statusFields, ["status"]);

  assert.equal(resolved.technical_design.directory, "docs/03_开发计划/");
  assert.equal(resolved.technical_design.hasStatus, false);
  assert.equal(resolved.technical_design.followsEntity, "requirement");
  assert.deepEqual(resolved.technical_design.requiredFrontmatter, ["doc_type", "requirement_id"]);
  assert.equal(resolved.technical_design.template, "_模板_技术设计.md");

  assert.equal(resolved.dev_task.hasStatus, true);
  assert.equal(resolved.dev_task.statusKind, "task_subtask");
  assert.deepEqual(resolved.dev_task.statusFields, ["current_node", "status", "node_substate"]);
  assert.deepEqual(resolved.dev_task.statusValues.current_node, [
    "requirement_analysis",
    "technical_design",
    "task_breakdown",
    "dispatch",
    "implementation",
    "review",
    "archive"
  ]);
  assert.deepEqual(resolved.dev_task.requiredFrontmatter, ["doc_type", "requirement_id"]);
  assert.equal(resolved.dev_task.template, "_模板_开发任务.md");

  assert.equal(resolved.adr.directory, "docs/06_决策记录/");
  assert.equal(resolved.adr.namingRule, "ADR-NNNN-<slug>.md");
  assert.equal(resolved.adr.hasStatus, true);
  assert.equal(resolved.adr.statusKind, "adr");
  assert.deepEqual(resolved.adr.statusValues, ["proposed", "accepted", "superseded", "deprecated"]);

  assert.equal(resolved.archive_index.docType, "archive_index");
  assert.equal(resolved.archive_index.outputPathPattern, "docs/99_归档/归档索引.md");
});

test("resolver rejects unknown doc_type with available doc_types", async () => {
  const resolver = await loadDocsStructureResolver();

  assert.throws(
    () => resolver.resolveDocType("technical-design"),
    (error) => {
      assert.ok(error instanceof UnknownDocTypeError);
      assert.equal(error.docType, "technical-design");
      assert.deepEqual(error.availableDocTypes, EXPECTED_DOC_TYPES);
      return true;
    }
  );
});

test("resolver exposes split rules from view_split and entry metadata", async () => {
  const resolver = await loadDocsStructureResolver();

  const architecture = resolver.resolveDocType("architecture");
  const moduleSpec = resolver.resolveDocType("module_spec");
  const requirement = resolver.resolveDocType("requirement");
  const design = resolver.resolveDocType("technical_design");
  const devTask = resolver.resolveDocType("dev_task");

  assert.equal(architecture.splitByPart, true);
  assert.equal(architecture.viewKind, "reference");
  assert.equal(moduleSpec.splitByPart, true);
  assert.equal(moduleSpec.viewKind, "reference");

  assert.equal(requirement.splitByPart, false);
  assert.equal(requirement.viewKind, "integrated");
  assert.equal(design.splitByPart, false);
  assert.equal(design.viewKind, "integrated");
  assert.equal(devTask.splitByPart, false);
  assert.equal(devTask.viewKind, "integrated");
});

test("contract validation reports structural errors", () => {
  const contract = parseDocsStructureContract("version: wrong\nhuman_docs:\n  entries: []\n");
  const issues = validateDocsStructureContract(contract);

  assert.ok(issues.some((issue) => issue.includes("version must be docs-structure-contract-v0.1")));
  assert.ok(issues.some((issue) => issue.includes("human_docs.root")));
  assert.ok(issues.some((issue) => issue.includes("machine_layer")));
});
