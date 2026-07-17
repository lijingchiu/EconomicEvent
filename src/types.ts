export type ProviderName = "bls" | "bea" | "federal_reserve" | "eia" | "census" | "ism" | "umich";
export type EconomicEventCategory =
  | "inflation" | "employment" | "growth" | "monetary_policy"
  | "consumer" | "manufacturing" | "services" | "energy"
  | "trade" | "housing" | "central_bank" | "other";
export type Impact = "low" | "medium" | "high";
export type Market = "NQ" | "GOLD" | "CRUDE_OIL" | "USD" | "RATES";
export type DeliveryStatus = "pending" | "sending" | "sent" | "retry" | "failed" | "expired";
export type EventLifecycle = "scheduled" | "released" | "value_pending" | "value_available" | "revised" | "rescheduled" | "cancelled" | "source_error";
export type DataQuality = "official" | "pending" | "stale" | "revised" | "source_error";
export type ScheduledTaskStatus = "running" | "success" | "failed" | "skipped";
export type NotificationChannel = "discord" | "web_push" | "telegram" | "email" | "slack" | "line";

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
  lifecycleStatus?: EventLifecycle;
  dataQuality?: DataQuality;
  releasePeriod?: string | null;
  valueRevision?: number;
  derivedMetrics?: EventDerivedMetrics;
  rawHash: string;
};

export type EventDerivedMetrics = {
  surprise: number | null;
  surprisePercent: number | null;
  changeFromPrior: number | null;
};

export type EventValueRevision = {
  id: number;
  eventId: string;
  actualValue: string | null;
  forecastValue: string | null;
  previousValue: string | null;
  valueUnit: string | null;
  valueSourceUrl: string;
  sourceUpdatedAt: string;
  releasePeriod: string | null;
  revisionNumber: number;
  isRevision: boolean;
  rawHash: string;
  createdAt: string;
};

export type ScheduledTaskHealth = {
  taskName: string;
  status: ScheduledTaskStatus;
  cron: string;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  stale: boolean;
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
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  SLACK_WEBHOOK_URL?: string;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  LINE_USER_ID?: string;
  EMAIL_API_URL?: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_TO?: string;
  WEB_PUSH_GATEWAY_URL?: string;
  WEB_PUSH_API_KEY?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
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
  NOTIFICATION_CHANNELS?: string;
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
  notificationChannels: NotificationChannel[];
};
