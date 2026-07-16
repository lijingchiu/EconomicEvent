import { classifyAndMap } from "../domain/importance";
import { deterministicEventId, rawEventHash } from "../domain/event-id";
import { parseOfficialDateTime, validateEventTime } from "../domain/time";
import { getConfig } from "../config";
import type { AppConfig, EconomicEvent, Env, ProviderName, ProviderWarning } from "../types";

export type ReleaseValueFields = {
  actualValue?: string | null;
  forecastValue?: string | null;
  previousValue?: string | null;
  valueUnit?: string | null;
  valueSourceUrl?: string | null;
};

export async function eventFromRelease(input: {
  provider: ProviderName;
  providerEventId?: string;
  sourceUrl: string;
  name: string;
  eventTimeUtc: string;
  description?: string | null;
  sourceUpdatedAt?: string | null;
  raw: unknown;
  values?: ReleaseValueFields;
}, env: Env, suppliedConfig?: AppConfig): Promise<{ event?: EconomicEvent; warning?: ProviderWarning }> {
  const timeWarning = validateEventTime(input.eventTimeUtc);
  if (timeWarning) return { warning: { ...timeWarning, provider: input.provider, sourceUrl: input.sourceUrl } };
  const classification = classifyAndMap(input.name);
  const config = suppliedConfig ?? getConfig(env);
  const rank = { low: 0, medium: 1, high: 2 } as const;
  const allowed = rank[classification.impact] >= rank[config.eventImpactFilter] && (classification.tracked || (classification.impact === "medium" && config.storeMediumEvents));
  if (!allowed) return {};
  const id = await deterministicEventId(input.provider, input.providerEventId, classification.normalizedName, input.eventTimeUtc, input.sourceUrl);
  return {
    event: {
      id,
      provider: input.provider,
      providerEventId: input.providerEventId,
      sourceUrl: input.sourceUrl,
      name: input.name.trim(),
      normalizedName: classification.normalizedName,
      category: classification.category,
      country: "US",
      currency: "USD",
      eventTimeUtc: input.eventTimeUtc,
      localDisplayTimezone: config.appTimezone,
      impact: classification.impact,
      affectedMarkets: classification.affectedMarkets,
      description: input.description ?? null,
      actualValue: input.values?.actualValue ?? null,
      forecastValue: input.values?.forecastValue ?? null,
      previousValue: input.values?.previousValue ?? null,
      valueUnit: input.values?.valueUnit ?? null,
      valueSourceUrl: input.values?.valueSourceUrl ?? null,
      sourceUpdatedAt: input.sourceUpdatedAt ?? null,
      rawHash: await rawEventHash(input.raw),
    },
  };
}

/**
 * Turns a release-level schedule into the metric rows users see in a macro
 * calendar. Official release calendars generally publish one release time for
 * several metrics; keeping a stable suffix makes each metric independently
 * filterable and independently notifiable without inventing release times.
 */
export function releaseMetricNames(name: string): string[] {
  const normalized = name.toLowerCase();
  if (/methodology/.test(normalized)) return [name];
  if (/^state job openings and labor turnover/.test(normalized)) return [name];
  if (/consumer price index|\bcpi\b/.test(normalized) && !/producer/.test(normalized)) return ["Inflation Rate MoM", "Core Inflation Rate MoM", "Inflation Rate YoY", "Core Inflation Rate YoY"];
  if (/producer price index|\bppi\b/.test(normalized)) return ["PPI MoM"];
  if (/employment situation|\bnfp\b|non.?farm payroll/.test(normalized)) return ["Non Farm Payrolls", "Unemployment Rate"];
  if (/job openings and labor turnover|\bjolts?\b/.test(normalized)) return ["JOLTs Job Openings"];
  if (/personal income and outlays/.test(normalized)) return ["Core PCE Price Index MoM", "Personal Income MoM", "Personal Spending MoM"];
  if (/gross domestic product|\bgdp\b/.test(normalized)) return [/advance|1st|first/.test(normalized) ? "GDP Growth Rate QoQ Adv" : "GDP Growth Rate QoQ"];
  if (/retail sales|monthly sales for retail/.test(normalized)) return ["Retail Sales MoM"];
  if (/durable goods orders|durable goods.*manufacturers/.test(normalized)) return ["Durable Goods Orders MoM"];
  if (/new residential construction/.test(normalized)) return ["Building Permits Prel", "Housing Starts"];
  if (/weekly petroleum status report/.test(normalized)) return ["Crude Oil Inventories", "Gasoline Inventories", "Distillate Inventories"];
  if (/weekly natural gas storage report|natural gas storage/.test(normalized)) return ["Natural Gas Storage"];
  return [name];
}

export function metricProviderEventId(base: string, originalName: string, metricName: string): string {
  if (metricName === originalName) return base;
  const suffix = metricName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base}|${suffix}`;
}

export function dateAndTimeToUtc(date: string, time: string, timeZone = "America/New_York"): string {
  const isoDate = parseDateOnly(date);
  const match = /^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/i.exec(time.trim());
  if (!match) throw new Error(`unsupported time: ${time}`);
  let hour = Number(match[1]);
  if (match[3].toLowerCase() === "p" && hour !== 12) hour += 12;
  if (match[3].toLowerCase() === "a" && hour === 12) hour = 0;
  return parseOfficialDateTime(`${isoDate}T${String(hour).padStart(2, "0")}:${match[2]}:00`, timeZone).toISOString();
}

export function parseDateOnly(value: string): string {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value.trim());
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (slash) return `${slash[3]}-${slash[1].padStart(2, "0")}-${slash[2].padStart(2, "0")}`;
  const named = /^(?:[A-Za-z]+,?\s+)?([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/.exec(value.trim());
  if (!named) throw new Error(`unsupported date: ${value}`);
  const month = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].indexOf(named[1].toLowerCase()) + 1;
  if (month < 1) throw new Error(`unsupported month: ${named[1]}`);
  return `${named[3]}-${String(month).padStart(2, "0")}-${named[2].padStart(2, "0")}`;
}

export function inRange(instant: string, fromUtc: Date, toUtc: Date): boolean { const time = new Date(instant).getTime(); return time >= fromUtc.getTime() && time <= toUtc.getTime(); }
