function sameSubject(left, right) {
  return left?.subject_type === right?.subject_type && left?.subject_id === right?.subject_id;
}

export function validateMustAskApprovals({ policy, subjectRef, evidence = [], mustAskRefs = [] }) {
  const required = policy.must_ask_refs ?? [];
  const issues = [];
  if (required.length === 0) return { ok: true, issues };

  const provided = new Set(mustAskRefs);
  for (const ref of required) {
    if (provided.has(ref)) continue;
    const approval = evidence.find((item) =>
      item?.kind === "B" &&
      item?.check_id === "journal_event_exists" &&
      item?.params?.must_ask_ref === ref &&
      item?.params?.approved_by === "user" &&
      sameSubject(item?.params?.subject_ref, subjectRef)
    );
    if (!approval) {
      issues.push(`missing user approval for ${ref}`);
    }
  }

  return { ok: issues.length === 0, issues };
}
