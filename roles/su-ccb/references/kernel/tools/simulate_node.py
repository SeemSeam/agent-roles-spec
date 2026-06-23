#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CCB v0.3.2 节点 manifest 轻量模拟器。"""

from __future__ import annotations

import argparse
import re
import sys
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover - 运行环境缺依赖时给出明确错误
    raise SystemExit("ERROR: 需要 PyYAML：pip install pyyaml") from exc


FIELD_REF_RE = re.compile(r"\b(?:task|batch_state|project|codex|loop|subflows)(?:\.[A-Za-z_][A-Za-z0-9_]*)+\b")


@dataclass(frozen=True)
class Expected:
    outcome: str
    transition_id: str | None
    subflow_triggered: bool
    required_step: str | None = None


CASE_DEFS: dict[str, dict[str, Any]] = {
    "simple-success": {
        "description": "简单任务，interactive-single 模式，期望跑到 step1_approval 并完成节点。",
        "overrides": {},
        "unavailable": set(),
        "expected": Expected(
            outcome="completed",
            transition_id="requirement_analysis__on_done__to__technical_design",
            subflow_triggered=False,
            required_step="step1_approval_when_interactive",
        ),
    },
    "consult-needed": {
        "description": "多方案任务触发 consult subflow，全部红旗关闭后完成节点。",
        "overrides": {
            "task.decision_shape.multi_options": True,
            "task.decision_shape.needs_consult": True,
            "task.decision_shape.option_count": 2,
            "task.open_red_flags.any_open": True,
            "task.open_red_flags.all_resolved": False,
        },
        "unavailable": set(),
        "expected": Expected(
            outcome="completed",
            transition_id="requirement_analysis__on_done__to__technical_design",
            subflow_triggered=True,
            required_step="maybe_consult_requirement",
        ),
    },
    "missing-must-have": {
        "description": "独立需求评审能力（v0.3.2 capability_id=analysis.consult）不可用，期望节点 escalate。",
        "overrides": {
            "task.decision_shape.multi_options": True,
            "task.decision_shape.needs_consult": True,
            "task.decision_shape.option_count": 2,
        },
        "unavailable": {"analysis.consult"},
        "expected": Expected(
            outcome="escalate",
            transition_id="requirement_analysis__escalate__to__terminal",
            subflow_triggered=False,
            required_step=None,
        ),
    },
    "missing-governance-critical": {
        "description": "用户确认门 capability 不可用，期望通过 escalation transition 升级。",
        "overrides": {},
        "unavailable": {"gate.user_confirmation"},
        "expected": Expected(
            outcome="escalate",
            transition_id="requirement_analysis__escalate__to__terminal",
            subflow_triggered=False,
            required_step=None,
        ),
    },
}


def load_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = yaml.safe_load(handle)
    if not isinstance(payload, dict):
        raise SystemExit(f"ERROR: YAML 顶层必须是对象：{path}")
    return payload


def base_state(case_def: dict[str, Any]) -> dict[str, Any]:
    state: dict[str, Any] = {
        "task": {
            "task_id": "SIM-REQ-001",
            "node_substate": "proposed",
            "status": "reviewing",
            "scope_assessment": {
                "complexity": "simple",
                "impact": "low",
                "red_flags": [],
                "evidence_count": 1,
                "is_populated": True,
            },
            "decision_shape": {
                "multi_options": False,
                "option_count": 1,
                "needs_consult": False,
                "needs_user_decision": False,
                "is_populated": True,
            },
            "open_red_flags": {
                "any_open": False,
                "all_resolved": True,
            },
            "consult_records": {
                "length": 0,
                "last_recommendation": None,
            },
            "approval_records": {
                "gate_ids": [],
            },
            "requirement_summary": None,
            "requirement_doc_path": None,
        },
        "batch_state": {
            "policy_profile": "interactive-single",
            "decision_records": [],
        },
        "project": {},
        "codex": {},
        "loop": {
            "state_revision": "rev-sim-001",
        },
        "subflows": {
            "consult_requirement_scope": {
                "outputs": {
                    "consult_completed": False,
                },
            },
        },
    }
    for path, value in case_def["overrides"].items():
        set_path(state, path, value)
    return state


def get_path(state: dict[str, Any], path: str) -> Any:
    current: Any = state
    for part in path.split("."):
        if isinstance(current, dict) and part in current:
            current = current[part]
            continue
        if isinstance(current, list) and part == "length":
            return len(current)
        return None
    return current


def set_path(state: dict[str, Any], path: str, value: Any) -> None:
    parts = path.split(".")
    current: Any = state
    for part in parts[:-1]:
        if part not in current or not isinstance(current[part], dict):
            current[part] = {}
        current = current[part]
    current[parts[-1]] = value


def evaluate(expr: Any, state: dict[str, Any]) -> bool:
    if expr is True or expr == "always":
        return True
    if expr is False:
        return False
    if expr is None:
        return False

    text = str(expr).strip()
    if text in {"", "true"}:
        return True
    if text == "false":
        return False

    python_expr = text.replace("&&", " and ").replace("||", " or ")
    python_expr = re.sub(r"\btrue\b", "True", python_expr)
    python_expr = re.sub(r"\bfalse\b", "False", python_expr)
    python_expr = re.sub(r"\bnull\b", "None", python_expr)
    python_expr = FIELD_REF_RE.sub(lambda match: f'value("{match.group(0)}")', python_expr)

    try:
        return bool(eval(python_expr, {"__builtins__": {}}, {"value": lambda path: get_path(state, path)}))
    except Exception as exc:  # pragma: no cover - CLI 输出表达式错误即可定位
        raise RuntimeError(f"表达式无法求值：{text}；转换后：{python_expr}") from exc


def load_capabilities(tool_path: Path) -> dict[str, dict[str, Any]]:
    global_path = tool_path.resolve().parents[1] / "capabilities" / "global.yaml"
    payload = load_yaml(global_path)
    return {item["capability_id"]: item for item in payload.get("capabilities", [])}


def missing_outcome(
    capability_id: str,
    on_missing: str | None,
    unavailable: set[str],
    capabilities: dict[str, dict[str, Any]],
    trace: list[str],
) -> str | None:
    if capability_id not in unavailable:
        return None

    criticality = capabilities.get(capability_id, {}).get("criticality", "unknown")
    # governance.escalation 缺失时无法再安全升级，模拟器把它视为硬失败。
    if capability_id == "governance.escalation":
        trace.append("  capability 缺失：governance.escalation，升级通道不可用 -> hard_fail")
        return "hard_fail"

    outcome = on_missing or "escalate"
    trace.append(f"  capability 缺失：{capability_id}，criticality={criticality}，on_missing={outcome}")
    return "hard_fail" if outcome == "hard_fail" else "escalate"


def apply_step_effect(step: dict[str, Any], state: dict[str, Any]) -> None:
    ref = step.get("ref")
    step_id = step.get("step_id")

    if ref == "assess_task_scope":
        set_path(state, "task.scope_assessment.evidence_count", 1)
        set_path(state, "task.scope_assessment.is_populated", True)
    elif ref == "assess_decision_shape":
        set_path(state, "task.decision_shape.is_populated", True)
    elif ref == "consult_codex":
        set_path(state, "task.consult_records.length", 1)
        set_path(state, "task.consult_records.last_recommendation", "accept")
    elif ref == "record_decision_provenance":
        get_path(state, "batch_state.decision_records").append({"ref": "simulated-consult"})
    elif ref == "resolve_red_flag":
        set_path(state, "task.open_red_flags.any_open", False)
        set_path(state, "task.open_red_flags.all_resolved", True)
    elif ref == "write_requirement_doc" and step_id == "inline_requirement_summary_when_simple":
        set_path(state, "task.requirement_summary", "模拟需求摘要")
    elif ref == "write_requirement_doc":
        set_path(state, "task.requirement_doc_path", "docs/02_需求设计/SIM-REQ-001.md")
    elif ref == "ask_user_approval":
        gate_ids = get_path(state, "task.approval_records.gate_ids")
        if "step1_approval" not in gate_ids:
            gate_ids.append("step1_approval")
    elif ref == "load_work_state" and step_id == "enter_analyzing":
        set_path(state, "task.node_substate", "analyzing")
    elif ref == "load_work_state" and step_id == "complete_autonomous":
        set_path(state, "task.node_substate", "completed")


def simulate_subflow(
    subflow: dict[str, Any],
    state: dict[str, Any],
    unavailable: set[str],
    capabilities: dict[str, dict[str, Any]],
    trace: list[str],
) -> str:
    trace.append(f"  子流程触发：{subflow.get('subflow_id')}")
    for step in subflow.get("steps", []):
        step_id = step.get("step_id", "<unknown>")
        when_ok = evaluate(step.get("when", True), state)
        trace.append(f"    - {step_id}: when={when_ok}")
        if not when_ok:
            continue

        missing = missing_outcome(
            step.get("capability_id", ""),
            step.get("on_failure", {}).get("action"),
            unavailable,
            capabilities,
            trace,
        )
        if missing:
            return missing

        apply_step_effect(step, state)
        if step.get("on_success", {}).get("action") == "complete":
            trace.append(f"    子流程完成于：{step_id}")
            break

    done_when = subflow.get("done_when", "true")
    done = evaluate(done_when, state)
    set_path(state, f"subflows.{subflow.get('subflow_id')}.outputs.consult_completed", done)
    trace.append(f"  子流程 done_when={done}")
    return "next" if done else "escalate"


def check_required_capabilities(
    manifest: dict[str, Any],
    state: dict[str, Any],
    unavailable: set[str],
    capabilities: dict[str, dict[str, Any]],
    trace: list[str],
) -> str | None:
    for item in manifest.get("required_capabilities", {}).get("must_have", []):
        when_ok = evaluate(item.get("when", True), state)
        capability_id = item.get("capability_id", "")
        trace.append(f"必需 capability：{capability_id} when={when_ok}")
        if when_ok:
            missing = missing_outcome(capability_id, item.get("on_missing"), unavailable, capabilities, trace)
            if missing:
                return missing
    return None


def check_exit_conditions(manifest: dict[str, Any], state: dict[str, Any], trace: list[str]) -> bool:
    exit_conditions = manifest.get("exit_conditions", {})
    all_results = []
    for expr in exit_conditions.get("all_of", []):
        result = evaluate(expr, state)
        trace.append(f"exit all_of: {expr} -> {result}")
        all_results.append(result)

    any_of = exit_conditions.get("any_of", [])
    any_result = True if not any_of else any(evaluate(expr, state) for expr in any_of)
    return all(all_results) and any_result


def choose_transition(manifest: dict[str, Any], outcome: str, exit_ok: bool) -> str | None:
    transitions = manifest.get("transitions", [])
    if outcome == "completed" and exit_ok:
        return next((item["transition_id"] for item in transitions if "__on_done__" in item["transition_id"]), None)
    if outcome == "escalate":
        return next((item["transition_id"] for item in transitions if "__escalate__" in item["transition_id"]), None)
    return None


def run_case(manifest_path: Path, case_name: str) -> tuple[bool, dict[str, Any], list[str]]:
    manifest = load_yaml(manifest_path)
    capabilities = load_capabilities(Path(__file__))
    case_def = CASE_DEFS[case_name]
    expected: Expected = case_def["expected"]
    unavailable = set(case_def["unavailable"])
    state = base_state(case_def)
    subflows = {item["subflow_id"]: item for item in manifest.get("subflows", [])}
    trace: list[str] = [
        f"CASE: {case_name}",
        f"说明：{case_def['description']}",
        f"capability 注册表：{len(capabilities)} 项",
        f"不可用 capability：{', '.join(sorted(unavailable)) if unavailable else '无'}",
    ]

    executed_steps: list[str] = []
    subflow_triggered = False
    outcome = check_required_capabilities(manifest, state, unavailable, capabilities, trace)

    if outcome is None:
        outcome = "running"
        for step in manifest.get("fixed_actions", {}).get("steps", []):
            step_id = step.get("step_id", "<unknown>")
            when_ok = evaluate(step.get("when", True), state)
            trace.append(f"- {step_id}: when={when_ok}")
            if not when_ok:
                continue

            executed_steps.append(step_id)
            missing = missing_outcome(
                step.get("capability_id", ""),
                step.get("on_failure", {}).get("action"),
                unavailable,
                capabilities,
                trace,
            )
            if missing:
                outcome = missing
                break

            if step.get("action_type") == "subflow_ref":
                subflow_triggered = True
                outcome = simulate_subflow(subflows[step["ref"]], state, unavailable, capabilities, trace)
                if outcome != "next":
                    break
                continue

            apply_step_effect(step, state)
            action = step.get("on_success", {}).get("action", "next")
            if action == "complete":
                outcome = "completed"
                trace.append(f"节点完成于：{step_id}")
                break
            outcome = "running"

    exit_ok = check_exit_conditions(manifest, state, trace) if outcome == "completed" else False
    transition_id = choose_transition(manifest, outcome, exit_ok)
    actual = {
        "outcome": outcome,
        "transition_id": transition_id,
        "subflow_triggered": subflow_triggered,
        "executed_steps": executed_steps,
        "exit_ok": exit_ok,
    }
    passed = (
        actual["outcome"] == expected.outcome
        and actual["transition_id"] == expected.transition_id
        and actual["subflow_triggered"] == expected.subflow_triggered
        and (expected.required_step is None or expected.required_step in executed_steps)
    )
    trace.append(
        "SUMMARY: "
        f"outcome={actual['outcome']} "
        f"transition={actual['transition_id'] or 'none'} "
        f"subflow_triggered={actual['subflow_triggered']} "
        f"exit_ok={actual['exit_ok']}"
    )
    trace.append(f"RESULT: {'PASS' if passed else 'FAIL'}")
    return passed, actual, trace


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="模拟 CCB v0.3.2 单个节点 manifest 的固定动作流程。")
    parser.add_argument("node_manifest_path", type=Path, help="节点 manifest YAML 路径。")
    parser.add_argument("--case", required=True, choices=sorted(CASE_DEFS), help="要模拟的内置 case 名称。")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        passed, _actual, trace = run_case(args.node_manifest_path, args.case)
    except Exception as exc:
        print(f"ERROR: 模拟失败：{exc}", file=sys.stderr)
        return 1

    print("\n".join(trace))
    return 0 if passed else 2


if __name__ == "__main__":
    raise SystemExit(main())
