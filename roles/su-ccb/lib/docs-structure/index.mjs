import { readFile } from "node:fs/promises";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const pluginRoot = join(moduleDir, "..", "..");

export const DOCS_STRUCTURE_CONTRACT_VERSION = "docs-structure-contract-v0.1";
export const DEFAULT_CONTRACT_PATH = join(pluginRoot, "references", "docs-structure-contract.yaml");
export const DEFAULT_SCHEMA_PATH = join(pluginRoot, "references", "kernel", "schemas", "docs-structure-contract.schema.yaml");

const DOC_TYPE_PATTERN = /^[a-z][a-z0-9_]*$/;

export class DocsStructureContractError extends Error {
  constructor(message, issues = []) {
    super(message);
    this.name = "DocsStructureContractError";
    this.issues = issues;
  }
}

export class UnknownDocTypeError extends Error {
  constructor(docType, availableDocTypes) {
    super(`unknown doc_type: ${docType}`);
    this.name = "UnknownDocTypeError";
    this.docType = docType;
    this.availableDocTypes = availableDocTypes;
  }
}

function stripComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === '"' || char === "'") && line[index - 1] !== "\\") {
      quote = quote === char ? null : quote ?? char;
      continue;
    }
    if (char === "#" && !quote) {
      return line.slice(0, index);
    }
  }
  return line;
}

function prepareLines(text) {
  return String(text)
    .replace(/\t/g, "  ")
    .split(/\r?\n/)
    .map((raw) => {
      const line = stripComment(raw).replace(/\s+$/g, "");
      return {
        indent: line.match(/^ */)?.[0].length ?? 0,
        text: line.trim()
      };
    })
    .filter((line) => line.text.length > 0);
}

function splitKeyValue(text) {
  const index = text.indexOf(":");
  if (index === -1) return null;
  return [text.slice(0, index).trim(), text.slice(index + 1).trim()];
}

function splitInlineArray(value) {
  const items = [];
  let quote = null;
  let cursor = "";
  for (const char of value) {
    if ((char === '"' || char === "'") && cursor[cursor.length - 1] !== "\\") {
      quote = quote === char ? null : quote ?? char;
      cursor += char;
      continue;
    }
    if (char === "," && !quote) {
      items.push(parseScalar(cursor.trim()));
      cursor = "";
      continue;
    }
    cursor += char;
  }
  if (cursor.trim().length > 0) items.push(parseScalar(cursor.trim()));
  return items;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (!value) return "";
  if (value.startsWith("[") && value.endsWith("]")) {
    const body = value.slice(1, -1).trim();
    return body ? splitInlineArray(body) : [];
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function parseBlock(lines, state, indent) {
  if (state.index >= lines.length) return null;
  const line = lines[state.index];
  if (line.indent < indent) return null;
  return line.text.startsWith("- ") ? parseSequence(lines, state, line.indent) : parseMapping(lines, state, line.indent);
}

function parseSequence(lines, state, indent) {
  const items = [];
  while (state.index < lines.length) {
    const line = lines[state.index];
    if (line.indent < indent) break;
    if (line.indent !== indent || !line.text.startsWith("- ")) break;

    const itemText = line.text.slice(2).trim();
    state.index += 1;

    if (!itemText) {
      items.push(parseBlock(lines, state, indent + 2));
      continue;
    }

    const pair = splitKeyValue(itemText);
    if (pair) {
      const [key, value] = pair;
      const item = { [key]: value ? parseScalar(value) : parseBlock(lines, state, indent + 2) };
      if (state.index < lines.length && lines[state.index].indent > indent) {
        const nested = parseMapping(lines, state, lines[state.index].indent);
        Object.assign(item, nested);
      }
      items.push(item);
      continue;
    }

    items.push(parseScalar(itemText));
  }
  return items;
}

function parseMapping(lines, state, indent) {
  const object = {};
  while (state.index < lines.length) {
    const line = lines[state.index];
    if (line.indent < indent) break;
    if (line.indent !== indent || line.text.startsWith("- ")) break;

    const pair = splitKeyValue(line.text);
    if (!pair) {
      throw new DocsStructureContractError(`invalid YAML line: ${line.text}`, [`invalid line: ${line.text}`]);
    }
    const [key, value] = pair;
    state.index += 1;
    object[key] = value ? parseScalar(value) : parseBlock(lines, state, indent + 2);
  }
  return object;
}

export function parseDocsStructureContract(text) {
  const lines = prepareLines(text);
  const state = { index: 0 };
  const parsed = parseBlock(lines, state, 0);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new DocsStructureContractError("docs structure contract must be a YAML object", ["root must be an object"]);
  }
  return parsed;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeRoot(root) {
  return root.endsWith("/") ? root : `${root}/`;
}

function normalizeDirectory(path) {
  return path.endsWith("/") ? path : `${posix.dirname(path)}/`;
}

function joinContractPath(...parts) {
  return posix.normalize(parts.filter(Boolean).join("/")).replace(/\/?$/, (match) => (match === "/" ? "/" : ""));
}

function withTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function entryDocTypes(entry) {
  if (isNonEmptyString(entry.doc_type)) return [entry.doc_type];
  return ensureArray(entry.doc_types).filter(isNonEmptyString);
}

function addIssue(issues, condition, message) {
  if (!condition) issues.push(message);
}

export function validateDocsStructureContract(contract) {
  const issues = [];
  addIssue(issues, isPlainObject(contract), "root must be an object");
  if (!isPlainObject(contract)) return issues;

  addIssue(issues, contract.version === DOCS_STRUCTURE_CONTRACT_VERSION, `version must be ${DOCS_STRUCTURE_CONTRACT_VERSION}`);
  addIssue(issues, isPlainObject(contract.human_docs), "human_docs must be an object");
  addIssue(issues, isPlainObject(contract.machine_layer), "machine_layer must be an object");
  addIssue(issues, isPlainObject(contract.entity_status), "entity_status must be an object");
  addIssue(issues, isPlainObject(contract.documents), "documents must be an object");

  const humanDocs = contract.human_docs ?? {};
  addIssue(issues, isNonEmptyString(humanDocs.root), "human_docs.root must be a non-empty string");
  addIssue(issues, isNonEmptyString(humanDocs.naming_default), "human_docs.naming_default must be a non-empty string");
  addIssue(issues, Array.isArray(humanDocs.entries) && humanDocs.entries.length > 0, "human_docs.entries must be a non-empty array");

  const knownDocTypes = new Set();
  for (const [index, entry] of ensureArray(humanDocs.entries).entries()) {
    const path = `human_docs.entries[${index}]`;
    addIssue(issues, isPlainObject(entry), `${path} must be an object`);
    if (!isPlainObject(entry)) continue;
    addIssue(issues, isNonEmptyString(entry.path), `${path}.path must be a non-empty string`);
    const types = entryDocTypes(entry);
    addIssue(issues, types.length > 0, `${path} must declare doc_type or doc_types`);
    if (Array.isArray(entry.doc_types) && Array.isArray(entry.templates)) {
      addIssue(issues, entry.templates.length === entry.doc_types.length, `${path}.templates must match doc_types length`);
    }
    for (const docType of types) {
      addIssue(issues, DOC_TYPE_PATTERN.test(docType), `${path}.doc_type must be snake_case: ${docType}`);
      addIssue(issues, !knownDocTypes.has(docType), `duplicate doc_type: ${docType}`);
      knownDocTypes.add(docType);
    }
  }

  const viewSplit = humanDocs.view_split ?? {};
  addIssue(issues, Array.isArray(viewSplit.reference_views), "human_docs.view_split.reference_views must be an array");
  addIssue(issues, Array.isArray(viewSplit.integrated_views), "human_docs.view_split.integrated_views must be an array");
  for (const docType of [...ensureArray(viewSplit.reference_views), ...ensureArray(viewSplit.integrated_views)]) {
    addIssue(issues, knownDocTypes.has(docType), `view_split references unknown doc_type: ${docType}`);
  }

  const machineLayer = contract.machine_layer ?? {};
  addIssue(issues, isNonEmptyString(machineLayer.root), "machine_layer.root must be a non-empty string");
  addIssue(issues, Array.isArray(machineLayer.holds), "machine_layer.holds must be an array");
  addIssue(issues, Array.isArray(machineLayer.not_holds), "machine_layer.not_holds must be an array");

  const entityStatus = contract.entity_status ?? {};
  for (const key of ["requirement", "task_subtask", "adr"]) {
    const status = entityStatus[key];
    addIssue(issues, isPlainObject(status), `entity_status.${key} must be an object`);
    if (!isPlainObject(status)) continue;
    addIssue(issues, ensureArray(status.doc_types).length > 0, `entity_status.${key}.doc_types must be a non-empty array`);
    addIssue(issues, isNonEmptyString(status.kind), `entity_status.${key}.kind must be a non-empty string`);
    addIssue(issues, ensureArray(status.fields).length > 0, `entity_status.${key}.fields must be a non-empty array`);
    addIssue(issues, status.values !== undefined, `entity_status.${key}.values is required`);
    addIssue(
      issues,
      Array.isArray(status.values) || isPlainObject(status.values),
      `entity_status.${key}.values must be an array or object`
    );
    if (isPlainObject(status.values)) {
      for (const [field, values] of Object.entries(status.values)) {
        addIssue(issues, Array.isArray(values), `entity_status.${key}.values.${field} must be an array`);
      }
    }
    for (const docType of ensureArray(status.doc_types)) {
      addIssue(issues, knownDocTypes.has(docType), `entity_status.${key} references unknown doc_type: ${docType}`);
    }
  }

  const documents = contract.documents ?? {};
  for (const groupName of ["requirement_bound", "evergreen", "archive_index"]) {
    const group = documents[groupName];
    addIssue(issues, isPlainObject(group), `documents.${groupName} must be an object`);
    if (!isPlainObject(group)) continue;
    addIssue(issues, ensureArray(group.doc_types).length > 0, `documents.${groupName}.doc_types must be a non-empty array`);
    addIssue(issues, ensureArray(group.must_have).length > 0, `documents.${groupName}.must_have must be a non-empty array`);
    addIssue(issues, isNonEmptyString(group.status), `documents.${groupName}.status must be a non-empty string`);
    for (const docType of ensureArray(group.doc_types)) {
      addIssue(issues, knownDocTypes.has(docType), `documents.${groupName} references unknown doc_type: ${docType}`);
    }
  }
  addIssue(issues, Array.isArray(documents.health), "documents.health must be an array");

  return issues;
}

export function assertValidDocsStructureContract(contract) {
  const issues = validateDocsStructureContract(contract);
  if (issues.length > 0) {
    throw new DocsStructureContractError(`invalid docs structure contract: ${issues.join("; ")}`, issues);
  }
  return contract;
}

function buildEntryIndex(contract) {
  const entries = new Map();
  for (const entry of contract.human_docs.entries) {
    for (const docType of entryDocTypes(entry)) {
      entries.set(docType, entry);
    }
  }
  return entries;
}

function buildStatusIndex(contract) {
  const statuses = new Map();
  for (const [statusKind, definition] of Object.entries(contract.entity_status)) {
    if (!isPlainObject(definition)) continue;
    for (const docType of ensureArray(definition.doc_types)) {
      statuses.set(docType, {
        hasStatus: true,
        statusKind,
        statusFields: ensureArray(definition.fields),
        statusValues: definition.values,
        statusSource: definition.source ?? null
      });
    }
  }
  return statuses;
}

function buildDocumentGroupIndex(contract) {
  const groups = new Map();
  for (const [groupName, definition] of Object.entries(contract.documents)) {
    if (!isPlainObject(definition) || !Array.isArray(definition.doc_types)) continue;
    for (const docType of definition.doc_types) {
      groups.set(docType, {
        documentGroup: groupName,
        requiredFrontmatter: ensureArray(definition.must_have),
        followsEntity: definition.follows ?? null,
        documentStatusRule: definition.status ?? null
      });
    }
  }
  return groups;
}

function outputPatternFor({ root, entry, namingRule }) {
  const entryPath = entry.path;
  if (!entryPath.endsWith("/")) return joinContractPath(root, entryPath);
  return joinContractPath(root, entryPath, namingRule);
}

function templateFor({ entry, docType }) {
  if (entry.template) return entry.template;
  const types = entryDocTypes(entry);
  const templates = ensureArray(entry.templates);
  const index = types.indexOf(docType);
  return index >= 0 ? templates[index] ?? null : null;
}

function directoryFor({ root, entry }) {
  const entryPath = entry.path;
  if (entryPath.endsWith("/")) return withTrailingSlash(joinContractPath(root, entryPath));
  return withTrailingSlash(joinContractPath(root, normalizeDirectory(entryPath)));
}

export function createDocsStructureResolver(contract) {
  assertValidDocsStructureContract(contract);
  const entries = buildEntryIndex(contract);
  const statuses = buildStatusIndex(contract);
  const groups = buildDocumentGroupIndex(contract);
  const root = normalizeRoot(contract.human_docs.root);
  const referenceViews = new Set(contract.human_docs.view_split.reference_views ?? []);
  const integratedViews = new Set(contract.human_docs.view_split.integrated_views ?? []);
  const availableDocTypes = [...entries.keys()];

  return {
    contract,
    availableDocTypes,
    resolveDocType(docType) {
      const entry = entries.get(docType);
      if (!entry) throw new UnknownDocTypeError(docType, availableDocTypes);

      const namingRule = entry.path.endsWith("/")
        ? entry.naming ?? contract.human_docs.naming_default
        : posix.basename(entry.path);
      const status = statuses.get(docType) ?? {
        hasStatus: false,
        statusKind: null,
        statusFields: [],
        statusValues: null,
        statusSource: null
      };
      const group = groups.get(docType) ?? {
        documentGroup: null,
        requiredFrontmatter: ["doc_type"],
        followsEntity: null,
        documentStatusRule: null
      };
      const splitByPart = Boolean(entry.split_by_part);
      const template = templateFor({ entry, docType });

      return {
        docType,
        directory: directoryFor({ root, entry }),
        artifactPath: outputPatternFor({ root, entry, namingRule }),
        outputPathPattern: outputPatternFor({ root, entry, namingRule }),
        namingRule,
        template,
        templates: entry.templates ?? (entry.template ? [entry.template] : []),
        maintainedBy: entry.maintained_by ?? null,
        splitByPart,
        viewKind: referenceViews.has(docType) ? "reference" : integratedViews.has(docType) ? "integrated" : null,
        hasStatus: status.hasStatus,
        statusKind: status.statusKind,
        statusFields: status.statusFields,
        statusValues: status.statusValues,
        statusSource: status.statusSource,
        documentGroup: group.documentGroup,
        requiredFrontmatter: group.requiredFrontmatter,
        followsEntity: group.followsEntity,
        documentStatusRule: group.documentStatusRule
      };
    }
  };
}

export async function loadDocsStructureContract(options = {}) {
  const contractPath = options.contractPath ?? DEFAULT_CONTRACT_PATH;
  const content = await readFile(contractPath, "utf8");
  const contract = parseDocsStructureContract(content);
  assertValidDocsStructureContract(contract);
  return contract;
}

export async function loadDocsStructureResolver(options = {}) {
  return createDocsStructureResolver(await loadDocsStructureContract(options));
}

export async function resolveDocType(docType, options = {}) {
  const resolver = options.contract
    ? createDocsStructureResolver(options.contract)
    : await loadDocsStructureResolver(options);
  return resolver.resolveDocType(docType);
}
