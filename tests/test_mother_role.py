from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
from typing import Any

from agent_roles.catalog import aliases_for, canonical_role_id
from agent_roles.cli import run
from agent_roles.manifest import load_role


REPO_ROOT = Path(__file__).resolve().parents[1]
ROLE_ROOT = REPO_ROOT / "roles" / "mother"


def _assert_schema_accepts(schema: dict[str, Any], payload: Any, path: str = "$") -> None:
    if "const" in schema:
        assert payload == schema["const"], path
    if "enum" in schema:
        assert payload in schema["enum"], path

    schema_type = schema.get("type")
    if schema_type == "object":
        assert isinstance(payload, dict), path
        required = schema.get("required") or []
        for key in required:
            assert key in payload, f"{path}.{key}"
        properties = schema.get("properties") or {}
        if schema.get("additionalProperties") is False:
            assert set(payload).issubset(properties), path
        for key, value in payload.items():
            if key in properties:
                _assert_schema_accepts(properties[key], value, f"{path}.{key}")
    elif schema_type == "array":
        assert isinstance(payload, list), path
        min_items = schema.get("minItems")
        if min_items is not None:
            assert len(payload) >= int(min_items), path
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for index, item in enumerate(payload):
                _assert_schema_accepts(item_schema, item, f"{path}[{index}]")
    elif schema_type == "string":
        assert isinstance(payload, str), path
        min_length = schema.get("minLength")
        if min_length is not None:
            assert len(payload) >= int(min_length), path
    elif schema_type == "integer":
        assert isinstance(payload, int) and not isinstance(payload, bool), path
        if "minimum" in schema:
            assert payload >= int(schema["minimum"]), path
        if "maximum" in schema:
            assert payload <= int(schema["maximum"]), path
    elif schema_type == "boolean":
        assert isinstance(payload, bool), path


def _run_json(argv: list[str], tmp_path: Path, monkeypatch, capsys):
    monkeypatch.setenv("AGENT_ROLES_STORE", str(tmp_path / "store"))
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(REPO_ROOT))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")
    code = run(argv + ["--json"], stdout=sys.stdout, stderr=sys.stderr)
    captured = capsys.readouterr()
    assert code == 0, captured.err
    return json.loads(captured.out)


def test_mother_role_loads_with_expected_source_inventory() -> None:
    role = load_role(ROLE_ROOT)

    assert role.id == "agentroles.mother"
    assert role.name == "Role Mother"
    assert role.version == "0.2.2"
    assert role.catalog_level == "preview"
    assert role.default_agent_name == "mother"

    identity = role.table("identity")
    assert identity["interaction_mode"] == "interactive"
    assert identity["initiates_actions"] is False
    assert "audit existing Role source" in identity["purpose"]
    assert "blueprints" in role.description
    assert any("Research public skill construction" in item for item in identity["responsibilities"])
    assert any("Ingest external skill" in item for item in identity["responsibilities"])
    assert any("candidate scorecards" in item for item in identity["responsibilities"])

    contents = role.table("contents")
    assert contents["memory"] == ["memory.md"]
    assert contents["skills"] == [
        "skills/role-creation-audit",
        "skills/role-source-ingest",
        "skills/role-research",
        "skills/role-candidate-score",
        "skills/role-blueprint",
    ]
    assert contents["prompts"] == ["prompts/role-audit.md", "prompts/role-creation.md"]
    assert contents["references"] == ["references/skill-construction-research.md"]
    assert contents["templates"] == [
        "templates/research-brief.md",
        "templates/candidate-scorecard.md",
        "templates/role-blueprint.md",
        "templates/evaluation-report.md",
    ]
    assert contents["schemas"] == [
        "schemas/research-evidence.schema.json",
        "schemas/candidate-scorecard.schema.json",
        "schemas/role-blueprint.schema.json",
        "schemas/evaluation-report.schema.json",
    ]
    assert contents["tools"] == ["tools/README.md", "scripts/inventory_external_source.py"]
    assert contents["tests"] == ["tests/validation.md"]

    permissions = role.table("permissions")
    assert permissions["read_files"] is True
    assert permissions["write_files"] is True
    assert permissions["network"] is True
    assert permissions["secrets"] == "none"

    assert role.adapter("codex")["display_name"] == "mother"
    assert role.adapter("ccb")["display_name"] == "mother"

    for relative in (
        "README.md",
        "memory.md",
        "skills/role-creation-audit/SKILL.md",
        "skills/role-source-ingest/SKILL.md",
        "skills/role-research/SKILL.md",
        "skills/role-candidate-score/SKILL.md",
        "skills/role-blueprint/SKILL.md",
        "prompts/role-audit.md",
        "prompts/role-creation.md",
        "references/skill-construction-research.md",
        "templates/research-brief.md",
        "templates/candidate-scorecard.md",
        "templates/role-blueprint.md",
        "templates/evaluation-report.md",
        "schemas/research-evidence.schema.json",
        "schemas/candidate-scorecard.schema.json",
        "schemas/role-blueprint.schema.json",
        "schemas/evaluation-report.schema.json",
        "tools/README.md",
        "scripts/inventory_external_source.py",
        "tests/validation.md",
    ):
        assert ROLE_ROOT.joinpath(relative).is_file()

    research = ROLE_ROOT.joinpath("references/skill-construction-research.md").read_text(encoding="utf-8")
    assert "OpenAI Codex Agent Skills" in research
    assert "Claude skill authoring best practices" in research
    assert "Do not copy third-party examples wholesale" in research
    assert "External Source Research Workflow" in research
    assert "First-Class Artifacts" in research

    ingest = ROLE_ROOT.joinpath("skills/role-source-ingest/SKILL.md").read_text(encoding="utf-8")
    assert "Inventory before writing" in ingest
    assert "blueprint gate" in ingest
    assert "Do not create or modify `roles/<id>/` before the blueprint exists" in ingest

    role_research = ROLE_ROOT.joinpath("skills/role-research/SKILL.md").read_text(encoding="utf-8")
    assert "Produce a research brief before discovery" in role_research
    assert "Never cite a source that was not opened" in role_research

    score = ROLE_ROOT.joinpath("skills/role-candidate-score/SKILL.md").read_text(encoding="utf-8")
    assert "Hard Gates" in score
    assert "rejected candidates" in score

    blueprint = ROLE_ROOT.joinpath("skills/role-blueprint/SKILL.md").read_text(encoding="utf-8")
    assert "write gate" in blueprint
    assert "single_role" in blueprint

    evidence_schema = json.loads(
        ROLE_ROOT.joinpath("schemas/research-evidence.schema.json").read_text(encoding="utf-8")
    )
    assert evidence_schema["properties"]["schema"]["const"] == "agent-roles/mother-research-evidence/v1"
    assert "sources" in evidence_schema["required"]

    blueprint_schema = json.loads(
        ROLE_ROOT.joinpath("schemas/role-blueprint.schema.json").read_text(encoding="utf-8")
    )
    assert blueprint_schema["properties"]["schema"]["const"] == "agent-roles/mother-role-blueprint/v1"
    assert "write_scope" in blueprint_schema["required"]

    scorecard_schema = json.loads(
        ROLE_ROOT.joinpath("schemas/candidate-scorecard.schema.json").read_text(encoding="utf-8")
    )
    assert scorecard_schema["properties"]["schema"]["const"] == "agent-roles/mother-candidate-scorecard/v1"
    assert "candidates" in scorecard_schema["required"]

    evaluation_schema = json.loads(
        ROLE_ROOT.joinpath("schemas/evaluation-report.schema.json").read_text(encoding="utf-8")
    )
    assert evaluation_schema["properties"]["schema"]["const"] == "agent-roles/mother-evaluation-report/v1"
    assert "behavior_fixtures" in evaluation_schema["required"]


def test_mother_skills_have_yaml_frontmatter() -> None:
    for skill_path in sorted(ROLE_ROOT.glob("skills/*/SKILL.md")):
        text = skill_path.read_text(encoding="utf-8")
        assert text.startswith("---\n"), skill_path
        closing = text.find("\n---\n", 4)
        assert closing > 0, skill_path
        frontmatter = text[4:closing]
        assert "\nname:" in f"\n{frontmatter}", skill_path
        assert "\ndescription:" in f"\n{frontmatter}", skill_path


def test_mother_artifact_schemas_accept_golden_samples() -> None:
    schemas = {
        path.stem.removesuffix(".schema"): json.loads(path.read_text(encoding="utf-8"))
        for path in ROLE_ROOT.joinpath("schemas").glob("*.schema.json")
    }

    research_evidence = {
        "schema": "agent-roles/mother-research-evidence/v1",
        "request": "Create a database performance Role.",
        "access_date": "2026-06-14",
        "sources": [
            {
                "id": "official-docs",
                "kind": "url",
                "locator": "https://example.invalid/docs",
                "access_date": "2026-06-14",
                "authority": "official",
                "license": {"status": "known", "value": "Apache-2.0"},
                "provenance": {
                    "copy_treatment": "synthesized",
                    "blocking_status": "clear",
                    "notes": "Patterns only; no copied source.",
                },
                "inspected": ["docs/index.md"],
                "extracted_facts": ["The tool supports explain-plan capture."],
                "confidence": "high",
                "design_impact": "Use a deterministic explain-plan checklist.",
            }
        ],
    }
    _assert_schema_accepts(schemas["research-evidence"], research_evidence)

    scorecard = {
        "schema": "agent-roles/mother-candidate-scorecard/v1",
        "request": "Create a database performance Role.",
        "access_date": "2026-06-14",
        "user_priorities": ["license safety", "testability"],
        "candidates": [
            {
                "id": "official-docs",
                "source_id": "official-docs",
                "locator": "https://example.invalid/docs",
                "hard_gates": {
                    "license": "pass",
                    "secrets_runtime_state": "pass",
                    "maintenance": "pass",
                    "host_fit": "pass",
                    "testability": "pass",
                    "role_shape_fit": "pass",
                },
                "scores": {
                    "relevance": 3,
                    "authority": 3,
                    "license": 3,
                    "host_fit": 2,
                    "runtime_boundary": 3,
                    "dependency_risk": 2,
                    "security": 3,
                    "testability": 3,
                    "role_shape_fit": 3,
                },
                "confidence": "high",
                "status": "recommended",
            },
            {
                "id": "unclear-blog",
                "source_id": "unclear-blog",
                "locator": "https://example.invalid/blog",
                "hard_gates": {
                    "license": "unknown",
                    "secrets_runtime_state": "pass",
                    "maintenance": "unknown",
                    "host_fit": "pass",
                    "testability": "fail",
                    "role_shape_fit": "needs_user_decision",
                },
                "scores": {
                    "relevance": 1,
                    "authority": 0,
                    "license": 0,
                    "host_fit": 1,
                    "runtime_boundary": 1,
                    "dependency_risk": 0,
                    "security": 1,
                    "testability": 0,
                    "role_shape_fit": 1,
                },
                "confidence": "low",
                "status": "reject",
                "reject_reason": "Unknown license and weak testability.",
            },
        ],
        "decisions": {
            "recommended_candidate": "official-docs",
            "rejected_candidates": ["unclear-blog"],
            "user_priority_overrides": ["license safety over novelty"],
            "next_action": "produce_blueprint",
        },
    }
    _assert_schema_accepts(schemas["candidate-scorecard"], scorecard)

    blueprint = {
        "schema": "agent-roles/mother-role-blueprint/v1",
        "role_id": "agentroles.db_perf",
        "name": "Database Performance Reviewer",
        "aliases": ["db-perf"],
        "catalog_level": "preview",
        "version_strategy": "Start at 0.1.0 for first preview.",
        "purpose": "Review database performance risks.",
        "responsibilities": ["Analyze query plans."],
        "non_goals": ["Mutate production databases."],
        "shape_decision": {
            "decision": "single_role",
            "rationale": "One specialist identity owns the workflow.",
            "unsupported_surfaces": [],
        },
        "contents": {"skills": ["skills/query-plan-review"]},
        "permissions": {
            "read_files": True,
            "write_files": False,
            "network": False,
            "secrets": "none",
        },
        "adapters": {"codex": {"display_name": "db-perf"}},
        "provenance": [
            {
                "source_id": "official-docs",
                "locator": "https://example.invalid/docs",
                "access_date": "2026-06-14",
                "license": {"status": "known", "value": "Apache-2.0"},
                "copy_treatment": "synthesized",
                "confidence": "high",
                "blocking_status": "clear",
                "notes": "No copied examples.",
            }
        ],
        "validation_plan": ["Parse TOML.", "Run list/resolve."],
        "write_scope": {
            "create": ["roles/db-perf/role.toml"],
            "modify": [],
            "do_not_touch": ["provider-state/"],
            "stop_conditions": ["License uncertainty."],
        },
    }
    _assert_schema_accepts(schemas["role-blueprint"], blueprint)

    evaluation = {
        "schema": "agent-roles/mother-evaluation-report/v1",
        "role_id": "agentroles.db_perf",
        "version": "0.1.0",
        "catalog_level": "preview",
        "source_path": "roles/db-perf",
        "evaluation_date": "2026-06-14",
        "checks": [{"name": "TOML parse", "result": "pass", "evidence": "tomllib parsed role.toml"}],
        "behavior_fixtures": [
            {
                "realistic_prompt": "Review this query plan.",
                "expected_behavior": "Identify slow joins and indexing risks.",
                "negative_prompt": "Apply the migration to production.",
                "expected_negative_behavior": "Refuse mutation and ask for review scope.",
            }
        ],
        "findings": {"blockers": [], "major": [], "minor": [], "suggestions": []},
        "recommendation": {
            "publication": "ready_with_risks",
            "residual_risks": ["Needs human database expert review."],
            "human_review_required": True,
        },
    }
    _assert_schema_accepts(schemas["evaluation-report"], evaluation)


def test_mother_installs_and_aliases_resolve_from_catalog(tmp_path: Path, monkeypatch, capsys) -> None:
    assert canonical_role_id("mother", sources=(REPO_ROOT,)) == "agentroles.mother"
    assert canonical_role_id("role-author", sources=(REPO_ROOT,)) == "agentroles.mother"
    assert canonical_role_id("role-auditor", sources=(REPO_ROOT,)) == "agentroles.mother"
    assert set(aliases_for("agentroles.mother", sources=(REPO_ROOT,))) == {
        "mother",
        "role-auditor",
        "role-author",
        "role-mother",
    }

    install = _run_json(["install", "role-author"], tmp_path, monkeypatch, capsys)
    assert install["role_status"] == "installed"
    assert install["role_id"] == "agentroles.mother"
    assert install["version"] == "0.2.2"
    assert install["catalog_level"] == "preview"

    resolved = _run_json(["resolve", "role-auditor"], tmp_path, monkeypatch, capsys)
    assert resolved["status"] == "ok"
    assert resolved["requested_role_id"] == "role-auditor"
    assert resolved["role_id"] == "agentroles.mother"
    assert resolved["installed"] is True


def test_mother_list_discovers_role_from_clean_store(tmp_path: Path, monkeypatch, capsys) -> None:
    listing = _run_json(["list"], tmp_path, monkeypatch, capsys)
    rows = {row["role_id"]: row for row in listing["roles"]}

    assert "agentroles.mother" in rows
    row = rows["agentroles.mother"]
    assert row["version"] == "0.2.2"
    assert row["catalog_level"] == "preview"
    assert row["status"] == "available"
    assert row["update_reason"] == "not_installed"
    assert set(row["aliases"]) == {"mother", "role-auditor", "role-author", "role-mother"}


def test_mother_inventory_script_classifies_external_source(tmp_path: Path) -> None:
    source = tmp_path / "external"
    source.joinpath("skills", "demo", "references").mkdir(parents=True)
    source.joinpath("scripts").mkdir()
    source.joinpath("plugins", "demo").mkdir(parents=True)
    source.joinpath("tests").mkdir()
    source.joinpath("sessions").mkdir()

    source.joinpath("skills", "demo", "SKILL.md").write_text(
        "---\nname: demo\n---\nUse scripts/run.mjs and references/rules.md.\n",
        encoding="utf-8",
    )
    source.joinpath("skills", "demo", "references", "rules.md").write_text("Rules.\n", encoding="utf-8")
    source.joinpath("scripts", "run.mjs").write_text("await writeFile('docs/.ccb/state.json', '{}');\n", encoding="utf-8")
    source.joinpath("plugins", "demo", "plugin.json").write_text('{"name":"demo"}\n', encoding="utf-8")
    source.joinpath("package.json").write_text('{"name":"demo"}\n', encoding="utf-8")
    source.joinpath("tests", "demo.test.mjs").write_text("console.log('ok');\n", encoding="utf-8")
    source.joinpath("LICENSE").write_text("MIT\n", encoding="utf-8")
    source.joinpath("sessions", "provider-session.json").write_text("{}\n", encoding="utf-8")

    result = subprocess.run(
        [sys.executable, str(ROLE_ROOT / "scripts" / "inventory_external_source.py"), str(source)],
        check=True,
        text=True,
        capture_output=True,
    )
    payload = json.loads(result.stdout)

    assert payload["schema"] == "agent-roles/mother-source-inventory/v1"
    categories = payload["categories"]
    assert categories["skills"] == ["skills/demo"]
    assert "skills/demo/references/rules.md" in categories["references"]
    assert "scripts/run.mjs" in categories["scripts"]
    assert "plugins/demo/plugin.json" in categories["plugin_manifests"]
    assert "package.json" in categories["package_metadata"]
    assert "tests/demo.test.mjs" in categories["tests"]
    assert "LICENSE" in categories["licenses"]
    assert "sessions/provider-session.json" in categories["suspicious_paths"]
    assert "project_ccb_state" in payload["text_matches"]
    assert "write_api" in payload["text_matches"]
    assert "scripts/run.mjs" in payload["reference_mentions"]["skills/demo/SKILL.md"]
    assert "references/rules.md" in payload["reference_mentions"]["skills/demo/SKILL.md"]
