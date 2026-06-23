export class CapabilityOutcomeError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "CapabilityOutcomeError";
    this.code = code;
    this.retryable = Boolean(options.retryable);
    this.reconcileRequired = Boolean(options.reconcileRequired);
    this.issues = Array.isArray(options.issues) ? options.issues : [];
    if (options.cause) this.cause = options.cause;
  }
}

export function rejection({
  code,
  subjectRef,
  capabilityId,
  outcomeType,
  retryable = false,
  reconcileRequired = false,
  issues = []
}) {
  return {
    ok: false,
    code,
    subject_ref: subjectRef,
    capability_id: capabilityId,
    outcome_type: outcomeType,
    retryable,
    reconcile_required: reconcileRequired,
    issues
  };
}
