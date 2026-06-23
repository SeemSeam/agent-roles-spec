export function formatActual(value) {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) return String(value);
  return encoded.length > 120 ? `${encoded.slice(0, 117)}...` : encoded;
}

export function issue(path, actual, expected) {
  return {
    path,
    actual,
    expected,
    message: `${path}: actual=${formatActual(actual)} expected=${expected}`
  };
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isIsoDate(value) {
  if (typeof value !== "string") return false;
  const matched = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(Z|([+-])(\d{2}):(\d{2}))$/
  );
  if (!matched) return false;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , zoneText, , zoneHourText, zoneMinuteText] = matched;
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);
  const hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);
  const second = Number.parseInt(secondText, 10);
  const zoneHour = zoneText === "Z" ? 0 : Number.parseInt(zoneHourText, 10);
  const zoneMinute = zoneText === "Z" ? 0 : Number.parseInt(zoneMinuteText, 10);

  if (month < 1 || month > 12) return false;
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > maxDay) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;
  if (zoneHour > 23 || zoneMinute > 59) return false;

  return !Number.isNaN(new Date(value).getTime());
}

export const MIN_MARKDOWN_LENGTH = 50;
export const MARKDOWN_MARKER_PATTERN = /(^|\n)\s*(#{2,}\s+\S|-\s+\S)/m;

export function hasUsefulMarkdown(value) {
  return (
    typeof value === "string" &&
    value.trim().length >= MIN_MARKDOWN_LENGTH &&
    MARKDOWN_MARKER_PATTERN.test(value)
  );
}
