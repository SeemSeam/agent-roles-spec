import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative } from "node:path";

import { ConflictError, IOError } from "./errors.mjs";
import { validateAgainstSchema } from "./schema-validate.mjs";

export function hashContent(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export async function hashFile(filePath) {
  try {
    return hashContent(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new IOError(`failed to read file for hash: ${filePath}`, { path: filePath, cause: error });
  }
}

function normalizePath(value) {
  return value.replace(/\\/g, "/");
}

function targetPathFor(filePath, audit) {
  if (audit.targetPath) return normalizePath(audit.targetPath);
  if (audit.projectRoot) {
    const relativePath = relative(audit.projectRoot, filePath);
    if (relativePath && !relativePath.startsWith("..") && !isAbsolute(relativePath)) {
      return normalizePath(relativePath);
    }
  }
  return normalizePath(filePath);
}

async function appendWriteEvent(event, projectRoot, failPolicy) {
  const { appendEvent } = await import("./event-journal.mjs");
  return await appendEvent(event, { projectRoot, failPolicy });
}

function writeEvent({ type, audit, payload, idempotencyKey }) {
  return {
    type,
    subject_type: audit.subjectType,
    subject_id: audit.subjectId,
    payload,
    idempotency_key: idempotencyKey,
    emitted_at: new Date().toISOString(),
    source_actor: audit.sourceActor
  };
}

async function atomicWriteFileCore(filePath, content, options = {}) {
  const encoding = options.encoding ?? "utf8";
  const expectedHashProvided = Object.hasOwn(options, "expectedHash");
  if (expectedHashProvided) {
    const actualHash = await hashFile(filePath);
    if (actualHash !== options.expectedHash) {
      throw new ConflictError(`CAS hash mismatch for ${filePath}`, {
        path: filePath,
        expectedHash: options.expectedHash,
        actualHash
      });
    }
  }

  if (options.schemaName) {
    await validateAgainstSchema(content, options.schemaName);
  }

  await mkdir(dirname(filePath), { recursive: true });
  const tempPath = join(
    dirname(filePath),
    `.${basename(filePath)}.tmp.${process.pid}.${Date.now()}.${randomUUID()}`
  );

  try {
    await writeFile(tempPath, content, { encoding, flag: "wx" });
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => {});
    throw new IOError(`failed to safely write file: ${filePath}`, { path: filePath, cause: error });
  }

  return {
    path: filePath,
    hash: hashContent(content),
    bytes: Buffer.byteLength(content, encoding)
  };
}

export async function safeWriteFile(filePath, content, options = {}) {
  if (!options.audit) {
    return await atomicWriteFileCore(filePath, content, options);
  }

  const audit = {
    sourceActor: "ccb_claude",
    ...options.audit
  };
  const runId = audit.runId ?? randomUUID();
  const targetPath = targetPathFor(filePath, audit);
  const projectRoot = audit.projectRoot ?? process.cwd();
  const expectedHashProvided = Object.hasOwn(options, "expectedHash");
  const expectedHash = expectedHashProvided ? options.expectedHash : null;
  const plannedHash = hashContent(content);
  const intentKey = `state-write:${runId}:intent`;
  const eventBase = {
    audit,
    payload: null,
    idempotencyKey: null
  };

  await appendWriteEvent(
    writeEvent({
      ...eventBase,
      type: "state_write_intent",
      payload: {
        run_id: runId,
        target_path: targetPath,
        resource_type: audit.resourceType,
        operation: audit.operation,
        expected_hash: expectedHash,
        planned_hash: plannedHash,
        schema_name: options.schemaName ?? null,
        planned_diff: audit.plannedDiff ?? null,
        capability_ref: audit.capabilityRef ?? null
      },
      idempotencyKey: intentKey
    }),
    projectRoot,
    "fail-closed"
  );

  try {
    const result = await atomicWriteFileCore(filePath, content, options);
    await appendWriteEvent(
      writeEvent({
        ...eventBase,
        type: "state_write_done",
        payload: {
          run_id: runId,
          intent_event_id: intentKey,
          target_path: targetPath,
          previous_hash: expectedHash,
          content_hash: result.hash,
          bytes: result.bytes,
          schema_name: options.schemaName ?? null
        },
        idempotencyKey: `state-write:${runId}:done`
      }),
      projectRoot,
      "warning-only"
    );
    return result;
  } catch (error) {
    if (error instanceof ConflictError) {
      await appendWriteEvent(
        writeEvent({
          ...eventBase,
          type: "state_write_conflict",
          payload: {
            run_id: runId,
            target_path: targetPath,
            resource_type: audit.resourceType,
            expected_hash: error.expectedHash ?? expectedHash,
            actual_hash: error.actualHash ?? null,
            writer: audit.sourceActor,
            primitive: "safeWriteFile"
          },
          idempotencyKey: `state-write:${runId}:conflict`
        }),
        projectRoot,
        "fail-closed"
      );
    } else {
      await appendWriteEvent(
        writeEvent({
          ...eventBase,
          type: "state_write_failed",
          payload: {
            run_id: runId,
            target_path: targetPath,
            resource_type: audit.resourceType,
            stage: error?.code === "VALIDATION_ERROR" ? "schema" : "write",
            error_name: error instanceof Error ? error.name : "Error",
            error_code: error?.code ?? null,
            error_message: error instanceof Error ? error.message : String(error),
            primitive: "safeWriteFile"
          },
          idempotencyKey: `state-write:${runId}:failed`
        }),
        projectRoot,
        "fail-closed"
      );
    }
    throw error;
  }
}
