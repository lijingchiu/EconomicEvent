export type ProviderName = "bls" | "bea" | "federal_reserve" | "eia" | "census" | "ism" | "umich";
export type EconomicEventCategory =
  | "inflation" | "employment" | "growth" | "monetary_policy"
  | "consumer" | "manufacturing" | "services" | "energy"
  | "trade" | "housing" | "central_bank" | "other";
export type Impact = "low" | "medium" | "high";
export type Market = "NQ" | "GOLD" | "CRUDE_OIL" | "USD" | "RATES";
export type DeliveryStatus = "pending" | "sending" | "sent" | "retry" | "failed" | "expired";

export type EconomicEvent = {
  id: string;
  provider: ProviderName;
  providerEventId?: string;
  sourceUrl: string;
  name: string;
  normalizedName: string;
  category: EconomicEventCategory;
  country: "US";
  currency: "USD";
  eventTimeUtc: string;
  localDisplayTimezone: string;
  impact: Impact;
  affectedMarkets: Market[];
  description?: string | null;
  actualValue?: string | null;
  forecastValue?: string | null;
  previousValue?: string | null;
  valueUnit?: string | null;
  valueSourceUrl?: string | null;
  sourceUpdatedAt?: string | null;
  rawHash: string;
};

export type ProviderWarning = {
  code: string;
  message: string;
  provider?: string;
  sourceUrl?: string;
  details?: Record<string, unknown>;
};

export type ProviderFetchResult = {
  provider: ProviderName;
  fetchedAtUtc: string;
  sourceUrl: string;
  events: EconomicEvent[];
  warnings: ProviderWarning[];
};

export type ProviderSyncSummary = {
  provider: ProviderName;
  sourceUrl: string;
  status: "success" | "partial" | "failed";
  receivedCount: number;
  acceptedCount: number;
  skippedCount: number;
  insertedCount: number;
  updatedCount: number;
  warningCount: number;
  errorMessage?: string;
};

export type Env = {
  DB: D1Database;
  DISCORD_WEBHOOK_URL?: string;
  ADMIN_TOKEN?: string;
  BLS_API_KEY?: string;
  BEA_API_KEY?: string;
  EIA_API_KEY?: string;
  APP_TIMEZONE?: string;
  REMINDER_MINUTES?: string;
  SYNC_DAYS_AHEAD?: string;
  EVENT_IMPACT_FILTER?: string;
  ENABLE_BLS?: string;
  ENABLE_BEA?: string;
  ENABLE_FEDERAL_RESERVE?: string;
  ENABLE_EIA?: string;
  ENABLE_CENSUS?: string;
  ENABLE_ISM?: string;
  ENABLE_UMICH?: string;
  DISCORD_MENTION?: string;
  STORE_MEDIUM_EVENTS?: string;
  NOTIFICATIONS_ENABLED?: string;
};

export type AppConfig = {
  appTimezone: string;
  reminderMinutes: number[];
  syncDaysAhead: number;
  eventImpactFilter: Impact;
  storeMediumEvents: boolean;
  discordMention: string;
  enabledProviders: ProviderName[];
  notificationsEnabled: boolean;
};
