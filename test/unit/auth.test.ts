import { describe, expect, it } from "vitest";
import { isAdminRequest, requireAdmin } from "../../src/utils/auth";

describe("admin authorization", () => {
  it("accepts the configured bearer token and rejects missing/wrong tokens", async () => {
    const env = { DB: {} as D1Database, ADMIN_TOKEN: "secret" };
    expect(await isAdminRequest(new Request("https://example.test", { headers: { authorization: "Bearer secret" } }), env)).toBe(true);
    expect(await isAdminRequest(new Request("https://example.test"), env)).toBe(false);
    expect((await requireAdmin(new Request("https://example.test"), env))?.status).toBe(401);
  });
});
