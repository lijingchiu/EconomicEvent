import { describe, expect, it } from "vitest";
import { classifyEventName, classifyAndMap } from "../../src/domain/importance";
import { normalizeEventName } from "../../src/domain/normalization";
import { parseOfficialDateTime, formatInTimezone, calculateReminderTime } from "../../src/domain/time";
import { deterministicEventId } from "../../src/domain/event-id";
import { explainEvent } from "../../src/domain/event-explanation";

describe("event domain", () => {
  it("normalizes aliases without confusing methodology updates", () => {
    expect(classifyEventName("CPI").category).toBe("inflation");
    expect(classifyEventName("Consumer Price Index (CPI)").category).toBe("inflation");
    expect(classifyEventName("CPI methodology update").tracked).toBe(false);
    expect(classifyEventName("State Job Openings and Labor Turnover").tracked).toBe(false);
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

  it("provides an explanation for every tracked event family", () => {
    const explanation = explainEvent({ id: "cpi", provider: "bls", sourceUrl: "https://example.com", name: "Inflation Rate MoM", normalizedName: "inflation rate mom", category: "inflation", country: "US", currency: "USD", eventTimeUtc: "2026-07-15T12:30:00.000Z", localDisplayTimezone: "Asia/Taipei", impact: "high", affectedMarkets: ["NQ", "USD"], rawHash: "hash" });
    expect(explanation.chineseName).toContain("消費者物價");
    expect(explanation.definition).toContain("商品");
    expect(explanation.marketImpact).toContain("高於預期");
  });
});
