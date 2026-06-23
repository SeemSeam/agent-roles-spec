import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { appendEvent } from "../index.mjs";
import { notifyEventAppended } from "../hook-notifier.mjs";

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function tempProject() {
  const root = join(tmpdir(), `ccb-plugin-hook-${randomUUID()}`);
  await mkdir(root, { recursive: true });
  return root;
}

function validEvent(id = "req-1") {
  return {
    type: "file_written",
    subject_type: "requirement",
    subject_id: id,
    payload: { path: `docs/02_需求设计/${id}-需求.md` },
    idempotency_key: `hook-test-${id}`,
    emitted_at: "2026-05-22T10:00:00.000Z",
    source_actor: "ccb_claude"
  };
}

async function withEnv(value, work) {
  const previous = process.env.CCB_EVENT_HOOK_URLS;
  if (value === undefined) {
    delete process.env.CCB_EVENT_HOOK_URLS;
  } else {
    process.env.CCB_EVENT_HOOK_URLS = value;
  }
  try {
    return await work();
  } finally {
    if (previous === undefined) {
      delete process.env.CCB_EVENT_HOOK_URLS;
    } else {
      process.env.CCB_EVENT_HOOK_URLS = previous;
    }
  }
}

async function listen(handler) {
  const requests = [];
  const server = createServer(async (request, response) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", async () => {
      requests.push({ request, body });
      await handler?.(request, response, body);
      if (!response.writableEnded) {
        response.writeHead(202, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: true }));
      }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}/api/plugin-hooks/event-journal`,
    requests,
    close: async () => await new Promise((resolve) => server.close(resolve))
  };
}

test("notifyEventAppended posts plugin hook envelope to localhost receiver", async () => {
  const projectRoot = await tempProject();
  const receiver = await listen();
  try {
    const event = validEvent();
    const result = await withEnv(receiver.url, async () =>
      await notifyEventAppended({
        event,
        projectRoot,
        journalPath: join(projectRoot, "docs", ".ccb", "events", "journal.jsonl")
      })
    );

    assert.equal(result.notified, 1);
    assert.equal(result.failed, 0);
    assert.equal(receiver.requests.length, 1);
    const envelope = JSON.parse(receiver.requests[0].body);
    assert.equal(envelope.schema_version, "plugin-hook-v0.1");
    assert.equal(envelope.source, "ccb-claude-plugin");
    assert.equal(envelope.project_root, projectRoot);
    assert.equal(envelope.journal_path, "docs/.ccb/events/journal.jsonl");
    assert.equal(envelope.event_hash, sha256(JSON.stringify(event)));
    assert.deepEqual(envelope.event, event);
  } finally {
    await receiver.close();
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("notifyEventAppended uses ccb.config.yaml when env override is absent", async () => {
  const projectRoot = await tempProject();
  const receiver = await listen();
  try {
    await writeFile(
      join(projectRoot, "ccb.config.yaml"),
      ["plugin_hooks:", "  event_journal_urls:", `    - ${receiver.url}`, ""].join("\n"),
      "utf8"
    );

    const result = await withEnv(undefined, async () =>
      await notifyEventAppended({
        event: validEvent("req-config"),
        projectRoot,
        journalPath: join(projectRoot, "docs", ".ccb", "events", "journal.jsonl")
      })
    );

    assert.equal(result.notified, 1);
    assert.equal(receiver.requests.length, 1);
  } finally {
    await receiver.close();
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("notifyEventAppended skips non-localhost hook urls without throwing", async () => {
  const projectRoot = await tempProject();
  const warnings = [];
  try {
    const result = await withEnv("https://example.com/hooks/event-journal", async () =>
      await notifyEventAppended(
        {
          event: validEvent("req-nonlocal"),
          projectRoot,
          journalPath: join(projectRoot, "docs", ".ccb", "events", "journal.jsonl")
        },
        { warn: (message) => warnings.push(message) }
      )
    );

    assert.equal(result.notified, 0);
    assert.equal(result.skipped, 1);
    assert.match(warnings.join("\n"), /non-localhost hook URL skipped/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("notifyEventAppended times out after the v1.0 300ms budget and fails open", async () => {
  const projectRoot = await tempProject();
  const receiver = await listen(async () => {
    // Hold the response open until AbortController cancels the fetch.
    await new Promise(() => undefined);
  });
  try {
    const startedAt = Date.now();
    const result = await withEnv(receiver.url, async () =>
      await notifyEventAppended({
        event: validEvent("req-timeout"),
        projectRoot,
        journalPath: join(projectRoot, "docs", ".ccb", "events", "journal.jsonl")
      })
    );
    const elapsed = Date.now() - startedAt;

    assert.equal(result.notified, 0);
    assert.equal(result.failed, 1);
    assert.ok(elapsed >= 250, `expected timeout near 300ms, got ${elapsed}`);
    assert.ok(elapsed < 1000, `expected fail-open before 1000ms, got ${elapsed}`);
  } finally {
    await receiver.close();
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("appendEvent triggers hook only for newly appended events", async () => {
  const projectRoot = await tempProject();
  const receiver = await listen();
  try {
    const event = validEvent("req-append");
    const first = await withEnv(receiver.url, async () => await appendEvent(event, { projectRoot }));
    const second = await withEnv(receiver.url, async () => await appendEvent(event, { projectRoot }));

    assert.equal(first.appended, true);
    assert.equal(second.appended, false);
    assert.equal(receiver.requests.length, 1);
    const journal = await readFile(join(projectRoot, "docs", ".ccb", "events", "journal.jsonl"), "utf8");
    assert.equal(journal.trim().split("\n").length, 1);
  } finally {
    await receiver.close();
    await rm(projectRoot, { recursive: true, force: true });
  }
});
