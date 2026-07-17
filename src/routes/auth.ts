import type { Env } from "../types";
import { clearAdminSessionCookie, createAdminSessionCookie, isAdminRequest, json, verifyAdminToken } from "../utils/auth";

export async function authRoute(request: Request, env: Env, path: string): Promise<Response> {
  if (request.method === "GET" && path === "/auth/status") {
    return await isAdminRequest(request, env) ? json({ authenticated: true }) : json({ authenticated: false }, 401);
  }
  if (request.method === "POST" && path === "/auth/session") {
    const body = await request.json().catch(() => ({})) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token || token.length > 500 || !await verifyAdminToken(token, env)) return json({ error: "invalid_credentials" }, 401);
    return json({ authenticated: true }, 200, { "set-cookie": await createAdminSessionCookie(env) });
  }
  if (request.method === "POST" && path === "/auth/logout") {
    return json({ authenticated: false }, 200, { "set-cookie": clearAdminSessionCookie() });
  }
  return json({ error: "not_found" }, 404);
}
