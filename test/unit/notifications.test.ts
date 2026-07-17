import { afterEach, describe, expect, it, vi } from "vitest";
import { createNotificationAdapters, eventNotificationText, NotificationHttpError } from "../../src/providers/notifications";
import type { EconomicEvent, Env } from "../../src/types";

const event: EconomicEvent = {
  id: "eia_1",
  provider: "eia",
  sourceUrl: "https://www.eia.gov/petroleum/supply/weekly/",
  name: "Crude Oil Inventories",
  normalizedName: "crude oil inventories",
  category: "energy",
  country: "US",
  currency: "USD",
  eventTimeUtc: "2026-07-15T14:30:00.000Z",
  localDisplayTimezone: "Asia/Taipei",
  impact: "high",
  affectedMarkets: ["CRUDE_OIL", "USD"],
  actualValue: "726.2",
  previousValue: "707.9",
  valueUnit: "thousand barrels",
  rawHash: "hash",
};

describe("notification adapters", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reports configured channels without exposing credentials", () => {
    const adapters = createNotificationAdapters({ DB: {} as D1Database, SLACK_WEBHOOK_URL: "https://hooks.slack.test/abc" });
    expect(adapters.get("slack")?.configured).toBe(true);
    expect(adapters.get("telegram")?.configured).toBe(false);
    expect(eventNotificationText(event, -1)).toContain("Actual: 726.2 thousand barrels");
  });

  it("sends a normalized event message and classifies permanent HTTP failures", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ id: "slack-1" }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "invalid token" }), { status: 401, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);
    const env = { DB: {} as D1Database, SLACK_WEBHOOK_URL: "https://hooks.slack.test/abc" } as Env;
    const first = createNotificationAdapters(env).get("slack");
    await expect(first?.sendEvent(event, 15)).resolves.toEqual({ externalMessageId: "slack-1" });
    const second = createNotificationAdapters(env).get("slack");
    await expect(second?.sendTest()).rejects.toMatchObject({ status: 401, retryable: false } satisfies Partial<NotificationHttpError>);
    expect(String(fetcher.mock.calls[0][1]?.body)).toContain("Crude Oil Inventories");
  });
});
