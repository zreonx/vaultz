import { describe, expect, it } from "vitest";
import { formatMoney } from "./currency";

describe("formatMoney", () => {
  it("formats numeric amounts with explicit ISO 4217 currency code", () => {
    expect(formatMoney(1250.5, "usd", "en-US")).toBe("$1,250.50");
    expect(formatMoney(0, "EUR", "en-US")).toBe("€0.00");
  });

  it("throws when given an invalid currency code", () => {
    expect(() => formatMoney(100, "INVALID")).toThrow(
      /Invalid ISO 4217 currency code/
    );
    expect(() => formatMoney(100, "")).toThrow(
      /Invalid ISO 4217 currency code/
    );
  });
});
