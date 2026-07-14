import type { EconomicEventCategory } from "../types";

export const CATEGORY_LABELS: Record<EconomicEventCategory, string> = {
  inflation: "Inflation", employment: "Employment", growth: "Growth", monetary_policy: "Monetary Policy",
  consumer: "Consumer", manufacturing: "Manufacturing", services: "Services", energy: "Energy",
  trade: "Trade", housing: "Housing", central_bank: "Central Bank", other: "Other",
};
