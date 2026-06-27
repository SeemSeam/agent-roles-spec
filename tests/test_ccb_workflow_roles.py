from __future__ import annotations

import json
from pathlib import Path
import sys

from agent_roles.catalog import aliases_for, canonical_role_id
from agent_roles.cli import run
from agent_roles.manifest import load_role


REPO_ROOT = Path(__file__).resolve().parents[1]
ALL_CCB_PROVIDERS = {
    "codex",
    "claude",
    "gemini",
    "opencode",
    "kimi",
    "mimo",
    "qwen",
    "zai",
    "droid",
}

WORKFLOW_ROLES = {
    "ccb-frontdesk": {
        "role_id": "agentroles.ccb_frontdesk",
        "name": "CCB Frontdesk",
        "default": "frontdesk",
        "skill": "skills/frontdesk-intake/SKILL.md",
        "aliases": {"ccb-frontdesk", "ccb_frontdesk", "frontdesk"},
        "templates": ["templates/macro-task-request.md"],
    },
    "ccb-planner": {
        "role_id": "agentroles.ccb_planner",
        "name": "CCB Planner",
        "default": "planner",
        "skill": "skills/planner-task-packet/SKILL.md",
        "aliases": {"ccb-planner", "ccb_planner", "planner"},
        "templates": [
            "templates/task-packet.md",
            "templates/readiness.json",
            "templates/candidate-questions.jsonl",
        ],
    },
    "ccb-clarification-broker": {
        "role_id": "agentroles.ccb_clarification_broker",
        "name": "CCB Clarification Broker",
        "default": "clarification_broker",
        "skill": "skills/clarification-broker/SKILL.md",
        "aliases": {
            "ccb-clarification-broker",
            "ccb_clarification_broker",
            "clarification-broker",
        },
        "templates": [
            "templates/user-questions.md",
            "templates/normalized-answers.jsonl",
        ],
    },
    "ccb-plan-reviewer": {
        "role_id": "agentroles.ccb_plan_reviewer",
        "name": "CCB Plan Reviewer",
        "default": "plan_reviewer",
        "skill": "skills/plan-readiness-review/SKILL.md",
        "aliases": {"ccb-plan-reviewer", "ccb_plan_reviewer", "plan-reviewer"},
        "templates": ["templates/planner-review.md"],
    },
    "ccb-orchestrator": {
        "role_id": "agentroles.ccb_orchestrator",
        "name": "CCB Loop Orchestrator",
        "default": "orchestrator",
        "skill": "skills/orchestrator-capacity/SKILL.md",
        "aliases": {
            "ccb-orchestrator",
            "ccb_orchestrator",
            "loop-orchestrator",
            "orchestrator",
        },
        "templates": [
            "templates/capacity-request.json",
            "templates/worker-ask.md",
            "templates/checker-ask.md",
            "templates/round-aggregation.md",
        ],
    },
    "ccb-worker": {
        "role_id": "agentroles.ccb_worker",
        "name": "CCB Worker",
        "default": "worker",
        "skill": "skills/bounded-work-item/SKILL.md",
        "aliases": {"ccb-worker", "ccb_worker", "worker"},
        "templates": ["templates/node-work-result.md"],
    },
    "ccb-checker": {
        "role_id": "agentroles.ccb_checker",
        "name": "CCB Checker",
        "default": "code_reviewer",
        "skill": "skills/node-check/SKILL.md",
        "aliases": {"ccb-checker", "ccb_checker", "node-checker"},
        "templates": ["templates/node-check-result.md"],
    },
    "ccb-round-checker": {
        "role_id": "agentroles.ccb_round_checker",
        "name": "CCB Round Checker",
        "default": "round_checker",
        "skill": "skills/round-verification/SKILL.md",
        "aliases": {"ccb-round-checker", "ccb_round_checker", "round-checker"},
        "templates": ["templates/round-result.md"],
    },
}


def _run_json(argv: list[str], tmp_path: Path, monkeypatch, capsys):
    monkeypatch.setenv("AGENT_ROLES_STORE", str(tmp_path / "store"))
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(REPO_ROOT))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")
    code = run(argv + ["--json"], stdout=sys.stdout, stderr=sys.stderr)
    captured = capsys.readouterr()
    assert code == 0, captured.err
    return json.loads(captured.out)


def test_ccb_workflow_roles_load_with_ccb_adapter_inventory() -> None:
    for directory, expected in WORKFLOW_ROLES.items():
        root = REPO_ROOT / "roles" / directory
        role = load_role(root)

        assert role.id == expected["role_id"]
        assert role.name == expected["name"]
        assert role.version == "0.1.0"
        assert role.catalog_level == "experimental"
        assert role.default_agent_name == expected["default"]
        assert set(role.providers) == ALL_CCB_PROVIDERS

        contents = role.table("contents")
        assert contents["memory"] == ["memory.md"]
        assert contents["tests"] == ["tests/validation.md"]
        assert expected["skill"].removesuffix("/SKILL.md") in contents["skills"]
        assert contents["templates"] == expected["templates"]

        assert root.joinpath(expected["skill"]).is_file()
        assert root.joinpath("adapters/ccb/adapter.toml").is_file()
        assert root.joinpath("adapters/ccb/memory.md").is_file()
        assert root.joinpath("tests/validation.md").is_file()
        for template in expected["templates"]:
            assert root.joinpath(template).is_file()

        ccb_adapter = role.adapter("ccb")
        assert ccb_adapter["display_name"] == expected["default"]
        assert ccb_adapter["permission_default"] == "ask"
        assert ccb_adapter["recommended_workspace_mode"] == "inplace"


def test_ccb_workflow_aliases_install_and_resolve_from_catalog(tmp_path: Path, monkeypatch, capsys) -> None:
    for directory, expected in WORKFLOW_ROLES.items():
        role_id = expected["role_id"]
        assert set(aliases_for(role_id, sources=(REPO_ROOT,))) == expected["aliases"]
        for alias in expected["aliases"]:
            assert canonical_role_id(alias, sources=(REPO_ROOT,)) == role_id

        install = _run_json(["install", directory], tmp_path, monkeypatch, capsys)
        assert install["role_status"] == "installed"
        assert install["role_id"] == role_id
        assert install["version"] == "0.1.0"
        assert install["catalog_level"] == "experimental"

        resolved = _run_json(["resolve", directory], tmp_path, monkeypatch, capsys)
        assert resolved["status"] == "ok"
        assert resolved["role_id"] == role_id
        assert resolved["installed"] is True


def test_ccb_workflow_artifact_contracts_are_explicit() -> None:
    planner = (REPO_ROOT / "roles/ccb-planner/skills/planner-task-packet/SKILL.md").read_text(encoding="utf-8")
    broker = (
        REPO_ROOT / "roles/ccb-clarification-broker/skills/clarification-broker/SKILL.md"
    ).read_text(encoding="utf-8")
    reviewer = (
        REPO_ROOT / "roles/ccb-plan-reviewer/skills/plan-readiness-review/SKILL.md"
    ).read_text(encoding="utf-8")
    orchestrator = (
        REPO_ROOT / "roles/ccb-orchestrator/skills/orchestrator-capacity/SKILL.md"
    ).read_text(encoding="utf-8")

    candidate_questions = (
        REPO_ROOT / "roles/ccb-planner/templates/candidate-questions.jsonl"
    ).read_text(encoding="utf-8")
    user_questions = (
        REPO_ROOT / "roles/ccb-clarification-broker/templates/user-questions.md"
    ).read_text(encoding="utf-8")
    normalized_answers = (
        REPO_ROOT / "roles/ccb-clarification-broker/templates/normalized-answers.jsonl"
    ).read_text(encoding="utf-8")
    review_template = (
        REPO_ROOT / "roles/ccb-plan-reviewer/templates/planner-review.md"
    ).read_text(encoding="utf-8")

    assert "candidate clarification questions" in planner
    assert "readiness recommendations" in planner
    assert '"question"' in candidate_questions

    assert "candidate questions" in broker
    assert "normalized answers" in broker
    assert "## Questions" in user_questions
    assert '"answer"' in normalized_answers
    assert '"source":"user"' in normalized_answers

    assert "`needs_clarification`" in reviewer
    assert "review result: approve|needs_revision|needs_clarification|blocked" in review_template

    assert "ccb loop capacity ensure --loop-id <id>" in orchestrator
    assert "Do not edit `.ccb/ccb.config`" in orchestrator
    assert "command ask --callback \"$WORKER_AGENT\"" in orchestrator
    assert "call raw `ccb reload`" in orchestrator
    assert "call raw `ccb kill`" in orchestrator
