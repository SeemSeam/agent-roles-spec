#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CCB task state markdown lint。"""

from __future__ import annotations

import argparse
import hashlib
import re
from pathlib import Path
from typing import Any

from lint_common import Issue, extract_frontmatter, read_text, repo_root, run_markdown_lint


REQUIRED_FIELDS = ["task_id", "status"]
HASH_RE = re.compile(r"^[0-9a-f]{64}$", re.I)
CANONICAL_TASK_STATUSES = {"reviewing", "done", "cancelled"}
POLICY_PROFILES = {"interactive-single", "autonomous-batch"}
LEGACY_POLICY_ALIASES = {"autonomous": "autonomous-batch"}
LEGACY_TASK_STATUS_ALIASES = {
    "proposed",
    "planning",
    "dispatch_ready",
    "dispatched",
    "waiting_for_user_arbitration",
    "replanning",
    "archived",
    "completed",
    "blocked",
    "epic_completed",
}
ENGINEERING_TOUCHPOINTS = {
    "U2_db_api_rename",
    "U3_task_status_derivation",
    "U5_migration_backfill",
}
REVERSIBILITY_CLASSES = {"reversible", "reversible_with_rollback"}
SCOPE_CLASSES = {"task_local", "module_local", "repo_local"}
CANONICAL_CONSISTENCY_CLASSES = {
    "projection_only",
    "api_compat_preserved",
    "existing_kernel_direction",
    "u1_u4_settled",
}
ENGINEERING_DECIDERS = {"claude", "codex_recommended", "codex-recommended"}


def is_blank(value: Any) -> bool:
    return value is None or value == ""


def is_legacy_archived_without_hotfixes(frontmatter: dict[str, Any]) -> bool:
    # 兼容旧 docs/.ccb/state real-run；新 dev_task 不应再写 archived。
    return (
        frontmatter.get("status") == "archived"
        and "hotfixes_adopted" not in frontmatter
        and str(frontmatter.get("created", "")) <= "2026-04-22"
    )


def is_legacy_archive_container_status(frontmatter: dict[str, Any]) -> bool:
    # 兼容 v0.3.3 之前的 epic container；新 dev_task 不应再写 epic_completed。
    return (
        (frontmatter.get("current_node") or frontmatter.get("currentNode")) == "archive"
        and frontmatter.get("status") == "epic_completed"
        and frontmatter.get("kind") == "planning_container"
        and str(frontmatter.get("created", "")) <= "2026-04-23"
    )


def resolve_repo_path(root: Path, raw: Any) -> Path | None:
    if is_blank(raw):
        return None
    return (root / str(raw)).resolve()


def non_empty_list(value: Any) -> bool:
    return isinstance(value, list) and len(value) > 0


def lint_policy_profile(frontmatter: dict[str, Any], warn, error) -> None:
    policy_profile = frontmatter.get("policy_profile")
    if is_blank(policy_profile):
        return
    profile = str(policy_profile)
    if profile in POLICY_PROFILES:
        return
    if profile in LEGACY_POLICY_ALIASES:
        warn(
            "state_policy_profile_legacy_alias",
            f"policy_profile={profile} 是历史别名；按 {LEGACY_POLICY_ALIASES[profile]} 兼容处理",
        )
        return
    error("state_policy_profile_enum", f"policy_profile 非法: {profile}")


def lint_engineering_decidable_decisions(frontmatter: dict[str, Any], error) -> None:
    decisions = frontmatter.get("engineering_decidable_decisions")
    if decisions is None:
        return
    if not isinstance(decisions, list):
        error("state_engineering_decidable_decisions_type", "engineering_decidable_decisions 必须是数组")
        return

    for index, decision in enumerate(decisions):
        prefix = f"engineering_decidable_decisions[{index}]"
        if not isinstance(decision, dict):
            error("state_engineering_decidable_decision_type", f"{prefix} 必须是对象")
            continue

        def field(name: str) -> Any:
            return decision.get(name)

        required = [
            "id",
            "decision_ref",
            "touchpoint",
            "summary",
            "evidence_list",
            "reversibility_class",
            "scope",
            "tests_ref",
            "canonical_consistency",
            "decided_by",
            "created_at",
        ]
        missing = [name for name in required if is_blank(field(name))]
        if missing:
            error(
                "state_engineering_decidable_required_fields",
                f"{prefix} 缺少必需字段: {', '.join(missing)}",
            )

        touchpoint = field("touchpoint")
        if touchpoint not in ENGINEERING_TOUCHPOINTS:
            error("state_engineering_decidable_touchpoint", f"{prefix}.touchpoint 不在 U2/U3/U5 范围内")

        if not non_empty_list(field("evidence_list")) or len(field("evidence_list") or []) < 2:
            error("state_engineering_decidable_evidence", f"{prefix}.evidence_list 至少需要 2 条证据")

        reversibility = field("reversibility_class")
        if reversibility not in REVERSIBILITY_CLASSES:
            error("state_engineering_decidable_reversibility", f"{prefix}.reversibility_class 非法")

        scope = field("scope")
        if not isinstance(scope, dict):
            error("state_engineering_decidable_scope", f"{prefix}.scope 必须是对象")
        else:
            if scope.get("class") not in SCOPE_CLASSES:
                error("state_engineering_decidable_scope", f"{prefix}.scope.class 非法")
            if not non_empty_list(scope.get("paths")):
                error("state_engineering_decidable_scope", f"{prefix}.scope.paths 必须非空")
            if scope.get("external_contract_impact") is not False:
                error("state_engineering_decidable_scope", f"{prefix}.scope.external_contract_impact 必须为 false")

        if not non_empty_list(field("tests_ref")):
            error("state_engineering_decidable_tests", f"{prefix}.tests_ref 必须非空")

        consistency = field("canonical_consistency")
        if not isinstance(consistency, dict):
            error("state_engineering_decidable_canonical", f"{prefix}.canonical_consistency 必须是对象")
        else:
            if consistency.get("class") not in CANONICAL_CONSISTENCY_CLASSES:
                error("state_engineering_decidable_canonical", f"{prefix}.canonical_consistency.class 非法")
            if consistency.get("changes_kernel_semantics") is not False:
                error(
                    "state_engineering_decidable_canonical",
                    f"{prefix}.canonical_consistency.changes_kernel_semantics 必须为 false；否则必须升级用户",
                )
            if touchpoint == "U3_task_status_derivation" and consistency.get("class") != "u1_u4_settled":
                error("state_engineering_decidable_u3_boundary", f"{prefix} 的 U3 必须声明 U1/U4 已 settled")
            if touchpoint == "U3_task_status_derivation" and len(consistency.get("required_decision_refs") or []) < 2:
                error("state_engineering_decidable_u3_boundary", f"{prefix} 的 U3 必须引用 U1/U4 决策 ref")

        # U5 和显式 rollback 类迁移必须有 rollback_ref，否则无法满足可逆性。
        if (touchpoint == "U5_migration_backfill" or reversibility == "reversible_with_rollback") and is_blank(
            field("rollback_ref")
        ):
            error("state_engineering_decidable_rollback", f"{prefix}.rollback_ref 必须存在")

        if field("decided_by") not in ENGINEERING_DECIDERS:
            error("state_engineering_decidable_decider", f"{prefix}.decided_by 必须是 claude/codex_recommended")


def lint_state(path: Path, root: Path) -> list[Issue]:
    text = read_text(path)
    try:
        frontmatter, _body = extract_frontmatter(text)
    except Exception as exc:
        if "_模板_" in path.name:
            return []
        return [Issue("ERROR", "state_frontmatter_yaml", f"frontmatter YAML 解析失败: {exc}")]
    issues: list[Issue] = []
    doc_type = frontmatter.get("doc_type")
    if doc_type is not None and doc_type != "dev_task":
        return issues
    if not frontmatter:
        return issues
    legacy_exempt = is_legacy_archived_without_hotfixes(frontmatter)

    def error(rule_id: str, message: str) -> None:
        issues.append(Issue("ERROR", rule_id, message))

    def warn(rule_id: str, message: str) -> None:
        issues.append(Issue("WARNING", rule_id, message))

    missing = [field for field in REQUIRED_FIELDS if field not in frontmatter]
    if "current_node" not in frontmatter and "currentNode" not in frontmatter:
        missing.append("current_node")
    if missing:
        message = f"frontmatter 缺少必需字段: {', '.join(missing)}"
        if legacy_exempt and "spec_hash" in missing:
            warn("state_required_fields_legacy_warn", message)
        else:
            error("state_required_fields", message)

    status = frontmatter.get("status")
    current_node = frontmatter.get("current_node") or frontmatter.get("currentNode")
    legacy_archive_container = is_legacy_archive_container_status(frontmatter)

    if status not in CANONICAL_TASK_STATUSES:
        if status in LEGACY_TASK_STATUS_ALIASES:
            warn("state_status_legacy_alias", f"status={status} 是旧 task_status；新 dev_task 仅允许 reviewing/done/cancelled")
        else:
            error("state_status_enum", f"status 非法: {status}")

    spec_path = resolve_repo_path(root, frontmatter.get("spec_path"))
    if spec_path is not None and not spec_path.exists():
        error("state_spec_path_exists", f"spec_path 不存在: {frontmatter.get('spec_path')}")

    spec_hash = frontmatter.get("spec_hash")
    if not is_blank(spec_hash):
        if not HASH_RE.match(str(spec_hash)):
            error("state_spec_hash_format", "spec_hash 必须是 64 位 sha256 hex")
        elif spec_path is not None and spec_path.exists():
            actual = hashlib.sha256(spec_path.read_bytes()).hexdigest()
            if actual.lower() != str(spec_hash).lower():
                error("state_spec_hash_matches_file", "spec_hash 与 spec_path 文件内容不匹配")

    if status == "done" and current_node != "archive":
        error("state_status_current_node_consistency", "status=done 时 current_node/currentNode 必须为 archive")
    if legacy_archive_container:
        warn(
            "state_status_current_node_legacy_alias",
            f"current_node=archive 的旧容器状态 {status} 按 done 兼容处理",
        )

    if status == "done" and is_blank(frontmatter.get("archived_at")):
        warn("state_archived_at_warn", "status=done 但缺少 archived_at")
    if "hotfixes_adopted" not in frontmatter:
        warn("state_hotfixes_adopted_warn", "缺少 hotfixes_adopted；旧任务可接受，新任务建议补齐")

    lint_policy_profile(frontmatter, warn, error)
    lint_engineering_decidable_decisions(frontmatter, error)

    return issues


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Lint CCB task state markdown")
    parser.add_argument("paths", nargs="+", type=Path, help="state 文件或目录")
    parser.add_argument("--root", type=Path, default=None, help="仓库根目录，默认自动推导")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = args.root.resolve() if args.root else repo_root()
    return run_markdown_lint(args.paths, lint_state, root)


if __name__ == "__main__":
    raise SystemExit(main())
