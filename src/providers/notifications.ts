import type { EconomicEvent, Env, NotificationChannel } from "../types";
import { formatInTimezone } from "../domain/time";
import { DiscordWebhookClient } from "./discord";

export type NotificationSendResult = { externalMessageId?: string };

export interface NotificationAdapter {
  readonly channel: NotificationChannel;
  readonly configured: boolean;
  sendEvent(event: EconomicEvent, reminderMinutes: number): Promise<NotificationSendResult>;
  sendTest(): Promise<NotificationSendResult>;
  sendMessage(title: string, text: string): Promise<NotificationSendResult>;
}

export class NotificationHttpError extends Error {
  constructor(public readonly channel: NotificationChannel, public readonly status: number, public readonly retryable: boolean, message: string) {
    super(message);
  }
}

function metric(value: string | null | undefined, unit: string | null | undefined): string {
  return value == null || value === "" ? "尚未提供" : `${value}${unit ? ` ${unit}` : ""}`;
}

export function eventNotificationText(event: EconomicEvent, reminderMinutes: number): string {
  const result = reminderMinutes === -1;
  const heading = result ? "美國經濟數據公布" : "美國經濟事件提醒";
  const timing = result ? "官方數值已公布" : `${reminderMinutes} 分鐘後公布`;
  return [
    heading,
    `${event.name} · ${timing}`,
    formatInTimezone(event.eventTimeUtc, event.localDisplayTimezone),
    `Actual: ${metric(event.actualValue, event.valueUnit)}`,
    `Forecast: ${metric(event.forecastValue, event.valueUnit)}`,
    `Prior: ${metric(event.previousValue, event.valueUnit)}`,
    `Source: ${event.valueSourceUrl || event.sourceUrl}`,
  ].join("\n");
}

async function postJson(channel: NotificationChannel, url: string, body: unknown, headers: HeadersInit = {}, fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): Promise<NotificationSendResult> {
  const response = await fetcher(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof payload.message === "string" ? payload.message : `${channel} HTTP ${response.status}`;
    throw new NotificationHttpError(channel, response.status, response.status === 408 || response.status === 429 || response.status >= 500, message);
  }
  const externalMessageId = payload.id ?? (payload.result && typeof payload.result === "object" ? (payload.result as Record<string, unknown>).message_id : undefined);
  return externalMessageId == null ? {} : { externalMessageId: String(externalMessageId) };
}

class DiscordAdapter implements NotificationAdapter {
  readonly channel = "discord" as const;
  readonly configured: boolean;
  private readonly client: DiscordWebhookClient;

  constructor(env: Env) {
    this.configured = Boolean(env.DISCORD_WEBHOOK_URL?.trim());
    this.client = new DiscordWebhookClient(env);
  }

  async sendEvent(event: EconomicEvent, reminderMinutes: number): Promise<NotificationSendResult> {
    const result = await this.client.sendEventReminder(event, reminderMinutes);
    return { externalMessageId: result.messageId };
  }

  async sendTest(): Promise<NotificationSendResult> {
    const result = await this.client.sendTest();
    return { externalMessageId: result.messageId };
  }

  async sendMessage(title: string, text: string): Promise<NotificationSendResult> {
    const result = await this.client.send({ embeds: [{ title, description: text, color: 0x7a4a28, fields: [], footer: { text: "Macro Pulse" }, timestamp: new Date().toISOString() }], allowed_mentions: { parse: [] } });
    return { externalMessageId: result.messageId };
  }
}

class JsonChannelAdapter implements NotificationAdapter {
  constructor(
    readonly channel: NotificationChannel,
    readonly configured: boolean,
    private readonly sendText: (text: string, test: boolean) => Promise<NotificationSendResult>,
  ) {}

  sendEvent(event: EconomicEvent, reminderMinutes: number): Promise<NotificationSendResult> {
    if (!this.configured) throw new Error(`${this.channel} is not configured`);
    return this.sendText(eventNotificationText(event, reminderMinutes), false);
  }

  sendTest(): Promise<NotificationSendResult> {
    if (!this.configured) throw new Error(`${this.channel} is not configured`);
    return this.sendText("經濟事件通知系統測試：此頻道已成功連線。", true);
  }

  sendMessage(title: string, text: string): Promise<NotificationSendResult> {
    if (!this.configured) throw new Error(`${this.channel} is not configured`);
    return this.sendText(`${title}\n${text}`, false);
  }
}

export function createNotificationAdapters(env: Env): Map<NotificationChannel, NotificationAdapter> {
  const adapters: NotificationAdapter[] = [new DiscordAdapter(env)];

  const telegramToken = env.TELEGRAM_BOT_TOKEN?.trim();
  const telegramChat = env.TELEGRAM_CHAT_ID?.trim();
  adapters.push(new JsonChannelAdapter("telegram", Boolean(telegramToken && telegramChat), (text) =>
    postJson("telegram", `https://api.telegram.org/bot${telegramToken}/sendMessage`, { chat_id: telegramChat, text, disable_web_page_preview: true })));

  const slackUrl = env.SLACK_WEBHOOK_URL?.trim();
  adapters.push(new JsonChannelAdapter("slack", Boolean(slackUrl), (text) => postJson("slack", slackUrl || "https://invalid.local", { text })));

  const lineToken = env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const lineUser = env.LINE_USER_ID?.trim();
  adapters.push(new JsonChannelAdapter("line", Boolean(lineToken && lineUser), (text) => postJson(
    "line",
    "https://api.line.me/v2/bot/message/push",
    { to: lineUser, messages: [{ type: "text", text }] },
    { authorization: `Bearer ${lineToken}` },
  )));

  const emailUrl = env.EMAIL_API_URL?.trim();
  const emailKey = env.EMAIL_API_KEY?.trim();
  const emailFrom = env.EMAIL_FROM?.trim();
  const emailTo = env.EMAIL_TO?.trim();
  adapters.push(new JsonChannelAdapter("email", Boolean(emailUrl && emailKey && emailFrom && emailTo), (text, test) => postJson(
    "email",
    emailUrl || "https://invalid.local",
    { from: emailFrom, to: [emailTo], subject: test ? "EconomicEvent 通知測試" : text.split("\n")[0], text },
    { authorization: `Bearer ${emailKey}` },
  )));

  const pushUrl = env.WEB_PUSH_GATEWAY_URL?.trim();
  const pushKey = env.WEB_PUSH_API_KEY?.trim();
  adapters.push(new JsonChannelAdapter("web_push", Boolean(pushUrl && pushKey), (text, test) => postJson(
    "web_push",
    pushUrl || "https://invalid.local",
    { topic: "economic-events", title: test ? "通知測試" : text.split("\n")[0], body: text },
    { authorization: `Bearer ${pushKey}` },
  )));

  return new Map(adapters.map((adapter) => [adapter.channel, adapter]));
}

export function notificationChannelStatus(env: Env): Array<{ channel: NotificationChannel; configured: boolean }> {
  return [...createNotificationAdapters(env).values()].map((adapter) => ({ channel: adapter.channel, configured: adapter.configured }));
}
