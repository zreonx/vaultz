const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

const tableDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const tableTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * Formats a calendar date (e.g. "2026-11-01") for display in tables as "Nov 1, 2026".
 *
 * The year, month, and day are parsed directly from the string and built as a
 * local date. `new Date("2026-11-01")` would parse as UTC midnight, which shows
 * the previous day in timezones west of UTC, so a financial record could look
 * like it happened a day earlier than it did.
 *
 * Returns the original value unchanged if it isn't a recognizable ISO date.
 */
export function formatTableDate(value: string | null | undefined): string {
  if (!value) return "";

  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return value;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return value;

  return tableDateFormatter.format(date);
}

/**
 * Formats an ISO UTC timestamp (e.g. "2026-11-01T04:40:52.123Z") into readable local time (e.g. "5:40 AM").
 */
export function formatRecordedTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return tableTimeFormatter.format(date);
}
