import { ValidationError, validateAgainstSchema } from "../runtime/index.mjs";

const DEFAULT_MAX_PAYLOAD_BYTES = 64 * 1024;
const DEFAULT_MAX_PAYLOAD_DEPTH = 8;
const COMMAND_PATTERN = /^[a-z][a-z0-9-]*$/;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sortCanonical(value) {
  if (Array.isArray(value)) return value.map((item) => sortCanonical(item));
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortCanonical(nested)])
    );
  }
  return value;
}

function payloadDepth(value) {
  if (!value || typeof value !== "object") return 0;
  const children = Array.isArray(value) ? value : Object.values(value);
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map((child) => payloadDepth(child)));
}

function parseJsonObject(text, sourceLabel) {
  try {
    const parsed = JSON.parse(text);
    if (!isPlainObject(parsed)) {
      throw new ValidationError(`${sourceLabel} must be a JSON object`, {
        issues: [`${sourceLabel} must be a JSON object`]
      });
    }
    return parsed;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError(`invalid ${sourceLabel} JSON`, {
      issues: [error instanceof Error ? error.message : String(error)]
    });
  }
}

function parseEnvelope(input) {
  if (isPlainObject(input)) return input;
  if (typeof input !== "string") {
    throw new ValidationError("anchor dispatch input must be string or object", {
      issues: ["input must be string or object"]
    });
  }

  const trimmed = input.trim();
  if (trimmed.startsWith("{")) return parseJsonObject(trimmed, "anchor dispatch");

  const matched = trimmed.match(/^\/ccb:([a-z][a-z0-9-]*)\s+--payload\s+([\s\S]+)$/);
  if (!matched) {
    throw new ValidationError("anchor dispatch command must use --payload JSON", {
      issues: ["legacy key=value dispatch commands are not supported"]
    });
  }
  return {
    command: matched[1],
    payload: parseJsonObject(matched[2], "anchor dispatch payload")
  };
}

function assertEnvelope(envelope, options = {}) {
  const command = typeof envelope.command === "string" ? envelope.command.trim().replace(/^\/ccb:/, "") : "";
  const payload = envelope.payload;
  const issues = [];

  if (!COMMAND_PATTERN.test(command)) issues.push("command must be a /ccb skill name without prefix");
  if (!isPlainObject(payload)) issues.push("payload must be an object");

  if (isPlainObject(payload)) {
    const maxPayloadBytes = options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES;
    const maxPayloadDepth = options.maxPayloadDepth ?? DEFAULT_MAX_PAYLOAD_DEPTH;
    const bytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
    if (bytes > maxPayloadBytes) issues.push(`payload exceeds ${maxPayloadBytes} bytes`);
    const depth = payloadDepth(payload);
    if (depth > maxPayloadDepth) issues.push(`payload depth exceeds ${maxPayloadDepth}`);
  }

  if (issues.length > 0) {
    throw new ValidationError(`invalid anchor dispatch payload: ${issues.join("; ")}`, { issues });
  }

  return {
    command,
    payload
  };
}

export function buildAnchorDispatchCommand(input, options = {}) {
  const envelope = assertEnvelope(input, options);
  return `/ccb:${envelope.command} --payload ${JSON.stringify(sortCanonical(envelope.payload))}`;
}

export async function parseAnchorDispatchCommand(input, options = {}) {
  const envelope = assertEnvelope(parseEnvelope(input), options);
  await validateAgainstSchema(envelope, "anchor-dispatch");
  return envelope;
}
