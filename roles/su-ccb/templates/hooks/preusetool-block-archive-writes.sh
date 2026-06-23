#!/usr/bin/env bash

set -euo pipefail

# CCB PreToolUse hook: hook_block_archive_writes_before_review
# 只在 Write/Edit 试图把 dev_task 从非 done 改为 done 且 review_status != passed 时拒绝。

INPUT_JSON="$(cat)"

json_string() {
  local key="$1"
  printf '%s' "$INPUT_JSON" |
    tr '\n' ' ' |
    sed -n "s/.*\"$key\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" |
    head -n 1
}

decode_json_text() {
  printf '%s' "$1" |
    sed 's/\\r//g; s/\\n/\
/g; s/\\"/"/g; s/\\t/	/g'
}

status_from_text() {
  awk -F: '
    /^[[:space:]-]*status[[:space:]]*:/ {
      value=$2
      sub(/#.*/, "", value)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^["'"'"']|["'"'"']$/, "", value)
      print value
      exit
    }
  '
}

value_from_text() {
  local key="$1"
  awk -F: -v key="$key" '
    $1 ~ "^[[:space:]-]*" key "[[:space:]]*$" {
      value=$2
      sub(/#.*/, "", value)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^["'"'"']|["'"'"']$/, "", value)
      print value
      exit
    }
  '
}

frontmatter_value() {
  local key="$1"
  local file="$2"
  awk -F: -v key="$key" '
    $1 ~ "^[[:space:]-]*" key "[[:space:]]*$" {
      value=$2
      sub(/#.*/, "", value)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^["'"'"']|["'"'"']$/, "", value)
      print value
      exit
    }
  ' "$file"
}

tool_name="$(json_string tool_name)"
case "$tool_name" in
  Write|Edit) ;;
  *) exit 0 ;;
esac

cwd="$(json_string cwd)"
if [[ -z "$cwd" ]]; then
  cwd="$(pwd)"
fi

file_path="$(json_string file_path)"
if [[ -z "$file_path" ]]; then
  file_path="$(json_string path)"
fi
if [[ -z "$file_path" ]]; then
  exit 0
fi

case "$file_path" in
  /*) target_path="$file_path" ;;
  *) target_path="$cwd/$file_path" ;;
esac
target_path="${target_path//\\//}"

case "$target_path" in
  */docs/03_开发计划/*) ;;
  *) exit 0 ;;
esac

content="$(decode_json_text "$(json_string content)")"
old_string="$(decode_json_text "$(json_string old_string)")"
new_string="$(decode_json_text "$(json_string new_string)")"

old_status=""
new_status=""
doc_type=""
review_status=""

if [[ "$tool_name" == "Edit" ]]; then
  old_status="$(printf '%s\n' "$old_string" | status_from_text || true)"
  new_status="$(printf '%s\n' "$new_string" | status_from_text || true)"
  doc_type="$(printf '%s\n' "$new_string" | value_from_text doc_type || true)"
  review_status="$(printf '%s\n' "$new_string" | value_from_text review_status || true)"
else
  if [[ -f "$target_path" ]]; then
    old_status="$(status_from_text < "$target_path" || true)"
  fi
  new_status="$(printf '%s\n' "$content" | status_from_text || true)"
  doc_type="$(printf '%s\n' "$content" | value_from_text doc_type || true)"
  review_status="$(printf '%s\n' "$content" | value_from_text review_status || true)"
fi

if [[ "$new_status" != "done" || "$old_status" == "done" ]]; then
  exit 0
fi

if [[ -f "$target_path" ]]; then
  if [[ -z "$doc_type" ]]; then
    doc_type="$(frontmatter_value doc_type "$target_path")"
  fi
  if [[ -z "$review_status" ]]; then
    review_status="$(frontmatter_value review_status "$target_path")"
  fi
fi

if [[ "$doc_type" != "dev_task" ]]; then
  exit 0
fi

if [[ "$review_status" != "passed" ]]; then
  echo "dev_task 置为 done 前必须 review_status: passed。" >&2
  exit 2
fi

exit 0
