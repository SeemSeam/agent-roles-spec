#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CCB ADR-0030 节点 manifest lint 工具。"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

try:
    import yaml
except ImportError as exc:  # pragma: no cover - 运行环境缺依赖时给出明确错误
    raise SystemExit("ERROR: 需要 PyYAML：pip install pyyaml") from exc


RULES = [
    "node_id_in_canonical_7",
    "applicable_kinds_declared",
    "transitions_refs_only",
    "transition_id_exists",
    "transition_target_match",
    "guard_refs_exist",
    "capability_id_exists_in_global",
    "primitive_ref_exists",
    "parallel_join_disabled_v032",
    "governance_critical_capability_must_have",
    "exit_conditions_non_empty",
    "batch_dot_check",
    "expr_unsupported_syntax",
    "hierarchy_state_contract",
    "hierarchy_lifecycle_contract",
    "hierarchy_task_breakdown_contract",
    "hierarchy_capability_guard_transition_contract",
    "hierarchy_template_contract",
    "hierarchy_release_doc_contract",
]

CONSULT_BRIEF_RULES = [
    "consult_brief_required_sections",
    "consult_brief_user_verbatim_nonempty",
    "consult_brief_claude_interpretation_nonempty",
    "consult_brief_ambiguities_explicit",
    "consult_brief_fidelity_diff_explicit",
    "semantic_anchor_required",
    "semantic_anchor_required_fields",
    "semantic_anchor_forbidden_expansions_complete",
    "semantic_anchor_expansion_risk_value",
]

CONSULT_BRIEF_REQUIRED_SECTIONS = [
    "user_verbatim",
    "claude_interpretation",
    "ambiguities",
    "fidelity_diff",
]

SEMANTIC_ANCHOR_FIELDS = [
    "verbatim",
    "allowed_scope",
    "forbidden_expansions",
    "expansion_risk",
]

SEMANTIC_ANCHOR_FORBIDDEN_EXPANSIONS = [
    "integrate",
    "fork",
    "depend",
    "adapter",
    "runtime adoption",
    "overlay",
    "direct DB coupling",
]


@dataclass
class Issue:
    severity: str
    rule_id: str
    message: str


@dataclass
class Registry:
    canonical_nodes: set[str]
    transition_targets: dict[str, str]
    guard_ids: set[str]
    capability_ids: set[str]
    governance_critical: set[str]
    primitive_ids: set[str]
    state_paths: set[str]
    artifact_namespaces: set[str]
    transition_forbidden_fields: set[str]
    kernel_dir: Path
    state_data: dict[str, Any]


def read_yaml(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def list_values(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def walk(obj: Any) -> Iterable[Any]:
    yield obj
    if isinstance(obj, dict):
        for value in obj.values():
            yield from walk(value)
    elif isinstance(obj, list):
        for value in obj:
            yield from walk(value)


def values_by_key(obj: Any, keys: set[str]) -> list[Any]:
    found: list[Any] = []
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key in keys:
                found.append(value)
            found.extend(values_by_key(value, keys))
    elif isinstance(obj, list):
        for value in obj:
            found.extend(values_by_key(value, keys))
    return found


def infer_target_from_transition_id(transition_id: str) -> str:
    if "__to__" not in transition_id:
        return ""
    target = transition_id.rsplit("__to__", 1)[1]
    return "__terminal__" if target == "terminal" else target


def load_transition_targets(path: Path) -> dict[str, str]:
    text = read_text(path)
    targets: dict[str, str] = {}
    current_id: str | None = None
    current_target: str | None = None
    heading = re.compile(r"^####\s+`([^`]+)`")
    target_line = re.compile(r"^\s*-\s+\*\*target_node\*\*:\s+`?([^`（\s]+)`?")

    def flush() -> None:
        nonlocal current_id, current_target
        if current_id:
            targets[current_id] = current_target or infer_target_from_transition_id(current_id)
        current_id = None
        current_target = None

    for line in text.splitlines():
        match = heading.match(line)
        if match:
            flush()
            current_id = match.group(1)
            continue
        if current_id:
            target = target_line.match(line)
            if target:
                current_target = target.group(1)
    flush()
    return targets


def load_guard_ids(path: Path) -> set[str]:
    return set(re.findall(r"^###\s+`((?:pre|post|inv|hook)_[a-z0-9_]+)`", read_text(path), re.M))


def load_capabilities(path: Path) -> tuple[set[str], set[str]]:
    data = read_yaml(path)
    capability_ids: set[str] = set()
    governance_critical: set[str] = set()
    for cap in data.get("capabilities", []):
        cap_id = cap.get("capability_id")
        if not cap_id:
            continue
        capability_ids.add(cap_id)
        if cap.get("criticality") == "governance_critical":
            governance_critical.add(cap_id)
    return capability_ids, governance_critical


def load_primitive_ids(path: Path) -> set[str]:
    text = read_text(path)
    block = re.search(r"## 3\. 原语分类与触发规则(?P<body>.*?)(?=\n## 4\.|\Z)", text, re.S)
    body = block.group("body") if block else text
    ids = set(re.findall(r"^\|\s*([a-z][a-z0-9_]*)\s*\|", body, re.M))
    return ids - {"原语"}


def add_schema_paths(prefix: str, fields: dict[str, Any]) -> set[str]:
    paths: set[str] = set()
    for field_name, spec in fields.items():
        base = f"{prefix}.{field_name}"
        paths.add(base)
        if not isinstance(spec, dict):
            continue
        for nested_name in (spec.get("schema") or {}).keys():
            paths.add(f"{base}.{nested_name}")
        for nested_name in (spec.get("derived_fields") or {}).keys():
            paths.add(f"{base}.{nested_name}")
    return paths


def load_state_registry(path: Path) -> tuple[set[str], set[str], set[str]]:
    data = read_yaml(path)
    canonical_nodes = set(data["enums"]["current_node"]["values"])
    paths: set[str] = set()
    paths |= add_schema_paths("task", data["dev_task"]["fields"])
    paths |= add_schema_paths("batch_state", data["batch_state"]["fields"])

    artifact_namespaces = set((data.get("artifact_namespaces") or {}).keys())
    for namespace, spec in (data.get("artifact_namespaces") or {}).items():
        for example in spec.get("examples", []) or []:
            paths.add(example)
        fields = spec.get("fields") or {}
        if isinstance(fields, dict):
            paths.update(fields.keys())
    return canonical_nodes, paths, artifact_namespaces


def load_forbidden_transition_fields(path: Path) -> set[str]:
    # node-manifest-schema.yaml 是说明型 YAML，部分 type 字段不是严格 YAML 标量；
    # 这里只抽取 transition_ref.forbidden_fields.list，不要求整文件 safe_load。
    text = read_text(path)
    match = re.search(r"forbidden_fields:.*?list:\s*\n(?P<body>(?:\s+-[^\n]+\n)+)", text, re.S)
    fields: set[str] = set()
    if match:
        for line in match.group("body").splitlines():
            item = re.sub(r"#.*$", "", line).strip()
            if item.startswith("-"):
                fields.add(item[1:].strip())
    return fields | {"source_node"}


def load_registry(kernel_dir: Path) -> Registry:
    state_path = kernel_dir / "state-schema.yaml"
    registries_dir = kernel_dir / "registries"
    canonical_nodes, state_paths, artifact_namespaces = load_state_registry(state_path)
    capability_ids, governance_critical = load_capabilities(kernel_dir / "capabilities" / "global.yaml")
    return Registry(
        canonical_nodes=canonical_nodes,
        transition_targets=load_transition_targets(registries_dir / "transition-table.md"),
        guard_ids=load_guard_ids(registries_dir / "guard-registry.md"),
        capability_ids=capability_ids,
        governance_critical=governance_critical,
        primitive_ids=load_primitive_ids(kernel_dir / "primitive-executor-contract.md"),
        state_paths=state_paths,
        artifact_namespaces=artifact_namespaces,
        transition_forbidden_fields=load_forbidden_transition_fields(registries_dir / "node-manifest-schema.yaml"),
        kernel_dir=kernel_dir,
        state_data=read_yaml(state_path),
    )


def iter_steps(manifest: dict[str, Any]) -> Iterable[dict[str, Any]]:
    for step in manifest.get("fixed_actions", {}).get("steps", []) or []:
        if isinstance(step, dict):
            yield step
    for subflow in manifest.get("subflows", []) or []:
        if not isinstance(subflow, dict):
            continue
        for step in subflow.get("steps", []) or []:
            if isinstance(step, dict):
                yield step


def iter_capability_requirements(manifest: dict[str, Any]) -> Iterable[dict[str, Any]]:
    required = manifest.get("required_capabilities", {}).get("must_have", []) or []
    optional = manifest.get("optional_capabilities", {}).get("nice_to_have", []) or []
    for item in required + optional:
        if isinstance(item, dict):
            yield item


def collect_guard_refs(manifest: dict[str, Any]) -> list[str]:
    refs: list[str] = []
    for raw in values_by_key(manifest, {"guard_refs", "hook_dependencies"}):
        refs.extend(str(item) for item in list_values(raw))
    guards = manifest.get("guards") or {}
    for key in ("node_pre", "action_post", "transition", "hook_dependencies"):
        refs.extend(str(item) for item in list_values(guards.get(key)))
    return [ref for ref in refs if ref]


def collect_capability_ids(manifest: dict[str, Any]) -> list[str]:
    ids: list[str] = []
    for raw in values_by_key(manifest, {"capability_id"}):
        if isinstance(raw, str):
            ids.append(raw)
    return ids


def collect_relevant_strings(manifest: dict[str, Any]) -> list[str]:
    strings: list[str] = []
    artifacts = manifest.get("entry_conditions", {}).get("artifacts", {}) or {}
    for key in ("all_of", "any_of"):
        strings.extend(str(item) for item in artifacts.get(key, []) or [])
    for step in iter_steps(manifest):
        for key in ("when", "must_produce"):
            raw = step.get(key)
            strings.extend(str(item) for item in list_values(raw))
    for subflow in manifest.get("subflows", []) or []:
        if not isinstance(subflow, dict):
            continue
        for key in ("activation_condition", "done_when"):
            if subflow.get(key) is not None:
                strings.append(str(subflow[key]))
    for cap in iter_capability_requirements(manifest):
        if cap.get("when") is not None:
            strings.append(str(cap["when"]))
    for item in manifest.get("provenance_required", []) or []:
        if not isinstance(item, dict):
            continue
        for key in ("field", "when"):
            if item.get(key) is not None:
                strings.append(str(item[key]))
    exits = manifest.get("exit_conditions") or {}
    for key in ("all_of", "any_of"):
        strings.extend(str(item) for item in exits.get(key, []) or [])
    return strings


def normalize_ref(ref: str) -> str:
    ref = ref.strip("'\"")
    ref = re.sub(r"\[\]|\[\*\]", "", ref)
    ref = re.sub(r"\s*\(=.*$", "", ref).strip()
    return ref


def collect_field_refs(strings: list[str]) -> set[str]:
    refs: set[str] = set()
    pattern = re.compile(r"\b([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z0-9_\.\[\]\*]+)")
    for text in strings:
        for ns, rest in pattern.findall(text):
            if ns == "subflows":
                continue  # subflows 是 manifest-local 输出，不属于 artifact namespace。
            refs.add(normalize_ref(f"{ns}.{rest}"))
    return refs


def check_field_ref(ref: str, registry: Registry) -> str | None:
    namespace = ref.split(".", 1)[0]
    if namespace == "batch":
        return "使用了 batch.*；v0.3.2 只允许 batch_state.*"
    if namespace not in registry.artifact_namespaces:
        return f"未知 artifact namespace: {namespace}"
    if namespace in {"task", "batch_state", "project", "codex", "loop"} and ref not in registry.state_paths:
        return f"字段未在 state-schema.yaml / artifact_namespaces 中定义: {ref}"
    return None


def lint_manifest(path: Path, registry: Registry) -> list[Issue]:
    manifest = read_yaml(path)
    issues: list[Issue] = []

    def error(rule_id: str, message: str) -> None:
        issues.append(Issue("ERROR", rule_id, message))

    node_id = manifest.get("node_id")
    if node_id not in registry.canonical_nodes:
        error("node_id_in_canonical_7", f"node_id={node_id!r} 不在 canonical 7 节点集合中")
    if manifest.get("applicable_kinds") != ["subtask"]:
        error("applicable_kinds_declared", "7 节点 manifest 必须显式声明 applicable_kinds: [subtask]")

    for index, transition in enumerate(manifest.get("transitions", []) or []):
        if not isinstance(transition, dict):
            error("transitions_refs_only", f"transitions[{index}] 不是对象")
            continue
        extra = set(transition.keys()) - {"transition_id", "target_node"}
        forbidden = extra | (set(transition.keys()) & registry.transition_forbidden_fields)
        if extra or forbidden:
            error("transitions_refs_only", f"transitions[{index}] 含非法字段: {sorted(extra | forbidden)}")
        transition_id = transition.get("transition_id")
        target_node = transition.get("target_node")
        expected = registry.transition_targets.get(str(transition_id))
        if not expected:
            error("transition_id_exists", f"transition_id 未注册: {transition_id}")
        elif target_node != expected:
            error("transition_target_match", f"{transition_id} target_node={target_node!r}，应为 {expected!r}")

    for guard_id in sorted(set(collect_guard_refs(manifest))):
        if guard_id not in registry.guard_ids:
            error("guard_refs_exist", f"guard_id 未注册: {guard_id}")

    for capability_id in sorted(set(collect_capability_ids(manifest))):
        if capability_id not in registry.capability_ids:
            error("capability_id_exists_in_global", f"capability_id 未注册: {capability_id}")

    for step in iter_steps(manifest):
        if step.get("action_type") == "primitive":
            ref = step.get("ref")
            if ref not in registry.primitive_ids:
                error("primitive_ref_exists", f"step {step.get('step_id')} 引用未知 primitive: {ref}")

    for obj in walk(manifest):
        if isinstance(obj, dict):
            if obj.get("execution_mode") not in (None, "sequential"):
                error("parallel_join_disabled_v032", f"execution_mode={obj.get('execution_mode')!r}，v0.3.2 只允许 sequential")
            for key in ("branches", "join_condition"):
                if key in obj:
                    error("parallel_join_disabled_v032", f"v0.3.2 禁止字段: {key}")

    for cap in iter_capability_requirements(manifest):
        cap_id = cap.get("capability_id")
        if cap_id in registry.governance_critical and cap.get("on_missing") not in {"escalate", "hard_fail"}:
            error("governance_critical_capability_must_have", f"{cap_id} on_missing 必须是 escalate 或 hard_fail")

    exits = manifest.get("exit_conditions") or {}
    all_of = exits.get("all_of") or []
    any_of = exits.get("any_of") or []
    if not all_of and not any_of:
        error("exit_conditions_non_empty", "exit_conditions 必须包含至少 1 条 all_of 或 any_of")

    relevant_strings = collect_relevant_strings(manifest)
    for text in relevant_strings:
        if re.search(r"(?<![A-Za-z0-9_])batch\.", text):
            error("batch_dot_check", f"发现 batch.* 引用，请改用 batch_state.*: {text}")
        if re.search(r"\[-\d+\]|\.[A-Za-z_][A-Za-z0-9_]*\(", text):
            error("expr_unsupported_syntax", f"表达式包含 v0.3.2 未支持语法: {text}")

    for ref in sorted(collect_field_refs(relevant_strings)):
        problem = check_field_ref(ref, registry)
        if problem:
            error("batch_dot_check" if ref.startswith("batch.") else "expr_unsupported_syntax", problem)

    return issues


def lint_markdown_manifest(path: Path, registry: Registry) -> list[Issue]:
    text = read_text(path)
    issues: list[Issue] = []

    def error(rule_id: str, message: str) -> None:
        issues.append(Issue("ERROR", rule_id, message))

    matched = re.match(r"^---\n(?P<body>.*?)\n---\n", text, re.S)
    frontmatter = yaml.safe_load(matched.group("body")) if matched else {}
    node_id = frontmatter.get("node_id") if isinstance(frontmatter, dict) else None
    if node_id not in registry.canonical_nodes:
        error("node_id_in_canonical_7", f"node_id={node_id!r} 不在 canonical 7 节点集合中")
    if frontmatter.get("schema_version") != "ccb-node-manifest-md-v1":
        error("manifest_schema_version", "Markdown node manifest 必须声明 schema_version: ccb-node-manifest-md-v1")
    if frontmatter.get("status") != "active":
        error("manifest_status_active", "Markdown node manifest 必须声明 status: active")

    required_sections = [
        "什么时候进入这个模式",
        "进入后大概怎么做",
        "什么时候算这个模式完成",
        "不能干什么",
        "推荐的 sc 指令",
        "好 / 中等 / 坏输出样例",
    ]
    for section in required_sections:
        if section not in text:
            error("markdown_manifest_sections", f"缺少 ADR-0030 六段章节: {section}")

    if re.search(r"\bepic\b|Epic|parent_epic_id|epic_status|spec_section_id|kind=epic", text):
        error("two_tier_manifest_contract", "active Markdown node manifest 不得引用实体级 epic 三层协议")

    return issues


def lint_hierarchy_contract(root: Path, kernel_dir: Path, registry: Registry) -> tuple[Path, list[Issue]]:
    issues: list[Issue] = []

    def error(rule_id: str, message: str) -> None:
        issues.append(Issue("ERROR", rule_id, message))

    state = registry.state_data
    enums = state.get("enums") or {}
    fields = state.get("dev_task", {}).get("fields") or {}
    requirement_status = set((enums.get("requirement_status") or {}).get("values") or [])
    expected_requirement_status = {"drafting", "planning", "delivering", "delivered", "deferred", "cancelled"}
    if requirement_status != expected_requirement_status:
        error(
            "hierarchy_state_contract",
            f"enum requirement_status={sorted(requirement_status)}，应为 {sorted(expected_requirement_status)}",
        )
    for retired_enum in ["task_kind", "epic_status"]:
        if retired_enum in enums:
            error("hierarchy_state_contract", f"state-schema 不应再定义退役 enum: {retired_enum}")

    required_task_fields = ["requirement_id", "section_id", "order", "implementation_owner"]
    missing_fields = [field for field in required_task_fields if field not in fields]
    if missing_fields:
        error("hierarchy_state_contract", f"dev_task 缺少两层字段: {', '.join(missing_fields)}")
    for retired_field in ["kind", "parent_epic_id", "spec_section_id", "epic_status"]:
        if retired_field in fields:
            error("hierarchy_state_contract", f"dev_task 不应再定义退役字段: {retired_field}")

    invariant_text = read_text(kernel_dir / "state-schema.yaml")
    for snippet in ["kind=epic", "parent_epic_id", "epic_status", "spec_section_id", "produced.epic"]:
        if snippet in invariant_text:
            error("hierarchy_state_contract", f"state-schema 仍含退役三层片段: {snippet}")

    lifecycle_dir = kernel_dir / "lifecycles"
    epic_lifecycle = lifecycle_dir / "epic_lifecycle.yaml"
    requirement_lifecycle = lifecycle_dir / "requirement_lifecycle.yaml"
    if epic_lifecycle.exists():
        error("hierarchy_lifecycle_contract", "active kernel 不应再包含 lifecycles/epic_lifecycle.yaml")
    if not requirement_lifecycle.exists():
        error("hierarchy_lifecycle_contract", "缺少 lifecycles/requirement_lifecycle.yaml")
    else:
        requirement = read_yaml(requirement_lifecycle)
        if requirement.get("lifecycle_id") != "requirement" or requirement.get("applicable_to", {}).get("table") != "Requirement":
            error("hierarchy_lifecycle_contract", "requirement_lifecycle applicable_to 必须指向 Requirement 表")
        if re.search(r"\bepic\b|epic_|parent_epic_id|epic_status|spec_section_id", read_text(requirement_lifecycle)):
            error("hierarchy_lifecycle_contract", "requirement_lifecycle 不应再引用实体级 epic 三层协议")

    capability_text = read_text(kernel_dir / "capabilities" / "global.yaml")
    for snippet in ["epic.", "parent_epic_id", "epic_status", "spec_section_id", "applicable_kinds_check"]:
        if snippet in capability_text:
            error("hierarchy_capability_guard_transition_contract", f"global capabilities 仍含退役三层片段: {snippet}")
    for capability_id in ["requirement.publish", "requirement.promote"]:
        if capability_id not in registry.capability_ids:
            error("hierarchy_capability_guard_transition_contract", f"capability 未注册: {capability_id}")

    schema_text = read_text(kernel_dir / "schemas" / "breakdown-draft.schema.yaml")
    if "plan:" not in schema_text or "- plan" not in schema_text:
        error("hierarchy_task_breakdown_contract", "breakdown-draft schema 必须使用 required plan 段")
    if re.search(r"\bepic\b|parent_epic_id|epic_status|spec_section_id", schema_text):
        error("hierarchy_task_breakdown_contract", "breakdown-draft schema 不应再引用实体级 epic 三层协议")

    for manifest_path in sorted((kernel_dir / "nodes").glob("*.node.md")):
        manifest_text = read_text(manifest_path)
        if re.search(r"\bepic\b|Epic|parent_epic_id|epic_status|spec_section_id|kind=epic", manifest_text):
            error("hierarchy_task_breakdown_contract", f"active node manifest 仍含退役三层片段: {manifest_path.name}")

    templates_dir = root / "templates"
    if not (templates_dir / "docs" / "03_开发计划" / "_模板_开发任务.md").exists():
        error("hierarchy_template_contract", "缺少 template: docs/03_开发计划/_模板_开发任务.md")

    for doc in [
        root / "references" / "task-hierarchy-model.md",
        root / "CHANGELOG.md",
        root / "references" / "kernel-upgrade-guide-v0.5.0.md",
        root / "references" / "plugin-version-matrix.md",
    ]:
        if not doc.exists():
            error("hierarchy_release_doc_contract", f"缺少发布/引用文档: {doc.relative_to(root)}")

    return kernel_dir / "hierarchy-contract", issues


def section_heading_re(name: str) -> re.Pattern[str]:
    return re.compile(rf"^\s*(?:#{{1,6}}\s*)?(?:§[A-Za-z0-9_.-]+\s+)?{re.escape(name)}\s*:?\s*$", re.I)


def any_consult_section_re() -> re.Pattern[str]:
    names = CONSULT_BRIEF_REQUIRED_SECTIONS + ["semantic_anchor"]
    joined = "|".join(re.escape(name) for name in names)
    return re.compile(rf"^\s*(?:#{{1,6}}\s*)?(?:§[A-Za-z0-9_.-]+\s+)?(?:{joined})\s*:?\s*$", re.I)


def consult_section_body(text: str, name: str) -> str | None:
    lines = text.splitlines()
    start: int | None = None
    heading = section_heading_re(name)
    markdown_heading = re.compile(r"^\s*#{1,6}\s+\S+")

    for index, line in enumerate(lines):
        if heading.match(line):
            start = index + 1
            break
    if start is None:
        return None

    end = len(lines)
    in_fence = False
    for index in range(start, len(lines)):
        line = lines[index]
        if line.strip().startswith("```"):
            in_fence = not in_fence
            continue
        if not in_fence and markdown_heading.match(line):
            end = index
            break
    return "\n".join(lines[start:end]).strip()


def has_meaningful_body(body: str) -> bool:
    stripped = [line.strip() for line in body.splitlines() if line.strip()]
    if not stripped:
        return False
    joined = "\n".join(stripped).lower()
    return not re.fullmatch(r"(?s)(?:[-*]\s*)?(?:todo|tbd|待补|待定|placeholder)+", joined)


def lint_consult_brief(path: Path) -> list[Issue]:
    text = read_text(path)
    issues: list[Issue] = []

    def error(rule_id: str, message: str) -> None:
        issues.append(Issue("ERROR", rule_id, message))

    bodies = {name: consult_section_body(text, name) for name in CONSULT_BRIEF_REQUIRED_SECTIONS}
    missing = [name for name, body in bodies.items() if body is None]
    if missing:
        error("consult_brief_required_sections", f"缺少四段保真 section: {', '.join(missing)}")

    user_body = bodies.get("user_verbatim")
    if user_body is not None and not has_meaningful_body(user_body):
        error("consult_brief_user_verbatim_nonempty", "user_verbatim 必须保留用户原话，不能为空或占位")

    interpretation_body = bodies.get("claude_interpretation")
    if interpretation_body is not None and not has_meaningful_body(interpretation_body):
        error("consult_brief_claude_interpretation_nonempty", "claude_interpretation 必须显式标注 Claude 的解读")

    ambiguity_body = bodies.get("ambiguities")
    if ambiguity_body is not None and not (
        has_meaningful_body(ambiguity_body) or re.search(r"\b(none|n/a)\b|无|暂无", ambiguity_body, re.I)
    ):
        error("consult_brief_ambiguities_explicit", "ambiguities 必须列出歧义，或显式写 none/无")

    fidelity_body = bodies.get("fidelity_diff")
    if fidelity_body is not None and not re.search(
        r"\b(added|omitted|drift|none|no\s+diff)\b|新增|遗漏|走样|漂移|无", fidelity_body, re.I
    ):
        error("consult_brief_fidelity_diff_explicit", "fidelity_diff 必须说明 added/omitted/drift，或显式写 none/无")

    anchor_body = consult_section_body(text, "semantic_anchor")
    if anchor_body is None:
        error("semantic_anchor_required", "缺少 semantic_anchor block")
        return issues

    missing_fields = [field for field in SEMANTIC_ANCHOR_FIELDS if not re.search(rf"\b{re.escape(field)}\s*:", anchor_body)]
    if missing_fields:
        error("semantic_anchor_required_fields", f"semantic_anchor 缺少字段: {', '.join(missing_fields)}")

    anchor_lower = anchor_body.lower()
    missing_expansions = [term for term in SEMANTIC_ANCHOR_FORBIDDEN_EXPANSIONS if term.lower() not in anchor_lower]
    if missing_expansions:
        error(
            "semantic_anchor_forbidden_expansions_complete",
            f"forbidden_expansions 缺少: {', '.join(missing_expansions)}",
        )

    if not re.search(r"\bexpansion_risk\s*:\s*(pass|fail)\b", anchor_body, re.I):
        error("semantic_anchor_expansion_risk_value", "expansion_risk 必须是 pass 或 fail")

    return issues


def discover_manifests(kernel_dir: Path) -> list[Path]:
    return sorted((kernel_dir / "nodes").glob("*.node.md"))


def print_file_result(root: Path, path: Path, issues: list[Issue]) -> None:
    rel = path.relative_to(root).as_posix() if path.is_relative_to(root) else str(path)
    errors = [issue for issue in issues if issue.severity == "ERROR"]
    warnings = [issue for issue in issues if issue.severity == "WARNING"]
    status = "PASS" if not errors else "FAIL"
    print(f"FILE: {rel}")
    print(f"STATUS: {status}")
    print(f"ERRORS: {len(errors)}")
    print(f"WARNINGS: {len(warnings)}")
    for issue in issues:
        print(f"  [{issue.severity}] {issue.rule_id}: {issue.message}")
    print()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Lint CCB ADR-0030 node manifests",
        epilog=(
            "Consult brief 用法: python references/kernel/tools/lint_manifest.py "
            "--consult-brief path/to/brief.md"
        ),
    )
    parser.add_argument("manifests", nargs="*", help="manifest 文件路径；为空时校验 nodes/*.node.md")
    parser.add_argument("--root", type=Path, default=None, help="仓库根目录，默认从脚本位置推导")
    parser.add_argument(
        "--consult-brief",
        action="append",
        type=Path,
        default=[],
        help="校验 consult brief 四段保真与 semantic_anchor，可重复传入",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    script = Path(__file__).resolve()
    kernel_dir = script.parent.parent
    root = args.root.resolve() if args.root else kernel_dir.parent.parent

    if args.consult_brief:
        brief_paths = [path.resolve() for path in args.consult_brief]
        total_errors = 0
        total_warnings = 0
        passed = 0
        for brief_path in brief_paths:
            issues = lint_consult_brief(brief_path)
            errors = sum(1 for issue in issues if issue.severity == "ERROR")
            warnings = sum(1 for issue in issues if issue.severity == "WARNING")
            total_errors += errors
            total_warnings += warnings
            if errors == 0:
                passed += 1
            print_file_result(root, brief_path, issues)

        failed = len(brief_paths) - passed
        print("SUMMARY")
        print(f"FILES: {len(brief_paths)}")
        print(f"PASSED: {passed}")
        print(f"FAILED: {failed}")
        print(f"ERRORS: {total_errors} WARNINGS: {total_warnings}")
        print(f"ALL_GREEN: {'yes' if failed == 0 and total_errors == 0 else 'no'}")
        return 0 if failed == 0 and total_errors == 0 else 1

    registry = load_registry(kernel_dir)

    manifests = [Path(p).resolve() for p in args.manifests] if args.manifests else discover_manifests(kernel_dir)
    total_errors = 0
    total_warnings = 0
    passed = 0

    for manifest_path in manifests:
        issues = (
            lint_markdown_manifest(manifest_path, registry)
            if manifest_path.suffix == ".md"
            else lint_manifest(manifest_path, registry)
        )
        errors = sum(1 for issue in issues if issue.severity == "ERROR")
        warnings = sum(1 for issue in issues if issue.severity == "WARNING")
        total_errors += errors
        total_warnings += warnings
        if errors == 0:
            passed += 1
        print_file_result(root, manifest_path, issues)

    contract_path, contract_issues = lint_hierarchy_contract(root, kernel_dir, registry)
    contract_errors = sum(1 for issue in contract_issues if issue.severity == "ERROR")
    contract_warnings = sum(1 for issue in contract_issues if issue.severity == "WARNING")
    total_errors += contract_errors
    total_warnings += contract_warnings
    if contract_errors == 0:
        passed += 1
    print_file_result(root, contract_path, contract_issues)

    file_count = len(manifests) + 1
    failed = file_count - passed
    print("SUMMARY")
    print(f"FILES: {file_count}")
    print(f"PASSED: {passed}")
    print(f"FAILED: {failed}")
    print(f"ERRORS: {total_errors} WARNINGS: {total_warnings}")
    print(f"ALL_GREEN: {'yes' if failed == 0 and total_errors == 0 else 'no'}")
    return 0 if failed == 0 and total_errors == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
