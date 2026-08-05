import { describe, expect, it } from "vitest";

import { addDuration, parseDurationToMilliseconds, parseDurationToSeconds } from "./duration";

describe("auth duration helpers", () => {
  it("parses seconds, minutes, hours, and days", () => {
    expect(parseDurationToMilliseconds("30s")).toBe(30_000);
    expect(parseDurationToMilliseconds("15m")).toBe(900_000);
    expect(parseDurationToMilliseconds("2h")).toBe(7_200_000);
    expect(parseDurationToSeconds("7d")).toBe(604_800);
  });

  it("adds durations to dates", () => {
    const baseDate = new Date("2026-08-05T00:00:00.000Z");

    expect(addDuration(baseDate, "1h").toISOString()).toBe("2026-08-05T01:00:00.000Z");
  });

  it("rejects invalid duration formats", () => {
    expect(() => parseDurationToMilliseconds("15min")).toThrow("Invalid duration");
    expect(() => parseDurationToMilliseconds("0m")).toThrow("Duration must be positive");
  });
});
