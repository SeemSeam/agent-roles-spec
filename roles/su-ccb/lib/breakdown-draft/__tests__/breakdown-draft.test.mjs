import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { acquireFileLock, ConflictError, LockTimeoutError, ValidationError } from "../../runtime/index.mjs";
import {
  createBreakdownDraft,
  deriveFollowupBreakdownDraft,
  deleteBreakdownDraft,
  readBreakdownDraft,
  transitionBreakdownDraftStatus,
  updateBreakdownDraft
} from "../index.mjs";
import { validateBreakdownDraftBusinessRules } from "../business-rules.mjs";

async function tempProject() {
  const root = join(tmpdir(), `ccb-breakdown-draft-lib-${randomUUID()}`);
  await mkdir(root, { recursive: true });
  return root;
}

function validDraft(input = {}) {
  const requirementId = input.requirementId ?? "req-1";
  return {
    schema_version: "breakdown-draft-v0.2",
    status: "draft",
    project_id: input.projectId ?? "project-1",
    requirement_id: requirementId,
    carrier_task_id: requirementId,
    carrier_task_key: "Runtime Requirement",
    base_task_revision: null,
    generated_at: "2026-05-22T10:00:00.000Z",
    updated_at: "2026-05-22T10:00:00.000Z",
    generated_by: "ai_session",
    generation_source: {
      cc_agent: "ccb_claude",
      cx_agent: "ccb_codex"
    },
    plan: {
      title: "Plan title",
      summary: "Plan summary",
      spec_outline_md: [
        "## Outline",
        "",
        "- Split the runtime contract from the UI projection work.",
        "- Keep each slice independently reviewable and testable."
      ].join("\n"),
      estimated_total_days: 2
    },
    subtasks: [
      {
        section_id: "pr1-runtime-contract",
        order: 1,
        title: "First subtask",
        summary: "Do first thing.",
        spec_section_md: [
          "## Runtime Contract",
          "",
          "- Implement the first thing with clear boundaries.",
          "- Verify the slice without touching unrelated modules."
        ].join("\n"),
        priority: "high",
        implementation_owner: "ccb_codex",
        dependencies: [],
        include: true
      }
    ],
    review_history: [
      {
        at: "2026-05-22T10:00:00.000Z",
        actor: "ai",
        action: "created"
      }
    ]
  };
}

async function readEvents(projectRoot) {
  const journalPath = join(projectRoot, "docs", ".ccb", "events", "journal.jsonl");
  const content = await readFile(journalPath, "utf8");
  return content.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

test("createBreakdownDraft writes validated JSON and appends a create event", async () => {
  const projectRoot = await tempProject();
  try {
    const created = await createBreakdownDraft({
      projectRoot,
      requirementId: "req-1",
      draftPayload: validDraft()
    });

    assert.match(created.hash, /^[a-f0-9]{64}$/);
    assert.equal(created.draft.status, "draft");
    assert.equal(Object.hasOwn(created.draft, "project_id"), false);
    assert.equal(created.path, join(projectRoot, "docs", ".ccb", "drafts", "breakdown", "req-1.json"));

    const read = await readBreakdownDraft({ projectRoot, requirementId: "req-1" });
    assert.equal(read.hash, created.hash);
    assert.deepEqual(read.draft, created.draft);

    const events = await readEvents(projectRoot);
    assert.deepEqual(events.map((event) => event.type), [
      "state_write_intent",
      "state_write_done",
      "breakdown_draft_created"
    ]);
    assert.equal(events[0].payload.resource_type, "breakdown_draft");
    assert.equal(events[2].subject_id, "req-1");
    assert.equal(events[2].payload.hash, created.hash);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("createBreakdownDraft fails closed for duplicate, invalid, and locked draft files", async () => {
  const projectRoot = await tempProject();
  try {
    const created = await createBreakdownDraft({
      projectRoot,
      requirementId: "req-1",
      draftPayload: validDraft()
    });

    await assert.rejects(
      () =>
        createBreakdownDraft({
          projectRoot,
          requirementId: "req-1",
          draftPayload: validDraft()
        }),
      ConflictError
    );

    await assert.rejects(
      () =>
        createBreakdownDraft({
          projectRoot,
          requirementId: "req-invalid",
          draftPayload: {
            ...validDraft({ requirementId: "req-invalid" }),
            subtasks: []
          }
        }),
      ValidationError
    );

    const release = await acquireFileLock(created.path);
    try {
      await assert.rejects(
        () =>
          createBreakdownDraft({
            projectRoot,
            requirementId: "req-1",
            draftPayload: validDraft(),
            lockOptions: {
              timeoutMs: 20,
              retryIntervalMs: 5
            }
          }),
        LockTimeoutError
      );
    } finally {
      await release();
    }
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("createBreakdownDraft rejects all business rule violations with actionable issues", async () => {
  const projectRoot = await tempProject();
  try {
    const invalid = {
      ...validDraft({ requirementId: "req-invalid" }),
      plan: {
        ...validDraft().plan,
        spec_outline_md: "## Thin"
      },
      subtasks: [
        {
          ...validDraft().subtasks[0],
          section_id: "S1",
          order: 2,
          spec_section_md: "## Thin",
          implementation_owner: "auto",
          dependencies: ["pr9-missing"]
        }
      ],
      review_history: "not-array"
    };

    await assert.rejects(
      () =>
        createBreakdownDraft({
          projectRoot,
          requirementId: "req-invalid",
          draftPayload: invalid
        }),
      (error) => {
        assert.ok(error instanceof ValidationError);
        assert.match(error.message, /breakdown draft business rules failed/);
        assert.match(error.message, /plan\.spec_outline_md/);
        assert.match(error.message, /subtasks\[0\]\.section_id/);
        assert.match(error.message, /subtasks\.order/);
        assert.match(error.message, /subtasks\[0\]\.implementation_owner/);
        assert.match(error.message, /subtasks\[0\]\.dependencies\[0\]/);
        assert.match(error.message, /review_history/);
        assert.ok(error.issues.length >= 6);
        return true;
      }
    );
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("validateBreakdownDraftBusinessRules rejects each business constraint directly", async (t) => {
  const cases = [
    [
      "section_id format",
      (draft) => {
        draft.subtasks[0].section_id = "S1";
      },
      /subtasks\[0\]\.section_id/
    ],
    [
      "section_id uniqueness",
      (draft) => {
        draft.subtasks.push({ ...draft.subtasks[0], title: "Duplicate section" });
      },
      /unique section_id/
    ],
    [
      "owner enum",
      (draft) => {
        draft.subtasks[0].implementation_owner = "auto";
      },
      /implementation_owner/
    ],
    [
      "dependency reference",
      (draft) => {
        draft.subtasks[0].dependencies = ["pr9-missing"];
      },
      /dependencies\[0\]/
    ],
    [
      "plan markdown quality",
      (draft) => {
        draft.plan.spec_outline_md = "short text without marker";
      },
      /plan\.spec_outline_md/
    ],
    [
      "subtask markdown quality",
      (draft) => {
        draft.subtasks[0].spec_section_md = "short text without marker";
      },
      /spec_section_md/
    ],
    [
      "review_history array",
      (draft) => {
        draft.review_history = "not-array";
      },
      /review_history/
    ]
  ];

  for (const [name, mutate, expected] of cases) {
    await t.test(name, () => {
      const draft = structuredClone(validDraft());
      mutate(draft);
      assert.throws(
        () => validateBreakdownDraftBusinessRules(draft),
        (error) => {
          assert.ok(error instanceof ValidationError);
          assert.match(error.message, expected);
          return true;
        }
      );
    });
  }
});

test("validateBreakdownDraftBusinessRules accepts missing review_history and preserves review notes", () => {
  const missingHistoryDraft = structuredClone(validDraft());
  delete missingHistoryDraft.review_history;
  assert.doesNotThrow(() => validateBreakdownDraftBusinessRules(missingHistoryDraft));

  const notedHistoryDraft = structuredClone(validDraft());
  notedHistoryDraft.review_history[0].note = "keep legal review note";
  assert.doesNotThrow(() => validateBreakdownDraftBusinessRules(notedHistoryDraft));
});

test("createBreakdownDraft rejects non-contiguous order and section numbering mismatches", async () => {
  const projectRoot = await tempProject();
  try {
    const invalid = {
      ...validDraft({ requirementId: "req-order" }),
      subtasks: [
        validDraft().subtasks[0],
        {
          ...validDraft().subtasks[0],
          section_id: "pr2-second-slice",
          order: 3,
          title: "Second subtask"
        }
      ]
    };

    await assert.rejects(
      () =>
        createBreakdownDraft({
          projectRoot,
          requirementId: "req-order",
          draftPayload: invalid
        }),
      (error) => {
        assert.ok(error instanceof ValidationError);
        assert.match(error.message, /subtasks\.order/);
        assert.match(error.message, /subtasks\[1\]\.section_id/);
        assert.match(error.message, /actual="pr2-second-slice"/);
        assert.match(error.message, /expected=section_id prefix pr3-/);
        return true;
      }
    );
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("updateBreakdownDraft merges a patch and rejects stale expected hashes", async () => {
  const projectRoot = await tempProject();
  try {
    const created = await createBreakdownDraft({
      projectRoot,
      requirementId: "req-1",
      draftPayload: validDraft()
    });

    const updated = await updateBreakdownDraft({
      projectRoot,
      requirementId: "req-1",
      expectedHash: created.hash,
      patch: {
        plan: {
          summary: "Updated summary"
        }
      }
    });
    assert.equal(updated.draft.plan.title, "Plan title");
    assert.equal(updated.draft.plan.summary, "Updated summary");
    assert.notEqual(updated.hash, created.hash);

    await assert.rejects(
      () =>
        updateBreakdownDraft({
          projectRoot,
          requirementId: "req-1",
          expectedHash: created.hash,
          patch: {
            plan: {
              summary: "Stale writer"
            }
          }
        }),
      ConflictError
    );
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("updateBreakdownDraft drops legacy project_id when rewriting a draft", async () => {
  const projectRoot = await tempProject();
  try {
    const path = join(projectRoot, "docs", ".ccb", "drafts", "breakdown", "req-1.json");
    await mkdir(join(projectRoot, "docs", ".ccb", "drafts", "breakdown"), { recursive: true });
    await writeFile(path, `${JSON.stringify(validDraft({ projectId: "old-console-project" }), null, 2)}\n`, "utf8");
    const current = await readBreakdownDraft({ projectRoot, requirementId: "req-1" });

    const updated = await updateBreakdownDraft({
      projectRoot,
      requirementId: "req-1",
      expectedHash: current.hash,
      patch: {
        plan: {
          summary: "Updated without Console project identity"
        }
      }
    });

    assert.equal(Object.hasOwn(updated.draft, "project_id"), false);
    const persisted = JSON.parse(await readFile(path, "utf8"));
    assert.equal(Object.hasOwn(persisted, "project_id"), false);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("updateBreakdownDraft rejects forbidden sensitive fields before merge", async () => {
  const projectRoot = await tempProject();
  try {
    const created = await createBreakdownDraft({
      projectRoot,
      requirementId: "req-1",
      draftPayload: validDraft()
    });

    await assert.rejects(
      () =>
        updateBreakdownDraft({
          projectRoot,
          requirementId: "req-1",
          expectedHash: created.hash,
          patch: {
            status: "reviewing",
            approved_at: "2026-05-22T11:00:00.000Z",
            approved_by: "reviewer"
          }
        }),
      (error) => {
        assert.ok(error instanceof ValidationError);
        assert.match(error.message, /forbidden_field_patched/);
        assert.match(error.message, /status/);
        assert.match(error.message, /approved_at/);
        assert.match(error.message, /approved_by/);
        assert.ok(error.issues.length >= 3);
        return true;
      }
    );
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("transitionBreakdownDraftStatus enforces lifecycle guards and records review history", async () => {
  const projectRoot = await tempProject();
  try {
    const created = await createBreakdownDraft({
      projectRoot,
      requirementId: "req-1",
      draftPayload: validDraft()
    });

    const reviewing = await transitionBreakdownDraftStatus({
      projectRoot,
      requirementId: "req-1",
      expectedHash: created.hash,
      fromStatus: "draft",
      toStatus: "reviewing"
    });
    assert.equal(reviewing.draft.status, "reviewing");

    const rejected = await transitionBreakdownDraftStatus({
      projectRoot,
      requirementId: "req-1",
      expectedHash: reviewing.hash,
      fromStatus: "reviewing",
      toStatus: "draft",
      feedback: {
        summary: "Please merge S1 into the backend implementation slice.",
        items: ["Keep acceptance criteria visible."]
      }
    });
    assert.equal(rejected.draft.status, "draft");
    assert.equal(rejected.draft.review_history.at(-1).action, "rejected");
    assert.match(rejected.draft.review_history.at(-1).note, /Please merge/);
    const rejectEvents = await readEvents(projectRoot);
    assert.deepEqual(rejectEvents.at(-1).payload.feedback, {
      summary: "Please merge S1 into the backend implementation slice.",
      items: ["Keep acceptance criteria visible."]
    });

    await assert.rejects(
      () =>
        transitionBreakdownDraftStatus({
          projectRoot,
          requirementId: "req-1",
          expectedHash: rejected.hash,
          fromStatus: "reviewing",
          toStatus: "approved",
          approvedBy: "reviewer"
        }),
      ConflictError
    );

    await assert.rejects(
      () =>
        transitionBreakdownDraftStatus({
          projectRoot,
          requirementId: "req-1",
          expectedHash: rejected.hash,
          fromStatus: "draft",
          toStatus: "approved",
          approvedBy: "reviewer"
        }),
      ValidationError
    );

    const rereviewing = await transitionBreakdownDraftStatus({
      projectRoot,
      requirementId: "req-1",
      expectedHash: rejected.hash,
      fromStatus: "draft",
      toStatus: "reviewing"
    });
    const approved = await transitionBreakdownDraftStatus({
      projectRoot,
      requirementId: "req-1",
      expectedHash: rereviewing.hash,
      fromStatus: "reviewing",
      toStatus: "approved",
      approvedBy: "reviewer"
    });
    assert.notEqual(approved.hash, rereviewing.hash);
    assert.equal(approved.draft.status, "approved");
    assert.equal(approved.draft.approved_by, "reviewer");
    assert.ok(approved.draft.approved_at);

    const consumed = await transitionBreakdownDraftStatus({
      projectRoot,
      requirementId: "req-1",
      expectedHash: approved.hash,
      fromStatus: "approved",
      toStatus: "consumed",
      approvedBy: "ccb_claude"
    });
    assert.equal(consumed.draft.status, "consumed");
    assert.equal(consumed.draft.consumed_by, "ccb_claude");
    assert.equal(consumed.draft.consumed_from_hash, approved.hash);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("transitionBreakdownDraftStatus reopens a consumed draft for a new follow-up generation", async () => {
  const projectRoot = await tempProject();
  try {
    const created = await createBreakdownDraft({
      projectRoot,
      requirementId: "req-reopen",
      draftPayload: validDraft({ requirementId: "req-reopen" })
    });
    const reviewing = await transitionBreakdownDraftStatus({
      projectRoot,
      requirementId: "req-reopen",
      expectedHash: created.hash,
      fromStatus: "draft",
      toStatus: "reviewing"
    });
    const approved = await transitionBreakdownDraftStatus({
      projectRoot,
      requirementId: "req-reopen",
      expectedHash: reviewing.hash,
      fromStatus: "reviewing",
      toStatus: "approved",
      approvedBy: "reviewer"
    });
    const consumed = await transitionBreakdownDraftStatus({
      projectRoot,
      requirementId: "req-reopen",
      expectedHash: approved.hash,
      fromStatus: "approved",
      toStatus: "consumed",
      approvedBy: "ccb_claude"
    });

    const reopened = await transitionBreakdownDraftStatus({
      projectRoot,
      requirementId: "req-reopen",
      expectedHash: consumed.hash,
      fromStatus: "consumed",
      toStatus: "draft",
      reviewerNote: "derive_followup reopen"
    });

    assert.equal(reopened.draft.status, "draft");
    assert.equal(reopened.draft.consumed_at, consumed.draft.consumed_at);
    assert.equal(reopened.draft.consumed_by, consumed.draft.consumed_by);
    assert.equal(reopened.draft.consumed_from_hash, consumed.draft.consumed_from_hash);
    assert.equal(reopened.draft.review_history.at(-1).action, "status_changed");

    const events = await readEvents(projectRoot);
    assert.equal(events.at(-1).type, "breakdown_draft_reopened");
    assert.equal(events.at(-1).payload.from_status, "consumed");
    assert.equal(events.at(-1).payload.to_status, "draft");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("deriveFollowupBreakdownDraft appends a provenance-bearing follow-up subtask and approves it", async () => {
  const projectRoot = await tempProject();
  try {
    const created = await createBreakdownDraft({
      projectRoot,
      requirementId: "req-followup",
      draftPayload: validDraft({ requirementId: "req-followup" })
    });

    const result = await deriveFollowupBreakdownDraft({
      projectRoot,
      requirementId: "req-followup",
      expectedHash: created.hash,
      followup: {
        type: "subtask",
        title: "Follow-up validation",
        description: "Add validation for the derived follow-up path."
      },
      sourceTask: {
        id: "task-source-1",
        key: "source-key-1",
        title: "Source task",
        currentNode: "review"
      }
    });

    assert.equal(result.draft.status, "approved");
    assert.equal(result.appendedSubtask.order, 2);
    assert.equal(result.appendedSubtask.section_id, "pr2-follow-up-validation");
    assert.match(result.appendedSubtask.spec_section_md, /> 派生自:task task-source-1\(source-key-1\)/);
    assert.equal(result.materializeExpectedHash, result.hash);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("transitionBreakdownDraftStatus requires current expectedHash and rejects stale hashes", async () => {
  const projectRoot = await tempProject();
  try {
    const created = await createBreakdownDraft({
      projectRoot,
      requirementId: "req-1",
      draftPayload: validDraft()
    });

    await assert.rejects(
      () =>
        transitionBreakdownDraftStatus({
          projectRoot,
          requirementId: "req-1",
          fromStatus: "draft",
          toStatus: "reviewing"
        }),
      ValidationError
    );

    await assert.rejects(
      () =>
        transitionBreakdownDraftStatus({
          projectRoot,
          requirementId: "req-1",
          expectedHash: "0".repeat(64),
          fromStatus: "draft",
          toStatus: "reviewing"
        }),
      ConflictError
    );

    const reviewing = await transitionBreakdownDraftStatus({
      projectRoot,
      requirementId: "req-1",
      expectedHash: created.hash,
      fromStatus: "draft",
      toStatus: "reviewing"
    });
    assert.equal(reviewing.draft.status, "reviewing");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("deleteBreakdownDraft removes the file and appends a delete event", async () => {
  const projectRoot = await tempProject();
  try {
    await createBreakdownDraft({
      projectRoot,
      requirementId: "req-1",
      draftPayload: validDraft()
    });

    const deleted = await deleteBreakdownDraft({ projectRoot, requirementId: "req-1" });
    assert.equal(deleted.deleted, true);

    await assert.rejects(
      () => readBreakdownDraft({ projectRoot, requirementId: "req-1" }),
      /breakdown draft not found/
    );

    const events = await readEvents(projectRoot);
    assert.equal(events.at(-1).type, "breakdown_draft_deleted");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("deleteBreakdownDraft keeps the draft when delete event cannot be journaled", async () => {
  const projectRoot = await tempProject();
  try {
    await createBreakdownDraft({
      projectRoot,
      requirementId: "req-1",
      draftPayload: validDraft()
    });

    await rm(join(projectRoot, "docs", ".ccb", "events"), { recursive: true, force: true });
    await writeFile(join(projectRoot, "docs", ".ccb", "events"), "not a directory", "utf8");

    await assert.rejects(() => deleteBreakdownDraft({ projectRoot, requirementId: "req-1" }));

    const stillThere = await readBreakdownDraft({ projectRoot, requirementId: "req-1" });
    assert.equal(stillThere.draft.status, "draft");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("breakdown draft writes fail closed on lock timeout", async () => {
  const projectRoot = await tempProject();
  let release;
  try {
    const created = await createBreakdownDraft({
      projectRoot,
      requirementId: "req-1",
      draftPayload: validDraft()
    });
    release = await acquireFileLock(created.path);

    await assert.rejects(
      () =>
        updateBreakdownDraft({
          projectRoot,
          requirementId: "req-1",
          expectedHash: created.hash,
          patch: {
            plan: {
              summary: "Should time out"
            }
          },
          lockOptions: {
            timeoutMs: 20,
            retryIntervalMs: 5
          }
        }),
      LockTimeoutError
    );
  } finally {
    if (release) await release();
    await rm(projectRoot, { recursive: true, force: true });
  }
});
