export class RuntimeError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.code = options.code ?? "RUNTIME_ERROR";
    if (options.path) {
      this.path = options.path;
    }
  }
}

export class IOError extends RuntimeError {
  constructor(message, options = {}) {
    super(message, { ...options, code: "IO_ERROR" });
  }
}

export class ConflictError extends RuntimeError {
  constructor(message, options = {}) {
    super(message, { ...options, code: "CONFLICT" });
    if (options.expectedHash !== undefined) this.expectedHash = options.expectedHash;
    if (options.actualHash !== undefined) this.actualHash = options.actualHash;
  }
}

export class LockTimeoutError extends RuntimeError {
  constructor(message, options = {}) {
    super(message, { ...options, code: "LOCK_TIMEOUT" });
    if (options.timeoutMs !== undefined) this.timeoutMs = options.timeoutMs;
  }
}

export class ValidationError extends RuntimeError {
  constructor(message, options = {}) {
    super(message, { ...options, code: "VALIDATION_ERROR" });
    this.issues = Array.isArray(options.issues) ? options.issues : [];
    if (options.schemaName) this.schemaName = options.schemaName;
  }
}
