import { describe, expect, it } from "vitest";
import { deriveEventMetrics } from "../../src/domain/derived-metrics";

describe("event derived metrics", () => {
  it("calculates surprise and prior change only from available numeric values", () => {
    expect(deriveEventMetrics({ actualValue: "3.2", forecastValue: "2.8", previousValue: "2.5" })).toEqual({ surprise: 0.4, surprisePercent: 14.286, changeFromPrior: 0.7 });
    expect(deriveEventMetrics({ actualValue: null, forecastValue: "2.8", previousValue: "2.5" })).toEqual({ surprise: null, surprisePercent: null, changeFromPrior: null });
  });
});
