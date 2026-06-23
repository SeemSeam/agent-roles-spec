#!/usr/bin/env bash

set -euo pipefail

# CCB PreToolUse hook: hook_block_askuser_in_autonomous
# 仅在 EventJournal 中最新 batch 授权为 autonomous-batch + user_approval_mode=none 且问题命中 decision_detector 时拒绝 AskUserQuestion。

INPUT_JSON="$(cat)"

json_string() {
  local key="$1"
  printf '%s' "$INPUT_JSON" |
    tr '\n' ' ' |
    sed -n "s/.*\"$key\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" |
    head -n 1
}

json_line_string() {
  local key="$1"
  local line="$2"
  printf '%s' "$line" |
    sed -n "s/.*\"$key\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" |
    head -n 1
}

contains_any() {
  local haystack="$1"
  shift
  local pattern
  for pattern in "$@"; do
    case "$haystack" in
      *"$pattern"*) return 0 ;;
    esac
  done
  return 1
}

tool_name="$(json_string tool_name)"
if [[ "$tool_name" != "AskUserQuestion" ]]; then
  exit 0
fi

cwd="$(json_string cwd)"
if [[ -z "$cwd" ]]; then
  cwd="$(pwd)"
fi

event_journal="$cwd/docs/.ccb/events/journal.jsonl"
latest_batch="$(grep -E '\"type\"[[:space:]]*:[[:space:]]*\"batch_authorization_completed\"' "$event_journal" 2>/dev/null | tail -n 1 || true)"
if [[ -z "$latest_batch" ]]; then
  exit 0
fi

policy_profile="$(json_line_string policy_profile "$latest_batch")"
user_approval_mode="$(json_line_string user_approval_mode "$latest_batch")"
if [[ "$policy_profile" != "autonomous-batch" || "$user_approval_mode" != "none" ]]; then
  exit 0
fi

question_body="$(json_string question_body)"
if [[ -z "$question_body" ]]; then
  question_body="$(json_string question)"
fi
if [[ -z "$question_body" ]]; then
  question_body="$(json_string prompt)"
fi
if [[ -z "$question_body" ]]; then
  question_body="$(json_string content)"
fi

question_lower="$(printf '%s' "$question_body" | tr '[:upper:]' '[:lower:]')"

stage_1_verbs=(
  "选哪个" "怎么选" "你来定" "请决定" "是否改" "要不要改" "保留还是替换" "采用哪种"
  "which to choose" "please decide" "choose between" "whether to change" "keep or replace"
  "which design" "which implementation" "override"
)
stage_2_objects=(
  "方案" "实现" "接口" "契约" "数据结构" "表结构" "状态流" "事务流" "依赖" "迁移" "架构"
  "design" "implementation" "interface" "contract" "schema" "state flow" "transaction flow"
  "dependency" "migration"
)
negative_allowlist=(
  "file" "path" "directory" "environment" "test" "summary" "log"
  "文件" "路径" "目录" "环境" "测试" "摘要" "日志"
)

if contains_any "$question_lower" "${negative_allowlist[@]}"; then
  exit 0
fi

if contains_any "$question_lower" "${stage_1_verbs[@]}" && contains_any "$question_lower" "${stage_2_objects[@]}"; then
  echo "当前 autonomous 模式禁止 ask_user_decision。请改 consult_codex / escalate_to_human（独立 channel，不走 AskUserQuestion）。" >&2
  exit 2
fi

exit 0
