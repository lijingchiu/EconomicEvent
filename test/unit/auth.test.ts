import { describe, expect, it } from "vitest";
import { isAdminRequest, requireAdmin } from "../../src/utils/auth";
import { authRoute } from "../../src/routes/auth";
import type { Env } from "../../src/types";

describe("admin authorization", () => {
  it("accepts the configured bearer token and rejects missing/wrong tokens", async () => {
    const env = { DB: {} as D1Database, ADMIN_TOKEN: "secret" };
    expect(await isAdminRequest(new Request("https://example.test", { headers: { authorization: "Bearer secret" } }), env)).toBe(true);
    expect(await isAdminRequest(new Request("https://example.test"), env)).toBe(false);
    expect((await requireAdmin(new Request("https://example.test"), env))?.status).toBe(401);
  });

  it("exchanges the admin token for an HttpOnly session without browser storage", async () => {
    const env = { DB: {} as D1Database, ADMIN_TOKEN: "secret" } as Env;
    const login = await authRoute(new Request("https://example.test/auth/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "secret" }),
    }), env, "/auth/session");
    expect(login.status).toBe(200);
    const setCookie = login.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("macro_pulse_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
    const cookie = setCookie.split(";")[0];
    expect(await isAdminRequest(new Request("https://example.test/admin/overview", { headers: { cookie } }), env)).toBe(true);
  });

  it("rejects cross-origin mutations even with a valid bearer token", async () => {
    const env = { DB: {} as D1Database, ADMIN_TOKEN: "secret" } as Env;
    const response = await requireAdmin(new Request("https://example.test/admin/sync", {
      method: "POST",
      headers: { authorization: "Bearer secret", origin: "https://evil.test" },
    }), env);
    expect(response?.status).toBe(403);
  });
});
