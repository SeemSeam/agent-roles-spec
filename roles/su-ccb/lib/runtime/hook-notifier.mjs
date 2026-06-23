import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";

const DEFAULT_HOOK_URL = "http://127.0.0.1:3030/api/plugin-hooks/event-journal";
const DEFAULT_TIMEOUT_MS = 300;
const CONFIG_FILE = "ccb.config.yaml";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function splitUrls(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseInlineUrlList(value) {
  const trimmed = value.trim();
  if (trimmed === "[]") return [];
  const matched = trimmed.match(/^\[(.*)\]$/);
  if (!matched) return null;
  return matched[1]
    .split(",")
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function parseHookUrlsFromConfig(text) {
  const lines = text.split(/\r?\n/);
  const pluginIndex = lines.findIndex((line) => /^plugin_hooks:\s*$/.test(line.trim()));
  if (pluginIndex === -1) return null;

  for (let index = pluginIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\S/.test(line) && line.trim()) return null;
    const matched = line.match(/^\s{2}event_journal_urls:\s*(.*)$/);
    if (!matched) continue;

    const inline = parseInlineUrlList(matched[1]);
    if (inline) return inline;

    const urls = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const item = lines[cursor];
      if (!item.trim()) continue;
      if (/^\s{0,2}\S/.test(item)) break;
      const itemMatched = item.match(/^\s{4}-\s*(.+)$/);
      if (!itemMatched) break;
      urls.push(itemMatched[1].trim().replace(/^['"]|['"]$/g, ""));
    }
    return urls.filter(Boolean);
  }

  return null;
}

async function readConfiguredHookUrls(projectRoot) {
  const envValue = process.env.CCB_EVENT_HOOK_URLS;
  if (envValue !== undefined) return splitUrls(envValue);

  try {
    const configText = await readFile(join(projectRoot, CONFIG_FILE), "utf8");
    const configured = parseHookUrlsFromConfig(configText);
    if (configured !== null) return configured;
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn(`failed to read ${CONFIG_FILE}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return [DEFAULT_HOOK_URL];
}

function isLocalhostUrl(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && LOCAL_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
}

function buildEnvelope({ event, projectRoot, journalPath, eventHash }) {
  const root = isAbsolute(projectRoot) ? projectRoot : join(process.cwd(), projectRoot);
  const eventJson = JSON.stringify(event);
  return {
    schema_version: "plugin-hook-v0.1",
    source: "ccb-claude-plugin",
    project_root: root,
    journal_path: isAbsolute(journalPath) ? relative(root, journalPath).replace(/\\/g, "/") : journalPath,
    event_hash: eventHash ?? sha256(eventJson),
    event
  };
}

async function postHook(url, envelope, timeoutMs, warn) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  timeout.unref?.();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "ccb-claude-plugin-hook/0.1"
      },
      body: JSON.stringify(envelope),
      signal: controller.signal
    });
    if (!response.ok) {
      warn(`EventJournal hook receiver returned ${response.status}: ${url}`);
      return false;
    }
    return true;
  } catch (error) {
    warn(`EventJournal hook failed for ${url}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function notifyEventAppended(input, options = {}) {
  const warn = options.warn ?? ((message) => console.warn(message));
  const projectRoot = input.projectRoot ?? process.cwd();
  const urls = await readConfiguredHookUrls(projectRoot);
  if (urls.length === 0) {
    return { notified: 0, failed: 0, skipped: 0 };
  }

  const envelope = buildEnvelope({
    event: input.event,
    projectRoot,
    journalPath: input.journalPath,
    eventHash: input.eventHash
  });
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let skipped = 0;

  const results = await Promise.all(
    urls.map(async (url) => {
      if (!isLocalhostUrl(url)) {
        skipped += 1;
        warn(`non-localhost hook URL skipped: ${url}`);
        return false;
      }
      return await postHook(url, envelope, timeoutMs, warn);
    })
  );

  const notified = results.filter(Boolean).length;
  return {
    notified,
    failed: results.length - notified - skipped,
    skipped
  };
}
