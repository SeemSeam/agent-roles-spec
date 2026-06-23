import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { appendEvent } from "../../runtime/index.mjs";
import {
  collectActiveRequirements,
  parseSlotStalePolicy,
  runSlotStaleHealthCheck
} from "../index.mjs";

async function tempProject() {
  const root = join(tmpdir(), `ccb-slot-health-${randomUUID()}`);
  await mkdir(root, { recursive: true });
  return root;
}

async function cleanupProject(projectRoot) {
  await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 20 });
}

async function writeRequirement(projectRoot, id, title = id) {
  const path = join(projectRoot, "docs", "02_需求设计", `${id}.md`);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(
    path,
    [
      "---",
      `id: ${id}`,
      `title: ${title}`,
      "doc_type: requirement",
      "status: planning",
      "created: 2026-05-01T00:00:00.000Z",
      "---",
      "",
      `# ${title}`,
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

async function writeText(projectRoot, relativePath, content) {
  const path = join(projectRoot, relativePath);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content, "utf8");
  return path;
}

async function readEvents(projectRoot) {
  const journalPath = join(projectRoot, "docs", ".ccb", "events", "journal.jsonl");
  const content = await readFile(journalPath, "utf8");
  return content.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

test("collectActiveRequirements reads ids from active requirement markdown frontmatter", async () => {
  const projectRoot = await tempProject();
  try {
    await writeRequirement(projectRoot, "req-slot-health-1", "Slot health 1");
    await writeRequirement(projectRoot, "req-slot-health-2", "Slot health 2");
    await writeText(
      projectRoot,
      "docs/02_需求设计/req-delivered.md",
      ["---", "id: req-delivered", "doc_type: requirement", "status: delivered", "---", "", "# Delivered", ""].join("\n")
    );

    const requirements = await collectActiveRequirements({ projectRoot });

    assert.deepEqual(
      requirements.map((item) => item.id).sort(),
      ["req-slot-health-1", "req-slot-health-2"]
    );
  } finally {
    await cleanupProject(projectRoot);
  }
});

test("parseSlotStalePolicy keeps Console-compatible defaults and overrides stale threshold", () => {
  assert.deepEqual(parseSlotStalePolicy(""), {
    staleThresholdDays: 7,
    policyVersion: "slot-stale-policy-v1"
  });
  assert.deepEqual(parseSlotStalePolicy("stale_threshold_days: 3\nbusy_timeout_hours: 4\n"), {
    staleThresholdDays: 3,
    policyVersion: "slot-stale-policy-v1"
  });
});

test("runSlotStaleHealthCheck appends idempotent slot_stale for stale active requirements", async () => {
  const projectRoot = await tempProject();
  try {
    await writeRequirement(projectRoot, "req-stale");
    await appendEvent(
      {
        type: "capability_outcome_applied",
        subject_type: "requirement",
        subject_id: "req-stale",
        payload: {
          outcome_id: "outcome-1",
          policy_id: "requirement.analysis.completed",
          capability_id: "requirement.analysis",
          outcome_type: "passed"
        },
        idempotency_key: "capability-outcome:outcome-1:applied",
        emitted_at: "2026-05-01T00:00:00.000Z",
        source_actor: "ccb_claude"
      },
      { projectRoot }
    );

    const first = await runSlotStaleHealthCheck({
      projectRoot,
      now: "2026-05-10T00:00:00.000Z"
    });
    const second = await runSlotStaleHealthCheck({
      projectRoot,
      now: "2026-05-10T01:00:00.000Z"
    });

    assert.equal(first.staleAppended, 1);
    assert.equal(second.staleAppended, 0);
    assert.equal(second.duplicates, 1);
    const staleEvents = (await readEvents(projectRoot)).filter((event) => event.type === "slot_stale");
    assert.equal(staleEvents.length, 1);
    assert.equal(staleEvents[0].subject_type, "requirement");
    assert.equal(staleEvents[0].subject_id, "req-stale");
    assert.equal(
      staleEvents[0].idempotency_key,
      "slot-health:slot_stale:req-stale:2026-05-01T00:00:00.000Z:slot-stale-policy-v1"
    );
    assert.deepEqual(staleEvents[0].payload, {
      requirementId: "req-stale",
      lastActivityAt: "2026-05-01T00:00:00.000Z",
      staleDays: 9,
      policyVersion: "slot-stale-policy-v1"
    });
  } finally {
    await cleanupProject(projectRoot);
  }
});

test("runSlotStaleHealthCheck allows a new stale event after a newer capability outcome", async () => {
  const projectRoot = await tempProject();
  try {
    await writeRequirement(projectRoot, "req-stale-new-outcome");
    await appendEvent(
      {
        type: "capability_outcome_applied",
        subject_type: "requirement",
        subject_id: "req-stale-new-outcome",
        payload: {
          outcome_id: "outcome-old",
          policy_id: "requirement.analysis.completed",
          capability_id: "requirement.analysis",
          outcome_type: "passed"
        },
        idempotency_key: "capability-outcome:outcome-old:applied",
        emitted_at: "2026-05-01T00:00:00.000Z",
        source_actor: "ccb_claude"
      },
      { projectRoot }
    );

    await runSlotStaleHealthCheck({ projectRoot, now: "2026-05-10T00:00:00.000Z" });
    await appendEvent(
      {
        type: "capability_outcome_applied",
        subject_type: "requirement",
        subject_id: "req-stale-new-outcome",
        payload: {
          outcome_id: "outcome-new",
          policy_id: "requirement.analysis.completed",
          capability_id: "requirement.analysis",
          outcome_type: "passed"
        },
        idempotency_key: "capability-outcome:outcome-new:applied",
        emitted_at: "2026-05-11T00:00:00.000Z",
        source_actor: "ccb_claude"
      },
      { projectRoot }
    );
    await runSlotStaleHealthCheck({ projectRoot, now: "2026-05-20T00:00:00.000Z" });

    const staleEvents = (await readEvents(projectRoot)).filter((event) => event.type === "slot_stale");
    assert.equal(staleEvents.length, 2);
    assert.deepEqual(
      staleEvents.map((event) => event.payload.lastActivityAt).sort(),
      ["2026-05-01T00:00:00.000Z", "2026-05-11T00:00:00.000Z"]
    );
  } finally {
    await cleanupProject(projectRoot);
  }
});

test("runSlotStaleHealthCheck uses warning-only append failures without blocking the result", async () => {
  const projectRoot = await tempProject();
  try {
    await writeRequirement(projectRoot, "req-warning-only");
    await appendEvent(
      {
        type: "capability_outcome_applied",
        subject_type: "requirement",
        subject_id: "req-warning-only",
        payload: {
          outcome_id: "outcome-warning",
          policy_id: "requirement.analysis.completed",
          capability_id: "requirement.analysis",
          outcome_type: "passed"
        },
        idempotency_key: "capability-outcome:outcome-warning:applied",
        emitted_at: "2026-05-01T00:00:00.000Z",
        source_actor: "ccb_claude"
      },
      { projectRoot }
    );

    const result = await runSlotStaleHealthCheck({
      projectRoot,
      now: "2026-05-10T00:00:00.000Z",
      appendEvent: async (_event, options) => {
        assert.equal(options.failPolicy, "warning-only");
        return { appended: false, failed: true, error: new Error("append failed") };
      }
    });

    assert.equal(result.staleCandidates, 1);
    assert.equal(result.failed, 1);
  } finally {
    await cleanupProject(projectRoot);
  }
});
