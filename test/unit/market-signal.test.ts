import { describe, expect, it } from "vitest";
import { buildMarketSignals } from "../../src/domain/market-signal";
import type { EconomicEvent } from "../../src/types";

function event(patch: Partial<EconomicEvent>): EconomicEvent {
  return {
    id: "event", provider: "bls", sourceUrl: "https://example.com", name: "Non Farm Payrolls",
    normalizedName: "nonfarm payrolls", category: "employment", country: "US", currency: "USD",
    eventTimeUtc: "2026-07-15T12:30:00.000Z", localDisplayTimezone: "Asia/Taipei", impact: "high",
    affectedMarkets: ["NQ", "GOLD", "CRUDE_OIL", "USD", "RATES"], rawHash: "hash", ...patch,
  };
}

describe("market direction labels", () => {
  it("labels a stronger activity surprise only when Actual and Forecast exist", () => {
    expect(buildMarketSignals(event({ actualValue: "250K", forecastValue: "180K" })).map((item) => item.label))
      .toEqual(["利多NQ", "利空黃金", "利多石油", "利多美元"]);
    expect(buildMarketSignals(event({ actualValue: "250K", forecastValue: null }))).toEqual([]);
  });

  it("uses the inverse oil rule for inventory builds", () => {
    expect(buildMarketSignals(event({ name: "Crude Oil Inventories", category: "energy", actualValue: "3.2M", forecastValue: "1.1M", affectedMarkets: ["CRUDE_OIL"] }))[0]?.label)
      .toBe("利空石油");
  });

  it("never assigns a directional label to speeches or testimony", () => {
    expect(buildMarketSignals(event({ name: "Fed Chair Warsh Testimony", category: "monetary_policy", actualValue: "1", forecastValue: "0" }))).toEqual([]);
  });
});
