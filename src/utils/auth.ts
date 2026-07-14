import type { Env } from "../types";
import { secureEqual } from "./crypto";

export async function isAdminRequest(request: Request, env: Env): Promise<boolean> {
  const expected = env.ADMIN_TOKEN?.trim();
  if (!expected) return false;
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return Boolean(match && await secureEqual(match[1], expected));
}

export async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  if (await isAdminRequest(request, env)) return null;
  return json({ error: "unauthorized" }, 401);
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
}
