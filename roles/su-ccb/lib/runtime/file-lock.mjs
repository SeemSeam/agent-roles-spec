import { mkdir, readFile, rm } from "node:fs/promises";
import { hostname } from "node:os";
import { dirname } from "node:path";

import { IOError, LockTimeoutError } from "./errors.mjs";
import { safeWriteFile } from "./file-write.mjs";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_INTERVAL_MS = 50;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function lockPathFor(filePath) {
  return `${filePath}.lock`;
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    if (error?.code === "EPERM") return true;
    return true;
  }
}

async function readLockOwner(lockPath) {
  try {
    return { ok: true, owner: JSON.parse(await readFile(`${lockPath}/owner.json`, "utf8")) };
  } catch {
    return { ok: false };
  }
}

async function isStaleLock(lockPath, currentHostname) {
  const result = await readLockOwner(lockPath);
  if (!result.ok) return false;
  const { owner } = result;
  if (owner.hostname && owner.hostname !== currentHostname) {
    return false;
  }
  return !isProcessAlive(owner.pid);
}

export async function acquireFileLock(filePath, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryIntervalMs = options.retryIntervalMs ?? DEFAULT_RETRY_INTERVAL_MS;
  const lockPath = options.lockPath ?? lockPathFor(filePath);
  const startedAt = Date.now();
  const currentHostname = hostname();
  let staleCleanupAttempted = false;

  await mkdir(dirname(lockPath), { recursive: true });

  while (true) {
    try {
      await mkdir(lockPath);
      await safeWriteFile(
        `${lockPath}/owner.json`,
        `${JSON.stringify({
          pid: process.pid,
          hostname: currentHostname,
          acquired_at: new Date().toISOString(),
          path: filePath
        })}\n`,
        { audit: false }
      );

      let released = false;
      return async () => {
        if (released) return;
        released = true;
        try {
          await rm(lockPath, { recursive: true, force: true });
        } catch (error) {
          throw new IOError(`failed to release file lock: ${filePath}`, { path: filePath, cause: error });
        }
      };
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw new IOError(`failed to acquire file lock: ${filePath}`, { path: filePath, cause: error });
      }
      if (!staleCleanupAttempted && await isStaleLock(lockPath, currentHostname)) {
        staleCleanupAttempted = true;
        await rm(lockPath, { recursive: true, force: true });
        continue;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        throw new LockTimeoutError(`file lock timed out after ${timeoutMs}ms: ${filePath}`, {
          path: filePath,
          timeoutMs
        });
      }
      await sleep(retryIntervalMs);
    }
  }
}

export async function withFileLock(filePath, fn, options = {}) {
  const release = await acquireFileLock(filePath, options);
  try {
    return await fn();
  } finally {
    await release();
  }
}
