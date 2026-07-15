import { describe, expect, it } from "vitest";
import { classifyEventName, classifyAndMap } from "../../src/domain/importance";
import { normalizeEventName } from "../../src/domain/normalization";
import { parseOfficialDateTime, formatInTimezone, calculateReminderTime } from "../../src/domain/time";
import { deterministicEventId } from "../../src/domain/event-id";

describe("event domain", () => {
  it("normalizes aliases without confusing methodology updates", () => {
    expect(classifyEventName("CPI").category).toBe("inflation");
    expect(classifyEventName("Consumer Price Index (CPI)").category).toBe("inflation");
    expect(classifyEventName("CPI methodology update").tracked).toBe(false);
    expect(classifyEventName("Fed Chair Warsh Testimony")).toMatchObject({ category: "monetary_policy", impact: "high", tracked: true });
    expect(normalizeEventName("  Consumer—Price  Index  ")).toBe("consumer price index");
  });

  it("maps markets conservatively", () => {
    expect(classifyAndMap("Crude Oil Inventories").affectedMarkets).toEqual(["CRUDE_OIL", "USD"]);
    expect(classifyAndMap("Natural Gas Storage").affectedMarkets).toEqual(["USD"]);
    expect(classifyAndMap("CPI").affectedMarkets).toEqual(["NQ", "GOLD", "USD", "RATES"]);
  });

  it("handles New York EST/EDT and Taipei display", () => {
    expect(parseOfficialDateTime("2026-01-15T08:30:00", "America/New_York").toISOString()).toBe("2026-01-15T13:30:00.000Z");
    expect(parseOfficialDateTime("2026-07-15T08:30:00", "America/New_York").toISOString()).toBe("2026-07-15T12:30:00.000Z");
    expect(formatInTimezone("2026-07-15T12:30:00.000Z", "Asia/Taipei")).toBe("2026-07-15 20:30 Asia/Taipei");
  });

  it("rejects timezone-less local times and calculates reminders in UTC", () => {
    expect(() => parseOfficialDateTime("2026-07-15T08:30:00")).toThrow();
    expect(calculateReminderTime("2026-07-15T12:30:00.000Z", 60)).toBe("2026-07-15T11:30:00.000Z");
  });

  it("creates deterministic IDs", async () => {
    const a = await deterministicEventId("bls", "2026-07-14|cpi", "consumer price index", "2026-07-14T12:30:00.000Z", "https://www.bls.gov/schedule/2026/");
    const b = await deterministicEventId("bls", "2026-07-14|cpi", "different text", "2026-07-14T12:30:00.000Z", "https://other.example/");
    expect(a).toBe(b);
  });
});
