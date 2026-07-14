import type { EconomicEventCategory, Impact } from "../types";
import { baseEventName, normalizeEventName } from "./normalization";
import { affectedMarketsFor } from "./market-impact";

export type Classification = { category: EconomicEventCategory; impact: Impact; tracked: boolean };

const exactAliases: Record<string, string> = {
  "cpi": "consumer price index", "cpi u": "consumer price index", "core cpi": "core cpi",
  "ppi": "producer price index", "nfp": "nonfarm payrolls", "non farm payrolls": "nonfarm payrolls",
  "jolts job openings": "job openings and labor turnover survey", "fomc interest rate decision": "federal funds rate",
  "ppi mom": "producer price index mom", "retail sales mom": "retail sales mom",
  "eia crude oil inventories": "crude oil inventories",
};

function startsWithAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value === term || value.startsWith(`${term} `));
}

export function classifyEventName(name: string): Classification {
  const normalized = normalizeEventName(name);
  const alias = exactAliases[normalized];
  const candidate = alias ?? normalized;
  if (/^cpi methodology update|^consumer price index methodology|^producer price index methodology/.test(normalized)) return { category: "other", impact: "low", tracked: false };

  if (startsWithAny(candidate, ["consumer price index", "core cpi", "inflation rate", "core inflation rate", "producer price index", "core ppi", "pce price index", "core pce", "import and export price indexes", "import prices", "employment cost index"])) return { category: "inflation", impact: "high", tracked: true };
  if (startsWithAny(candidate, ["employment situation", "nonfarm payrolls", "unemployment rate", "average hourly earnings", "job openings and labor turnover survey", "initial jobless claims", "adp employment change"])) return { category: "employment", impact: "high", tracked: true };
  if (startsWithAny(candidate, ["gross domestic product", "gdp", "personal income and outlays", "personal income", "personal spending", "retail sales", "industrial production", "durable goods orders", "productivity and costs"])) return { category: "growth", impact: "high", tracked: true };
  if (startsWithAny(candidate, ["fomc", "federal funds rate", "fomc statement", "fomc press conference", "fomc minutes", "monetary policy report", "beige book", "fed chair testimony", "fed chair speech", "testimony", "speech"])) return { category: "monetary_policy", impact: "high", tracked: true };
  if (startsWithAny(candidate, ["ism manufacturing pmi", "s and p global manufacturing pmi"])) return { category: "manufacturing", impact: "high", tracked: true };
  if (startsWithAny(candidate, ["ism services pmi", "s and p global services pmi"])) return { category: "services", impact: "high", tracked: true };
  if (startsWithAny(candidate, ["building permits", "housing starts", "housing completions"])) return { category: "housing", impact: "high", tracked: true };
  if (startsWithAny(candidate, ["michigan consumer sentiment", "consumer sentiment"])) return { category: "consumer", impact: "high", tracked: true };
  if (startsWithAny(candidate, ["weekly petroleum status report", "crude oil inventories", "gasoline inventories", "distillate inventories", "natural gas storage"])) return { category: "energy", impact: "high", tracked: true };
  if (startsWithAny(candidate, ["international trade", "international transactions", "corporate profits"])) return { category: "trade", impact: "medium", tracked: false };
  return { category: "other", impact: "low", tracked: false };
}

export function classifyAndMap(name: string): Classification & { normalizedName: string; affectedMarkets: ReturnType<typeof affectedMarketsFor> } {
  const rawNormalized = normalizeEventName(name);
  const normalizedName = exactAliases[rawNormalized] ?? baseEventName(name).replace(/\s+(cpi|ppi)$/i, "");
  const classification = classifyEventName(name);
  return { ...classification, normalizedName, affectedMarkets: affectedMarketsFor(name, classification.category) };
}
