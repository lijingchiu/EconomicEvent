import { describe, expect, it } from "vitest";
import { explainEvent } from "../../src/domain/event-explanation";
import type { EconomicEvent } from "../../src/types";

const base: EconomicEvent = { id: "x", provider: "bls", sourceUrl: "https://example.com", name: "Non Farm Payrolls", normalizedName: "nonfarm payrolls", category: "employment", country: "US", currency: "USD", eventTimeUtc: "2026-07-15T12:30:00.000Z", localDisplayTimezone: "Asia/Taipei", impact: "high", affectedMarkets: ["NQ", "GOLD", "USD"], rawHash: "x" };

describe("event explanations", () => {
  it("explains a quantitative event and its surprise direction", () => {
    const result = explainEvent({ ...base });
    expect(result.chineseName).toContain("非農");
    expect(result.definition).toContain("就業");
    expect(result.marketImpact).toContain("高於預期");
    expect(result.marketImpact).toContain("低於預期");
    expect(result.marketImpact).toContain("利空黃金");
  });

  it("does not invent direction for qualitative events", () => {
    const result = explainEvent({ ...base, name: "Fed Chair Warsh Testimony", category: "monetary_policy" });
    expect(result.chineseName).toContain("演說");
    expect(result.marketImpact).toContain("不會自動標示利多或利空");
  });
});
