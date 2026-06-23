import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { IOError, ValidationError } from "./errors.mjs";
import { withFileLock } from "./file-lock.mjs";
import { notifyEventAppended } from "./hook-notifier.mjs";

function journalPath(options = {}) {
  if (options.journalPath) return options.journalPath;
  return join(options.projectRoot ?? process.cwd(), "docs", ".ccb", "events", "journal.jsonl");
}

function normalizeEvent(event) {
  const issues = [];
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new ValidationError("event must be an object", { issues: ["event must be an object"] });
  }
  for (const key of ["type", "subject_type", "subject_id", "emitted_at", "source_actor"]) {
    if (typeof event[key] !== "string" || event[key].trim().length === 0) {
      issues.push(`${key} must be a non-empty string`);
    }
  }
  if (event.idempotency_key !== undefined && (typeof event.idempotency_key !== "string" || event.idempotency_key.trim().length === 0)) {
    issues.push("idempotency_key must be a non-empty string when provided");
  }
  if (event.payload === undefined || event.payload === null || typeof event.payload !== "object" || Array.isArray(event.payload)) {
    issues.push("payload must be an object");
  }
  if (typeof event.emitted_at === "string" && Number.isNaN(new Date(event.emitted_at).getTime())) {
    issues.push("emitted_at must be an ISO8601 datetime string");
  }

  if (issues.length > 0) {
    throw new ValidationError(`invalid EventJournal event: ${issues.join("; ")}`, { issues });
  }

  return {
    type: event.type,
    subject_type: event.subject_type,
    subject_id: event.subject_id,
    payload: event.payload,
    idempotency_key: event.idempotency_key ?? null,
    emitted_at: event.emitted_at,
    source_actor: event.source_actor
  };
}

async function journalHasIdempotencyKey(path, idempotencyKey) {
  if (!idempotencyKey) return false;
  let content;
  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw new IOError(`failed to read EventJournal: ${path}`, { path, cause: error });
  }

  let byteOffset = 0;
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const lineByteOffset = byteOffset;
    byteOffset += Buffer.byteLength(line, "utf8") + 1;
    if (!line.trim()) continue;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      console.warn(
        `bad EventJournal line skipped at byte offset ${lineByteOffset}: line ${index + 1}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      continue;
    }
    if (parsed?.idempotency_key === idempotencyKey) return true;
  }
  return false;
}

export async function appendEvent(event, options = {}) {
  const normalized = normalizeEvent(event);
  const path = journalPath(options);
  const projectRoot = options.projectRoot ?? process.cwd();
  const failPolicy = options.failPolicy ?? "fail-closed";

  try {
    try {
      await mkdir(dirname(path), { recursive: true });
    } catch (error) {
      throw new IOError(`failed to prepare EventJournal directory: ${path}`, { path, cause: error });
    }

    const result = await withFileLock(path, async () => {
      if (await journalHasIdempotencyKey(path, normalized.idempotency_key)) {
        return { appended: false, duplicate: true, path, event: normalized };
      }

      try {
        await appendFile(path, `${JSON.stringify(normalized)}\n`, "utf8");
        return { appended: true, duplicate: false, path, event: normalized };
      } catch (error) {
        throw new IOError(`failed to append EventJournal: ${path}`, { path, cause: error });
      }
    }, options.lockOptions ?? {});

    if (result.appended) {
      try {
        await notifyEventAppended({
          event: result.event,
          projectRoot,
          journalPath: path
        });
      } catch (error) {
        console.warn(`EventJournal hook notify failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return result;
  } catch (error) {
    if (failPolicy === "warning-only") {
      return { appended: false, failed: true, path, event: normalized, error };
    }
    throw error;
  }
}
