import { describe, expect, it } from "vitest";
import { digestMessage, digestWindowActive } from "../../src/services/daily-digest";

describe("daily digest", () => {
  it("formats the next 24 hours without inventing values", () => {
    const message = digestMessage([{ name: "Retail Sales MoM", eventTimeUtc: "2026-07-17T12:30:00.000Z", impact: "high" }], "Asia/Taipei");
    expect(message).toContain("Retail Sales MoM");
    expect(message).toContain("HIGH");
    expect(digestMessage([], "Asia/Taipei")).toContain("沒有符合通知條件");
  });

  it("keeps a bounded retry window, including across midnight", () => {
    expect(digestWindowActive("08:00", "08:00")).toBe(true);
    expect(digestWindowActive("08:15", "08:00")).toBe(true);
    expect(digestWindowActive("08:16", "08:00")).toBe(false);
    expect(digestWindowActive("00:05", "23:55")).toBe(true);
    expect(digestWindowActive("23:54", "23:55")).toBe(false);
  });
});
