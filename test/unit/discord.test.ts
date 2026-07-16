import { describe, expect, it, vi } from "vitest";
import { buildEventPayload, DiscordWebhookClient } from "../../src/providers/discord";
import type { EconomicEvent } from "../../src/types";

const event: EconomicEvent = { id: "bls_1", provider: "bls", providerEventId: "x", sourceUrl: "https://www.bls.gov/schedule/2026/", name: "Consumer Price Index for June 2026", normalizedName: "consumer price index", category: "inflation", country: "US", currency: "USD", eventTimeUtc: "2026-07-14T12:30:00.000Z", localDisplayTimezone: "Asia/Taipei", impact: "high", affectedMarkets: ["NQ", "GOLD", "USD", "RATES"], rawHash: "hash" };

describe("Discord webhook", () => {
  it("uses embed and disables mentions by default", () => {
    const payload = buildEventPayload(event, 15, { DB: {} as D1Database, APP_TIMEZONE: "Asia/Taipei" });
    expect(payload.allowed_mentions).toEqual({ parse: [] });
    expect(payload.embeds[0].description).toContain("15 分鐘");
    expect(JSON.stringify(payload)).not.toContain("一定上漲");
  });

  it("allows only explicit configured mentions", () => {
    const everyone = buildEventPayload(event, 5, { DB: {} as D1Database, DISCORD_MENTION: "@everyone" });
    expect(everyone.allowed_mentions).toEqual({ parse: ["everyone"] });
    const unknown = buildEventPayload(event, 5, { DB: {} as D1Database, DISCORD_MENTION: "@unknown" });
    expect(unknown.allowed_mentions).toEqual({ parse: [] });
  });

  it("formats post-release values as a result instead of a negative reminder", () => {
    const payload = buildEventPayload({ ...event, actualValue: "0.2", previousValue: "1.0", valueUnit: "%" }, -1, { DB: {} as D1Database });
    expect(payload.embeds[0].title).toContain("數據公布");
    expect(payload.embeds[0].description).toContain("已公布");
    expect(payload.embeds[0].description).not.toContain("-1 分鐘");
  });

  it("accepts 200, 204 and retries 500/429", async () => {
    const responses = [new Response(JSON.stringify({ id: "m1" }), { status: 200 }), new Response(null, { status: 204 })];
    const fetcher = vi.fn(async () => responses.shift() ?? new Response(null, { status: 204 }));
    const client = new DiscordWebhookClient({ DB: {} as D1Database, DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/token" }, fetcher, async () => {});
    expect((await client.send({ embeds: [], allowed_mentions: { parse: [] } })).messageId).toBe("m1");
    await expect(client.send({ embeds: [], allowed_mentions: { parse: [] } })).resolves.toEqual({});
    const retryFetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "rate limited", retry_after: 0 }), { status: 429 }))
      .mockResolvedValueOnce(new Response("server error", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "m2" }), { status: 200 }));
    const retryClient = new DiscordWebhookClient({ DB: {} as D1Database, DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/token" }, retryFetcher, async () => {});
    await expect(retryClient.send({ embeds: [], allowed_mentions: { parse: [] } })).resolves.toEqual({ messageId: "m2" });
    expect(retryFetcher).toHaveBeenCalledTimes(3);
  });

  it("treats HTTP 400 as a permanent failure", async () => {
    const client = new DiscordWebhookClient({ DB: {} as D1Database, DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/token" }, async () => new Response("bad", { status: 400 }), async () => {});
    await expect(client.send({ embeds: [], allowed_mentions: { parse: [] } })).rejects.toThrow("Discord HTTP 400");
  });
});
