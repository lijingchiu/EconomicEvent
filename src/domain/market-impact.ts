import type { EconomicEventCategory, Market } from "../types";

export function affectedMarketsFor(name: string, category: EconomicEventCategory): Market[] {
  const normalized = name.toLowerCase();
  if (category === "energy" && /natural gas|storage/.test(normalized) && !/crude|petroleum|gasoline|distillate/.test(normalized)) return ["USD"];
  if (category === "energy" && /crude|petroleum|gasoline|distillate/.test(normalized)) return ["CRUDE_OIL", "USD"];
  if (category === "inflation" || category === "employment" || category === "growth" || category === "monetary_policy" || category === "manufacturing" || category === "services") return ["NQ", "GOLD", "USD", "RATES"];
  if (category === "trade" || category === "consumer") return ["NQ", "USD", "RATES"];
  return ["NQ", "USD"];
}
