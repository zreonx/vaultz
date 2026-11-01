import { describe, expect, it } from "vitest";
import { formatRecordedTime, formatTableDate } from "./date";

describe("formatTableDate", () => {
  it("formats ISO calendar dates as a readable short date", () => {
    expect(formatTableDate("2026-11-01")).toBe("Nov 1, 2026");
    expect(formatTableDate("2026-12-31")).toBe("Dec 31, 2026");
  });

  it("does not shift the day across timezones", () => {
    expect(formatTableDate("2026-01-01")).toBe("Jan 1, 2026");
  });

  it("returns empty string for missing values and passes through unknown formats", () => {
    expect(formatTableDate(null)).toBe("");
    expect(formatTableDate(undefined)).toBe("");
    expect(formatTableDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatRecordedTime", () => {
  it("formats valid ISO timestamp into time string with AM/PM", () => {
    const formatted = formatRecordedTime("2026-11-01T04:40:52.000Z");
    expect(formatted).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
  });

  it("handles empty or invalid values gracefully", () => {
    expect(formatRecordedTime(null)).toBe("");
    expect(formatRecordedTime(undefined)).toBe("");
    expect(formatRecordedTime("invalid-timestamp")).toBe("");
  });
});
