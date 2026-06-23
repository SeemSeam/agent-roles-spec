import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";

import {
  ConflictError,
  IOError,
  LockTimeoutError,
  ValidationError,
  acquireFileLock,
  appendEvent,
  safeWriteFile,
  validateAgainstSchema,
  withFileLock
} from "../index.mjs";

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function tempProject() {
  const root = join(tmpdir(), `ccb-plugin-runtime-${randomUUID()}`);
  await mkdir(root, { recursive: true });
  return root;
}

function validRequirementMarkdown() {
  return [
    "---",
    "title: Runtime Requirement",
    "analysis_input_hash: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "analysis_applied_at: 2026-05-21T10:00:00.000Z",
    "---",
    "",
    "## 需求描述",
    "",
    "Valid body.",
    ""
  ].join("\n");
}

function validBreakdownDraft() {
  return {
    schema_version: "breakdown-draft-v0.2",
    status: "draft",
    project_id: "project-1",
    requirement_id: "req-1",
    carrier_task_id: "req-1",
    carrier_task_key: "Runtime Requirement",
    base_task_revision: null,
    generated_at: "2026-05-21T10:00:00.000Z",
    updated_at: "2026-05-21T10:00:00.000Z",
    generated_by: "ai_session",
    generation_source: {
      cc_agent: "ccb_claude",
      cx_agent: "ccb_codex"
    },
    plan: {
      title: "Plan title",
      summary: "Plan summary",
      spec_outline_md: "## Plan\n\nContent",
      estimated_total_days: 2
    },
    subtasks: [
      {
        section_id: "pr1-runtime-contract",
        order: 1,
        title: "First subtask",
        summary: "Do first thing",
        spec_section_md: "## S1\n\nContent",
        priority: "high",
        implementation_owner: "ccb_codex",
        dependencies: [],
        include: true
      }
    ],
    review_history: [
      {
        at: "2026-05-21T10:00:00.000Z",
        actor: "ai",
        action: "created"
      }
    ]
  };
}

test("safeWriteFile writes by CAS and leaves no temp files", async () => {
  const root = await tempProject();
  try {
    const filePath = join(root, "artifact.txt");
    await writeFile(filePath, "old", "utf8");

    const result = await safeWriteFile(filePath, "new", { expectedHash: sha256("old") });

    assert.equal(result.hash, sha256("new"));
    assert.equal(await readFile(filePath, "utf8"), "new");
    const entries = await readdir(root);
    assert.deepEqual(entries.filter((entry) => entry.includes(`${basename(filePath)}.tmp.`)), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("safeWriteFile throws ConflictError and preserves content on CAS mismatch", async () => {
  const root = await tempProject();
  try {
    const filePath = join(root, "artifact.txt");
    await writeFile(filePath, "old", "utf8");

    await assert.rejects(
      () => safeWriteFile(filePath, "new", { expectedHash: sha256("different") }),
      ConflictError
    );
    assert.equal(await readFile(filePath, "utf8"), "old");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("safeWriteFile wraps write failures as IOError", async () => {
  const root = await tempProject();
  try {
    await assert.rejects(
      () => safeWriteFile(root, "cannot replace a directory"),
      IOError
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("safeWriteFile with audit emits state_write_intent then state_write_done", async () => {
  const projectRoot = await tempProject();
  try {
    const filePath = join(projectRoot, "docs", ".ccb", "state", "subtask-audited.md");

    const result = await safeWriteFile(filePath, "audited content", {
      expectedHash: null,
      audit: {
        projectRoot,
        subjectType: "subtask",
        subjectId: "subtask-audited",
        sourceActor: "ccb_codex",
        resourceType: "task_state",
        operation: "test_write",
        runId: "run-audited-1",
        plannedDiff: { progress: 10 },
        capabilityRef: "test.capability"
      }
    });

    assert.equal(result.hash, sha256("audited content"));
    const journal = await readFile(join(projectRoot, "docs", ".ccb", "events", "journal.jsonl"), "utf8");
    const events = journal.trim().split(/\r?\n/).map((line) => JSON.parse(line));
    assert.deepEqual(events.map((event) => event.type), ["state_write_intent", "state_write_done"]);
    assert.equal(events[0].idempotency_key, "state-write:run-audited-1:intent");
    assert.equal(events[1].idempotency_key, "state-write:run-audited-1:done");
    assert.equal(events[1].payload.intent_event_id, events[0].idempotency_key);
    assert.equal(events[0].payload.resource_type, "task_state");
    assert.equal(events[1].payload.content_hash, result.hash);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("safeWriteFile audit CAS mismatch emits state_write_conflict and preserves file", async () => {
  const projectRoot = await tempProject();
  try {
    const filePath = join(projectRoot, "docs", ".ccb", "state", "subtask-conflict.md");
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, "first writer", "utf8");

    await assert.rejects(
      () =>
        safeWriteFile(filePath, "second writer", {
          expectedHash: sha256("stale"),
          audit: {
            projectRoot,
            subjectType: "subtask",
            subjectId: "subtask-conflict",
            sourceActor: "ccb_codex",
            resourceType: "task_state",
            operation: "test_conflict",
            runId: "run-conflict-1"
          }
        }),
      ConflictError
    );

    assert.equal(await readFile(filePath, "utf8"), "first writer");
    const events = (await readFile(join(projectRoot, "docs", ".ccb", "events", "journal.jsonl"), "utf8"))
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
    assert.deepEqual(events.map((event) => event.type), ["state_write_intent", "state_write_conflict"]);
    assert.equal(events[1].payload.expected_hash, sha256("stale"));
    assert.equal(events[1].payload.actual_hash, sha256("first writer"));
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("safeWriteFile audit write failure emits state_write_failed after intent", async () => {
  const projectRoot = await tempProject();
  try {
    await assert.rejects(
      () =>
        safeWriteFile(projectRoot, "cannot replace directory", {
          audit: {
            projectRoot,
            subjectType: "subtask",
            subjectId: "subtask-failed",
            sourceActor: "ccb_codex",
            resourceType: "task_state",
            operation: "test_failed",
            runId: "run-failed-1"
          }
        }),
      IOError
    );

    const events = (await readFile(join(projectRoot, "docs", ".ccb", "events", "journal.jsonl"), "utf8"))
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
    assert.deepEqual(events.map((event) => event.type), ["state_write_intent", "state_write_failed"]);
    assert.equal(events[1].payload.stage, "write");
    assert.equal(events[1].payload.primitive, "safeWriteFile");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("file lock releases and withFileLock returns callback result", async () => {
  const root = await tempProject();
  try {
    const filePath = join(root, "locked.txt");
    await writeFile(filePath, "body", "utf8");

    const release = await acquireFileLock(filePath);
    await release();

    const value = await withFileLock(filePath, async () => "ok");
    assert.equal(value, "ok");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("file lock throws LockTimeoutError when already held", async () => {
  const root = await tempProject();
  let release;
  try {
    const filePath = join(root, "locked.txt");
    await writeFile(filePath, "body", "utf8");
    release = await acquireFileLock(filePath);

    await assert.rejects(
      () => acquireFileLock(filePath, { timeoutMs: 25, retryIntervalMs: 5 }),
      LockTimeoutError
    );
  } finally {
    if (release) await release();
    await rm(root, { recursive: true, force: true });
  }
});

test("file lock clears stale owner directories left by a dead process", async () => {
  const root = await tempProject();
  try {
    const filePath = join(root, "stale.txt");
    const lockPath = `${filePath}.lock`;
    await mkdir(lockPath, { recursive: true });
    await writeFile(
      join(lockPath, "owner.json"),
      `${JSON.stringify({
        pid: 999_999_999,
        hostname: hostname(),
        acquired_at: "2026-05-21T10:00:00.000Z",
        path: filePath
      })}\n`,
      "utf8"
    );

    const release = await acquireFileLock(filePath, { timeoutMs: 50, retryIntervalMs: 5 });
    await release();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("file lock does not clear ownerless or malformed active lock directories", async () => {
  const root = await tempProject();
  try {
    const ownerlessPath = join(root, "ownerless.txt");
    await mkdir(`${ownerlessPath}.lock`, { recursive: true });
    await assert.rejects(
      () => acquireFileLock(ownerlessPath, { timeoutMs: 25, retryIntervalMs: 5 }),
      LockTimeoutError
    );

    const malformedPath = join(root, "malformed.txt");
    await mkdir(`${malformedPath}.lock`, { recursive: true });
    await writeFile(join(`${malformedPath}.lock`, "owner.json"), "{bad json", "utf8");
    await assert.rejects(
      () => acquireFileLock(malformedPath, { timeoutMs: 25, retryIntervalMs: 5 }),
      LockTimeoutError
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("file lock writes owner metadata through safeWriteFile", async () => {
  const source = await readFile(new URL("../file-lock.mjs", import.meta.url), "utf8");

  assert.match(source, /import\s+\{\s*safeWriteFile\s*\}\s+from\s+"\.\/file-write\.mjs"/);
  assert.match(source, /await\s+safeWriteFile\(\s*`\$\{lockPath\}\/owner\.json`/);
  assert.doesNotMatch(source, /import\s+\{[^}]*\bwriteFile\b[^}]*\}\s+from\s+"node:fs\/promises"/);
  assert.doesNotMatch(source, /await\s+writeFile\(\s*`\$\{lockPath\}\/owner\.json`/);
});

test("file lock owner write does not emit state_write_intent", async () => {
  const projectRoot = await tempProject();
  try {
    const filePath = join(projectRoot, "docs", ".ccb", "state", "locked.md");
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, "body", "utf8");

    const release = await acquireFileLock(filePath);
    await release();

    await assert.rejects(
      () => readFile(join(projectRoot, "docs", ".ccb", "events", "journal.jsonl"), "utf8"),
      /ENOENT/
    );
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("validateAgainstSchema accepts requirement frontmatter and breakdown draft", async () => {
  await validateAgainstSchema(validRequirementMarkdown(), "requirement-md-frontmatter");
  await validateAgainstSchema(JSON.stringify(validBreakdownDraft(), null, 2), "breakdown-draft");
});

test("validateAgainstSchema accepts breakdown draft without deprecated project_id", async () => {
  const draft = validBreakdownDraft();
  delete draft.project_id;

  await validateAgainstSchema(JSON.stringify(draft, null, 2), "breakdown-draft");
});

test("validateAgainstSchema accepts consumed breakdown draft metadata", async () => {
  const draft = {
    ...validBreakdownDraft(),
    status: "consumed",
    consumed_at: "2026-05-21T11:00:00.000Z",
    consumed_by: "ccb_claude",
    consumed_from_hash: "a".repeat(64)
  };

  await validateAgainstSchema(JSON.stringify(draft, null, 2), "breakdown-draft");
});

test("validateAgainstSchema accepts strict ISO8601 datetimes with UTC and offsets", async () => {
  for (const timestamp of [
    "2026-05-21T10:00:00Z",
    "2026-05-21T10:00:00.000Z",
    "2026-05-21T18:00:00+08:00"
  ]) {
    await validateAgainstSchema(
      validRequirementMarkdown().replace("2026-05-21T10:00:00.000Z", timestamp),
      "requirement-md-frontmatter"
    );
  }
});

test("validateAgainstSchema rejects loose or normalized ISO8601 datetime values", async () => {
  for (const timestamp of [
    "2026-05-21",
    "2026-05-21 10:00:00",
    "2026-02-30T10:00:00.000Z",
    "2026-05-21T10:00:00+24:00"
  ]) {
    await assert.rejects(
      () =>
        validateAgainstSchema(
          validRequirementMarkdown().replace("2026-05-21T10:00:00.000Z", timestamp),
          "requirement-md-frontmatter"
        ),
      ValidationError
    );
  }
});

test("validateAgainstSchema rejects auto owners and generation_source unknown keys", async () => {
  const autoOwnerDraft = validBreakdownDraft();
  autoOwnerDraft.subtasks[0].implementation_owner = "auto";
  await assert.rejects(
    () => validateAgainstSchema(JSON.stringify(autoOwnerDraft), "breakdown-draft"),
    ValidationError
  );

  const driftedGenerationSourceDraft = validBreakdownDraft();
  driftedGenerationSourceDraft.generation_source.note = "dead field";
  await assert.rejects(
    () => validateAgainstSchema(JSON.stringify(driftedGenerationSourceDraft), "breakdown-draft"),
    (error) => {
      assert.ok(error instanceof ValidationError);
      assert.match(error.message, /generation_source\.note/);
      return true;
    }
  );
});

test("validateAgainstSchema accepts missing review_history and review_history notes", async () => {
  const missingHistoryDraft = validBreakdownDraft();
  delete missingHistoryDraft.review_history;
  await validateAgainstSchema(JSON.stringify(missingHistoryDraft), "breakdown-draft");

  const notedHistoryDraft = validBreakdownDraft();
  notedHistoryDraft.review_history[0].note = "human-readable review note";
  await validateAgainstSchema(JSON.stringify(notedHistoryDraft), "breakdown-draft");
});

test("validateAgainstSchema throws ValidationError for invalid content", async () => {
  const invalidRequirement = validRequirementMarkdown().replace(
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "bad"
  );
  const invalidDraft = {
    ...validBreakdownDraft(),
    status: "approved"
  };

  await assert.rejects(
    () => validateAgainstSchema(invalidRequirement, "requirement-md-frontmatter"),
    ValidationError
  );
  await assert.rejects(
    () => validateAgainstSchema(JSON.stringify(invalidDraft), "breakdown-draft"),
    ValidationError
  );
});

test("appendEvent writes JSONL and skips duplicate idempotency keys", async () => {
  const projectRoot = await tempProject();
  try {
    const event = {
      type: "file_written",
      subject_type: "requirement",
      subject_id: "req-1",
      payload: { path: "docs/02_需求设计/req-1-需求.md" },
      idempotency_key: "runtime-test-req-1",
      emitted_at: "2026-05-21T10:00:00.000Z",
      source_actor: "ccb_claude"
    };

    const first = await appendEvent(event, { projectRoot });
    const second = await appendEvent(event, { projectRoot });

    assert.equal(first.appended, true);
    assert.equal(second.appended, false);
    const journal = await readFile(join(projectRoot, "docs", ".ccb", "events", "journal.jsonl"), "utf8");
    const lines = journal.trim().split("\n");
    assert.equal(lines.length, 1);
    assert.deepEqual(JSON.parse(lines[0]).idempotency_key, "runtime-test-req-1");

    await assert.rejects(
      () => appendEvent({ ...event, payload: null }, { projectRoot }),
      ValidationError
    );
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("appendEvent failPolicy warning-only returns failed result", async () => {
  const projectRoot = await tempProject();
  try {
    const result = await appendEvent(
      {
        type: "file_written",
        subject_type: "requirement",
        subject_id: "req-warning",
        payload: { path: "docs/02_需求设计/req-warning-需求.md" },
        idempotency_key: "warning-only-failure",
        emitted_at: "2026-05-21T10:00:00.000Z",
        source_actor: "ccb_claude"
      },
      {
        projectRoot,
        journalPath: projectRoot,
        failPolicy: "warning-only"
      }
    );

    assert.equal(result.appended, false);
    assert.equal(result.failed, true);
    assert.ok(result.error);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("appendEvent ignores malformed journal lines while preserving idempotency for valid lines", async () => {
  const projectRoot = await tempProject();
  try {
    const journalPath = join(projectRoot, "docs", ".ccb", "events", "journal.jsonl");
    await mkdir(join(projectRoot, "docs", ".ccb", "events"), { recursive: true });
    await writeFile(
      journalPath,
      [
        "{bad json",
        JSON.stringify({
          type: "file_written",
          subject_type: "requirement",
          subject_id: "req-1",
          payload: { path: "docs/02_需求设计/req-1-需求.md" },
          idempotency_key: "existing-key",
          emitted_at: "2026-05-21T10:00:00.000Z",
          source_actor: "ccb_claude"
        }),
        ""
      ].join("\n"),
      "utf8"
    );

    const duplicate = await appendEvent(
      {
        type: "file_written",
        subject_type: "requirement",
        subject_id: "req-1",
        payload: { path: "docs/02_需求设计/req-1-需求.md" },
        idempotency_key: "existing-key",
        emitted_at: "2026-05-21T10:00:01.000Z",
        source_actor: "ccb_claude"
      },
      { projectRoot }
    );
    assert.equal(duplicate.appended, false);
    assert.equal(duplicate.duplicate, true);

    const appended = await appendEvent(
      {
        type: "file_written",
        subject_type: "requirement",
        subject_id: "req-2",
        payload: { path: "docs/02_需求设计/req-2-需求.md" },
        idempotency_key: "new-key",
        emitted_at: "2026-05-21T10:00:02.000Z",
        source_actor: "ccb_claude"
      },
      { projectRoot }
    );
    assert.equal(appended.appended, true);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});
