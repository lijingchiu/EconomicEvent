import type { EconomicEvent, EventDerivedMetrics } from "../types";

function numeric(value: string | null | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value.replace(/,/g, "").replace(/%$/, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function rounded(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function deriveEventMetrics(event: Pick<EconomicEvent, "actualValue" | "forecastValue" | "previousValue">): EventDerivedMetrics {
  const actual = numeric(event.actualValue);
  const forecast = numeric(event.forecastValue);
  const previous = numeric(event.previousValue);
  return {
    surprise: actual == null || forecast == null ? null : rounded(actual - forecast),
    surprisePercent: actual == null || forecast == null || forecast === 0 ? null : rounded(((actual - forecast) / Math.abs(forecast)) * 100),
    changeFromPrior: actual == null || previous == null ? null : rounded(actual - previous),
  };
}
