import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import {
  POLICY_VERSION,
  resolveCapabilityOutcomePolicy,
  validateCapabilityOutcomePolicyShape
} from "../generated-policy.mjs";

const execFileAsync = promisify(execFile);
const ROOT = resolve(new URL("../../..", import.meta.url).pathname);
const GENERATOR = join(ROOT, "scripts", "generate-capability-outcome-policy.mjs");

async function tempDir() {
  const root = await mkdtemp(join(tmpdir(), "ccb-capability-policy-"));
  return root;
}

test("generated policy resolves valid tuple", () => {
  const policy = resolveCapabilityOutcomePolicy({
    capabilityId: "reconcile.apply",
    outcomeType: "reconcile_drift_repaired",
    subjectType: "subtask"
  });

  assert.equal(POLICY_VERSION, "v1.0");
  assert.equal(policy.policy_id, "reconcile.apply:reconcile_drift_repaired:subtask");
  assert.equal(policy.write_target, "dev_task");
  assert.equal(policy.state_effects.node_substate, "set_from_input_optional");
});

test("generated policy resolves requirement.finalize with additive terminal evidence", () => {
  const policy = resolveCapabilityOutcomePolicy({
    capabilityId: "requirement.finalize",
    outcomeType: "delivered",
    subjectType: "requirement"
  });

  assert.equal(policy.policy_id, "requirement.finalize:delivered:requirement");
  assert.equal(policy.write_target, "requirement_md");
  assert.equal(policy.state_effects.status, "set:delivered");
  assert.equal(policy.evidence_required.mode, "any");
  assert.deepEqual(policy.evidence_required.items.map((item) => item.check_id), [
    "dev_task_scope_terminal",
    "dev_task_requirement_terminal"
  ]);
  assert.ok(policy.guards.includes("requirement_finalize_expected_hash"));
  assert.ok(policy.guards.includes("requirement_not_cancelled_or_deferred"));
});

test("generated policy resolves requirement.promote planning with hash evidence", () => {
  const policy = resolveCapabilityOutcomePolicy({
    capabilityId: "requirement.promote",
    outcomeType: "planning",
    subjectType: "requirement"
  });

  assert.equal(policy.policy_id, "requirement.promote:planning:requirement");
  assert.equal(policy.write_target, "requirement_md");
  assert.equal(policy.state_effects.status, "set:planning");
  assert.deepEqual(policy.evidence_required.items.map((item) => item.check_id), ["hash_matches"]);
  assert.ok(policy.guards.includes("requirement_promote_forward_only"));
  assert.ok(!policy.guards.includes("requirement_not_cancelled_or_deferred"));
});

test("generated policy resolves requirement.promote delivering with dispatch journal evidence", () => {
  const policy = resolveCapabilityOutcomePolicy({
    capabilityId: "requirement.promote",
    outcomeType: "delivering",
    subjectType: "requirement"
  });

  assert.equal(policy.policy_id, "requirement.promote:delivering:requirement");
  assert.equal(policy.write_target, "requirement_md");
  assert.equal(policy.state_effects.status, "set:delivering");
  assert.deepEqual(policy.evidence_required.items.map((item) => item.check_id), ["journal_event_exists"]);
  assert.deepEqual(policy.evidence_required.items.map((item) => item.source), ["event_journal"]);
  assert.ok(policy.guards.includes("requirement_promote_delivering_forward_only"));
});

test("generated policy resolves cancel guards and retired analyze policy is absent", () => {
  const requirementCancel = resolveCapabilityOutcomePolicy({
    capabilityId: "requirement.cancel",
    outcomeType: "cancelled",
    subjectType: "requirement"
  });
  assert.ok(requirementCancel.guards.includes("requirement_cancel_terminal_protection"));

  const requirementDefer = resolveCapabilityOutcomePolicy({
    capabilityId: "requirement.defer",
    outcomeType: "deferred",
    subjectType: "requirement"
  });
  assert.ok(requirementDefer.guards.includes("requirement_defer_terminal_protection"));

  const subtaskCancel = resolveCapabilityOutcomePolicy({
    capabilityId: "subtask.cancel",
    outcomeType: "cancelled",
    subjectType: "subtask"
  });
  assert.equal(subtaskCancel.write_target, "dev_task");
  assert.equal(subtaskCancel.state_effects.status, "set:cancelled");
  assert.deepEqual(subtaskCancel.must_ask_refs, ["must_ask_9"]);
  assert.ok(subtaskCancel.guards.includes("subtask_cancel_terminal_protection"));

  assert.equal(resolveCapabilityOutcomePolicy({
    capabilityId: "requirement.analyze",
    outcomeType: "analyzed",
    subjectType: "requirement"
  }), null);
});

test("policy validator accepts terminal dev_task check ids", () => {
  const result = validateCapabilityOutcomePolicyShape({
    version: "v1.0",
    policies: [
      {
        policy_id: "ok",
        capability_id: "requirement.finalize",
        outcome_type: "delivered",
        subject_type: "requirement",
        write_target: "requirement_md",
        state_effects: { status: "set:delivered" },
        evidence_required: {
          mode: "any",
          items: [
            { kind: "C", source: "dev_task_scope", check_id: "dev_task_scope_terminal" },
            { kind: "C", source: "dev_task_requirement", check_id: "dev_task_requirement_terminal" }
          ]
        },
        must_ask_refs: []
      }
    ]
  });

  assert.equal(result.ok, true);
});

test("policy validator rejects duplicate tuple", async () => {
  const dir = await tempDir();
  try {
    const policyPath = join(dir, "capability-outcome-policy.yaml");
    const pluginOut = join(dir, "generated-policy.mjs");
    const consoleOut = join(dir, "capability-outcome-policy.ts");
    await writeFile(
      policyPath,
      [
        "version: v1.0",
        "policies:",
        "  - policy_id: one",
        "    capability_id: reconcile.apply",
        "    outcome_type: reconcile_drift_repaired",
        "    subject_type: subtask",
        "    write_target: dev_task",
        "    state_effects:",
        "      node_substate: set_from_input_optional",
        "    evidence_required:",
        "      mode: none",
        "      items: []",
        "    must_ask_refs: []",
        "  - policy_id: two",
        "    capability_id: reconcile.apply",
        "    outcome_type: reconcile_drift_repaired",
        "    subject_type: subtask",
        "    write_target: dev_task",
        "    state_effects:",
        "      node_substate: set_from_input_optional",
        "    evidence_required:",
        "      mode: none",
        "      items: []",
        "    must_ask_refs: []",
        ""
      ].join("\n"),
      "utf8"
    );
    await mkdir(dir, { recursive: true });

    await assert.rejects(
      () =>
        execFileAsync(process.execPath, [
          GENERATOR,
          "--policy",
          policyPath,
          "--plugin-out",
          pluginOut,
          "--console-out",
          consoleOut
        ]),
      /duplicate policy tuple/
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("policy validator rejects unknown evidence check", () => {
  const result = validateCapabilityOutcomePolicyShape({
    version: "v1.0",
    policies: [
      {
        policy_id: "bad",
        capability_id: "bad.capability",
        outcome_type: "bad_outcome",
        subject_type: "subtask",
        write_target: "dev_task",
        state_effects: { node_substate: "set_from_input_optional" },
        evidence_required: {
          mode: "all",
          items: [{ kind: "A", source: "event_journal", check_id: "ai_invented_check" }]
        },
        must_ask_refs: []
      }
    ]
  });

  assert.equal(result.ok, false);
  assert.match(result.issues.join("\n"), /unknown check_id/);
});
