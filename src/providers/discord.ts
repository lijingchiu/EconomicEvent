import type { EconomicEvent, Env, Impact, Market } from "../types";
import { formatInTimezone } from "../domain/time";
import { CATEGORY_LABELS } from "../domain/categories";

export type DiscordPayload = {
  content?: string;
  embeds: Array<{ title: string; description?: string; color: number; fields: Array<{ name: string; value: string; inline?: boolean }>; footer: { text: string }; timestamp: string }>;
  allowed_mentions: { parse?: string[]; users?: string[]; roles?: string[] };
};

const COLORS: Record<Impact | "test", number> = { high: 0xE74C3C, medium: 0xF39C12, low: 0x7F8C8D, test: 0x3498DB };
const marketLabels: Record<Market, string> = { NQ: "NQ", GOLD: "黃金", CRUDE_OIL: "原油", USD: "美元", RATES: "利率" };

function mentionPolicy(mention: string): { content?: string; allowed_mentions: DiscordPayload["allowed_mentions"] } {
  if (!mention) return { allowed_mentions: { parse: [] } };
  if (mention === "@everyone" || mention === "@here") return { content: mention, allowed_mentions: { parse: [mention.slice(1)] } };
  const user = /^<@!?(\d+)>$/.exec(mention);
  if (user) return { content: mention, allowed_mentions: { users: [user[1]] } };
  const role = /^<@&(\d+)>$/.exec(mention);
  if (role) return { content: mention, allowed_mentions: { roles: [role[1]] } };
  return { allowed_mentions: { parse: [] } };
}

function metricValue(value: string | null | undefined, unit: string | null | undefined): string {
  if (!value) return "—";
  return unit ? `${value} ${unit}` : value;
}

export function buildEventPayload(event: EconomicEvent, reminderMinutes: number, env: Env): DiscordPayload {
  const mention = mentionPolicy(env.DISCORD_MENTION?.trim() ?? "");
  const isResult = reminderMinutes === -1;
  const minutesText = reminderMinutes === 1 ? "1 分鐘" : `${reminderMinutes} 分鐘`;
  return {
    ...(mention.content ? { content: mention.content } : {}),
    embeds: [{
      title: isResult ? "📊 美國經濟數據公布" : "📣 美國經濟事件提醒",
      description: isResult ? `${event.name} 已公布官方數值。` : `${event.name} 將在 ${minutesText} 後公布。`,
      color: COLORS[event.impact],
      fields: [
        { name: "事件", value: event.name, inline: false },
        { name: "本地時間", value: formatInTimezone(event.eventTimeUtc, event.localDisplayTimezone), inline: true },
        { name: "UTC", value: event.eventTimeUtc.replace("T", " ").replace(".000Z", " UTC"), inline: true },
        { name: "分類", value: CATEGORY_LABELS[event.category], inline: true },
        { name: "影響程度", value: event.impact.toUpperCase(), inline: true },
        { name: "Actual", value: metricValue(event.actualValue, event.valueUnit), inline: true },
        { name: "Forecast", value: metricValue(event.forecastValue, event.valueUnit), inline: true },
        { name: "Prior", value: metricValue(event.previousValue, event.valueUnit), inline: true },
        { name: "Surprise", value: event.derivedMetrics?.surprise == null ? "—" : `${event.derivedMetrics.surprise > 0 ? "+" : ""}${event.derivedMetrics.surprise}${event.valueUnit ? ` ${event.valueUnit}` : ""}`, inline: true },
        { name: "可能影響市場", value: event.affectedMarkets.map((market) => marketLabels[market]).join("、"), inline: false },
        { name: "資料來源", value: `${event.provider.toUpperCase()} — ${event.sourceUrl}`, inline: false },
      ],
      footer: { text: isResult ? "官方發布結果；Forecast 為市場共識，官方未提供時顯示 —。" : "官方排程提醒；Actual / Forecast / Prior 會在資料源提供時顯示。" },
      timestamp: event.eventTimeUtc,
    }],
    allowed_mentions: mention.allowed_mentions,
  };
}

export function buildTestPayload(env: Env): DiscordPayload {
  const mention = mentionPolicy(env.DISCORD_MENTION?.trim() ?? "");
  return {
    ...(mention.content ? { content: mention.content } : {}),
    embeds: [{ title: "🔔 經濟事件通知系統測試", description: "這是一則明確的 Discord Webhook 測試訊息，不代表實際經濟事件。", color: COLORS.test, fields: [{ name: "狀態", value: "Webhook 可用" }], footer: { text: "測試訊息" }, timestamp: new Date().toISOString() }],
    allowed_mentions: mention.allowed_mentions,
  };
}

class DiscordHttpError extends Error { constructor(public readonly status: number, public readonly retryable: boolean, public readonly retryAfterMs = 0, message = "Discord webhook request failed") { super(message); } }

export class DiscordWebhookClient {
  constructor(private readonly env: Env, private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis), private readonly sleeper: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {}

  async send(payload: DiscordPayload): Promise<{ messageId?: string }> {
    const webhook = this.env.DISCORD_WEBHOOK_URL?.trim();
    if (!webhook || webhook === "replace_me") throw new Error("DISCORD_WEBHOOK_URL is not configured");
    const url = new URL(webhook);
    url.searchParams.set("wait", "true");
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetcher(url.toString(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
        if (response.status === 200 || response.status === 204) { const body = response.status === 200 ? await response.json().catch(() => ({})) as { id?: string } : {}; return { messageId: body.id }; }
        const data = await response.json().catch(() => ({})) as { retry_after?: number; message?: string };
        throw new DiscordHttpError(response.status, response.status === 429 || response.status >= 500, response.status === 429 ? Math.min(10_000, Math.max(0, Number(data.retry_after ?? 0) * 1_000)) : 0, data.message ?? `Discord HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
        const retryable = error instanceof DiscordHttpError ? error.retryable : true;
        if (attempt >= 3 || !retryable) throw error;
        const explicitDelay = error instanceof DiscordHttpError ? error.retryAfterMs : 0;
        const backoff = Math.min(2_000, 250 * (2 ** (attempt - 1)));
        await this.sleeper(explicitDelay || backoff + Math.floor(Math.random() * 100));
      }
    }
    throw lastError;
  }

  async sendEventReminder(event: EconomicEvent, reminderMinutes: number): Promise<{ messageId?: string }> { return this.send(buildEventPayload(event, reminderMinutes, this.env)); }
  async sendTest(): Promise<{ messageId?: string }> { return this.send(buildTestPayload(this.env)); }
}

export { DiscordHttpError };
