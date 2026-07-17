import { afterEach, describe, expect, it, vi } from "vitest";
import { logError } from "../../src/utils/logger";
import type { Env } from "../../src/types";

afterEach(() => vi.restoreAllMocks());

describe("structured logger", () => {
  it("redacts every configured notification credential from fields and errors", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const env = {
      DB: {} as D1Database,
      ADMIN_TOKEN: "admin-secret",
      TELEGRAM_BOT_TOKEN: "telegram-secret",
      SLACK_WEBHOOK_URL: "https://hooks.slack.test/slack-secret",
      LINE_CHANNEL_ACCESS_TOKEN: "line-secret",
      EMAIL_API_KEY: "email-secret",
      WEB_PUSH_API_KEY: "push-secret",
    } satisfies Env;
    const raw = Object.values(env).filter((value): value is string => typeof value === "string").join(" ");

    logError("credential_test", new Error(raw), { detail: raw }, env);

    const serialized = String(output.mock.calls[0]?.[0]);
    expect(serialized).toContain("[REDACTED]");
    for (const secret of ["admin-secret", "telegram-secret", "slack-secret", "line-secret", "email-secret", "push-secret"]) {
      expect(serialized).not.toContain(secret);
    }
  });
});
