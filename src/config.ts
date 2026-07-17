import type { AppConfig, Env, Impact, NotificationChannel, ProviderName } from "./types";
import { listSettings } from "./repositories/settings";

export const ALL_PROVIDERS: ProviderName[] = ["bls", "bea", "federal_reserve", "eia", "census", "ism", "umich"];
export const ALL_NOTIFICATION_CHANNELS: NotificationChannel[] = ["discord", "web_push", "telegram", "email", "slack", "line"];

export function configuredNotificationChannels(env: Env): NotificationChannel[] {
  return ALL_NOTIFICATION_CHANNELS.filter((channel) => {
    if (channel === "discord") return Boolean(env.DISCORD_WEBHOOK_URL?.trim());
    if (channel === "telegram") return Boolean(env.TELEGRAM_BOT_TOKEN?.trim() && env.TELEGRAM_CHAT_ID?.trim());
    if (channel === "slack") return Boolean(env.SLACK_WEBHOOK_URL?.trim());
    if (channel === "line") return Boolean(env.LINE_CHANNEL_ACCESS_TOKEN?.trim() && env.LINE_USER_ID?.trim());
    if (channel === "email") return Boolean(env.EMAIL_API_URL?.trim() && env.EMAIL_API_KEY?.trim() && env.EMAIL_FROM?.trim() && env.EMAIL_TO?.trim());
    return Boolean(env.WEB_PUSH_GATEWAY_URL?.trim() && env.WEB_PUSH_API_KEY?.trim());
  });
}

function parseNotificationChannels(value: string | undefined, configured: NotificationChannel[]): NotificationChannel[] {
  if (!value?.trim()) return configured;
  const requested = value.split(",").map((item) => item.trim().toLowerCase()).filter((item): item is NotificationChannel => ALL_NOTIFICATION_CHANNELS.includes(item as NotificationChannel));
  return [...new Set(requested)].filter((channel) => configured.includes(channel));
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseReminderMinutes(value: string | undefined): number[] {
  const values = (value ?? "60,30,15,5")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isInteger(part) && part > 0 && part <= 24 * 60)
    .filter((part, index, all) => all.indexOf(part) === index)
    .sort((a, b) => b - a);
  return values.length ? values : [60, 30, 15, 5];
}

export function getConfig(env: Env): AppConfig {
  const impact = env.EVENT_IMPACT_FILTER?.toLowerCase();
  const eventImpactFilter: Impact = impact === "low" || impact === "medium" ? impact : "high";
  const enabledProviders = ALL_PROVIDERS.filter((provider) => {
    const key = `ENABLE_${provider === "federal_reserve" ? "FEDERAL_RESERVE" : provider.toUpperCase()}` as keyof Env;
    return bool(env[key] as string | undefined, true);
  });
  const configuredChannels = configuredNotificationChannels(env);

  return {
    appTimezone: env.APP_TIMEZONE || "Asia/Taipei",
    reminderMinutes: parseReminderMinutes(env.REMINDER_MINUTES),
    syncDaysAhead: positiveInt(env.SYNC_DAYS_AHEAD, 45),
    eventImpactFilter,
    storeMediumEvents: bool(env.STORE_MEDIUM_EVENTS, false),
    discordMention: env.DISCORD_MENTION?.trim() ?? "",
    enabledProviders,
    notificationsEnabled: bool(env.NOTIFICATIONS_ENABLED, true),
    notificationChannels: parseNotificationChannels(env.NOTIFICATION_CHANNELS, configuredChannels),
  };
}

export type RuntimeSettingsPatch = {
  appTimezone?: string;
  reminderMinutes?: number[];
  syncDaysAhead?: number;
  eventImpactFilter?: Impact;
  storeMediumEvents?: boolean;
  discordMention?: string;
  notificationsEnabled?: boolean;
  enabledProviders?: ProviderName[];
  notificationChannels?: NotificationChannel[];
};

export function publicSettings(config: AppConfig): RuntimeSettingsPatch {
  return {
    appTimezone: config.appTimezone,
    reminderMinutes: config.reminderMinutes,
    syncDaysAhead: config.syncDaysAhead,
    eventImpactFilter: config.eventImpactFilter,
    storeMediumEvents: config.storeMediumEvents,
    discordMention: config.discordMention,
    notificationsEnabled: config.notificationsEnabled,
    enabledProviders: config.enabledProviders,
    notificationChannels: config.notificationChannels,
  };
}

function configFromSettings(base: AppConfig, settings: Record<string, string>): AppConfig {
  const providerEnabled = (provider: ProviderName): boolean => bool(settings[`ENABLE_${provider === "federal_reserve" ? "FEDERAL_RESERVE" : provider.toUpperCase()}`], base.enabledProviders.includes(provider));
  return {
    appTimezone: settings.APP_TIMEZONE?.trim() || base.appTimezone,
    reminderMinutes: parseReminderMinutes(settings.REMINDER_MINUTES ?? base.reminderMinutes.join(",")),
    syncDaysAhead: positiveInt(settings.SYNC_DAYS_AHEAD, base.syncDaysAhead),
    eventImpactFilter: settings.EVENT_IMPACT_FILTER === "low" || settings.EVENT_IMPACT_FILTER === "medium" ? settings.EVENT_IMPACT_FILTER : settings.EVENT_IMPACT_FILTER === "high" ? "high" : base.eventImpactFilter,
    storeMediumEvents: bool(settings.STORE_MEDIUM_EVENTS, base.storeMediumEvents),
    discordMention: settings.DISCORD_MENTION?.trim() ?? base.discordMention,
    enabledProviders: ALL_PROVIDERS.filter(providerEnabled),
    notificationsEnabled: bool(settings.NOTIFICATIONS_ENABLED, base.notificationsEnabled),
    notificationChannels: parseNotificationChannels(settings.NOTIFICATION_CHANNELS, base.notificationChannels),
  };
}

export async function getRuntimeConfig(env: Env): Promise<AppConfig> {
  const base = getConfig(env);
  if (!env.DB || typeof env.DB.prepare !== "function") return base;
  try {
    return configFromSettings(base, await listSettings(env.DB));
  } catch {
    // Keep the Worker healthy during the brief window before migration 0002 is applied.
    return base;
  }
}

export function validateSettingsPatch(input: unknown): RuntimeSettingsPatch {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("settings payload must be an object");
  const value = input as Record<string, unknown>;
  const patch: RuntimeSettingsPatch = {};
  if (value.appTimezone !== undefined) {
    if (typeof value.appTimezone !== "string" || !value.appTimezone.trim() || value.appTimezone.length > 80) throw new Error("appTimezone is invalid");
    try { new Intl.DateTimeFormat("en-US", { timeZone: value.appTimezone }); } catch { throw new Error("appTimezone is not a supported IANA timezone"); }
    patch.appTimezone = value.appTimezone.trim();
  }
  if (value.reminderMinutes !== undefined) {
    if (!Array.isArray(value.reminderMinutes) || !value.reminderMinutes.length || value.reminderMinutes.some((item) => !Number.isInteger(item) || Number(item) <= 0 || Number(item) > 24 * 60)) throw new Error("reminderMinutes must contain integers from 1 to 1440");
    patch.reminderMinutes = [...new Set(value.reminderMinutes as number[])].sort((a, b) => b - a);
  }
  if (value.syncDaysAhead !== undefined) {
    if (!Number.isInteger(value.syncDaysAhead) || Number(value.syncDaysAhead) < 1 || Number(value.syncDaysAhead) > 365) throw new Error("syncDaysAhead must be between 1 and 365");
    patch.syncDaysAhead = Number(value.syncDaysAhead);
  }
  if (value.eventImpactFilter !== undefined) {
    if (value.eventImpactFilter !== "low" && value.eventImpactFilter !== "medium" && value.eventImpactFilter !== "high") throw new Error("eventImpactFilter is invalid");
    patch.eventImpactFilter = value.eventImpactFilter;
  }
  for (const key of ["storeMediumEvents", "notificationsEnabled"] as const) {
    if (value[key] !== undefined) {
      if (typeof value[key] !== "boolean") throw new Error(`${key} must be boolean`);
      patch[key] = value[key];
    }
  }
  if (value.discordMention !== undefined) {
    if (typeof value.discordMention !== "string" || value.discordMention.length > 100) throw new Error("discordMention is invalid");
    patch.discordMention = value.discordMention.trim();
  }
  if (value.enabledProviders !== undefined) {
    if (!Array.isArray(value.enabledProviders) || value.enabledProviders.some((item) => !ALL_PROVIDERS.includes(item as ProviderName))) throw new Error("enabledProviders contains an unknown provider");
    patch.enabledProviders = [...new Set(value.enabledProviders as ProviderName[])];
  }
  if (value.notificationChannels !== undefined) {
    if (!Array.isArray(value.notificationChannels) || value.notificationChannels.some((item) => !ALL_NOTIFICATION_CHANNELS.includes(item as NotificationChannel))) throw new Error("notificationChannels contains an unknown channel");
    patch.notificationChannels = [...new Set(value.notificationChannels as NotificationChannel[])];
  }
  return patch;
}

export function settingsToRows(patch: RuntimeSettingsPatch): Record<string, string> {
  const rows: Record<string, string> = {};
  if (patch.appTimezone !== undefined) rows.APP_TIMEZONE = patch.appTimezone;
  if (patch.reminderMinutes !== undefined) rows.REMINDER_MINUTES = patch.reminderMinutes.join(",");
  if (patch.syncDaysAhead !== undefined) rows.SYNC_DAYS_AHEAD = String(patch.syncDaysAhead);
  if (patch.eventImpactFilter !== undefined) rows.EVENT_IMPACT_FILTER = patch.eventImpactFilter;
  if (patch.storeMediumEvents !== undefined) rows.STORE_MEDIUM_EVENTS = String(patch.storeMediumEvents);
  if (patch.discordMention !== undefined) rows.DISCORD_MENTION = patch.discordMention;
  if (patch.notificationsEnabled !== undefined) rows.NOTIFICATIONS_ENABLED = String(patch.notificationsEnabled);
  if (patch.enabledProviders !== undefined) {
    rows.ENABLE_BLS = String(patch.enabledProviders.includes("bls"));
    rows.ENABLE_BEA = String(patch.enabledProviders.includes("bea"));
    rows.ENABLE_FEDERAL_RESERVE = String(patch.enabledProviders.includes("federal_reserve"));
    rows.ENABLE_EIA = String(patch.enabledProviders.includes("eia"));
    rows.ENABLE_CENSUS = String(patch.enabledProviders.includes("census"));
    rows.ENABLE_ISM = String(patch.enabledProviders.includes("ism"));
    rows.ENABLE_UMICH = String(patch.enabledProviders.includes("umich"));
  }
  if (patch.notificationChannels !== undefined) rows.NOTIFICATION_CHANNELS = patch.notificationChannels.join(",");
  return rows;
}
