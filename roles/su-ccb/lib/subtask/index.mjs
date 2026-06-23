import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import { readBreakdownDraft, transitionBreakdownDraftStatus } from "../breakdown-draft/index.mjs";
import { resolveDocType } from "../docs-structure/index.mjs";
import {
  ConflictError,
  IOError,
  ValidationError,
  appendEvent,
  hashContent,
  safeWriteFile,
  validateAgainstSchema,
  withFileLock
} from "../runtime/index.mjs";
import { validateDevTaskBusinessRules } from "./business-rules.mjs";

const SOURCE_ACTOR = "ccb_claude";
const DEV_TASK_SCHEMA_NAME = "dev-task";

function safeDraftFileName(id) {
  return `${String(id).replace(/[\\/]/g, "_")}.json`;
}

function draftPath(projectRoot, requirementId) {
  return join(projectRoot, "docs", ".ccb", "drafts", "breakdown", safeDraftFileName(requirementId));
}

function relativeDraftPath(requirementId) {
  return join("docs", ".ccb", "drafts", "breakdown", safeDraftFileName(requirementId));
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function devTaskFileName(title, taskId, namingRule) {
  const subject = `${slugify(title) || "dev-task"}-${String(taskId).slice(-6)}`;
  const fileName = namingRule
    .replace("<模块/主题>", subject)
    .replace("<文档类型>", "开发任务")
    .replace("<部分>", subject)
    .replace("<模块>", subject);
  return fileName.endsWith(".md") ? fileName : `${fileName}.md`;
}

function devTaskRelativePath(resolvedDevTask, title, taskId) {
  return join(resolvedDevTask.directory, devTaskFileName(title, taskId, resolvedDevTask.namingRule));
}

async function resolveProjectDocType(projectRoot, docType) {
  const contractPath = join(projectRoot, "docs", ".ccb", "docs-structure-contract.yaml");
  const options = (await fileExists(contractPath)) ? { contractPath } : {};
  return await resolveDocType(docType, options);
}

export function taskIdForSubtask(requirementId, sectionId) {
  return `subtask-${hashContent(`${requirementId}:${sectionId}`).slice(0, 12)}`;
}

function dependenciesText(taskIds) {
  return taskIds.length === 0 ? "[]" : `[${taskIds.join(", ")}]`;
}

function demoteMarkdownHeadings(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => (/^#{1,5}\s+/.test(line) ? `#${line}` : line))
    .join("\n")
    .trim();
}

function markdownTableCell(value) {
  return String(value ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();
}

function renderDevTaskBody({ draft, subtask, dependencyTaskIds, now }) {
  const demotedSpec = demoteMarkdownHeadings(subtask.spec_section_md.trim());
  const summary = markdownTableCell(subtask.summary) || markdownTableCell(subtask.title);
  return [
    `# ${subtask.title}`,
    "",
    "> 本文档由 breakdown draft 物化生成；frontmatter 承载任务状态，正文按开发任务模板组织。",
    "",
    "## 一、任务概述",
    "",
    "| 项 | 说明 |",
    "|----|------|",
    `| 交付目标 | ${summary} |`,
    `| 需求来源 | ${markdownTableCell(draft.requirement_id)} |`,
    `| 本期范围 | ${markdownTableCell(`${subtask.section_id} · ${subtask.title}`)} |`,
    "| 不含范围 | 未在本子任务 spec_section_md 中声明的内容 |",
    "| 预计工期 | 未估算 |",
    `| 分工 | ${markdownTableCell(subtask.implementation_owner)} |`,
    "",
    "## 二、任务分解",
    "",
    demotedSpec,
    "",
    "## 三、执行顺序 / 里程碑",
    "",
    dependencyTaskIds.length > 0
      ? `- 前置依赖: ${dependencyTaskIds.join(", ")}`
      : "- 前置依赖: 无",
    "- 执行顺序: 按本任务分解完成实现、验证、回执。",
    "",
    "## 四、进度记录",
    "",
    "| 日期 | 完成内容 | 遇到问题 | 下一步 |",
    "|------|----------|----------|--------|",
    `| ${now.slice(0, 10)} | 物化任务文档 | 无 | 等待 dispatch 派工 |`,
    "",
    "## 五、验收标准",
    "",
    "- [ ] 完成 `spec_section_md` 定义的实现范围。",
    "- [ ] 保持 dev_task frontmatter 状态机字段由流程命令维护。",
    "- [ ] 完成必要验证，并在回执中说明测试命令与结果。",
    "",
    "## 六、风险与注意",
    "",
    "| 风险 / 注意 | 影响 | 处理 |",
    "|------|------|------|",
    "| 任务范围与需求或技术设计不一致 | 返工或越界实现 | 实施前回读需求、设计和本任务 spec_section_md |",
    "",
    "## Materialization Context",
    "",
    `- Requirement: ${draft.requirement_id}`,
    `- Section: ${subtask.section_id}`,
    `- Owner: ${subtask.implementation_owner}`,
    `- Priority: ${subtask.priority}`,
    dependencyTaskIds.length > 0 ? `- Dependencies: ${dependencyTaskIds.join(", ")}` : "- Dependencies: none",
    ""
  ].join("\n");
}

function renderDevTaskDocument({ draft, subtask, taskId, dependencyTaskIds, draftHash, now, resolvedDevTask }) {
  const frontmatter = {
    doc_type: "dev_task",
    task_id: taskId,
    title: subtask.title,
    status: "reviewing",
    current_node: "dispatch",
    node_substate: "awaiting_codex_pickup",
    priority: subtask.priority,
    requirement_id: draft.requirement_id,
    section_id: subtask.section_id,
    order: subtask.order,
    implementation_owner: subtask.implementation_owner,
    dependencies: dependencyTaskIds,
    source_breakdown_draft: relativeDraftPath(draft.requirement_id),
    source_draft_hash: draftHash,
    created_at: now,
    code_workspace: {
      path: `../SU-CCB-req-${draft.requirement_id}`,
      branch: `ccb/req-${draft.requirement_id}`
    }
  };
  const frontmatterForRules = {
    ...frontmatter,
    dependencies: dependenciesText(dependencyTaskIds)
  };
  const body = renderDevTaskBody({ draft, subtask, dependencyTaskIds, now });

  validateDevTaskBusinessRules(frontmatterForRules, body, {
    knownTaskIds: new Set([...dependencyTaskIds, taskId])
  });

  const content = [
    "---",
    `doc_type: ${frontmatter.doc_type}`,
    `task_id: ${frontmatter.task_id}`,
    `title: ${frontmatter.title}`,
    `status: ${frontmatter.status}`,
    `current_node: ${frontmatter.current_node}`,
    `node_substate: ${frontmatter.node_substate}`,
    `priority: ${frontmatter.priority}`,
    `requirement_id: ${frontmatter.requirement_id}`,
    `section_id: ${frontmatter.section_id}`,
    `order: ${frontmatter.order}`,
    `implementation_owner: ${frontmatter.implementation_owner}`,
    `dependencies: ${dependenciesText(frontmatter.dependencies)}`,
    `source_breakdown_draft: ${frontmatter.source_breakdown_draft}`,
    `source_draft_hash: ${frontmatter.source_draft_hash}`,
    `created_at: ${frontmatter.created_at}`,
    `code_workspace: ${JSON.stringify(frontmatter.code_workspace)}`,
    "---",
    "",
    body
  ].join("\n");

  return { frontmatter, content, path: devTaskRelativePath(resolvedDevTask, subtask.title, taskId) };
}

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw new IOError(`failed to inspect path: ${path}`, { path, cause: error });
  }
}

function frontmatterValue(content, field) {
  const match = content.match(new RegExp(`^${field}:\\s*(.+?)\\s*$`, "m"));
  return match?.[1]?.trim() ?? null;
}

async function validateExistingSubtask(path, expected) {
  try {
    const content = await readFile(path, "utf8");
    await validateAgainstSchema(content, DEV_TASK_SCHEMA_NAME);
    const mismatches = [
      ["task_id", expected.taskId],
      ["requirement_id", expected.requirementId],
      ["section_id", expected.sectionId]
    ].flatMap(([field, expectedValue]) => {
      const actualValue = frontmatterValue(content, field);
      return actualValue === expectedValue
        ? []
        : [`${field} must be ${expectedValue}, got ${actualValue ?? "<missing>"}`];
    });
    if (mismatches.length > 0) {
      throw new ConflictError(`existing dev_task does not match current materialization: ${path}`, {
        path,
        issues: mismatches
      });
    }
    return {
      sourceDraftHash: frontmatterValue(content, "source_draft_hash")
    };
  } catch (error) {
    if (error?.code === "EISDIR") {
      throw new IOError(`dev_task target is not a file: ${path}`, { path, cause: error });
    }
    throw error;
  }
}

async function listMarkdownFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw new IOError(`failed to scan dev_task directory: ${directory}`, { path: directory, cause: error });
  }

  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path);
    }
  }
  return files;
}

async function findExistingSubtaskPath({ projectRoot, resolvedDevTask, requirementId, taskId, sectionId }) {
  const directory = join(projectRoot, resolvedDevTask.directory);
  for (const path of await listMarkdownFiles(directory)) {
    let content;
    try {
      content = await readFile(path, "utf8");
    } catch (error) {
      throw new IOError(`failed to read existing dev_task document: ${path}`, { path, cause: error });
    }
    if (
      frontmatterValue(content, "task_id") === taskId &&
      frontmatterValue(content, "requirement_id") === requirementId &&
      frontmatterValue(content, "section_id") === sectionId
    ) {
      return path;
    }
  }
  return null;
}

function relativeProjectPath(projectRoot, absolutePath) {
  return absolutePath.startsWith(`${projectRoot}/`) ? absolutePath.slice(projectRoot.length + 1) : absolutePath;
}

async function appendSubtaskMaterializedEvent({ projectRoot, requirementId, subtask, taskId, path, draftHash }) {
  return await appendEvent(
    {
      type: "subtask_materialized",
      subject_type: "subtask",
      subject_id: taskId,
      payload: {
        requirement_id: requirementId,
        task_id: taskId,
        section_id: subtask.section_id,
        path,
        draft_hash: draftHash
      },
      idempotency_key: `materialize-${requirementId}-${taskId}-${draftHash}`,
      emitted_at: new Date().toISOString(),
      source_actor: SOURCE_ACTOR
    },
    { projectRoot }
  );
}

async function appendRequirementMaterializedEvent({ projectRoot, requirementId, draftHash, subtasks }) {
  return await appendEvent(
    {
      type: "requirement_materialized",
      subject_type: "requirement",
      subject_id: requirementId,
      payload: {
        requirement_id: requirementId,
        draft_hash: draftHash,
        subtask_count: subtasks.length,
        task_ids: subtasks.map((item) => item.taskId)
      },
      idempotency_key: `materialize-${requirementId}-${draftHash}`,
      emitted_at: new Date().toISOString(),
      source_actor: SOURCE_ACTOR
    },
    { projectRoot }
  );
}

function assertMaterializableDraft(draft, currentHash, expectedDraftHash) {
  if (draft.status === "consumed" && draft.consumed_from_hash === expectedDraftHash) {
    return "already_consumed";
  }
  if (currentHash !== expectedDraftHash) {
    throw new ConflictError("breakdown draft hash mismatch", {
      expectedHash: expectedDraftHash,
      actualHash: currentHash
    });
  }
  if (draft.status !== "approved") {
    throw new ValidationError("breakdown draft must be approved before materialization", {
      issues: [`status must be approved, got ${draft.status}`]
    });
  }
  return "approved";
}

export async function materializeRequirement({ projectRoot, requirementId, expectedDraftHash, lockOptions = {} }) {
  const lockPath = `${draftPath(projectRoot, requirementId)}.materialize`;
  return await withFileLock(
    lockPath,
    async () => {
      const current = await readBreakdownDraft({ projectRoot, requirementId });
      const materializationState = assertMaterializableDraft(current.draft, current.hash, expectedDraftHash);
      const included = current.draft.subtasks
        .filter((subtask) => subtask.include)
        .sort((left, right) => left.order - right.order);
      if (included.length === 0) {
        throw new ValidationError("breakdown draft must include at least one subtask", {
          issues: ["included subtasks must be non-empty"]
        });
      }

      const sectionToTaskId = new Map(included.map((subtask) => [subtask.section_id, taskIdForSubtask(requirementId, subtask.section_id)]));
      const now = new Date().toISOString();
      const resolvedDevTask = await resolveProjectDocType(projectRoot, "dev_task");
      const specs = included.map((subtask) => {
        const taskId = sectionToTaskId.get(subtask.section_id);
        const dependencyTaskIds = (subtask.dependencies ?? []).map((sectionId) => sectionToTaskId.get(sectionId));
        if (dependencyTaskIds.some((value) => !value)) {
          throw new ValidationError("subtask dependencies must reference included subtasks", {
            issues: (subtask.dependencies ?? [])
              .filter((sectionId) => !sectionToTaskId.has(sectionId))
              .map((sectionId) => `dependencies reference excluded or unknown section_id ${sectionId}`)
          });
        }
        return {
          subtask,
          taskId,
          ...renderDevTaskDocument({
            draft: current.draft,
            subtask,
            taskId,
            dependencyTaskIds,
            draftHash: expectedDraftHash,
            now,
            resolvedDevTask
          })
        };
      });

      const written = [];
      const skipped = [];
      await mkdir(join(projectRoot, resolvedDevTask.directory), { recursive: true });

      for (const spec of specs) {
        const absolutePath = join(projectRoot, spec.path);
        let shouldAppendMaterializedEvent = false;
        if (await fileExists(absolutePath)) {
          const existing = await validateExistingSubtask(absolutePath, {
            taskId: spec.taskId,
            requirementId,
            sectionId: spec.subtask.section_id
          });
          skipped.push({ taskId: spec.taskId, path: spec.path });
          shouldAppendMaterializedEvent = existing.sourceDraftHash === expectedDraftHash;
        } else {
          const existingPath = await findExistingSubtaskPath({
            projectRoot,
            resolvedDevTask,
            requirementId,
            taskId: spec.taskId,
            sectionId: spec.subtask.section_id
          });
          if (existingPath) {
            const existing = await validateExistingSubtask(existingPath, {
              taskId: spec.taskId,
              requirementId,
              sectionId: spec.subtask.section_id
            });
            const existingRelativePath = relativeProjectPath(projectRoot, existingPath);
            skipped.push({ taskId: spec.taskId, path: existingRelativePath });
            shouldAppendMaterializedEvent = existing.sourceDraftHash === expectedDraftHash;
            if (shouldAppendMaterializedEvent) {
              await appendSubtaskMaterializedEvent({
                projectRoot,
                requirementId,
                subtask: spec.subtask,
                taskId: spec.taskId,
                path: existingRelativePath,
                draftHash: expectedDraftHash
              });
            }
            continue;
          }
          await safeWriteFile(absolutePath, spec.content, {
            expectedHash: null,
            schemaName: DEV_TASK_SCHEMA_NAME,
            audit: {
              projectRoot,
              subjectType: "subtask",
              subjectId: spec.taskId,
              sourceActor: SOURCE_ACTOR,
              resourceType: "dev_task",
              operation: "materializeDevTaskDocument",
              runId: `dev-task:${spec.taskId}:${expectedDraftHash}`,
              plannedDiff: {
                requirement_id: requirementId,
                section_id: spec.subtask.section_id,
                source_draft_hash: expectedDraftHash
              },
              targetPath: spec.path
            }
          });
          written.push({ taskId: spec.taskId, path: spec.path });
          shouldAppendMaterializedEvent = true;
        }
        if (shouldAppendMaterializedEvent) {
          await appendSubtaskMaterializedEvent({
            projectRoot,
            requirementId,
            subtask: spec.subtask,
            taskId: spec.taskId,
            path: spec.path,
            draftHash: expectedDraftHash
          });
        }
      }

      if (materializationState === "approved") {
        await transitionBreakdownDraftStatus({
          projectRoot,
          requirementId,
          expectedHash: expectedDraftHash,
          fromStatus: "approved",
          toStatus: "consumed",
          approvedBy: SOURCE_ACTOR
        });
      }
      await appendRequirementMaterializedEvent({
        projectRoot,
        requirementId,
        draftHash: expectedDraftHash,
        subtasks: specs
      });

      return {
        requirementId,
        draftHash: expectedDraftHash,
        subtasks: specs.map((spec) => ({ taskId: spec.taskId, sectionId: spec.subtask.section_id, path: spec.path })),
        written,
        skipped
      };
    },
    lockOptions
  );
}
