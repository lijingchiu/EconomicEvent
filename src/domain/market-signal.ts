import type { EconomicEvent, Market } from "../types";

export type MarketSignal = {
  market: Extract<Market, "NQ" | "GOLD" | "CRUDE_OIL" | "USD">;
  direction: "bullish" | "bearish";
  label: string;
};

const LABELS: Record<MarketSignal["market"], string> = {
  NQ: "NQ",
  GOLD: "黃金",
  CRUDE_OIL: "石油",
  USD: "美元",
};

export function numericValue(value: string | null | undefined): number | null {
  if (!value) return null;
  const normalized = value.replace(/,/g, "").trim();
  const match = /^([-+]?\d+(?:\.\d+)?)\s*([KMBT])?%?$/i.exec(normalized);
  if (!match) return null;
  const scale = ({ K: 1e3, M: 1e6, B: 1e9, T: 1e12 } as const)[match[2]?.toUpperCase() as "K" | "M" | "B" | "T"] ?? 1;
  return Number(match[1]) * scale;
}

export function compareToForecast(event: Pick<EconomicEvent, "actualValue" | "forecastValue">): "higher" | "lower" | "equal" | "unknown" {
  const actual = numericValue(event.actualValue);
  const forecast = numericValue(event.forecastValue);
  if (actual == null || forecast == null) return "unknown";
  return actual === forecast ? "equal" : actual > forecast ? "higher" : "lower";
}

export function isQualitativeEvent(event: Pick<EconomicEvent, "name">): boolean {
  return /\b(speech|testimony|discussion|press conference|minutes|beige book)\b/i.test(event.name);
}

export function buildMarketSignals(event: EconomicEvent): MarketSignal[] {
  if (isQualitativeEvent(event)) return [];
  const actual = numericValue(event.actualValue);
  const forecast = numericValue(event.forecastValue);
  if (actual == null || forecast == null || actual === forecast) return [];

  const higher = actual > forecast;
  const directions = new Map<MarketSignal["market"], MarketSignal["direction"]>();
  const set = (market: MarketSignal["market"], bullishWhenHigher: boolean) => {
    directions.set(market, higher === bullishWhenHigher ? "bullish" : "bearish");
  };

  if (event.category === "energy") {
    // A larger-than-expected inventory build generally weighs on the commodity.
    set("CRUDE_OIL", false);
  } else if (event.category === "inflation" || /interest rate|federal funds rate/i.test(event.name)) {
    // Hotter inflation or a higher policy rate tends to lift USD expectations
    // while weighing on rate-sensitive equities and non-yielding gold.
    set("NQ", false);
    set("GOLD", false);
    set("USD", true);
  } else {
    // For activity data, a positive surprise is treated as stronger growth.
    set("NQ", true);
    set("GOLD", false);
    set("CRUDE_OIL", true);
    set("USD", true);
  }

  return event.affectedMarkets
    .filter((market): market is MarketSignal["market"] => directions.has(market as MarketSignal["market"]))
    .map((market) => {
      const direction = directions.get(market)!;
      return { market, direction, label: `利${direction === "bullish" ? "多" : "空"}${LABELS[market]}` };
    });
}
